'use client'

import { useState } from 'react'
import AIResponseReport from './AIResponseReport'

interface Photo {
  id: string
  filename: string
  path: string
  description: string | null
  aiAnalysis?: {
    damageType: string
    severity: string
    description: string
    affectedComponents: string[]
    repairRecommendations: string[]
    estimatedRepairCost: { min: number; max: number }
    urgency: string
    notes: string
  } | null
  uploadedAt: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  ticketId: string
  onDelete?: (photoId: string) => void
  onPhotoDeleted?: () => void
  onAnalyze?: (photoId: string, description: string) => void
}

export default function PhotoGallery({ photos, ticketId, onDelete, onPhotoDeleted, onAnalyze }: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analysisDescription, setAnalysisDescription] = useState('')
  const [analysisResult, setAnalysisResult] = useState<Photo['aiAnalysis'] | null>(null)

  const handleAnalyze = async (photo: Photo) => {
    if (!analysisDescription.trim()) {
      alert('Please describe what you see in the photo')
      return
    }

    setAnalyzing(photo.id)
    setAnalysisResult(null)
    try {
      const res = await fetch('/api/ai/damage-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoId: photo.id,
          description: analysisDescription,
          ticketId
        })
      })
      const data = await res.json()
      if (data.success) {
        // Update the selected photo with the analysis result
        setAnalysisResult(data.data)
        setSelectedPhoto({ ...photo, aiAnalysis: data.data })
        onAnalyze?.(photo.id, analysisDescription)
        setAnalysisDescription('')
        // Refresh photos list
        onPhotoDeleted?.()
      } else {
        alert(data.error || 'Analysis failed')
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      alert('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(null)
    }
  }

  const handleDelete = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const res = await fetch(`/api/tickets/${ticketId}/photos?photoId=${photoId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        onDelete?.(photoId)
        onPhotoDeleted?.()
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(null)
        }
      }
    } catch (error) {
      console.error('Delete failed:', error)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No photos uploaded yet
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100"
            onClick={() => setSelectedPhoto(photo)}
          >
            <img
              src={photo.path}
              alt={photo.description || 'Ticket photo'}
              className="w-full h-32 object-cover"
            />
            {photo.aiAnalysis && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                AI Analyzed
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                View
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold">
                {selectedPhoto.description || 'Photo Details'}
              </h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-2/3 p-4">
                <img
                  src={selectedPhoto.path}
                  alt={selectedPhoto.description || 'Ticket photo'}
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>

              <div className="md:w-1/3 p-4 border-l overflow-y-auto max-h-[60vh]">
                {selectedPhoto.aiAnalysis ? (
                  <AIResponseReport value={selectedPhoto.aiAnalysis} title="Saved damage assessment" />
                ) : (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Run AI Damage Assessment</h4>
                    <p className="text-sm text-gray-500">
                      Describe what you see in the photo to get an AI-powered damage assessment.
                    </p>
                    <textarea
                      value={analysisDescription}
                      onChange={(e) => setAnalysisDescription(e.target.value)}
                      placeholder="E.g., 'Cracked screen with multiple fractures starting from the top right corner...'"
                      className="w-full p-2 border rounded-lg text-sm"
                      rows={4}
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        'The screen has several cracks radiating from the upper right corner; the display image and touch response cannot be confirmed from this photo.',
                        'The charging port appears bent and contains visible lint; electrical function has not been tested.',
                        'The rear housing shows a dent beside the camera, with no visible broken glass; internal damage cannot be assessed from the image.'
                      ].map((example, index) => <button key={index} type="button" disabled={analyzing === selectedPhoto.id} onClick={() => setAnalysisDescription(example)} className="rounded border px-2 py-1 text-xs">Fill example {index + 1}</button>)}
                    </div>
                    <button
                      onClick={() => handleAnalyze(selectedPhoto)}
                      disabled={analyzing === selectedPhoto.id}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {analyzing === selectedPhoto.id ? 'Analyzing...' : 'Analyze with AI'}
                    </button>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={() => handleDelete(selectedPhoto.id)}
                    className="w-full bg-red-50 text-red-600 py-2 rounded-lg hover:bg-red-100"
                  >
                    Delete Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
