// Summary view over AiCallLog.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT
         endpoint,
         COUNT(*)::INT AS calls,
         COALESCE(SUM(tokens_used), 0)::INT AS tokens_total,
         COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms), 0)::INT AS latency_p95_ms,
         SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END)::INT AS errors
       FROM "AiCallLog"
       GROUP BY endpoint
       ORDER BY calls DESC`
    )
    return NextResponse.json({ summary: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'query failed', summary: [] })
  }
}
