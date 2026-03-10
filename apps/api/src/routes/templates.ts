import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  createTemplateSchema,
  updateTemplateSchema,
  toggleActiveSchema,
  idParamSchema,
  paginationSchema,
} from '@reviews360/zod-schemas'
import { TemplateService } from '../services/template.service.js'

export async function templateRoutes(app: FastifyInstance): Promise<void> {
  const svc = new TemplateService(app)
  const adminOnly = [app.authorize('admin')]

  app.withTypeProvider<ZodTypeProvider>().post('/', {
    preHandler: adminOnly,
    schema: { body: createTemplateSchema },
    handler: async (req, reply) => {
      const template = await svc.create(req.body)
      return reply.code(201).send(template)
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/', {
    preHandler: [app.authenticate],
    schema: { querystring: paginationSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.findAll(req.query))
    },
  })

  app.withTypeProvider<ZodTypeProvider>().get('/:id', {
    preHandler: [app.authenticate],
    schema: { params: idParamSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.findById(req.params.id))
    },
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/:id', {
    preHandler: adminOnly,
    schema: { params: idParamSchema, body: updateTemplateSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.update(req.params.id, req.body))
    },
  })

  app.withTypeProvider<ZodTypeProvider>().patch('/:id/active', {
    preHandler: adminOnly,
    schema: { params: idParamSchema, body: toggleActiveSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.toggleActive(req.params.id, req.body))
    },
  })
}
