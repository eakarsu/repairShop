import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AutoOrderStatus } from '@prisma/client'
import { getPendingAutoOrders, triggerAutoOrders, checkLowStockParts } from '@/lib/autoOrder'

// GET - List auto order logs
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const pending = searchParams.get('pending')

    if (pending === 'true') {
      const pendingOrders = await getPendingAutoOrders()
      return NextResponse.json({ success: true, data: pendingOrders })
    }

    const where: any = {}
    if (status && status in AutoOrderStatus) {
      where.status = status as AutoOrderStatus
    }

    const logs = await prisma.autoOrderLog.findMany({
      where,
      include: {
        part: {
          include: {
            vendor: true,
            category: true
          }
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error) {
    console.error('Auto orders fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auto orders' },
      { status: 500 }
    )
  }
}

// POST - Trigger auto order check
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'check-low-stock') {
      const lowStockParts = await checkLowStockParts()
      return NextResponse.json({ success: true, data: lowStockParts })
    }

    if (action === 'trigger') {
      const results = await triggerAutoOrders()
      return NextResponse.json({
        success: true,
        data: results,
        message: `Created ${results.length} auto-order request(s)`
      })
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auto orders trigger error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process auto orders' },
      { status: 500 }
    )
  }
}
