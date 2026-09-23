"""
ETL de carga inicial: Excel "Personal y contratación Tacita de Plata" -> SQL.

Uso (desde la raíz del repo):
    python tools/etl-excel/importar_excel.py "<ruta.xlsx>"

Salidas:
    back/src/database/seeds/sql/100_seed_excel.sql   -> seed idempotente-guardado
    docs/reporte-importacion.md                      -> inconsistencias detectadas

Principios:
  * No se inventan datos: lo que no se puede deducir queda NULL y se reporta.
  * Los IDs nunca se escriben a mano: todo se resuelve por claves naturales.
  * La carga es de una sola vez (la app pasa a ser la fuente de verdad);
    el SQL aborta si ya hay procesos cargados.
"""
from __future__ import annotations

import re
import sys
import unicodedata
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

import openpyxl

# ---------------------------------------------------------------------------
# Reglas de normalización (explícitas y revisables)
# ---------------------------------------------------------------------------

ESTADOS = {  # texto del Excel (normalizado) -> codigo en core.estado_proceso
    "precontractual": "PRECONTRACTUAL",
    "alerta precontractual": "ALERTA_PRECONTRACTUAL",
    "firmado": "FIRMADO",
    "ejecución": "EJECUCION",
    "próximo a terminar directo": "PROXIMO_TERMINAR_DIRECTO",
    "próximo a terminar selección": "PROXIMO_TERMINAR_SELECCION",
    "terminado": "TERMINADO",
}

DEPENDENCIAS = {  # nombre normalizado -> (slug, sigla)
    "secretaría de seguridad": ("seguridad", "SSC"),
    "secretaría de gestión y control": ("gestion-y-control", "SGCT"),
    "secretaría de medio ambiente": ("medio-ambiente", "SMA"),
    "secretaría de inclusión social": ("inclusion-social", "SIS"),
    "secretaría de infraestructura": ("infraestructura", "SIF"),
}

# Variantes de escritura -> nombre canónico del contratista.
ALIAS_CONTRATISTA = {
    "epm": "EPM",
    "comité de estudios médicos s.a.s (ips: mente plena)": "Comité de Estudios Médicos",
    "arví": "Parque Arví",
    "jardín": "Jardín Botánico",
}

# Nombres de personal que son el mismo tipo en distintas vigencias.
ALIAS_TIPO_PERSONAL = {
    "promotores puntos crítcos": "Gestión y Control (promotores puntos críticos)",
    "gestión y control": "Gestión y Control (promotores puntos críticos)",
}

# Tipo de personal -> slug de dependencia (None = no deducible con certeza).
DEPENDENCIA_TIPO_PERSONAL = {
    "Promotores ambientales": "medio-ambiente",
    "Guardaquebradas": "medio-ambiente",
    "Educadores (Inclusión Social)": "inclusion-social",
    "Jardineros": "infraestructura",
    "Espacio Público": "seguridad",
    "Gestores Operativos": "seguridad",
    "EMVARIAS": None,
    "Gestión y Control (promotores puntos críticos)": "gestion-y-control",
    "Cuadrillas (EDU)": "infraestructura",
}

# Frente (boceto) -> tipos de personal que muestra.
FRENTE_PERSONAL = {
    "gestion-control-territorial": ["Gestión y Control (promotores puntos críticos)"],
    "operativa-seguridad": ["Gestores Operativos"],
    "espacio-publico": ["Espacio Público"],
    "sif": ["Jardineros", "Cuadrillas (EDU)"],
    "emvarias": ["EMVARIAS"],
    "habitante-de-calle": ["Educadores (Inclusión Social)"],
    "medio-ambiente": ["Promotores ambientales", "Guardaquebradas"],
}

# Frente -> regla para asignar procesos (tal como se relaciona en el Excel).
#   DEPENDENCIA: columna Dependencia del proceso.
#   CONTRATISTA: columna Contratista del proceso.
#   ACTIVIDAD:   texto de la actividad (solo fuera de las dependencias excluidas).
FRENTE_REGLA = {
    "gestion-control-territorial": ("DEPENDENCIA", "gestion-y-control"),
    "operativa-seguridad": ("DEPENDENCIA", "seguridad"),
    "sif": ("DEPENDENCIA", "infraestructura"),
    "habitante-de-calle": ("DEPENDENCIA", "inclusion-social"),
    "medio-ambiente": ("DEPENDENCIA", "medio-ambiente"),
    "emvarias": ("CONTRATISTA", "emvarias"),
    # Espacio Público es independiente de las obras de Infraestructura.
    "espacio-publico": ("ACTIVIDAD", ("espacio público", {"infraestructura"})),
}

