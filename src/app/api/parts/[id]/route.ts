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

    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        category: true,
        vendor: true,
        ticketParts: {
          include: { ticket: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!part) {
      return NextResponse.json({ success: false, error: 'Part not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { part } })
  } catch (error) {
    console.error('Get part error:', error)
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

    const part = await prisma.part.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        location: data.location,
        compatibleWith: data.compatibleWith,
        vendorId: data.vendorId,
        isActive: data.isActive,
      },
      include: {
        category: true,
        vendor: true,
      },
    })

    return NextResponse.json({ success: true, data: { part } })
  } catch (error) {
    console.error('Update part error:', error)
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

    // Soft delete - just mark as inactive
    await prisma.part.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete part error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
