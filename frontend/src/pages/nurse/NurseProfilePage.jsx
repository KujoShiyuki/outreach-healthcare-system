import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect, useMemo } from 'react'
import api from '../../services/api.js'
import LocationPicker from '../../components/LocationPicker.jsx'
import NurseHospitalRosterCalendar from '../../components/nurse/NurseHospitalRosterCalendar.jsx'
import { SHIFT_DEFINITIONS, ALL_DAYS } from '../../data/shiftDefinitions.js'
import { useModal } from '../../context/ModalContext.jsx'
import { getMonthConflicts, checkFreelanceShiftsOverlap } from '../../utils/shiftConflictHelper.js'
import { formatDate } from '../../utils/formatDate.js'


const defaultShiftSchedule = {
  shifts: ['morning_8h', 'afternoon_8h'],
  days: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'],
  trade_note: '',
  nurse_work_type: 'HOSPITAL_STAFF', // 'HOSPITAL_STAFF' หรือ 'FREELANCE'
  hospital_code_schedule: {}
}

const THAI_BANKS = [
  'ธนาคารกสิกรไทย (KBANK)',
  'ธนาคารไทยพาณิชย์ (SCB)',
  'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)',
  'ธนาคารกรุงศรีอยุธยา (BAY)',
  'ธนาคารทหารไทยธนชาต (TTB)',
  'ธนาคารออมสิน (GSB)',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
  'ธนาคารยูโอบี (UOB)',
  'ธนาคารซีไอเอ็มบีไทย (CIMB)',
  'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  'ธนาคารเกียรตินาคินภัทร (KKP)',
]

