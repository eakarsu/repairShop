import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { parts: true, orders: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ success: true, data: { vendors } })
  } catch (error) {
    console.error('Get vendors error:', error)
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

    const vendor = await prisma.vendor.create({
      data: {
        name: data.name,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        notes: data.notes,
      },
    })

    return NextResponse.json({ success: true, data: { vendor } })
  } catch (error) {
    console.error('Create vendor error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
