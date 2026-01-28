'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDateTime, getStatusColor, getPriorityColor } from '@/lib/utils'
import PhotoUpload from '@/components/PhotoUpload'
import PhotoGallery from '@/components/PhotoGallery'
import AiDiagnosticChat from '@/components/AiDiagnosticChat'
import TimelineProgress from '@/components/TimelineProgress'

interface Ticket {
  id: string
  ticketNumber: string
  status: string
  priority: string
  issueDescription: string
  diagnosticNotes: string | null
  repairNotes: string | null
  estimatedCost: number | null
  actualCost: number | null
  laborCost: number | null
  partsCost: number | null
  intakeDate: string
  estimatedCompletion: string | null
  completedDate: string | null
  warrantyStatus: string
  customer: { id: string; firstName: string; lastName: string; phone: string; email: string }
  device: { id: string; deviceType: string; brand: string | null; model: string | null; serialNumber: string | null } | null
  technician: { id: string; firstName: string; lastName: string } | null
  createdBy: { firstName: string; lastName: string }
  partsUsed: { id: string; quantity: number; unitPrice: number; part: { id: string; name: string; sku: string } }[]
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; notes: string | null; createdAt: string }[]
  communications: { id: string; type: string; direction: string; subject: string | null; content: string; createdAt: string; user: { firstName: string; lastName: string } }[]
  quotes: { id: string; quoteNumber: string; status: string; total: number }[]
}

interface Part {
  id: string
  sku: string
  name: string
  sellingPrice: number
  quantity: number
}

interface User {
  id: string
  firstName: string
  lastName: string
  role?: string
}

const statusOptions = [
  'RECEIVED', 'DIAGNOSING', 'WAITING_APPROVAL', 'WAITING_PARTS',
  'IN_REPAIR', 'QUALITY_CHECK', 'READY_PICKUP', 'COMPLETED', 'CANCELLED'
]

