import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

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

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        ticket: true,
        items: { include: { service: true } },
        createdBy: true,
      },
    })

    if (!quote) {
      return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { quote } })
  } catch (error) {
    console.error('Get quote error:', error)
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

    // If status is being updated to APPROVED, update ticket
    if (data.status === 'APPROVED') {
      const quote = await prisma.quote.findUnique({ where: { id } })
      if (quote?.ticketId) {
        await prisma.repairTicket.update({
          where: { id: quote.ticketId },
          data: {
            estimatedCost: quote.total,
            status: 'IN_REPAIR',
          },
        })
      }
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
      },
      include: {
        customer: true,
        ticket: true,
        items: true,
        createdBy: true,
      },
    })

    return NextResponse.json({ success: true, data: { quote: updatedQuote } })
  } catch (error) {
    console.error('Update quote error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
