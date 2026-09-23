import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { useAppDispatch } from '@/shared/hooks/redux'
import { bootstrapRequest } from '@/features/auth/authSlice'

function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(bootstrapRequest())
  }, [dispatch])

  return <RouterProvider router={router} />
}

export default App