interface Photo {
  id: string
  filename: string
  path: string
  description: string | null
  aiAnalysis: any
  uploadedAt: string
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [technicians, setTechnicians] = useState<User[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [activeTab, setActiveTab] = useState('details')

  // Edit form state
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    status: '',
    priority: '',
    diagnosticNotes: '',
    repairNotes: '',
    laborCost: '',
    technicianId: '',
    statusNote: '',
  })

  // Add part modal
  const [showAddPart, setShowAddPart] = useState(false)
  const [partSearch, setPartSearch] = useState('')
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [partQuantity, setPartQuantity] = useState(1)

  // Communication modal
  const [showAddComm, setShowAddComm] = useState(false)
  const [commData, setCommData] = useState({
    type: 'NOTE',
    direction: 'OUTBOUND',
    subject: '',
    content: '',
  })

  useEffect(() => {
    fetchTicket()
    fetchTechnicians()
    fetchParts()
    fetchPhotos()
  }, [params.id])

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}`)
      const data = await res.json()
      if (data.success) {
        setTicket(data.data.ticket)
        setFormData({
          status: data.data.ticket.status,
          priority: data.data.ticket.priority,
          diagnosticNotes: data.data.ticket.diagnosticNotes || '',
          repairNotes: data.data.ticket.repairNotes || '',
          laborCost: data.data.ticket.laborCost?.toString() || '',
          technicianId: data.data.ticket.technician?.id || '',
          statusNote: '',
        })
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPhotos = async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}/photos`)
      const data = await res.json()
      if (data.success) {
        setPhotos(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch photos:', error)
    }
  }

  const fetchTechnicians = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    if (data.success) {
      setTechnicians(data.data.users.filter((u: User) => u.role === 'TECHNICIAN'))
    }
  }

  const fetchParts = async () => {
    const res = await fetch('/api/parts?limit=100')
    const data = await res.json()
    if (data.success) {
      setParts(data.data.parts)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          laborCost: formData.laborCost ? parseFloat(formData.laborCost) : null,
          technicianId: formData.technicianId || null,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setTicket(data.data.ticket)
        setEditMode(false)
      }
    } catch (error) {
      console.error('Failed to update ticket:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddPart = async () => {
    if (!selectedPart) return

    try {
      const res = await fetch(`/api/tickets/${params.id}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partId: selectedPart.id,
          quantity: partQuantity,
          unitPrice: selectedPart.sellingPrice,
        }),
      })

      const data = await res.json()
      if (data.success) {
        fetchTicket()
        setShowAddPart(false)
        setSelectedPart(null)
        setPartQuantity(1)
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Failed to add part:', error)
    }
  }

  const handleRemovePart = async (ticketPartId: string) => {
    if (!confirm('Remove this part?')) return

    try {
      const res = await fetch(`/api/tickets/${params.id}/parts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketPartId }),
      })

      if (res.ok) {
        fetchTicket()
      }
    } catch (error) {
      console.error('Failed to remove part:', error)
    }
  }

  const handleAddCommunication = async () => {
    if (!ticket) return

    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: ticket.customer.id,
          ticketId: ticket.id,
          ...commData,
        }),
      })

      const data = await res.json()
      if (data.success) {
        fetchTicket()
        setShowAddComm(false)
        setCommData({ type: 'NOTE', direction: 'OUTBOUND', subject: '', content: '' })
      }
    } catch (error) {
      console.error('Failed to add communication:', error)
    }
  }

  const handleGenerateStatusMessage = async () => {
    try {
      const res = await fetch('/api/ai/status-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: params.id }),
      })

      const data = await res.json()
      if (data.success) {
        setCommData({
          type: 'SMS',
          direction: 'OUTBOUND',
          subject: 'Status Update',
          content: data.data.sms,
        })
        setShowAddComm(true)
      }
    } catch (error) {
      console.error('Failed to generate message:', error)
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

  if (!ticket) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Ticket not found</p>
        <Link href="/dashboard/tickets" className="text-primary-600 mt-4 inline-block">
          Back to Tickets
        </Link>
      </div>
    )
  }

  const filteredParts = parts.filter(p =>
    p.name.toLowerCase().includes(partSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(partSearch.toLowerCase())
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{ticket.ticketNumber}</h1>
            <span className={`status-badge ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ')}
            </span>
            <span className={`status-badge ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            Created {formatDateTime(ticket.intakeDate)} by {ticket.createdBy.firstName} {ticket.createdBy.lastName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerateStatusMessage} className="btn-secondary">
            AI Status Message
          </button>
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-primary">Edit Ticket</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {['details', 'photos', 'ai-diagnostic', 'timeline', 'parts', 'communications', 'history'].map((tab) => (
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

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer & Device */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Customer & Device</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <Link href={`/dashboard/customers/${ticket.customer.id}`} className="text-primary-600 font-medium hover:text-primary-700">
                    {ticket.customer.firstName} {ticket.customer.lastName}
                  </Link>
                  <p className="text-sm text-gray-600">{ticket.customer.phone}</p>
                </div>
                {ticket.device && (
                  <div>
                    <p className="text-sm text-gray-500">Device</p>
                    <p className="font-medium">{ticket.device.deviceType}</p>
                    <p className="text-sm text-gray-600">
                      {[ticket.device.brand, ticket.device.model].filter(Boolean).join(' ')}
                    </p>
                    {ticket.device.serialNumber && (
                      <p className="text-sm text-gray-500">S/N: {ticket.device.serialNumber}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Issue & Notes */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Issue Description</h3>
              <p className="text-gray-700">{ticket.issueDescription}</p>

              {editMode ? (
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnostic Notes</label>
                    <textarea
                      value={formData.diagnosticNotes}
                      onChange={(e) => setFormData({ ...formData, diagnosticNotes: e.target.value })}
                      rows={3}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repair Notes</label>
                    <textarea
                      value={formData.repairNotes}
                      onChange={(e) => setFormData({ ...formData, repairNotes: e.target.value })}
                      rows={3}
                      className="input-field"
                    />
                  </div>
                </div>
              ) : (
                <>
                  {ticket.diagnosticNotes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-1">Diagnostic Notes</p>
                      <p className="text-gray-700">{ticket.diagnosticNotes}</p>
                    </div>
                  )}
                  {ticket.repairNotes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-1">Repair Notes</p>
                      <p className="text-gray-700">{ticket.repairNotes}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Assignment */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Status & Assignment</h3>
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="select-field"
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>{s.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status Note</label>
                    <input
                      type="text"
                      value={formData.statusNote}
                      onChange={(e) => setFormData({ ...formData, statusNote: e.target.value })}
                      className="input-field"
                      placeholder="Optional note for status change"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technician</label>
                    <select
                      value={formData.technicianId}
                      onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                      className="select-field"
                    >
                      <option value="">Unassigned</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Technician</span>
                    <span className="font-medium">
                      {ticket.technician ? `${ticket.technician.firstName} ${ticket.technician.lastName}` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Warranty</span>
                    <span className="font-medium">{ticket.warrantyStatus}</span>
                  </div>
                  {ticket.estimatedCompletion && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Est. Completion</span>
                      <span className="font-medium">{formatDateTime(ticket.estimatedCompletion)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Costs */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Costs</h3>
              {editMode ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost</label>
                  <input
                    type="number"
                    value={formData.laborCost}
                    onChange={(e) => setFormData({ ...formData, laborCost: e.target.value })}
                    className="input-field"
                    step="0.01"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Labor</span>
                    <span className="font-medium">{formatCurrency(ticket.laborCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Parts</span>
                    <span className="font-medium">{formatCurrency(ticket.partsCost || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      {formatCurrency((ticket.laborCost || 0) + (ticket.partsCost || 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href={`/dashboard/quotes/new?ticketId=${ticket.id}`} className="w-full btn-secondary flex items-center justify-center gap-2">
                  Create Quote
                </Link>
                <Link href={`/dashboard/pos?ticketId=${ticket.id}`} className="w-full btn-primary flex items-center justify-center gap-2">
                  Checkout
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Photos</h3>
            <PhotoUpload
              ticketId={ticket.id}
              onUploadComplete={() => fetchPhotos()}
            />
          </div>

          {photos.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Photo Gallery ({photos.length})</h3>
              <PhotoGallery
                photos={photos}
                ticketId={ticket.id}
                onPhotoDeleted={() => fetchPhotos()}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai-diagnostic' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">AI Diagnostic Assistant</h3>
          <p className="text-gray-600 mb-4">
            Chat with our AI assistant to help diagnose issues. Describe symptoms and get intelligent suggestions.
          </p>
          <AiDiagnosticChat
            ticketId={ticket.id}
            deviceInfo={ticket.device ? {
              type: ticket.device.deviceType,
              brand: ticket.device.brand || undefined,
              model: ticket.device.model || undefined
            } : undefined}
            issueDescription={ticket.issueDescription}
          />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Repair Timeline</h3>
          <TimelineProgress
            ticketId={ticket.id}
            currentStatus={ticket.status}
            estimatedCompletion={ticket.estimatedCompletion || undefined}
          />
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Parts Used</h3>
            <button onClick={() => setShowAddPart(true)} className="btn-primary text-sm">
              Add Part
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="table-header">SKU</th>
                <th className="table-header">Part Name</th>
                <th className="table-header">Quantity</th>
                <th className="table-header">Unit Price</th>
                <th className="table-header">Total</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ticket.partsUsed.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">{item.part.sku}</td>
                  <td className="table-cell">{item.part.name}</td>
                  <td className="table-cell">{item.quantity}</td>
                  <td className="table-cell">{formatCurrency(item.unitPrice)}</td>
                  <td className="table-cell">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  <td className="table-cell">
                    <button onClick={() => handleRemovePart(item.id)} className="text-red-600 hover:text-red-700">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {ticket.partsUsed.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No parts added yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'communications' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Communication Log</h3>
            <button onClick={() => setShowAddComm(true)} className="btn-primary text-sm">
              Add Entry
            </button>
          </div>

          <div className="space-y-4">
            {ticket.communications.map((comm) => (
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
            {ticket.communications.length === 0 && (
              <p className="text-center text-gray-500 py-8">No communications logged</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-6">Status History</h3>
          <div className="space-y-4">
            {ticket.statusHistory.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
                  {index < ticket.statusHistory.length - 1 && (
                    <div className="w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {entry.fromStatus ? `${entry.fromStatus.replace('_', ' ')} → ` : ''}
                    {entry.toStatus.replace('_', ' ')}
                  </p>
                  {entry.notes && <p className="text-sm text-gray-600">{entry.notes}</p>}
                  <p className="text-sm text-gray-500">{formatDateTime(entry.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddPart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Part</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
                placeholder="Search parts..."
                className="input-field"
              />
              {partSearch && (
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  {filteredParts.slice(0, 5).map((part) => (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => setSelectedPart(part)}
                      className={`w-full p-3 text-left hover:bg-gray-50 ${selectedPart?.id === part.id ? 'bg-primary-50' : ''}`}
                    >
                      <p className="font-medium">{part.name}</p>
                      <p className="text-sm text-gray-500">{part.sku} - {formatCurrency(part.sellingPrice)} ({part.quantity} in stock)</p>
                    </button>
                  ))}
                </div>
              )}
              {selectedPart && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={partQuantity}
                    onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                    min="1"
                    max={selectedPart.quantity}
                    className="input-field"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddPart(false); setSelectedPart(null); setPartSearch(''); }} className="btn-secondary">Cancel</button>
              <button onClick={handleAddPart} disabled={!selectedPart} className="btn-primary">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Communication Modal */}
      {showAddComm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Communication</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={commData.type} onChange={(e) => setCommData({ ...commData, type: e.target.value })} className="select-field">
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS</option>
                    <option value="PHONE">Phone</option>
                    <option value="IN_PERSON">In Person</option>
                    <option value="NOTE">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select value={commData.direction} onChange={(e) => setCommData({ ...commData, direction: e.target.value })} className="select-field">
                    <option value="INBOUND">Inbound</option>
                    <option value="OUTBOUND">Outbound</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" value={commData.subject} onChange={(e) => setCommData({ ...commData, subject: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea value={commData.content} onChange={(e) => setCommData({ ...commData, content: e.target.value })} rows={4} className="input-field" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowAddComm(false); setCommData({ type: 'NOTE', direction: 'OUTBOUND', subject: '', content: '' }); }} className="btn-secondary">Cancel</button>
              <button onClick={handleAddCommunication} disabled={!commData.content} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
