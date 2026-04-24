'use client'

interface ConfirmDialogProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

const variantStyles = {
  danger: { button: 'bg-red-600 hover:bg-red-700', icon: 'text-red-600', bg: 'bg-red-100' },
  warning: { button: 'bg-yellow-600 hover:bg-yellow-700', icon: 'text-yellow-600', bg: 'bg-yellow-100' },
  info: { button: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-600', bg: 'bg-blue-100' },
}

const variantIcons = {
  danger: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const style = variantStyles[variant]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${style.bg}`}>
            <svg className={`w-6 h-6 ${style.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={variantIcons[variant]} />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary">{cancelText}</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white rounded-lg font-medium ${style.button}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
