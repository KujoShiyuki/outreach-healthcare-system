import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { formatDate } from '../utils/formatDate.js'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    phone: '',
    address: '',
    province: '',
    district: '',
    latitude: null,
    longitude: null,
    emergency_phone: '',
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  // Basic Flow ขั้นตอนที่ 1-2: ดึงข้อมูลโปรไฟล์มาแสดง
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/member/profile')
      const data = response.data
      setProfile(data)
      setForm({
        phone: data.phone || '',
        address: data.address || '',
        province: data.province || '',
        district: data.district || '',
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        emergency_phone: data.emergency_phone || '',
      })
    } catch (err) {
      setServerError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsFetching(false)
    }
  }

  const handleLocationPicked = ({ lat, lng, address: pickedAddr, province: pickedProv, district: pickedDist }) => {
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: pickedAddr || prev.address,
      province: pickedProv || prev.province,
      district: pickedDist || prev.district,
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
    setSuccessMsg('')
  }

  // Validation ตาม SRS - Edit Profile
  const validate = () => {
    const errs = {}

    // เบอร์โทร: ตัวเลข 10 หลัก, ขึ้นต้น 06/07/08/09, ห้ามช่องว่าง, ห้ามว่าง
    if (!form.phone.trim()) {
      errs.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    } else if (/\s/.test(form.phone)) {
      errs.phone = 'เบอร์โทรศัพท์ห้ามมีช่องว่าง'
    } else if (!/^(06|07|08|09)\d{8}$/.test(form.phone)) {
      errs.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09'
    }

    // ที่อยู่: ห้ามว่าง
    if (!form.address.trim()) {
      errs.address = 'กรุณากรอกที่อยู่ / บ้านเลขที่'
    }

    // เบอร์ฉุกเฉิน (ถ้ากรอก ต้องถูกรูปแบบ)
    if (form.emergency_phone && form.emergency_phone.trim()) {
      if (/\s/.test(form.emergency_phone)) {
        errs.emergency_phone = 'เบอร์โทรฉุกเฉินห้ามมีช่องว่าง'
      } else if (!/^(06|07|08|09)\d{8}$/.test(form.emergency_phone)) {
        errs.emergency_phone = 'เบอร์โทรฉุกเฉินต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09'
      }
    }

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccessMsg('')

    // Basic Flow ขั้นตอนที่ 3: ตรวจสอบความถูกต้องของข้อมูลจากสคริปต์
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setErrors({})
    setIsLoading(true)

    try {
      // Basic Flow ขั้นตอนที่ 4-5: ส่งข้อมูลไป API บันทึกลงฐานข้อมูล
      await api.put('/member/profile', form)

      // Basic Flow ขั้นตอนที่ 6: แสดงผลการบันทึก
      setSuccessMsg('แก้ไขข้อมูลส่วนตัวสำเร็จ')
      fetchProfile()
    } catch (err) {
      // Alternate Flow 5.1.1: บันทึกไม่สำเร็จ
      const message = err.response?.data?.message || 'เกิดข้อผิดพลาดกรุณาลองใหม่อีกครั้ง'
      setServerError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-[#1456f0]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[#45515e] text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-xl z-10 py-6">
          <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-[#1456f0] rounded-full mb-3 shadow-2xs">
                <span className="material-symbols-outlined text-3xl">manage_accounts</span>
              </div>
              <h1 className="headline-font text-3xl font-bold text-[#222222] mb-1.5">แก้ไขข้อมูลส่วนตัว</h1>
              <p className="text-[#45515e] text-sm">อัพเดทข้อมูลและพิกัดที่อยู่ของคุณให้เป็นปัจจุบัน</p>
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <p className="font-medium">{successMsg}</p>
              </div>
            )}

            {/* Server Error */}
            {serverError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <p className="font-medium">{serverError}</p>
              </div>
            )}

            {/* ข้อมูลที่แก้ไขไม่ได้ (แสดงเฉยๆ) */}
            {profile && (
              <div className="mb-6 p-5 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-xs font-bold text-[#45515e] uppercase tracking-wider">ข้อมูลพื้นฐานผู้ใช้งาน</h3>
                  <button onClick={() => navigate('/member/change-password')} className="text-xs text-[#1456f0] font-semibold hover:underline flex items-center gap-1 bg-white px-3 py-1 rounded-full border border-gray-200/80 shadow-2xs">
                    <span className="material-symbols-outlined text-[14px]">lock_reset</span>เปลี่ยนรหัสผ่าน
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">ชื่อ-นามสกุล</span>
                    <p className="font-bold text-[#222222]">{profile.first_name} {profile.last_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">วันเกิด</span>
                    <p className="font-bold text-[#222222]">{formatDate(profile.birth_date)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 block mb-0.5">อีเมลบัญชี</span>
                    <p className="font-bold text-[#222222]">{profile.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* เบอร์โทร */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#222222] block" htmlFor="phone">
                  เบอร์โทรศัพท์ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">phone</span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0812345678"
                    className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-sm text-[#222222] transition-all placeholder:text-gray-400 ${
                      errors.phone ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-rose-600 text-xs ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* แผนที่ปักหมุดตำแหน่งที่พัก (OpenStreetMap / Leaflet ฟรี 100%) */}
              <div className="space-y-1">
                <LocationPicker
                  lat={form.latitude}
                  lng={form.longitude}
                  onChangeLocation={handleLocationPicked}
                  height="220px"
                  label="ปักหมุดที่ตั้งบ้านบนแผนที่ (คลิกเพื่อย้ายหมุด)"
                />
              </div>

              {/* ที่อยู่ / บ้านเลขที่ */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#222222] block" htmlFor="address">
                  ที่อยู่ / บ้านเลขที่ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-3.5 text-gray-400 text-lg">home</span>
                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="บ้านเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                    rows={3}
                    className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-sm text-[#222222] transition-all placeholder:text-gray-400 resize-none ${
                      errors.address ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.address && (
                  <p className="text-rose-600 text-xs ml-1 flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {errors.address}
                  </p>
                )}
              </div>

              {/* เบอร์ฉุกเฉิน */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#222222] block" htmlFor="emergency_phone">
                  เบอร์ติดต่อฉุกเฉิน
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">emergency</span>
                  <input
                    id="emergency_phone"
                    name="emergency_phone"
                    type="tel"
                    value={form.emergency_phone}
                    onChange={handleChange}
                    placeholder="0891234567"
                    className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-sm text-[#222222] transition-all placeholder:text-gray-400 ${
                      errors.emergency_phone ? 'border-rose-400' : 'border-gray-200'
                    }`}
                  />
                </div>
                {errors.emergency_phone && (
                  <p className="text-rose-600 text-xs ml-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    {errors.emergency_phone}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 min-w-[120px] border border-gray-200 bg-white hover:bg-gray-50 text-[#45515e] py-3 rounded-full text-sm font-semibold transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 min-w-[160px] bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-3 rounded-full text-sm font-semibold transition-all shadow-purple-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
