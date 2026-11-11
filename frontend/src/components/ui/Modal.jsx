import { useEffect, useRef } from 'react'

const TYPE_CONFIG = {
  success: { icon: 'check_circle', iconClass: 'bg-emerald-50 text-emerald-600', confirmClass: 'bg-emerald-600 hover:bg-emerald-700', defaultTitle: 'ดำเนินการสำเร็จ' },
  error: { icon: 'error', iconClass: 'bg-rose-50 text-rose-600', confirmClass: 'bg-rose-600 hover:bg-rose-700', defaultTitle: 'เกิดข้อผิดพลาด' },
  warning: { icon: 'warning', iconClass: 'bg-amber-50 text-amber-600', confirmClass: 'bg-amber-500 hover:bg-amber-600', defaultTitle: 'โปรดยืนยันการดำเนินการ' },
  info: { icon: 'info', iconClass: 'bg-blue-50 text-[#1456f0]', confirmClass: 'bg-[#1456f0] hover:bg-[#0f45c2]', defaultTitle: 'แจ้งเตือน' },
}

export default function Modal({
  open,
  type = 'info',
  title,
  message,
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  showCancel = false,
  closeOnBackdrop = true,
}) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus?.()
      return undefined
    }

    previousFocusRef.current = document.activeElement
    dialogRef.current?.querySelector('button')?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && onCancel) onCancel()
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[#181e25]/50 backdrop-blur-sm p-4"
      onClick={() => closeOnBackdrop && onCancel?.()}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-7 shadow-2xl animate-in fade-in zoom-in duration-200"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${config.iconClass}`}>
          <span className="material-symbols-outlined text-3xl">{config.icon}</span>
        </div>
        <h2 id="modal-title" className="text-center font-display text-xl font-bold text-[#222222]">
          {title || config.defaultTitle}
        </h2>
        <p id="modal-message" className="mt-2 whitespace-pre-line text-center text-sm leading-relaxed text-[#45515e]">{message}</p>

        <div className={`mt-6 flex gap-3 ${showCancel ? '' : 'justify-center'}`}>
          {showCancel && (
            <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#45515e] transition hover:bg-gray-50">
              {cancelText}
            </button>
          )}
          <button type="button" onClick={onConfirm || onCancel} className={`${showCancel ? 'flex-1' : 'min-w-32'} rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] ${config.confirmClass}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
