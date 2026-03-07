import bcrypt from 'bcryptjs'
import type { FastifyInstance } from 'fastify'
import type { z } from 'zod'
import type { loginSchema } from '@reviews360/zod-schemas'
import type { AuthTokens, JwtPayload } from '@reviews360/types'
import { prisma } from '../lib/prisma.js'

type LoginInput = z.infer<typeof loginSchema>

export class AuthService {
  constructor(private readonly app: FastifyInstance) {}

  async login(input: LoginInput): Promise<AuthTokens & { user: { id: string; name: string; email: string; role: JwtPayload['role'] } }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } })
    if (!user) {
      throw this.app.httpErrors.unauthorized('Invalid credentials')
    }

    const valid = await bcrypt.compare(input.password, user.password)
    if (!valid) {
      throw this.app.httpErrors.unauthorized('Invalid credentials')
    }

    const payload: JwtPayload = { sub: user.id, role: user.role as JwtPayload['role'] }

    const employee = await prisma.employee.findUnique({ where: { userId: user.id } })
    if (employee) payload.employeeId = employee.id

    const accessToken = this.app.jwt.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    })
    const refreshToken = this.app.jwt.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    })

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role as JwtPayload['role'] },
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload
    try {
      payload = this.app.jwt.verify<JwtPayload>(refreshToken)
    } catch {
      throw this.app.httpErrors.unauthorized('Invalid or expired refresh token')
    }

    const newPayload: JwtPayload = { sub: payload.sub, role: payload.role }
    if (payload.employeeId) newPayload.employeeId = payload.employeeId

    const accessToken = this.app.jwt.sign(newPayload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    })
    const newRefreshToken = this.app.jwt.sign(newPayload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    })

    return { accessToken, refreshToken: newRefreshToken }
  }

  async getMe(userId: string): Promise<{ id: string; name: string; email: string; role: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    })
    if (!user) throw this.app.httpErrors.notFound('User not found')
    return user
  }
}
