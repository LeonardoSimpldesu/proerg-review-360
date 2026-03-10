import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/axios'
import type { AssignmentDetailDto, AssignmentStatus, PaginatedResult, ReviewAssignmentWithNamesDto } from '@reviews360/types'

export function useMyAssignments(params?: { status?: AssignmentStatus; take?: number; skip?: number }) {
  return useQuery({
    queryKey: ['my-assignments', params],
    queryFn: () =>
      api
        .get<PaginatedResult<ReviewAssignmentWithNamesDto>>('/assignments', { params })
        .then((r) => r.data),
  })
}

export function useAssignmentDetail(id: string | null) {
  return useQuery({
    queryKey: ['assignment', id],
    queryFn: () => api.get<AssignmentDetailDto>(`/assignments/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

interface AnswerInput {
  questionId: string
  ratingValue?: number
  textValue?: string
}

interface ResponseInput {
  overallComment?: string
  answers: AnswerInput[]
}

export function useSaveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResponseInput }) =>
      api.post(`/assignments/${id}/responses`, body).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['assignment', id] })
      qc.invalidateQueries({ queryKey: ['my-assignments'] })
    },
  })
}

export function useSubmitAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResponseInput }) =>
      api.post(`/assignments/${id}/submit`, body).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['assignment', id] })
      qc.invalidateQueries({ queryKey: ['my-assignments'] })
    },
  })
}
