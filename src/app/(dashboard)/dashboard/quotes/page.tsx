'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'
import QuoteApprovalBadge from '@/components/QuoteApprovalBadge'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface Quote {
  id: string
  quoteNumber: string
  status: string
  total: number
  validUntil: string
  notes?: string | null
  createdAt: string
  customer: { id: string; firstName: string; lastName: string; phone?: string; email?: string }
  ticket: { id: string; ticketNumber: string } | null
  items: { id: string; description: string; quantity: number; unitPrice: number; total: number }[]
  approval?: {
    id: string
    token: string
    status: string
    sentAt: string
    respondedAt?: string
    customerNotes?: string
  } | null
}

const statusOptions = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']

export default function QuotesPage() {
  const { showToast } = useToast()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [sendingApproval, setSendingApproval] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchQuotes()
  }, [statusFilter])

  const fetchQuotes = async () => {
    try {
      const res = await fetch(`/api/quotes?status=${statusFilter}`)
      const data = await res.json()
      if (data.success) setQuotes(data.data.quotes)
    } catch (error) {
      console.error('Failed to fetch quotes:', error)
      showToast('Failed to load quotes', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (quoteId: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        showToast('Status updated successfully', 'success')
        fetchQuotes()
        if (selectedQuote?.id === quoteId) {
          setSelectedQuote({ ...selectedQuote, status })
        }
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch (error) {
      console.error('Failed to update quote:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const handleRowClick = (quote: Quote) => {
    setSelectedQuote(quote)
  }

  const handleSendForApproval = async (quoteId: string) => {
    setSendingApproval(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/send-approval`, {
        method: 'POST',
      })
      const data = await res.json()
      if (data.success) {
        showToast('Approval request sent successfully!', 'success')
        fetchQuotes()
        if (selectedQuote?.id === quoteId) {
          setSelectedQuote({ ...selectedQuote, approval: data.data.approval, status: 'SENT' })
        }
      } else {
        showToast(data.error || 'Failed to send approval request', 'error')
      }
    } catch (error) {
      console.error('Failed to send approval:', error)
      showToast('Failed to send approval request', 'error')
    } finally {
      setSendingApproval(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === quotes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(quotes.map(q => q.id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quotes', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} quote(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchQuotes()
      } else {
        showToast(data.error || 'Failed to delete quotes', 'error')
      }
    } catch {
      showToast('Failed to delete quotes', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=quotes${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=quotes${ids}`, '_blank')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">Manage repair quotes</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="btn-secondary text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </button>
          <button onClick={handleExportPDF} className="btn-secondary text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
          <Link href="/dashboard/quotes/new" className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Quote
          </Link>
        </div>
      </div>

      <div className="card mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field w-auto">
          <option value="">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-800">{selectedIds.size} item(s) selected</span>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="text-sm text-primary-700 hover:text-primary-900 font-medium">Export CSV</button>
            <button onClick={handleExportPDF} className="text-sm text-primary-700 hover:text-primary-900 font-medium">Export PDF</button>
            <button onClick={() => setDeleteConfirm(true)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete Selected</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800">Clear</button>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header w-10">
                    <input type="checkbox" checked={selectedIds.size === quotes.length && quotes.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                  </th>
                  <th className="table-header">Quote #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Ticket</th>
                  <th className="table-header">Items</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Approval</th>
                  <th className="table-header">Valid Until</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(quote)}
                  >
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(quote.id)} onChange={() => toggleSelect(quote.id)} className="w-4 h-4 rounded" />
                    </td>
                    <td className="table-cell font-medium text-primary-600">{quote.quoteNumber}</td>
                    <td className="table-cell">
                      {quote.customer.firstName} {quote.customer.lastName}
                    </td>
                    <td className="table-cell">
                      {quote.ticket ? (
                        <span className="text-primary-600">{quote.ticket.ticketNumber}</span>
                      ) : '-'}
                    </td>
                    <td className="table-cell">{quote.items.length} items</td>
                    <td className="table-cell font-medium">{formatCurrency(quote.total)}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${getStatusColor(quote.status)}`}>{quote.status}</span>
                    </td>
                    <td className="table-cell">
                      {quote.approval ? (
                        <QuoteApprovalBadge approval={quote.approval} compact />
                      ) : (
                        <span className="text-gray-400 text-sm">Not sent</span>
                      )}
                    </td>
                    <td className="table-cell">{formatDate(quote.validUntil)}</td>
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-gray-500">No quotes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Quotes"
        message={`Are you sure you want to delete ${selectedIds.size} quote(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Quote Detail Modal */}
      <DetailModal
        isOpen={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        title="Quote Details"
        size="lg"
      >
        {selectedQuote && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{selectedQuote.quoteNumber}</h4>
                <p className="text-gray-500">Created: {formatDate(selectedQuote.createdAt)}</p>
              </div>
              <StatusBadge status={selectedQuote.status} colorClass={getStatusColor(selectedQuote.status)} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-gray-700 mb-3">Customer</h5>
                <DetailRow label="Name" value={`${selectedQuote.customer.firstName} ${selectedQuote.customer.lastName}`} />
                {selectedQuote.customer.phone && <DetailRow label="Phone" value={selectedQuote.customer.phone} />}
                {selectedQuote.customer.email && <DetailRow label="Email" value={selectedQuote.customer.email} />}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-gray-700 mb-3">Quote Info</h5>
                <DetailRow label="Valid Until" value={formatDate(selectedQuote.validUntil)} />
                {selectedQuote.ticket && (
                  <DetailRow label="Related Ticket" value={selectedQuote.ticket.ticketNumber} highlight />
                )}
                <DetailRow label="Total" value={formatCurrency(selectedQuote.total)} highlight />
              </div>
            </div>

            {selectedQuote.notes && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-2">Notes</h5>
                <p className="text-gray-600">{selectedQuote.notes}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Quote Items ({selectedQuote.items.length})</h5>
              <div className="space-y-2">
                {selectedQuote.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium">{item.description}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.unitPrice)} each</p>
                      <p className="text-sm text-gray-500">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="text-xl font-bold text-primary-600">{formatCurrency(selectedQuote.total)}</span>
              </div>
            </div>

            {/* Quick Status Update */}
            <div className="bg-primary-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Update Status</h5>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(selectedQuote.id, status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedQuote.status === status
                        ? getStatusColor(status)
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer Approval Section */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Customer Approval</h5>
              {selectedQuote.approval ? (
                <div className="space-y-2">
                  <QuoteApprovalBadge approval={selectedQuote.approval} />
                  {selectedQuote.approval.customerNotes && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Customer Notes:</span> {selectedQuote.approval.customerNotes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Send this quote to the customer for approval via email.</p>
                  <button
                    onClick={() => handleSendForApproval(selectedQuote.id)}
                    disabled={sendingApproval || selectedQuote.status === 'APPROVED' || selectedQuote.status === 'REJECTED'}
                    className="btn-primary text-sm"
                  >
                    {sendingApproval ? 'Sending...' : 'Send for Approval'}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedQuote(null)} className="btn-secondary">
                Close
              </button>
              {selectedQuote.ticket && (
                <Link href={`/dashboard/tickets/${selectedQuote.ticket.id}`} className="btn-primary">
                  View Ticket
                </Link>
              )}
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
