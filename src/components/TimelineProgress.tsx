'use client'

import { useState, useEffect } from 'react'

interface Milestone {
  name: string
  estimatedDate: string
  description: string
}

interface TimelineData {
  estimatedStartDate: string | null
  estimatedCompletionDate: string | null
  estimatedDurationMinutes: number | null
  milestones: Milestone[]
  complexityScore: number | null
  status: string
  priority: string
}

interface TimelineProgressProps {
  ticketId: string
  currentStatus: string
  initialData?: TimelineData
  estimatedCompletion?: string
}

const statusOrder = [
  'RECEIVED',
  'DIAGNOSING',
  'WAITING_APPROVAL',
  'WAITING_PARTS',
  'IN_REPAIR',
  'QUALITY_CHECK',
  'READY_PICKUP',
  'COMPLETED'
]

const statusLabels: Record<string, string> = {
  RECEIVED: 'Received',
  DIAGNOSING: 'Diagnosing',
  WAITING_APPROVAL: 'Awaiting Approval',
  WAITING_PARTS: 'Waiting for Parts',
  IN_REPAIR: 'In Repair',
  QUALITY_CHECK: 'Quality Check',
  READY_PICKUP: 'Ready for Pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled'
}

export default function TimelineProgress({
  ticketId,
  currentStatus,
  initialData,
  estimatedCompletion
}: TimelineProgressProps) {
  const [timeline, setTimeline] = useState<TimelineData | null>(initialData || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStatusIndex = statusOrder.indexOf(currentStatus)

  const generateTimeline = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId })
      })

      const data = await res.json()

      if (data.success) {
        setTimeline({
          estimatedStartDate: data.data.estimatedStartDate,
          estimatedCompletionDate: data.data.estimatedCompletionDate,
          estimatedDurationMinutes: data.data.estimatedDurationMinutes,
          milestones: data.data.milestones || [],
          complexityScore: data.data.complexityScore,
          status: currentStatus,
          priority: data.data.priority || 'NORMAL'
        })
      } else {
        setError(data.error || 'Failed to generate timeline')
      }
    } catch (err) {
      setError('Failed to generate timeline')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Repair Timeline</h3>
        <button
          onClick={generateTimeline}
          disabled={isGenerating}
          className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : timeline ? 'Refresh' : 'Generate Estimate'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-50 text-red-600 text-sm rounded">
          {error}
        </div>
      )}

      {/* Status Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {statusOrder.map((status, index) => {
            const isCompleted = index < currentStatusIndex
            const isCurrent = index === currentStatusIndex
            const isFuture = index > currentStatusIndex

            return (
              <div
                key={status}
                className="flex flex-col items-center flex-1"
              >
                <div
                  className={`w-4 h-4 rounded-full ${
                    isCompleted ? 'bg-green-500' :
                    isCurrent ? 'bg-blue-500 ring-4 ring-blue-100' :
                    'bg-gray-200'
                  }`}
                />
                <span className={`text-xs mt-1 text-center ${
                  isCurrent ? 'font-semibold text-blue-600' :
                  isCompleted ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  {statusLabels[status]?.split(' ')[0]}
                </span>
              </div>
            )
          })}
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all"
            style={{ width: `${(currentStatusIndex / (statusOrder.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {timeline && (
        <>
          {/* Timeline Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Est. Start</p>
              <p className="font-semibold text-sm">
                {timeline.estimatedStartDate
                  ? formatDate(timeline.estimatedStartDate)
                  : 'TBD'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="font-semibold text-sm">
                {timeline.estimatedDurationMinutes
                  ? formatDuration(timeline.estimatedDurationMinutes)
                  : 'TBD'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Est. Complete</p>
              <p className="font-semibold text-sm">
                {timeline.estimatedCompletionDate
                  ? formatDate(timeline.estimatedCompletionDate)
                  : 'TBD'}
              </p>
            </div>
          </div>

          {/* Complexity Score */}
          {timeline.complexityScore && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600">Complexity Score</span>
                <span className="text-sm font-medium">{timeline.complexityScore}/10</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    timeline.complexityScore >= 7 ? 'bg-red-500' :
                    timeline.complexityScore >= 4 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${timeline.complexityScore * 10}%` }}
                />
              </div>
            </div>
          )}

          {/* Milestones */}
          {timeline.milestones.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Milestones</h4>
              <div className="space-y-3">
                {timeline.milestones.map((milestone, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{milestone.name}</p>
                      <p className="text-xs text-gray-500">{milestone.description}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        {formatDate(milestone.estimatedDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!timeline && !isGenerating && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">Click "Generate Estimate" to get an AI-powered timeline prediction</p>
        </div>
      )}
    </div>
  )
}
