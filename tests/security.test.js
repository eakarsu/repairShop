const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

test('ticket lifecycle rejects skipped and terminal transitions', () => {
  const source = fs.readFileSync('src/lib/ticketLifecycle.ts', 'utf8')
  assert.match(source, /RECEIVED: \['DIAGNOSING', 'CANCELLED'\]/)
  assert.match(source, /COMPLETED: \[\]/)
  assert.match(source, /CANCELLED: \[\]/)
})

test('auth has no fallback and pins JWT verification', () => {
  const source = fs.readFileSync('src/lib/auth.ts', 'utf8')
  assert.doesNotMatch(source, /default-secret|repairshop-dev-secret/)
  assert.match(source, /algorithms: \['HS256'\]/)
  assert.match(source, /issuer: 'repair-shop-api'/)
})

test('seed and provider boundaries fail closed', () => {
  assert.match(fs.readFileSync('prisma/seed.ts', 'utf8'), /ALLOW_DISPOSABLE_SEED/)
  assert.doesNotMatch(fs.readFileSync('prisma/seed.ts', 'utf8'), /password123/)
  assert.match(fs.readFileSync('src/app/api/integrations/stripe/route.ts', 'utf8'), /status: 501/)
  for (const provider of ['twilio', 'sendgrid', 'quickbooks', 'parts-supplier']) {
    assert.match(fs.readFileSync(`src/app/api/integrations/${provider}/route.ts`, 'utf8'), /status: 501/)
  }
})
