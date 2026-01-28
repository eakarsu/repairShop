import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateQuoteNumber, calculateTax } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (customerId) where.customerId = customerId

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          customer: true,
          ticket: true,
          items: true,
          createdBy: true,
          approval: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        quotes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get quotes error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Generate unique quote number
    let quoteNumber = generateQuoteNumber()
    let exists = await prisma.quote.findUnique({ where: { quoteNumber } })
    while (exists) {
      quoteNumber = generateQuoteNumber()
      exists = await prisma.quote.findUnique({ where: { quoteNumber } })
    }

    // Get tax rate from settings
    const taxRateSetting = await prisma.setting.findUnique({ where: { key: 'tax_rate' } })
    const taxRate = parseFloat(taxRateSetting?.value || '8.625')

    // Calculate totals
    const subtotal = data.items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    )
    const discount = data.discount || 0
    const taxAmount = calculateTax(subtotal - discount, taxRate)
    const total = subtotal - discount + taxAmount

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        customerId: data.customerId,
        ticketId: data.ticketId || null,
        createdById: user.id,
        status: data.status || 'DRAFT',
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        validUntil: new Date(data.validUntil || Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: data.notes,
        items: {
          create: data.items.map((item: { itemType: string; serviceId?: string; description: string; quantity: number; unitPrice: number }) => ({
            itemType: item.itemType,
            serviceId: item.serviceId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        ticket: true,
        items: true,
        createdBy: true,
      },
    })

    return NextResponse.json({ success: true, data: { quote } })
  } catch (error) {
    console.error('Create quote error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
