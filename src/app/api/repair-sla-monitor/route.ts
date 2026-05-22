import { NextResponse } from 'next/server'

let rows = [
  { id: 1, ticket: 'T-1041', device: 'MacBook Pro', stage: 'diagnosis', promisedHours: 24, elapsedHours: 19, owner: 'Alex', status: 'on track' },
  { id: 2, ticket: 'T-1050', device: 'iPhone 14', stage: 'parts hold', promisedHours: 12, elapsedHours: 16, owner: 'Priya', status: 'breach risk' },
  { id: 3, ticket: 'T-1057', device: 'Dell XPS', stage: 'bench repair', promisedHours: 48, elapsedHours: 21, owner: 'Noah', status: 'on track' },
]

export async function GET() {
  const summary = rows.reduce((acc, row) => {
    acc.total += 1
    acc.breachRisk += row.status === 'breach risk' ? 1 : 0
    return acc
  }, { total: 0, breachRisk: 0 })
  return NextResponse.json({ rows, summary })
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const item = {
    id: Date.now(),
    ticket: body.ticket || 'T-pending',
    device: body.device || 'Device TBD',
    stage: body.stage || 'intake',
    promisedHours: Number(body.promisedHours || 24),
    elapsedHours: Number(body.elapsedHours || 0),
    owner: body.owner || 'Unassigned',
    status: body.status || 'on track',
  }
  rows = [item, ...rows]
  return NextResponse.json(item, { status: 201 })
}
