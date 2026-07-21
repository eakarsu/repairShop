import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ error: 'SLA monitor is a prototype and is not backed by persisted ticket data' }, { status: 501 }) }
export const POST = GET
