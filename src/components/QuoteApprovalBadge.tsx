'use client'

import { useState } from 'react'

interface ApprovalData {
  id: string
  token: string
  status: string
  sentAt: string
  respondedAt?: string | null
  customerNotes?: string | null
}

interface QuoteApprovalBadgeProps {
  quoteId?: string
  status?: string
  approvalStatus?: string | null
  approvalToken?: string | null
  sentAt?: string | null
  respondedAt?: string | null
  customerNotes?: string | null
  onSendApproval?: () => void
  approval?: ApprovalData | null
  compact?: boolean
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  VIEWED: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800'
}

export default function QuoteApprovalBadge({
  quoteId,
  status,
  approvalStatus: propApprovalStatus,
  approvalToken: propApprovalToken,
  sentAt: propSentAt,
  respondedAt: propRespondedAt,
  customerNotes: propCustomerNotes,
  onSendApproval,
  approval,
  compact = false
}: QuoteApprovalBadgeProps) {
  // Use approval object if provided, otherwise use individual props
  const approvalStatus = approval?.status || propApprovalStatus
  const approvalToken = approval?.token || propApprovalToken
  const sentAt = approval?.sentAt || propSentAt
  const respondedAt = approval?.respondedAt || propRespondedAt
  const customerNotes = approval?.customerNotes || propCustomerNotes

  const [isSending, setIsSending] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSendApproval = async () => {
    setIsSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/quotes/${quoteId}/send-approval`, {
        method: 'POST'
      })

      const data = await res.json()

      if (data.success) {
        onSendApproval?.()
      } else {
        setError(data.error || 'Failed to send approval request')
      }
    } catch (err) {
      setError('Failed to send approval request')
    } finally {
      setIsSending(false)
    }
  }

  const getApprovalLink = () => {
    if (!approvalToken) return null
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/approve/${approvalToken}`
  }

  // Compact mode - just show a simple badge
  if (compact) {
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[approvalStatus || 'PENDING'] || statusColors.PENDING}`}>
        {approvalStatus || 'PENDING'}
      </span>
    )
  }

  return (
    <div className="space-y-2">
      {/* Main Badge */}
      <div className="flex items-center gap-2">
        {approvalStatus ? (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[approvalStatus] || statusColors.PENDING}`}>
            {approvalStatus}
          </span>
        ) : status === 'DRAFT' ? (
          <button
            onClick={handleSendApproval}
            disabled={isSending}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-full hover:bg-blue-700 disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send for Approval'}
          </button>
        ) : null}

        {approvalToken && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Details Dropdown */}
      {showDetails && approvalToken && (
        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-2">
          {sentAt && (
            <p className="text-gray-600">
              <span className="font-medium">Sent:</span> {new Date(sentAt).toLocaleString()}
            </p>
          )}
          {respondedAt && (
            <p className="text-gray-600">
              <span className="font-medium">Responded:</span> {new Date(respondedAt).toLocaleString()}
            </p>
          )}
          {customerNotes && (
            <div>
              <span className="font-medium text-gray-600">Customer Notes:</span>
              <p className="mt-1 text-gray-800 italic">"{customerNotes}"</p>
            </div>
          )}

          {/* Big Open Button */}
          <a
            href={getApprovalLink() || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Customer Approval Page →
          </a>
        </div>
      )}
    </div>
  )
}
