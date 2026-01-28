'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDate, formatCurrency, getAutoOrderStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'

interface AutoOrderLog {
  id: string
  triggeredQuantity: number
  orderQuantity: number
  status: string
  rejectionReason: string | null
  approvedAt: string | null
  createdAt: string
  part: {
    id: string
    sku: string
    name: string
    quantity: number
    minQuantity: number
    costPrice: number
    vendor: {
      id: string
      name: string
    } | null
    category: {
      name: string
    }
  }
  approvedBy: {
    firstName: string
    lastName: string
  } | null
  order: {
    id: string
    orderNumber: string
    status: string
  } | null
}

interface AutoOrderRule {
  id: string
  isEnabled: boolean
  reorderPoint: number
  reorderQuantity: number
  maxAutoOrderQty: number | null
  part: {
    id: string
    sku: string
    name: string
    quantity: number
    minQuantity: number
    vendor: { name: string } | null
    category: { name: string }
  }
}

const statusLabels: Record<string, string> = {
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ORDER_CREATED: 'Order Created',
  CANCELLED: 'Cancelled'
}

export default function AutoOrdersPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'rules'>('pending')
  const [pendingOrders, setPendingOrders] = useState<AutoOrderLog[]>([])
  const [history, setHistory] = useState<AutoOrderLog[]>([])
  const [rules, setRules] = useState<AutoOrderRule[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<AutoOrderLog | null>(null)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AutoOrderLog | null>(null)
  const [selectedRule, setSelectedRule] = useState<AutoOrderRule | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [togglingRule, setTogglingRule] = useState<string | null>(null)

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingOrders()
    } else if (activeTab === 'history') {
      fetchHistory()
    } else {
      fetchRules()
    }
  }, [activeTab])

  const fetchPendingOrders = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auto-orders?pending=true')
      const data = await res.json()
      if (data.success) {
        setPendingOrders(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch pending orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auto-orders')
      const data = await res.json()
      if (data.success) {
        setHistory(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auto-orders/rules')
      const data = await res.json()
      if (data.success) {
        setRules(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (orderId: string) => {
    setProcessing(orderId)
    try {
      const res = await fetch(`/api/auto-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      const data = await res.json()
      if (data.success) {
        fetchPendingOrders()
        setSelectedOrder(null)
      } else {
        alert(data.error || 'Failed to approve')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (orderId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    setProcessing(orderId)
    try {
      const res = await fetch(`/api/auto-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectReason })
      })
      const data = await res.json()
      if (data.success) {
        fetchPendingOrders()
        setSelectedOrder(null)
        setRejectReason('')
      } else {
        alert(data.error || 'Failed to reject')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleTriggerCheck = async () => {
    try {
      const res = await fetch('/api/auto-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger' })
      })
      const data = await res.json()
      if (data.success) {
        alert(data.message || `Created ${data.data.length} new auto-order requests`)
        fetchPendingOrders()
      }
    } catch (error) {
      console.error('Failed to trigger check:', error)
    }
  }

  const handleToggleRule = async (ruleId: string, currentState: boolean) => {
    setTogglingRule(ruleId)
    try {
      const res = await fetch(`/api/auto-orders/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, isEnabled: !currentState })
      })
      const data = await res.json()
      if (data.success) {
        fetchRules()
        setSelectedRule(null)
      } else {
        alert(data.error || 'Failed to update rule')
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error)
    } finally {
      setTogglingRule(null)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/inventory"
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Auto-Orders</h1>
            <p className="text-gray-600">Automatic reorder management</p>
          </div>
        </div>
        <button
          onClick={handleTriggerCheck}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Check Low Stock
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Approval
            {pendingOrders.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-4 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Auto-Order Rules
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : activeTab === 'pending' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {pendingOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending auto-orders
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.part.name}</p>
                        <p className="text-sm text-gray-500">{order.part.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${order.triggeredQuantity <= order.part.minQuantity ? 'text-red-600' : 'text-gray-900'}`}>
                        {order.triggeredQuantity}
                      </span>
                      <span className="text-gray-400"> / {order.part.minQuantity} min</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      +{order.orderQuantity}
                    </td>
                    <td className="px-6 py-4">
                      {formatCurrency(order.orderQuantity * order.part.costPrice)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {order.part.vendor?.name || 'No vendor'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleApprove(order.id)}
                          disabled={processing === order.id}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No auto-order history
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedHistoryItem(log)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{log.part.name}</p>
                        <p className="text-sm text-gray-500">{log.part.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      +{log.orderQuantity}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAutoOrderStatusColor(log.status)}`}>
                        {statusLabels[log.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {log.order ? (
                        <Link
                          href={`/dashboard/orders`}
                          className="text-blue-600 hover:underline"
                        >
                          {log.order.orderNumber}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {log.approvedBy
                        ? `${log.approvedBy.firstName} ${log.approvedBy.lastName}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {formatDate(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No auto-order rules configured
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Point</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rules.map((rule) => (
                  <tr
                    key={rule.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedRule(rule)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{rule.part.name}</p>
                        <p className="text-sm text-gray-500">{rule.part.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={rule.part.quantity <= rule.reorderPoint ? 'text-red-600 font-medium' : ''}>
                        {rule.part.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">{rule.reorderPoint}</td>
                    <td className="px-6 py-4">{rule.reorderQuantity}</td>
                    <td className="px-6 py-4">{rule.maxAutoOrderQty || 'No limit'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rule.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {rule.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Detail Modal for Pending Approval */}
      <DetailModal
        isOpen={!!selectedOrder}
        onClose={() => {
          setSelectedOrder(null)
          setRejectReason('')
        }}
        title="Auto-Order Details"
        size="md"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <DetailRow label="Part" value={selectedOrder.part.name} />
            <DetailRow label="SKU" value={selectedOrder.part.sku} />
            <DetailRow label="Current Quantity" value={selectedOrder.triggeredQuantity} />
            <DetailRow label="Order Quantity" value={selectedOrder.orderQuantity} />
            <DetailRow
              label="Estimated Cost"
              value={formatCurrency(selectedOrder.orderQuantity * selectedOrder.part.costPrice)}
            />
            <DetailRow
              label="Vendor"
              value={selectedOrder.part.vendor?.name || 'No vendor assigned'}
            />
            <DetailRow label="Status" value={
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAutoOrderStatusColor(selectedOrder.status)}`}>
                {statusLabels[selectedOrder.status] || selectedOrder.status}
              </span>
            } />

            {selectedOrder.status === 'PENDING_APPROVAL' && (
              <>
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (required for rejection)
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    placeholder="Enter reason for rejection..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedOrder.id)}
                    disabled={processing === selectedOrder.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing === selectedOrder.id ? 'Processing...' : 'Approve & Create Order'}
                  </button>
                  <button
                    onClick={() => handleReject(selectedOrder.id)}
                    disabled={processing === selectedOrder.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}

            {selectedOrder.status !== 'PENDING_APPROVAL' && (
              <div className="border-t pt-4 text-center text-gray-500">
                This order has already been processed.
              </div>
            )}
          </div>
        )}
      </DetailModal>

      {/* History Detail Modal */}
      <DetailModal
        isOpen={!!selectedHistoryItem}
        onClose={() => setSelectedHistoryItem(null)}
        title="Auto-Order History Details"
        size="md"
      >
        {selectedHistoryItem && (
          <div className="space-y-4">
            <DetailRow label="Part" value={selectedHistoryItem.part.name} />
            <DetailRow label="SKU" value={selectedHistoryItem.part.sku} />
            <DetailRow label="Category" value={selectedHistoryItem.part.category.name} />
            <DetailRow label="Triggered At Quantity" value={selectedHistoryItem.triggeredQuantity} />
            <DetailRow label="Order Quantity" value={`+${selectedHistoryItem.orderQuantity}`} />
            <DetailRow
              label="Estimated Cost"
              value={formatCurrency(selectedHistoryItem.orderQuantity * selectedHistoryItem.part.costPrice)}
            />
            <DetailRow label="Status" value={
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAutoOrderStatusColor(selectedHistoryItem.status)}`}>
                {statusLabels[selectedHistoryItem.status] || selectedHistoryItem.status}
              </span>
            } />
            {selectedHistoryItem.order && (
              <DetailRow label="Order Number" value={
                <Link href="/dashboard/orders" className="text-blue-600 hover:underline">
                  {selectedHistoryItem.order.orderNumber}
                </Link>
              } />
            )}
            {selectedHistoryItem.approvedBy && (
              <DetailRow
                label="Processed By"
                value={`${selectedHistoryItem.approvedBy.firstName} ${selectedHistoryItem.approvedBy.lastName}`}
              />
            )}
            {selectedHistoryItem.approvedAt && (
              <DetailRow label="Processed At" value={formatDate(selectedHistoryItem.approvedAt)} />
            )}
            {selectedHistoryItem.rejectionReason && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Rejection Reason:</p>
                <p className="text-gray-600 bg-red-50 p-3 rounded-lg">{selectedHistoryItem.rejectionReason}</p>
              </div>
            )}
            <DetailRow label="Created" value={formatDate(selectedHistoryItem.createdAt)} />
          </div>
        )}
      </DetailModal>

      {/* Rule Detail Modal */}
      <DetailModal
        isOpen={!!selectedRule}
        onClose={() => setSelectedRule(null)}
        title="Auto-Order Rule Details"
        size="md"
      >
        {selectedRule && (
          <div className="space-y-4">
            <DetailRow label="Part" value={selectedRule.part.name} />
            <DetailRow label="SKU" value={selectedRule.part.sku} />
            <DetailRow label="Category" value={selectedRule.part.category.name} />
            <DetailRow label="Vendor" value={selectedRule.part.vendor?.name || 'No vendor'} />
            <DetailRow
              label="Current Stock"
              value={
                <span className={selectedRule.part.quantity <= selectedRule.reorderPoint ? 'text-red-600 font-bold' : ''}>
                  {selectedRule.part.quantity}
                </span>
              }
            />
            <DetailRow label="Reorder Point" value={selectedRule.reorderPoint} />
            <DetailRow label="Reorder Quantity" value={selectedRule.reorderQuantity} />
            <DetailRow label="Max Auto-Order" value={selectedRule.maxAutoOrderQty || 'No limit'} />
            <DetailRow label="Status" value={
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedRule.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {selectedRule.isEnabled ? 'Enabled' : 'Disabled'}
              </span>
            } />

            <div className="border-t pt-4 flex justify-end">
              <button
                onClick={() => handleToggleRule(selectedRule.id, selectedRule.isEnabled)}
                disabled={togglingRule === selectedRule.id}
                className={`px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  selectedRule.isEnabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {togglingRule === selectedRule.id
                  ? 'Updating...'
                  : selectedRule.isEnabled ? 'Disable Rule' : 'Enable Rule'}
              </button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
