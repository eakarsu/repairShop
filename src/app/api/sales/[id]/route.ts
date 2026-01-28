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

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        ticket: { include: { device: true } },
        items: { include: { part: true, service: true } },
        user: true,
      },
    })

    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { sale } })
  } catch (error) {
    console.error('Get sale error:', error)
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

    const sale = await prisma.sale.update({
      where: { id },
      data: {
        paymentStatus: data.paymentStatus,
        paymentReference: data.paymentReference,
        notes: data.notes,
      },
      include: {
        customer: true,
        ticket: true,
        items: true,
        user: true,
      },
    })

    return NextResponse.json({ success: true, data: { sale } })
  } catch (error) {
    console.error('Update sale error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
