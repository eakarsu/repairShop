'use client'

import { useState, useEffect } from 'react'
import { formatCurrency, getStatusColor } from '@/lib/utils'
import DetailModal, { DetailRow, StatusBadge } from '@/components/DetailModal'

interface RevenueData {
  chartData: { date: string; amount: number }[]
  totalRevenue: number
  partsRevenue: number
  laborRevenue: number
  averageTicketValue: number
}

interface TicketData {
  total: number
  completed: number
  avgTurnaroundHours: number
  byStatus: { status: string; count: number }[]
  byDay: { date: string; count: number }[]
}

interface PartsData {
  total: number
  lowStock: number
  outOfStock: number
  lowStockParts: { id: string; name: string; sku: string; quantity: number; minQuantity: number; costPrice?: number; sellingPrice?: number; category?: string }[]
  topUsed: { id?: string; name: string; quantity: number; revenue: number; sku?: string }[]
  totalValue: number
}

type SelectedPart = {
  id?: string
  name: string
  sku?: string
  quantity: number
  minQuantity?: number
  costPrice?: number
  sellingPrice?: number
  category?: string
  revenue?: number
  type: 'lowStock' | 'topUsed'
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('revenue')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [partsData, setPartsData] = useState<PartsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPart, setSelectedPart] = useState<SelectedPart | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<{ status: string; count: number } | null>(null)

  useEffect(() => {
    fetchReport()
  }, [activeTab, dateRange])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${activeTab}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      const data = await res.json()
      if (data.success) {
        if (activeTab === 'revenue') setRevenueData(data.data)
        if (activeTab === 'tickets') setTicketData(data.data)
        if (activeTab === 'parts') setPartsData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePartClick = (part: SelectedPart) => {
    setSelectedPart(part)
  }

  const handleStatusClick = (item: { status: string; count: number }) => {
    setSelectedStatus(item)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Business analytics and insights</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="input-field"
          />
          <span>to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          {['revenue', 'tickets', 'parts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {activeTab === 'revenue' && revenueData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {}}>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(revenueData.totalRevenue)}</p>
                </div>
                <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {}}>
                  <p className="text-sm text-gray-500">Labor Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(revenueData.laborRevenue)}</p>
                </div>
                <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {}}>
                  <p className="text-sm text-gray-500">Parts Revenue</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(revenueData.partsRevenue)}</p>
                </div>
                <div className="card cursor-pointer hover:shadow-lg transition-shadow" onClick={() => {}}>
                  <p className="text-sm text-gray-500">Avg. Ticket Value</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(revenueData.averageTicketValue)}</p>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">Daily Revenue</h3>
                <div className="h-64 flex items-end gap-1">
                  {revenueData.chartData.map((day, i) => {
                    const maxAmount = Math.max(...revenueData.chartData.map(d => d.amount))
                    const height = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group cursor-pointer">
                        <div className="hidden group-hover:block absolute -mt-8 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                          {day.date}: {formatCurrency(day.amount)}
                        </div>
                        <div
                          className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors"
                          style={{ height: `${height}%` }}
                          title={`${day.date}: ${formatCurrency(day.amount)}`}
                        />
                        <span className="text-xs text-gray-400 mt-1 rotate-45">{day.date.slice(5)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tickets' && ticketData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <p className="text-sm text-gray-500">Total Tickets</p>
                  <p className="text-2xl font-bold">{ticketData.total}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{ticketData.completed}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Avg. Turnaround</p>
                  <p className="text-2xl font-bold">{ticketData.avgTurnaroundHours} hrs</p>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold mb-4">Tickets by Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {ticketData.byStatus.map((item) => (
                    <div
                      key={item.status}
                      className="text-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all"
                      onClick={() => handleStatusClick(item)}
                    >
                      <p className="text-2xl font-bold">{item.count}</p>
                      <span className={`status-badge ${getStatusColor(item.status)}`}>{item.status.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parts' && partsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card">
                  <p className="text-sm text-gray-500">Total Parts</p>
                  <p className="text-2xl font-bold">{partsData.total}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{partsData.lowStock}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{partsData.outOfStock}</p>
                </div>
                <div className="card">
                  <p className="text-sm text-gray-500">Inventory Value</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(partsData.totalValue)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold mb-4">Low Stock Items</h3>
                  <div className="space-y-2">
                    {partsData.lowStockParts.slice(0, 10).map((part) => (
                      <div
                        key={part.id}
                        className="flex items-center justify-between p-3 bg-red-50 rounded cursor-pointer hover:bg-red-100 hover:shadow-md transition-all"
                        onClick={() => handlePartClick({ ...part, type: 'lowStock' })}
                      >
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-sm text-gray-500">{part.sku}</p>
                        </div>
                        <span className="font-bold text-red-600">{part.quantity} / {part.minQuantity}</span>
                      </div>
                    ))}
                    {partsData.lowStockParts.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No low stock items</p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold mb-4">Top Used Parts</h3>
                  <div className="space-y-2">
                    {partsData.topUsed.slice(0, 10).map((part, i) => (
                      <div
                        key={part.id || i}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 hover:shadow-md transition-all"
                        onClick={() => handlePartClick({ ...part, type: 'topUsed' })}
                      >
                        <div>
                          <p className="font-medium">{part.name}</p>
                          <p className="text-sm text-gray-500">{part.quantity} units sold</p>
                        </div>
                        <span className="font-bold text-green-600">{formatCurrency(part.revenue)}</span>
                      </div>
                    ))}
                    {partsData.topUsed.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No parts data available</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Part Detail Modal */}
      <DetailModal
        isOpen={!!selectedPart}
        onClose={() => setSelectedPart(null)}
        title={selectedPart?.type === 'lowStock' ? 'Low Stock Part Details' : 'Top Used Part Details'}
      >
        {selectedPart && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h4 className="text-xl font-bold text-gray-900">{selectedPart.name}</h4>
              {selectedPart.sku && <p className="text-gray-500">SKU: {selectedPart.sku}</p>}
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <DetailRow label="Current Stock" value={selectedPart.quantity} highlight={selectedPart.type === 'lowStock'} />
              {selectedPart.minQuantity !== undefined && (
                <DetailRow label="Minimum Required" value={selectedPart.minQuantity} />
              )}
              {selectedPart.costPrice !== undefined && (
                <DetailRow label="Cost Price" value={formatCurrency(selectedPart.costPrice)} />
              )}
              {selectedPart.sellingPrice !== undefined && (
                <DetailRow label="Selling Price" value={formatCurrency(selectedPart.sellingPrice)} />
              )}
              {selectedPart.revenue !== undefined && (
                <DetailRow label="Revenue Generated" value={formatCurrency(selectedPart.revenue)} highlight />
              )}
              {selectedPart.category && (
                <DetailRow label="Category" value={selectedPart.category} />
              )}
            </div>

            {selectedPart.type === 'lowStock' && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <p className="text-red-800 font-medium">Action Required</p>
                <p className="text-sm text-red-600">This part is below the minimum stock level. Consider creating a purchase order.</p>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedPart(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DetailModal>

      {/* Status Detail Modal */}
      <DetailModal
        isOpen={!!selectedStatus}
        onClose={() => setSelectedStatus(null)}
        title="Ticket Status Details"
      >
        {selectedStatus && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <StatusBadge status={selectedStatus.status} colorClass={getStatusColor(selectedStatus.status)} />
              <p className="text-4xl font-bold text-gray-900 mt-4">{selectedStatus.count}</p>
              <p className="text-gray-500">tickets in this status</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                {selectedStatus.status === 'RECEIVED' && 'These tickets have been received and are awaiting initial diagnosis.'}
                {selectedStatus.status === 'DIAGNOSING' && 'These tickets are currently being diagnosed by technicians.'}
                {selectedStatus.status === 'WAITING_APPROVAL' && 'These tickets are waiting for customer approval on the repair quote.'}
                {selectedStatus.status === 'WAITING_PARTS' && 'These tickets are on hold pending parts arrival.'}
                {selectedStatus.status === 'IN_REPAIR' && 'These tickets are actively being repaired.'}
                {selectedStatus.status === 'QUALITY_CHECK' && 'These tickets have been repaired and are undergoing quality check.'}
                {selectedStatus.status === 'READY_PICKUP' && 'These tickets are completed and ready for customer pickup.'}
                {selectedStatus.status === 'COMPLETED' && 'These tickets have been successfully completed and picked up.'}
                {selectedStatus.status === 'CANCELLED' && 'These tickets have been cancelled.'}
              </p>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedStatus(null)}
                className="btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </DetailModal>
    </div>
  )
}
