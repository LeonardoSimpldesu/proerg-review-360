import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  createCycleSchema,
  idParamSchema,
  paginationSchema,
  assignmentStatusQuerySchema,
} from '@reviews360/zod-schemas'
import { CycleService } from '../services/cycle.service.js'

export async function cycleRoutes(app: FastifyInstance): Promise<void> {
  const svc = new CycleService(app)
  const adminOnly = [app.authorize('admin')]
  const authenticated = [app.authenticate]

  app.withTypeProvider<ZodTypeProvider>().post('/', {
    preHandler: adminOnly,
    schema: { body: createCycleSchema },
    handler: async (req, reply) => {
      const cycle = await svc.create(req.body, req.user.sub)
      return reply.code(201).send(cycle)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/', {
    preHandler: authenticated,
    schema: { querystring: paginationSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.findAll(req.query))
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/:id', {
    preHandler: authenticated,
    schema: { params: idParamSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.findById(req.params.id))
    },
  })

  app.withTypeProvider<ZodTypeProvider>().post('/:id/activate', {
    preHandler: adminOnly,
    schema: { params: idParamSchema },
    handler: async (req, reply) => {
      const cycle = await svc.activate(req.params.id, req.user.sub)
      return reply.send(cycle)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().post('/:id/close', {
    preHandler: adminOnly,
    schema: { params: idParamSchema },
    handler: async (req, reply) => {
      const cycle = await svc.close(req.params.id, req.user.sub)
      return reply.send(cycle)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().post('/:id/publish', {
    preHandler: adminOnly,
    schema: { params: idParamSchema },
    handler: async (req, reply) => {
      const cycle = await svc.publish(req.params.id, req.user.sub)
      return reply.send(cycle)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/:id/assignments', {
    preHandler: authenticated,
    schema: { params: idParamSchema, querystring: assignmentStatusQuerySchema },
    handler: async (req, reply) => {
      return reply.send(await svc.getAssignments(req.params.id, req.query, req.user))
    },
  })
}
