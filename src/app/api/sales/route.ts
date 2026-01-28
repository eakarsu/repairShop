import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateSaleNumber, calculateTax } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (customerId) where.customerId = customerId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate)
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate)
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          ticket: true,
          items: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        sales,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Get sales error:', error)
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

    // Generate unique sale number
    let saleNumber = generateSaleNumber()
    let exists = await prisma.sale.findUnique({ where: { saleNumber } })
    while (exists) {
      saleNumber = generateSaleNumber()
      exists = await prisma.sale.findUnique({ where: { saleNumber } })
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

    const sale = await prisma.sale.create({
      data: {
        saleNumber,
        customerId: data.customerId,
        ticketId: data.ticketId,
        userId: user.id,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        total,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus || 'COMPLETED',
        paymentReference: data.paymentReference,
        notes: data.notes,
        items: {
          create: data.items.map((item: { itemType: string; partId?: string; serviceId?: string; description: string; quantity: number; unitPrice: number }) => ({
            itemType: item.itemType,
            partId: item.partId,
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
        user: true,
      },
    })

    // Update ticket status if linked to a ticket
    if (data.ticketId) {
      await prisma.repairTicket.update({
        where: { id: data.ticketId },
        data: {
          status: 'COMPLETED',
          actualCost: total,
          pickupDate: new Date(),
        },
      })
    }

    // Update inventory for parts
    for (const item of data.items) {
      if (item.partId) {
        await prisma.part.update({
          where: { id: item.partId },
          data: { quantity: { decrement: item.quantity } },
        })
      }
    }

    return NextResponse.json({ success: true, data: { sale } })
  } catch (error) {
    console.error('Create sale error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
