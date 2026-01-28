import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, generateQuoteApprovalEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id: quoteId } = await params

    // Get quote with customer info
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        approval: true
      }
    })

    if (!quote) {
      return NextResponse.json(
        { success: false, error: 'Quote not found' },
        { status: 404 }
      )
    }

    if (!quote.customer.email) {
      return NextResponse.json(
        { success: false, error: 'Customer does not have an email address' },
        { status: 400 }
      )
    }

    // Check if approval already exists
    let approval = quote.approval

    if (!approval) {
      // Create new approval record
      const expiresAt = new Date(quote.validUntil)

      approval = await prisma.quoteApproval.create({
        data: {
          quoteId,
          expiresAt,
          sentToEmail: quote.customer.email
        }
      })
    }

    // Generate approval link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const approvalLink = `${baseUrl}/approve/${approval.token}`

    // Get shop name from settings
    const shopSetting = await prisma.setting.findUnique({
      where: { key: 'shop_name' }
    })
    const shopName = shopSetting?.value || 'RepairShop Pro'

    // Generate and send email
    const emailContent = generateQuoteApprovalEmail(
      `${quote.customer.firstName} ${quote.customer.lastName}`,
      quote.quoteNumber,
      quote.total,
      approvalLink,
      shopName,
      quote.validUntil
    )

    await sendEmail({
      to: quote.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    })

    // Update approval record
    await prisma.quoteApproval.update({
      where: { id: approval.id },
      data: {
        sentAt: new Date(),
        sentToEmail: quote.customer.email,
        status: 'PENDING'
      }
    })

    // Update quote status to SENT
    await prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SENT' }
    })

    return NextResponse.json({
      success: true,
      data: {
        approvalLink,
        sentTo: quote.customer.email,
        expiresAt: approval.expiresAt
      },
      message: 'Approval email sent successfully (simulated)'
    })
  } catch (error) {
    console.error('Send approval error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send approval request' },
      { status: 500 }
    )
  }
}
