'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatDate, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface Ticket {
  id: string
  ticketNumber: string
  status: string
  priority: string
  issueDescription: string
  estimatedCost: number | null
  actualCost: number | null
  createdAt: string
  customer: { id: string; firstName: string; lastName: string; phone: string; email?: string }
  device: { deviceType: string; brand?: string; model?: string; serialNumber?: string } | null
  technician: { firstName: string; lastName: string } | null
}

const statusOptions = [
  'RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'WAITING_PARTS',
  'IN_REPAIR', 'QUALITY_CHECK', 'READY_PICKUP', 'COMPLETED', 'CANCELLED'
]

const priorityOptions = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

export default function TicketsPage() {
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [search, statusFilter, priorityFilter, page])

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)
      if (priorityFilter) params.append('priority', priorityFilter)
      params.append('page', page.toString())
      params.append('limit', '10')

      const res = await fetch(`/api/tickets?${params}`)
      const data = await res.json()

      if (data.success) {
        setTickets(data.data.tickets)
        setTotalPages(data.data.pagination.pages)
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
      showToast('Failed to load tickets', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (ticket: Ticket) => {
    setSelectedTicket(ticket)
  }

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        showToast('Status updated successfully', 'success')
        fetchTickets()
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      showToast('Failed to update status', 'error')
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
    if (selectedIds.size === tickets.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(tickets.map(t => t.id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'tickets', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} ticket(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchTickets()
      } else {
        showToast(data.error || 'Failed to delete tickets', 'error')
      }
    } catch {
      showToast('Failed to delete tickets', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=tickets${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=tickets${ids}`, '_blank')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repair Tickets</h1>
          <p className="text-gray-600">Manage all repair tickets</p>
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
          <Link href="/dashboard/tickets/new" className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Ticket
          </Link>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input type="text" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field w-auto">
            <option value="">All Statuses</option>
            {statusOptions.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="select-field w-auto">
            <option value="">All Priorities</option>
            {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header w-10">
                      <input type="checkbox" checked={selectedIds.size === tickets.length && tickets.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                    </th>
                    <th className="table-header">Ticket #</th>
                    <th className="table-header">Customer</th>
                    <th className="table-header">Device</th>
                    <th className="table-header">Issue</th>
                    <th className="table-header">Technician</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Priority</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleRowClick(ticket)}>
                      <td className="table-cell" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(ticket.id)} onChange={() => toggleSelect(ticket.id)} className="w-4 h-4 rounded" />
                      </td>
                      <td className="table-cell"><span className="text-primary-600 font-medium">{ticket.ticketNumber}</span></td>
                      <td className="table-cell">
                        <div><p className="font-medium">{ticket.customer.firstName} {ticket.customer.lastName}</p><p className="text-gray-500 text-sm">{ticket.customer.phone}</p></div>
                      </td>
                      <td className="table-cell">
                        {ticket.device ? <div><p>{ticket.device.deviceType}</p><p className="text-gray-500 text-sm">{[ticket.device.brand, ticket.device.model].filter(Boolean).join(' ')}</p></div> : '-'}
                      </td>
                      <td className="table-cell"><p className="truncate max-w-[200px]">{ticket.issueDescription}</p></td>
                      <td className="table-cell">{ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : '-'}</td>
                      <td className="table-cell"><span className={`status-badge ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span></td>
                      <td className="table-cell"><span className={`status-badge ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span></td>
                      <td className="table-cell text-gray-500">{formatDate(ticket.createdAt)}</td>
                      <td className="table-cell" onClick={e => e.stopPropagation()}>
                        <Link href={`/dashboard/tickets/${ticket.id}`} className="text-primary-600 hover:text-primary-700">View</Link>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && <tr><td colSpan={10} className="py-12 text-center text-gray-500">No tickets found</td></tr>}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary">Previous</button>
                <span className="text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary">Next</button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Tickets"
        message={`Are you sure you want to delete ${selectedIds.size} ticket(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      <DetailModal isOpen={!!selectedTicket} onClose={() => setSelectedTicket(null)} title="Ticket Details" size="xl">
        {selectedTicket && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{selectedTicket.ticketNumber}</h4>
                <p className="text-gray-500">{formatDate(selectedTicket.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={selectedTicket.status} colorClass={getStatusColor(selectedTicket.status)} />
                <StatusBadge status={selectedTicket.priority} colorClass={getPriorityColor(selectedTicket.priority)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Customer Information</h5>
                <DetailRow label="Name" value={`${selectedTicket.customer.firstName} ${selectedTicket.customer.lastName}`} />
                <DetailRow label="Phone" value={selectedTicket.customer.phone} />
                {selectedTicket.customer.email && <DetailRow label="Email" value={selectedTicket.customer.email} />}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Device Information</h5>
                {selectedTicket.device ? (
                  <>
                    <DetailRow label="Type" value={selectedTicket.device.deviceType} />
                    {selectedTicket.device.brand && <DetailRow label="Brand" value={selectedTicket.device.brand} />}
                    {selectedTicket.device.model && <DetailRow label="Model" value={selectedTicket.device.model} />}
                  </>
                ) : <p className="text-gray-500">No device information</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-2">Issue Description</h5>
              <p className="text-gray-600">{selectedTicket.issueDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Technician</h5>
                {selectedTicket.technician ? <p className="text-gray-900">{selectedTicket.technician.firstName} {selectedTicket.technician.lastName}</p> : <p className="text-gray-500">Not assigned</p>}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Cost</h5>
                <DetailRow label="Estimated" value={selectedTicket.estimatedCost ? formatCurrency(selectedTicket.estimatedCost) : '-'} />
                <DetailRow label="Actual" value={selectedTicket.actualCost ? formatCurrency(selectedTicket.actualCost) : '-'} highlight />
              </div>
            </div>
            <div className="bg-primary-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Update Status</h5>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(status => (
                  <button key={status} onClick={() => handleStatusUpdate(selectedTicket.id, status)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedTicket.status === status ? getStatusColor(status) : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'}`}>
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedTicket(null)} className="btn-secondary">Close</button>
              <Link href={`/dashboard/tickets/${selectedTicket.id}`} className="btn-primary">View Full Details</Link>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
