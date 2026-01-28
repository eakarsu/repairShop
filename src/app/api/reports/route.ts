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
    const type = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const endDate = searchParams.get('endDate') || new Date().toISOString()

    const dateFilter = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }

    if (type === 'overview') {
      // Dashboard overview stats
      const [
        totalTickets,
        openTickets,
        completedToday,
        totalRevenue,
        ticketsByStatus,
        recentTickets,
        lowStockParts,
      ] = await Promise.all([
        prisma.repairTicket.count(),
        prisma.repairTicket.count({
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        }),
        prisma.repairTicket.count({
          where: {
            completedDate: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        prisma.sale.aggregate({
          where: { paymentStatus: 'COMPLETED', ...dateFilter },
          _sum: { total: true },
        }),
        prisma.repairTicket.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.repairTicket.findMany({
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          include: { customer: true, device: true, technician: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.part.findMany({
          where: {
            isActive: true,
            quantity: { lte: 5 },
          },
          include: { category: true },
          orderBy: { quantity: 'asc' },
          take: 10,
        }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          totalTickets,
          openTickets,
          completedToday,
          revenue: totalRevenue._sum.total || 0,
          ticketsByStatus: ticketsByStatus.map(s => ({
            status: s.status,
            count: s._count,
          })),
          recentTickets,
          lowStockParts,
        },
      })
    }

    if (type === 'revenue') {
      const sales = await prisma.sale.findMany({
        where: { paymentStatus: 'COMPLETED', ...dateFilter },
        include: { items: true },
        orderBy: { createdAt: 'asc' },
      })

      // Group by day
      const revenueByDay: Record<string, number> = {}
      sales.forEach(sale => {
        const day = sale.createdAt.toISOString().split('T')[0]
        revenueByDay[day] = (revenueByDay[day] || 0) + sale.total
      })

      const chartData = Object.entries(revenueByDay).map(([date, amount]) => ({
        date,
        amount,
      }))

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
      const partsRevenue = sales.reduce(
        (sum, sale) =>
          sum + sale.items.filter(i => i.itemType === 'part').reduce((s, i) => s + i.total, 0),
        0
      )
      const laborRevenue = sales.reduce(
        (sum, sale) =>
          sum + sale.items.filter(i => i.itemType === 'service').reduce((s, i) => s + i.total, 0),
        0
      )

      return NextResponse.json({
        success: true,
        data: {
          chartData,
          totalRevenue,
          partsRevenue,
          laborRevenue,
          averageTicketValue: sales.length ? totalRevenue / sales.length : 0,
        },
      })
    }

    if (type === 'tickets') {
      const tickets = await prisma.repairTicket.findMany({
        where: dateFilter,
        include: { customer: true, device: true },
      })

      // Calculate turnaround time for completed tickets
      const completedTickets = tickets.filter(t => t.completedDate)
      const avgTurnaround = completedTickets.length
        ? completedTickets.reduce((sum, t) => {
            const intake = t.intakeDate.getTime()
            const complete = t.completedDate!.getTime()
            return sum + (complete - intake) / (1000 * 60 * 60)
          }, 0) / completedTickets.length
        : 0

      // Group by status
      const byStatus: Record<string, number> = {}
      tickets.forEach(t => {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1
      })

      // Group by day
      const byDay: Record<string, number> = {}
      tickets.forEach(t => {
        const day = t.createdAt.toISOString().split('T')[0]
        byDay[day] = (byDay[day] || 0) + 1
      })

      return NextResponse.json({
        success: true,
        data: {
          total: tickets.length,
          completed: completedTickets.length,
          avgTurnaroundHours: Math.round(avgTurnaround * 10) / 10,
          byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
          byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
        },
      })
    }

    if (type === 'parts') {
      const parts = await prisma.part.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { quantity: 'asc' },
      })

      const lowStock = parts.filter(p => p.quantity <= p.minQuantity)
      const outOfStock = parts.filter(p => p.quantity === 0)

      // Get usage stats
      const ticketParts = await prisma.ticketPart.findMany({
        where: { createdAt: dateFilter.createdAt },
        include: { part: true },
      })

      const usageByPart: Record<string, { name: string; quantity: number; revenue: number }> = {}
      ticketParts.forEach(tp => {
        if (!usageByPart[tp.partId]) {
          usageByPart[tp.partId] = { name: tp.part.name, quantity: 0, revenue: 0 }
        }
        usageByPart[tp.partId].quantity += tp.quantity
        usageByPart[tp.partId].revenue += tp.quantity * tp.unitPrice
      })

      const topUsed = Object.values(usageByPart)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10)

      return NextResponse.json({
        success: true,
        data: {
          total: parts.length,
          lowStock: lowStock.length,
          outOfStock: outOfStock.length,
          lowStockParts: lowStock.slice(0, 20),
          topUsed,
          totalValue: parts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0),
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 })
  } catch (error) {
    console.error('Get reports error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
