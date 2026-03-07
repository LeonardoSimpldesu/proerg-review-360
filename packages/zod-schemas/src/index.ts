import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── Pagination ───────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  take: z.coerce.number().int().min(1).max(100).default(20),
  skip: z.coerce.number().int().min(0).default(0),
})

// ─── Templates ───────────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  type: z.enum(['rating', 'text', 'choice']),
  text: z.string().min(1).max(500),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
  required: z.boolean().default(true),
  order: z.number().int().min(0),
})

export const createSectionSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().int().min(0),
  questions: z.array(createQuestionSchema).min(1),
})

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  sections: z.array(createSectionSchema).min(1),
})

export const updateTemplateSchema = createTemplateSchema.partial()

// ─── Cycles ──────────────────────────────────────────────────────────────────

export const cycleParticipantSchema = z.object({
  revieweeEmployeeId: z.string().cuid(),
  reviewerEmployeeId: z.string().cuid(),
  role: z.enum(['self', 'manager', 'peer']),
  isAnonymous: z.boolean().default(false),
  dueAt: z.string().datetime(),
})

export const createCycleSchema = z.object({
  name: z.string().min(1).max(200),
  templateId: z.string().cuid(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  participants: z.array(cycleParticipantSchema).min(1),
})

// ─── Responses ───────────────────────────────────────────────────────────────

export const saveAnswerSchema = z.object({
  questionId: z.string().cuid(),
  ratingValue: z.number().int().min(1).max(5).optional(),
  textValue: z.string().max(2000).optional(),
})

export const saveResponseSchema = z.object({
  overallComment: z.string().max(2000).optional(),
  answers: z.array(saveAnswerSchema).min(1),
})

export const submitResponseSchema = saveResponseSchema

// ─── PDP ─────────────────────────────────────────────────────────────────────

export const createGoalSchema = z.object({
  text: z.string().min(1).max(500),
  dueAt: z.string().datetime().optional(),
})

export const createPdpSchema = z.object({
  cycleId: z.string().cuid(),
  employeeId: z.string().cuid(),
  goals: z.array(createGoalSchema).min(1),
})

export const updateGoalSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
})

export const updatePdpSchema = z.object({
  goals: z.array(
    z.object({
      id: z.string().cuid().optional(),
      text: z.string().min(1).max(500),
      dueAt: z.string().datetime().optional().nullable(),
      status: z.enum(['pending', 'in_progress', 'done']).default('pending'),
    })
  ).min(1),
})

// ─── Param schemas ────────────────────────────────────────────────────────────

export const idParamSchema = z.object({
  id: z.string().cuid(),
})

export const employeeIdParamSchema = z.object({
  employeeId: z.string().cuid(),
})

export const cycleQuerySchema = z.object({
  cycle_id: z.string().cuid().optional(),
})

export const assignmentStatusQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'overdue']).optional(),
}).merge(paginationSchema)

// Re-export zod for convenience
export { z }
