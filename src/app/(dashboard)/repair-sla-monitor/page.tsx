'use client'

import { useEffect, useState } from 'react'

type Row = { id: string; ticket: string; device: string; stage: string; promisedHours: number | null; elapsedHours: number; owner: string; status: string }
type Summary = { total: number; breachRisk: number }

export default function RepairSlaMonitorPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary>({ total: 0, breachRisk: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/repair-sla-monitor').then(async response => {
      const payload = await response.json()
      if (!response.ok || !payload.success || !Array.isArray(payload.rows)) throw new Error(payload.error || 'Invalid repair ticket response')
      if (active) {
        setRows(payload.rows)
        setSummary(payload.summary && typeof payload.summary === 'object' ? payload.summary : { total: payload.rows.length, breachRisk: 0 })
      }
    }).catch(() => { if (active) setError('Repair tickets could not be loaded. Check the database connection and try again.') })
    return () => { active = false }
  }, [])

  return <div className="p-6 space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Repair SLA Monitor</h1><p className="text-gray-600">Timing and completion risk from saved repair tickets. Promised hours appear only when an estimated completion is recorded.</p></div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</p>}
    <div className="grid grid-cols-2 gap-4"><div className="bg-white rounded-lg border p-4"><div className="text-sm text-gray-500">Tickets shown</div><div className="text-2xl font-semibold">{summary.total}</div></div><div className="bg-white rounded-lg border p-4"><div className="text-sm text-gray-500">Past estimated completion</div><div className="text-2xl font-semibold">{summary.breachRisk}</div></div></div>
    <div className="overflow-x-auto"><table className="w-full bg-white border rounded-lg"><thead><tr>{['Ticket','Device','Stage','Promised','Elapsed','Owner','Status'].map(heading => <th key={heading} className="p-3 text-left">{heading}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-t"><td className="p-3">{row.ticket}</td><td className="p-3">{row.device}</td><td className="p-3">{row.stage}</td><td className="p-3">{row.promisedHours === null ? 'Not set' : `${row.promisedHours}h`}</td><td className="p-3">{row.elapsedHours}h</td><td className="p-3">{row.owner}</td><td className="p-3">{row.status}</td></tr>)}</tbody></table></div>
  </div>
}
