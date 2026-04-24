import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ success: false, error: 'Verification token is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid verification token' }, { status: 400 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Email already verified' })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    })

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json({ success: false, error: 'Failed to verify email' }, { status: 500 })
  }
}
