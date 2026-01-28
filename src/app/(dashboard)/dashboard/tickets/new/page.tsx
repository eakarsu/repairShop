'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  devices: Device[]
}

interface Device {
  id: string
  deviceType: string
  brand: string | null
  model: string | null
  serialNumber: string | null
}

interface User {
  id: string
  firstName: string
  lastName: string
  role: string
}

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [technicians, setTechnicians] = useState<User[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)

  const [formData, setFormData] = useState({
    customerId: '',
    deviceId: '',
    issueDescription: '',
    priority: 'NORMAL',
    technicianId: '',
    estimatedCompletion: '',
    warrantyStatus: 'NONE',
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    // Filter customers based on search
    if (customerSearch.length >= 1) {
      const search = customerSearch.toLowerCase()
      const filtered = allCustomers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search))
      )
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(allCustomers.slice(0, 10)) // Show first 10 by default
    }
  }, [customerSearch, allCustomers])

  const fetchInitialData = async () => {
    try {
      const [customersRes, usersRes] = await Promise.all([
        fetch('/api/customers?limit=100'),
        fetch('/api/users'),
      ])
      const [customersData, usersData] = await Promise.all([
        customersRes.json(),
        usersRes.json(),
      ])

      if (customersData.success) {
        setAllCustomers(customersData.data.customers)
        setFilteredCustomers(customersData.data.customers.slice(0, 10))
      }
      if (usersData.success) {
        setTechnicians(usersData.data.users.filter((u: User) => u.role === 'TECHNICIAN'))
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customerId: customer.id, deviceId: '' })
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`)
    setShowCustomerDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          deviceId: formData.deviceId || null,
          technicianId: formData.technicianId || null,
          estimatedCompletion: formData.estimatedCompletion || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/dashboard/tickets/${data.data.ticket.id}`)
      } else {
        alert(data.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Failed to create ticket:', error)
      alert('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
        <p className="text-gray-600">Create a new repair ticket for a customer</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>

          {/* Customer Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Customer *
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => {
                const customer = allCustomers.find(c => c.id === e.target.value)
                if (customer) {
                  selectCustomer(customer)
                } else {
                  setSelectedCustomer(null)
                  setFormData({ ...formData, customerId: '', deviceId: '' })
                }
              }}
              className="select-field"
              required
            >
              <option value="">-- Select a customer --</option>
              {allCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.firstName} {customer.lastName} - {customer.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Or search */}
          <div className="relative mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Search Customer
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Search by name, phone, or email..."
              className="input-field"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => selectCustomer(customer)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                    <p className="text-sm text-gray-500">{customer.phone} - {customer.email || 'No email'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
              <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
              <p className="text-sm text-gray-600">{selectedCustomer.email || 'No email'}</p>
            </div>
          )}

          {!selectedCustomer && (
            <p className="text-sm text-gray-500">
              Don&apos;t see the customer?{' '}
              <button
                type="button"
                onClick={() => router.push('/dashboard/customers/new')}
                className="text-primary-600 hover:text-primary-700"
              >
                Create new customer
              </button>
            </p>
          )}
        </div>

        {/* Device Selection */}
        {selectedCustomer && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Information</h2>

            {selectedCustomer.devices.length > 0 ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Device
                </label>
                <select
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  className="select-field"
                >
                  <option value="">-- Select a device --</option>
                  {selectedCustomer.devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.deviceType} - {[device.brand, device.model].filter(Boolean).join(' ')}
                      {device.serialNumber && ` (${device.serialNumber})`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No devices on file for this customer.
              </p>
            )}
          </div>
        )}

        {/* Ticket Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ticket Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Description *
              </label>
              <textarea
                value={formData.issueDescription}
                onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                rows={4}
                className="input-field"
                placeholder="Describe the issue..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="select-field"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Technician
                </label>
                <select
                  value={formData.technicianId}
                  onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  className="select-field"
                >
                  <option value="">-- Unassigned --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Completion
                </label>
                <input
                  type="date"
                  value={formData.estimatedCompletion}
                  onChange={(e) => setFormData({ ...formData, estimatedCompletion: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty Status
                </label>
                <select
                  value={formData.warrantyStatus}
                  onChange={(e) => setFormData({ ...formData, warrantyStatus: e.target.value })}
                  className="select-field"
                >
                  <option value="NONE">None</option>
                  <option value="VALID">Valid</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="VOID">Void</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.customerId || !formData.issueDescription}
            className="btn-primary"
          >
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}
