import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')
    const ticketId = searchParams.get('ticketId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (customerId) where.customerId = customerId
    if (ticketId) where.ticketId = ticketId

    const [communications, total] = await Promise.all([
      prisma.communicationLog.findMany({
        where,
        include: {
          customer: true,
          ticket: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.communicationLog.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        communications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get communications error:', error)
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

    const communication = await prisma.communicationLog.create({
      data: {
        customerId: data.customerId,
        ticketId: data.ticketId,
        userId: user.id,
        type: data.type,
        direction: data.direction,
        subject: data.subject,
        content: data.content,
      },
      include: {
        customer: true,
        ticket: true,
        user: true,
      },
    })

    return NextResponse.json({ success: true, data: { communication } })
  } catch (error) {
    console.error('Create communication error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
