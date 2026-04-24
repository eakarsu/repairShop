'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import DetailModal, { DetailRow } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { TableSkeleton } from '@/components/Skeleton'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  address?: string | null
  city: string | null
  state?: string | null
  zipCode?: string | null
  notes?: string | null
  createdAt: string
  devices: { id: string; deviceType: string; brand?: string; model?: string }[]
  _count: { tickets: number }
}

export default function CustomersPage() {
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [search, page])

  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      params.append('page', page.toString())
      params.append('limit', '10')

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()

      if (data.success) {
        setCustomers(data.data.customers)
        setTotalPages(data.data.pagination.pages)
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error)
      showToast('Failed to load customers', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSingleDeleteId(id)
  }

  const confirmSingleDelete = async () => {
    if (!singleDeleteId) return
    try {
      const res = await fetch(`/api/customers/${singleDeleteId}`, { method: 'DELETE' })
      if (res.ok) {
        showToast('Customer deleted successfully', 'success')
        fetchCustomers()
        if (selectedCustomer?.id === singleDeleteId) {
          setSelectedCustomer(null)
        }
      } else {
        showToast('Failed to delete customer', 'error')
      }
    } catch (error) {
      console.error('Failed to delete customer:', error)
      showToast('Failed to delete customer', 'error')
    } finally {
      setSingleDeleteId(null)
    }
  }

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(customers.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    try {
      const res = await fetch('/api/bulk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'customers', ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`${data.data.deleted} customer(s) deleted`, 'success')
        setSelectedIds(new Set())
        fetchCustomers()
      } else {
        showToast(data.error || 'Failed to delete customers', 'error')
      }
    } catch {
      showToast('Failed to delete customers', 'error')
    } finally {
      setDeleteConfirm(false)
    }
  }

  const handleExportCSV = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/csv?type=customers${ids}`, '_blank')
  }

  const handleExportPDF = () => {
    const ids = selectedIds.size > 0 ? `&ids=${Array.from(selectedIds).join(',')}` : ''
    window.open(`/api/export/pdf?type=customers${ids}`, '_blank')
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
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
          <Link href="/dashboard/customers/new" className="btn-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
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

      {/* Customers Table */}
      <div className="card">
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="table-header w-10">
                      <input type="checkbox" checked={selectedIds.size === customers.length && customers.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
                    </th>
                    <th className="table-header">Name</th>
                    <th className="table-header">Contact</th>
                    <th className="table-header">Location</th>
                    <th className="table-header">Devices</th>
                    <th className="table-header">Tickets</th>
                    <th className="table-header">Since</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(customer)}
                    >
                      <td className="table-cell" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(customer.id)} onChange={() => toggleSelect(customer.id)} className="w-4 h-4 rounded" />
                      </td>
                      <td className="table-cell">
                        <span className="text-primary-600 font-medium">
                          {customer.firstName} {customer.lastName}
                        </span>
                      </td>
                      <td className="table-cell">
                        <p>{customer.phone}</p>
                        {customer.email && <p className="text-gray-500 text-sm">{customer.email}</p>}
                      </td>
                      <td className="table-cell text-gray-600">
                        {customer.city || '-'}
                      </td>
                      <td className="table-cell">
                        {customer.devices.length}
                      </td>
                      <td className="table-cell">
                        {customer._count.tickets}
                      </td>
                      <td className="table-cell text-gray-500">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="table-cell" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/customers/${customer.id}`} className="text-primary-600 hover:text-primary-700">
                            View
                          </Link>
                          <button onClick={(e) => handleDelete(customer.id, e)} className="text-red-600 hover:text-red-700">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm}
        onConfirm={handleBulkDelete}
        onCancel={() => setDeleteConfirm(false)}
        title="Delete Customers"
        message={`Are you sure you want to delete ${selectedIds.size} customer(s)? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!singleDeleteId}
        onConfirm={confirmSingleDelete}
        onCancel={() => setSingleDeleteId(null)}
        title="Delete Customer"
        message="Are you sure you want to delete this customer? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />

      {/* Customer Detail Modal */}
      <DetailModal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Customer Details"
        size="lg"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-600">
                  {selectedCustomer.firstName.charAt(0)}{selectedCustomer.lastName.charAt(0)}
                </span>
              </div>
              <h4 className="text-xl font-bold text-gray-900">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </h4>
              <p className="text-gray-500">Customer since {formatDate(selectedCustomer.createdAt)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h5 className="font-semibold text-gray-700 mb-3">Contact Information</h5>
              <DetailRow label="Phone" value={selectedCustomer.phone} />
              {selectedCustomer.email && <DetailRow label="Email" value={selectedCustomer.email} />}
            </div>

            {(selectedCustomer.address || selectedCustomer.city || selectedCustomer.state) && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h5 className="font-semibold text-gray-700 mb-3">Address</h5>
                {selectedCustomer.address && <DetailRow label="Street" value={selectedCustomer.address} />}
                {selectedCustomer.city && <DetailRow label="City" value={selectedCustomer.city} />}
                {selectedCustomer.state && <DetailRow label="State" value={selectedCustomer.state} />}
                {selectedCustomer.zipCode && <DetailRow label="ZIP Code" value={selectedCustomer.zipCode} />}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-primary-600">{selectedCustomer.devices.length}</p>
                <p className="text-gray-600">Devices</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{selectedCustomer._count.tickets}</p>
                <p className="text-gray-600">Tickets</p>
              </div>
            </div>

            {selectedCustomer.devices.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Devices</h5>
                <div className="space-y-2">
                  {selectedCustomer.devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="font-medium">{device.deviceType}</span>
                      <span className="text-gray-500 text-sm">
                        {[device.brand, device.model].filter(Boolean).join(' ') || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedCustomer.notes && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-2">Notes</h5>
                <p className="text-gray-600">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedCustomer(null)} className="btn-secondary">
                Close
              </button>
              <Link href={`/dashboard/customers/${selectedCustomer.id}`} className="btn-primary">
                View Full Profile
              </Link>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
