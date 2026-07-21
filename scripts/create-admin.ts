import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') throw new Error('Explicit administrator bootstrap acknowledgement is required')
  const email = String(process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase()
  const password = String(process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD || '')
  const words = String(process.env.BOOTSTRAP_ADMIN_NAME || 'Initial Administrator').trim().split(/\s+/)
  if (!email || !email.includes('@') || password.length < 16) throw new Error('A valid administrator email and 16+ character password are required')
  if (await prisma.user.count()) throw new Error('Administrator bootstrap refuses a non-empty user store')
  await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 12),
      firstName: words.shift() || 'Initial',
      lastName: words.join(' ') || 'Administrator',
      role: UserRole.ADMIN,
      isActive: true,
      emailVerified: true,
    },
  })
  console.log(`Provisioned administrator ${email}`)
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
