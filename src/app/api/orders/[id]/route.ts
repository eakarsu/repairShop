import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { OrderStatus } from '@prisma/client'

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

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: { include: { part: true } },
      },
    })

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { order } })
  } catch (error) {
    console.error('Get order error:', error)
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

    // If marking as received, update inventory
    if (data.status === OrderStatus.RECEIVED) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      })

      if (order) {
        for (const item of order.items) {
          await prisma.part.update({
            where: { id: item.partId },
            data: { quantity: { increment: item.quantity } },
          })

          await prisma.orderItem.update({
            where: { id: item.id },
            data: { receivedQty: item.quantity },
          })
        }
      }

      data.receivedDate = new Date()
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: data.status,
        notes: data.notes,
        expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
        receivedDate: data.receivedDate,
      },
      include: {
        vendor: true,
        items: { include: { part: true } },
      },
    })

    return NextResponse.json({ success: true, data: { order: updatedOrder } })
  } catch (error) {
    console.error('Update order error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
