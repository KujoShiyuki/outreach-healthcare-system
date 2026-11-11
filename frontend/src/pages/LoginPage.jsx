import Navbar from "../components/Navbar.jsx"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Validation ตาม SRS
  const validateEmail = (value) => {
    if (!value || value.trim() === '') return 'กรุณากรอกอีเมล'
    if (/\s/.test(value)) return 'อีเมลห้ามมีช่องว่าง'
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!emailRegex.test(value)) return 'รูปแบบอีเมลไม่ถูกต้อง (เช่น example@mail.com)'
    return ''
  }

  const validatePassword = (value) => {
    if (!value || value.trim() === '') return 'กรุณากรอกรหัสผ่าน'
    if (/\s/.test(value)) return 'รหัสผ่านห้ามมีช่องว่าง'
    if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) return 'รหัสผ่านไม่ถูกต้อง (อย่างน้อย 8 ตัว, ตัวพิมพ์ใหญ่, ตัวเลข)'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    // ตรวจสอบความถูกต้องของข้อมูลจากสคริปต์ (Basic Flow ขั้นตอนที่ 3)
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      return
    }

    setErrors({})
    setIsLoading(true)

    try {
      // Basic Flow ขั้นตอนที่ 4-5: ระบบรับค่าอีเมลและรหัสผ่าน แล้วตรวจสอบจากฐานข้อมูล
      const response = await api.post('/auth/login', { email, password })

      // Basic Flow ขั้นตอนที่ 6: ระบบยินยอมให้ผู้ใช้เข้าสู่หน้าจอหลัก
      const { token, user } = response.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      // Redirect ตาม role
      const userRole = user.role ? user.role.toLowerCase() : '';
      if (userRole === 'admin') {
        navigate('/admin/verify')
      } else if (userRole === 'nurse') {
        navigate('/nurse/requests')
      } else {
        navigate('/') // ถ้าเป็น Member เปลี่ยนให้ไปหน้าแรกสุด (Home) ตามที่ต้องการ
      }
    } catch (err) {
      // Alternate Flow 5.1.1: อีเมลหรือรหัสผ่านไม่ถูกต้อง
      const message = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      setServerError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      {/* Header Navigation */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[300px] h-[300px] bg-secondary-container/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md z-10">
          {/* Login Card */}
          <div className="bg-surface-container-lowest p-10 rounded-[4px] shadow-sm border border-[#ced4da]">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007BFF]/10 rounded-[4px] mb-4 text-[#007BFF]">
                <span className="material-symbols-outlined text-4xl">medical_services</span>
              </div>
              <h1 className="headline-font text-3xl font-bold text-on-surface mb-2 tracking-tight">ยินดีต้อนรับ</h1>
              <p className="text-tertiary text-lg">เข้าสู่ระบบ Smart Elder Care</p>
            </div>

            {/* Server Error Message */}
            {serverError && (
              <div className="mb-6 p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-[4px] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#DC3545]">error</span>
                <p className="text-[#DC3545] text-sm font-medium">{serverError}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="email">
                  อีเมล
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors({ ...errors, email: '' })
                    }}
                    placeholder="example@email.com"
                    className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.email ? 'border-[#DC3545]' : 'border-[#ced4da]'
                      }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="password">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors({ ...errors, password: '' })
                    }}
                    placeholder="••••••••"
                    className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-12 text-on-surface focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.password ? 'border-[#DC3545]' : 'border-[#ced4da]'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-[#007BFF] transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded-[4px] border-[#ced4da] text-[#007BFF] focus:ring-[#007BFF] h-5 w-5 transition-all"
                  />
                  <span className="text-sm text-tertiary group-hover:text-on-surface transition-colors">จดจำฉัน</span>
                </label>
                <a className="text-sm font-medium text-[#007BFF] hover:underline transition-colors headline-font" href="#">
                  ลืมรหัสผ่าน?
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white py-3 px-4 rounded-[4px] headline-font text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    กำลังเข้าสู่ระบบ...
                  </span>
                ) : (
                  'เข้าสู่ระบบ'
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="mt-8 pt-8 border-t border-outline-variant/10 text-center">
              <p className="text-tertiary">
                ยังไม่มีบัญชีผู้ใช้งาน?{' '}
                <a className="text-primary font-bold ml-1 hover:underline headline-font" href="/register">
                  ลงทะเบียนที่นี่
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-outline text-xs flex flex-col gap-2">
            <div className="flex justify-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">นโยบายความเป็นส่วนตัว</a>
              <span className="text-outline-variant/30">•</span>
              <a className="hover:text-primary transition-colors" href="#">เงื่อนไขการใช้งาน</a>
              <span className="text-outline-variant/30">•</span>
              <a className="hover:text-primary transition-colors" href="#">ศูนย์ช่วยเหลือ</a>
            </div>
            <p>© 2026 Smart Elder Care Platform. All Rights Reserved.</p>
          </div>
        </div>
      </main>

      {/* Side Illustration (Large screens only) */}
      <div className="fixed top-0 right-0 w-1/3 h-full hidden lg:block pointer-events-none">
        <div className="w-full h-full relative">
          <div className="w-full h-full bg-[#007BFF]/5"></div>
          <div className="absolute inset-0 bg-surface/80"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <span className="material-symbols-outlined text-primary/20" style={{ fontSize: '120px' }}>
                health_and_safety
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
