import Navbar from "../components/Navbar.jsx"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import thaiLocations from '../data/thaiLocations.js'
import LocationPicker from '../components/LocationPicker.jsx'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    phone: '',
    address: '',
    province: '',
    district: '',
    latitude: null,
    longitude: null,
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const provinces = Object.keys(thaiLocations)
  const districts = form.province ? thaiLocations[form.province] || [] : []

  const calculateAge = (dateString) => {
    if (!dateString) return null
    const bDate = new Date(dateString)
    if (isNaN(bDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - bDate.getFullYear()
    const m = today.getMonth() - bDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--
    }
    return age
  }

  const getMaxBirthDate = () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleProvinceChange = (e) => {
    const val = e.target.value
    setForm(prev => ({ ...prev, province: val, district: '' }))
    if (errors.province) setErrors(prev => ({ ...prev, province: '' }))
  }

  const handleLocationPicked = ({ lat, lng, address: pickedAddr, province: pickedProv, district: pickedDist }) => {
    setForm(prev => {
      const updated = {
        ...prev,
        latitude: lat,
        longitude: lng,
        address: pickedAddr || prev.address,
      }
      if (pickedProv) {
        const matchedP = provinces.find(p => p.includes(pickedProv) || pickedProv.includes(p))
        if (matchedP) {
          updated.province = matchedP
          const distList = thaiLocations[matchedP] || []
          if (pickedDist) {
            const matchedD = distList.find(d => d.includes(pickedDist) || pickedDist.includes(d))
            if (matchedD) updated.district = matchedD
          }
        }
      }
      return updated
    })
    setErrors(prev => ({ ...prev, province: '', district: '', address: '' }))
  }

  const validate = () => {
    const errs = {}

    // ชื่อจริง: ภาษาไทย, 2-50 ตัว, ห้ามว่าง
    if (!form.first_name.trim()) {
      errs.first_name = 'กรุณากรอกชื่อจริง'
    } else if (!/^[ก-๏\s]+$/.test(form.first_name)) {
      errs.first_name = 'ชื่อจริงต้องเป็นภาษาไทยเท่านั้น'
    } else if (form.first_name.trim().length < 2 || form.first_name.trim().length > 50) {
      errs.first_name = 'ชื่อจริงต้องมี 2-50 ตัวอักษร'
    }

    // นามสกุล: ภาษาไทย, 2-50 ตัว, ห้ามว่าง
    if (!form.last_name.trim()) {
      errs.last_name = 'กรุณากรอกนามสกุล'
    } else if (!/^[ก-๏\s]+$/.test(form.last_name)) {
      errs.last_name = 'นามสกุลต้องเป็นภาษาไทยเท่านั้น'
    } else if (form.last_name.trim().length < 2 || form.last_name.trim().length > 50) {
      errs.last_name = 'นามสกุลต้องมี 2-50 ตัวอักษร'
    }

    // วันเกิด: ต้องมีอายุอย่างน้อย 18 ปีบริบูรณ์
    if (!form.birth_date) {
      errs.birth_date = 'กรุณาเลือกวันเดือนปีเกิด'
    } else {
      const birthDate = new Date(form.birth_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const age = calculateAge(form.birth_date)
      if (birthDate >= today) {
        errs.birth_date = 'วันเกิดต้องเป็นวันที่ในอดีต'
      } else if (age === null || age < 18) {
        errs.birth_date = `ผู้ใช้งานต้องมีอายุไม่ต่ำกว่า 18 ปีบริบูรณ์ (ปัจจุบันอายุ ${age ?? 0} ปี)`
      }
    }

    // เบอร์โทร: ตัวเลข 10 หลัก, ขึ้นต้น 06/07/08/09, ห้ามช่องว่าง, ห้ามว่าง
    if (!form.phone.trim()) {
      errs.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    } else if (/\s/.test(form.phone)) {
      errs.phone = 'เบอร์โทรศัพท์ห้ามมีช่องว่าง'
    } else if (!/^(06|07|08|09)\d{8}$/.test(form.phone)) {
      errs.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09'
    }

    // ที่อยู่
    if (!form.province) errs.province = 'กรุณาเลือกจังหวัด'
    if (!form.district) errs.district = 'กรุณาเลือกอำเภอ/เขต'
    if (!form.address.trim()) errs.address = 'กรุณากรอกที่อยู่โดยละเอียด'

    // อีเมล
    if (!form.email.trim()) {
      errs.email = 'กรุณากรอกอีเมล'
    } else if (/\s/.test(form.email)) {
      errs.email = 'อีเมลห้ามมีช่องว่าง'
    } else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) {
      errs.email = 'รูปแบบอีเมลไม่ถูกต้อง (เช่น example@mail.com)'
    }

    // รหัสผ่าน
    if (!form.password) {
      errs.password = 'กรุณากรอกรหัสผ่าน'
    } else if (/\s/.test(form.password)) {
      errs.password = 'รหัสผ่านห้ามมีช่องว่าง'
    } else if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      errs.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์ใหญ่ 1 ตัว และตัวเลข 1 ตัว'
    }

    // ยืนยันรหัสผ่าน
    if (!form.confirmPassword) {
      errs.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
    } else if (form.confirmPassword !== form.password) {
      errs.confirmPassword = 'รหัสผ่านไม่ตรงกัน'
    }

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const vErrors = validate()
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors({})
    setIsLoading(true)

    try {
      const { confirmPassword, ...requestData } = form
      const response = await api.post('/auth/register/member', requestData)

      // สมัครเสร็จ → เข้าสู่ระบบอัตโนมัติ (ไม่ต้อง login ซ้ำ)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
      setServerError(message)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-2xl z-10">
          <div className="bg-surface-container-lowest p-8 sm:p-10 rounded-[4px] shadow-sm border border-[#ced4da]">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007BFF]/10 rounded-[4px] mb-4 text-[#007BFF]">
                <span className="material-symbols-outlined text-4xl">person_add</span>
              </div>
              <h1 className="headline-font text-3xl font-bold text-on-surface mb-2 tracking-tight">สมัครสมาชิก</h1>
              <p className="text-tertiary text-sm sm:text-base">สร้างบัญชีเพื่อเริ่มต้นใช้งาน Smart Elder Care</p>
            </div>

            {/* Server Error */}
            {serverError && (
              <div className="mb-6 p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-[4px] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#DC3545]">error</span>
                <p className="text-[#DC3545] text-sm font-medium">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" noValidate>
              {/* SECTION 1: ข้อมูลส่วนตัว */}
              <div className="space-y-4">
                <div className="border-b border-outline-variant/20 pb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">badge</span>
                    ข้อมูลส่วนตัว
                  </h2>
                  <p className="text-xs text-tertiary">กรอกชื่อ นามสกุล วันเกิด และเบอร์โทรศัพท์</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* ชื่อจริง */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="first_name">
                      ชื่อจริง <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                      <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        value={form.first_name}
                        onChange={handleChange}
                        placeholder="ชื่อจริง (ภาษาไทย)"
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                          errors.first_name ? 'border-[#DC3545]' : 'border-[#ced4da]'
                        }`}
                      />
                    </div>
                    {errors.first_name && (
                      <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {errors.first_name}
                      </p>
                    )}
                  </div>

                  {/* นามสกุล */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="last_name">
                      นามสกุล <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">badge</span>
                      <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        value={form.last_name}
                        onChange={handleChange}
                        placeholder="นามสกุล (ภาษาไทย)"
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                          errors.last_name ? 'border-[#DC3545]' : 'border-[#ced4da]'
                        }`}
                      />
                    </div>
                    {errors.last_name && (
                      <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {errors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* วันเกิด */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pr-1">
                      <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="birth_date">
                        วันเดือนปีเกิด <span className="text-[#DC3545]">*</span>
                      </label>
                      {form.birth_date && calculateAge(form.birth_date) !== null && (
                        <span className="text-xs font-semibold text-[#007BFF]">
                          อายุ {calculateAge(form.birth_date)} ปี
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">calendar_today</span>
                      <input
                        id="birth_date"
                        name="birth_date"
                        type="date"
                        value={form.birth_date}
                        onChange={handleChange}
                        max={getMaxBirthDate()}
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all ${
                          errors.birth_date ? 'border-[#DC3545]' : 'border-[#ced4da]'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-tertiary ml-1">กำหนดอายุขั้นต่ำ 18 ปีบริบูรณ์</p>
                    {errors.birth_date && (
                      <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {errors.birth_date}
                      </p>
                    )}
                  </div>

                  {/* เบอร์โทรศัพท์ */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="phone">
                      เบอร์โทรศัพท์ <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">phone</span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="0812345678"
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                          errors.phone ? 'border-[#DC3545]' : 'border-[#ced4da]'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 2: ที่อยู่ติดต่อ */}
              <div className="space-y-4">
                <div className="border-b border-outline-variant/20 pb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">location_on</span>
                    ที่อยู่ติดต่อ
                  </h2>
                  <p className="text-xs text-tertiary">ระบุจังหวัด อำเภอ และที่อยู่โดยละเอียด</p>
                </div>

                {/* แผนที่ปักหมุดตำแหน่งที่พัก (OpenStreetMap / Leaflet ฟรี 100%) */}
                <div className="pt-1">
                  <LocationPicker
                    lat={form.latitude}
                    lng={form.longitude}
                    onChangeLocation={handleLocationPicked}
                    height="240px"
                    label="ปักหมุดที่ตั้งบ้านบนแผนที่ (ช่วยกรอกที่อยู่อัตโนมัติ)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* จังหวัด */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font">จังหวัด <span className="text-[#DC3545]">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                      <select
                        name="province"
                        value={form.province}
                        onChange={handleProvinceChange}
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all appearance-none ${errors.province ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}
                      >
                        <option value="">-- เลือกจังหวัด --</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {errors.province && (
                      <p className="text-[#DC3545] text-xs ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>{errors.province}
                      </p>
                    )}
                  </div>

                  {/* อำเภอ / เขต */}
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font">อำเภอ / เขต <span className="text-[#DC3545]">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">map</span>
                      <select
                        name="district"
                        value={form.district}
                        onChange={handleChange}
                        disabled={!form.province}
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all appearance-none disabled:opacity-50 ${errors.district ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}
                      >
                        <option value="">-- เลือกอำเภอ --</option>
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {errors.district && (
                      <p className="text-[#DC3545] text-xs ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span>{errors.district}
                      </p>
                    )}
                  </div>
                </div>

                {/* รายละเอียดที่อยู่ */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font">รายละเอียดที่อยู่ (บ้านเลขที่, ถนน, ซอย) <span className="text-[#DC3545]">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-4 text-outline">home</span>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      rows="2"
                      placeholder="กรอกรายละเอียดที่อยู่ให้ครบถ้วน"
                      className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all resize-none ${errors.address ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[#DC3545] text-xs ml-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span>{errors.address}
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION 3: ข้อมูลบัญชีผู้ใช้ */}
              <div className="space-y-4">
                <div className="border-b border-outline-variant/20 pb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">lock</span>
                    ข้อมูลบัญชีผู้ใช้
                  </h2>
                  <p className="text-xs text-tertiary">กำหนดอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ</p>
                </div>

                {/* อีเมล */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="email">
                    อีเมล (Username) <span className="text-[#DC3545]">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="example@email.com"
                      className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                        errors.email ? 'border-[#DC3545]' : 'border-[#ced4da]'
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

                {/* รหัสผ่าน และ ยืนยันรหัสผ่าน */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* รหัสผ่าน */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="password">
                      รหัสผ่าน <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="อย่างน้อย 8 ตัวอักษร"
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                          errors.password ? 'border-[#DC3545]' : 'border-[#ced4da]'
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

                  {/* ยืนยันรหัสผ่าน */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-on-surface-variant ml-1 headline-font" htmlFor="confirmPassword">
                      ยืนยันรหัสผ่าน <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock_reset</span>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        className={`w-full bg-white border rounded-[4px] py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 text-on-surface transition-all placeholder:text-gray-400 ${
                          errors.confirmPassword ? 'border-[#DC3545]' : 'border-[#ced4da]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-[#007BFF] transition-colors"
                      >
                        <span className="material-symbols-outlined">
                          {showConfirmPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[#DC3545] text-sm ml-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">warning</span>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white rounded-[4px] headline-font font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังสมัครสมาชิก...
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>ยืนยันการสมัครสมาชิก</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Login Link */}
            <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center space-y-2">
              <p className="text-tertiary text-sm">
                มีบัญชีอยู่แล้ว?{' '}
                <a className="text-[#007BFF] font-bold ml-1 hover:underline headline-font" href="/login">
                  เข้าสู่ระบบที่นี่
                </a>
              </p>
              <p className="text-tertiary text-xs">
                เป็นพยาบาลวิชาชีพ?{' '}
                <a className="text-[#28A745] font-bold ml-1 hover:underline headline-font" href="/register/nurse">
                  สมัครผู้ให้บริการพยาบาล
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
