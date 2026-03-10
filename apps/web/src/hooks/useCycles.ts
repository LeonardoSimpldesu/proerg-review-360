import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { ReviewCycleDetailDto, ReviewAssignmentWithNamesDto, PaginatedResult } from '@reviews360/types'
import type { z } from 'zod'
import type { createCycleSchema } from '@reviews360/zod-schemas'

export function useCycles(params?: { take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['cycles', params],
    queryFn: () =>
      api
        .get<PaginatedResult<ReviewCycleDetailDto>>('/cycles', { params })
        .then((r) => r.data),
  })
}

export function useCycle(id: string) {
  return useQuery({
    queryKey: ['cycles', id],
    queryFn: () => api.get<ReviewCycleDetailDto>(`/cycles/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateCycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof createCycleSchema>) =>
      api.post<ReviewCycleDetailDto>('/cycles', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  })
}

export function useCycleTransition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'activate' | 'close' | 'publish' }) =>
      api.post<ReviewCycleDetailDto>(`/cycles/${id}/${action}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cycles'] }),
  })
}

export function useCycleAssignments(cycleId: string, params?: { status?: string; take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['cycles', cycleId, 'assignments', params],
    queryFn: () =>
      api
        .get<PaginatedResult<ReviewAssignmentWithNamesDto>>(`/cycles/${cycleId}/assignments`, { params })
        .then((r) => r.data),
    enabled: !!cycleId,
  })
}
