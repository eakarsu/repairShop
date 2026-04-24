import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSV).join(',')
  const dataLines = rows.map(row => row.map(escapeCSV).join(','))
  return [headerLine, ...dataLines].join('\n')
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const ids = searchParams.get('ids')?.split(',').filter(Boolean)

    let csv = ''
    let filename = ''

    switch (type) {
      case 'tickets': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const tickets = await prisma.repairTicket.findMany({
          where,
          include: { customer: true, device: true, technician: true },
          orderBy: { createdAt: 'desc' },
        })
        csv = toCSV(
          ['Ticket #', 'Customer', 'Device', 'Issue', 'Status', 'Priority', 'Technician', 'Estimated Cost', 'Actual Cost', 'Date'],
          tickets.map(t => [
            t.ticketNumber, `${t.customer.firstName} ${t.customer.lastName}`,
            t.device ? `${t.device.brand || ''} ${t.device.model || t.device.deviceType}`.trim() : '',
            t.issueDescription, t.status, t.priority,
            t.technician ? `${t.technician.firstName} ${t.technician.lastName}` : '',
            t.estimatedCost, t.actualCost, t.createdAt.toISOString().split('T')[0],
          ])
        )
        filename = 'tickets.csv'
        break
      }
      case 'customers': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const customers = await prisma.customer.findMany({
          where,
          include: { _count: { select: { tickets: true, devices: true } } },
          orderBy: { createdAt: 'desc' },
        })
        csv = toCSV(
          ['Name', 'Email', 'Phone', 'Address', 'City', 'State', 'ZIP', 'Devices', 'Tickets', 'Since'],
          customers.map(c => [
            `${c.firstName} ${c.lastName}`, c.email, c.phone, c.address, c.city, c.state, c.zipCode,
            c._count.devices, c._count.tickets, c.createdAt.toISOString().split('T')[0],
          ])
        )
        filename = 'customers.csv'
        break
      }
      case 'inventory': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const parts = await prisma.part.findMany({
          where,
          include: { category: true, vendor: true },
          orderBy: { name: 'asc' },
        })
        csv = toCSV(
          ['SKU', 'Name', 'Category', 'Cost Price', 'Selling Price', 'Quantity', 'Min Qty', 'Location', 'Vendor'],
          parts.map(p => [
            p.sku, p.name, p.category.name, p.costPrice, p.sellingPrice,
            p.quantity, p.minQuantity, p.location, p.vendor?.name,
          ])
        )
        filename = 'inventory.csv'
        break
      }
      case 'orders': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const orders = await prisma.order.findMany({
          where,
          include: { vendor: true, items: { include: { part: true } } },
          orderBy: { createdAt: 'desc' },
        })
        csv = toCSV(
          ['Order #', 'Vendor', 'Items', 'Total', 'Status', 'Order Date', 'Expected Date'],
          orders.map(o => [
            o.orderNumber, o.vendor.name, o.items.length, o.totalAmount,
            o.status, o.orderDate.toISOString().split('T')[0],
            o.expectedDate?.toISOString().split('T')[0],
          ])
        )
        filename = 'orders.csv'
        break
      }
      case 'quotes': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const quotes = await prisma.quote.findMany({
          where,
          include: { customer: true, items: true },
          orderBy: { createdAt: 'desc' },
        })
        csv = toCSV(
          ['Quote #', 'Customer', 'Items', 'Total', 'Status', 'Valid Until', 'Created'],
          quotes.map(q => [
            q.quoteNumber, `${q.customer.firstName} ${q.customer.lastName}`,
            q.items.length, q.total, q.status,
            q.validUntil.toISOString().split('T')[0], q.createdAt.toISOString().split('T')[0],
          ])
        )
        filename = 'quotes.csv'
        break
      }
      case 'warranty-claims': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const claims = await prisma.warrantyClaim.findMany({
          where,
          include: { customer: true },
          orderBy: { createdAt: 'desc' },
        })
        csv = toCSV(
          ['Claim #', 'Customer', 'Product', 'Status', 'Claim Amount', 'Approved Amount', 'Submitted'],
          claims.map(c => [
            c.claimNumber, `${c.customer.firstName} ${c.customer.lastName}`,
            c.productDescription, c.status, c.claimAmount, c.approvedAmount,
            c.submittedAt.toISOString().split('T')[0],
          ])
        )
        filename = 'warranty-claims.csv'
        break
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CSV export error:', error)
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 })
  }
}
