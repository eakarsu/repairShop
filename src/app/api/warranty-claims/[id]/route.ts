import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WarrantyClaimStatus } from '@prisma/client'

// GET - Get single warranty claim
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

    const claim = await prisma.warrantyClaim.findUnique({
      where: { id },
      include: {
        customer: true,
        ticket: {
          include: {
            device: true
          }
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    })

    if (!claim) {
      return NextResponse.json(
        { success: false, error: 'Warranty claim not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: claim })
  } catch (error) {
    console.error('Warranty claim fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warranty claim' },
      { status: 500 }
    )
  }
}

// PUT - Update warranty claim
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
    const body = await request.json()

    // Get current claim
    const currentClaim = await prisma.warrantyClaim.findUnique({
      where: { id }
    })

    if (!currentClaim) {
      return NextResponse.json(
        { success: false, error: 'Warranty claim not found' },
        { status: 404 }
      )
    }

    const {
      status,
      productDescription,
      issueDescription,
      resolution,
      approvedAmount,
      notes
    } = body

    // Prepare update data
    const updateData: any = {}

    if (productDescription !== undefined) updateData.productDescription = productDescription
    if (issueDescription !== undefined) updateData.issueDescription = issueDescription
    if (resolution !== undefined) updateData.resolution = resolution
    if (approvedAmount !== undefined) updateData.approvedAmount = approvedAmount

    // Handle status change
    if (status && status !== currentClaim.status) {
      updateData.status = status as WarrantyClaimStatus

      // Set review/resolve dates based on status
      if (status === 'UNDER_REVIEW' && !currentClaim.reviewedAt) {
        updateData.reviewedAt = new Date()
      }
      if (['COMPLETED', 'APPROVED', 'REJECTED'].includes(status) && !currentClaim.resolvedAt) {
        updateData.resolvedAt = new Date()
      }

      // Create status history entry
      await prisma.warrantyClaimStatusHistory.create({
        data: {
          claimId: id,
          fromStatus: currentClaim.status,
          toStatus: status as WarrantyClaimStatus,
          notes: notes || `Status changed to ${status}`,
          changedBy: `${user.firstName} ${user.lastName}`
        }
      })
    }

    const claim = await prisma.warrantyClaim.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        ticket: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' }
        },
        documents: true
      }
    })

    return NextResponse.json({ success: true, data: claim })
  } catch (error) {
    console.error('Warranty claim update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update warranty claim' },
      { status: 500 }
    )
  }
}

// DELETE - Delete warranty claim
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/manager can delete
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.warrantyClaim.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Warranty claim delete error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete warranty claim' },
      { status: 500 }
    )
  }
}
