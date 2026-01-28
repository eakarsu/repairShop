'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

interface Customer { id: string; firstName: string; lastName: string; phone: string }
interface Service { id: string; name: string; basePrice: number; category: string }
interface Part { id: string; sku: string; name: string; sellingPrice: number; quantity: number }
interface Ticket { id: string; ticketNumber: string; laborCost: number; partsCost: number; customer: Customer }

export default function POSPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketId = searchParams.get('ticketId')

  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomers, setShowCustomers] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [formData, setFormData] = useState({
    customerId: '',
    ticketId: ticketId || '',
    paymentMethod: 'CARD',
    discount: 0,
    notes: '',
    items: [] as { itemType: string; partId?: string; serviceId?: string; description: string; quantity: number; unitPrice: number }[],
  })

  useEffect(() => {
    fetchData()
    if (ticketId) fetchTicket(ticketId)
  }, [ticketId])

  useEffect(() => {
    // Filter customers based on search
    if (customerSearch.length >= 1) {
      const search = customerSearch.toLowerCase()
      const filtered = allCustomers.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        c.phone.includes(search)
      )
      setFilteredCustomers(filtered)
    } else {
      setFilteredCustomers(allCustomers.slice(0, 10))
    }
  }, [customerSearch, allCustomers])

  const fetchData = async () => {
    try {
      const [customersRes, servicesRes, partsRes] = await Promise.all([
        fetch('/api/customers?limit=100'),
        fetch('/api/services'),
        fetch('/api/parts?limit=100'),
      ])
      const [customersData, servicesData, partsData] = await Promise.all([
        customersRes.json(),
        servicesRes.json(),
        partsRes.json(),
      ])

      if (customersData.success) {
        setAllCustomers(customersData.data.customers)
        setFilteredCustomers(customersData.data.customers.slice(0, 10))
      }
      if (servicesData.success) setServices(servicesData.data.services)
      if (partsData.success) setParts(partsData.data.parts)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const fetchTicket = async (id: string) => {
    const res = await fetch(`/api/tickets/${id}`)
    const data = await res.json()
    if (data.success) {
      const t = data.data.ticket
      setTicket(t)
      setSelectedCustomer(t.customer)
      setFormData(prev => ({
        ...prev,
        customerId: t.customer.id,
        ticketId: t.id,
        items: [
          ...(t.laborCost ? [{ itemType: 'service', description: 'Labor', quantity: 1, unitPrice: t.laborCost }] : []),
          ...t.partsUsed.map((p: { part: { id: string; name: string }; quantity: number; unitPrice: number }) => ({
            itemType: 'part',
            partId: p.part.id,
            description: p.part.name,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
          })),
        ],
      }))
      setCustomerSearch(`${t.customer.firstName} ${t.customer.lastName}`)
    }
  }

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData({ ...formData, customerId: customer.id })
    setCustomerSearch(`${customer.firstName} ${customer.lastName}`)
    setShowCustomers(false)
  }

  const addItem = (type: string, item: Service | Part) => {
    const newItem = type === 'service'
      ? { itemType: 'service', serviceId: (item as Service).id, description: item.name, quantity: 1, unitPrice: (item as Service).basePrice }
      : { itemType: 'part', partId: (item as Part).id, description: item.name, quantity: 1, unitPrice: (item as Part).sellingPrice }
    setFormData({ ...formData, items: [...formData.items, newItem] })
  }

  const updateItem = (index: number, field: string, value: number) => {
    const items = [...formData.items]
    items[index] = { ...items[index], [field]: value }
    setFormData({ ...formData, items })
  }

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) })
  }

  const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxRate = 8.625
  const taxAmount = Math.round((subtotal - formData.discount) * (taxRate / 100) * 100) / 100
  const total = subtotal - formData.discount + taxAmount

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          customerId: formData.customerId || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        alert(`Sale completed! Invoice: ${data.data.sale.saleNumber}`)
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Checkout failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Point of Sale</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Products & Services */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div className="card">
            <h3 className="font-semibold mb-3">Customer (Optional)</h3>

            {/* Customer Dropdown */}
            <div className="mb-4">
              <select
                value={formData.customerId}
                onChange={(e) => {
                  const customer = allCustomers.find(c => c.id === e.target.value)
                  if (customer) {
                    selectCustomer(customer)
                  } else {
                    setSelectedCustomer(null)
                    setFormData({ ...formData, customerId: '' })
                    setCustomerSearch('')
                  }
                }}
                className="select-field"
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
              <label className="block text-sm text-gray-600 mb-1">Or Search</label>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                onFocus={() => setShowCustomers(true)}
                placeholder="Search customer..."
                className="input-field"
              />
              {showCustomers && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-sm text-gray-500">{c.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCustomer && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
              </div>
            )}
          </div>

          {/* Services */}
          <div className="card">
            <h3 className="font-semibold mb-3">Services</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {services.slice(0, 9).map((service) => (
                <button
                  key={service.id}
                  onClick={() => addItem('service', service)}
                  className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-primary-600">{formatCurrency(service.basePrice)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Parts/Accessories */}
          <div className="card">
            <h3 className="font-semibold mb-3">Parts & Accessories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {parts.filter(p => p.quantity > 0).slice(0, 12).map((part) => (
                <button
                  key={part.id}
                  onClick={() => addItem('part', part)}
                  className="p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm truncate">{part.name}</p>
                  <p className="text-primary-600">{formatCurrency(part.sellingPrice)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart & Checkout */}
        <div className="card h-fit sticky top-8">
          <h3 className="font-semibold mb-4">Cart</h3>

          {formData.items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No items added</p>
          ) : (
            <div className="space-y-3 mb-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 text-sm border rounded px-2 py-1"
                        min="1"
                      />
                      <span className="text-gray-500">x</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-20 text-sm border rounded px-2 py-1"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</p>
                    <button onClick={() => removeItem(index)} className="text-red-600 text-sm">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Discount</span>
              <input
                type="number"
                value={formData.discount}
                onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                className="w-24 text-right border rounded px-2 py-1"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex justify-between">
              <span>Tax ({taxRate}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="select-field"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="CHECK">Check</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading || formData.items.length === 0}
            className="w-full btn-primary mt-4 py-3"
          >
            {loading ? 'Processing...' : `Checkout ${formatCurrency(total)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
