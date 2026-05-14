// Technician scheduling & dispatch.
// PRODUCT-DECISION: stateless heuristic — given a list of technicians (with
// skills + currentLoad) and a list of tickets (with skillRequired, priority),
// assign each ticket to the technician with the matching skill and lowest
// load. Tie-breaks alphabetically. No new DB schema; clients pass state in.
// Override via env DISPATCH_PRIORITY_WEIGHT to boost high priority.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

const PRIORITY_WEIGHT = Number(process.env.DISPATCH_PRIORITY_WEIGHT || '2')

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { technicians = [], tickets = [] } = await request.json()
    if (!Array.isArray(technicians) || !Array.isArray(tickets)) {
      return NextResponse.json({ error: 'technicians and tickets must be arrays' }, { status: 400 })
    }

    // Sort tickets by priority desc, then by FIFO order.
    const sortedTickets = [...tickets].sort(
      (a: any, b: any) => (Number(b.priority || 0) - Number(a.priority || 0)) * PRIORITY_WEIGHT
    )

    const loads: Record<string, number> = {}
    technicians.forEach((t: any) => {
      loads[t.id] = Number(t.currentLoad || 0)
    })

    const assignments = sortedTickets.map((ticket: any) => {
      const eligible = technicians
        .filter((t: any) => !ticket.skillRequired || (t.skills || []).includes(ticket.skillRequired))
        .sort((a: any, b: any) => (loads[a.id] || 0) - (loads[b.id] || 0) || String(a.id).localeCompare(String(b.id)))
      const winner = eligible[0]
      if (winner) loads[winner.id] = (loads[winner.id] || 0) + 1
      return {
        ticketId: ticket.id,
        priority: ticket.priority || 0,
        skillRequired: ticket.skillRequired || null,
        assignedTechnicianId: winner ? winner.id : null,
      }
    })

    return NextResponse.json({ assignments, finalLoads: loads })
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
