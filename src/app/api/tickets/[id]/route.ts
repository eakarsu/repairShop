import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TicketStatus } from '@prisma/client'
import { assertTicketTransition } from '@/lib/ticketLifecycle'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.repairTicket.findUnique({
      where: { id },
      include: {
        customer: true,
        device: true,
        technician: true,
        createdBy: true,
        partsUsed: { include: { part: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        communications: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
        },
        quotes: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        },
        sale: { include: { items: true } },
      },
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { ticket } })
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const data = await request.json()

    // Get current ticket to check for status change
    const currentTicket = await prisma.repairTicket.findUnique({ where: { id } })
    if (!currentTicket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    // Handle status change
    if (data.status && data.status !== currentTicket.status) {
      try {
        assertTicketTransition(currentTicket.status, data.status)
      } catch (error) {
        return NextResponse.json({ success: false, error: (error as Error).message }, { status: 409 })
      }
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: id,
          fromStatus: currentTicket.status,
          toStatus: data.status as TicketStatus,
          notes: data.statusNote,
        },
      })

      // Set completed date if moving to COMPLETED or READY_PICKUP
      if (data.status === 'COMPLETED' || data.status === 'READY_PICKUP') {
        data.completedDate = new Date()
      }
    }

    const ticket = await prisma.repairTicket.update({
      where: { id },
      data: {
        issueDescription: data.issueDescription,
        diagnosticNotes: data.diagnosticNotes,
        repairNotes: data.repairNotes,
        status: data.status,
        priority: data.priority,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
        laborCost: data.laborCost,
        partsCost: data.partsCost,
        technicianId: data.technicianId,
        estimatedCompletion: data.estimatedCompletion ? new Date(data.estimatedCompletion) : null,
        completedDate: data.completedDate,
        pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
        warrantyStatus: data.warrantyStatus,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      },
      include: {
        customer: true,
        device: true,
        technician: true,
        createdBy: true,
        partsUsed: { include: { part: true } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    })

    return NextResponse.json({ success: true, data: { ticket } })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await prisma.repairTicket.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
