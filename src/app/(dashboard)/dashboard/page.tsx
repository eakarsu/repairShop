'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor, getAutoOrderStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'
import { useToast } from '@/components/Toast'
import { StatCardSkeleton } from '@/components/Skeleton'

interface DashboardStats {
  totalTickets: number
  openTickets: number
  completedToday: number
  revenue: number
  ticketsByStatus: { status: string; count: number }[]
  recentTickets: {
    id: string
    ticketNumber: string
    status: string
    priority: string
    issueDescription?: string
    estimatedCost?: number
    customer: { firstName: string; lastName: string; phone?: string; email?: string }
    device: { deviceType: string; brand?: string; model?: string } | null
    createdAt: string
  }[]
  lowStockParts: {
    id: string
    name: string
    sku: string
    quantity: number
    minQuantity: number
    costPrice?: number
    sellingPrice?: number
    category?: { name: string }
  }[]
}

interface PendingAutoOrder {
  id: string
  status: string
  part: { name: string; sku: string }
  triggeredQuantity: number
  orderQuantity: number
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<DashboardStats['recentTickets'][0] | null>(null)
  const [selectedPart, setSelectedPart] = useState<DashboardStats['lowStockParts'][0] | null>(null)
  const [pendingAutoOrders, setPendingAutoOrders] = useState<PendingAutoOrder[]>([])
  const [approving, setApproving] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/reports?type=overview')
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    const fetchPendingAutoOrders = async () => {
      try {
        const res = await fetch('/api/auto-orders?status=PENDING')
        const data = await res.json()
        if (data.success) {
          setPendingAutoOrders(data.data.slice(0, 5))
        }
      } catch (error) {
        console.error('Failed to fetch auto-orders:', error)
      }
    }

