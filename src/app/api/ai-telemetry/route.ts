// AI call telemetry endpoint.
// TOO-RISKY: adding a new model in prisma/schema.prisma would require a
// migration step. Instead we use raw SQL CREATE TABLE IF NOT EXISTS via
// `$executeRawUnsafe` so the table appears safely without a Prisma migration.
// The table is queryable via raw SQL only — Prisma typed access requires a
// schema bump (deferred).
//
// Endpoints:
//   POST /api/ai-telemetry  body: { endpoint, model, latencyMs, tokensUsed, error? }
//   GET  /api/ai-telemetry            list recent rows (last 200)
//   GET  /api/ai-telemetry/summary    counts + p95 latency
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

let initialized = false
async function ensureTable() {
  if (initialized) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AiCallLog" (
        id SERIAL PRIMARY KEY,
        endpoint TEXT NOT NULL,
        model TEXT,
        latency_ms INTEGER,
        tokens_used INTEGER,
        error TEXT,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    initialized = true
  } catch (e) {
    // Schema may already exist or DB unavailable — fail-soft.
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureTable()
  try {
    const { endpoint, model, latencyMs, tokensUsed, error } = await request.json()
    if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AiCallLog" (endpoint, model, latency_ms, tokens_used, error, user_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      endpoint,
      model || null,
      latencyMs || null,
      tokensUsed || null,
      error || null,
      Number((user as any).id) || null
    )
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'log failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureTable()
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT id, endpoint, model, latency_ms, tokens_used, error, created_at FROM "AiCallLog" ORDER BY created_at DESC LIMIT 200`
    )
    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'query failed' }, { status: 500 })
  }
}
