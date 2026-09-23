import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { loginRequest } from './authSlice'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, usuario } = useAppSelector((s) => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (usuario) {
      navigate('/', { replace: true })
    }
  }, [usuario, navigate])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    dispatch(loginRequest({ email, password }))
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.color.navy,
        px: 2,
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 4 }}
      >
        <Box
          sx={{
            display: 'inline-block',
            px: 2,
            py: 0.5,
            mb: 3,
            borderRadius: 999,
            backgroundColor: tokens.color.primary,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Tacita de Plata
        </Box>
        <Typography variant="h5" component="h1" gutterBottom>
          Iniciar sesión
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Seguimiento de contratación y personal
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          autoComplete="email"
          margin="normal"
          slotProps={{ htmlInput: { 'aria-label': 'Correo electrónico' } }}
        />
        <TextField
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          autoComplete="current-password"
          margin="normal"
          slotProps={{ htmlInput: { 'aria-label': 'Contraseña' } }}
        />

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={estado === 'loading'}
          sx={{ mt: 2 }}
        >
          {estado === 'loading' ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
        </Button>
      </Paper>
    </Box>
  )
}
