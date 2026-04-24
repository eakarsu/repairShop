'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import DetailModal, { DetailRow } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface Part {
  id: string
  sku: string
  name: string
  description: string | null
  costPrice: number
  sellingPrice: number
  quantity: number
  minQuantity: number
  location: string | null
  category: { id: string; name: string }
  vendor: { id: string; name: string } | null
  autoOrderRule?: { id: string; isEnabled: boolean; reorderQuantity: number } | null
}

interface Category {
  id: string
  name: string
  _count: { parts: number }
}

interface Vendor {
  id: string
  name: string
}

export default function InventoryPage() {
  const { showToast } = useToast()
  const [parts, setParts] = useState<Part[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [selectedPart, setSelectedPart] = useState<Part | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    categoryId: '',
    vendorId: '',
    costPrice: '',
    sellingPrice: '',
    quantity: '',
    minQuantity: '5',
    location: '',
  })

  useEffect(() => {
    fetchData()
  }, [search, categoryFilter, showLowStock])

  const fetchData = async () => {
    try {
      const [partsRes, catRes, vendorRes] = await Promise.all([
        fetch(`/api/parts?search=${search}&categoryId=${categoryFilter}&lowStock=${showLowStock}&limit=50`),
        fetch('/api/categories'),
        fetch('/api/vendors'),
      ])

      const [partsData, catData, vendorData] = await Promise.all([
        partsRes.json(),
        catRes.json(),
        vendorRes.json(),
      ])

      if (partsData.success) setParts(partsData.data.parts)
      if (catData.success) setCategories(catData.data.categories)
      if (vendorData.success) setVendors(vendorData.data.vendors)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      showToast('Failed to load inventory data', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const url = editingPart ? `/api/parts/${editingPart.id}` : '/api/parts'
      const method = editingPart ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          costPrice: parseFloat(formData.costPrice),
          sellingPrice: parseFloat(formData.sellingPrice),
          quantity: parseInt(formData.quantity),
          minQuantity: parseInt(formData.minQuantity),
          vendorId: formData.vendorId || null,
        }),
      })

      if (res.ok) {
        showToast(editingPart ? 'Part updated successfully' : 'Part added successfully', 'success')
        fetchData()
        closeModal()
      } else {
        const data = await res.json()
        showToast(data.error || 'Failed to save part', 'error')
      }
    } catch (error) {
      console.error('Failed to save part:', error)
      showToast('Failed to save part', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (partId: string) => {
    try {
      const res = await fetch(`/api/parts/${partId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Part deleted successfully', 'success')
        fetchData()
        setSelectedPart(null)
      } else {
        showToast('Failed to delete part', 'error')
      }
    } catch (error) {
      console.error('Failed to delete part:', error)
      showToast('Failed to delete part', 'error')
    } finally {
      setSingleDeleteId(null)
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'inventory', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} part(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchData()
      } else {
        showToast(data.error || 'Failed to delete parts', 'error')
      }
    } catch {
      showToast('Failed to delete parts', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === parts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(parts.map(p => p.id)))
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=inventory${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=inventory${ids}`, '_blank')
  }

  const openModal = (part?: Part) => {
    if (part) {
      setEditingPart(part)
      setFormData({
        sku: part.sku,
        name: part.name,
        description: part.description || '',
        categoryId: part.category.id,
        vendorId: part.vendor?.id || '',
        costPrice: part.costPrice.toString(),
        sellingPrice: part.sellingPrice.toString(),
        quantity: part.quantity.toString(),
        minQuantity: part.minQuantity.toString(),
        location: part.location || '',
      })
    } else {
      setEditingPart(null)
      // Set default category if available
      setFormData({
        sku: '',
        name: '',
        description: '',
        categoryId: categories.length > 0 ? categories[0].id : '',
        vendorId: '',
        costPrice: '',
        sellingPrice: '',
        quantity: '0',
        minQuantity: '5',
        location: '',
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPart(null)
  }

  const handleRowClick = (part: Part) => {
    setSelectedPart(part)
  }

  const handleEditFromDetail = () => {
    if (selectedPart) {
      setSelectedPart(null)
      openModal(selectedPart)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600">Manage parts and accessories</p>
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
          <Link href="/dashboard/inventory/auto-orders" className="btn-secondary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Auto-Orders
          </Link>
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Part
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="select-field w-auto"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name} ({cat._count.parts})</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => setShowLowStock(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm">Low Stock Only</span>
          </label>
        </div>
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

      {/* Parts Table */}
      <div className="card">
        {loading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="table-header w-10">
                    <input type="checkbox" checked={selectedIds.size === parts.length && parts.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                  </th>
                  <th className="table-header">SKU</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Cost</th>
                  <th className="table-header">Price</th>
                  <th className="table-header">Stock</th>
                  <th className="table-header">Location</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {parts.map((part) => (
                  <tr
                    key={part.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(part)}
                  >
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(part.id)} onChange={() => toggleSelect(part.id)} className="w-4 h-4 rounded" />
                    </td>
                    <td className="table-cell font-mono text-sm">{part.sku}</td>
                    <td className="table-cell">
                      <p className="font-medium">{part.name}</p>
                      {part.vendor && <p className="text-sm text-gray-500">{part.vendor.name}</p>}
                    </td>
                    <td className="table-cell">{part.category.name}</td>
                    <td className="table-cell">{formatCurrency(part.costPrice)}</td>
                    <td className="table-cell">{formatCurrency(part.sellingPrice)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className={part.quantity <= part.minQuantity ? 'text-red-600 font-bold' : ''}>
                          {part.quantity}
                        </span>
                        {part.quantity <= part.minQuantity && (
                          <span className="text-xs text-red-600">Low</span>
                        )}
                        {part.autoOrderRule?.isEnabled && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Auto-Order Enabled">
                            Auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-gray-500">{part.location || '-'}</td>
                    <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openModal(part)} className="text-primary-600 hover:text-primary-700">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {parts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-500">No parts found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Part Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{editingPart ? 'Edit Part' : 'Add Part'}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                  <input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select value={formData.categoryId} onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })} className="select-field" required>
                    <option value="">Select category...</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select value={formData.vendorId} onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })} className="select-field">
                    <option value="">None</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
                  <input type="number" step="0.01" value={formData.costPrice} onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                  <input type="number" step="0.01" value={formData.sellingPrice} onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Qty</label>
                  <input type="number" value={formData.minQuantity} onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeModal} className="btn-secondary" disabled={saving}>Cancel</button>
              <button
                onClick={handleSave}
                className="btn-primary"
                disabled={saving || !formData.sku || !formData.name || !formData.categoryId || !formData.costPrice || !formData.sellingPrice}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Part Detail Modal */}
      <DetailModal
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        title="Part Details"
        size="lg"
      >
        {selectedPart && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-gray-900">{selectedPart.name}</h4>
              <p className="text-gray-500 font-mono">SKU: {selectedPart.sku}</p>
            </div>

            {selectedPart.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-2">Description</h5>
                <p className="text-gray-600">{selectedPart.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-gray-700 mb-3">Pricing</h5>
                <DetailRow label="Cost Price" value={formatCurrency(selectedPart.costPrice)} />
                <DetailRow label="Selling Price" value={formatCurrency(selectedPart.sellingPrice)} highlight />
                <DetailRow label="Margin" value={formatCurrency(selectedPart.sellingPrice - selectedPart.costPrice)} />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-gray-700 mb-3">Stock</h5>
                <DetailRow
                  label="Current Qty"
                  value={
                    <span className={selectedPart.quantity <= selectedPart.minQuantity ? 'text-red-600 font-bold' : ''}>
                      {selectedPart.quantity}
                    </span>
                  }
                />
                <DetailRow label="Min Required" value={selectedPart.minQuantity} />
                {selectedPart.location && <DetailRow label="Location" value={selectedPart.location} />}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="font-semibold text-gray-700 mb-3">Details</h5>
              <DetailRow label="Category" value={selectedPart.category.name} />
              <DetailRow label="Vendor" value={selectedPart.vendor?.name || 'Not assigned'} />
            </div>

            {selectedPart.autoOrderRule && (
              <div className={`p-4 rounded-lg ${selectedPart.autoOrderRule.isEnabled ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${selectedPart.autoOrderRule.isEnabled ? 'text-green-800' : 'text-gray-700'}`}>
                      Auto-Order {selectedPart.autoOrderRule.isEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Reorder quantity: {selectedPart.autoOrderRule.reorderQuantity} units
                    </p>
                  </div>
                  <Link href="/dashboard/inventory/auto-orders" className="text-primary-600 text-sm hover:underline">
                    Manage
                  </Link>
                </div>
              </div>
            )}

            {selectedPart.quantity <= selectedPart.minQuantity && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-800 font-medium">Low Stock Warning</p>
                <p className="text-sm text-red-600">This part is below the minimum stock level. Consider creating a purchase order.</p>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                onClick={() => setSingleDeleteId(selectedPart.id)}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Delete Part
              </button>
              <div className="flex gap-3">
                <button onClick={() => setSelectedPart(null)} className="btn-secondary">
                  Close
                </button>
                <button onClick={handleEditFromDetail} className="btn-primary">
                  Edit Part
                </button>
              </div>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Parts"
        message={`Are you sure you want to delete ${selectedIds.size} part(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!singleDeleteId}
        onConfirm={() => { if (singleDeleteId) handleDelete(singleDeleteId) }}
        onCancel={() => setSingleDeleteId(null)}
        title="Delete Part"
        message="Are you sure you want to delete this part? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
