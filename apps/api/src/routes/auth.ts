import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { refreshSchema, loginSchema } from '@reviews360/zod-schemas'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const auth = new AuthService(app)

  app.withTypeProvider<ZodTypeProvider>().post('/login', {
    schema: {
      body: loginSchema,
      response: {
        200: z.object({
          accessToken: z.string(),
          refreshToken: z.string(),
          user: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.enum(['admin', 'manager', 'employee']),
          }),
        }),
      },
    },
    handler: async (req, reply) => {
      const result = await auth.login(req.body)
      return reply.send(result)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().post('/refresh', {
    schema: {
      body: refreshSchema,
      response: {
        200: z.object({
          accessToken: z.string(),
          refreshToken: z.string(),
        }),
      },
    },
    handler: async (req, reply) => {
      const result = await auth.refresh(req.body.refreshToken)
      return reply.send(result)
    },
  })

  app.get('/me', {
    preHandler: [app.authenticate],
    handler: async (req, reply) => {
      const user = await auth.getMe(req.user.sub)
      return reply.send(user)
    },
  })
}
