'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
}

interface Ticket {
  id: string
  ticketNumber: string
  issueDescription: string
  device: {
    deviceType: string
    brand: string | null
    model: string | null
  } | null
}

export default function NewWarrantyClaimPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [formData, setFormData] = useState({
    customerId: '',
    ticketId: '',
    productDescription: '',
    purchaseDate: '',
    warrantyEndDate: '',
    issueDescription: '',
    claimAmount: ''
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (formData.customerId) {
      fetchCustomerTickets(formData.customerId)
      const customer = customers.find(c => c.id === formData.customerId)
      setSelectedCustomer(customer || null)
    } else {
      setTickets([])
      setSelectedCustomer(null)
    }
  }, [formData.customerId, customers])

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=1000')
      const data = await res.json()
      if (data.success) {
        setCustomers(data.data.customers || [])
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const fetchCustomerTickets = async (customerId: string) => {
    try {
      const res = await fetch(`/api/tickets?customerId=${customerId}`)
      const data = await res.json()
      if (data.success) {
        setTickets(data.data.tickets || [])
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/warranty-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          claimAmount: formData.claimAmount ? parseFloat(formData.claimAmount) : null,
          ticketId: formData.ticketId || null
        })
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/dashboard/warranty-claims/${data.data.id}`)
      } else {
        setError(data.error || 'Failed to create warranty claim')
      }
    } catch (error) {
      setError('Failed to create warranty claim')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/warranty-claims"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Warranty Claim</h1>
          <p className="text-gray-600">Submit a new warranty claim</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                {selectedCustomer.email && (
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                )}
              </div>
            )}

            {tickets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Repair Ticket (optional)
                </label>
                <select
                  name="ticketId"
                  value={formData.ticketId}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No linked ticket</option>
                  {tickets.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.ticketNumber} - {ticket.device?.deviceType || 'N/A'} {ticket.device?.brand || ''} {ticket.device?.model || ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Product Information */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Product Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Description *
              </label>
              <input
                type="text"
                name="productDescription"
                value={formData.productDescription}
                onChange={handleChange}
                required
                placeholder="e.g., iPhone 14 Pro Max 256GB Space Black"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty End Date
                </label>
                <input
                  type="date"
                  name="warrantyEndDate"
                  value={formData.warrantyEndDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Claim Details */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Claim Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Description *
              </label>
              <textarea
                name="issueDescription"
                value={formData.issueDescription}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the issue with the product..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claim Amount ($)
              </label>
              <input
                type="number"
                name="claimAmount"
                value={formData.claimAmount}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/dashboard/warranty-claims"
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </div>
  )
}
