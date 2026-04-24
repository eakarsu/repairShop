'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatCurrency, getWarrantyClaimStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface WarrantyClaim {
  id: string
  claimNumber: string
  status: string
  productDescription: string
  issueDescription: string
  claimAmount: number | null
  approvedAmount: number | null
  submittedAt: string
  reviewedAt: string | null
  resolvedAt: string | null
  customer: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string
  }
  ticket: {
    id: string
    ticketNumber: string
    status: string
  } | null
  _count: {
    documents: number
    statusHistory: number
  }
}

const statusOptions = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'CANCELLED'
]

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export default function WarrantyClaimsPage() {
  const { showToast } = useToast()
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchClaims()
  }, [search, statusFilter])

  const fetchClaims = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/warranty-claims?${params}`)
      const data = await res.json()

      if (data.success) {
        setClaims(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch claims:', error)
      showToast('Failed to load warranty claims', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (claim: WarrantyClaim) => {
    setSelectedClaim(claim)
  }

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/warranty-claims/${claimId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        showToast('Status updated successfully', 'success')
        fetchClaims()
        if (selectedClaim?.id === claimId) {
          setSelectedClaim({ ...selectedClaim, status: newStatus })
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
    if (selectedIds.size === claims.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(claims.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'warranty-claims', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} warranty claim(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchClaims()
      } else {
        showToast(data.error || 'Failed to delete warranty claims', 'error')
      }
    } catch {
      showToast('Failed to delete warranty claims', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=warranty-claims${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=warranty-claims${ids}`, '_blank')
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warranty Claims</h1>
          <p className="text-gray-600">Track and manage warranty claims</p>
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
          <Link href="/dashboard/warranty-claims/new" className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Claim
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search claims..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statusOptions.slice(0, 4).map((status) => {
          const count = claims.filter((c) => c.status === status).length
          return (
            <div
              key={status}
              className="bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            >
              <p className="text-sm text-gray-500">{statusLabels[status]}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Bulk Action Bar */}
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

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header w-10">
                    <input type="checkbox" checked={selectedIds.size === claims.length && claims.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                  </th>
                  <th className="table-header">Claim #</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">Product</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Claim Amount</th>
                  <th className="table-header">Submitted</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No warranty claims found
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr
                      key={claim.id}
                      onClick={() => handleRowClick(claim)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="table-cell" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(claim.id)} onChange={() => toggleSelect(claim.id)} className="w-4 h-4 rounded" />
                      </td>
                      <td className="table-cell">
                        <span className="font-mono font-medium text-blue-600">{claim.claimNumber}</span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">
                            {claim.customer.firstName} {claim.customer.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{claim.customer.phone}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <p className="text-gray-900 truncate max-w-[200px]">{claim.productDescription}</p>
                      </td>
                      <td className="table-cell">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWarrantyClaimStatusColor(claim.status)}`}>
                          {statusLabels[claim.status]}
                        </span>
                      </td>
                      <td className="table-cell">
                        {claim.claimAmount ? formatCurrency(claim.claimAmount) : '-'}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(claim.submittedAt)}
                      </td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/dashboard/warranty-claims/${claim.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Dialog for Bulk Delete */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Warranty Claims"
        message={`Are you sure you want to delete ${selectedIds.size} warranty claim(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={!!selectedClaim}
        onClose={() => setSelectedClaim(null)}
        title={`Warranty Claim ${selectedClaim?.claimNumber || ''}`}
        size="lg"
      >
        {selectedClaim && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <DetailRow
                label="Status"
                value={
                  <StatusBadge
                    status={statusLabels[selectedClaim.status]}
                    colorClass={getWarrantyClaimStatusColor(selectedClaim.status)}
                  />
                }
              />
              <DetailRow label="Submitted" value={formatDate(selectedClaim.submittedAt)} />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <DetailRow
                  label="Name"
                  value={`${selectedClaim.customer.firstName} ${selectedClaim.customer.lastName}`}
                />
                <DetailRow label="Phone" value={selectedClaim.customer.phone} />
                <DetailRow label="Email" value={selectedClaim.customer.email || '-'} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Claim Details</h4>
              <DetailRow label="Product" value={selectedClaim.productDescription} />
              <DetailRow label="Issue" value={selectedClaim.issueDescription} />
              {selectedClaim.claimAmount && (
                <DetailRow label="Claim Amount" value={formatCurrency(selectedClaim.claimAmount)} />
              )}
              {selectedClaim.approvedAmount && (
                <DetailRow label="Approved Amount" value={formatCurrency(selectedClaim.approvedAmount)} />
              )}
            </div>

            {selectedClaim.ticket && (
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Related Ticket</h4>
                <DetailRow
                  label="Ticket Number"
                  value={
                    <Link
                      href={`/dashboard/tickets/${selectedClaim.ticket.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {selectedClaim.ticket.ticketNumber}
                    </Link>
                  }
                />
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusUpdate(selectedClaim.id, status)}
                    disabled={selectedClaim.status === status}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedClaim.status === status
                        ? 'bg-blue-100 text-blue-800 cursor-default'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 flex justify-end">
              <Link
                href={`/dashboard/warranty-claims/${selectedClaim.id}`}
                className="btn-primary"
              >
                View Full Details
              </Link>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