RX_NECESIDAD = re.compile(r"necesidad\s*(\d+)\s*:?", re.I)
# Nota fechada "dd/mm/aaaa: texto" hasta el fin de la línea.
RX_NOTA = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})\s*:\s*([^\n]+)")
RX_URL = re.compile(r"https://\S+")
RX_OPERADOR_CANT = re.compile(r"^(.*?)\s*\((\d+)\)\s*$")
RX_FECHA_OPERADOR = re.compile(r"(\d{1,2}/\d{1,2}/\d{4})\s*\(([^)]+)\)")

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------


def limpiar(v) -> str | None:
    """Texto sin espacios extremos ni dobles; None si queda vacío."""
    if v is None:
        return None
    s = re.sub(r"[ \t]+", " ", str(v)).strip()
    return s or None


def clave(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip()).lower()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def a_fecha(v) -> date | None:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        m = re.fullmatch(r"\s*(\d{1,2})/(\d{1,2})/(\d{4})\s*", v)
        if m:
            d, mth, y = map(int, m.groups())
            return date(y, mth, d)
    return None


def sql(v) -> str:
    """Literal SQL seguro."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, date):
        return f"'{v.isoformat()}'"
    if isinstance(v, list):
        return "array[" + ", ".join(sql(x) for x in v) + "]::text[]" if v else "'{}'::text[]"
    return "'" + str(v).replace("'", "''") + "'"


def comentario(celda) -> str | None:
    """Extrae el texto útil de un comentario encadenado de Excel."""
    if not celda.comment:
        return None
    txt = celda.comment.text
    txt = txt.split("Comentario:", 1)[-1]
    partes = [limpiar(p) for p in re.split(r"Respuesta:", txt)]
    return " / ".join(p for p in partes if p) or None


# ---------------------------------------------------------------------------
# Modelo intermedio
# ---------------------------------------------------------------------------


@dataclass
class Proceso:
    fila: int
    dependencia_slug: str
    actividad: str
    estado: str
    tipo: str
    contratista: str | None
    numero_contrato: str | None
    numero_necesidad: str | None
    fecha_inicio: date | None
    fecha_terminacion: date | None
    link: str | None
    observacion: str | None
    notas: list[tuple[date, str]] = field(default_factory=list)


@dataclass
class Corte:
    tipo: str
    vigencia: int
    actual: int
    pendiente: int | None
    meta: int | None
    fecha_final: date | None
    observaciones: str | None
    links: list[str]
    operadores: list[tuple[str, int | None, date | None]]


class Reporte:
    def __init__(self) -> None:
        self.items: dict[str, list[str]] = {}

    def add(self, seccion: str, texto: str) -> None:
        self.items.setdefault(seccion, []).append(texto)


# ---------------------------------------------------------------------------
# Lectura
# ---------------------------------------------------------------------------


def canon_contratista(nombre: str | None, rep: Reporte, origen: str) -> str | None:
    n = limpiar(nombre)
    if not n:
        return None
    canon = ALIAS_CONTRATISTA.get(clave(n), n)
    if canon != n:
        rep.add("Contratistas unificados", f"{origen}: «{n}» → «{canon}»")
    if re.search(r"\d{5,}", canon):
        rep.add("Revisar manualmente", f"{origen}: contratista con número en el nombre «{canon}»")
    return canon


def leer_contratos(ws, rep: Reporte) -> list[Proceso]:
    procesos: list[Proceso] = []
    for r in range(3, ws.max_row + 1):
        dep = limpiar(ws.cell(r, 3).value)
        act = limpiar(ws.cell(r, 5).value)
        if not dep or not act:
            continue
        dep_slug = DEPENDENCIAS[clave(dep)][0]
        estado_txt = clave(limpiar(ws.cell(r, 6).value) or "")
        estado = ESTADOS.get(estado_txt)
        if not estado:
            raise ValueError(f"Fila {r}: estado desconocido «{estado_txt}»")

        num = ws.cell(r, 4).value
        numero_contrato = str(int(num)) if isinstance(num, (int, float)) else limpiar(num)

        obs = limpiar(ws.cell(r, 11).value) or ""
        m = RX_NECESIDAD.search(obs)
        necesidad = m.group(1) if m else None
        notas = [(a_fecha(f), limpiar(t)) for f, t in RX_NOTA.findall(obs)]
        resto = RX_NOTA.sub("", RX_NECESIDAD.sub("", obs, count=1))
        resto = limpiar(re.sub(r"\n\s*\n", "\n", resto))

        link_raw = limpiar(ws.cell(r, 10).value)
        link = RX_URL.search(link_raw).group(0).replace("&amp;", "&") if link_raw else None

        fi, ft = a_fecha(ws.cell(r, 8).value), a_fecha(ws.cell(r, 9).value)
        p = Proceso(
            fila=r,
            dependencia_slug=dep_slug,
            actividad=act,
            estado=estado,
            tipo="INTERVENTORIA" if clave(act).startswith("interventor") else "PRINCIPAL",
            contratista=canon_contratista(ws.cell(r, 7).value, rep, f"Contratos fila {r}"),
            numero_contrato=numero_contrato,
            numero_necesidad=necesidad,
            fecha_inicio=fi,
            fecha_terminacion=ft,
            link=link,
            observacion=resto,
            notas=[(f, t) for f, t in notas if f and t],
        )
        if not numero_contrato and estado not in ("PRECONTRACTUAL", "ALERTA_PRECONTRACTUAL"):
            rep.add("Revisar manualmente", f"Fila {r}: estado {estado} sin número de contrato")
        if estado == "FIRMADO" and not fi:
            rep.add("Revisar manualmente", f"Fila {r}: contrato {numero_contrato} firmado sin fecha de inicio")
        if p.tipo == "INTERVENTORIA":
            rep.add("Interventorías por enlazar a su contrato", f"Fila {r}: {act[:90]}")
        procesos.append(p)

    # Necesidades repetidas en procesos distintos.
    vistos: dict[str, int] = {}
    for p in procesos:
        if p.numero_necesidad:
            if p.numero_necesidad in vistos:
                rep.add("Revisar manualmente",
                        f"Necesidad {p.numero_necesidad} repetida en filas {vistos[p.numero_necesidad]} y {p.fila}")
            vistos[p.numero_necesidad] = p.fila
    return procesos


def canon_tipo(nombre: str) -> str:
    n = limpiar(nombre)
    return ALIAS_TIPO_PERSONAL.get(clave(n), n)


def partir_operadores(texto: str | None, rep: Reporte, origen: str) -> list[tuple[str, int | None]]:
    """'UdeA (199)\\nITM (16)' / 'UdeA y Fundación de Sindicatos.' -> [(nombre, cantidad)]."""
    if not texto:
        return []
    ops = []
    for linea in re.split(r"\n|\s+y\s+", texto.strip().rstrip(".")):
        linea = limpiar(linea)
        if not linea:
            continue
        m = RX_OPERADOR_CANT.match(linea)
        nombre, cant = (m.group(1), int(m.group(2))) if m else (linea, None)
        ops.append((canon_contratista(nombre, rep, origen), cant))
    return ops


def leer_personal(ws, vigencia: int, fila_header: int, rep: Reporte) -> list[Corte]:
    cols = {limpiar(ws.cell(fila_header, c).value): c for c in range(1, ws.max_column + 1)}
    cortes = []
    for r in range(fila_header + 1, ws.max_row + 1):
        nombre = limpiar(ws.cell(r, 2).value)
        if not nombre or clave(nombre) == "total":
            continue
        tipo = canon_tipo(nombre)
        if tipo != nombre:
            rep.add("Tipos de personal unificados", f"{vigencia}: «{nombre}» → «{tipo}»")
        actual = int(ws.cell(r, cols["Personal actual"]).value or 0)
        origen = f"Personal {vigencia} «{tipo}»"

        obs = limpiar(ws.cell(r, cols["Observaciones"]).value)
        notas_celdas = [comentario(ws.cell(r, c)) for c in range(1, ws.max_column + 1)]
        notas_celdas = [n for n in notas_celdas if n]
        if notas_celdas:
            obs = "\n".join(filter(None, [obs] + [f"[Comentario Excel] {n}" for n in notas_celdas]))

        if vigencia == 2025:
            meta = ws.cell(r, cols["Meta 2025"]).value
            meta = int(meta) if meta is not None else None
            pendiente = None  # era fórmula Meta - Actual: se calcula en la vista
            ops_txt = ws.cell(r, cols["Operador"]).value
            links = RX_URL.findall(str(ws.cell(r, cols["Link SECOP"]).value or ""))
        else:
            meta = None
            pend = ws.cell(r, cols["Pendientes"]).value
            pendiente = int(pend) if pend is not None else None
            # En 2026 el operador viene en la 1.ª línea de Observaciones.
            ops_txt = (obs or "").split("\n")[0].split("-")[0] if obs else None
            links = []
            if ops_txt and clave(ops_txt).startswith("[comentario"):
                ops_txt = None

        fecha_raw = ws.cell(r, cols["Fecha final"]).value
        fecha_final = a_fecha(fecha_raw)
        fechas_op = {clave(k): a_fecha(f) for f, k in RX_FECHA_OPERADOR.findall(str(fecha_raw or ""))}
        if fechas_op:
            rep.add("Celdas con varios valores separadas", f"{origen}: fechas por operador {fechas_op}")

        operadores = []
        for nom, cant in partir_operadores(ops_txt, rep, origen):
            f_op = next((f for k, f in fechas_op.items() if k in clave(nom) or clave(nom) in k), None)
            operadores.append((nom, cant, f_op))
        if not operadores:
            rep.add("Sin operador identificable", f"{origen}")
        if len(links) > 1:
            rep.add("Celdas con varios valores separadas", f"{origen}: {len(links)} links SECOP")

        cortes.append(Corte(tipo, vigencia, actual, pendiente, meta, fecha_final, obs,
                            [l.replace("&amp;", "&") for l in links], operadores))
    return cortes


def leer_proyectos(ws) -> list[str]:
    return [p for p in (limpiar(ws.cell(r, 1).value) for r in range(3, ws.max_row + 1)) if p]


# ---------------------------------------------------------------------------
# Generación de SQL
# ---------------------------------------------------------------------------

def values(filas: list[tuple]) -> str:
    """Bloque VALUES multi-fila con literales seguros."""
    return ",\n  ".join("(" + ", ".join(sql(v) for v in f) + ")" for f in filas)


def generar_sql(proyecto_excel: str, deps: list[str], proyectos: list[str],
                procesos: list[Proceso], cortes: list[Corte]) -> str:
    """SQL compacto: cada entidad es un INSERT ... SELECT sobre un bloque VALUES
    que se une a los catálogos por clave natural (nunca por id escrito a mano).
    Excepción: los procesos reciben id = orden de fila, porque no tienen clave
    natural (hay necesidades sin contrato) y la bitácora debe enlazarse a ellos.
    Es seguro porque el guard exige la tabla vacía y luego se ajusta la secuencia."""
    ct = "core.clave_texto"
    contratistas = sorted({p.contratista for p in procesos if p.contratista}
                          | {o[0] for c in cortes for o in c.operadores})
    procesos_ids = list(enumerate(procesos, start=1))
    notas = [(pid, f, t) for pid, p in procesos_ids for f, t in p.notas]

    def bloque(titulo: str, cuerpo: str) -> str:
        return f"-- {titulo}\n{cuerpo}\n"

    partes = [
        "-- GENERADO por tools/etl-excel/importar_excel.py. No editar a mano.\n",
        "do $$ begin\n"
        "  if exists (select 1 from core.proceso_contratacion) then\n"
        "    raise exception 'El seed del Excel ya fue aplicado (core.proceso_contratacion no está vacía)';\n"
        "  end if;\nend $$;\n",
        bloque("Dependencias",
               "insert into core.dependencia (nombre, sigla, slug) values\n  "
               + values([(n, *DEPENDENCIAS[clave(n)][::-1]) for n in deps]).replace("", "")
               + "\non conflict do nothing;"),
        bloque("Proyectos (hoja Lista)",
               "insert into core.proyecto (nombre) values\n  " + values([(p,) for p in proyectos])
               + "\non conflict do nothing;"),
        bloque("Contratistas",
               "insert into core.contratista (nombre) values\n  " + values([(c,) for c in contratistas])
               + "\non conflict do nothing;"),
        bloque("Actividades",
               "insert into core.actividad (dependencia_id, proyecto_id, nombre)\n"
               "select d.id, pr.id, v.nombre from (values\n  "
               + values(sorted({(p.dependencia_slug, p.actividad) for p in procesos}))
               + f"\n) v(dep, nombre)\njoin core.dependencia d on d.slug = v.dep\n"
               f"join core.proyecto pr on {ct}(pr.nombre) = {ct}({sql(proyecto_excel)})\non conflict do nothing;"),
        bloque("Procesos de contratación (id = orden de fila del Excel)",
               "insert into core.proceso_contratacion (id, actividad_id, estado_id, contratista_id, tipo, numero_contrato,\n"
               "  numero_necesidad, fecha_inicio, fecha_terminacion, link_secop, observacion)\noverriding system value\n"
               "select v.id, a.id, e.id, c.id, v.tipo, v.num, v.nec, v.fi::date, v.ft::date, v.link, v.obs from (values\n  "
               + values([(pid, p.dependencia_slug, p.actividad, p.estado, p.contratista, p.tipo, p.numero_contrato,
                          p.numero_necesidad, p.fecha_inicio, p.fecha_terminacion, p.link, p.observacion)
                         for pid, p in procesos_ids])
               + "\n) v(id, dep, act, estado, contratista, tipo, num, nec, fi, ft, link, obs)\n"
               "join core.dependencia d on d.slug = v.dep\n"
               f"join core.actividad a on a.dependencia_id = d.id and {ct}(a.nombre) = {ct}(v.act)\n"
               "join core.estado_proceso e on e.codigo = v.estado\n"
               f"left join core.contratista c on {ct}(c.nombre) = {ct}(v.contratista)\norder by v.id;\n"
               "select setval(pg_get_serial_sequence('core.proceso_contratacion', 'id'),\n"
               "  (select max(id) from core.proceso_contratacion));"),
        bloque("Bitácora extraída de las observaciones",
               "insert into core.seguimiento (proceso_id, fecha, nota, estado_id, origen)\n"
               "select p.id, v.fecha::date, v.nota, p.estado_id, 'EXCEL' from (values\n  " + values(notas)
               + "\n) v(proceso_id, fecha, nota)\njoin core.proceso_contratacion p on p.id = v.proceso_id;"),
        bloque("Tipos de personal",
               "insert into core.tipo_personal (nombre, dependencia_id)\n"
               "select v.nombre, d.id from (values\n  "
               + values([(t, DEPENDENCIA_TIPO_PERSONAL.get(t)) for t in sorted({c.tipo for c in cortes})])
               + "\n) v(nombre, dep)\nleft join core.dependencia d on d.slug = v.dep\non conflict do nothing;"),
        bloque("Cortes de personal",
               "insert into core.personal_corte (tipo_personal_id, vigencia, actual, pendiente, meta, fecha_final, observaciones, links_secop)\n"
               "select t.id, v.vig, v.actual, v.pend, v.meta, v.ff::date, v.obs, v.links from (values\n  "
               + values([(c.tipo, c.vigencia, c.actual, c.pendiente, c.meta, c.fecha_final, c.observaciones, c.links)
                         for c in cortes]).replace("null, null, null", "null::int, null::int, null::date", 0)
               + "\n) v(tipo, vig, actual, pend, meta, ff, obs, links)\n"
               f"join core.tipo_personal t on {ct}(t.nombre) = {ct}(v.tipo);"),
        bloque("Operadores por corte",
               "insert into core.personal_operador (corte_id, contratista_id, cantidad, fecha_final)\n"
               "select pc.id, c.id, v.cant::int, v.ff::date from (values\n  "
               + values([(c.tipo, c.vigencia, nom, cant, f_op) for c in cortes for nom, cant, f_op in c.operadores])
               + "\n) v(tipo, vig, contratista, cant, ff)\n"
               f"join core.tipo_personal t on {ct}(t.nombre) = {ct}(v.tipo)\n"
               "join core.personal_corte pc on pc.tipo_personal_id = t.id and pc.vigencia = v.vig\n"
               f"join core.contratista c on {ct}(c.nombre) = {ct}(v.contratista);"),
        bloque("Frentes ↔ personal",
               "insert into core.frente_tipo_personal (frente_id, tipo_personal_id)\n"
               "select f.id, t.id from (values\n  "
               + values([(f, t) for f, ts in FRENTE_PERSONAL.items() for t in ts])
               + f"\n) v(frente, tipo)\njoin core.frente f on f.slug = v.frente\n"
               f"join core.tipo_personal t on {ct}(t.nombre) = {ct}(v.tipo)\non conflict do nothing;"),
    ]

    # Frentes ↔ procesos según FRENTE_REGLA.
    reglas = []
    for frente, (criterio, valor) in FRENTE_REGLA.items():
        if criterio == "DEPENDENCIA":
            cond = f"d.slug = {sql(valor)}"
        elif criterio == "CONTRATISTA":
            cond = f"{ct}(c.nombre) = {sql(valor)}"
        else:
            texto, excluidas = valor
            cond = (f"{ct}(a.nombre) like {sql('%' + texto + '%')} "
                    f"and d.slug not in ({', '.join(sql(e) for e in sorted(excluidas))})")
        reglas.append(f"  select {sql(frente)} as frente, p.id, {sql(criterio)} as criterio from core.proceso_contratacion p\n"
                      "    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id\n"
                      f"    left join core.contratista c on c.id = p.contratista_id where {cond}")
    partes.append(bloque("Frentes ↔ procesos (reglas FRENTE_REGLA del ETL)",
                         "insert into core.frente_proceso (frente_id, proceso_id, criterio)\n"
                         "select f.id, r.id, r.criterio from (\n" + "\n  union all\n".join(reglas)
                         + "\n) r join core.frente f on f.slug = r.frente\non conflict do nothing;"))
    return "\n".join(partes)


def generar_reporte(rep: Reporte, procesos: list[Proceso], cortes: list[Corte], archivo: str) -> str:
    lineas = [
        "# Reporte de importación del Excel",
        "",
        f"Archivo: `{archivo}`  ",
        f"Generado: {datetime.now():%Y-%m-%d %H:%M}",
        "",
        "| Elemento | Cantidad |",
        "|---|---|",
        f"| Procesos de contratación | {len(procesos)} |",
        f"| — con número de contrato | {sum(1 for p in procesos if p.numero_contrato)} |",
        f"| — solo necesidad (precontractual) | {sum(1 for p in procesos if not p.numero_contrato)} |",
        f"| Notas de bitácora extraídas | {sum(len(p.notas) for p in procesos)} |",
        f"| Cortes de personal | {len(cortes)} |",
        "",
    ]
    for seccion, items in rep.items.items():
        lineas.append(f"## {seccion} ({len(items)})")
        lineas.append("")
        lineas.extend(f"- {i}" for i in dict.fromkeys(items))
        lineas.append("")
    return "\n".join(lineas)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    archivo = Path(sys.argv[1])
    raiz = Path(__file__).resolve().parents[2]
    wb = openpyxl.load_workbook(archivo, data_only=True)
    rep = Reporte()

    ws_c = wb["Contratos"]
    procesos = leer_contratos(ws_c, rep)
    proyecto_excel = limpiar(ws_c.cell(3, 2).value)
    deps = sorted({limpiar(ws_c.cell(r, 3).value) for r in range(3, ws_c.max_row + 1) if ws_c.cell(r, 3).value})
    proyectos = leer_proyectos(wb["Lista"])

    # Los nombres de hoja traen espacios distintos ("Personal  2026").
    hojas = {clave(n): n for n in wb.sheetnames}
    cortes = (leer_personal(wb[hojas["personal 2025"]], 2025, 3, rep)
              + leer_personal(wb[hojas["personal 2026"]], 2026, 2, rep))

    destino_sql = raiz / "back/src/database/seeds/sql/100_seed_excel.sql"
    destino_rep = raiz / "docs/reporte-importacion.md"
    destino_sql.parent.mkdir(parents=True, exist_ok=True)
    destino_sql.write_text(generar_sql(proyecto_excel, deps, proyectos, procesos, cortes), encoding="utf-8")
    destino_rep.write_text(generar_reporte(rep, procesos, cortes, archivo.name), encoding="utf-8")
    print(f"OK: {len(procesos)} procesos, {len(cortes)} cortes -> {destino_sql.relative_to(raiz)}")


if __name__ == "__main__":
    main()
