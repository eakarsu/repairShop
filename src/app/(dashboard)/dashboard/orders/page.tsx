'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  orderDate: string
  expectedDate: string | null
  notes?: string | null
  vendor: { id: string; name: string }
  items: { id: string; quantity: number; unitPrice: number; part: { id: string; name: string; sku: string } }[]
}

interface Vendor {
  id: string
  name: string
}

interface Part {
  id: string
  sku: string
  name: string
  costPrice: number
}

const statusOptions = ['PENDING', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED']

export default function OrdersPage() {
  const { showToast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [parts, setParts] = useState<Part[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    vendorId: '',
    expectedDate: '',
    notes: '',
    items: [{ partId: '', quantity: 1, unitPrice: 0 }],
  })

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      const [ordersRes, vendorsRes, partsRes] = await Promise.all([
        fetch(`/api/orders?status=${statusFilter}`),
        fetch('/api/vendors'),
        fetch('/api/parts?limit=100'),
      ])

      const [ordersData, vendorsData, partsData] = await Promise.all([
        ordersRes.json(),
        vendorsRes.json(),
        partsRes.json(),
      ])

      if (ordersData.success) setOrders(ordersData.data.orders)
      if (vendorsData.success) setVendors(vendorsData.data.vendors)
      if (partsData.success) setParts(partsData.data.parts)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      showToast('Failed to load orders', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { partId: '', quantity: 1, unitPrice: 0 }],
    })
  }

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    })
  }

  const handleItemChange = (index: number, field: string, value: string | number) => {
    const items = [...formData.items]
    if (field === 'partId') {
      const part = parts.find(p => p.id === value)
      items[index] = { ...items[index], partId: value as string, unitPrice: part?.costPrice || 0 }
    } else {
      items[index] = { ...items[index], [field]: value }
    }
    setFormData({ ...formData, items })
  }

  const handleCreateOrder = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        showToast('Order created successfully', 'success')
        fetchData()
        closeModal()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to create order', 'error')
      }
    } catch (error) {
      console.error('Failed to create order:', error)
      showToast('Failed to create order', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        showToast('Status updated successfully', 'success')
        fetchData()
        if (selectedOrder?.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status })
        }
      } else {
        showToast('Failed to update status', 'error')
      }
    } catch (error) {
      console.error('Failed to update order:', error)
      showToast('Failed to update status', 'error')
    }
  }

  const openModal = () => {
    setFormData({
      vendorId: vendors.length > 0 ? vendors[0].id : '',
      expectedDate: '',
      notes: '',
      items: [{ partId: parts.length > 0 ? parts[0].id : '', quantity: 1, unitPrice: parts.length > 0 ? parts[0].costPrice : 0 }],
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ vendorId: '', expectedDate: '', notes: '', items: [{ partId: '', quantity: 1, unitPrice: 0 }] })
  }

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(orders.map(o => o.id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'orders', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} order(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchData()
      } else {
        showToast(data.error || 'Failed to delete orders', 'error')
      }
    } catch {
      showToast('Failed to delete orders', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=orders${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=orders${ids}`, '_blank')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage parts orders from vendors</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="btn-secondary text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            CSV
          </button>
          <button onClick={handleExportPDF} className="btn-secondary text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>
          <button onClick={openModal} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Order
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="card mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select-field w-auto">
          <option value="">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-primary-800">{selectedIds.size} item(s) selected</span>
          <div className="flex gap-2">
            <button onClick={handleExportCSV} className="text-sm text-primary-700 hover:text-primary-900 font-medium">Export CSV</button>
            <button onClick={handleExportPDF} className="text-sm text-primary-700 hover:text-primary-900 font-medium">Export PDF</button>
            <button onClick={() => setDeleteConfirm(true)} className="text-sm text-red-600 hover:text-red-800 font-medium">Delete Selected</button>
            <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-600 hover:text-gray-800">Clear</button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="card">
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header w-10">
                    <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                  </th>
                  <th className="table-header">Order #</th>
                  <th className="table-header">Vendor</th>
                  <th className="table-header">Items</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Order Date</th>
                  <th className="table-header">Expected</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(order)}
                  >
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="w-4 h-4 rounded" />
                    </td>
                    <td className="table-cell font-medium text-primary-600">{order.orderNumber}</td>
                    <td className="table-cell">{order.vendor.name}</td>
                    <td className="table-cell">{order.items.length} items</td>
                    <td className="table-cell">{formatCurrency(order.totalAmount)}</td>
                    <td className="table-cell">
                      <span className={`status-badge ${getStatusColor(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="table-cell">{formatDate(order.orderDate)}</td>
                    <td className="table-cell">{order.expectedDate ? formatDate(order.expectedDate) : '-'}</td>
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan={9} className="py-12 text-center text-gray-500">No orders found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">New Purchase Order</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                  <select value={formData.vendorId} onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })} className="select-field" required>
                    <option value="">Select vendor...</option>
                    {vendors.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                  <input type="date" value={formData.expectedDate} onChange={(e) => setFormData({ ...formData, expectedDate: e.target.value })} className="input-field" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={2} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Order Items *</label>
                  <button type="button" onClick={handleAddItem} className="text-primary-600 text-sm hover:text-primary-700">+ Add Item</button>
                </div>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select value={item.partId} onChange={(e) => handleItemChange(index, 'partId', e.target.value)} className="select-field flex-1">
                      <option value="">Select part...</option>
                      {parts.map((p) => (<option key={p.id} value={p.id}>{p.sku} - {p.name}</option>))}
                    </select>
                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} className="input-field w-20" min="1" placeholder="Qty" />
                    <input type="number" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="input-field w-24" step="0.01" placeholder="Price" />
                    {formData.items.length > 1 && (
                      <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-700 px-2">Remove</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-right font-semibold text-lg">
                Total: {formatCurrency(formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="btn-secondary" disabled={saving}>Cancel</button>
              <button
                onClick={handleCreateOrder}
                disabled={saving || !formData.vendorId || !formData.items[0].partId}
                className="btn-primary"
              >
                {saving ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog for Bulk Delete */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Orders"
        message={`Are you sure you want to delete ${selectedIds.size} order(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Order Detail Modal */}
      <DetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{selectedOrder.orderNumber}</h4>
                <p className="text-gray-500">Order Date: {formatDate(selectedOrder.orderDate)}</p>
              </div>
              <StatusBadge status={selectedOrder.status} colorClass={getStatusColor(selectedOrder.status)} />
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="font-semibold text-gray-700 mb-3">Order Information</h5>
              <DetailRow label="Vendor" value={selectedOrder.vendor.name} />
              <DetailRow label="Expected Date" value={selectedOrder.expectedDate ? formatDate(selectedOrder.expectedDate) : 'Not set'} />
              <DetailRow label="Total Amount" value={formatCurrency(selectedOrder.totalAmount)} highlight />
            </div>

            {selectedOrder.notes && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-2">Notes</h5>
                <p className="text-gray-600">{selectedOrder.notes}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Order Items ({selectedOrder.items.length})</h5>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium">{item.part.name}</p>
                      <p className="text-sm text-gray-500">SKU: {item.part.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                      <p className="text-sm text-gray-500">{formatCurrency(item.quantity * item.unitPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Status Update */}
            <div className="bg-primary-50 rounded-lg p-4">
              <h5 className="font-semibold text-gray-700 mb-3">Update Status</h5>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedOrder.status === status
                        ? getStatusColor(status)
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedOrder(null)} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
