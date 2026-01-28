import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all auto order rules
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const rules = await prisma.autoOrderRule.findMany({
      include: {
        part: {
          include: {
            vendor: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: rules })
  } catch (error) {
    console.error('Auto order rules fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auto order rules' },
      { status: 500 }
    )
  }
}

// POST - Create or update auto order rule
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can create rules
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      partId,
      isEnabled = true,
      reorderPoint,
      reorderQuantity,
      maxAutoOrderQty,
      preferredVendorId
    } = body

    if (!partId || reorderPoint === undefined || reorderQuantity === undefined) {
      return NextResponse.json(
        { success: false, error: 'Part ID, reorder point, and reorder quantity are required' },
        { status: 400 }
      )
    }

    // Verify part exists
    const part = await prisma.part.findUnique({
      where: { id: partId }
    })

    if (!part) {
      return NextResponse.json(
        { success: false, error: 'Part not found' },
        { status: 404 }
      )
    }

    // Upsert rule (create or update)
    const rule = await prisma.autoOrderRule.upsert({
      where: { partId },
      update: {
        isEnabled,
        reorderPoint,
        reorderQuantity,
        maxAutoOrderQty: maxAutoOrderQty || null,
        preferredVendorId: preferredVendorId || null
      },
      create: {
        partId,
        isEnabled,
        reorderPoint,
        reorderQuantity,
        maxAutoOrderQty: maxAutoOrderQty || null,
        preferredVendorId: preferredVendorId || null
      },
      include: {
        part: {
          include: {
            vendor: true,
            category: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error('Auto order rule create error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create auto order rule' },
      { status: 500 }
    )
  }
}

// PUT - Update auto order rule (toggle enabled status)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can update rules
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { ruleId, isEnabled } = body

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    const rule = await prisma.autoOrderRule.update({
      where: { id: ruleId },
      data: { isEnabled },
      include: {
        part: {
          include: {
            vendor: true,
            category: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, data: rule })
  } catch (error) {
    console.error('Auto order rule update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update auto order rule' },
      { status: 500 }
    )
  }
}

// DELETE - Remove auto order rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can delete rules
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('id')

    if (!ruleId) {
      return NextResponse.json(
        { success: false, error: 'Rule ID is required' },
        { status: 400 }
      )
    }

    await prisma.autoOrderRule.delete({
      where: { id: ruleId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auto order rule delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete auto order rule' },
      { status: 500 }
    )
  }
}
