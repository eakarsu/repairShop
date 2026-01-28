'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate, formatDateTime, formatCurrency, getWarrantyClaimStatusColor } from '@/lib/utils'

interface WarrantyClaim {
  id: string
  claimNumber: string
  status: string
  productDescription: string
  issueDescription: string
  resolution: string | null
  claimAmount: number | null
  approvedAmount: number | null
  purchaseDate: string | null
  warrantyEndDate: string | null
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
    device: {
      deviceType: string
      brand: string | null
      model: string | null
    } | null
  } | null
  statusHistory: {
    id: string
    fromStatus: string | null
    toStatus: string
    notes: string | null
    changedBy: string | null
    createdAt: string
  }[]
  documents: {
    id: string
    filename: string
    originalName: string
    documentType: string | null
    uploadedAt: string
  }[]
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

export default function WarrantyClaimDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [claim, setClaim] = useState<WarrantyClaim | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [resolution, setResolution] = useState('')
  const [approvedAmount, setApprovedAmount] = useState('')

  useEffect(() => {
    fetchClaim()
  }, [params.id])

  const fetchClaim = async () => {
    try {
      const res = await fetch(`/api/warranty-claims/${params.id}`)
      const data = await res.json()

      if (data.success) {
        setClaim(data.data)
        setResolution(data.data.resolution || '')
        setApprovedAmount(data.data.approvedAmount?.toString() || '')
      }
    } catch (error) {
      console.error('Failed to fetch claim:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!claim) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/warranty-claims/${claim.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          resolution: resolution || undefined,
          approvedAmount: approvedAmount ? parseFloat(approvedAmount) : undefined
        })
      })

      const data = await res.json()
      if (data.success) {
        setClaim(data.data)
      }
    } catch (error) {
      console.error('Failed to update claim:', error)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!claim || !confirm('Are you sure you want to delete this claim?')) return

    try {
      const res = await fetch(`/api/warranty-claims/${claim.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        router.push('/dashboard/warranty-claims')
      }
    } catch (error) {
      console.error('Failed to delete claim:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Warranty claim not found</p>
        <Link href="/dashboard/warranty-claims" className="text-blue-600 hover:underline">
          Back to claims
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/warranty-claims"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{claim.claimNumber}</h1>
            <p className="text-gray-600">Warranty Claim Details</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWarrantyClaimStatusColor(claim.status)}`}>
            {statusLabels[claim.status]}
          </span>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Product Info */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Customer & Product</h2>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
                <p className="font-medium">{claim.customer.firstName} {claim.customer.lastName}</p>
                <p className="text-sm text-gray-500">{claim.customer.phone}</p>
                {claim.customer.email && (
                  <p className="text-sm text-gray-500">{claim.customer.email}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Product</h3>
                <p className="font-medium">{claim.productDescription}</p>
                {claim.purchaseDate && (
                  <p className="text-sm text-gray-500">Purchased: {formatDate(claim.purchaseDate)}</p>
                )}
                {claim.warrantyEndDate && (
                  <p className="text-sm text-gray-500">Warranty ends: {formatDate(claim.warrantyEndDate)}</p>
                )}
              </div>
            </div>

            {claim.ticket && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Linked Ticket</h3>
                <Link
                  href={`/dashboard/tickets/${claim.ticket.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {claim.ticket.ticketNumber}
                </Link>
                {claim.ticket.device && (
                  <p className="text-sm text-gray-500">
                    {claim.ticket.device.deviceType} {claim.ticket.device.brand} {claim.ticket.device.model}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Issue & Resolution */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Issue & Resolution</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Issue Description</h3>
                <p className="text-gray-800 whitespace-pre-wrap">{claim.issueDescription}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Resolution</h3>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  placeholder="Enter resolution details..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Status History</h2>

            <div className="space-y-4">
              {claim.statusHistory.map((history, index) => (
                <div
                  key={history.id}
                  className={`flex gap-4 ${index !== claim.statusHistory.length - 1 ? 'pb-4 border-b' : ''}`}
                >
                  <div className="flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${getWarrantyClaimStatusColor(history.toStatus).replace('text-', 'bg-').split(' ')[0]}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {history.fromStatus && (
                        <>
                          <span className="text-sm text-gray-500">{statusLabels[history.fromStatus]}</span>
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                      <span className="font-medium">{statusLabels[history.toStatus]}</span>
                    </div>
                    {history.notes && (
                      <p className="text-sm text-gray-600 mt-1">{history.notes}</p>
                    )}
                    <div className="flex gap-2 text-xs text-gray-400 mt-1">
                      <span>{formatDateTime(history.createdAt)}</span>
                      {history.changedBy && <span>by {history.changedBy}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Amounts */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Amounts</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Claim Amount
                </label>
                <p className="text-2xl font-bold text-gray-900">
                  {claim.claimAmount ? formatCurrency(claim.claimAmount) : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Approved Amount
                </label>
                <input
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500">Submitted</label>
                <p className="font-medium">{formatDateTime(claim.submittedAt)}</p>
              </div>
              {claim.reviewedAt && (
                <div>
                  <label className="block text-sm text-gray-500">Reviewed</label>
                  <p className="font-medium">{formatDateTime(claim.reviewedAt)}</p>
                </div>
              )}
              {claim.resolvedAt && (
                <div>
                  <label className="block text-sm text-gray-500">Resolved</label>
                  <p className="font-medium">{formatDateTime(claim.resolvedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Update Status</h2>

            <div className="space-y-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={updating || claim.status === status}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    claim.status === status
                      ? getWarrantyClaimStatusColor(status)
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
