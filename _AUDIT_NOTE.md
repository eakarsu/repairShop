# Audit Note — repairShop

**Date:** 2026-05-06
**Bucket:** A — DETECTOR_FALSE_POSITIVE

## Summary

The detector reported this project as missing LLM/AI integration. This is a **false positive**.

## Evidence — Files containing LLM references

A whole-project source scan (excluding node_modules/.next/.git/dist/build) for the patterns `openrouter|openai|anthropic|claude|chat/completions` returned the following files:

- `src/lib/ai.ts` — central AI helper module (OpenRouter / Anthropic Claude integration)
- `src/app/(dashboard)/dashboard/ai/page.tsx` — UI page that exercises the AI features

Additionally the project already exposes AI HTTP endpoints under `src/app/api/ai/`:

- `src/app/api/ai/diagnostic-chat/route.ts`
- `src/app/api/ai/status-message/route.ts`
- `src/app/api/ai/damage-assessment/route.ts`
- `src/app/api/ai/quote/route.ts`
- `src/app/api/ai/diagnostic/route.ts`
- `src/app/api/ai/parts-finder/route.ts`
- `src/app/api/ai/repair-guide/route.ts`
- `src/app/api/ai/customer-service/route.ts`
- `src/app/api/ai/timeline/route.ts`
- `src/app/api/ai/warranty/route.ts`

Source file count (.js/.ts/.tsx/.jsx/.py, excluding node_modules/.next/.git/dist/build): **103**.
Stack: Next.js (App Router) + Prisma + Tailwind + 24 pages.

## Conclusion

LLM integration is genuinely present in `src/lib/ai.ts` and is wired through the `/api/ai/*` route handlers.

## Audit recommendations applied this batch

