'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime, getStatusColor } from '@/lib/utils'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  createdAt: string
  devices: Device[]
  tickets: Ticket[]
  communications: Communication[]
}

interface Device {
  id: string
  deviceType: string
  brand: string | null
  model: string | null
  serialNumber: string | null
  color: string | null
  condition: string | null
}

interface Ticket {
  id: string
  ticketNumber: string
  status: string
  issueDescription: string
  createdAt: string
  device: { deviceType: string } | null
}

interface Communication {
  id: string
  type: string
  direction: string
  subject: string | null
  content: string
  createdAt: string
  user: { firstName: string; lastName: string }
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  })

  // Add device modal
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [deviceData, setDeviceData] = useState({
    deviceType: '',
    brand: '',
    model: '',
    serialNumber: '',
    color: '',
    condition: '',
    accessories: '',
    password: '',
    notes: '',
  })

  useEffect(() => {
    fetchCustomer()
  }, [params.id])

  const fetchCustomer = async () => {
    try {
      const res = await fetch(`/api/customers/${params.id}`)
      const data = await res.json()
      if (data.success) {
        setCustomer(data.data.customer)
        setFormData({
          firstName: data.data.customer.firstName,
          lastName: data.data.customer.lastName,
          email: data.data.customer.email || '',
          phone: data.data.customer.phone,
          address: data.data.customer.address || '',
          city: data.data.customer.city || '',
          state: data.data.customer.state || '',
          zipCode: data.data.customer.zipCode || '',
          notes: data.data.customer.notes || '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (data.success) {
        setCustomer({ ...customer!, ...formData })
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update customer:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddDevice = async () => {
    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: params.id,
          ...deviceData,
        }),
      })

      const data = await res.json()
      if (data.success) {
        fetchCustomer()
        setShowAddDevice(false)
        setDeviceData({
          deviceType: '',
          brand: '',
          model: '',
          serialNumber: '',
          color: '',
          condition: '',
          accessories: '',
          password: '',
          notes: '',
        })
      }
    } catch (error) {
      console.error('Failed to add device:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Customer not found</p>
        <Link href="/dashboard/customers" className="text-primary-600 mt-4 inline-block">
          Back to Customers
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-gray-600">Customer since {formatDate(customer.createdAt)}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/tickets/new?customerId=${customer.id}`} className="btn-secondary">
            New Ticket
          </Link>
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-primary">Edit</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {['overview', 'devices', 'tickets', 'communications'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{customer.email}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-field"
                    placeholder="City"
                  />
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-field"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className="input-field"
                    placeholder="ZIP"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  {customer.address && <p>{customer.address}</p>}
                  <p>
                    {[customer.city, customer.state, customer.zipCode].filter(Boolean).join(', ') || 'No address on file'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
            {editMode ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="input-field"
              />
            ) : (
              <p className="text-gray-600">{customer.notes || 'No notes'}</p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{customer.devices.length}</p>
                <p className="text-gray-500">Devices</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{customer.tickets.length}</p>
                <p className="text-gray-500">Tickets</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-primary-600">{customer.communications.length}</p>
                <p className="text-gray-500">Communications</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Devices</h3>
            <button onClick={() => setShowAddDevice(true)} className="btn-primary text-sm">
              Add Device
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customer.devices.map((device) => (
              <div key={device.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{device.deviceType}</p>
                    <p className="text-gray-600">
                      {[device.brand, device.model].filter(Boolean).join(' ') || 'Unknown'}
                    </p>
                    {device.serialNumber && (
                      <p className="text-sm text-gray-500">S/N: {device.serialNumber}</p>
                    )}
                    {device.color && (
                      <p className="text-sm text-gray-500">Color: {device.color}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {customer.devices.length === 0 && (
              <p className="text-gray-500 col-span-full text-center py-8">No devices on file</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-6">Repair History</h3>
          <div className="space-y-4">
            {customer.tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/tickets/${ticket.id}`}
                className="block p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-primary-600">{ticket.ticketNumber}</p>
                    <p className="text-gray-600">{ticket.issueDescription}</p>
                  </div>
                  <div className="text-right">
                    <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">{formatDate(ticket.createdAt)}</p>
                  </div>
                </div>
              </Link>
            ))}
            {customer.tickets.length === 0 && (
              <p className="text-gray-500 text-center py-8">No repair history</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-6">Communication Log</h3>
          <div className="space-y-4">
            {customer.communications.map((comm) => (
              <div key={comm.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="status-badge bg-blue-100 text-blue-800">{comm.type}</span>
                    <span className="text-sm text-gray-500">{comm.direction}</span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDateTime(comm.createdAt)}</span>
                </div>
                {comm.subject && <p className="font-medium mb-1">{comm.subject}</p>}
                <p className="text-gray-700">{comm.content}</p>
                <p className="text-sm text-gray-500 mt-2">By {comm.user.firstName} {comm.user.lastName}</p>
              </div>
            ))}
            {customer.communications.length === 0 && (
              <p className="text-gray-500 text-center py-8">No communications logged</p>
            )}
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Add Device</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device Type *</label>
                <select
                  value={deviceData.deviceType}
                  onChange={(e) => setDeviceData({ ...deviceData, deviceType: e.target.value })}
                  className="select-field"
                  required
                >
                  <option value="">Select type...</option>
                  <option value="Smartphone">Smartphone</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Smartwatch">Smartwatch</option>
                  <option value="Gaming Console">Gaming Console</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Bag">Bag</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={deviceData.brand}
                    onChange={(e) => setDeviceData({ ...deviceData, brand: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={deviceData.model}
                    onChange={(e) => setDeviceData({ ...deviceData, model: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input
                    type="text"
                    value={deviceData.serialNumber}
                    onChange={(e) => setDeviceData({ ...deviceData, serialNumber: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="text"
                    value={deviceData.color}
                    onChange={(e) => setDeviceData({ ...deviceData, color: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <input
                  type="text"
                  value={deviceData.condition}
                  onChange={(e) => setDeviceData({ ...deviceData, condition: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Good, Fair, Damaged"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddDevice(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleAddDevice} disabled={!deviceData.deviceType} className="btn-primary">Add Device</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
