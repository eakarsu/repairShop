import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateStatusMessage } from '@/lib/ai'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId, additionalNotes } = await request.json()

    if (!ticketId) {
      return NextResponse.json(
        { success: false, error: 'Ticket ID is required' },
        { status: 400 }
      )
    }

    // Get ticket details
    const ticket = await prisma.repairTicket.findUnique({
      where: { id: ticketId },
      include: { customer: true, device: true },
    })

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
    }

    const customerName = `${ticket.customer.firstName} ${ticket.customer.lastName}`
    const deviceInfo = ticket.device
      ? `${ticket.device.brand || ''} ${ticket.device.model || ''}`.trim() || ticket.device.deviceType
      : 'Device'

    const result = await generateStatusMessage(
      customerName,
      ticket.ticketNumber,
      ticket.status,
      deviceInfo,
      additionalNotes
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('AI Status Message error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
