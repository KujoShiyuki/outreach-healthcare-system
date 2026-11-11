import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook สำหรับจัดการ Form Session (เก็บ draft ใน sessionStorage)
 * - รองรับ Multi-step form (ไปหน้าต่อไป / ย้อนกลับ)
 * - ไม่บันทึกข้อมูลลงฐานข้อมูลจนกว่าจะจบกระบวนการ
 * - กดย้อนกลับ หรือออกจากหน้าแล้วย้อนกลับมา ข้อมูลยังอยู่ครบ
 * - ล้าง session เมื่อจบกระบวนการสำเร็จ (clearSession)
 */
export function useFormSession({
  sessionKey,
  initialForm,
  initialStep = 1,
  totalSteps = 3,
  extraInitial = {}
}) {
  // 1. โหลดข้อมูลจาก sessionStorage หากมี
  const loadSavedData = () => {
    try {
      const saved = sessionStorage.getItem(sessionKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          form: { ...initialForm, ...(parsed.form || {}) },
          step: typeof parsed.step === 'number' ? parsed.step : initialStep,
          extra: { ...extraInitial, ...(parsed.extra || {}) },
          hasDraft: true,
        }
      }
    } catch (e) {
      console.warn(`[useFormSession] Error reading ${sessionKey}:`, e)
    }
    return {
      form: initialForm,
      step: initialStep,
      extra: extraInitial,
      hasDraft: false,
    }
  }

  const initialData = loadSavedData()
  const [form, setForm] = useState(initialData.form)
  const [step, setStep] = useState(initialData.step)
  const [extra, setExtra] = useState(initialData.extra)
  const [hasDraft, setHasDraft] = useState(initialData.hasDraft)

  // 2. บันทึกลง sessionStorage เมื่อ form, step หรือ extra มีการเปลี่ยนแปลง
  useEffect(() => {
    try {
      const dataToSave = {
        form,
        step,
        extra,
        updatedAt: new Date().toISOString()
      }
      sessionStorage.setItem(sessionKey, JSON.stringify(dataToSave))
      setHasDraft(true)
    } catch (e) {
      console.warn(`[useFormSession] Error saving ${sessionKey}:`, e)
    }
  }, [sessionKey, form, step, extra])

  // 3. จัดการ Browser History (ปุ่ม Back/Forward ของ Browser)
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && typeof event.state.step === 'number') {
        setStep(event.state.step)
      }
    }

    // Set initial history state if not set
    if (!window.history.state || window.history.state.step === undefined) {
      window.history.replaceState({ step }, '')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 4. ฟังก์ชันเปลี่ยน Step พร้อมบันทึก History
  const goToStep = (newStep) => {
    if (newStep < 1 || newStep > totalSteps) return
    window.history.pushState({ step: newStep }, '')
    setStep(newStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const nextStep = () => {
    if (step < totalSteps) {
      goToStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      goToStep(step - 1)
    }
  }

  // 5. ล้าง session เมื่อกระบวนการเสร็จสมบูรณ์
  const clearSession = () => {
    try {
      sessionStorage.removeItem(sessionKey)
      setForm(initialForm)
      setStep(initialStep)
      setExtra(extraInitial)
      setHasDraft(false)
      window.history.replaceState({ step: initialStep }, '')
    } catch (e) {
      console.warn(`[useFormSession] Error clearing ${sessionKey}:`, e)
    }
  }

  return {
    form,
    setForm,
    step,
    setStep: goToStep,
    nextStep,
    prevStep,
    extra,
    setExtra,
    hasDraft,
    clearSession,
  }
}

export default useFormSession
