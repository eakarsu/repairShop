import { NextResponse } from 'next/server'
export async function GET() { return NextResponse.json({ error: 'Field technician app is a prototype and is not operational' }, { status: 501 }) }
export const POST = GET
