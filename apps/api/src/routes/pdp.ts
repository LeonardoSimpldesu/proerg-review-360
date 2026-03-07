import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { createPdpSchema, updatePdpSchema, idParamSchema, employeeIdParamSchema } from '@reviews360/zod-schemas'
import { PdpService } from '../services/pdp.service.js'

export async function pdpRoutes(app: FastifyInstance): Promise<void> {
  const svc = new PdpService(app)
  const managerOrAdmin = [app.authorize('admin', 'manager')]
  const authenticated = [app.authenticate]

  app.withTypeProvider<ZodTypeProvider>().post('/', {
    preHandler: managerOrAdmin,
    schema: { body: createPdpSchema },
    handler: async (req, reply) => {
      const pdp = await svc.create(req.body, req.user)
      return reply.code(201).send(pdp)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/:id', {
    preHandler: managerOrAdmin,
    schema: { params: idParamSchema, body: updatePdpSchema },
    handler: async (req, reply) => {
      const pdp = await svc.update(req.params.id, req.body, req.user)
      return reply.send(pdp)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/:employeeId', {
    preHandler: authenticated,
    schema: { params: employeeIdParamSchema },
    handler: async (req, reply) => {
      const pdp = await svc.findByEmployee(req.params.employeeId, req.user)
      return reply.send(pdp)
    },
  })
}
