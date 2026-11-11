import Navbar from "../components/Navbar.jsx"
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import useFormSession from '../hooks/useFormSession.js'
import FormStepper from '../components/FormStepper.jsx'
import LocationPicker from '../components/LocationPicker.jsx'
import { STANDARD_SHIFTS, getShiftLabel } from '../data/shiftDefinitions.js'
import { formatDate } from '../utils/formatDate.js'

// ฟังก์ชันวิเคราะห์อาการของผู้ป่วยและจับคู่กับประเภทบริการ (Clinical Symptom-to-Service Mapping)
function findMatchingServicesForPatient(patient, serviceTypes) {
  if (!patient || !serviceTypes || serviceTypes.length === 0) return []
  const hp = patient.health_profile || {}
  const complaints = Array.isArray(hp.chief_complaint)
    ? hp.chief_complaint.join(' ').toLowerCase()
    : (hp.chief_complaint || '').toLowerCase()
  const assistance = (hp.current_assistance || '').toLowerCase()
  const disease = (hp.congenital_disease || '').toLowerCase()
  const customText = complaints.includes('other:') ? complaints.substring(complaints.indexOf('other:') + 6) : ''
  const customMatches = (keywords) => Boolean(customText) && keywords.some(keyword => customText.includes(keyword))

  const matches = []
  const findService = (snippet) => serviceTypes.find(t => (t.typeName || t.type_name || '').includes(snippet))

  // 1. แผลกดทับ / แผลผ่าตัด (RN)
  if (complaints.includes('wound_care') || complaints.includes('แผล') || assistance.includes('แผล') || customMatches(['แผล', 'เย็บ', 'ตัดไหม', 'ล้างแผล', 'wound', 'dressing'])) {
    const s = findService('ดูแลแผลกดทับ')
    if (s) matches.push({ service: s, reason: customMatches(['แผล', 'เย็บ', 'ตัดไหม', 'ล้างแผล', 'wound', 'dressing']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับบาดแผล/การทำแผล' : 'มีแผลเรื้อรัง / แผลกดทับ / แผลผ่าตัด', priority: 1, icon: 'healing' })
  }

  // 2. เจาะน้ำตาล / ฉีดอินซูลิน (RN)
  if (complaints.includes('insulin_injection') || complaints.includes('อินซูลิน') || complaints.includes('dtx') || disease.includes('เบาหวาน') || customMatches(['อินซูลิน', 'เจาะน้ำตาล', 'dtx', 'insulin'])) {
    const s = findService('เจาะน้ำตาล DTX')
    if (s) matches.push({ service: s, reason: customMatches(['อินซูลิน', 'เจาะน้ำตาล', 'dtx', 'insulin']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับเบาหวาน/การฉีดอินซูลิน' : 'ผู้ป่วยเบาหวาน เจาะน้ำตาล DTX และฉีดอินซูลิน', priority: 2, icon: 'vaccines' })
  }

  // 3. ท่อเจาะคอ / พ่นยา / ออกซิเจน (RN)
  if (complaints.includes('oxygen_dependent') || complaints.includes('suction_needed') || complaints.includes('ventilator_user') || complaints.includes('เจาะคอ') || complaints.includes('ออกซิเจน') || assistance.includes('เจาะคอ') || assistance.includes('ventilator') || customMatches(['พ่นยา', 'ออกซิเจน', 'เจาะคอ', 'ดูดเสมหะ', 'oxygen', 'suction'])) {
    const s = findService('ดูแลท่อเจาะคอ')
    if (s) matches.push({ service: s, reason: customMatches(['พ่นยา', 'ออกซิเจน', 'เจาะคอ', 'ดูดเสมหะ', 'oxygen', 'suction']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับท่อเจาะคอ/พ่นยา/ออกซิเจน' : 'มีภาวะออกซิเจนต่ำ / ต้องพ่นยา / ดูแลท่อเจาะคอ', priority: 3, icon: 'air' })
  }

  // 4. สายให้อาหาร / สายสวน / สายระบาย (RN)
  if (complaints.includes('tube_feeding') || complaints.includes('urinary_catheter') || complaints.includes('drainage_care') || complaints.includes('ostomy_care') || assistance.includes('สาย') || assistance.includes('tube') || assistance.includes('catheter') || customMatches(['สายยาง', 'สายอาหาร', 'สายสวน', 'สายระบาย', 'ทวารเทียม', 'catheter', 'tube'])) {
    const s = findService('เปลี่ยนสายให้อาหาร')
    if (s) matches.push({ service: s, reason: customMatches(['สายยาง', 'สายอาหาร', 'สายสวน', 'สายระบาย', 'ทวารเทียม', 'catheter', 'tube']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับสายอุปกรณ์/สายสวน' : 'ต้องดูแลหรือเปลี่ยนสายให้อาหาร / สายสวนปัสสาวะ / สายระบาย', priority: 4, icon: 'water_drop' })
  }

  // 5. เจาะเลือด / ให้น้ำเกลือ (RN)
  if (complaints.includes('oncology_care') || complaints.includes('เจาะเลือด') || complaints.includes('น้ำเกลือ') || customMatches(['เจาะเลือด', 'น้ำเกลือ', 'สารน้ำ', 'iv', 'ฉีดยา'])) {
    const s = findService('เจาะเลือด')
    if (s) matches.push({ service: s, reason: customMatches(['เจาะเลือด', 'น้ำเกลือ', 'สารน้ำ', 'iv', 'ฉีดยา']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับการเจาะเลือด/สารน้ำ' : 'ต้องการเจาะเลือด / สารน้ำ / ยาตามคำสั่งแพทย์', priority: 5, icon: 'bloodtype' })
  }

  // 6. กายภาพบำบัด / ฟื้นฟู (PN/RN)
  if (complaints.includes('rehab_need') || complaints.includes('stroke_care') || complaints.includes('กายภาพ') || complaints.includes('พยุงเดิน') || disease.includes('stroke') || disease.includes('หลอดเลือดสมอง') || customMatches(['กายภาพ', 'พยุงเดิน', 'อ่อนแรง', 'อัมพฤกษ์', 'rehab'])) {
    const s = findService('กายภาพบำบัด')
    if (s) matches.push({ service: s, reason: customMatches(['กายภาพ', 'พยุงเดิน', 'อ่อนแรง', 'อัมพฤกษ์', 'rehab']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับการฟื้นฟู/กายภาพ' : 'ต้องการคนช่วยพยุงเดิน / ฝึกกายภาพ / ฟื้นฟูหลอดเลือดสมอง', priority: 6, icon: 'directions_walk' })
  }

  // 7. ผู้ป่วยติดเตียง / สุขอนามัย (CG/PN/RN)
  if (complaints.includes('bedridden_hygiene') || complaints.includes('ติดเตียง') || assistance.includes('ติดเตียง') || (hp.adl_score && hp.adl_score.includes('ติดเตียง')) || customMatches(['ติดเตียง', 'พลิกตัว', 'กลั้นขับถ่าย'])) {
    const s = findService('ดูแลผู้ป่วยติดเตียง')
    if (s) matches.push({ service: s, reason: customMatches(['ติดเตียง', 'พลิกตัว', 'กลั้นขับถ่าย']) ? 'ตรงกับอาการเพิ่มเติมที่ระบุเกี่ยวกับผู้ป่วยติดเตียง' : 'ผู้ป่วยติดเตียง / กลั้นขับถ่ายไม่ได้ / ต้องพลิกตัวทุก 2 ชม.', priority: 7, icon: 'bed' })
  }

  // 8. เฝ้าไข้ดูแลทั่วไป (CG/PN/RN)
  if (complaints.includes('dementia') || complaints.includes('delirium') || complaints.includes('depression') || complaints.includes('สมองเสื่อม') || complaints.includes('หลงลืม')) {
    const s = findService('เฝ้าไข้ดูแลทั่วไป')
    if (s) matches.push({ service: s, reason: 'มีภาวะหลงลืม / สับสน / ต้องการการเฝ้าระวังดูแลใกล้ชิด', priority: 8, icon: 'health_and_safety' })
  }

  // 9. ดูแลผู้สูงอายุ (CG/PN/RN)
  if (matches.length === 0 || complaints.includes('medication_management') || complaints.includes('hospital_escort')) {
    const s = findService('ดูแลผู้สูงอายุ')
    if (s && !matches.some(m => (m.service.id || m.service.service_type_id) === (s.id || s.service_type_id))) {
      matches.push({ service: s, reason: 'ดูแลกิจวัตรประจำวันทั่วไป (ADL) / พยุงเดิน / จัดยา', priority: 9, icon: 'elderly' })
    }
  }

  return matches
}

export default function RequestServicePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nurseId = searchParams.get('nurse_id') || ''

  const [patients, setPatients] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [servicePackages, setServicePackages] = useState([])
  const [nurseProfile, setNurseProfile] = useState(null)

  const incomingStartDate = searchParams.get('start_date') || ''
  const incomingEndDate = searchParams.get('end_date') || incomingStartDate
  const incomingShift = searchParams.get('shift') || searchParams.get('time_slot') || ''
  const incomingPatientId = searchParams.get('patient_id') || (searchParams.get('patient_ids') ? searchParams.get('patient_ids').split(',')[0].trim() : '')
  const incomingAddress = searchParams.get('address') || ''
  const incomingLat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null
  const incomingLng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null
  const incomingPatientIds = searchParams.get('patient_ids') || ''
  const incomingDateMode = searchParams.get('date_mode') === 'weekly' ? 'weekly' : 'range'
  const incomingWeeklyDays = (searchParams.get('weekly_days') || '').split(',').filter(Boolean)
  const incomingWeeksCount = Number(searchParams.get('weeks_count')) || 1

  const initialForm = {
    patient_id: incomingPatientId,
    nurse_id: nurseId,
    service_type_id: '',
    package_id: '',
    start_date: incomingStartDate,
    end_date: incomingEndDate,
    time_slot: incomingShift,
    service_address: incomingAddress,
    latitude: incomingLat,
    longitude: incomingLng,
    special_precautions: '',
    additional_notes: incomingPatientIds && incomingPatientIds.includes(',') ? `[เคสดูแลผู้ป่วยร่วมกันหลายท่าน: ID ${incomingPatientIds}]` : '',
  }

  // แยก session key ตามบัญชีผู้ใช้เพื่อความปลอดภัยและไม่ใช้ draft ข้ามคน
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'
    } catch {
      return 'guest'
    }
  })()

  // ใช้งาน Form Session เก็บข้อมูลใน sessionStorage ชั่วคราว
  // จะไม่บันทึกลงฐานข้อมูลจนกว่าจะกดส่งในขั้นตอนสุดท้าย
  const {
    form,
    setForm,
    step,
    setStep,
    nextStep,
    prevStep,
    extra,
    setExtra,
    hasDraft,
    clearSession,
  } = useFormSession({
    sessionKey: `request_service_draft_${currentUserId}`,
    initialForm,
    initialStep: 1,
    totalSteps: 3,
    extraInitial: {
      dateMode: incomingDateMode,
      weeklyDays: incomingWeeklyDays,
      weeklyCount: incomingWeeksCount,
      multiDates: [],
      woundQuestions: { q1: false, q2: false, q3: false, q4: false },
    }
  })

  // Date Mode State
  const dateMode = extra.dateMode || 'range'
  const weeklyDays = extra.weeklyDays || []
  const weeklyCount = extra.weeklyCount || 1
  const multiDates = extra.multiDates || []
  const woundQuestions = extra.woundQuestions || { q1: false, q2: false, q3: false, q4: false }

  const setDateMode = (mode) => setExtra((prev) => ({ ...prev, dateMode: mode }))
  const setWeeklyDays = (days) => setExtra((prev) => ({ ...prev, weeklyDays: typeof days === 'function' ? days(prev.weeklyDays || []) : days }))
  const setWeeklyCount = (count) => setExtra((prev) => ({ ...prev, weeklyCount: count }))
  const setMultiDates = (dates) => setExtra((prev) => ({ ...prev, multiDates: typeof dates === 'function' ? dates(prev.multiDates || []) : dates }))
  const setWoundQuestions = (q) => setExtra((prev) => ({ ...prev, woundQuestions: typeof q === 'function' ? q(prev.woundQuestions || {}) : q }))

  const [multiDateInput, setMultiDateInput] = useState('')
  const [woundPhoto, setWoundPhoto] = useState(null)
  const [woundPhotoPreview, setWoundPhotoPreview] = useState(null)
  const [isChangingPatient, setIsChangingPatient] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [showAllServices, setShowAllServices] = useState(false)
  const [bookingType, setBookingType] = useState(searchParams.get('booking_type') || '')
  const [serviceTime, setServiceTime] = useState(searchParams.get('service_time') || '')
  const [monthlyPlan, setMonthlyPlan] = useState(searchParams.get('monthly_plan') || '')

  // รายชื่อ ID ผู้ป่วยที่ส่งต่อมาจากหน้าค้นหา
  const preselectedPatientIds = useMemo(() => {
    const raw = searchParams.get('patient_ids') || searchParams.get('patient_id') || ''
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }, [searchParams])

  // ค้นหาข้อมูลคนไข้ที่ตรงกับ ID ที่เลือกมาจากหน้าค้นหา
  const matchedPatients = useMemo(() => {
    if (preselectedPatientIds.length > 0 && patients.length > 0) {
      return patients.filter(p => preselectedPatientIds.includes(String(p.id || p.patient_id)))
    }
    return []
  }, [patients, preselectedPatientIds])

  // วันที่และรูปแบบการจองจากหน้าค้นหา ให้มีสิทธิ์เหนือ draft เก่าใน sessionStorage
  const incomingSchedule = useMemo(() => {
    const mode = searchParams.get('date_mode') || ''
    const booking = searchParams.get('booking_type') || ''
    const start = searchParams.get('start_date') || ''
    let end = searchParams.get('end_date') || ''
    if (booking === 'monthly' && start && !end) {
      const monthlyEnd = new Date(`${start}T00:00:00`)
      monthlyEnd.setDate(monthlyEnd.getDate() + 29)
      end = monthlyEnd.toISOString().split('T')[0]
    }
    const weekdayAliases = {
      'จันทร์': 'จ', 'อังคาร': 'อ', 'พุธ': 'พ', 'พฤหัสบดี': 'พฤหัส',
      'ศุกร์': 'ศ', 'เสาร์': 'ส', 'อาทิตย์': 'อา'
    }
    const weekly = (searchParams.get('weekly_days') || '')
      .split(',').map(day => weekdayAliases[day] || day).filter(Boolean)
    return { booking, mode, start, end, weekly, weeks: Number(searchParams.get('weeks_count')) || 1 }
  }, [searchParams])

  // กำหนดกะเวลามาตรฐานของระบบ Home Care
  const standardShifts = STANDARD_SHIFTS
  const getShiftDisplayLabel = getShiftLabel

  const stepsList = [
    { title: 'ผู้ป่วยและบริการ' },
    { title: 'วัน-เวลาและสถานที่' },
    { title: 'สรุปและยืนยัน' },
  ]

  // คำนวณจำนวนวันทั้งหมด
  const getTotalDays = () => {
    if (dateMode === 'range' && form.start_date && form.end_date) {
      const start = new Date(form.start_date)
      const end = new Date(form.end_date)
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
      return diff > 0 ? diff : 0
    }
    if (dateMode === 'weekly') {
      return weeklyDays.length * weeklyCount
    }
    if (dateMode === 'multi') {
      return multiDates.length
    }
    return 1
  }

  const totalDays = getTotalDays()

  // สร้างวันที่ทำงานจริงจากวันที่เริ่มต้น + วันในสัปดาห์ + จำนวนสัปดาห์
  const generatedWeeklyDates = useMemo(() => {
    if (dateMode !== 'weekly' || !form.start_date || weeklyDays.length === 0) return []
    const dayIndex = { 'จ': 1, 'อ': 2, 'พ': 3, 'พฤ': 4, 'ศ': 5, 'ส': 6, 'อา': 0 }
    const selectedIndexes = weeklyDays.map(day => dayIndex[day]).filter(index => index !== undefined)
    const start = new Date(`${form.start_date}T00:00:00`)
    const dates = []
    for (let offset = 0; offset < weeklyCount * 7; offset += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + offset)
      if (selectedIndexes.includes(date.getDay())) dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }, [dateMode, form.start_date, weeklyDays, weeklyCount])

  // วันที่ทั้งหมดที่เลือก (นำไปตรวจสอบเวร รพ. กับพยาบาล)
  const selectedDatesList = useMemo(() => {
    if (dateMode === 'weekly' && extra.multiDates && extra.multiDates.length > 0) {
      return extra.multiDates
    }
    if (dateMode === 'range' && form.start_date) {
      const list = []
      const start = new Date(form.start_date)
      const end = form.end_date ? new Date(form.end_date) : start
      const cur = new Date(start)
      let count = 0
      while (cur <= end && count < 60) {
        list.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
        count++
      }
      return list
    }
    if (dateMode === 'multi') {
      return multiDates
    }
    return form.start_date ? [form.start_date] : []
  }, [dateMode, form.start_date, form.end_date, multiDates])

  // ตรวจสอบตารางเวร รพ. แบบ Real-time (PDPA-Safe Warning)
  const shiftConflictWarning = useMemo(() => {
    if (!nurseProfile || !nurseProfile.shift_schedule) return false
    try {
      const sched = typeof nurseProfile.shift_schedule === 'string'
        ? JSON.parse(nurseProfile.shift_schedule)
        : nurseProfile.shift_schedule
      const roster = sched.hospital_code_schedule || {}
      if (selectedDatesList.length === 0) return false

      for (const d of selectedDatesList) {
        const [year, month, day] = d.split('-')
        const monthData = roster[`${year}-${month}`] || {}
        const code = monthData[String(Number(day))]
        if (!code) continue

        // 1. วันหยุดส่วนตัว หรือเวรดึก
        if (code === 'หยุด' || code === 'ด') return true

        // 2. เวรควบสองเวร (ช/บ, ชด, ด/บ, ฯลฯ)
        if (code.includes('/') || code.includes('ควบ') || code === 'ชด' || code.startsWith('ดด') || code.length > 2) return true

        // 3. กะที่ลูกค้าเลือกขัดแย้งกับเวร รพ.
        if (form.time_slot) {
          if ((code === 'ช' || code === 'ป') && (form.time_slot === 'morning_8h' || form.time_slot === 'day_12h')) return true
          if (code === 'บ' && (form.time_slot === 'afternoon_8h' || form.time_slot === 'night_12h')) return true
        }
      }
    } catch (e) {
      return false
    }
    return false
  }, [nurseProfile, selectedDatesList, form.time_slot])

  const selectedPackage = servicePackages.find(p => String(p.id || p.package_id) === String(form.package_id))
  const isMonthlyPkg = Boolean(selectedPackage && (selectedPackage.subscriptionType === 'Monthly' || bookingType === 'monthly'))

  // ตรวจสอบการจองซ้ำซ้อนกับคำขอที่กำลังดำเนินการอยู่ (Active Booking)
  const bookingConflictWarning = useMemo(() => {
    if (!nurseProfile || !nurseProfile.active_bookings || !selectedDatesList || selectedDatesList.length === 0) return null
    const bookings = nurseProfile.active_bookings
    const isMonthly = isMonthlyPkg || bookingType === 'monthly'

    for (const b of bookings) {
      let overlap = false
      if (b.service_dates && b.service_dates.length > 0) {
        overlap = b.service_dates.some(d => selectedDatesList.includes(d.trim()))
      } else if (b.start_date) {
        const bStart = b.start_date
        const bEnd = b.end_date || bStart
        overlap = selectedDatesList.some(d => d >= bStart && d <= bEnd)
      }

      if (overlap) {
        if (isMonthly) {
          return 'พยาบาลท่านนี้มีนัดหมายบริการแล้วในช่วงวันที่เลือก ไม่สามารถรับงานเหมาจ่ายรายเดือนได้'
        }
        if (b.is_monthly) {
          return 'พยาบาลท่านนี้ติดสัญญาเหมาจ่ายรายเดือนในช่วงเวลาดังกล่าว ไม่สามารถรับงานเพิ่มได้'
        }
        if (!form.time_slot || !b.time_slot || form.time_slot === b.time_slot) {
          return 'พยาบาลท่านนี้มีนัดหมายบริการในช่วงวันที่ทับซ้อนกันและช่วงเวลาเดียวกันแล้ว'
        }
      }
    }
    return null
  }, [nurseProfile, selectedDatesList, isMonthlyPkg, bookingType, form.time_slot])

  // ตรวจสอบวันหมดอายุใบอนุญาตประกอบวิชาชีพของพยาบาล (ต้องครอบคลุมจนถึงวันสิ้นสุดบริการ)
  const licenseExpireWarning = useMemo(() => {
    if (!nurseProfile || !nurseProfile.license_expire_date) return null
    const expDate = nurseProfile.license_expire_date
    const today = new Date().toISOString().split('T')[0]
    if (expDate < today) {
      return `ใบอนุญาตประกอบวิชาชีพของพยาบาลหมดอายุแล้ว (หมดอายุเมื่อ ${expDate}) ไม่สามารถรับงานได้`
    }
    const targetEnd = form.end_date || form.start_date
    const dates = (selectedDatesList && selectedDatesList.length > 0)
      ? selectedDatesList
      : (targetEnd ? [targetEnd] : [])
    const hasExceeded = dates.some(d => d > expDate) || (targetEnd && targetEnd > expDate)
    if (hasExceeded) {
      return `วันที่รับบริการ (ถึงวันที่ ${targetEnd}) เกินวันหมดอายุใบอนุญาตประกอบวิชาชีพของพยาบาล (หมดอายุวันที่ ${expDate}) ไม่สามารถจองช่วงเวลานี้ได้`
    }
    return null
  }, [nurseProfile, form.end_date, form.start_date, selectedDatesList])

  const handleWoundQuestionChange = (e) => {
    setWoundQuestions((prev) => ({ ...prev, [e.target.name]: e.target.checked }))
  }

  // แปลงรูปภาพแผลเป็น Base64 Data URL เพื่อบันทึกลงฐานข้อมูลจริง
  const handleWoundPhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, woundPhoto: 'ขนาดไฟล์ภาพต้องไม่เกิน 5MB' })
        return
      }
      setWoundPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setWoundPhotoPreview(reader.result) // Base64 Data URL
      }
      reader.readAsDataURL(file)
      if (errors.woundPhoto) setErrors({ ...errors, woundPhoto: '' })
    }
  }

  const selectedServiceType = serviceTypes.find(t => String(t.id || t.service_type_id) === String(form.service_type_id))
  const isWoundCare = selectedServiceType && (selectedServiceType.typeName === 'ดูแลแผลกดทับ / แผลผ่าตัด' || selectedServiceType.type_name === 'ดูแลแผลกดทับ / แผลผ่าตัด')

  const nurseHasSpecialty = nurseProfile && nurseProfile.specialty && nurseProfile.specialty.trim() !== ''

  // รายชื่อผู้ป่วยที่ใช้งานอยู่ในคำขอนี้ (รองรับทั้งคนเดียวและหลายท่าน)
  const activePatients = useMemo(() => {
    if (preselectedPatientIds.length > 0 && !isChangingPatient && matchedPatients.length > 0) {
      return matchedPatients
    }
    const single = patients.find(p => String(p.id || p.patient_id) === String(form.patient_id))
    return single ? [single] : []
  }, [preselectedPatientIds, isChangingPatient, matchedPatients, patients, form.patient_id])

  // คำนวณบริการที่ตรงกับอาการของผู้ป่วยแต่ละคน
  const patientRecommendations = useMemo(() => {
    if (activePatients.length === 0 || serviceTypes.length === 0) return []
    return activePatients.map(patient => {
      const matches = findMatchingServicesForPatient(patient, serviceTypes)
      return {
        patient,
        matches
      }
    })
  }, [activePatients, serviceTypes])

  // บริการแนะนำสำหรับการดูแลหลายท่านร่วมกันในบ้านเดียว
  const generalSharedService = useMemo(() => {
    if (activePatients.length <= 1) return null
    return serviceTypes.find(t => (t.typeName || t.type_name || '').includes('เฝ้าไข้ดูแลทั่วไป')) || serviceTypes[0]
  }, [activePatients, serviceTypes])

  // Auto-Select ประเภทบริการที่สอดคล้องกับอาการของผู้ป่วย
  useEffect(() => {
    if (serviceTypes.length === 0 || activePatients.length === 0) return
    if (!form.service_type_id) {
      for (const rec of patientRecommendations) {
        if (rec.matches.length > 0) {
          const topMatch = rec.matches[0].service
          const sId = topMatch.id || topMatch.service_type_id
          if (sId) {
            setForm(prev => ({ ...prev, service_type_id: sId }))
            return
          }
        }
      }
      const defaultSvc = serviceTypes.find(t => (t.typeName || t.type_name || '').includes('ดูแลผู้สูงอายุ')) || serviceTypes[0]
      if (defaultSvc) {
        setForm(prev => ({ ...prev, service_type_id: defaultSvc.id || defaultSvc.service_type_id }))
      }
    }
  }, [patientRecommendations, form.service_type_id, serviceTypes, activePatients.length])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    loadData()

    // รับค่าจาก URL Search Parameters เพื่อ Pre-fill ข้อมูลอัตโนมัติ
    const pId = searchParams.get('patient_id')
    const shift = searchParams.get('shift') || searchParams.get('time_slot')
    const dMode = searchParams.get('date_mode')
    const sDate = searchParams.get('start_date')
    const eDate = searchParams.get('end_date')
    const wDays = searchParams.get('weekly_days')
    const wCount = searchParams.get('weeks_count')
    const pIds = searchParams.get('patient_ids')
    const incomingBookingType = searchParams.get('booking_type') || ''
    const incomingServiceTime = searchParams.get('service_time') || ''
    const incomingMonthlyPlan = searchParams.get('monthly_plan') || ''
    const incomingLat = searchParams.get('lat')
    const incomingLng = searchParams.get('lng')
    const incomingAddress = searchParams.get('address')

    const initialPatientId = pId || (pIds ? pIds.split(',')[0].trim() : '')

    // วันที่จากหน้าค้นหาต้องเป็น source of truth เหนือ draft เดิมใน sessionStorage
    // โดย normalize single_visit ให้เป็น range 1 วัน เพื่อให้ฟอร์มเดิมแสดงค่าได้
    let incomingStartDate = sDate || ''
    let incomingEndDate = eDate || ''
    if (incomingBookingType === 'single_visit' || dMode === 'single') {
      incomingEndDate = incomingStartDate || incomingEndDate
    }
    if (incomingBookingType === 'monthly' && incomingStartDate && !incomingEndDate) {
      const monthlyEnd = new Date(`${incomingStartDate}T00:00:00`)
      monthlyEnd.setDate(monthlyEnd.getDate() + 29)
      incomingEndDate = monthlyEnd.toISOString().split('T')[0]
    }

    if (initialPatientId || shift || incomingStartDate || incomingEndDate || pIds || incomingBookingType) {
      setForm(prev => ({
        ...prev,
        patient_id: initialPatientId || prev.patient_id,
        time_slot: shift || prev.time_slot,
        start_date: incomingStartDate || prev.start_date,
        end_date: incomingEndDate || prev.end_date,
        service_address: incomingAddress || prev.service_address,
        latitude: incomingLat ? Number(incomingLat) : prev.latitude,
        longitude: incomingLng ? Number(incomingLng) : prev.longitude,
        additional_notes: pIds && pIds.includes(',') ? `[เคสดูแลผู้ป่วยร่วมกันหลายท่าน: ID ${pIds}]` : prev.additional_notes
      }))
    }
    if (incomingBookingType) setBookingType(incomingBookingType)
    if (incomingServiceTime) setServiceTime(incomingServiceTime)
    if (incomingMonthlyPlan) setMonthlyPlan(incomingMonthlyPlan)

    // SearchNursePage ส่ง date_mode=single สำหรับนัดรายครั้ง แต่หน้า request ใช้ range UI
    if (dMode) {
      setDateMode(dMode === 'weekly' ? 'weekly' : 'range')
    }
    if (wDays) {
      setWeeklyDays(wDays.split(','))
    }
    if (wCount) {
      setWeeklyCount(parseInt(wCount) || 1)
    }
    const generatedDates = searchParams.get('generated_dates')
    if (generatedDates) {
      setMultiDates(generatedDates.split(',').filter(Boolean))
    }
  }, [])

  const loadData = async () => {
    try {
      const patientsRes = await api.get('/member/patients')
      // แสดงเฉพาะผู้ป่วยที่กำลังรับการดูแล (ACTIVE)
      const patientList = (patientsRes.data || []).filter(p => (p.status || 'ACTIVE') === 'ACTIVE')
      setPatients(patientList)

      // ถ้ามี ID ผู้ป่วยจาก URL แต่ form ยังไม่มี ให้ตั้งค่าเป็นค่าเริ่มต้น
      const pId = searchParams.get('patient_id')
      const pIds = searchParams.get('patient_ids')
      const targetId = pId || (pIds ? pIds.split(',')[0].trim() : '')
      if (targetId) {
        setForm(prev => ({
          ...prev,
          patient_id: prev.patient_id || targetId
        }))
      }

      const typesRes = await api.get('/service-requests/types')
      const typesList = typesRes.data?.types || []
      const pkgs = typesRes.data?.packages || []
      setServiceTypes(typesList)
      setServicePackages(pkgs)

      // Auto-select package according to booking_type from URL or fallback to first package
      const incomingBookingType = searchParams.get('booking_type')
      const incomingShift = searchParams.get('shift')
      if (incomingBookingType === 'monthly') {
        const mPkg = pkgs.find(p => p.subscriptionType === 'Monthly' || (p.packageName || '').includes('รายเดือน'))
        if (mPkg) setForm(prev => ({ ...prev, package_id: prev.package_id || mPkg.id || mPkg.package_id }))
      } else if (incomingBookingType === 'shift' || incomingShift) {
        if (incomingShift === 'day_12h' || incomingShift === 'night_12h') {
          const p12 = pkgs.find(p => (p.packageName || '').includes('12'))
          if (p12) setForm(prev => ({ ...prev, package_id: prev.package_id || p12.id || p12.package_id }))
        } else {
          const pDefault = pkgs.find(p => (p.packageName || '').includes('4-6') || p.subscriptionType === 'Per Cycle')
          if (pDefault) setForm(prev => ({ ...prev, package_id: prev.package_id || pDefault.id || pDefault.package_id }))
        }
      } else {
        const defaultPkg = pkgs.find(p => (p.packageName || '').includes('รายครั้ง') || p.subscriptionType === 'Per Cycle') || pkgs[0]
        if (defaultPkg) {
          setForm(prev => ({ ...prev, package_id: prev.package_id || defaultPkg.id || defaultPkg.package_id }))
        }
      }

      // โหลดข้อมูลพยาบาลที่เลือก
      if (nurseId) {
        try {
          const nurseRes = await api.get(`/nurses/public-search?area=`)
          const allNurses = nurseRes.data || []
          const found = allNurses.find(n => (n.nurse_id || n.id) === nurseId)
          if (found) setNurseProfile(found)
        } catch (e) { /* ไม่เป็นไร */ }
      }

      // โหลดข้อมูลที่อยู่สมาชิกมาเป็นค่าเริ่มต้น
      try {
        const memberRes = await api.get('/member/profile')
        if (memberRes.data) {
          const m = memberRes.data
          setForm(prev => ({
            ...prev,
            service_address: prev.service_address || m.address || '',
            latitude: prev.latitude || (m.latitude ? Number(m.latitude) : null),
            longitude: prev.longitude || (m.longitude ? Number(m.longitude) : null),
          }))
        }
      } catch (e) { /* ignore */ }
    } catch (err) {
      setServerError('ไม่สามารถโหลดข้อมูลได้')
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  // จัดการการเปลี่ยนวันเริ่มต้น และอัปเดตวันสิ้นสุดตามประเภทการจองอัตโนมัติ
  const handleStartDateChange = (e) => {
    const val = e.target.value
    setForm(prev => {
      let updatedEnd = prev.end_date
      if (bookingType === 'monthly') {
        if (val) {
          const d = new Date(`${val}T00:00:00`)
          d.setDate(d.getDate() + 29)
          updatedEnd = d.toISOString().split('T')[0]
        }
      } else if (dateMode === 'weekly') {
        if (val) {
          const d = new Date(`${val}T00:00:00`)
          d.setDate(d.getDate() + (weeklyCount * 7) - 1)
          updatedEnd = d.toISOString().split('T')[0]
        }
      } else if (!updatedEnd || new Date(updatedEnd) < new Date(val)) {
        updatedEnd = val
      }
      return { ...prev, start_date: val, end_date: updatedEnd }
    })
    if (errors.start_date) setErrors(prev => ({ ...prev, start_date: '' }))
    if (errors.end_date) setErrors(prev => ({ ...prev, end_date: '' }))
  }

  // Multi-date helpers
  const addMultiDate = () => {
    if (multiDateInput && !multiDates.includes(multiDateInput)) {
      const today = new Date(); today.setHours(0,0,0,0)
      if (new Date(multiDateInput) >= today) {
        setMultiDates([...multiDates, multiDateInput].sort())
        setMultiDateInput('')
      }
    }
  }

  const removeMultiDate = (d) => {
    setMultiDates(multiDates.filter(dd => dd !== d))
  }

  const toggleWeeklyDay = (day) => {
    setWeeklyDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  // คำนวณราคาแบบ Real-time
  const [estimatedPrice, setEstimatedPrice] = useState(0)
  const [pricePerShift, setPricePerShift] = useState(0)

  useEffect(() => {
    let price = 0
    let isMonthly = false
    if (form.service_type_id) {
      const type = serviceTypes.find(t => String(t.id) === String(form.service_type_id))
      if (type && type.basePrice) price += type.basePrice
    }
    if (form.package_id) {
      const pkg = servicePackages.find(p => String(p.id) === String(form.package_id))
      if (pkg) {
        if (pkg.subscriptionType === 'Monthly' && pkg.pricePerMonth) {
          price = pkg.pricePerMonth
          isMonthly = true
        } else if (pkg.pricePerCycle) {
          price += pkg.pricePerCycle
        }
      }
    }
    setPricePerShift(price)
    setEstimatedPrice(isMonthly ? price : price * totalDays)
  }, [form.service_type_id, form.package_id, serviceTypes, servicePackages, totalDays])

  // --- Step 1 Validation ---
  const validateStep1 = () => {
    const errs = {}
    if (!form.patient_id) errs.patient_id = 'กรุณาเลือกผู้ป่วย'
    if (!form.service_type_id) errs.service_type_id = 'กรุณาเลือกประเภทบริการ'
    if (!form.package_id) {
      errs.package_id = 'กรุณาเลือกแพ็กเกจ/ราคา'
    } else if (isMonthlyPkg && nurseProfile && !nurseProfile.is_retired) {
      errs.package_id = 'แพ็กเกจเหมาจ่ายรายเดือนสงวนสิทธิ์สำหรับพยาบาลเกษียณอายุราชการเท่านั้น'
    }
    return errs
  }

  // --- Step 2 Validation ---
  const validateStep2 = () => {
    const errs = {}
    const today = new Date().toISOString().split('T')[0]

    if (dateMode === 'range') {
      if (!form.start_date) errs.start_date = 'กรุณาเลือกวันเริ่มต้น'
      else if (form.start_date < today) errs.start_date = 'วันเริ่มต้นต้องไม่ใช่วันที่ในอดีต'

      if (!form.end_date) errs.end_date = 'กรุณาเลือกวันสิ้นสุด'
      else if (form.end_date < today) errs.end_date = 'วันสิ้นสุดต้องไม่ใช่วันที่ในอดีต'
      else if (form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date)) {
        errs.end_date = 'วันสิ้นสุดต้องหลังวันเริ่มต้น'
      }
    } else if (dateMode === 'weekly') {
      if (weeklyDays.length === 0) errs.start_date = 'กรุณาเลือกวันในสัปดาห์อย่างน้อย 1 วัน'
      if (weeklyCount < 1) errs.start_date = 'กรุณาระบุจำนวนสัปดาห์'
    } else if (dateMode === 'multi') {
      if (multiDates.length === 0) errs.start_date = 'กรุณาเลือกวันอย่างน้อย 1 วัน'
      else if (multiDates.some(d => d < today)) errs.start_date = 'วันที่รับบริการต้องไม่เป็นวันที่ในอดีต'
    }

    if (!form.time_slot) errs.time_slot = 'กรุณาเลือกช่วงเวลา'
    if (!form.service_address.trim()) errs.service_address = 'กรุณากรอกที่อยู่สำหรับรับบริการ'
    if (isWoundCare && !woundPhotoPreview) errs.woundPhoto = 'กรุณาอัปโหลดรูปถ่ายแผลปัจจุบัน'
    if (licenseExpireWarning) {
      errs.start_date = licenseExpireWarning
    } else if (bookingConflictWarning) {
      errs.time_slot = bookingConflictWarning
    } else if (shiftConflictWarning) {
      errs.time_slot = 'ช่วงเวลาที่เลือกตรงกับตารางเวรโรงพยาบาลหรือวันหยุดของพยาบาล กรุณาเลือกวันหรือกะเวลาอื่น'
    }
    return errs
  }

  // ไปหน้าต่อไปจาก Step 1 -> Step 2 (ไม่บันทึกลงฐานข้อมูล)
  const handleNextFromStep1 = (e) => {
    e?.preventDefault()
    setServerError('')
    const vErrors = validateStep1()
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    nextStep()
  }

  // ไปหน้าต่อไปจาก Step 2 -> Step 3 (ไม่บันทึกลงฐานข้อมูล)
  const handleNextFromStep2 = (e) => {
    e?.preventDefault()
    setServerError('')
    const vErrors = validateStep2()
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrors({})
    nextStep()
  }

  // ยืนยันส่งคำขอรับบริการ (ขั้นตอนสุดท้าย: บันทึกลงฐานข้อมูลจริง)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(''); setSuccessMsg('')

    const s1Errors = validateStep1()
    const s2Errors = validateStep2()
    const allErrors = { ...s1Errors, ...s2Errors }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors)
      if (Object.keys(s1Errors).length > 0) setStep(1)
      else if (Object.keys(s2Errors).length > 0) setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors({}); setIsLoading(true)

    try {
      const isComplexWound = isWoundCare && (woundQuestions.q1 || woundQuestions.q2 || woundQuestions.q3 || woundQuestions.q4);
      const isMonthlyPkg = selectedPackage && (selectedPackage.subscriptionType === 'Monthly' || bookingType === 'monthly');

      const rollingDates = dateMode === 'weekly'
        ? ((multiDates && multiDates.length > 0) ? multiDates : generatedWeeklyDates)
        : (extra.multiDates && extra.multiDates.length > 0 ? extra.multiDates : [])

      const bookingPlanDesc = isMonthlyPkg
        ? 'เหมาจ่ายรายเดือน (ผู้ดูแลประจำคนเดียวตลอดสัญญา)'
        : dateMode === 'range'
        ? (form.start_date === form.end_date || !form.end_date
            ? `บริการรายครั้ง (วันที่ ${form.start_date})`
            : `ช่วงวันที่ ${form.start_date} ถึง ${form.end_date}`)
        : dateMode === 'multi'
        ? `เลือกหลายวัน (วันที่นัด: ${selectedDatesList.join(', ')})`
        : `รายสัปดาห์ ${weeklyDays.join(',')} x ${weeklyCount} สัปดาห์ (วันที่นัด: ${rollingDates.join(', ')})`

      const payload = {
        ...form,
        start_date: rollingDates.length > 0 ? rollingDates[0] : dateMode === 'range' ? form.start_date : (dateMode === 'multi' && multiDates.length > 0 ? multiDates[0] : form.start_date || new Date().toISOString().split('T')[0]),
        end_date: rollingDates.length > 0 ? rollingDates[rollingDates.length - 1] : form.end_date,
        service_dates: rollingDates.length > 0 ? rollingDates : (dateMode === 'range' ? selectedDatesList : [form.start_date]),
        total_price: estimatedPrice,
        service_count: isMonthlyPkg ? 30 : (rollingDates.length > 0 ? rollingDates.length : totalDays),
        is_complex_wound: isComplexWound,
        wound_photo_url: woundPhotoPreview || null,
        additional_notes: [
          form.additional_notes?.trim(),
          `[รูปแบบการให้บริการ: ${bookingPlanDesc}]`
        ].filter(Boolean).join('\n')
      }
      await api.post('/service-requests', payload)

      // ล้างข้อมูล Session เมื่อกระบวนการเสร็จสมบูรณ์
      clearSession()

      setSuccessMsg('ส่งคำขอรับบริการสำเร็จ! กรุณารอการตอบรับจากพยาบาล')
      setTimeout(() => navigate('/member/service-status'), 2000)
    } catch (err) {
      setServerError(err.response?.data?.message || 'กรุณากรอกข้อมูลการขอรับบริการให้ครบถ้วนและถูกต้อง')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  const ErrorLabel = ({ field }) => errors[field] ? (
    <p className="text-[#DC3545] text-xs mt-1 flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">warning</span>{errors[field]}
    </p>
  ) : null

  if (isFetching) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  const dayLabels = [
    { key: 'จ', label: 'จันทร์' },
    { key: 'อ', label: 'อังคาร' },
    { key: 'พ', label: 'พุธ' },
    { key: 'พฤ', label: 'พฤหัสบดี' },
    { key: 'ศ', label: 'ศุกร์' },
    { key: 'ส', label: 'เสาร์' },
    { key: 'อา', label: 'อาทิตย์' },
  ]

  const selectedPatient = patients.find(p => String(p.id || p.patient_id) === String(form.patient_id))

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow flex justify-center p-6 lg:p-10">
        <div className="w-full max-w-3xl">
          <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1456f0]/10 rounded-2xl mb-4 text-[#1456f0]">
                <span className="material-symbols-outlined text-4xl">send</span>
              </div>
              <h1 className="headline-font text-3xl font-bold text-on-surface mb-2">ส่งคำขอรับบริการ</h1>
              <p className="text-tertiary">กรอกรายละเอียดเพื่อส่งคำขอไปยังพยาบาล</p>
              {bookingType === 'monthly' && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-left text-xs text-emerald-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">calendar_month</span>
                  <span><strong>การจองรายเดือน:</strong> ผู้ดูแลคนเดียวตลอดสัญญา ไม่มีระบบจัดคนแทน</span>
                </div>
              )}
              {nurseProfile && (
                <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 bg-[#1456f0]/5 border border-[#1456f0]/20 rounded-2xl px-4 py-1.5 text-sm">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                  <span className="text-on-surface font-semibold">{nurseProfile.fullname} {nurseProfile.surname}</span>
                  {nurseProfile.professional_tier && (
                    <span className="text-xs bg-[#1456f0]/10 text-[#1456f0] px-2 py-0.5 rounded-2xl font-bold">
                      {nurseProfile.professional_tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' : nurseProfile.professional_tier === 'PN' ? 'ผู้ช่วยพยาบาล (PN)' : 'ผู้ดูแลผู้สูงอายุ (CG)'}
                    </span>
                  )}
                  {nurseProfile.license_expire_date && (
                    <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">verified</span>
                      ใบอนุญาตถึง {formatDate(nurseProfile.license_expire_date)}
                    </span>
                  )}
                </div>
              )}
              {form.start_date && (
                <div className="mt-2.5 inline-flex flex-wrap items-center justify-center gap-2 bg-[#1456f0]/10 text-[#1456f0] border border-[#1456f0]/30 px-3.5 py-1.5 rounded-2xl text-xs font-semibold">
                  <span className="material-symbols-outlined text-base">event_available</span>
                  <span>
                    {bookingType === 'monthly'
                      ? `สัญญาเหมาจ่ายรายเดือน: เริ่ม ${formatDate(form.start_date)} ถึง ${formatDate(form.end_date || form.start_date)} (30 วัน)`
                      : dateMode === 'weekly' && weeklyDays.length > 0
                      ? `กำหนดการประจำสัปดาห์: ${weeklyDays.join(', ')} (${weeklyCount} สัปดาห์)`
                      : form.start_date === form.end_date || !form.end_date
                      ? `วันที่รับบริการ: ${formatDate(form.start_date)}`
                      : `ช่วงวันที่รับบริการ: ${formatDate(form.start_date)} ถึง ${formatDate(form.end_date)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Stepper with Session Notice */}
            <FormStepper
              steps={stepsList}
              currentStep={step}
              onStepClick={(targetStep) => {
                if (targetStep < step) setStep(targetStep)
              }}
              hasDraft={hasDraft}
              onClearDraft={clearSession}
            />

            {serverError && (
              <div className="mb-6 p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[#DC3545]">error</span>
                <p className="text-[#DC3545] text-sm font-medium">{serverError}</p>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 bg-[#28A745]/10 border border-[#28A745]/30 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-[#28A745]">check_circle</span>
                <p className="text-[#28A745] text-sm font-medium">{successMsg}</p>
              </div>
            )}

            {/* STEP 1: เลือกผู้ป่วยและบริการ */}
            {step === 1 && (
              <form onSubmit={handleNextFromStep1} className="space-y-6" noValidate>
                <div className="border-b border-outline-variant/20 pb-3 mb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">person</span>
                    ขั้นตอนที่ 1: เลือกผู้ป่วยและบริการ
                  </h2>
                  <p className="text-xs text-tertiary">เลือกผู้ป่วยที่ต้องการรับการดูแล และแพ็กเกจการให้บริการ</p>
                </div>

                {/* เลือกผู้ป่วย / การ์ดผู้ป่วยที่เลือกอัตโนมัติ */}
                <div>
                  {preselectedPatientIds.length > 0 && !isChangingPatient && (matchedPatients.length > 0 || selectedPatient) ? (
                    /* Auto-Selected Patient Card */
                    <div className="bg-[#1456f0]/5 border border-[#1456f0]/30 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-[#1456f0]/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#1456f0] text-xl">
                            {matchedPatients.length > 1 ? 'groups' : 'person'}
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-[#1456f0] headline-font">
                              {matchedPatients.length > 1
                                ? `ผู้ป่วยที่เลือกจากระบบจับคู่ (${matchedPatients.length} ท่าน)`
                                : 'ผู้ป่วยที่เลือกจากระบบจับคู่'}
                            </h3>
                            <p className="text-[11px] text-tertiary">ดึงข้อมูลอัตโนมัติจากหน้าค้นหาและจับคู่พยาบาล</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsChangingPatient(true)}
                          className="text-xs bg-white hover:bg-gray-50 text-[#1456f0] border border-[#1456f0]/40 px-3 py-1 rounded-2xl font-semibold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">swap_horiz</span>
                          เปลี่ยนผู้ป่วย
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(matchedPatients.length > 0 ? matchedPatients : [selectedPatient]).filter(Boolean).map(p => (
                          <div key={p.id || p.patient_id} className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-gray-400 text-base">person</span>
                              <div>
                                <span className="font-bold text-sm text-on-surface">
                                  {p.first_name || p.firstname} {p.last_name || p.lastname}
                                </span>
                                <span className="ml-2 text-tertiary">
                                  เพศ {p.gender || '-'} • อายุ {p.age || '-'} ปี
                                </span>
                                {p.relationship_to_member && (
                                  <span className="ml-2 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                                    {p.relationship_to_member}
                                  </span>
                                )}
                              </div>
                            </div>
                            {p.health_profile?.congenital_disease && (
                              <span className="text-[11px] text-tertiary">
                                โรคประจำตัว: <strong className="text-on-surface">{p.health_profile.congenital_disease}</strong>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {matchedPatients.length > 1 && (
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2 text-xs text-blue-900">
                          <span className="material-symbols-outlined text-base text-[#1456f0] shrink-0">home</span>
                          <span>
                            <strong>เคสดูแลผู้ป่วยร่วมกัน:</strong> ผู้ป่วยทุกท่านตามคำขอนี้จะต้องพักอาศัยอยู่ในบ้าน/สถานที่เดียวกันในรอบการให้บริการ
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Dropdown Selector */
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-semibold text-on-surface-variant headline-font">
                          เลือกผู้ป่วย <span className="text-[#DC3545]">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                          {preselectedPatientIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsChangingPatient(false)}
                              className="text-xs text-[#1456f0] font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">undo</span> ใช้ผู้ป่วยที่เลือกมาเดิม
                            </button>
                          )}
                          <a href="/member/patients/add" className="text-xs text-[#1456f0] font-semibold hover:underline flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-sm">add_circle</span> เพิ่มผู้ป่วยใหม่
                          </a>
                        </div>
                      </div>
                      {patients.length === 0 ? (
                        <div className="mt-2 p-4 bg-[#F8F9FA] border border-gray-200 rounded-2xl text-sm text-tertiary">
                          ยังไม่มีผู้ป่วยในระบบ <a href="/member/patients/add" className="text-[#1456f0] font-semibold hover:underline">เพิ่มผู้ป่วยก่อน</a>
                        </div>
                      ) : (
                        <select
                          name="patient_id"
                          value={form.patient_id}
                          onChange={(e) => {
                            const newId = e.target.value
                            setForm(prev => ({
                              ...prev,
                              patient_id: newId,
                              service_type_id: '' // ล้างเพื่อให้ระบบ Auto-select บริการที่ตรงกับอาการของคนไข้ใหม่
                            }))
                            if (errors.patient_id) setErrors(prev => ({ ...prev, patient_id: '' }))
                          }}
                          className={`w-full p-3 mt-1 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.patient_id ? 'border-[#DC3545]' : 'border-gray-200'}`}
                        >
                          <option value="">-- เลือกผู้ป่วย --</option>
                          {patients.map(p => (
                            <option key={p.id || p.patient_id} value={p.id || p.patient_id}>
                              {p.first_name || p.firstname} {p.last_name || p.lastname} (อายุ {p.age || '-'} ปี)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                  <ErrorLabel field="patient_id" />
                </div>

                {/* เลือกประเภทบริการ (สอดคล้องกับอาการของผู้ป่วย - จับคู่รายบุคคล) */}
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant headline-font flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[#1456f0] text-base">medical_services</span>
                        ประเภทบริการที่ต้องการ <span className="text-[#DC3545]">*</span>
                      </label>
                      <p className="text-xs text-tertiary mt-0.5">
                        {activePatients.length > 1
                          ? `บริการที่ตรงกับอาการของผู้ป่วยทั้ง ${activePatients.length} ท่าน (คลิกเพื่อเลือกบริการหลักของรอบนี้)`
                          : 'บริการที่ระบบจับคู่อัตโนมัติตามประวัติอาการของผู้ป่วย'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAllServices(!showAllServices)}
                      className="text-xs font-semibold text-[#1456f0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">{showAllServices ? 'visibility_off' : 'tune'}</span>
                      {showAllServices ? 'ซ่อนบริการอื่น' : 'ดูบริการทั้งหมด (9 รายการ)'}
                    </button>
                  </div>

                  {/* แสดงการ์ดบริการแนะนำ */}
                  {activePatients.length > 1 ? (
                    /* เคสผู้ป่วยหลายท่าน: จัดกลุ่มตามรายบุคคล */
                    <div className="space-y-3.5">
                      {patientRecommendations.map((rec, pIdx) => {
                        const p = rec.patient
                        const pName = `${p.first_name || p.firstname} ${p.last_name || p.lastname}`
                        return (
                          <div key={p.id || p.patient_id || pIdx} className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-on-surface flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-gray-500 text-sm">person</span>
                                บริการที่ตรงกับอาการของ: <strong className="text-[#1456f0]">{pName}</strong> (อายุ {p.age || '-'} ปี)
                              </span>
                              {p.relationship_to_member && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-semibold">
                                  {p.relationship_to_member}
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {rec.matches.map(m => {
                                const sId = m.service.id || m.service.service_type_id
                                const isSelected = String(form.service_type_id) === String(sId)
                                const isRnRestricted = nurseProfile?.professional_tier && nurseProfile.professional_tier !== 'RN' && Boolean(m.service.requiresLicense)

                                return (
                                  <div
                                    key={sId}
                                    onClick={() => {
                                      if (!isRnRestricted) {
                                        setForm(prev => ({ ...prev, service_type_id: sId }))
                                        if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                      }
                                    }}
                                    className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                                      isSelected
                                        ? 'bg-[#1456f0]/10 border-[#1456f0] shadow-xs ring-1 ring-[#1456f0]'
                                        : isRnRestricted
                                        ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                                        : 'bg-white border-gray-200 hover:border-[#1456f0] hover:bg-blue-50/30 cursor-pointer'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2.5 flex-1">
                                      <span className="material-symbols-outlined text-xl text-[#1456f0] mt-0.5 shrink-0">
                                        {m.icon || 'medical_services'}
                                      </span>
                                      <div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="font-bold text-sm text-on-surface">
                                            {m.service.typeName || m.service.type_name}
                                          </span>
                                          <span className="text-xs font-bold text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                            เริ่มต้น ฿{m.service.basePrice}
                                          </span>
                                          {m.service.requiresLicense ? (
                                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                              พยาบาลวิชาชีพ (RN)
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                              ทุกระดับวิชาชีพ (CG / PN / RN)
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                                          🩺 <strong className="text-tertiary">ตรงกับอาการ:</strong> {m.reason}
                                        </p>
                                        {isRnRestricted && (
                                          <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">lock</span>
                                            สงวนสิทธิ์สำหรับพยาบาลวิชาชีพ (RN) (พยาบาลท่านนี้เป็นระดับ {nurseProfile.professional_tier})
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="shrink-0 mt-0.5">
                                      <input
                                        type="radio"
                                        name="service_type_id"
                                        value={sId}
                                        checked={isSelected}
                                        disabled={isRnRestricted}
                                        onChange={() => {
                                          if (!isRnRestricted) {
                                            setForm(prev => ({ ...prev, service_type_id: sId }))
                                            if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                          }
                                        }}
                                        className="w-4 h-4 text-[#1456f0] focus:ring-[#1456f0]"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}

                      {/* ตัวเลือกสำหรับเคสเหมาดูแลหลายคนในบ้านเดียวกัน */}
                      {generalSharedService && (
                        <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-3.5 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[#1456f0] text-sm">home</span>
                              ตัวเลือกแนะนำสำหรับการดูแลร่วมกันหลายท่าน (Shared Care)
                            </span>
                          </div>

                          {(() => {
                            const sId = generalSharedService.id || generalSharedService.service_type_id
                            const isSelected = String(form.service_type_id) === String(sId)
                            return (
                              <div
                                onClick={() => {
                                  setForm(prev => ({ ...prev, service_type_id: sId }))
                                  if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                }}
                                className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#1456f0]/10 border-[#1456f0] shadow-xs ring-1 ring-[#1456f0]'
                                    : 'bg-white border-gray-200 hover:border-[#1456f0] hover:bg-blue-50/30'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 flex-1">
                                  <span className="material-symbols-outlined text-xl text-[#1456f0] mt-0.5 shrink-0">
                                    home
                                  </span>
                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-bold text-sm text-on-surface">
                                        {generalSharedService.typeName || generalSharedService.type_name}
                                      </span>
                                      <span className="text-xs font-bold text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                        เริ่มต้น ฿{generalSharedService.basePrice}
                                      </span>
                                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                        CG / PN / RN
                                      </span>
                                    </div>
                                    <p className="text-xs text-tertiary mt-1">
                                      🏠 เหมาะสำหรับการเฝ้าไข้ดูแลผู้สูงอายุหรือผู้ป่วยหลายท่านร่วมกันในบ้านหรือสถานที่เดียวกันตลอดกะเวลา
                                    </p>
                                  </div>
                                </div>

                                <div className="shrink-0 mt-0.5">
                                  <input
                                    type="radio"
                                    name="service_type_id"
                                    value={sId}
                                    checked={isSelected}
                                    onChange={() => {
                                      setForm(prev => ({ ...prev, service_type_id: sId }))
                                      if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                    }}
                                    className="w-4 h-4 text-[#1456f0] focus:ring-[#1456f0]"
                                  />
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* เคสผู้ป่วยท่านเดียว: แสดงการ์ดบริการที่ตรงกับอาการ */
                    <div className="space-y-2">
                      {patientRecommendations[0]?.matches && patientRecommendations[0].matches.length > 0 ? (
                        patientRecommendations[0].matches.map(m => {
                          const sId = m.service.id || m.service.service_type_id
                          const isSelected = String(form.service_type_id) === String(sId)
                          const isRnRestricted = nurseProfile?.professional_tier && nurseProfile.professional_tier !== 'RN' && Boolean(m.service.requiresLicense)

                          return (
                            <div
                              key={sId}
                              onClick={() => {
                                if (!isRnRestricted) {
                                  setForm(prev => ({ ...prev, service_type_id: sId }))
                                  if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                }
                              }}
                              className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                                isSelected
                                  ? 'bg-[#1456f0]/10 border-[#1456f0] shadow-xs ring-1 ring-[#1456f0]'
                                  : isRnRestricted
                                  ? 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed'
                                  : 'bg-white border-gray-200 hover:border-[#1456f0] hover:bg-blue-50/30 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1">
                                <span className="material-symbols-outlined text-xl text-[#1456f0] mt-0.5 shrink-0">
                                  {m.icon || 'medical_services'}
                                </span>
                                <div>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-sm text-on-surface">
                                      {m.service.typeName || m.service.type_name}
                                    </span>
                                    <span className="text-xs font-bold text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                                      เริ่มต้น ฿{m.service.basePrice}
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">star</span> แนะนำตรงตามอาการ
                                    </span>
                                    {m.service.requiresLicense ? (
                                      <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                        พยาบาลวิชาชีพ (RN)
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                                        ทุกระดับวิชาชีพ (CG / PN / RN)
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                                    🩺 <strong className="text-tertiary">ตรงกับอาการ:</strong> {m.reason}
                                  </p>
                                  {isRnRestricted && (
                                    <p className="text-[11px] text-red-600 mt-1 font-semibold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-xs">lock</span>
                                      สงวนสิทธิ์สำหรับ RN (พยาบาลท่านนี้เป็นระดับ {nurseProfile.professional_tier})
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 mt-0.5">
                                <input
                                  type="radio"
                                  name="service_type_id"
                                  value={sId}
                                  checked={isSelected}
                                  disabled={isRnRestricted}
                                  onChange={() => {
                                    if (!isRnRestricted) {
                                      setForm(prev => ({ ...prev, service_type_id: sId }))
                                      if (errors.service_type_id) setErrors(prev => ({ ...prev, service_type_id: '' }))
                                    }
                                  }}
                                  className="w-4 h-4 text-[#1456f0] focus:ring-[#1456f0]"
                                />
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-xs text-tertiary p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                          ยังไม่มีข้อมูลอาการระบุไว้เป็นพิเศษ สามารถเลือกประเภทบริการได้จากรายการด้านล่าง
                        </p>
                      )}
                    </div>
                  )}

                  {/* Dropdown หรือ ตัวเลือกบริการทั้งหมด (เมื่อกดดูบริการทั้งหมด หรือต้องการเปลี่ยนไปเลือกบริการอื่น) */}
                  {showAllServices && (
                    <div className="p-3.5 bg-gray-50 border border-dashed border-gray-200 rounded-2xl space-y-2 mt-3 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs text-tertiary font-semibold">
                        <span>รายการบริการทั้งหมดในระบบ (เลือกได้ตามต้องการ):</span>
                      </div>
                      <select
                        name="service_type_id"
                        value={form.service_type_id}
                        onChange={handleChange}
                        className={`w-full p-2.5 bg-white border rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0] ${errors.service_type_id ? 'border-[#DC3545]' : 'border-gray-200'}`}
                      >
                        <option value="">-- หรือเลือกจากบริการทั้งหมด --</option>
                        {serviceTypes.map(t => {
                          const sId = t.id || t.service_type_id
                          const isRnRestricted = nurseProfile?.professional_tier && nurseProfile.professional_tier !== 'RN' && Boolean(t.requiresLicense)
                          return (
                            <option key={sId} value={sId} disabled={isRnRestricted}>
                              {t.typeName || t.type_name} (เริ่มต้น {t.basePrice} ฿) {t.requiresLicense ? '[พยาบาลวิชาชีพ (RN)]' : '[ทุกระดับวิชาชีพ (CG/PN/RN)]'} {isRnRestricted ? ' - ติดเงื่อนไขระดับวิชาชีพ' : ''}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}

                  <ErrorLabel field="service_type_id" />
                </div>

                {/* เลือกแพ็กเกจ/ราคา */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-on-surface-variant headline-font">
                      แพ็กเกจการจ้างงาน <span className="text-[#DC3545]">*</span>
                    </label>
                  </div>

                  {servicePackages.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
                      {servicePackages.map(pkg => {
                        const pId = pkg.id || pkg.package_id
                        const isSelected = String(form.package_id) === String(pId)
                        const isMonthly = pkg.subscriptionType === 'Monthly' || (pkg.packageName || '').includes('รายเดือน')
                        const isRetiredDisabled = isMonthly && nurseProfile && !nurseProfile.is_retired

                        return (
                          <div
                            key={pId}
                            onClick={() => {
                              if (!isRetiredDisabled) {
                                setForm(prev => ({ ...prev, package_id: pId }))
                                if (errors.package_id) setErrors(prev => ({ ...prev, package_id: '' }))
                              }
                            }}
                            className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[#1456f0]/10 border-[#1456f0] shadow-xs ring-1 ring-[#1456f0]'
                                : isRetiredDisabled
                                ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                : 'bg-white border-gray-200 hover:border-[#1456f0] hover:bg-blue-50/20'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs text-on-surface truncate">{pkg.packageName || pkg.package_name}</p>
                              <p className="text-[11px] text-tertiary truncate">{pkg.description || (isMonthly ? '30 วัน (12 ชม./วัน)' : 'คิดราคาต่อรอบ')}</p>
                              {isRetiredDisabled && (
                                <p className="text-[10px] text-red-600 font-semibold mt-0.5">สงวนเฉพาะพยาบาลเกษียณ</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold text-xs text-[#1456f0]">
                                {pkg.pricePerMonth || pkg.price_per_month
                                  ? `฿${pkg.pricePerMonth || pkg.price_per_month}/ด.`
                                  : `฿${pkg.pricePerCycle || pkg.price_per_cycle || 0}/รอบ`}
                              </span>
                              <input
                                type="radio"
                                name="package_id"
                                value={pId}
                                checked={isSelected}
                                disabled={isRetiredDisabled}
                                onChange={() => {
                                  if (!isRetiredDisabled) {
                                    setForm(prev => ({ ...prev, package_id: pId }))
                                    if (errors.package_id) setErrors(prev => ({ ...prev, package_id: '' }))
                                  }
                                }}
                                className="w-4 h-4 text-[#1456f0] focus:ring-[#1456f0]"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-tertiary">
                      กำลังโหลดรายการแพ็กเกจ...
                    </div>
                  )}
                  <ErrorLabel field="package_id" />
                  {isMonthlyPkg && nurseProfile && !nurseProfile.is_retired && (
                    <div className="mt-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                      <span className="material-symbols-outlined text-rose-600 text-base shrink-0 mt-0.5">warning</span>
                      <div>
                        <p className="font-bold">ไม่สามารถเลือกแพ็กเกจเหมาจ่ายรายเดือนกับพยาบาลท่านนี้ได้</p>
                        <p className="mt-0.5 text-rose-700">พยาบาลท่านนี้ไม่ได้เป็นพยาบาลเกษียณอายุราชการ บริการเหมาจ่ายรายเดือนสงวนสิทธิ์เฉพาะพยาบาลเกษียณอายุราชการเท่านั้น กรุณากลับไปเลือกพยาบาลเกษียณอายุราชการจากหน้าค้นหา หรือเลือกบริการแบบรายกะ</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 bg-[#1456f0] hover:bg-[#0f45c2] active:translate-y-[1px] hover:shadow-sm text-white rounded-2xl headline-font font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>ไปหน้าต่อไป</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: วัน-เวลา สถานที่ และคัดกรองแผล */}
            {step === 2 && (
              <form onSubmit={handleNextFromStep2} className="space-y-6" noValidate>
                <div className="border-b border-outline-variant/20 pb-3 mb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">calendar_month</span>
                    ขั้นตอนที่ 2: วัน-เวลา และสถานที่รับบริการ
                  </h2>
                  <p className="text-xs text-tertiary">กำหนดวันเวลา และที่อยู่สำหรับให้พยาบาลเข้าให้บริการ</p>
                </div>

                {/* วันที่ต้องการรับบริการ (3 โหมด) */}
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant headline-font">วันที่ต้องการรับบริการ <span className="text-[#DC3545]">*</span></label>

                  {/* ถ้ามีข้อมูลวันจากหน้าค้นหา ให้แสดงเป็นการ์ดสรุป Read-Only */}
                  {incomingSchedule.start ? (
                    <div className="mt-2 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                          <span className="material-symbols-outlined text-[#1456f0] text-lg">event_available</span>
                          <span>
                            {bookingType === 'monthly' ? 'สัญญาเหมาจ่ายรายเดือน (30 วัน)' :
                             dateMode === 'weekly' ? 'รายสัปดาห์' : 'จองรายวัน / สัปดาห์'}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                          กำหนดจากหน้าค้นหา
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block mb-0.5">วันเริ่มต้น</span>
                          <strong className="text-[#222222]">{form.start_date || '-'}</strong>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100">
                          <span className="text-gray-400 block mb-0.5">วันสิ้นสุด</span>
                          <strong className="text-[#222222]">{form.end_date || form.start_date || '-'}</strong>
                        </div>
                      </div>
                      {dateMode === 'weekly' && weeklyDays.length > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                          <span className="text-gray-400 block mb-0.5">วันในสัปดาห์ ({weeklyCount} สัปดาห์)</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {weeklyDays.map(day => (
                              <span key={day} className="px-2 py-0.5 bg-[#1456f0]/10 text-[#1456f0] border border-[#1456f0]/20 rounded-lg text-xs font-semibold">{day}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {generatedWeeklyDates.length > 0 && (
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                          <span className="text-gray-400 block mb-0.5">วันที่ทำงานจริง ({generatedWeeklyDates.length} ครั้ง)</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedWeeklyDates.map(date => (
                              <span key={date} className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold">
                                {new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {form.time_slot && !serviceTime && (
                        <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-xs">
                          <span className="text-gray-400 block mb-0.5">กะเวลา</span>
                          <strong className="text-[#222222]">{getShiftDisplayLabel(form.time_slot)}</strong>
                        </div>
                      )}
                      {totalDays > 0 && (
                        <p className="text-sm text-[#1456f0] font-semibold flex items-center gap-1 pt-1">
                          <span className="material-symbols-outlined text-base">event_available</span>
                          จำนวนวันที่เลือก: {totalDays} วัน
                        </p>
                      )}
                    </div>
                  ) : (
                    /* ถ้าไม่มีข้อมูลจากหน้าค้นหา ให้ผู้ใช้เลือกวันเอง */
                    <>
                  {bookingType === 'monthly' ? (
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-emerald-600 text-base">calendar_month</span>
                          สัญญาเหมาจ่ายรายเดือน (ผู้ดูแลประจำคนเดียวตลอด 30 วัน)
                        </span>
                        <span className="text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                          1 เดือนเต็ม
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-emerald-900 font-semibold block mb-1">วันเริ่มต้นสัญญา <span className="text-[#DC3545]">*</span></label>
                          <input
                            type="date"
                            name="start_date"
                            value={form.start_date}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={handleStartDateChange}
                            className={`w-full p-3 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] transition-all text-sm ${errors.start_date ? 'border-[#DC3545]' : 'border-gray-200'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-emerald-900 font-semibold block mb-1">วันสิ้นสุดสัญญา (30 วัน อัตโนมัติ)</label>
                          <input
                            type="date"
                            name="end_date"
                            value={form.end_date}
                            readOnly
                            className="w-full p-3 bg-emerald-100/70 border border-emerald-200 rounded-2xl text-sm text-emerald-900 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2 mt-2 mb-4">
                        {[
                          { v: 'range', label: 'ช่วงวัน', icon: 'date_range' },
                          { v: 'weekly', label: 'รายสัปดาห์', icon: 'calendar_view_week' },
                          { v: 'multi', label: 'เลือกอิสระ', icon: 'event_note' },
                        ].map(m => (
                          <button key={m.v} type="button" onClick={() => setDateMode(m.v)}
                            className={`flex-1 p-3 rounded-2xl border text-center text-sm transition-all ${dateMode === m.v ? 'bg-[#1456f0]/10 border-[#1456f0] font-semibold text-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA] text-on-surface-variant'}`}
                          >
                            <span className="material-symbols-outlined text-lg block mb-0.5">{m.icon}</span>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* โหมด ก: ช่วงวัน */}
                      {dateMode === 'range' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-tertiary">วันเริ่มต้น</label>
                            <input type="date" name="start_date" value={form.start_date} onChange={handleStartDateChange} min={new Date().toISOString().split('T')[0]} className={`w-full p-3 mt-1 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.start_date ? 'border-[#DC3545]' : 'border-gray-200'}`} />
                          </div>
                          <div>
                            <label className="text-xs text-tertiary">วันสิ้นสุด</label>
                            <input type="date" name="end_date" value={form.end_date} onChange={handleChange} min={form.start_date || new Date().toISOString().split('T')[0]} className={`w-full p-3 mt-1 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.end_date ? 'border-[#DC3545]' : 'border-gray-200'}`} />
                          </div>
                        </div>
                      )}

                      {/* โหมด ข: รายสัปดาห์ */}
                      {dateMode === 'weekly' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-tertiary">วันเริ่มต้นสัปดาห์แรก</label>
                              <input type="date" name="start_date" value={form.start_date} onChange={handleStartDateChange} min={new Date().toISOString().split('T')[0]} className={`w-full p-3 mt-1 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.start_date ? 'border-[#DC3545]' : 'border-gray-200'}`} />
                            </div>
                            <div className="flex items-end">
                              <p className="w-full p-3 mt-1 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
                                <strong>กรอบเวลา (Rolling {weeklyCount * 7} วัน):</strong> {form.start_date || '-'} ถึง {form.end_date || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {dayLabels.map(d => (
                              <button key={d.key} type="button" onClick={() => toggleWeeklyDay(d.key)}
                                className={`px-4 py-2 rounded-2xl border text-sm font-semibold transition-all ${weeklyDays.includes(d.key) ? 'bg-[#1456f0] text-white border-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="text-sm text-on-surface-variant">จำนวนสัปดาห์:</label>
                            <input type="number" min="1" max="52" value={weeklyCount} onChange={(e) => {
                              const nextCount = parseInt(e.target.value) || 1
                              setWeeklyCount(nextCount)
                              if (form.start_date) {
                                const d = new Date(`${form.start_date}T00:00:00`)
                                d.setDate(d.getDate() + (nextCount * 7) - 1)
                                setForm(prev => ({ ...prev, end_date: d.toISOString().split('T')[0] }))
                              }
                            }} className="w-24 p-2 border border-gray-200 rounded-2xl text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#1456f0]" />
                            <span className="text-sm text-tertiary">สัปดาห์</span>
                          </div>
                          {/* รายการวันที่นัดหมายของโหมดรายสัปดาห์ */}
                          {generatedWeeklyDates.length > 0 && (
                            <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-[#1456f0] flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-sm">calendar_month</span>
                                  วันที่ทำงานจริงตามรอบสัปดาห์ ({generatedWeeklyDates.length} ครั้ง):
                                </p>
                                <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                                  คำนวณอัตโนมัติ
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {generatedWeeklyDates.map(date => (
                                  <span key={date} className="px-2.5 py-1 bg-[#1456f0]/10 text-[#1456f0] border border-[#1456f0]/20 rounded-xl text-xs font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">event</span>
                                    {new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* โหมด ค: เลือกอิสระ */}
                      {dateMode === 'multi' && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <input type="date" value={multiDateInput} onChange={(e) => setMultiDateInput(e.target.value)} min={new Date().toISOString().split('T')[0]} className="flex-1 p-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0]" />
                            <button type="button" onClick={addMultiDate} className="bg-[#1456f0] hover:bg-[#0f45c2] active:translate-y-[1px] hover:shadow-sm text-white px-4 py-2 rounded-2xl font-semibold text-sm transition-all">+ เพิ่มวัน</button>
                          </div>
                          {multiDates.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {multiDates.map(d => (
                                <span key={d} className="inline-flex items-center gap-1 bg-[#1456f0]/10 text-[#1456f0] px-3 py-1.5 rounded-2xl text-sm font-semibold border border-[#1456f0]/20">
                                  {new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                  <button type="button" onClick={() => removeMultiDate(d)} className="text-[#DC3545] hover:text-[#c82333] ml-1">
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <ErrorLabel field="start_date" />
                  <ErrorLabel field="end_date" />

                  {totalDays > 0 && (
                    <p className="text-sm text-[#1456f0] font-semibold mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">event_available</span>
                      จำนวนวันที่เลือก: {totalDays} วัน
                    </p>
                  )}
                    </>
                  )}
                </div>

                {/* ช่วงเวลา / กะเวลา */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-semibold text-on-surface-variant headline-font">กะเวลาให้บริการ <span className="text-[#DC3545]">*</span></label>
                    <span className="text-xs text-tertiary">มาตรฐานระบบ Home Care</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {standardShifts.map(slot => (
                      <label key={slot.v} className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${form.time_slot === slot.v ? 'bg-[#1456f0]/10 border-[#1456f0] shadow-xs' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}>
                        <input type="radio" name="time_slot" value={slot.v} checked={form.time_slot === slot.v} onChange={handleChange} className="hidden" />
                        <span className="material-symbols-outlined text-2xl text-[#1456f0] shrink-0 mt-0.5">{slot.icon}</span>
                        <div className="text-left flex-1">
                          <p className="font-bold text-sm text-on-surface">{slot.label}</p>
                          <p className="text-xs text-tertiary mt-0.5">{slot.desc}</p>
                        </div>
                        {form.time_slot === slot.v && (
                          <span className="material-symbols-outlined text-[#1456f0] text-lg">check_circle</span>
                        )}
                      </label>
                    ))}
                  </div>
                  <ErrorLabel field="time_slot" />

                  {/* แจ้งเตือนวันหมดอายุใบอนุญาตประกอบวิชาชีพ */}
                  {licenseExpireWarning && (
                    <div className="mt-3.5 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 animate-fadeIn">
                      <span className="material-symbols-outlined text-rose-600 text-xl shrink-0">badge</span>
                      <span>
                        <strong>⚠️ ใบอนุญาตไม่ครอบคลุม:</strong> {licenseExpireWarning}
                      </span>
                    </div>
                  )}

                  {/* แจ้งเตือนการจองซ้อนทับกับเคสเดิม (Active Booking) */}
                  {bookingConflictWarning && (
                    <div className="mt-3.5 p-3.5 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-2.5 text-xs text-rose-900 animate-fadeIn">
                      <span className="material-symbols-outlined text-rose-600 text-xl shrink-0">event_busy</span>
                      <span>
                        <strong>⚠️ ไม่สามารถจองได้:</strong> {bookingConflictWarning}
                      </span>
                    </div>
                  )}

                  {/* แจ้งเตือนตารางเวร รพ. ของพยาบาล Real-time (PDPA-safe) */}
                  {shiftConflictWarning && (
                    <div className="mt-3.5 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-2.5 text-xs text-amber-900 animate-fadeIn">
                      <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">warning</span>
                      <span>
                        <strong>⚠️ พยาบาลท่านนี้ติดภารกิจ/เวรโรงพยาบาลในวันดังกล่าว</strong> กรุณาปรับเปลี่ยนวันหรือเวลาให้บริการ
                      </span>
                    </div>
                  )}
                </div>

                {/* แบบประเมินแผล */}
                {isWoundCare && (
                  <div className="bg-[#FFC107]/10 border border-[#FFC107]/30 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-[#343A40] mb-2">
                      <span className="material-symbols-outlined text-[#FFC107]">healing</span>
                      <h3 className="font-bold text-lg headline-font">แบบคัดกรองบาดแผล</h3>
                    </div>
                    <p className="text-sm text-[#343A40] mb-4">กรุณาตอบคำถามและแนบรูปถ่ายแผลปัจจุบัน เพื่อการประเมินที่ถูกต้อง</p>

                    <div className="space-y-3 bg-white p-4 rounded-2xl border border-gray-200">
                      {[
                        { name: 'q1', text: 'แผลมีลักษณะเป็นโพรงลึก หรือมองเห็นชั้นไขมัน/กระดูก?' },
                        { name: 'q2', text: 'แผลมีเนื้อตายสีดำ แผ่นเยื่อสีเหลือง หรือมีหนองจำนวนมาก?' },
                        { name: 'q3', text: 'เป็นแผลที่เกิดจากเบาหวาน หรือแผลที่เพิ่งได้รับการผ่าตัดใหญ่?' },
                        { name: 'q4', text: 'แผลมีขนาดใหญ่กว่าฝ่ามือผู้ป่วย?' },
                      ].map(q => (
                        <label key={q.name} className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" name={q.name} checked={woundQuestions[q.name]} onChange={handleWoundQuestionChange} className="mt-1 w-5 h-5 rounded-2xl border-gray-200 text-[#1456f0] focus:ring-[#1456f0]" />
                          <span className="text-sm">{q.text}</span>
                        </label>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="text-sm font-semibold text-[#343A40]">อัปโหลดรูปถ่ายแผลปัจจุบัน <span className="text-[#DC3545]">*</span></label>
                      <div className="mt-2 border border-dashed border-gray-200 rounded-2xl p-4 text-center cursor-pointer hover:border-[#1456f0] transition-colors bg-white" onClick={() => document.getElementById('wound-photo').click()}>
                        {woundPhotoPreview ? (
                          <img src={woundPhotoPreview} alt="Wound" className="max-h-40 mx-auto rounded-2xl" />
                        ) : (
                          <div className="text-gray-500">
                            <span className="material-symbols-outlined text-4xl mb-1">add_a_photo</span>
                            <p className="text-sm font-medium">คลิกเพื่อเลือกรูปภาพ</p>
                            <p className="text-xs opacity-70 mt-1">รองรับ JPG, PNG (ไม่เกิน 5MB)</p>
                          </div>
                        )}
                        <input id="wound-photo" type="file" accept="image/*" onChange={handleWoundPhotoChange} className="hidden" />
                      </div>
                      {errors.woundPhoto && <p className="text-[#DC3545] text-xs mt-1 font-medium flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{errors.woundPhoto}</p>}
                    </div>
                  </div>
                )}

                {/* แผนที่ปักหมุดจุดหมายปลายทางที่ต้องการรับบริการ */}
                <div className="pt-1">
                  <LocationPicker
                    lat={form.latitude}
                    lng={form.longitude}
                    onChangeLocation={({ lat, lng, displayName, address }) => {
                      setForm(prev => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng,
                        service_address: displayName || address || prev.service_address
                      }))
                      if (errors.service_address) setErrors(prev => ({ ...prev, service_address: '' }))
                    }}
                    height="230px"
                    label="ปักหมุดบ้าน/สถานที่ที่ต้องการให้พยาบาลไปปฏิบัติงาน"
                  />
                </div>

                {/* ที่อยู่รับบริการ */}
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant headline-font">รายละเอียดที่อยู่รับบริการ <span className="text-[#DC3545]">*</span></label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-4 text-outline">home</span>
                    <textarea name="service_address" value={form.service_address} onChange={handleChange} rows="2"
                      placeholder="บ้านเลขที่ ซอย ถนน ตำบล อำเภอ จังหวัด"
                      className={`w-full p-3 pl-10 mt-1 bg-white border rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all resize-none ${errors.service_address ? 'border-[#DC3545]' : 'border-gray-200'}`}
                    />
                  </div>
                  <ErrorLabel field="service_address" />
                </div>

                {/* ข้อควรระวัง */}
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant headline-font">ข้อควรระวังพิเศษ (ถ้ามี)</label>
                  <textarea name="special_precautions" value={form.special_precautions} onChange={handleChange} rows="2"
                    placeholder="เช่น แพ้ยา, ต้องระวังเรื่องการเคลื่อนย้าย"
                    className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all resize-none"
                  />
                </div>

                {/* หมายเหตุ */}
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant headline-font">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
                  <textarea name="additional_notes" value={form.additional_notes} onChange={handleChange} rows="2"
                    placeholder="รายละเอียดเพิ่มเติมที่ต้องการแจ้งพยาบาล"
                    className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-6 py-3 border border-gray-200 bg-white hover:bg-[#F8F9FA] text-[#343A40] rounded-2xl headline-font font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span>ย้อนกลับ</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#1456f0] hover:bg-[#0f45c2] active:translate-y-[1px] hover:shadow-sm text-white rounded-2xl headline-font font-semibold transition-all flex items-center gap-2"
                  >
                    <span>ไปหน้าต่อไป</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: สรุปและยืนยันคำขอรับบริการ */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="border-b border-outline-variant/20 pb-3 mb-2">
                  <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">receipt_long</span>
                    ขั้นตอนที่ 3: สรุปและยืนยันคำขอรับบริการ
                  </h2>
                  <p className="text-xs text-tertiary">ตรวจสอบความถูกต้องของข้อมูลและประมาณการค่าบริการ</p>
                </div>

                {/* กล่องสรุปรายละเอียดคำขอ */}
                <div id="request-summary" className="bg-[#F8F9FA] p-5 rounded-2xl border border-gray-200 space-y-3 text-sm">
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                    <span className="font-bold text-[#1456f0] flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">checklist</span> รายละเอียดคำขอ
                    </span>
                    <span className="text-xs text-tertiary">ยังไม่ได้บันทึกลงฐานข้อมูล</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-tertiary">
                    <div>
                      <span className="font-semibold text-on-surface">ผู้ป่วย: </span>
                      {matchedPatients.length > 1
                        ? matchedPatients.map(p => `${p.first_name || p.firstname} ${p.last_name || p.lastname} (${p.age || '-'} ปี)`).join(', ')
                        : (selectedPatient ? `${selectedPatient.first_name || selectedPatient.firstname} ${selectedPatient.last_name || selectedPatient.lastname} (อายุ ${selectedPatient.age || '-'} ปี)` : '-')}
                    </div>
                    {nurseProfile && (
                      <div>
                        <span className="font-semibold text-on-surface">พยาบาล: </span>
                        {nurseProfile.fullname} {nurseProfile.surname}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-on-surface">บริการ: </span>
                      {selectedServiceType?.typeName || selectedServiceType?.type_name || '-'}
                    </div>
                    <div>
                      <span className="font-semibold text-on-surface">แพ็กเกจ: </span>
                      {selectedPackage?.packageName || selectedPackage?.package_name || '-'}
                    </div>
                    <div>
                      <span className="font-semibold text-on-surface">วันที่: </span>
                      {dateMode === 'range' ? `${form.start_date} ถึง ${form.end_date}` : dateMode === 'weekly' ? `${weeklyDays.join(', ')} (${weeklyCount} สัปดาห์)` : multiDates.join(', ')}
                    </div>
                    <div>
                      <span className="font-semibold text-on-surface">ช่วงเวลา: </span>
                      {getShiftDisplayLabel(form.time_slot)}
                    </div>
                    <div className="sm:col-span-2">
                      <span className="font-semibold text-on-surface">สถานที่: </span>
                      {form.service_address}
                    </div>
                    {form.special_precautions && (
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-on-surface">ข้อควรระวัง: </span>
                        {form.special_precautions}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button type="button" onClick={() => setStep(1)} className="text-[#1456f0] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-sm">edit</span> แก้ไขผู้ป่วย/บริการ
                    </button>
                    <button type="button" onClick={() => setStep(2)} className="text-[#1456f0] hover:underline font-semibold text-xs flex items-center gap-1 cursor-pointer">
                      <span className="material-symbols-outlined text-sm">edit</span> แก้ไขวันเวลา/สถานที่
                    </button>
                  </div>
                </div>

                {/* กล่องสรุปราคา */}
                <div className="bg-[#28A745]/10 border border-[#28A745]/30 rounded-2xl p-5">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-[#28A745] font-semibold headline-font">ค่าบริการพยาบาล</p>
                        <p className="text-xs text-[#343A40] mt-1">
                          {pricePerShift.toLocaleString()} บาท/กะ × {totalDays} วัน
                        </p>
                      </div>
                      <span className="text-xl font-bold text-[#28A745]">{estimatedPrice.toLocaleString()} บาท</span>
                    </div>
                    <div className="border-t-2 border-[#28A745]/30 pt-3 flex justify-between items-center">
                      <span className="text-sm font-bold text-[#222222]">ยอดรวมโดยประมาณ</span>
                      <span className="text-3xl font-bold text-[#28A745]">{estimatedPrice.toLocaleString()} <span className="text-lg">บาท</span></span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={isLoading}
                    className="px-6 py-3 border border-gray-200 bg-white hover:bg-[#F8F9FA] text-[#343A40] rounded-2xl headline-font font-semibold transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span>ย้อนกลับ</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-8 py-3 bg-[#1456f0] hover:bg-[#0f45c2] active:translate-y-[1px] hover:shadow-sm text-white rounded-2xl headline-font font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        กำลังส่งคำขอ...
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">send</span>
                        <span>ยืนยันส่งคำขอรับบริการ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
