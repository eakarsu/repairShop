import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const { type, ids } = await request.json()

    if (!type || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Type and ids array are required' }, { status: 400 })
    }

    let count = 0

    switch (type) {
      case 'tickets':
        ({ count } = await prisma.repairTicket.deleteMany({ where: { id: { in: ids } } }))
        break
      case 'customers':
        ({ count } = await prisma.customer.deleteMany({ where: { id: { in: ids } } }))
        break
      case 'inventory':
        ({ count } = await prisma.part.deleteMany({ where: { id: { in: ids } } }))
        break
      case 'orders':
        ({ count } = await prisma.order.deleteMany({ where: { id: { in: ids } } }))
        break
      case 'quotes':
        ({ count } = await prisma.quote.deleteMany({ where: { id: { in: ids } } }))
        break
      case 'warranty-claims':
        ({ count } = await prisma.warrantyClaim.deleteMany({ where: { id: { in: ids } } }))
        break
      default:
        return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: { deleted: count } })
  } catch (error) {
    console.error('Bulk delete error:', error)
    return NextResponse.json({ success: false, error: 'Bulk delete failed' }, { status: 500 })
  }
}
