import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
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

    // Get part to check inventory and get price
    const part = await prisma.part.findUnique({ where: { id: data.partId } })
    if (!part) {
      return NextResponse.json({ success: false, error: 'Part not found' }, { status: 404 })
    }

    if (part.quantity < data.quantity) {
      return NextResponse.json({ success: false, error: 'Insufficient inventory' }, { status: 400 })
    }

    // Add part to ticket
    const ticketPart = await prisma.ticketPart.create({
      data: {
        ticketId: id,
        partId: data.partId,
        quantity: data.quantity,
        unitPrice: data.unitPrice || part.sellingPrice,
      },
      include: { part: true },
    })

    // Update inventory
    await prisma.part.update({
      where: { id: data.partId },
      data: { quantity: { decrement: data.quantity } },
    })

    // Update ticket parts cost
    const allParts = await prisma.ticketPart.findMany({
      where: { ticketId: id },
    })
    const partsCost = allParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)

    await prisma.repairTicket.update({
      where: { id },
      data: { partsCost },
    })

    return NextResponse.json({ success: true, data: { ticketPart } })
  } catch (error) {
    console.error('Add part to ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { ticketPartId } = await request.json()

    const ticketPart = await prisma.ticketPart.findUnique({
      where: { id: ticketPartId },
    })

    if (!ticketPart) {
      return NextResponse.json({ success: false, error: 'Ticket part not found' }, { status: 404 })
    }

    // Restore inventory
    await prisma.part.update({
      where: { id: ticketPart.partId },
      data: { quantity: { increment: ticketPart.quantity } },
    })

    // Delete ticket part
    await prisma.ticketPart.delete({ where: { id: ticketPartId } })

    // Update ticket parts cost
    const allParts = await prisma.ticketPart.findMany({
      where: { ticketId: id },
    })
    const partsCost = allParts.reduce((sum, p) => sum + p.unitPrice * p.quantity, 0)

    await prisma.repairTicket.update({
      where: { id },
      data: { partsCost },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove part from ticket error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
