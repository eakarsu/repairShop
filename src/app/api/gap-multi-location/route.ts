import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ error: 'Multi-location support is a prototype and is not operational' }, { status: 501 }) }
export const POST = GET
