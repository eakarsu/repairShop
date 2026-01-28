'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface QuoteItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
  serviceName?: string
}

interface QuoteData {
  quote: {
    quoteNumber: string
    subtotal: number
    taxRate: number
    taxAmount: number
    discount: number
    total: number
    validUntil: string
    notes: string | null
    items: QuoteItem[]
    device: {
      deviceType: string
      brand: string | null
      model: string | null
    } | null
  }
  customer: {
    firstName: string
    lastName: string
    email: string | null
    phone: string
  }
  status: string
  respondedAt: string | null
  customerNotes: string | null
  shopInfo: {
    shop_name?: string
    shop_address?: string
    shop_phone?: string
    shop_email?: string
  }
}

export default function ApprovalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchQuoteData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.token])

  const fetchQuoteData = async () => {
    try {
      const res = await fetch(`/api/approve/${params.token}`)
      const result = await res.json()

      if (result.success) {
        setData(result.data)
        if (result.data.respondedAt) {
          setSubmitted(true)
        }
      } else {
        setError(result.error || 'Failed to load quote')
      }
    } catch (err) {
      setError('Failed to load quote')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (action: 'approve' | 'reject') => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/approve/${params.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() || undefined })
      })

      const result = await res.json()

      if (result.success) {
        setSubmitted(true)
        setSubmitResult({ success: true, message: result.message })
      } else {
        setSubmitResult({ success: false, message: result.error || 'Failed to submit response' })
      }
    } catch (err) {
      setSubmitResult({ success: false, message: 'Failed to submit response' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quote details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Quote</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const shopName = data.shopInfo.shop_name || 'RepairShop Pro'

  if (submitted || data.status === 'APPROVED' || data.status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            data.status === 'APPROVED' || submitResult?.success
              ? 'bg-green-100'
              : 'bg-yellow-100'
          }`}>
            {data.status === 'APPROVED' || (submitResult?.success && submitResult.message.includes('approved')) ? (
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            {submitResult?.message || (data.status === 'APPROVED' ? 'Quote Approved' : 'Quote Declined')}
          </h1>
          <p className="text-gray-600 mb-4">
            Quote #{data.quote.quoteNumber}
          </p>
          {data.customerNotes && (
            <p className="text-sm text-gray-500 italic">
              Your notes: "{data.customerNotes}"
            </p>
          )}
          <p className="text-sm text-gray-400 mt-4">
            Thank you for using {shopName}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white rounded-t-xl p-6">
          <h1 className="text-2xl font-bold">{shopName}</h1>
          <p className="text-blue-100">Quote Approval Request</p>
        </div>

        {/* Main Content */}
        <div className="bg-white shadow-lg rounded-b-xl">
          {/* Quote Info */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-500">Quote Number</p>
                <p className="text-xl font-bold text-gray-900">{data.quote.quoteNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Valid Until</p>
                <p className="font-medium text-gray-900">{formatDate(data.quote.validUntil)}</p>
              </div>
            </div>

            {/* Customer & Device */}
            <div className="grid md:grid-cols-2 gap-4 py-4 border-t">
              <div>
                <p className="text-sm text-gray-500 mb-1">Customer</p>
                <p className="font-medium">{data.customer.firstName} {data.customer.lastName}</p>
                <p className="text-sm text-gray-600">{data.customer.phone}</p>
                {data.customer.email && (
                  <p className="text-sm text-gray-600">{data.customer.email}</p>
                )}
              </div>
              {data.quote.device && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Device</p>
                  <p className="font-medium">
                    {data.quote.device.deviceType} {data.quote.device.brand} {data.quote.device.model}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="p-6 border-b">
            <h2 className="font-semibold text-gray-900 mb-4">Quote Items</h2>
            <div className="space-y-3">
              {data.quote.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{item.description}</p>
                    {item.serviceName && (
                      <p className="text-sm text-gray-500">{item.serviceName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(item.total)}</p>
                    {item.quantity > 1 && (
                      <p className="text-sm text-gray-500">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 border-b bg-gray-50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(data.quote.subtotal)}</span>
              </div>
              {data.quote.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(data.quote.discount)}</span>
                </div>
              )}
              {data.quote.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax ({data.quote.taxRate}%)</span>
                  <span className="font-medium">{formatCurrency(data.quote.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-blue-600">{formatCurrency(data.quote.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {data.quote.notes && (
            <div className="p-6 border-b">
              <h2 className="font-semibold text-gray-900 mb-2">Notes</h2>
              <p className="text-gray-600">{data.quote.notes}</p>
            </div>
          )}

          {/* Response Section */}
          <div className="p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Your Response</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">
                Additional Comments (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any questions or concerns about this quote..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleSubmit('approve')}
                disabled={submitting}
                className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Processing...' : 'Approve Quote'}
              </button>
              <button
                onClick={() => handleSubmit('reject')}
                disabled={submitting}
                className="flex-1 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Processing...' : 'Decline Quote'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>{shopName}</p>
          {data.shopInfo.shop_phone && <p>{data.shopInfo.shop_phone}</p>}
          {data.shopInfo.shop_email && <p>{data.shopInfo.shop_email}</p>}
        </div>
      </div>
    </div>
  )
}
