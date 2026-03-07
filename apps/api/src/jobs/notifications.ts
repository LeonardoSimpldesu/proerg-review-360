import cron from 'node-cron'
import nodemailer from 'nodemailer'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

function createTransport(): ReturnType<typeof nodemailer.createTransport> {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

async function sendReminderEmails(daysAhead: number): Promise<void> {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysAhead)
  const dayStart = new Date(targetDate.setHours(0, 0, 0, 0))
  const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999))

  const assignments = await prisma.reviewAssignment.findMany({
    where: {
      dueAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['pending', 'in_progress'] },
    },
    include: {
      reviewer: { include: { user: { select: { name: true, email: true } } } },
      reviewee: { include: { user: { select: { name: true } } } },
      cycle: { select: { name: true } },
    },
    take: 500,
  })

  if (assignments.length === 0) return

  const transporter = createTransport()
  const from = process.env.EMAIL_FROM ?? 'Reviews 360 <no-reply@example.com>'
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'

  await Promise.allSettled(
    assignments.map((a) =>
      transporter.sendMail({
        from,
        to: a.reviewer.user.email,
        subject: `[Reviews 360] Lembrete: avaliação vence em ${daysAhead} dia(s)`,
        html: `
          <p>Olá, ${a.reviewer.user.name}!</p>
          <p>Você tem uma avaliação pendente de <strong>${a.reviewee.user.name}</strong>
             no ciclo <strong>${a.cycle.name}</strong> que vence em ${daysAhead} dia(s).</p>
          <p><a href="${appUrl}">Acessar Reviews 360</a></p>
        `,
      })
    )
  )
}

export function registerJobs(app: FastifyInstance): void {
  // Run daily at 08:00
  cron.schedule('0 8 * * *', async () => {
    app.log.info('Running notification job...')
    try {
      await Promise.all([
        sendReminderEmails(7),
        sendReminderEmails(3),
        sendReminderEmails(1),
      ])
    } catch (err) {
      app.log.error({ err }, 'Notification job failed')
    }
  })

  app.log.info('Notification jobs registered (daily at 08:00)')
}
