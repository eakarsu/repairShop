import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Retrieve quote details for approval page
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const approval = await prisma.quoteApproval.findUnique({
      where: { token },
      include: {
        quote: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            },
            items: {
              include: {
                service: true
              }
            },
            ticket: {
              include: {
                device: true
              }
            }
          }
        }
      }
    })

    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Invalid approval link' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > approval.expiresAt) {
      await prisma.quoteApproval.update({
        where: { id: approval.id },
        data: { status: 'EXPIRED' }
      })
      return NextResponse.json(
        { success: false, error: 'This approval link has expired' },
        { status: 410 }
      )
    }

    // Mark as viewed if first time
    if (!approval.viewedAt) {
      await prisma.quoteApproval.update({
        where: { id: approval.id },
        data: {
          viewedAt: new Date(),
          status: 'VIEWED'
        }
      })
    }

    // Get shop info
    const shopSettings = await prisma.setting.findMany({
      where: {
        key: { in: ['shop_name', 'shop_address', 'shop_phone', 'shop_email'] }
      }
    })

    const shopInfo = shopSettings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      success: true,
      data: {
        quote: {
          quoteNumber: approval.quote.quoteNumber,
          subtotal: approval.quote.subtotal,
          taxRate: approval.quote.taxRate,
          taxAmount: approval.quote.taxAmount,
          discount: approval.quote.discount,
          total: approval.quote.total,
          validUntil: approval.quote.validUntil,
          notes: approval.quote.notes,
          items: approval.quote.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            serviceName: item.service?.name
          })),
          device: approval.quote.ticket?.device ? {
            deviceType: approval.quote.ticket.device.deviceType,
            brand: approval.quote.ticket.device.brand,
            model: approval.quote.ticket.device.model
          } : null
        },
        customer: approval.quote.customer,
        status: approval.status,
        respondedAt: approval.respondedAt,
        customerNotes: approval.customerNotes,
        shopInfo
      }
    })
  } catch (error) {
    console.error('Approval fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approval details' },
      { status: 500 }
    )
  }
}

// POST - Submit approval response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, notes } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const approval = await prisma.quoteApproval.findUnique({
      where: { token },
      include: {
        quote: true
      }
    })

    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Invalid approval link' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > approval.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'This approval link has expired' },
        { status: 410 }
      )
    }

    // Check if already responded
    if (approval.respondedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already responded to this quote' },
        { status: 400 }
      )
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    const newApprovalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
    const newQuoteStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

    // Update approval
    await prisma.quoteApproval.update({
      where: { id: approval.id },
      data: {
        status: newApprovalStatus,
        respondedAt: new Date(),
        customerNotes: notes || null,
        ipAddress: ip
      }
    })

    // Update quote status
    await prisma.quote.update({
      where: { id: approval.quoteId },
      data: { status: newQuoteStatus }
    })

    // If approved and linked to ticket, update ticket status
    if (action === 'approve' && approval.quote.ticketId) {
      await prisma.repairTicket.update({
        where: { id: approval.quote.ticketId },
        data: { status: 'IN_REPAIR' }
      })

      // Add status history
      await prisma.ticketStatusHistory.create({
        data: {
          ticketId: approval.quote.ticketId,
          fromStatus: 'WAITING_APPROVAL',
          toStatus: 'IN_REPAIR',
          notes: 'Customer approved quote'
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Quote approved! We will begin work on your repair shortly.'
        : 'Quote declined. Thank you for your response.'
    })
  } catch (error) {
    console.error('Approval submit error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to submit response' },
      { status: 500 }
    )
  }
}
