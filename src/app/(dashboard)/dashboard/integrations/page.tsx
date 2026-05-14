'use client'

import { useState } from 'react'

const INTEGRATIONS = [
  { key: 'stripe', label: 'Stripe (payments)', endpoint: '/api/integrations/stripe', body: { amount: 1000 } },
  { key: 'twilio', label: 'Twilio (SMS)', endpoint: '/api/integrations/twilio', body: { to: '+15555550100', body: 'Test' } },
  { key: 'sendgrid', label: 'SendGrid (email)', endpoint: '/api/integrations/sendgrid', body: { to: 'demo@example.com', subject: 'Hi', body: 'Hi' } },
  { key: 'parts', label: 'Parts supplier', endpoint: '/api/integrations/parts-supplier', body: { partNumber: 'ABC-123' } },
  { key: 'qb', label: 'QuickBooks', endpoint: '/api/integrations/quickbooks', body: { entity: 'invoice', payload: {} } },
]

export default function IntegrationsPage() {
  const [tab, setTab] = useState<'integrations' | 'warranty' | 'dispatch' | 'sequence' | 'telemetry'>('integrations')

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Integrations & Operations</h1>
      <p className="text-sm text-gray-600 mb-4">External integrations (503-gated) plus warranty auto-validation, dispatch, comm sequence, and telemetry.</p>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['integrations', 'warranty', 'dispatch', 'sequence', 'telemetry'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded text-sm border ${tab === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'integrations' && <IntegrationsTab />}
      {tab === 'warranty' && <WarrantyTab />}
      {tab === 'dispatch' && <DispatchTab />}
      {tab === 'sequence' && <SequenceTab />}
      {tab === 'telemetry' && <TelemetryTab />}
    </div>
  )
}

function IntegrationsTab() {
  const [results, setResults] = useState<Record<string, any>>({})
  const test = async (i: any) => {
    try {
      const r = await fetch(i.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(i.body) })
      const data = await r.json()
      setResults((s) => ({ ...s, [i.key]: { status: r.status, data } }))
    } catch (e: any) {
      setResults((s) => ({ ...s, [i.key]: { status: 0, data: { error: e?.message } } }))
    }
  }
  return (
    <div className="bg-white p-5 rounded border border-gray-200">
      {INTEGRATIONS.map((i) => {
        const r = results[i.key]
        return (
          <div key={i.key} className="mb-3">
            <button onClick={() => test(i)} className="px-3 py-1.5 mr-3 bg-gray-100 border rounded">{i.label}</button>
            {r && r.status === 503 ? (
              <span className="text-yellow-700 text-sm">Configure {i.label} — missing: <code>{r.data?.missing}</code></span>
            ) : r ? (
              <code className="text-xs text-gray-700">{JSON.stringify(r.data)}</code>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function WarrantyTab() {
  const [deviceCreatedAt, setDeviceCreatedAt] = useState(new Date(Date.now() - 6 * 30 * 86400000).toISOString())
  const [issueCause, setIssueCause] = useState('battery_failure')
  const [priorApprovedClaims, setPrior] = useState(0)
  const [out, setOut] = useState<any>(null)
  const submit = async () => {
    const r = await fetch('/api/warranty-claims/auto-validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceCreatedAt, issueCause, priorApprovedClaims: Number(priorApprovedClaims) }) })
    setOut(await r.json())
  }
  return (
    <div className="bg-white p-5 rounded border border-gray-200 space-y-2">
      <input className="border rounded p-2 w-full" value={deviceCreatedAt} onChange={(e) => setDeviceCreatedAt(e.target.value)} />
      <input className="border rounded p-2 w-full" value={issueCause} onChange={(e) => setIssueCause(e.target.value)} />
      <input type="number" className="border rounded p-2 w-full" value={priorApprovedClaims} onChange={(e) => setPrior(Number(e.target.value))} />
      <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded">Validate</button>
      {out && <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(out, null, 2)}</pre>}
    </div>
  )
}

function DispatchTab() {
  const [json, setJson] = useState(JSON.stringify({
    technicians: [
      { id: 't1', skills: ['phone'], currentLoad: 0 },
      { id: 't2', skills: ['phone', 'laptop'], currentLoad: 1 },
    ],
    tickets: [
      { id: 'k1', skillRequired: 'phone', priority: 1 },
      { id: 'k2', skillRequired: 'laptop', priority: 3 },
      { id: 'k3', skillRequired: 'phone', priority: 2 },
    ],
  }, null, 2))
  const [out, setOut] = useState<any>(null)
  const submit = async () => {
    const r = await fetch('/api/scheduling/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json })
    setOut(await r.json())
  }
  return (
    <div className="bg-white p-5 rounded border border-gray-200">
      <textarea className="border rounded p-2 w-full font-mono text-xs" rows={12} value={json} onChange={(e) => setJson(e.target.value)} />
      <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded mt-2">Dispatch</button>
      {out && <pre className="text-xs bg-gray-50 p-2 mt-2 rounded">{JSON.stringify(out, null, 2)}</pre>}
    </div>
  )
}

function SequenceTab() {
  const [name, setName] = useState('Jane')
  const [out, setOut] = useState<any>(null)
  const submit = async () => {
    const r = await fetch('/api/communications/sequence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: name }) })
    setOut(await r.json())
  }
  return (
    <div className="bg-white p-5 rounded border border-gray-200">
      <input className="border rounded p-2 w-full mb-2" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={submit} className="px-3 py-1.5 bg-blue-600 text-white rounded">Generate sequence</button>
      {out && <pre className="text-xs bg-gray-50 p-2 mt-2 rounded">{JSON.stringify(out, null, 2)}</pre>}
    </div>
  )
}

function TelemetryTab() {
  const [out, setOut] = useState<any>(null)
  const [summary, setSummary] = useState<any>(null)
  const log = async () => {
    await fetch('/api/ai-telemetry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: '/api/ai/diagnostic', model: 'claude-haiku-4.5', latencyMs: 280, tokensUsed: 412 }) })
    list()
  }
  const list = async () => {
    const r = await fetch('/api/ai-telemetry')
    setOut(await r.json())
  }
  const sum = async () => {
    const r = await fetch('/api/ai-telemetry/summary')
    setSummary(await r.json())
  }
  return (
    <div className="bg-white p-5 rounded border border-gray-200 space-y-2">
      <button onClick={log} className="px-3 py-1.5 bg-blue-600 text-white rounded">Log demo call</button>
      <button onClick={list} className="px-3 py-1.5 bg-gray-100 border rounded ml-2">List recent</button>
      <button onClick={sum} className="px-3 py-1.5 bg-gray-100 border rounded ml-2">Summary</button>
      {out && <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(out, null, 2).slice(0, 800)}</pre>}
      {summary && <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(summary, null, 2)}</pre>}
    </div>
  )
}
