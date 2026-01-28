import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { approveAutoOrder, rejectAutoOrder } from '@/lib/autoOrder'

// GET - Get single auto order log
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

    const log = await prisma.autoOrderLog.findUnique({
      where: { id },
      include: {
        part: {
          include: {
            vendor: true,
            category: true,
            autoOrderRule: true
          }
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        order: {
          include: {
            vendor: true,
            items: true
          }
        }
      }
    })

    if (!log) {
      return NextResponse.json(
        { success: false, error: 'Auto order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: log })
  } catch (error) {
    console.error('Auto order fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auto order' },
      { status: 500 }
    )
  }
}

// PUT - Approve or reject auto order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can approve orders
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, reason } = body

    if (action === 'approve') {
      const order = await approveAutoOrder(id, user.id)
      return NextResponse.json({
        success: true,
        data: order,
        message: 'Auto order approved and purchase order created'
      })
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        )
      }
      const log = await rejectAutoOrder(id, user.id, reason)
      return NextResponse.json({
        success: true,
        data: log,
        message: 'Auto order rejected'
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auto order update error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to update auto order'
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
