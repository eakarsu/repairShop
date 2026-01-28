'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Customer { id: string; firstName: string; lastName: string; phone: string; email?: string }
interface Service { id: string; name: string; basePrice: number; category: string }

export default function NewQuotePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketId = searchParams.get('ticketId')

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    customerId: '',
    ticketId: ticketId || '',
    notes: '',
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ itemType: 'service', serviceId: '', description: '', quantity: 1, unitPrice: 0 }],
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
      setFilteredCustomers(allCustomers.slice(0, 10))
    }
  }, [customerSearch, allCustomers])

  const fetchInitialData = async () => {
    try {
      const [customersRes, servicesRes] = await Promise.all([
        fetch('/api/customers?limit=100'),
        fetch('/api/services'),
      ])
      const [customersData, servicesData] = await Promise.all([
        customersRes.json(),
        servicesRes.json(),
      ])

      if (customersData.success) {
        setAllCustomers(customersData.data.customers)
        setFilteredCustomers(customersData.data.customers.slice(0, 10))
      }
      if (servicesData.success) {
        setServices(servicesData.data.services)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customerId: customer.id })
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`)
    setShowCustomerDropdown(false)
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { itemType: 'service', serviceId: '', description: '', quantity: 1, unitPrice: 0 }],
    })
  }

  const handleRemoveItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index),
      })
    }
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const items = [...formData.items]
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value)
      items[index] = { ...items[index], serviceId: value as string, description: service?.name || '', unitPrice: service?.basePrice || 0 }
    } else {
      items[index] = { ...items[index], [field]: value }
    }
    setFormData({ ...formData, items })
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) router.push('/dashboard/quotes')
      else alert(data.error || 'Failed to create quote')
    } catch (error) {
      console.error('Failed to create quote:', error)
      alert('Failed to create quote')
    } finally {
      setLoading(false)
    }
  }

  const total = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

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
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Quote</h1>

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Customer</h2>

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
                  setFormData({ ...formData, customerId: '' })
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
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Or Search Customer
            </label>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onFocus={() => setShowCustomerDropdown(true)}
              placeholder="Search customer..."
              className="input-field"
            />
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-0"
                  >
                    <p className="font-medium">{c.firstName} {c.lastName}</p>
                    <p className="text-sm text-gray-500">{c.phone} - {c.email || 'No email'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
              <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
              <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
              <p className="text-sm text-gray-600">{selectedCustomer.email || 'No email'}</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Items</h2>
            <button type="button" onClick={handleAddItem} className="text-primary-600 text-sm hover:text-primary-700">+ Add Item</button>
          </div>
          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="block text-xs text-gray-500 mb-1">Service</label>
                  <select
                    value={item.serviceId}
                    onChange={(e) => handleItemChange(index, 'serviceId', e.target.value)}
                    className="select-field"
                  >
                    <option value="">Select service...</option>
                    {services.map((s) => (<option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.basePrice)}</option>))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    className="input-field"
                    placeholder="Description"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs text-gray-500 mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="input-field"
                    min="1"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Unit Price</label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="input-field"
                    step="0.01"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-between">
                  <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
                <div className="col-span-1">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t text-right">
            <span className="text-lg font-bold">Total: {formatCurrency(total)}</span>
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !formData.customerId} className="btn-primary">
            {loading ? 'Creating...' : 'Create Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}
