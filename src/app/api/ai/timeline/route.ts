import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getTimelineEstimate } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await request.json()

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      )
    }

    // Get ticket with device info
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: ticketId },
      include: {
        device: true,
        partsUsed: { include: { part: true } },
        technician: true
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Get queue size (tickets before this one that aren't completed)
    const queueSize = await prisma.repairTicket.count({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        createdAt: { lt: ticket.createdAt },
        technicianId: ticket.technicianId
      }
    })

    // Check parts availability
    const partsAvailable = ticket.partsUsed.every(tp => tp.part.quantity >= tp.quantity)

    // Get technician workload
    let technicianWorkload = 0
    if (ticket.technicianId) {
      technicianWorkload = await prisma.repairTicket.count({
        where: {
          technicianId: ticket.technicianId,
          status: { in: ['DIAGNOSING', 'IN_REPAIR', 'QUALITY_CHECK'] }
        }
      })
    }

    // Get AI timeline estimate
    const result = await getTimelineEstimate(
      ticket.device?.deviceType || 'Unknown Device',
      ticket.device?.brand || 'Unknown',
      ticket.device?.model || 'Unknown',
      ticket.issueDescription,
      ticket.priority,
      queueSize,
      partsAvailable,
      technicianWorkload
    )

    // Update ticket with timeline info
    await prisma.repairTicket.update({
      where: { id: ticketId },
      data: {
        estimatedStartDate: new Date(result.estimatedStartDate),
        estimatedCompletion: new Date(result.estimatedCompletionDate),
        estimatedDuration: result.estimatedDurationMinutes,
        timelineMilestones: JSON.stringify(result.milestones),
        complexityScore: result.complexityScore
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        queuePosition: queueSize + 1,
        partsAvailable,
        technicianWorkload
      }
    })
  } catch (error) {
    console.error('AI Timeline error:', error)
    const errorMessage = error instanceof Error ? error.message : 'AI service unavailable'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

// GET - Retrieve timeline for a ticket
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'ticketId is required' },
        { status: 400 }
      )
    }

    const ticket = await prisma.repairTicket.findUnique({
      where: { id: ticketId },
      select: {
        estimatedStartDate: true,
        estimatedCompletion: true,
        estimatedDuration: true,
        timelineMilestones: true,
        complexityScore: true,
        status: true,
        priority: true
      }
    })

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        estimatedStartDate: ticket.estimatedStartDate,
        estimatedCompletionDate: ticket.estimatedCompletion,
        estimatedDurationMinutes: ticket.estimatedDuration,
        milestones: ticket.timelineMilestones ? JSON.parse(ticket.timelineMilestones) : [],
        complexityScore: ticket.complexityScore,
        status: ticket.status,
        priority: ticket.priority
      }
    })
  } catch (error) {
    console.error('AI Timeline GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch timeline' }, { status: 500 })
  }
}
