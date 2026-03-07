import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/auth.store'
import type { z } from 'zod'
import type { loginSchema } from '@reviews360/zod-schemas'
import type { Role } from '@reviews360/types'

interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: Role }
}

export function useLogin() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (data: z.infer<typeof loginSchema>) =>
      api.post<LoginResponse>('/auth/login', data).then((r) => r.data),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user)
      navigate('/dashboard')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  return () => {
    logout()
    navigate('/login')
  }
}
