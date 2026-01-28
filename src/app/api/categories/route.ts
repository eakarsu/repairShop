import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { parts: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: { categories } })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
      },
    })

    return NextResponse.json({ success: true, data: { category } })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