    fetchStats()
    fetchPendingAutoOrders()
  }, [])

  const handleApproveAutoOrder = async (orderId: string) => {
    setApproving(orderId)
    try {
      const res = await fetch(`/api/auto-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (data.success) {
        setPendingAutoOrders(prev => prev.filter(o => o.id !== orderId))
        showToast('Auto-order approved successfully', 'success')
      } else {
        showToast('Failed to approve auto-order', 'error')
      }
    } catch (error) {
      console.error('Failed to approve auto-order:', error)
      showToast('Failed to approve auto-order', 'error')
    } finally {
      setApproving(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Tickets',
      value: stats?.totalTickets || 0,
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'bg-blue-500',
      href: '/dashboard/tickets',
    },
    {
      title: 'Open Tickets',
      value: stats?.openTickets || 0,
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-yellow-500',
      href: '/dashboard/tickets?status=RECEIVED',
    },
    {
      title: 'Completed Today',
      value: stats?.completedToday || 0,
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-green-500',
      href: '/dashboard/tickets?status=COMPLETED',
    },
    {
      title: 'Revenue (30 days)',
      value: formatCurrency(stats?.revenue || 0),
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'bg-purple-500',
      href: '/dashboard/reports',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="card hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => router.push(stat.href)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
            <Link href="/dashboard/tickets" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left pb-3 text-sm font-medium text-gray-500">Ticket</th>
                  <th className="text-left pb-3 text-sm font-medium text-gray-500">Customer</th>
                  <th className="text-left pb-3 text-sm font-medium text-gray-500">Device</th>
                  <th className="text-left pb-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left pb-3 text-sm font-medium text-gray-500">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentTickets?.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="py-3">
                      <span className="text-primary-600 font-medium">
                        {ticket.ticketNumber}
                      </span>
                    </td>
                    <td className="py-3 text-gray-900">
                      {ticket.customer.firstName} {ticket.customer.lastName}
                    </td>
                    <td className="py-3 text-gray-600">
                      {ticket.device ? `${ticket.device.brand || ''} ${ticket.device.model || ticket.device.deviceType}`.trim() : '-'}
                    </td>
                    <td className="py-3">
                      <span className={`status-badge ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`status-badge ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentTickets || stats.recentTickets.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      No recent tickets
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
            <Link href="/dashboard/inventory" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {stats?.lowStockParts?.map((part) => (
              <div
                key={part.id}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 hover:shadow-md transition-all"
                onClick={() => setSelectedPart(part)}
              >
                <div>
                  <p className="font-medium text-gray-900">{part.name}</p>
                  <p className="text-sm text-gray-500">{part.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{part.quantity}</p>
                  <p className="text-xs text-gray-500">Min: {part.minQuantity}</p>
                </div>
              </div>
            ))}
            {(!stats?.lowStockParts || stats.lowStockParts.length === 0) && (
              <p className="text-center text-gray-500 py-4">All parts are well stocked</p>
            )}
          </div>
        </div>
      </div>

      {/* Auto-Order Alerts */}
      {pendingAutoOrders.length > 0 && (
        <div className="mt-8 card bg-orange-50 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Auto-Order Alerts</h2>
                <p className="text-sm text-gray-600">{pendingAutoOrders.length} pending approval</p>
              </div>
            </div>
            <Link href="/dashboard/inventory/auto-orders" className="text-orange-600 hover:text-orange-700 text-sm font-medium">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {pendingAutoOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                <div>
                  <p className="font-medium text-gray-900">{order.part.name}</p>
                  <p className="text-sm text-gray-500">
                    Order {order.orderQuantity} units (triggered at {order.triggeredQuantity} in stock)
                  </p>
                </div>
                <button
                  onClick={() => handleApproveAutoOrder(order.id)}
                  disabled={approving === order.id}
                  className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {approving === order.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ticket Status Distribution */}
      <div className="mt-8 card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Tickets by Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
          {stats?.ticketsByStatus?.map((item) => (
            <div
              key={item.status}
              className="text-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => router.push(`/dashboard/tickets?status=${item.status}`)}
            >
              <p className="text-2xl font-bold text-gray-900">{item.count}</p>
              <p className="text-xs text-gray-500 mt-1">{item.status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/tickets/new"
          className="flex items-center gap-4 p-6 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors"
        >
          <div className="p-3 bg-primary-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Ticket</p>
            <p className="text-sm text-gray-600">Create a repair ticket</p>
          </div>
        </Link>
        <Link
          href="/dashboard/customers/new"
          className="flex items-center gap-4 p-6 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
        >
          <div className="p-3 bg-green-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">New Customer</p>
            <p className="text-sm text-gray-600">Add a new customer</p>
          </div>
        </Link>
        <Link
          href="/dashboard/pos"
          className="flex items-center gap-4 p-6 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
        >
          <div className="p-3 bg-purple-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Point of Sale</p>
            <p className="text-sm text-gray-600">Process a sale</p>
          </div>
        </Link>
      </div>

      {/* Ticket Detail Modal */}
      <DetailModal
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Ticket Details"
        size="lg"
      >
        {selectedTicket && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xl font-bold text-gray-900">{selectedTicket.ticketNumber}</h4>
                <p className="text-gray-500">{formatDate(selectedTicket.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={selectedTicket.status} colorClass={getStatusColor(selectedTicket.status)} />
                <StatusBadge status={selectedTicket.priority} colorClass={getPriorityColor(selectedTicket.priority)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Customer Information</h5>
                <DetailRow label="Name" value={`${selectedTicket.customer.firstName} ${selectedTicket.customer.lastName}`} />
                {selectedTicket.customer.phone && <DetailRow label="Phone" value={selectedTicket.customer.phone} />}
                {selectedTicket.customer.email && <DetailRow label="Email" value={selectedTicket.customer.email} />}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-3">Device Information</h5>
                {selectedTicket.device ? (
                  <>
                    <DetailRow label="Type" value={selectedTicket.device.deviceType} />
                    {selectedTicket.device.brand && <DetailRow label="Brand" value={selectedTicket.device.brand} />}
                    {selectedTicket.device.model && <DetailRow label="Model" value={selectedTicket.device.model} />}
                  </>
                ) : (
                  <p className="text-gray-500">No device information</p>
                )}
              </div>
            </div>

            {selectedTicket.issueDescription && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-700 mb-2">Issue Description</h5>
                <p className="text-gray-600">{selectedTicket.issueDescription}</p>
              </div>
            )}

            {selectedTicket.estimatedCost && (
              <div className="bg-primary-50 rounded-lg p-4">
                <DetailRow label="Estimated Cost" value={formatCurrency(selectedTicket.estimatedCost)} highlight />
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedTicket(null)} className="btn-secondary">
                Close
              </button>
              <Link href={`/dashboard/tickets/${selectedTicket.id}`} className="btn-primary">
                View Full Details
              </Link>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Part Detail Modal */}
      <DetailModal
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        title="Low Stock Part Details"
      >
        {selectedPart && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-gray-900">{selectedPart.name}</h4>
              <p className="text-gray-500">SKU: {selectedPart.sku}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <DetailRow label="Current Stock" value={selectedPart.quantity} highlight />
              <DetailRow label="Minimum Required" value={selectedPart.minQuantity} />
              {selectedPart.costPrice !== undefined && (
                <DetailRow label="Cost Price" value={formatCurrency(selectedPart.costPrice)} />
              )}
              {selectedPart.sellingPrice !== undefined && (
                <DetailRow label="Selling Price" value={formatCurrency(selectedPart.sellingPrice)} />
              )}
              {selectedPart.category?.name && (
                <DetailRow label="Category" value={selectedPart.category.name} />
              )}
            </div>

            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">Action Required</p>
              <p className="text-sm text-red-600">This part is below the minimum stock level. Consider creating a purchase order.</p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setSelectedPart(null)} className="btn-secondary">
                Close
              </button>
              <Link href="/dashboard/orders" className="btn-primary">
                Create Order
              </Link>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
