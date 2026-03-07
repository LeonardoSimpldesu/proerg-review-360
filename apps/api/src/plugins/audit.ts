import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export type AuditAction =
  | 'cycle.created'
  | 'cycle.activated'
  | 'cycle.closed'
  | 'cycle.published'
  | 'assignment.submitted'
  | 'report.accessed'
  | 'pdp.created'
  | 'pdp.updated'

declare module 'fastify' {
  interface FastifyInstance {
    audit: (params: {
      actorId: string
      action: AuditAction
      entity: string
      entityId: string
      metadata?: Record<string, unknown>
    }) => Promise<void>
  }
}

export const auditPlugin = fp(async (app: FastifyInstance) => {
  app.decorate(
    'audit',
    async (params: {
      actorId: string
      action: AuditAction
      entity: string
      entityId: string
      metadata?: Record<string, unknown>
    }) => {
      await prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      })
    }
  )
})
