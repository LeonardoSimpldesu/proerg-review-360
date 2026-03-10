import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { paginationSchema } from '@reviews360/zod-schemas'
import { EmployeeService } from '../services/employee.service.js'

export async function employeeRoutes(app: FastifyInstance): Promise<void> {
  const svc = new EmployeeService(app)

  app.withTypeProvider<ZodTypeProvider>().get('/', {
    preHandler: [app.authorize('admin', 'manager')],
    schema: { querystring: paginationSchema },
    handler: async (req, reply) => {
      return reply.send(await svc.findAll(req.query))
    },
  })
}
