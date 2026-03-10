import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { ReviewTemplateDto, PaginatedResult } from '@reviews360/types'
import type { z } from 'zod'
import type { createTemplateSchema, updateTemplateSchema } from '@reviews360/zod-schemas'

export function useTemplates(params?: { take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['templates', params],
    queryFn: () =>
      api
        .get<PaginatedResult<ReviewTemplateDto>>('/templates', { params })
        .then((r) => r.data),
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['templates', id],
    queryFn: () => api.get<ReviewTemplateDto>(`/templates/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: z.infer<typeof createTemplateSchema>) =>
      api.post<ReviewTemplateDto>('/templates', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: z.infer<typeof updateTemplateSchema> }) =>
      api.patch<ReviewTemplateDto>(`/templates/${id}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}

export function useToggleTemplateActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch<ReviewTemplateDto>(`/templates/${id}/active`, { isActive }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['templates'] }),
  })
}
