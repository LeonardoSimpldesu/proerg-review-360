import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { EmployeeWithUserDto, PaginatedResult } from '@reviews360/types'

export function useEmployees(params?: { take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['employees', params],
    queryFn: () =>
      api
        .get<PaginatedResult<EmployeeWithUserDto>>('/employees', { params })
        .then((r) => r.data),
  })
}