export default function NurseProfilePage() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({
    phone: '',
    service_area: '',
    specialty: '',
    bank_name: '',
    bank_account_no: '',
    availability_type: 'FIXED_TIME',
    license_no: '',
    license_issue_date: '',
    license_expire_date: '',
    latitude: null,
    longitude: null,
    service_radius_km: 10
  })

  // ตารางเวรและความพร้อมรับงาน
  const [schedule, setSchedule] = useState(defaultShiftSchedule)
  // รายการคิวงานนัดหมายที่พยาบาลรับแล้ว
  const [appointments, setAppointments] = useState([])

  // ไฟล์เอกสารสำหรับอัปโหลดใหม่
  const [licenseFile, setLicenseFile] = useState(null)
  const [preview, setPreview] = useState(null)

  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { showAlert, showConfirm } = useModal()

  // จัดกลุ่มคำขอนัดหมายตามวันที่จริง สำหรับตรวจจับตารางเวรทับซ้อน
  const appointmentsByDate = useMemo(() => {
    const map = {}
    const addAppointment = (date, appointment, occurrenceType = 'single') => {
      if (!date) return
      if (!map[date]) map[date] = []
      map[date].push({ ...appointment, occurrence_type: occurrenceType })
    }

    appointments.forEach((apt) => {
      if (!apt.start_date) return
      const start = apt.start_date.split('T')[0]
      const end = (apt.end_date || apt.start_date).split('T')[0]
      const storedDates = typeof apt.service_dates === 'string'
        ? apt.service_dates.split(',').map(value => value.trim()).filter(Boolean)
        : Array.isArray(apt.service_dates) ? apt.service_dates : []

      if (storedDates.length > 0) {
        storedDates.forEach(date => addAppointment(date, apt, 'scheduled'))
        return
      }

      const startDate = new Date(`${start}T00:00:00`)
      const endDate = new Date(`${end}T00:00:00`)
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate >= startDate) {
        const isMultiDay = end !== start
        const cursor = new Date(startDate)
        while (cursor <= endDate) {
          addAppointment(cursor.toISOString().split('T')[0], apt, isMultiDay ? 'range' : 'single')
          cursor.setDate(cursor.getDate() + 1)
        }
      }
    })
    return map
  }, [appointments])

  // ตรวจจับความขัดแย้งของตารางเวร รพ. กับคิวงานดูแลผู้ป่วยในทุกเดือนที่ลงไว้
  const allScheduleConflicts = useMemo(() => {
    if (schedule.nurse_work_type === 'FREELANCE') return []
    const conflicts = []
    Object.entries(schedule.hospital_code_schedule || {}).forEach(([mKey, monthData]) => {
      const [y, m] = mKey.split('-').map(Number)
      if (!y || !m) return
      const res = getMonthConflicts(y, m - 1, monthData, appointmentsByDate)
      if (res.allConflicts.length > 0) {
        conflicts.push(...res.allConflicts)
      }
    })
    return conflicts
  }, [schedule.hospital_code_schedule, schedule.nurse_work_type, appointmentsByDate])

  // ตรวจจับช่วงเวลากะทับซ้อนกันในโหมดฟรีแลนซ์ (Freelance Shifts Overlap)
  const freelanceOverlaps = useMemo(() => {
    return checkFreelanceShiftsOverlap(schedule.shifts || [])
  }, [schedule.shifts])

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await api.get('/nurses/profile')
      const p = res.data
      setProfile(p)
      setForm({
        phone: p.phone || '',
        service_area: p.service_area || '',
        specialty: p.specialty || '',
        bank_name: p.bank_name || '',
        bank_account_no: p.bank_account_no || '',
        availability_type: p.availability_type || 'FIXED_TIME',
        license_no: p.license_no || '',
        license_issue_date: p.license_issue_date || '',
        license_expire_date: p.license_expire_date || '',
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        service_radius_km: p.service_radius_km || 10,
        is_retired: Boolean(p.is_retired)
      })

      // ตั้งค่า preview สำหรับดูรูปเดิมที่มีในระบบ
      if (p.license_file_url) {
        setPreview(p.license_file_url)
      }

      // โหลดตารางเวรที่บันทึกไว้
      let parsed = defaultShiftSchedule
      if (p.shift_schedule) {
        try {
          parsed = { ...defaultShiftSchedule, ...JSON.parse(p.shift_schedule) }
          if (!parsed.hospital_code_schedule) parsed.hospital_code_schedule = {}
          if (!parsed.nurse_work_type) parsed.nurse_work_type = 'HOSPITAL_STAFF'
        } catch (e) {
          parsed = { ...defaultShiftSchedule, trade_note: p.shift_schedule }
        }
      }
      setSchedule(parsed)

      // โหลดคิวงานเพื่อนำมาแสดงในปฏิทิน
      try {
        const reqRes = await api.get('/nurses/requests')
        const allReqs = [...(reqRes.data.active || []), ...(reqRes.data.pending || [])]
        setAppointments(allReqs)
      } catch (reqErr) {
        console.error('Could not load nurse requests for calendar', reqErr)
      }
    } catch (err) {
      setError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleLocationPicked = ({ lat, lng, province: pickedProv, district: pickedDist }) => {
    setForm(prev => {
      const updated = {
        ...prev,
        latitude: lat,
        longitude: lng,
      }
      if (pickedDist && pickedProv) {
        updated.service_area = `${pickedDist}, ${pickedProv}`
      } else if (pickedProv) {
        updated.service_area = pickedProv
      }
      return updated
    })
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) return
      setLicenseFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
    }
  }

  // จัดการการเลือกกะเวร
  const handleToggleShift = (shiftId) => {
    const current = schedule.shifts || []
    if (current.includes(shiftId)) {
      setSchedule({ ...schedule, shifts: current.filter(id => id !== shiftId) })
    } else {
      setSchedule({ ...schedule, shifts: [...current, shiftId] })
    }
  }

  // จัดการการเลือกวัน
  const handleToggleDay = (day) => {
    const current = schedule.days || []
    if (current.includes(day)) {
      setSchedule({ ...schedule, days: current.filter(d => d !== day) })
    } else {
      setSchedule({ ...schedule, days: [...current, day] })
    }
  }

  // ทางลัดเลือกวัน
  const handleSelectDaysPreset = (preset) => {
    if (preset === 'all') {
      setSchedule({ ...schedule, days: [...ALL_DAYS] })
    } else if (preset === 'weekdays') {
      setSchedule({ ...schedule, days: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'] })
    } else if (preset === 'weekend') {
      setSchedule({ ...schedule, days: ['เสาร์', 'อาทิตย์'] })
    } else if (preset === 'clear') {
      setSchedule({ ...schedule, days: [] })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    // Validation ตามข้อกำหนดระบบ
    if (!form.phone?.trim()) {
      setError('กรุณากรอกเบอร์โทรศัพท์')
      return
    }
    if (/\s/.test(form.phone)) {
      setError('เบอร์โทรศัพท์ห้ามมีช่องว่าง')
      return
    }
    if (!/^(06|07|08|09)\d{8}$/.test(form.phone)) {
      setError('เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09')
      return
    }

    if (!form.service_area?.trim()) {
      setError('กรุณาระบุพื้นที่ให้บริการ')
      return
    }

    if (!form.bank_account_no?.trim()) {
      setError('กรุณากรอกเลขบัญชีธนาคาร')
      return
    }
    if (!/^\d{10,12}$/.test(form.bank_account_no.trim())) {
      setError('เลขบัญชีธนาคารต้องเป็นตัวเลข 10-12 หลัก (ห้ามมีขีดหรือช่องว่าง)')
      return
    }

    if (profile?.professional_tier === 'RN') {
      if (form.license_issue_date && form.license_expire_date && new Date(form.license_expire_date) <= new Date(form.license_issue_date)) {
        setError('วันหมดอายุใบอนุญาตต้องอยู่หลังวันออกใบอนุญาต')
        return
      }
    }

    // ซิงค์ shifts และ days อัตโนมัติจากตารางเวร รพ. เพื่อให้ระบบค้นหาเดิม (SearchNursePage) ค้นหาเจอ 100%
    let syncedShifts = [...(schedule.shifts || [])]
    let syncedDays = [...(schedule.days || [])]

    if (schedule.nurse_work_type === 'HOSPITAL_STAFF') {
      const allCodes = Object.values(schedule.hospital_code_schedule || {}).flatMap(m => Object.values(m || {}))
      if (allCodes.includes('X') || allCodes.includes('พ')) {
        if (!syncedShifts.includes('morning_8h')) syncedShifts.push('morning_8h')
        if (!syncedShifts.includes('afternoon_8h')) syncedShifts.push('afternoon_8h')
        if (!syncedShifts.includes('day_12h')) syncedShifts.push('day_12h')
      }
      if (allCodes.includes('ช')) {
        if (!syncedShifts.includes('afternoon_8h')) syncedShifts.push('afternoon_8h')
      }
      if (allCodes.includes('บ')) {
        if (!syncedShifts.includes('morning_8h')) syncedShifts.push('morning_8h')
      }
      if (syncedDays.length === 0) {
        syncedDays = [...ALL_DAYS]
      }
    }

    if (syncedShifts.length === 0) {
      syncedShifts = ['morning_8h', 'afternoon_8h']
    }

    if (schedule.nurse_work_type !== 'HOSPITAL_STAFF' && form.availability_type === 'FIXED_TIME' && (!schedule.shifts || schedule.shifts.length === 0)) {
      setError('รูปแบบรับงานตายตัว กรุณาเลือกกะเวรที่สะดวกอย่างน้อย 1 กะ')
      return
    }

    // ตรวจสอบความขัดแย้งของตารางเวร รพ. กับคิวงานดูแลผู้ป่วยก่อนบันทึก
    if (schedule.nurse_work_type === 'HOSPITAL_STAFF' && allScheduleConflicts.length > 0) {
      showConfirm({
        type: 'warning',
        title: 'ตรวจพบตารางเวรทับซ้อนกับคิวงาน!',
        message: `พบตารางเวรโรงพยาบาลทับซ้อนกับคิวงานดูแลผู้ป่วยที่รับไว้แล้วจำนวน ${allScheduleConflicts.length} รายการ:\n\n${allScheduleConflicts.slice(0, 3).map(c => `• ${c.dateStr}: ${c.reason}`).join('\n')}${allScheduleConflicts.length > 3 ? `\n...และอีก ${allScheduleConflicts.length - 3} รายการ` : ''}\n\nการบันทึกอาจส่งผลกระทบต่อการให้บริการผู้ป่วยและเกิดข้อร้องเรียนได้ ท่านต้องการยืนยันการบันทึกข้อมูลหรือไม่?`,
        confirmText: 'ยืนยันบันทึกข้อมูล',
        cancelText: 'กลับไปแก้ไขตารางเวร',
        onConfirm: () => {
          executeSaveProfile(syncedShifts, syncedDays)
        },
        onCancel: () => {
          setError(`ตรวจพบตารางเวรทับซ้อนกับคิวงานดูแลผู้ป่วย ${allScheduleConflicts.length} วัน กรุณาปรับเปลี่ยนตารางเวรในปฏิทินด้านล่าง`)
          const cal = document.getElementById('roster-calendar-section')
          if (cal) cal.scrollIntoView({ behavior: 'smooth' })
        }
      })
      return
    }

    executeSaveProfile(syncedShifts, syncedDays)
  }

  const executeSaveProfile = async (syncedShifts, syncedDays) => {
    setIsSaving(true)
    try {
      const finalSchedule = {
        ...schedule,
        shifts: syncedShifts,
        days: syncedDays
      }

      const payload = {
        ...form,
        shift_schedule: JSON.stringify(finalSchedule)
      }

      // ถ้ามีการอัปโหลดไฟล์ใหม่ ให้ส่ง Base64 Data URL ไปบันทึกจริง
      if (licenseFile && preview) {
        payload.license_file_url = preview
      }
      await api.put('/nurses/profile', payload)
      setSuccess('อัปเดตข้อมูลสำเร็จ! (หากมีการแก้ไขใบอนุญาตหรืออัปโหลดเอกสารใหม่ สถานะจะเปลี่ยนเป็น "รอตรวจสอบ" เพื่อความปลอดภัย)')
      setIsEditing(false)
      fetchProfile()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#1456f0]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[#45515e] text-xs">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow p-6 lg:p-10 flex justify-center">
        <div className="w-full max-w-4xl bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100 space-y-6">

          {/* Header Bar */}
          <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-100 pb-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold headline-font text-[#222222]">โปรไฟล์ของฉัน</h1>
              <p className="text-[#45515e] text-xs mt-1">ข้อมูลวิชาชีพและตารางเวรการปฏิบัติงาน (สามารถแก้ไขได้ตลอดเวลา)</p>
            </div>
            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-5 py-2.5 rounded-full font-semibold text-xs transition-all flex items-center gap-1.5 shadow-purple-sm"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                แก้ไขข้อมูล / อัปเดตตารางเวร
              </button>
            )}
          </div>

          {/* แจ้งเตือนสถานะรอตรวจสอบ (Pending Banner) */}
          {profile?.approval_status === 'Pending' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
              <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">pending_actions</span>
              <div>
                <p className="font-bold text-amber-900">สถานะ: อยู่ระหว่างรอตรวจสอบใบอนุญาต / วุฒิบัตร</p>
                <p className="text-[#45515e] text-xs mt-0.5">
                  ข้อมูลหรือเอกสารใบประกอบวิชาชีพของท่านกำลังอยู่ระหว่างการตรวจสอบความถูกต้องโดยผู้ดูแลระบบ (เมื่อได้รับการอนุมัติแล้วจะสามารถรับงานได้ตามปกติ)
                </p>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
              <span className="material-symbols-outlined text-base text-rose-600">error</span>
              <p className="font-medium">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800">
              <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
              <p className="font-medium">{success}</p>
            </div>
          )}

          {/* แจ้งเตือนตารางเวรทับซ้อนกับคิวงาน (Top Conflict Alert Banner) */}
          {allScheduleConflicts.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-rose-50 via-rose-50 to-amber-50 border-2 border-rose-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-rose-950 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <span className="material-symbols-outlined text-2xl">crisis_alert</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                    ตรวจพบตารางเวรทับซ้อนกับคิวงานดูแลผู้ป่วย ({allScheduleConflicts.length} วัน)
                  </h4>
                  <p className="text-rose-800 mt-0.5 leading-relaxed">
                    ตารางเวรโรงพยาบาลหรือวันหยุดส่วนตัวที่ลงไว้มีช่วงเวลาทับซ้อนกับคิวงานนัดหมายที่รับไว้แล้ว กรุณาตรวจสอบและปรับเปลี่ยนเวรในปฏิทินเพื่อป้องกันปัญหาเวลาปฏิบัติงาน
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {allScheduleConflicts.slice(0, 4).map((c, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-rose-800 border border-rose-300 text-[11px] font-bold shadow-2xs">
                        <span className="material-symbols-outlined text-[12px] text-rose-600">warning</span>
                        {c.dateStr}: {c.hospitalShiftCode ? `เวร [${c.hospitalShiftCode}]` : ''} ชนคิวงาน
                      </span>
                    ))}
                    {allScheduleConflicts.length > 4 && (
                      <span className="text-[11px] text-rose-700 self-center font-semibold">
                        +{allScheduleConflicts.length - 4} วัน
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true)
                    setTimeout(() => {
                      const cal = document.getElementById('roster-calendar-section')
                      if (cal) cal.scrollIntoView({ behavior: 'smooth' })
                    }, 100)
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs shrink-0 transition-all flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">edit_calendar</span>
                  แก้ไขตารางเวร
                </button>
              )}
            </div>
          )}

          {/* ข้อมูลพื้นฐานผู้ใช้งาน (Header Card) */}
          <div className="bg-gray-50/70 border border-gray-100 p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200/60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#1456f0] to-blue-700 text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-sm">
                  {profile?.first_name?.[0] || 'N'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#222222]">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs bg-blue-50 text-[#1456f0] border border-blue-200 px-3 py-0.5 rounded-full font-bold">
                      {profile?.professional_tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' :
                        profile?.professional_tier === 'PN' ? 'ผู้ช่วยพยาบาล (PN)' :
                          profile?.professional_tier === 'CG' ? 'ผู้ดูแลผู้ป่วย (CG / NA)' : 'บุคลากรทางการแพทย์'}
                    </span>
                    <span className="text-xs text-[#45515e]">
                      เลขประจำตัวประชาชน: <strong className="text-[#222222]">{profile?.national_id || '-'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-left sm:text-right">
                <p className="text-xs text-[#45515e] mb-1">สถานะใบอนุญาต</p>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${profile?.approval_status === 'Verified'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                  <span className="material-symbols-outlined text-[14px]">
                    {profile?.approval_status === 'Verified' ? 'verified' : 'hourglass_top'}
                  </span>
                  {profile?.approval_status === 'Verified' ? 'ผ่านการตรวจสอบแล้ว' : 'รอการตรวจสอบ'}
                </span>
              </div>
            </div>

            {/* เลขที่ใบอนุญาต & วันที่ */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-tertiary block">เลขที่ใบประกอบวิชาชีพ:</span>
                <span className="font-semibold text-on-surface text-sm">{profile?.license_no || 'ไม่มี/ไม่ระบุ'}</span>
              </div>
              <div>
                <span className="text-tertiary block">วันออกใบอนุญาต:</span>
                <span className="font-semibold text-on-surface text-sm">{formatDate(profile?.license_issue_date)}</span>
              </div>
              <div>
                <span className="text-tertiary block">วันหมดอายุใบอนุญาต:</span>
                <span className="font-semibold text-on-surface text-sm">{formatDate(profile?.license_expire_date)}</span>
              </div>
              <div>
                <span className="text-tertiary block">ความชำนาญเฉพาะทาง:</span>
                <span className="font-semibold text-primary text-sm">{profile?.specialty || 'ทั่วไป'}</span>
              </div>
            </div>

            {/* เอกสารที่แนบไว้ในระบบ */}
            {profile?.license_file_url && (
              <div className="flex flex-wrap gap-2.5 pt-3.5 mt-3 border-t border-[#ced4da] text-xs">
                <span className="inline-flex items-center gap-1 bg-[#28A745]/10 text-[#28A745] border border-[#28A745]/30 px-2.5 py-1 rounded-xl font-semibold">
                  <span className="material-symbols-outlined text-sm">description</span>
                  มีรูปถ่ายใบอนุญาตในระบบ
                </span>
              </div>
            )}
          </div>

          {/* ========================================================
              FORM: EDIT MODE
             ======================================================== */}
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-8" noValidate>

              {/* หมวด 1: ข้อมูลการติดต่อและการเงิน */}
              <section className="space-y-4">
                <div className="border-b border-[#ced4da] pb-2">
                  <h3 className="font-bold text-lg text-primary headline-font flex items-center gap-2">
                    <span className="material-symbols-outlined">contacts</span>
                    ข้อมูลการติดต่อและการเงิน
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      เบอร์โทรศัพท์ <span className="text-[#DC3545]">*</span>
                    </label>
                    <input
                      type="text"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="0812345678"
                      className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      ธนาคารที่รับเงินโอน <span className="text-[#DC3545]">*</span>
                    </label>
                    <select
                      name="bank_name"
                      value={form.bank_name || ''}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    >
                      <option value="">-- เลือกธนาคาร --</option>
                      {THAI_BANKS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      เลขบัญชีธนาคาร (10-12 หลัก) <span className="text-[#DC3545]">*</span>
                    </label>
                    <input
                      type="text"
                      name="bank_account_no"
                      value={form.bank_account_no}
                      onChange={handleChange}
                      placeholder="ระบุตัวเลขไม่มีขีด"
                      className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      พื้นที่ให้บริการ (อำเภอ/จังหวัด) <span className="text-[#DC3545]">*</span>
                    </label>
                    <input
                      type="text"
                      name="service_area"
                      value={form.service_area}
                      onChange={handleChange}
                      placeholder="เช่น เมือง, นนทบุรี"
                      className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      ความชำนาญเฉพาะทาง
                    </label>
                    <input
                      type="text"
                      name="specialty"
                      value={form.specialty}
                      onChange={handleChange}
                      placeholder="เช่น แผลและออสโตมี, ผู้สูงอายุ"
                      className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                      รูปแบบเวลาการรับงานหลัก <span className="text-[#DC3545]">*</span>
                    </label>
                    <select
                      name="availability_type"
                      value={form.availability_type}
                      onChange={handleChange}
                      className="w-full p-2.5 border border-[#ced4da] rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    >
                      <option value="HOSPITAL_OFF_DUTY">พยาบาลประจำโรงพยาบาล (รับงานนอกเวลา / วัน Off รพ.)</option>
                      <option value="FIXED_TIME">รับงานเวลาตายตัวตามรอบเวร (Fixed Shift)</option>
                      <option value="FLEXIBLE">เวลายืดหยุ่น / ตามนัดหมาย (Flexible)</option>
                      <option value="WEEKEND_ONLY">เฉพาะวันหยุด / เสาร์-อาทิตย์ (Weekend Only)</option>
                    </select>
                    <label className="mt-3 flex items-start gap-2 text-xs text-[#45515e] cursor-pointer">
                      <input type="checkbox" name="is_retired" checked={Boolean(form.is_retired)} onChange={(e) => setForm(prev => ({ ...prev, is_retired: e.target.checked }))} className="mt-0.5 w-4 h-4 text-[#1456f0] rounded border-gray-300" />
                      <span><strong>พยาบาลข้าราชการบำนาญ / เกษียณอายุราชการ</strong><br />แสดงเป็นพยาบาลประสบการณ์สูงในหน้าค้นหา</span>
                    </label>
                  </div>

                  {/* แผนที่ปักหมุดที่ตั้งและกำหนดรัศมีให้บริการ */}
                  <div className="sm:col-span-2 pt-2">
                    <LocationPicker
                      lat={form.latitude}
                      lng={form.longitude}
                      onChangeLocation={handleLocationPicked}
                      showRadiusCircle={true}
                      radiusKm={form.service_radius_km || 10}
                      onRadiusChange={(r) => setForm(prev => ({ ...prev, service_radius_km: r }))}
                      height="260px"
                      label="ปักหมุดที่ตั้งบ้าน/จุดเริ่มเดินทาง และกำหนดรัศมีให้บริการ (Service Radius)"
                    />
                  </div>
                </div>
              </section>

              {/* หมวด 2: ข้อมูลใบประกอบวิชาชีพและการต่ออายุ (License & Documents) */}
              <section className="space-y-4 bg-white border border-[#ced4da] p-5 rounded-xl">
                <div className="border-b border-[#ced4da] pb-2 flex items-center justify-between">
                  <h3 className="font-bold text-lg text-primary headline-font flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1456f0]">badge</span>
                    ข้อมูลใบประกอบวิชาชีพและการต่ออายุ (License & Credentials)
                  </h3>
                </div>

                {/* กล่องเตือนเงื่อนไขการเปลี่ยนสถานะเป็นรอตรวจสอบ */}
                <div className="p-3.5 bg-[#FFC107]/15 border border-[#FFC107]/40 rounded-xl text-xs flex items-start gap-2.5 text-[#856404]">
                  <span className="material-symbols-outlined text-base shrink-0 mt-0.5">warning</span>
                  <div className="leading-relaxed">
                    <strong>ข้อกำหนดความปลอดภัยทางวิชาชีพ:</strong> หากท่านแก้ไขเลขที่ใบอนุญาต, วันออก/วันหมดอายุ หรืออัปโหลดเอกสารใหม่ สถานะการอนุมัติจะเปลี่ยนกลับเป็น <strong>"รอตรวจสอบ (Pending)"</strong> ชั่วคราว เพื่อให้ผู้ดูแลระบบตรวจสอบความถูกต้องใหม่อีกครั้ง
                  </div>
                </div>

                {profile?.professional_tier === 'RN' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                          เลขที่ใบประกอบวิชาชีพ
                        </label>
                        <input
                          type="text"
                          name="license_no"
                          value={form.license_no}
                          onChange={handleChange}
                          placeholder="เช่น ว.12345"
                          className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                          วันออกใบอนุญาต
                        </label>
                        <input
                          type="date"
                          name="license_issue_date"
                          value={form.license_issue_date}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                          วันหมดอายุใบอนุญาต (ต่ออายุ)
                        </label>
                        <input
                          type="date"
                          name="license_expire_date"
                          value={form.license_expire_date}
                          onChange={handleChange}
                          className="w-full p-2.5 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                        />
                      </div>
                    </div>

                    {/* อัปโหลดรูปใบประกอบใหม่ */}
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                        อัปโหลดรูปถ่ายใบประกอบวิชาชีพฉบับใหม่ / ต่ออายุ
                      </label>
                      <div
                        onClick={() => document.getElementById('new-license-file').click()}
                        className="border border-dashed border-[#ced4da] rounded-xl p-4 text-center cursor-pointer hover:border-[#1456f0] bg-[#F8F9FA] transition-all"
                      >
                        {licenseFile ? (
                          <div className="space-y-1">
                            <img src={preview} alt="New License" className="max-h-36 mx-auto rounded-xl" />
                            <p className="text-xs text-[#1456f0] font-semibold">เลือกไฟล์ใหม่แล้ว (คลิกเพื่อเปลี่ยน)</p>
                          </div>
                        ) : (
                          <div className="text-tertiary text-xs">
                            <span className="material-symbols-outlined text-2xl text-outline mb-1">upload_file</span>
                            <p className="font-semibold text-on-surface-variant">คลิกเพื่ออัปโหลดรูปถ่ายใบอนุญาตใหม่ (JPG, PNG)</p>
                            {profile?.license_file_url && <p className="text-[11px] text-[#28A745] font-semibold mt-0.5">มีไฟล์เดิมอยู่ในระบบแล้ว</p>}
                          </div>
                        )}
                        <input
                          id="new-license-file"
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* หมวด 3: ตั้งค่าตารางเวรและการรับงาน (Shift Schedule Management) */}
              <section id="roster-calendar-section" className="space-y-6 bg-white border border-[#ced4da] p-5 rounded-xl">
                <div className="border-b border-[#ced4da] pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-primary headline-font flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#1456f0]">calendar_clock</span>
                      ตารางเวรและความพร้อมรับงาน (Shift Schedule & Availability)
                    </h3>
                    <p className="text-xs text-tertiary mt-0.5">
                      บันทึกตารางเวรโรงพยาบาลและกำหนดความพร้อมรับงาน Home Care (สามารถอัปเดตได้ตลอดเวลา)
                    </p>
                  </div>
                  <span className="text-xs bg-[#1456f0]/10 text-[#1456f0] px-2.5 py-1 rounded-xl font-semibold border border-[#1456f0]/20">
                    แก้ไขได้ตลอดเวลา
                  </span>
                </div>

                {/* สลับประเภทการจัดตารางเวลา: พยาบาลประจำ รพ. (ตามใบเวร) vs ประจำสัปดาห์ */}
                <div className="bg-[#F8F9FA] border border-[#ced4da] p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-sm text-on-surface block">
                      รูปแบบการจัดตารางเวลาการทำงาน:
                    </span>
                    <p className="text-xs text-tertiary">
                      เลือกรูปแบบให้ตรงกับการทำงานจริง เพื่อความสะดวกในการบันทึกข้อมูล
                    </p>
                  </div>
                  <div className="flex rounded-xl border border-[#ced4da] bg-white overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => setSchedule(prev => ({ ...prev, nurse_work_type: 'HOSPITAL_STAFF' }))}
                      className={`px-3 py-2 font-bold flex items-center gap-1.5 transition-all ${(schedule.nurse_work_type || 'HOSPITAL_STAFF') === 'HOSPITAL_STAFF'
                          ? 'bg-[#1456f0] text-white shadow-xs'
                          : 'text-tertiary hover:bg-gray-50'
                        }`}
                    >
                      <span className="material-symbols-outlined text-sm">local_hospital</span>
                      พยาบาลประจำ รพ. (ลงตามใบเวร)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSchedule(prev => ({ ...prev, nurse_work_type: 'FREELANCE' }))}
                      className={`px-3 py-2 font-bold flex items-center gap-1.5 transition-all ${schedule.nurse_work_type === 'FREELANCE'
                          ? 'bg-[#1456f0] text-white shadow-xs'
                          : 'text-tertiary hover:bg-gray-50'
                        }`}
                    >
                      <span className="material-symbols-outlined text-sm">event_repeat</span>
                      รับงานประจำสัปดาห์ (จันทร์-ศุกร์)
                    </button>
                  </div>
                </div>

                {/* กรณีเลือก พยาบาลประจำโรงพยาบาล (Hospital Staff - ลงตามใบเวร รพ.) */}
                {(schedule.nurse_work_type || 'HOSPITAL_STAFF') === 'HOSPITAL_STAFF' ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50/70 border border-[#1456f0]/30 rounded-xl text-xs text-[#1456f0] flex items-start gap-2">
                      <span className="material-symbols-outlined text-base mt-0.5">info</span>
                      <div className="leading-relaxed">
                        <strong>ลงตารางเวร รพ. ประจำเดือน:</strong> อ้างอิงตามใบเวรจริง สามารถเลือกกะเวรในแต่ละวันผ่านปฏิทินได้โดยตรง ระบบจะแปลงเป็นเวลาว่างรับงาน Home Care ให้ลูกค้าเห็นโดยอัตโนมัติ (และจะแจ้งเตือนทันทีหากกะที่เลือกลงทับซ้อนกับคิวงานที่รับไว้แล้ว)
                      </div>
                    </div>

                    <NurseHospitalRosterCalendar
                      isEditing={true}
                      hospitalSchedule={schedule.hospital_code_schedule || {}}
                      onChangeSchedule={(newSchedule) => setSchedule(prev => ({ ...prev, hospital_code_schedule: newSchedule }))}
                      appointments={appointments}
                    />
                  </div>
                ) : (
                  /* กรณีเลือก รับงานประจำสัปดาห์ (Freelance) */
                  <div className="space-y-6">
                    {/* ส่วนที่ 3.1: กะเวรมาตรฐานวิชาชีพพยาบาล (8 ชั่วโมง & 12 ชั่วโมง) */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-on-surface-variant">
                          กะเวรที่สะดวกรับงาน (เลือกได้มากกว่า 1 กะ) <span className="text-[#DC3545]">*</span>
                        </label>
                        <span className="text-xs text-tertiary">
                          เลือกแล้ว: <strong className="text-[#1456f0]">{schedule.shifts?.length || 0}</strong> กะ
                        </span>
                      </div>

                      {/* แจ้งเตือนช่วงเวลากะทับซ้อนกันในโหมดฟรีแลนซ์ */}
                      {freelanceOverlaps.length > 0 && (
                        <div className="p-3.5 mb-4 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-1.5 text-xs text-amber-950 shadow-xs animate-in fade-in duration-150">
                          <div className="flex items-center gap-2 font-bold text-amber-900">
                            <span className="material-symbols-outlined text-lg text-amber-600">warning</span>
                            แจ้งเตือน: ท่านได้เลือกกะที่มีช่วงเวลาทับซ้อนกัน ({freelanceOverlaps.length} คู่กะ)
                          </div>
                          <ul className="space-y-1 pl-6 list-disc text-amber-800 leading-relaxed">
                            {freelanceOverlaps.map((item, idx) => (
                              <li key={idx}>
                                <strong>{item.nameA}</strong> กับ <strong>{item.nameB}</strong>: {item.message}
                              </li>
                            ))}
                          </ul>
                          <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200">
                            💡 ระบบจะช่วยแนะนำให้ผู้รับบริการจองกะที่ไม่ทับซ้อนกันในวันเดียวกัน เพื่อป้องกันปัญหาการปฏิบัติงานซ้ำซ้อน
                          </p>
                        </div>
                      )}

                      {/* กลุ่ม 8 ชั่วโมง */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-tertiary bg-gray-100 px-2 py-0.5 rounded-xl">
                            ระบบกะ 8 ชั่วโมง (เวรเช้า / บ่าย / ดึก)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {SHIFT_DEFINITIONS.filter(s => s.category === '8_HOURS').map(shift => {
                            const isChecked = (schedule.shifts || []).includes(shift.id)
                            return (
                              <label
                                key={shift.id}
                                className={`p-3.5 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${isChecked
                                    ? 'bg-[#1456f0]/10 border-[#1456f0] ring-2 ring-[#1456f0]/20'
                                    : 'bg-white border-[#ced4da] hover:bg-[#F8F9FA]'
                                  }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-lg text-[#1456f0]">{shift.icon}</span>
                                      {shift.name}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleShift(shift.id)}
                                      className="w-4 h-4 text-[#1456f0] rounded-xl border-[#ced4da] focus:ring-[#1456f0]"
                                    />
                                  </div>
                                  <p className="text-xs font-semibold text-primary mb-1">
                                    ⏱ {shift.time}
                                  </p>
                                  <p className="text-[11px] text-tertiary leading-relaxed">
                                    {shift.description}
                                  </p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>

                      {/* กลุ่ม 12 ชั่วโมง */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-tertiary bg-gray-100 px-2 py-0.5 rounded-xl">
                            ระบบกะยาว 12 ชั่วโมง (กะกลางวัน / กะกลางคืน - สำหรับเฝ้าไข้ต่อเนื่อง)
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {SHIFT_DEFINITIONS.filter(s => s.category === '12_HOURS').map(shift => {
                            const isChecked = (schedule.shifts || []).includes(shift.id)
                            return (
                              <label
                                key={shift.id}
                                className={`p-3.5 border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${isChecked
                                    ? 'bg-[#1456f0]/10 border-[#1456f0] ring-2 ring-[#1456f0]/20'
                                    : 'bg-white border-[#ced4da] hover:bg-[#F8F9FA]'
                                  }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-sm text-on-surface flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-lg text-[#1456f0]">{shift.icon}</span>
                                      {shift.name}
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleShift(shift.id)}
                                      className="w-4 h-4 text-[#1456f0] rounded-xl border-[#ced4da] focus:ring-[#1456f0]"
                                    />
                                  </div>
                                  <p className="text-xs font-semibold text-primary mb-1">
                                    ⏱ {shift.time}
                                  </p>
                                  <p className="text-[11px] text-tertiary leading-relaxed">
                                    {shift.description}
                                  </p>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* ส่วนที่ 3.2: วันในสัปดาห์ที่พร้อมรับงาน */}
                    <div>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-on-surface-variant">
                          วันในสัปดาห์ที่สะดวกรับงาน
                        </label>
                        <div className="flex gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSelectDaysPreset('all')}
                            className="px-2.5 py-1 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] rounded-xl font-semibold text-tertiary hover:text-primary transition-all"
                          >
                            ทุกวัน
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectDaysPreset('weekdays')}
                            className="px-2.5 py-1 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] rounded-xl font-semibold text-tertiary hover:text-primary transition-all"
                          >
                            จันทร์-ศุกร์
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectDaysPreset('weekend')}
                            className="px-2.5 py-1 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] rounded-xl font-semibold text-tertiary hover:text-primary transition-all"
                          >
                            เสาร์-อาทิตย์
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {ALL_DAYS.map(day => {
                          const isSelected = (schedule.days || []).includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleDay(day)}
                              className={`py-2 text-center text-xs font-bold rounded-xl border transition-all ${isSelected
                                  ? 'bg-[#1456f0] text-white border-[#1456f0] shadow-sm'
                                  : 'bg-white border-[#ced4da] text-[#343A40] hover:bg-gray-50'
                                }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* ปฏิทินระบุวันหยุดส่วนตัวเพิ่มเติม (ปิดรับงานเฉพาะวัน) */}
                    <div className="pt-4 border-t border-[#ced4da] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-rose-600 text-base">event_busy</span>
                            ปฏิทินระบุวันหยุดส่วนตัว / ปิดรับงานเฉพาะวัน (Personal Days-Off)
                          </label>
                          <p className="text-xs text-tertiary mt-0.5">
                            สามารถคลิกเลือกวันที่ในปฏิทินด้านล่างเป็น <strong>[หยุด: วันหยุดส่วนตัว]</strong> เพื่อปิดรับงานในวันที่ต้องการพักผ่อน
                          </p>
                        </div>
                      </div>

                      <NurseHospitalRosterCalendar
                        isEditing={true}
                        hospitalSchedule={schedule.hospital_code_schedule || {}}
                        onChangeSchedule={(newSchedule) => setSchedule(prev => ({ ...prev, hospital_code_schedule: newSchedule }))}
                        appointments={appointments}
                      />
                    </div>
                  </div>
                )}

                {/* ส่วนที่ 3.3: หมายเหตุเวลาว่างเพิ่มเติม */}
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant block mb-1">
                    หมายเหตุตารางเวร / เวลาว่างเพิ่มเติม (Shift Notes)
                  </label>
                  <textarea
                    rows={3}
                    value={schedule.trade_note || ''}
                    onChange={(e) => setSchedule({ ...schedule, trade_note: e.target.value })}
                    placeholder="เช่น ทำงานประจำ รพ.นครพิงค์ ว่างรับเคส Home Care ช่วงหลัง 16.30 น. เป็นต้นไป หรือวัน Off..."
                    className="w-full p-3 bg-white border border-[#ced4da] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all resize-none"
                  />
                  <p className="text-[11px] text-tertiary mt-1">
                    💡 ข้อความนี้จะแสดงในโปรไฟล์เพื่อให้ผู้ขอรับบริการและเจ้าหน้าที่ทราบข้อมูลเวลาว่างของคุณ
                  </p>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#ced4da]">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] text-[#343A40] rounded-xl font-semibold text-sm transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-[#1456f0] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      บันทึกข้อมูลโปรไฟล์
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================
               VIEW MODE (แสดงโปรไฟล์และตารางเวร)
               ======================================================== */
            <div className="space-y-6">

              {/* หมวด 1: ข้อมูลการติดต่อ */}
              <section className="bg-white border border-[#ced4da] p-5 rounded-xl space-y-4">
                <div className="border-b border-[#ced4da] pb-2">
                  <h3 className="font-bold text-base text-primary headline-font flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">contacts</span>
                    ข้อมูลติดต่อและการเงิน
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-tertiary block text-xs">เบอร์โทรศัพท์:</span>
                    <span className="font-semibold text-on-surface">{profile?.phone || '-'}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block text-xs">บัญชีธนาคารรับเงิน:</span>
                    <span className="font-semibold text-on-surface">
                      {profile?.bank_name ? `${profile.bank_name} ` : ''}
                      <span className="font-mono text-primary font-bold">({profile?.bank_account_no || '-'})</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-tertiary block text-xs">พื้นที่ให้บริการ:</span>
                    <span className="font-semibold text-on-surface">{profile?.service_area || '-'}</span>
                  </div>
                  <div>
                    <span className="text-tertiary block text-xs">รูปแบบการรับงานหลัก:</span>
                    <span className="font-semibold text-primary">
                      {profile?.availability_type === 'HOSPITAL_OFF_DUTY' ? 'พยาบาลประจำโรงพยาบาล (รับงานนอกเวลา / วัน Off รพ.)' :
                        profile?.availability_type === 'FLEXIBLE' ? 'เวลายืดหยุ่น / ตามตกลง (Flexible)' :
                          profile?.availability_type === 'WEEKEND_ONLY' ? 'เฉพาะวันหยุด/เสาร์-อาทิตย์ (Weekend Only)' :
                            'รับงานเวลาตายตัวตามรอบเวร (Fixed Shift)'}
                    </span>
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <LocationPicker
                      lat={profile?.latitude || form.latitude}
                      lng={profile?.longitude || form.longitude}
                      readOnly={true}
                      showRadiusCircle={true}
                      radiusKm={profile?.service_radius_km || form.service_radius_km || 10}
                      height="220px"
                      label={`พิกัดที่ตั้งและขอบเขตพื้นที่ให้บริการ (รัศมี ${profile?.service_radius_km || 10} กม. รอบที่พัก)`}
                    />
                  </div>
                </div>
              </section>

              {/* หมวด 2: ตารางเวรและความพร้อมรับงาน (Shift Schedule Card) */}
              <section id="roster-calendar-section" className="bg-white border border-[#ced4da] p-5 rounded-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ced4da] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1456f0] text-2xl">calendar_month</span>
                    <div>
                      <h3 className="font-bold text-lg text-on-surface headline-font">
                        ตารางเวรและความพร้อมรับงาน (Duty & Availability Calendar)
                      </h3>
                      <p className="text-xs text-tertiary">
                        {(schedule.nurse_work_type || 'HOSPITAL_STAFF') === 'HOSPITAL_STAFF'
                          ? 'ปฏิทินตารางเวรโรงพยาบาลและคิวงานดูแลผู้ป่วยประจำเดือน'
                          : 'กะเวลาและวันที่พยาบาลเปิดรับงานดูแลผู้ป่วย'}
                      </p>
                    </div>
                  </div>
                  {(schedule.nurse_work_type || 'HOSPITAL_STAFF') === 'HOSPITAL_STAFF' && (
                    <span className="text-xs bg-[#1456f0]/10 text-[#1456f0] px-2.5 py-1 rounded-xl font-semibold border border-[#1456f0]/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">local_hospital</span>
                      ตารางเวรโรงพยาบาล
                    </span>
                  )}
                </div>

                {/* ปฏิทินรายเดือนแสดงเวร รพ. และคิวงาน */}
                <NurseHospitalRosterCalendar
                  isEditing={false}
                  hospitalSchedule={schedule.hospital_code_schedule || {}}
                  appointments={appointments}
                />

                {/* กะเวรที่เปิดรับ */}
                <div>
                  <h4 className="text-xs font-bold text-tertiary mb-2.5">
                    กะเวรที่สะดวกรับงาน ({schedule.shifts?.length || 0} กะ):
                  </h4>
                  {(!schedule.shifts || schedule.shifts.length === 0) ? (
                    <p className="text-xs text-tertiary italic bg-gray-50 p-3 rounded-xl">
                      ยังไม่ได้ระบุกะเวรที่สะดวก กรุณากด "แก้ไขข้อมูล" เพื่อเลือกกะเวร
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {SHIFT_DEFINITIONS.filter(s => (schedule.shifts || []).includes(s.id)).map(shift => (
                        <div
                          key={shift.id}
                          className="p-3 bg-[#F8F9FA] border border-[#ced4da] rounded-xl flex items-start gap-2.5"
                        >
                          <span className="material-symbols-outlined text-xl text-[#1456f0] mt-0.5">{shift.icon}</span>
                          <div>
                            <p className="font-bold text-xs text-on-surface">{shift.name}</p>
                            <p className="text-xs text-[#1456f0] font-semibold mt-0.5">⏱ {shift.time}</p>
                            <p className="text-[11px] text-tertiary mt-1 leading-snug">{shift.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* วันในสัปดาห์ */}
                <div>
                  <h4 className="text-xs font-bold text-tertiary mb-2">
                    วันในสัปดาห์ที่พร้อมรับงาน:
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_DAYS.map(day => {
                      const isAvailable = (schedule.days || []).includes(day)
                      return (
                        <span
                          key={day}
                          className={`px-3 py-1 text-xs font-semibold rounded-xl border ${isAvailable
                              ? 'bg-[#1456f0]/10 text-[#1456f0] border-[#1456f0]/30 font-bold'
                              : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                            }`}
                        >
                          {day}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* หมายเหตุตารางเวร */}
                {schedule.trade_note && (
                  <div className="bg-[#F8F9FA] border border-[#ced4da] p-3.5 rounded-xl">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-on-surface mb-1">
                      <span className="material-symbols-outlined text-base text-[#1456f0]">info</span>
                      หมายเหตุตารางเวร / เวลาว่างเพิ่มเติม:
                    </div>
                    <p className="text-xs text-on-surface whitespace-pre-line pl-6">
                      {schedule.trade_note}
                    </p>
                  </div>
                )}

                <div className="pt-2 text-right">
                  <p className="text-[11px] text-tertiary">
                    🔄 สามารถกด <strong>"แก้ไขข้อมูล / อัปเดตตารางเวร"</strong> ด้านบนเพื่อปรับเปลี่ยนวันและกะเวลาได้ตลอดเวลา
                  </p>
                </div>
              </section>

            </div>
          )}

        </div>
      </main>
    </div>
  )
}
