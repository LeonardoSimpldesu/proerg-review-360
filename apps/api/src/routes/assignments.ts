import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { idParamSchema, saveResponseSchema, submitResponseSchema } from '@reviews360/zod-schemas'
import { AssignmentService } from '../services/assignment.service.js'

export async function assignmentRoutes(app: FastifyInstance): Promise<void> {
  const svc = new AssignmentService(app)
  const authenticated = [app.authenticate]

  // Save draft response
  app.withTypeProvider<ZodTypeProvider>().post('/:id/responses', {
    preHandler: authenticated,
    schema: { params: idParamSchema, body: saveResponseSchema },
    handler: async (req, reply) => {
      const response = await svc.saveDraft(req.params.id, req.body, req.user)
      return reply.code(201).send(response)
    },
  })

  // Submit final response
  app.withTypeProvider<ZodTypeProvider>().post('/:id/submit', {
    preHandler: authenticated,
    schema: { params: idParamSchema, body: submitResponseSchema },
    handler: async (req, reply) => {
      const response = await svc.submit(req.params.id, req.body, req.user)
      return reply.send(response)
    },
  })
}
