import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import { generateToken, verifyPassword } from '@/lib/auth'

export async function POST() {
  const email = process.env.DEMO_EMAIL?.trim().toLowerCase()
  const password = process.env.DEMO_PASSWORD
  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Demo account is not configured.' }, { status: 503 })
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user?.isActive || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ success: false, error: 'Configured demo account is unavailable.' }, { status: 503 })
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role })
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Demo login is unavailable.' }, { status: 503 })
  }
}
