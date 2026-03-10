import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import { useAuthStore } from '../stores/auth.store'
import type { EmployeeWithUserDto, PaginatedResult } from '@reviews360/types'

export function useEmployees(params?: { take?: number; skip?: number }) {
  const role = useAuthStore((s) => s.user?.role)
  const canFetch = role === 'admin' || role === 'manager'

  return useQuery({
    queryKey: ['employees', params],
    queryFn: () =>
      api
        .get<PaginatedResult<EmployeeWithUserDto>>('/employees', { params })
        .then((r) => r.data),
    enabled: canFetch,
  })
}
