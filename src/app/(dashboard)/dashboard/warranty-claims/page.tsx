'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatCurrency, getWarrantyClaimStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'

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
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null)

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
        fetchClaims()
        if (selectedClaim?.id === claimId) {
          setSelectedClaim({ ...selectedClaim, status: newStatus })
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warranty Claims</h1>
          <p className="text-gray-600">Track and manage warranty claims</p>
        </div>
        <Link href="/dashboard/warranty-claims/new" className="btn-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Claim
        </Link>
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

      {/* Claims Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No warranty claims found
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => handleRowClick(claim)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-medium text-blue-600">{claim.claimNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {claim.customer.firstName} {claim.customer.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{claim.customer.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900 truncate max-w-[200px]">{claim.productDescription}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWarrantyClaimStatusColor(claim.status)}`}>
                        {statusLabels[claim.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {claim.claimAmount ? formatCurrency(claim.claimAmount) : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(claim.submittedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/warranty-claims/${claim.id}`}
                        onClick={(e) => e.stopPropagation()}
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
      </div>

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
