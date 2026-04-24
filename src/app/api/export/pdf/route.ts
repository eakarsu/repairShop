import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

function formatCurrency(amount: number | null) {
  if (amount === null || amount === undefined) return '-'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatDate(date: Date | string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function wrapHTML(title: string, tableHTML: string): string {
  return `<!DOCTYPE html>
<html><head><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #333; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 24px; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:hover { background: #f9fafb; }
  .badge { padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; }
  .text-right { text-align: right; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>${title}</h1>
<p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
${tableHTML}
<script>window.print()</script>
</body></html>`
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

    let html = ''

    switch (type) {
      case 'tickets': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const tickets = await prisma.repairTicket.findMany({
          where, include: { customer: true, device: true, technician: true }, orderBy: { createdAt: 'desc' },
        })
        const rows = tickets.map(t => `<tr>
          <td>${t.ticketNumber}</td>
          <td>${t.customer.firstName} ${t.customer.lastName}</td>
          <td>${t.device ? `${t.device.brand || ''} ${t.device.model || t.device.deviceType}`.trim() : '-'}</td>
          <td>${t.issueDescription}</td><td>${t.status.replace('_', ' ')}</td><td>${t.priority}</td>
          <td>${t.technician ? `${t.technician.firstName} ${t.technician.lastName}` : '-'}</td>
          <td class="text-right">${formatCurrency(t.estimatedCost)}</td>
          <td>${formatDate(t.createdAt)}</td></tr>`).join('')
        html = wrapHTML('Repair Tickets Report', `<table><thead><tr><th>Ticket #</th><th>Customer</th><th>Device</th><th>Issue</th><th>Status</th><th>Priority</th><th>Technician</th><th>Est. Cost</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case 'customers': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const customers = await prisma.customer.findMany({
          where, include: { _count: { select: { tickets: true, devices: true } } }, orderBy: { createdAt: 'desc' },
        })
        const rows = customers.map(c => `<tr>
          <td>${c.firstName} ${c.lastName}</td><td>${c.email || '-'}</td><td>${c.phone}</td>
          <td>${[c.city, c.state].filter(Boolean).join(', ') || '-'}</td>
          <td class="text-right">${c._count.devices}</td><td class="text-right">${c._count.tickets}</td>
          <td>${formatDate(c.createdAt)}</td></tr>`).join('')
        html = wrapHTML('Customers Report', `<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Devices</th><th>Tickets</th><th>Since</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case 'inventory': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const parts = await prisma.part.findMany({
          where, include: { category: true, vendor: true }, orderBy: { name: 'asc' },
        })
        const rows = parts.map(p => `<tr>
          <td>${p.sku}</td><td>${p.name}</td><td>${p.category.name}</td>
          <td class="text-right">${formatCurrency(p.costPrice)}</td>
          <td class="text-right">${formatCurrency(p.sellingPrice)}</td>
          <td class="text-right" style="${p.quantity <= p.minQuantity ? 'color:red;font-weight:bold' : ''}">${p.quantity}</td>
          <td>${p.location || '-'}</td><td>${p.vendor?.name || '-'}</td></tr>`).join('')
        html = wrapHTML('Inventory Report', `<table><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th>Cost</th><th>Price</th><th>Stock</th><th>Location</th><th>Vendor</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case 'orders': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const orders = await prisma.order.findMany({
          where, include: { vendor: true, items: true }, orderBy: { createdAt: 'desc' },
        })
        const rows = orders.map(o => `<tr>
          <td>${o.orderNumber}</td><td>${o.vendor.name}</td><td class="text-right">${o.items.length}</td>
          <td class="text-right">${formatCurrency(o.totalAmount)}</td><td>${o.status}</td>
          <td>${formatDate(o.orderDate)}</td><td>${formatDate(o.expectedDate)}</td></tr>`).join('')
        html = wrapHTML('Purchase Orders Report', `<table><thead><tr><th>Order #</th><th>Vendor</th><th>Items</th><th>Total</th><th>Status</th><th>Order Date</th><th>Expected</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case 'quotes': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const quotes = await prisma.quote.findMany({
          where, include: { customer: true, items: true }, orderBy: { createdAt: 'desc' },
        })
        const rows = quotes.map(q => `<tr>
          <td>${q.quoteNumber}</td><td>${q.customer.firstName} ${q.customer.lastName}</td>
          <td class="text-right">${q.items.length}</td><td class="text-right">${formatCurrency(q.total)}</td>
          <td>${q.status}</td><td>${formatDate(q.validUntil)}</td></tr>`).join('')
        html = wrapHTML('Quotes Report', `<table><thead><tr><th>Quote #</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Valid Until</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      case 'warranty-claims': {
        const where = ids?.length ? { id: { in: ids } } : {}
        const claims = await prisma.warrantyClaim.findMany({
          where, include: { customer: true }, orderBy: { createdAt: 'desc' },
        })
        const rows = claims.map(c => `<tr>
          <td>${c.claimNumber}</td><td>${c.customer.firstName} ${c.customer.lastName}</td>
          <td>${c.productDescription}</td><td>${c.status.replace('_', ' ')}</td>
          <td class="text-right">${formatCurrency(c.claimAmount)}</td>
          <td class="text-right">${formatCurrency(c.approvedAmount)}</td>
          <td>${formatDate(c.submittedAt)}</td></tr>`).join('')
        html = wrapHTML('Warranty Claims Report', `<table><thead><tr><th>Claim #</th><th>Customer</th><th>Product</th><th>Status</th><th>Claim Amt</th><th>Approved</th><th>Submitted</th></tr></thead><tbody>${rows}</tbody></table>`)
        break
      }
      default:
        return NextResponse.json({ success: false, error: 'Invalid export type' }, { status: 400 })
    }

    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
  } catch (error) {
    console.error('PDF export error:', error)
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 })
  }
}
