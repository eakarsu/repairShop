'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface PreventiveAction {
  action: string
  rationale: string
  estimatedCost: number
  priority: 'Low' | 'Medium' | 'High'
}

interface PredictiveMaintenanceResult {
  riskLevel: 'Low' | 'Medium' | 'High'
  expectedFailureWindow: string
  preventiveActions: PreventiveAction[]
  partsToWatch: string[]
  diagnosticChecksRecommended: string[]
  notes: string
}

interface PredictiveResponse {
  success: boolean
  data?: PredictiveMaintenanceResult
  context?: {
    deviceType: string
    brand?: string
    model?: string
    ageMonths: number
    pastTicketCount: number
  }
  error?: string
}

export default function PredictiveMaintenancePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PredictiveMaintenanceResult | null>(null)
  const [context, setContext] = useState<PredictiveResponse['context'] | null>(null)

  const [form, setForm] = useState({
    deviceType: '',
    brand: '',
    model: '',
    ageMonths: '',
    pastTicketCount: '',
    pastIssues: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setContext(null)
    try {
      const payload: any = {
        deviceType: form.deviceType,
        brand: form.brand,
        model: form.model,
      }
      if (form.ageMonths) payload.ageMonths = Number(form.ageMonths)
      if (form.pastTicketCount) payload.pastTicketCount = Number(form.pastTicketCount)
      if (form.pastIssues.trim()) {
        payload.pastIssues = form.pastIssues
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      }

      const res = await fetch('/api/ai/predictive-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data: PredictiveResponse = await res.json()
      if (data.success && data.data) {
        setResult(data.data)
        setContext(data.context || null)
      } else {
        setError(data.error || 'Failed to get predictive maintenance analysis')
      }
    } catch (err) {
      console.error('Predictive maintenance failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadSampleData = () => {
    setForm({
      deviceType: 'Laptop',
      brand: 'Dell',
      model: 'XPS 15',
      ageMonths: '36',
      pastTicketCount: '2',
      pastIssues: 'Battery swelling reported\nIntermittent fan noise',
    })
  }

  const priorityColor = (p: 'Low' | 'Medium' | 'High') =>
    p === 'High'
      ? 'bg-red-100 text-red-700'
      : p === 'Medium'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-green-100 text-green-700'

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Predictive Maintenance</h1>
          <p className="text-gray-600">AI-driven failure-risk forecasting and preventive recommendations</p>
        </div>
        <button
          onClick={loadSampleData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Load Sample Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="card">
          <h3 className="font-semibold mb-4">Device & History</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Device Type</label>
                <select
                  value={form.deviceType}
                  onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                  className="select-field"
                >
                  <option value="">Select...</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Smartwatch">Smartwatch</option>
                  <option value="Desktop">Desktop</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Age (months)</label>
                <input
                  type="number"
                  min="0"
                  value={form.ageMonths}
                  onChange={(e) => setForm({ ...form, ageMonths: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Past Ticket Count</label>
                <input
                  type="number"
                  min="0"
                  value={form.pastTicketCount}
                  onChange={(e) => setForm({ ...form, pastTicketCount: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Past Issues (one per line)</label>
              <textarea
                value={form.pastIssues}
                onChange={(e) => setForm({ ...form, pastIssues: e.target.value })}
                className="input-field"
                rows={4}
                placeholder="e.g., Battery replaced 6 months ago&#10;Display flickering reported"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !form.deviceType}
              className="w-full btn-primary"
            >
              {loading ? 'Analyzing...' : 'Get Predictive Analysis'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg">AI Response</h3>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Analyzing with AI...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-medium text-red-800 mb-1">AI Service Error</h4>
              <p className="text-red-600 text-sm">{error}</p>
              <p className="text-xs text-red-500 mt-2">Please check your OpenRouter API key and try again</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6">
              {/* Risk + window */}
              <div
                className={`rounded-2xl p-6 text-center text-white ${
                  result.riskLevel === 'High'
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : result.riskLevel === 'Medium'
                    ? 'bg-gradient-to-br from-yellow-500 to-amber-600'
                    : 'bg-gradient-to-br from-green-500 to-emerald-600'
                }`}
              >
                <p className="text-white/80 text-sm uppercase tracking-wider mb-2">Failure Risk</p>
                <p className="text-4xl font-bold mb-1">{result.riskLevel}</p>
                <p className="text-white/90 text-sm">Expected window: {result.expectedFailureWindow}</p>
                {context && (
                  <p className="text-white/70 text-xs mt-2">
                    {context.deviceType} {context.brand} {context.model} · {context.ageMonths}mo · {context.pastTicketCount} prior tickets
                  </p>
                )}
              </div>

              {/* Preventive Actions */}
              {result.preventiveActions.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="font-semibold text-gray-800">Preventive Actions</h4>
                  </div>
                  <div className="space-y-3">
                    {result.preventiveActions.map((a, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-medium text-gray-800">{a.action}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColor(a.priority)}`}>
                            {a.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{a.rationale}</p>
                        <p className="text-sm text-gray-500">Est. cost: <span className="font-semibold text-gray-700">{formatCurrency(a.estimatedCost)}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Parts to Watch */}
              {result.partsToWatch.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h4 className="font-semibold text-gray-800">Parts to Watch</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.partsToWatch.map((part, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-orange-700 border border-orange-200">
                        {part}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnostic Checks */}
              {result.diagnosticChecksRecommended.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h4 className="font-semibold text-gray-800">Diagnostic Checks</h4>
                  </div>
                  <ul className="space-y-2">
                    {result.diagnosticChecksRecommended.map((check, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                        <span className="text-gray-700">{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {result.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-700">{result.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-gray-500 mb-2">Ready for AI Analysis</p>
              <p className="text-sm text-gray-400">Fill in the form and click the button to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
