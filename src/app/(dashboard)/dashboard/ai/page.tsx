'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'

interface Ticket {
  id: string
  ticketNumber: string
  status: string
  issueDescription: string
  customer: {
    firstName: string
    lastName: string
  }
  device: {
    deviceType: string
    brand?: string
    model?: string
  } | null
}

interface DiagnosticResult {
  possibleIssues: string[]
  suggestedTests: string[]
  estimatedDifficulty: string
  estimatedTime: string
  recommendedParts: string[]
  notes: string
}

interface QuoteEstimate {
  laborCost: number
  estimatedPartsCost: number
  totalEstimate: number
  timeEstimate: string
  confidence: string
  notes: string
}

interface RepairGuide {
  steps: { stepNumber: number; title: string; description: string; warnings: string[]; tips: string[] }[]
  toolsRequired: string[]
  estimatedTime: string
  difficultyLevel: string
}

export default function AIToolsPage() {
  const [activeTab, setActiveTab] = useState('diagnostic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form states
  const [deviceInfo, setDeviceInfo] = useState({ deviceType: '', brand: '', model: '', issueDescription: '' })
  const [repairType, setRepairType] = useState('')
  const [warrantyInfo, setWarrantyInfo] = useState({ brand: '', model: '', purchaseDate: '', serialNumber: '' })
  const [customerQuestion, setCustomerQuestion] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(false)

  // Results
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null)
  const [quoteResult, setQuoteResult] = useState<QuoteEstimate | null>(null)
  const [guideResult, setGuideResult] = useState<RepairGuide | null>(null)
  const [warrantyResult, setWarrantyResult] = useState<{ status: string; message: string; details: string } | null>(null)
  const [chatResponse, setChatResponse] = useState('')

  // Load tickets when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      loadTickets()
    }
  }, [activeTab])

  const loadTickets = async () => {
    setTicketsLoading(true)
    try {
      const res = await fetch('/api/tickets?limit=100', {
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setTickets(data.data.tickets)
      } else {
        console.error('Failed to load tickets:', data.error)
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setTicketsLoading(false)
    }
  }

  const handleDiagnostic = async () => {
    setLoading(true)
    setError(null)
    setDiagnosticResult(null)
    try {
      const res = await fetch('/api/ai/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceInfo),
      })
      const data = await res.json()
      if (data.success) {
        setDiagnosticResult(data.data)
      } else {
        setError(data.error || 'Failed to get AI response')
      }
    } catch (err) {
      console.error('Diagnostic failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuote = async () => {
    setLoading(true)
    setError(null)
    setQuoteResult(null)
    try {
      const res = await fetch('/api/ai/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceInfo),
      })
      const data = await res.json()
      if (data.success) {
        setQuoteResult(data.data)
      } else {
        setError(data.error || 'Failed to get quote estimate')
      }
    } catch (err) {
      console.error('Quote failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRepairGuide = async () => {
    setLoading(true)
    setError(null)
    setGuideResult(null)
    try {
      const res = await fetch('/api/ai/repair-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deviceInfo, repairType }),
      })
      const data = await res.json()
      if (data.success) {
        setGuideResult(data.data)
      } else {
        setError(data.error || 'Failed to get repair guide')
      }
    } catch (err) {
      console.error('Guide failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWarranty = async () => {
    setLoading(true)
    setError(null)
    setWarrantyResult(null)
    try {
      const res = await fetch('/api/ai/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(warrantyInfo),
      })
      const data = await res.json()
      if (data.success) {
        setWarrantyResult(data.data)
      } else {
        setError(data.error || 'Failed to check warranty')
      }
    } catch (err) {
      console.error('Warranty check failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerQuestion = async () => {
    setLoading(true)
    setError(null)
    setChatResponse('')
    try {
      const res = await fetch('/api/ai/customer-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: customerQuestion,
          ticketNumber: selectedTicket?.ticketNumber
        }),
      })
      const data = await res.json()
      if (data.success) {
        setChatResponse(data.data.response)
      } else {
        setError(data.error || 'Failed to get response')
      }
    } catch (err) {
      console.error('Chat failed:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Clear results when switching tabs
  const switchTab = (tabId: string) => {
    setActiveTab(tabId)
    setError(null)
  }

  // Load sample data based on active tab
  const loadSampleData = () => {
    switch (activeTab) {
      case 'diagnostic':
      case 'quote':
        setDeviceInfo({
          deviceType: 'Smartphone',
          brand: 'Apple',
          model: 'iPhone 14 Pro',
          issueDescription: 'Screen is cracked and not responding to touch. The phone was dropped on concrete. Display shows lines and flickering.'
        })
        break
      case 'guide':
        setDeviceInfo({
          deviceType: 'Smartphone',
          brand: 'Samsung',
          model: 'Galaxy S23',
          issueDescription: 'Battery drains very quickly and phone gets hot'
        })
        setRepairType('Battery Replacement')
        break
      case 'warranty':
        setWarrantyInfo({
          brand: 'Apple',
          model: 'MacBook Pro 14"',
          purchaseDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months ago
          serialNumber: 'C02ZX1ABCD12'
        })
        break
      case 'chat':
        setCustomerQuestion('When will my repair be ready? I dropped off my phone 3 days ago for a screen replacement.')
        break
    }
  }

  const tabs = [
    { id: 'diagnostic', name: 'AI Diagnostic', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { id: 'quote', name: 'AI Quote', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'guide', name: 'Repair Guide', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'warranty', name: 'Warranty Check', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { id: 'chat', name: 'Customer Bot', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  ]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Tools</h1>
          <p className="text-gray-600">AI-powered assistance for repairs and customer service</p>
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="card">
          <h3 className="font-semibold mb-4">
            {activeTab === 'diagnostic' && 'Device Information'}
            {activeTab === 'quote' && 'Quote Request'}
            {activeTab === 'guide' && 'Repair Guide Request'}
            {activeTab === 'warranty' && 'Warranty Check'}
            {activeTab === 'chat' && 'Customer Question'}
          </h3>

          {(activeTab === 'diagnostic' || activeTab === 'quote' || activeTab === 'guide') && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Device Type</label>
                  <select value={deviceInfo.deviceType} onChange={(e) => setDeviceInfo({ ...deviceInfo, deviceType: e.target.value })} className="select-field">
                    <option value="">Select...</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Smartwatch">Smartwatch</option>
                    <option value="Shoes">Shoes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input type="text" value={deviceInfo.brand} onChange={(e) => setDeviceInfo({ ...deviceInfo, brand: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <input type="text" value={deviceInfo.model} onChange={(e) => setDeviceInfo({ ...deviceInfo, model: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Issue Description</label>
                <textarea value={deviceInfo.issueDescription} onChange={(e) => setDeviceInfo({ ...deviceInfo, issueDescription: e.target.value })} className="input-field" rows={3} />
              </div>
              {activeTab === 'guide' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Repair Type</label>
                  <input type="text" value={repairType} onChange={(e) => setRepairType(e.target.value)} className="input-field" placeholder="e.g., Screen Replacement" />
                </div>
              )}
              <button
                onClick={activeTab === 'diagnostic' ? handleDiagnostic : activeTab === 'quote' ? handleQuote : handleRepairGuide}
                disabled={loading || !deviceInfo.deviceType}
                className="w-full btn-primary"
              >
                {loading ? 'Analyzing...' : 'Get AI Analysis'}
              </button>
            </div>
          )}

          {activeTab === 'warranty' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input type="text" value={warrantyInfo.brand} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, brand: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Model</label>
                  <input type="text" value={warrantyInfo.model} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, model: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Date</label>
                  <input type="date" value={warrantyInfo.purchaseDate} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, purchaseDate: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Serial Number</label>
                  <input type="text" value={warrantyInfo.serialNumber} onChange={(e) => setWarrantyInfo({ ...warrantyInfo, serialNumber: e.target.value })} className="input-field" />
                </div>
              </div>
              <button onClick={handleWarranty} disabled={loading || !warrantyInfo.brand} className="w-full btn-primary">
                {loading ? 'Checking...' : 'Check Warranty'}
              </button>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Select Ticket (Optional)</label>
                {ticketsLoading ? (
                  <div className="input-field flex items-center gap-2 text-gray-500">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading tickets...
                  </div>
                ) : (
                  <select
                    value={selectedTicket?.id || ''}
                    onChange={(e) => {
                      const ticket = tickets.find(t => t.id === e.target.value)
                      setSelectedTicket(ticket || null)
                    }}
                    className="select-field"
                  >
                    <option value="">-- Select a ticket ({tickets.length} available) --</option>
                    {tickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.ticketNumber} - {ticket.customer.firstName} {ticket.customer.lastName} ({ticket.status.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                )}

                {/* Selected Ticket Display */}
                {selectedTicket && (
                  <div className="mt-3 bg-primary-50 border border-primary-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-primary-700">{selectedTicket.ticketNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            selectedTicket.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            selectedTicket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                            selectedTicket.status === 'PENDING_PARTS' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedTicket.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {selectedTicket.customer.firstName} {selectedTicket.customer.lastName}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {selectedTicket.device ? `${selectedTicket.device.brand || ''} ${selectedTicket.device.model || selectedTicket.device.deviceType}`.trim() : 'No device info'}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Customer Question</label>
                <textarea value={customerQuestion} onChange={(e) => setCustomerQuestion(e.target.value)} className="input-field" rows={4} placeholder="What would the customer like to know?" />
              </div>
              <button onClick={handleCustomerQuestion} disabled={loading || !customerQuestion} className="w-full btn-primary">
                {loading ? 'Thinking...' : 'Get Response'}
              </button>
            </div>
          )}
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

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500">Analyzing with AI...</p>
              <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Error State */}
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

          {activeTab === 'diagnostic' && diagnosticResult && !loading && (
            <div className="space-y-6">
              {/* Possible Issues */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h4 className="font-semibold text-gray-800">Possible Issues</h4>
                </div>
                <ul className="space-y-2">
                  {diagnosticResult.possibleIssues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-gray-700">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Suggested Tests */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h4 className="font-semibold text-gray-800">Suggested Tests</h4>
                </div>
                <ul className="space-y-2">
                  {diagnosticResult.suggestedTests.map((test, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span className="text-gray-700">{test}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Difficulty</p>
                  <p className={`text-xl font-bold ${
                    diagnosticResult.estimatedDifficulty === 'Easy' ? 'text-green-600' :
                    diagnosticResult.estimatedDifficulty === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                  }`}>{diagnosticResult.estimatedDifficulty}</p>
                </div>
                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Est. Time</p>
                  <p className="text-xl font-bold text-gray-800">{diagnosticResult.estimatedTime}</p>
                </div>
              </div>

              {/* Recommended Parts */}
              {diagnosticResult.recommendedParts.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h4 className="font-semibold text-gray-800">Recommended Parts</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {diagnosticResult.recommendedParts.map((part, i) => (
                      <span key={i} className="px-3 py-1.5 bg-white rounded-full text-sm font-medium text-green-700 border border-green-200">{part}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-700">{diagnosticResult.notes}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quote' && quoteResult && !loading && (
            <div className="space-y-6">
              {/* Main Price Card */}
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-6 text-white text-center">
                <p className="text-primary-100 text-sm uppercase tracking-wider mb-2">Total Estimate</p>
                <p className="text-4xl font-bold mb-1">{formatCurrency(quoteResult.totalEstimate)}</p>
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  quoteResult.confidence === 'High' ? 'bg-green-500/30' :
                  quoteResult.confidence === 'Medium' ? 'bg-yellow-500/30' : 'bg-red-500/30'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {quoteResult.confidence} Confidence
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <svg className="w-8 h-8 text-blue-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Labor</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(quoteResult.laborCost)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <svg className="w-8 h-8 text-green-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Parts</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(quoteResult.estimatedPartsCost)}</p>
                </div>
              </div>

              {/* Time Estimate */}
              <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estimated Repair Time</p>
                  <p className="text-lg font-semibold text-gray-800">{quoteResult.timeEstimate}</p>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">{quoteResult.notes}</p>
              </div>
            </div>
          )}

          {activeTab === 'guide' && guideResult && !loading && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                    guideResult.difficultyLevel === 'Beginner' ? 'bg-green-100 text-green-700' :
                    guideResult.difficultyLevel === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>{guideResult.difficultyLevel}</span>
                  <span className="text-gray-600">{guideResult.estimatedTime}</span>
                </div>
              </div>

              {/* Tools Required */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Tools Required</h4>
                <div className="flex flex-wrap gap-2">
                  {guideResult.toolsRequired.map((tool, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white rounded-lg text-sm border border-gray-200 flex items-center gap-1">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Step-by-Step Guide</h4>
                {guideResult.steps.map((step) => (
                  <div key={step.stepNumber} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold flex-shrink-0">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-800 mb-2">{step.title}</h5>
                        <p className="text-gray-600 mb-3">{step.description}</p>
                        {step.warnings.length > 0 && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                            <div className="flex items-center gap-2 text-red-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span className="font-medium text-sm">{step.warnings.join(', ')}</span>
                            </div>
                          </div>
                        )}
                        {step.tips.length > 0 && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              <span className="font-medium text-sm">{step.tips.join(', ')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'warranty' && warrantyResult && !loading && (
            <div className="space-y-6">
              <div className={`rounded-2xl p-6 text-center ${
                warrantyResult.status === 'VALID' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                warrantyResult.status === 'EXPIRED' ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                'bg-gradient-to-br from-yellow-500 to-amber-600'
              } text-white`}>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  {warrantyResult.status === 'VALID' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ) : warrantyResult.status === 'EXPIRED' ? (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">{warrantyResult.status === 'VALID' ? 'Warranty Active' : warrantyResult.status === 'EXPIRED' ? 'Warranty Expired' : 'Warranty Unknown'}</h3>
                <p className="text-white/80">{warrantyResult.message}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-800 mb-2">Details</h4>
                <p className="text-gray-600">{warrantyResult.details}</p>
              </div>
            </div>
          )}

          {activeTab === 'chat' && chatResponse && !loading && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="flex-1 bg-gray-50 rounded-2xl rounded-tl-none p-4">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">{chatResponse}</p>
                </div>
              </div>
            </div>
          )}

          {!diagnosticResult && !quoteResult && !guideResult && !warrantyResult && !chatResponse && !loading && !error && (
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
