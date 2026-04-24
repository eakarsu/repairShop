import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { type, ids, data } = await request.json()

    if (!type || !Array.isArray(ids) || ids.length === 0 || !data) {
      return NextResponse.json({ success: false, error: 'Type, ids array, and data are required' }, { status: 400 })
    }

    let count = 0

    switch (type) {
      case 'tickets':
        ({ count } = await prisma.repairTicket.updateMany({ where: { id: { in: ids } }, data }))
        break
      case 'orders':
        ({ count } = await prisma.order.updateMany({ where: { id: { in: ids } }, data }))
        break
      case 'quotes':
        ({ count } = await prisma.quote.updateMany({ where: { id: { in: ids } }, data }))
        break
      case 'warranty-claims':
        ({ count } = await prisma.warrantyClaim.updateMany({ where: { id: { in: ids } }, data }))
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { updated: count } })
  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ success: false, error: 'Bulk update failed' }, { status: 500 })
  }
}
