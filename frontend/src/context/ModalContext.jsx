import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import Modal from '../components/ui/Modal.jsx'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [modalState, setModalState] = useState({
    open: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'ตกลง',
    cancelText: 'ยกเลิก',
    showCancel: false,
    onConfirm: null,
    onCancel: null,
  })

  const closeModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, open: false }))
  }, [])

  const showAlert = useCallback(({ type = 'info', title, message, confirmText = 'ตกลง', onConfirm }) => {
    setModalState({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText: 'ยกเลิก',
      showCancel: false,
      onConfirm: () => {
        closeModal()
        if (onConfirm) onConfirm()
      },
      onCancel: closeModal,
    })
  }, [closeModal])

  const showConfirm = useCallback(({ type = 'warning', title = 'โปรดยืนยัน', message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', onConfirm, onCancel }) => {
    setModalState({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel: true,
      onConfirm: () => {
        closeModal()
        if (onConfirm) onConfirm()
      },
      onCancel: () => {
        closeModal()
        if (onCancel) onCancel()
      },
    })
  }, [closeModal])

  const contextValue = useMemo(() => ({ showAlert, showConfirm, closeModal }), [showAlert, showConfirm, closeModal])

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <Modal
        open={modalState.open}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        showCancel={modalState.showCancel}
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
