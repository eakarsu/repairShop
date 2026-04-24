import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { registrationSchema, formatZodErrors } from '@/lib/validation'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = registrationSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: formatZodErrors(result.error) },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)
    const emailVerifyToken = crypto.randomBytes(32).toString('hex')

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'TECHNICIAN',
        emailVerifyToken,
        emailVerified: false,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    })

    return NextResponse.json({ success: true, data: { user } }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 })
  }
}
