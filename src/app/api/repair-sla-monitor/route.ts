import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    if (!(await getCurrentUser())) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const tickets = await prisma.repairTicket.findMany({
      orderBy: { intakeDate: 'desc' }, take: 100,
      select: {
        id: true, ticketNumber: true, status: true, intakeDate: true,
        estimatedCompletion: true, completedDate: true,
        device: { select: { deviceType: true, brand: true, model: true } },
        technician: { select: { firstName: true, lastName: true } },
      },
    })
    const now = Date.now()
    const rows = tickets.map(ticket => {
      const start = ticket.intakeDate.getTime()
      const end = ticket.completedDate?.getTime() ?? now
      const complete = ['COMPLETED', 'CANCELLED'].includes(ticket.status)
      return {
        id: ticket.id, ticket: ticket.ticketNumber,
        device: ticket.device ? [ticket.device.brand, ticket.device.model || ticket.device.deviceType].filter(Boolean).join(' ') : 'Not recorded',
        stage: ticket.status.replaceAll('_', ' '),
        promisedHours: ticket.estimatedCompletion ? Math.max(0, Math.round((ticket.estimatedCompletion.getTime() - start) / 3600000)) : null,
        elapsedHours: Math.max(0, Math.round((end - start) / 3600000)),
        owner: ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : 'Unassigned',
        status: complete ? 'complete' : ticket.estimatedCompletion && now >= ticket.estimatedCompletion.getTime() ? 'breach risk' : 'on track',
      }
    })
    return NextResponse.json({ success: true, rows, summary: { total: rows.length, breachRisk: rows.filter(row => row.status === 'breach risk').length } })
  } catch (error) {
    console.error('Repair SLA monitor fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load repair tickets' }, { status: 500 })
  }
}