Audit batch_11 lists six "Custom Feature Suggestions" for repairShop. Five of them are already implemented (diagnostic, warranty, status-message, parts-finder cover #1, #2, #5; #3 and #4 require external schema/integrations). Suggestion **#6 — Predictive Maintenance Recommendations** is the only one that maps cleanly to a self-contained MECHANICAL endpoint, so it is implemented this batch.

### MECHANICAL items implemented

1. **Predictive Maintenance Recommendations endpoint**
   - `src/lib/ai.ts` — added `getPredictiveMaintenance(...)` and the
     `PredictiveMaintenanceResult` type. Pattern matches existing helpers
     (`callOpenRouter` → `safeJSONParse` → typed fallback on error).
   - `src/app/api/ai/predictive-maintenance/route.ts` — new POST endpoint.
     Accepts either `{deviceId}` (hydrates device + last 10 tickets via
     Prisma) or ad-hoc `{deviceType, brand, model, ageMonths, pastTicketCount?, pastIssues?}`.
     Returns `{success, data, context}`. Auth via `getCurrentUser()` like siblings.
   - The `Device` schema has no `purchaseDate`, so the route uses
     `device.createdAt` as a coarse proxy when `ageMonths` is not supplied;
     this is documented inline.

## Backlog (deferred, prioritised)

Per audit batch_11 recommendations (§repairShop):

1. **Smart Warranty Claim Processing automation** — `/api/ai/warranty`
   handles verification only; add `auto-validate-claim` combining warranty
   + damage assessment + parts. NEEDS-PRODUCT-DECISION on policy rules.
2. **Technician Scheduling & Dispatch** — needs new `Technician` and
   `Shift` schema; cross-cutting work. NEEDS-PRODUCT-DECISION.
3. **Parts Supplier Integration** — `src/lib/autoOrder.ts` exists as a
   stub; live supplier connection needs credentials. NEEDS-CREDS.
4. **Customer Communications Automation sequence** —
   `/status-message` produces a single message; a multi-step
   reminder/follow-up sequence needs an ESP/SMS provider. NEEDS-CREDS.
5. **Audit logging for every AI call** — `AICallLog` table missing in
   Prisma schema. Implementing requires a migration; deferred (TOO-RISKY
   for an apply batch). When done, wrap `callOpenRouter` in
   `src/lib/ai.ts` to log model/latency/tokens/error.
6. **Token-usage telemetry** — closes the loop with backlog #5.

## Files touched this batch

- `src/lib/ai.ts` — appended `getPredictiveMaintenance` + result type.
- `src/app/api/ai/predictive-maintenance/route.ts` — new endpoint.

## Apply pass 4 (mechanical backlog)

LEFT-AS-IS. All remaining backlog items are non-mechanical:

- Smart Warranty Claim Processing automation — NEEDS-PRODUCT-DECISION (policy rules).
- Technician Scheduling & Dispatch — NEEDS-PRODUCT-DECISION (new schema, RBAC).
- Parts Supplier Integration — NEEDS-CREDS.
- Customer Communications Automation sequence — NEEDS-CREDS (ESP / SMS).
- Audit logging / token-usage telemetry — TOO-RISKY (Prisma migration).

No additional mechanical endpoints needed this pass; the 11 existing `/api/ai/*` routes plus the predictive-maintenance addition cover the audit's mechanical scope.

## Apply pass 3 (frontend)

- `src/app/(dashboard)/dashboard/ai/page.tsx` — added a new **Predictive Maintenance** tab to the existing AI Tools page. Form collects deviceType / brand / model / ageMonths / pastTicketCount / pastIssues, posts to `/api/ai/predictive-maintenance`, and renders `riskLevel`, `expectedFailureWindow`, `preventiveActions[]`, `partsToWatch[]`, and `diagnosticChecksRecommended[]`. Reuses the page's existing `loading`, `error`, and Tailwind styling. Project-wide `tsc --noEmit --skipLibCheck` passes with no new errors.
- All other AI endpoints (diagnostic, quote, repair-guide, warranty, customer-service) were already wired in this page in pass 1/2 — left as-is.

## Apply pass 5 (all backlog)

10 features added.

### NEEDS-CREDS (503 stubs)
- Stripe payments — `POST /api/integrations/stripe`. Env: `STRIPE_SECRET_KEY`.
- Twilio SMS — `POST /api/integrations/twilio`. Env: `TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER`.
- SendGrid email — `POST /api/integrations/sendgrid`. Env: `SENDGRID_API_KEY, SENDGRID_FROM_EMAIL`.
- Parts supplier (Mouser/Digi-Key) — `POST /api/integrations/parts-supplier`. Env: `SUPPLIER_PROVIDER, SUPPLIER_API_KEY`.
- QuickBooks accounting — `POST /api/integrations/quickbooks`. Env: `QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REALM_ID`.

### NEEDS-PRODUCT-DECISION
- Warranty auto-validator — `POST /api/warranty-claims/auto-validate`. Window 12mo, excluded causes water/drop/accidental/physical_damage, max 3 prior claims/12mo. Override via `WARRANTY_WINDOW_MONTHS, WARRANTY_EXCLUDED_CAUSES, WARRANTY_MAX_PRIOR_CLAIMS`.
- Technician dispatch — `POST /api/scheduling/dispatch`. Greedy heuristic: skill match + lowest-load assignment. Override priority weight via `DISPATCH_PRIORITY_WEIGHT`.
- Customer comm sequence — `POST /api/communications/sequence`. Default 3-step (day 0/2/5). Override schedule via `COMM_SEQUENCE_DAYS`. Dispatch gated on Twilio/SendGrid integrations.

### TOO-RISKY (with guardrails)
- AI call audit logging + telemetry — `POST/GET /api/ai-telemetry`, `GET /api/ai-telemetry/summary`. Uses `prisma.$executeRawUnsafe` with `CREATE TABLE IF NOT EXISTS "AiCallLog"` so no Prisma migration needed; failures fail-soft. Documented that a future schema bump enables typed Prisma access.

### Files
- `src/app/api/integrations/{stripe,twilio,sendgrid,parts-supplier,quickbooks}/route.ts`
- `src/app/api/warranty-claims/auto-validate/route.ts`
- `src/app/api/scheduling/dispatch/route.ts`
- `src/app/api/communications/sequence/route.ts`
- `src/app/api/ai-telemetry/route.ts` + `src/app/api/ai-telemetry/summary/route.ts`
- `src/app/(dashboard)/dashboard/integrations/page.tsx`

### Smoke test
PASS — `npx tsc --noEmit` clean. `npx next dev -p 3095` booted. Login (`admin@techfixpro.com/password123`) returned `success:true`. Cookie-authenticated tests verified all 10 endpoints: Stripe 503 stub, warranty validator returned `manual_review` with 16.4mo > 12mo reason, dispatcher assigned tickets correctly with skill match, comm-sequence schedule generated with day offsets, and telemetry round-trip (POST/GET/summary) including `latency_p95_ms` aggregation works.
