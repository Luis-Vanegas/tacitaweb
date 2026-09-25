# Tareas del proyecto

## 🟢 Para Antigravity (rápidas, mecánicas, acotadas)
- [ ]

## 🔵 Para Claude Code (arquitectura, lógica compleja, decisiones)
- [ ] 🔒 PAUSADO (Claude Code): demo a directivos sin login.
      - Hecho y probado (lint+test verde): auto-login silencioso en
        `front/src/features/auth/authSaga.ts` con usuario LECTOR dedicado vía
        `VITE_DEMO_EMAIL`/`VITE_DEMO_PASSWORD` (ver `front/.env.example`).
        Falta: cargar esas credenciales (local o Vercel).
      - Sin empezar: alternativa de abrir endpoints GET del backend sin JWT
        (`@Public()` en frentes/procesos/personal/seguimiento controllers).
        Requiere decidir con calma qué queda público — no tocar sin OK explícito.
