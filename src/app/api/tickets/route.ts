import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateTicketNumber } from '@/lib/utils'
import { TicketStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const technicianId = searchParams.get('technicianId')
    const customerId = searchParams.get('customerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { issueDescription: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) where.status = status
    if (priority) where.priority = priority
    if (technicianId) where.technicianId = technicianId
    if (customerId) where.customerId = customerId

    const [tickets, total] = await Promise.all([
      prisma.repairTicket.findMany({
        where,
        include: {
          customer: true,
          device: true,
          technician: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.repairTicket.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get tickets error:', error)
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

    // Generate unique ticket number
    let ticketNumber = generateTicketNumber()
    let exists = await prisma.repairTicket.findUnique({ where: { ticketNumber } })
    while (exists) {
      ticketNumber = generateTicketNumber()
      exists = await prisma.repairTicket.findUnique({ where: { ticketNumber } })
    }

    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNumber,
        customerId: data.customerId,
        deviceId: data.deviceId,
        issueDescription: data.issueDescription,
        priority: data.priority || 'NORMAL',
        technicianId: data.technicianId,
        createdById: user.id,
        estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : null,
        warrantyStatus: data.warrantyStatus || 'NONE',
      },
      include: {
        customer: true,
        device: true,
        technician: true,
        createdBy: true,
      },
    })

    // Create initial status history
    await prisma.ticketStatusHistory.create({
      data: {
        ticketId: ticket.id,
        toStatus: TicketStatus.RECEIVED,
      },
    })

    return NextResponse.json({ success: true, data: { ticket } })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
