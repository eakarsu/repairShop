import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId')

    const where = customerId ? { customerId } : {}

    const devices = await prisma.device.findMany({
      where,
      include: {
        customer: true,
        _count: { select: { tickets: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: { devices } })
  } catch (error) {
    console.error('Get devices error:', error)
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

    const device = await prisma.device.create({
      data: {
        customerId: data.customerId,
        deviceType: data.deviceType,
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        color: data.color,
        condition: data.condition,
        accessories: data.accessories,
        password: data.password,
        notes: data.notes,
      },
      include: { customer: true },
    })

    return NextResponse.json({ success: true, data: { device } })
  } catch (error) {
    console.error('Create device error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
