import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('Seeding database...')

  // ─── Teams ───────────────────────────────────────────────────────────────

  const engTeam = await prisma.team.upsert({
    where: { id: 'team-eng' },
    update: {},
    create: { id: 'team-eng', name: 'Engineering' },
  })

  // ─── Users ───────────────────────────────────────────────────────────────

  const hashedPassword = await bcrypt.hash('123456', 10)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'Admin Sistema',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    },
  })

  const managerUser = await prisma.user.upsert({
    where: { email: 'joao.silva@example.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao.silva@example.com',
      password: hashedPassword,
      role: 'manager',
    },
  })

  const emp1User = await prisma.user.upsert({
    where: { email: 'maria.santos@example.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria.santos@example.com',
      password: hashedPassword,
      role: 'employee',
    },
  })

  const emp2User = await prisma.user.upsert({
    where: { email: 'pedro.oliveira@example.com' },
    update: {},
    create: {
      name: 'Pedro Oliveira',
      email: 'pedro.oliveira@example.com',
      password: hashedPassword,
      role: 'employee',
    },
  })

  // ─── Employees ───────────────────────────────────────────────────────────

  const managerEmployee = await prisma.employee.upsert({
    where: { userId: managerUser.id },
    update: {},
    create: {
      userId: managerUser.id,
      jobTitle: 'Engineering Manager',
      teamId: engTeam.id,
    },
  })

  const emp1Employee = await prisma.employee.upsert({
    where: { userId: emp1User.id },
    update: {},
    create: {
      userId: emp1User.id,
      jobTitle: 'Software Engineer',
      teamId: engTeam.id,
      managerId: managerEmployee.id,
    },
  })

  await prisma.employee.upsert({
    where: { userId: emp2User.id },
    update: {},
    create: {
      userId: emp2User.id,
      jobTitle: 'Software Engineer',
      teamId: engTeam.id,
      managerId: managerEmployee.id,
    },
  })

  // ─── Template ────────────────────────────────────────────────────────────

  const template = await prisma.reviewTemplate.upsert({
    where: { id: 'template-default' },
    update: {},
    create: {
      id: 'template-default',
      name: 'Avaliação de Desempenho — Padrão',
      sections: {
        create: [
          {
            title: 'Competências Técnicas',
            order: 0,
            questions: {
              create: [
                { type: 'rating', text: 'Qualidade do código entregue', scaleMin: 1, scaleMax: 5, order: 0 },
                { type: 'rating', text: 'Domínio das ferramentas e tecnologias utilizadas', scaleMin: 1, scaleMax: 5, order: 1 },
                { type: 'text', text: 'Descreva os principais projetos ou entregas do período', order: 2 },
              ],
            },
          },
          {
            title: 'Competências Comportamentais',
            order: 1,
            questions: {
              create: [
                { type: 'rating', text: 'Colaboração e trabalho em equipe', scaleMin: 1, scaleMax: 5, order: 0 },
                { type: 'rating', text: 'Comunicação e clareza', scaleMin: 1, scaleMax: 5, order: 1 },
                { type: 'rating', text: 'Proatividade e autonomia', scaleMin: 1, scaleMax: 5, order: 2 },
              ],
            },
          },
          {
            title: 'Desenvolvimento',
            order: 2,
            questions: {
              create: [
                { type: 'rating', text: 'Busca por aprendizado e crescimento', scaleMin: 1, scaleMax: 5, order: 0 },
                { type: 'text', text: 'Quais são os principais pontos de melhoria?', order: 1 },
                { type: 'text', text: 'Quais metas você sugere para o próximo ciclo?', order: 2 },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seed completed.')
  console.log({
    admin: adminUser.email,
    manager: managerUser.email,
    employees: [emp1User.email, emp2User.email],
    template: template.name,
    team: engTeam.name,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
