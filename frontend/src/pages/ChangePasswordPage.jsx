import Navbar from "../components/Navbar.jsx"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useModal } from '../context/ModalContext.jsx'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const errs = {}
    if (!form.old_password) errs.old_password = 'กรุณากรอกรหัสผ่านเดิม'

    if (!form.new_password) errs.new_password = 'กรุณากรอกรหัสผ่านใหม่'
    else if (form.new_password.length < 8) errs.new_password = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'
    else if (/\s/.test(form.new_password)) errs.new_password = 'รหัสผ่านห้ามมีช่องว่าง'
    else if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.new_password)) errs.new_password = 'ต้องมีตัวพิมพ์ใหญ่อย่างน้อย 1 ตัวและตัวเลข 1 ตัว'
    else if (form.old_password && form.new_password === form.old_password) errs.new_password = 'รหัสผ่านใหม่ต้องไม่ตรงกับรหัสผ่านเดิม'

    if (!form.confirm_password) errs.confirm_password = 'กรุณายืนยันรหัสผ่านใหม่'
    else if (form.confirm_password !== form.new_password) errs.confirm_password = 'รหัสผ่านใหม่ไม่ตรงกัน'

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    try {
      await api.post('/member/password', { old_password: form.old_password, new_password: form.new_password })
      showAlert({
        type: 'success',
        title: 'เปลี่ยนรหัสผ่านสำเร็จ',
        message: 'เปลี่ยนรหัสผ่านของคุณเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        confirmText: 'เข้าสู่ระบบใหม่',
        onConfirm: () => {
          localStorage.clear()
          navigate('/login')
        }
      })
    } catch (err) {
      setServerError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  const renderPasswordField = (name, label, showState, setShowState) => (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-[#222222] ml-1">{label}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">lock</span>
        <input
          name={name}
          type={showState ? 'text' : 'password'}
          value={form[name]}
          onChange={handleChange}
          className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-11 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-sm text-[#222222] transition-all ${errors[name] ? 'border-rose-400' : 'border-gray-200'}`}
        />
        <button type="button" onClick={() => setShowState(!showState)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1456f0]">
          <span className="material-symbols-outlined text-lg">{showState ? 'visibility_off' : 'visibility'}</span>
        </button>
      </div>
      {errors[name] && <p className="text-rose-600 text-xs ml-1 font-medium">{errors[name]}</p>}
    </div>
  )

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 lg:p-10 rounded-3xl shadow-purple-card border border-gray-100">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <h1 className="headline-font text-2xl font-bold text-[#222222] mb-1">เปลี่ยนรหัสผ่าน</h1>
            <p className="text-[#45515e] text-xs">กำหนดรหัสผ่านใหม่เพื่อความปลอดภัยของบัญชี</p>
          </div>

          {serverError && <p className="text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-2xl mb-4 text-xs font-medium">{serverError}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {renderPasswordField('old_password', 'รหัสผ่านเดิม', showOld, setShowOld)}
            {renderPasswordField('new_password', 'รหัสผ่านใหม่', showNew, setShowNew)}
            {renderPasswordField('confirm_password', 'ยืนยันรหัสผ่านใหม่', showConfirm, setShowConfirm)}

            <button type="submit" disabled={isLoading} className="w-full bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-3 rounded-full text-sm font-semibold transition-all mt-3 shadow-purple-sm disabled:opacity-50">
              {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการเปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
