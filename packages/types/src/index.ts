// ─── Enums ───────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'manager' | 'employee'
export type CycleStatus = 'draft' | 'active' | 'closed' | 'published'
export type QuestionType = 'rating' | 'text' | 'choice'
export type AssignmentRole = 'self' | 'manager' | 'peer'
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'overdue'
export type GoalStatus = 'pending' | 'in_progress' | 'done'

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string
  role: Role
  employeeId?: string
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

// ─── User / Employee ─────────────────────────────────────────────────────────

export interface UserDto {
  id: string
  name: string
  email: string
  role: Role
  createdAt: string
}

export interface EmployeeDto {
  id: string
  userId: string
  jobTitle: string
  teamId: string | null
  managerId: string | null
  user: Pick<UserDto, 'id' | 'name' | 'email' | 'role'>
}

export interface TeamDto {
  id: string
  name: string
}

// ─── Templates ───────────────────────────────────────────────────────────────

export interface TemplateQuestionDto {
  id: string
  sectionId: string
  type: QuestionType
  text: string
  scaleMin: number | null
  scaleMax: number | null
  required: boolean
  order: number
}

export interface TemplateSectionDto {
  id: string
  templateId: string
  title: string
  order: number
  questions: TemplateQuestionDto[]
}

export interface ReviewTemplateDto {
  id: string
  name: string
  version: number
  isActive: boolean
  sections: TemplateSectionDto[]
  createdAt: string
}

// ─── Cycles ──────────────────────────────────────────────────────────────────

export interface ReviewCycleDto {
  id: string
  name: string
  templateId: string
  startAt: string
  endAt: string
  status: CycleStatus
  createdAt: string
}

export interface ReviewCycleDetailDto extends ReviewCycleDto {
  template: Pick<ReviewTemplateDto, 'id' | 'name' | 'version'>
  _count: { assignments: number }
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export interface ReviewAssignmentDto {
  id: string
  cycleId: string
  reviewerEmployeeId: string
  revieweeEmployeeId: string
  role: AssignmentRole
  isAnonymous: boolean
  status: AssignmentStatus
  dueAt: string
}

// ─── Responses ───────────────────────────────────────────────────────────────

export interface ResponseAnswerDto {
  id: string
  questionId: string
  ratingValue: number | null
  textValue: string | null
}

export interface ReviewResponseDto {
  id: string
  assignmentId: string
  submittedAt: string | null
  overallComment: string | null
  isDraft: boolean
  answers: ResponseAnswerDto[]
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export interface CompetencyScore {
  sectionTitle: string
  averageRating: number
  selfRating: number | null
  managerRating: number | null
}

export interface EmployeeReportDto {
  employeeId: string
  cycleId: string
  competencies: CompetencyScore[]
  overallComments: string[]
}

// ─── PDP ─────────────────────────────────────────────────────────────────────

export interface DevelopmentGoalDto {
  id: string
  planId: string
  text: string
  dueAt: string | null
  status: GoalStatus
}

export interface DevelopmentPlanDto {
  id: string
  cycleId: string
  employeeId: string
  ownerManagerId: string
  goals: DevelopmentGoalDto[]
  createdAt: string
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[]
  total: number
  take: number
  skip: number
}
