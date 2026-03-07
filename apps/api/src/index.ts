import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import cors from '@fastify/cors'
import sensible from '@fastify/sensible'
import { authPlugin } from './plugins/auth.js'
import { auditPlugin } from './plugins/audit.js'
import { authRoutes } from './routes/auth.js'
import { templateRoutes } from './routes/templates.js'
import { cycleRoutes } from './routes/cycles.js'
import { assignmentRoutes } from './routes/assignments.js'
import { reportRoutes } from './routes/reports.js'
import { pdpRoutes } from './routes/pdp.js'
import { registerJobs } from './jobs/notifications.js'

const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST ?? '0.0.0.0'
const IS_PROD = process.env.NODE_ENV === 'production'

const app = Fastify({
  logger: IS_PROD
    ? true
    : { transport: { target: 'pino-pretty', options: { colorize: true } } },
})

// ─── Compiler (Zod) ──────────────────────────────────────────────────────────
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// ─── Plugins ─────────────────────────────────────────────────────────────────
await app.register(cors, {
  origin: process.env.APP_URL ?? 'http://localhost:3000',
  credentials: true,
})
await app.register(sensible)
await app.register(authPlugin)
await app.register(auditPlugin)

// ─── Routes ──────────────────────────────────────────────────────────────────
await app.register(authRoutes, { prefix: '/auth' })
await app.register(templateRoutes, { prefix: '/templates' })
await app.register(cycleRoutes, { prefix: '/cycles' })
await app.register(assignmentRoutes, { prefix: '/assignments' })
await app.register(reportRoutes, { prefix: '/reports' })
await app.register(pdpRoutes, { prefix: '/pdp' })

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok' }))

// ─── Jobs ────────────────────────────────────────────────────────────────────
registerJobs(app)

// ─── Start ───────────────────────────────────────────────────────────────────
try {
  await app.listen({ port: PORT, host: HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
