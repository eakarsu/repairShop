'use client'

import { useEffect, useState } from 'react'

const empty = { ticket: '', device: '', stage: '', promisedHours: 24, elapsedHours: 0, owner: '', status: 'on track' }

export default function RepairSlaMonitorPage() {
  const [rows, setRows] = useState<any[]>([])
  const [summary, setSummary] = useState({ total: 0, breachRisk: 0 })
  const [form, setForm] = useState(empty)

  async function load() {
    const res = await fetch('/api/repair-sla-monitor')
    const data = await res.json()
    setRows(data.rows || [])
    setSummary(data.summary || { total: 0, breachRisk: 0 })
  }

  useEffect(() => { load() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    await fetch('/api/repair-sla-monitor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm(empty)
    load()
  }

  return <div className="p-6 space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Repair SLA Monitor</h1><p className="text-gray-600">Ticket stage timing, promised repair windows, and breach risk.</p></div>
    <div className="grid grid-cols-2 gap-4">{['total','breachRisk'].map(k => <div key={k} className="bg-white rounded-lg border p-4"><div className="text-sm text-gray-500">{k}</div><div className="text-2xl font-semibold">{(summary as any)[k]}</div></div>)}</div>
    <form onSubmit={submit} className="grid gap-3 bg-white rounded-lg border p-4 md:grid-cols-4">
      {['ticket','device','stage','owner'].map(f => <input key={f} className="border rounded p-2" placeholder={f} value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />)}
      <input className="border rounded p-2" type="number" value={form.promisedHours} onChange={e => setForm({ ...form, promisedHours: Number(e.target.value) })} />
      <input className="border rounded p-2" type="number" value={form.elapsedHours} onChange={e => setForm({ ...form, elapsedHours: Number(e.target.value) })} />
      <select className="border rounded p-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>on track</option><option>breach risk</option><option>complete</option></select>
      <button className="bg-primary-600 text-white rounded px-4 py-2">Add Ticket</button>
    </form>
    <table className="w-full bg-white border rounded-lg"><thead><tr>{['Ticket','Device','Stage','Promised','Elapsed','Owner','Status'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t"><td className="p-3">{r.ticket}</td><td>{r.device}</td><td>{r.stage}</td><td>{r.promisedHours}h</td><td>{r.elapsedHours}h</td><td>{r.owner}</td><td>{r.status}</td></tr>)}</tbody></table>
  </div>
}
