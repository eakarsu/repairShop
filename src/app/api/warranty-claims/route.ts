import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { WarrantyClaimStatus } from '@prisma/client'
import { generateClaimNumber } from '@/lib/utils'

// GET - List all warranty claims
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
    const search = searchParams.get('search')

    const where: any = {}

    if (status && status in WarrantyClaimStatus) {
      where.status = status as WarrantyClaimStatus
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (search) {
      where.OR = [
        { claimNumber: { contains: search, mode: 'insensitive' } },
        { productDescription: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const claims = await prisma.warrantyClaim.findMany({
      where,
      include: {
        customer: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            status: true
          }
        },
        _count: {
          select: { documents: true, statusHistory: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ success: true, data: claims })
  } catch (error) {
    console.error('Warranty claims fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch warranty claims' },
      { status: 500 }
    )
  }
}

// POST - Create new warranty claim
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerId,
      ticketId,
      productDescription,
      purchaseDate,
      warrantyEndDate,
      issueDescription,
      claimAmount
    } = body

    if (!customerId || !productDescription || !issueDescription) {
      return NextResponse.json(
        { success: false, error: 'Customer, product description, and issue description are required' },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Create claim
    const claim = await prisma.warrantyClaim.create({
      data: {
        claimNumber: generateClaimNumber(),
        customerId,
        ticketId: ticketId || null,
        productDescription,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyEndDate: warrantyEndDate ? new Date(warrantyEndDate) : null,
        issueDescription,
        claimAmount: claimAmount || null,
        status: 'SUBMITTED',
        statusHistory: {
          create: {
            toStatus: 'SUBMITTED',
            notes: 'Claim submitted',
            changedBy: `${user.firstName} ${user.lastName}`
          }
        }
      },
      include: {
        customer: true,
        ticket: true,
        statusHistory: true
      }
    })

    return NextResponse.json({ success: true, data: claim })
  } catch (error) {
    console.error('Warranty claim create error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create warranty claim' },
      { status: 500 }
    )
  }
}
