import Navbar from "../components/Navbar.jsx"
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import { SHIFT_OPTIONS, ALL_DAYS } from '../data/shiftDefinitions.js'
import { CLINICAL_KEYWORDS } from '../data/clinicalRules.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { useModal } from '../context/ModalContext.jsx'
import { formatDate } from '../utils/formatDate.js'


// ตรวจสอบความพร้อมของพยาบาลตามรหัสเวร รพ. (ช, บ, ด, X, พ, ป, เวรควบ ช/บ, ชด, ด/บ) กับกะที่ลูกค้าค้นหา (PDPA: คำนวณเบื้องหลัง ไม่เปิดเผยตารางเวรให้ลูกค้าเห็น)
function isShiftCompatibleWithHospitalCode(hospitalCode, requestedShift) {
  if (!hospitalCode) return true

  // 'หยุด' = วันหยุดส่วนตัว (ไม่รับงานเลยในวันนั้น)
  if (hospitalCode === 'หยุด') {
    return false
  }

  // เวรควบสองเวรหรือเวรยาว (ช/บ, ชด, ด/บ, ชด/บ, ควบ, ดด ฯลฯ) -> ปิดรับงานทั้งวันเพื่อพักผ่อน
  if (hospitalCode.includes('/') || hospitalCode.includes('ควบ') || hospitalCode === 'ชด' || hospitalCode.startsWith('ดด') || hospitalCode.length > 2) {
    return false
  }

  // X (หยุด รพ.) หรือ พ (ลาพักผ่อน) -> พยาบาลว่างรับงานได้ทุกกะ
  if (hospitalCode === 'X' || hospitalCode === 'พ') {
    return true
  }

  // ช (เวรเช้า รพ. 08:00 - 16:00 น.) หรือ ป (ประชุม/อบรม) -> ว่างรับงานช่วงเย็นหลัง 16:30 น. (เวรบ่าย afternoon_8h)
  if (hospitalCode === 'ช' || hospitalCode === 'ป') {
    if (!requestedShift) return true
    return requestedShift === 'afternoon_8h'
  }

  // บ (เวรบ่าย รพ. 16:00 - 24:00 น.) -> ว่างรับงานช่วงเช้า (เวรเช้า morning_8h)
  if (hospitalCode === 'บ') {
    if (!requestedShift) return true
    return requestedShift === 'morning_8h'
  }

  // ด (เวรดึก รพ. 24:00 - 08:00 น.) -> ปิดรับงาน เพื่อพักผ่อนอย่างปลอดภัย
  if (hospitalCode === 'ด') {
    return false
  }

  return false
}

// ฟังก์ชันประเมินระดับวิชาชีพพยาบาลที่ต้องใช้สำหรับผู้ป่วย 1 คน (Clinical Assessment)
function assessPatientTier(patient) {
  if (!patient) return null
  const hp = patient.health_profile || {}

  // 1. ตรวจสอบอุปกรณ์การแพทย์พิเศษ (ถ้ามี -> ต้องใช้ RN ทันที)
  const assistance = (hp.current_assistance || '').toLowerCase()
  const rnEquipment = CLINICAL_KEYWORDS.rnEquipment
  const hasRnEquipment = rnEquipment.some(eq => assistance.includes(eq))

  // 2. ตรวจสอบอาการสำคัญ (chief complaint)
  const complaint = (Array.isArray(hp.chief_complaint) ? hp.chief_complaint.join(' ') : (hp.chief_complaint || '')).toLowerCase()
  const customText = complaint.includes('other:') ? complaint.substring(complaint.indexOf('other:') + 6) : ''
  const rnComplaints = CLINICAL_KEYWORDS.rnComplaints
  const rnCustomKeywords = CLINICAL_KEYWORDS.rnCustomKeywords
  const hasRnComplaint = rnComplaints.some(c => complaint.includes(c)) || (customText && rnCustomKeywords.some(kw => customText.includes(kw)))

  // 3. ระดับความรู้สึกตัว
  const consciousness = (hp.consciousness || '').toLowerCase()
  const isSevereConsciousness = consciousness.includes('ไม่รู้สึกตัว') || consciousness.includes('unconscious') || consciousness.includes('ซึม') || consciousness.includes('drowsy')

  if (hasRnEquipment || hasRnComplaint || isSevereConsciousness) {
    return {
      tier: 'RN',
      tierName: 'พยาบาลวิชาชีพ (RN)',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      reason: 'มีสายอุปกรณ์การแพทย์ หรืออาการสำคัญที่ต้องทำหัตถการ'
    }
  }

  // 4. ตรวจสอบเกณฑ์ PN (ต้องการช่วยพยุงเดิน, ฝึกกายภาพ, โรคหลอดเลือดสมอง, จัดยา)
  const pnComplaints = CLINICAL_KEYWORDS.pnComplaints
  const pnCustomKeywords = CLINICAL_KEYWORDS.pnCustomKeywords
  const adlScore = hp.adl_score || ''
  const isPnCase = pnComplaints.some(c => complaint.includes(c)) ||
                   (customText && pnCustomKeywords.some(kw => customText.includes(kw))) ||
                   adlScore.includes('ช่วยเหลือบางส่วน')

  if (isPnCase) {
    return {
      tier: 'PN',
      tierName: 'ผู้ช่วยพยาบาล (PN ขึ้นไป)',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      reason: 'ต้องการการฟื้นฟูกายภาพ ฝึกเดิน หรือบริหารยา'
    }
  }

  // 5. เกณฑ์ CG (ดูแลกิจวัตรทั่วไป / ADL)
  return {
    tier: 'CG',
    tierName: 'ผู้ดูแลผู้ป่วย (CG ขึ้นไป)',
    badgeClass: 'bg-green-50 text-green-700 border-green-200',
    reason: 'ช่วยเหลือการใช้ชีวิตประจำวันทั่วไป (ADL) และเฝ้าไข้'
  }
}

// คำนวณระดับพยาบาลสูงสุดที่จำเป็นสำหรับกลุ่มผู้ป่วยที่เลือก (Highest Required Tier Rule)
function calculateOverallRequiredTier(selectedPatients) {
  if (!selectedPatients || selectedPatients.length === 0) return null

  const assessedTiers = selectedPatients.map(p => assessPatientTier(p))

  if (assessedTiers.some(t => t.tier === 'RN')) {
    return {
      tier: 'RN',
      label: 'พยาบาลวิชาชีพ (RN)',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      description: 'ต้องใช้พยาบาลวิชาชีพ (RN) ที่มีใบอนุญาต เนื่องจากมีผู้ป่วยที่ต้องทำหัตถการทางการแพทย์หรือมีสายอุปกรณ์'
    }
  }

  if (assessedTiers.some(t => t.tier === 'PN')) {
    return {
      tier: 'PN',
      label: 'ผู้ช่วยพยาบาล (PN หรือ RN)',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
      description: 'สามารถใช้ผู้ช่วยพยาบาล (PN) หรือ พยาบาลวิชาชีพ (RN) ได้'
    }
  }

  if (assessedTiers.some(t => t.tier === 'CG')) {
    return {
      tier: 'CG',
      label: 'ผู้ดูแลผู้สูงอายุ (CG / PN / RN)',
      badgeClass: 'bg-green-100 text-green-800 border-green-300',
      description: 'เคสดูแลกิจวัตรประจำวันทั่วไป สามารถรับบริการได้ทุกระดับวิชาชีพ'
    }
  }

  return {
    tier: 'CG',
    label: 'ผู้ดูแลผู้สูงอายุ (CG / PN / RN)',
    badgeClass: 'bg-green-100 text-green-800 border-green-300',
    description: 'เคสดูแลกิจวัตรประจำวันทั่วไป สามารถรับบริการได้ทุกระดับวิชาชีพ'
  }
}

// คำนวณระยะทางจริงระหว่างพิกัด 2 จุดบนโลกด้วยสูตร Haversine Formula (กิโลเมตร)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.round((R * c) * 10) / 10
}

export default function SearchNursePage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const [searchParams] = useSearchParams()

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [memberCoords, setMemberCoords] = useState(null)
  const [myPatients, setMyPatients] = useState([])
  const [selectedPatientIds, setSelectedPatientIds] = useState([])
  const [backendAssessments, setBackendAssessments] = useState([])

  // พื้นที่ให้บริการและพิกัดแผนที่ (ดึงจากโปรไฟล์อัตโนมัติ)
  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [searchAddress, setSearchAddress] = useState('')
  const [profileLocation, setProfileLocation] = useState(null)
  const [isCustomLocation, setIsCustomLocation] = useState(false)

  // รูปแบบการจองหลัก 2 รูปแบบ: 'shift' (จองตามกะ/รายวัน) | 'monthly' (เหมาจ่ายรายเดือน)
  const initialBookingType = searchParams.get('booking_type') === 'monthly' ? 'monthly' : 'shift'
  const [bookingType, setBookingType] = useState(initialBookingType)

  // ตัวเลือกสำหรับ 'shift' (จองตามกะเวลา / รายวัน)
  const [shiftDateMode, setShiftDateMode] = useState('single') // 'single' | 'range'
  const [dateMode, setDateMode] = useState('range') // 'range' | 'weekly'
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [weeklyDays, setWeeklyDays] = useState(['จันทร์', 'พุธ', 'ศุกร์'])
  const [weeksCount, setWeeksCount] = useState(1) // จำกัด 1 - 4 สัปดาห์ (ไม่เกิน 1 เดือน)
  const [selectedShift, setSelectedShift] = useState('') // '' = ทุกกะ, 'morning_8h', etc.

  // ตัวเลือกสำหรับ 'monthly' (เหมาจ่ายรายเดือน - ผู้ดูแลประจำคนเดียว)
  const [monthlyPlan, setMonthlyPlan] = useState('day_26d')
  // 'day_26d': กะวัน 8-10 ชม. (จ.-ส. 26 วัน)
  // 'day12_26d': กะ 12 ชม. (จ.-ส. 26 วัน)
  // 'full_30d': เหมาดูแล 30 วัน (ทุกวัน)
  // 'livein_24h': พักอาศัยประจำ 24 ชม. (Live-in Care)

  // วันสิ้นสุดสัญญา 1 เดือน (30 วัน)
  const monthlyEndDate = useMemo(() => {
    if (!startDate) return ''
    const d = new Date(startDate)
    d.setDate(d.getDate() + 29)
    return d.toISOString().split('T')[0]
  }, [startDate])

  // สร้างรายการวันที่จริงสำหรับโหมดรายสัปดาห์แบบ Rolling 7 วันต่อรอบ
  const weeklyGeneratedDates = useMemo(() => {
    if (dateMode !== 'weekly' || !startDate || weeklyDays.length === 0) return []
    const dayIndex = {
      'อาทิตย์': 0, 'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3,
      'พฤหัสบดี': 4, 'ศุกร์': 5, 'เสาร์': 6
    }
    const selectedIndexes = weeklyDays.map(day => dayIndex[day]).filter(index => index !== undefined)
    if (selectedIndexes.length === 0) return []

    const start = new Date(`${startDate}T00:00:00`)
    const totalDays = weeksCount * 7
    const dates = []
    for (let offset = 0; offset < totalDays; offset += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + offset)
      if (selectedIndexes.includes(date.getDay())) {
        dates.push(date.toISOString().split('T')[0])
      }
    }
    return dates
  }, [dateMode, startDate, weeklyDays, weeksCount])

  const weeklyEndDate = useMemo(() => {
    if (dateMode !== 'weekly' || !startDate) return ''
    const end = new Date(`${startDate}T00:00:00`)
    end.setDate(end.getDate() + weeksCount * 7 - 1)
    return end.toISOString().split('T')[0]
  }, [dateMode, startDate, weeksCount])

  // ตัวเลือก Manual Tier สำหรับ Guest ที่ยังไม่มีผู้ป่วยในระบบ
  const [manualTier, setManualTier] = useState('')
  const [filterRetiredOnly, setFilterRetiredOnly] = useState(initialBookingType === 'monthly')

  // ผลลัพธ์
  const [nurses, setNurses] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsLoggedIn(true)
      fetchMemberProfile()
      fetchMyPatients()
    }
  }, [])

  const fetchMemberProfile = async () => {
    try {
      const res = await api.get('/member/profile')
      if (res.data) {
        const prov = res.data.province || ''
        const dist = res.data.district || ''
        const addr = res.data.address || ''
        let coords = null
        if (res.data.latitude && res.data.longitude) {
          coords = { lat: Number(res.data.latitude), lng: Number(res.data.longitude) }
          setMemberCoords(coords)
        }
        if (prov) setProvince(prov)
        if (dist) setDistrict(dist)
        if (addr) setSearchAddress(addr)

        setProfileLocation({
          province: prov,
          district: dist,
          address: addr,
          coords: coords,
        })
      }
    } catch (e) {
      // ignore
    }
  }

  // เมื่อผู้ใช้คลิกเลื่อนหมุดหรือค้นหาสถานที่บนแผนที่ (Reverse Geocoding อัปเดตทั้งจังหวัดและอำเภอพร้อมกัน)
  const handleLocationPicked = ({ lat, lng, address: pickedAddr, province: pickedProv, district: pickedDist, displayName }) => {
    setMemberCoords({ lat, lng })
    setIsCustomLocation(true)
    if (pickedProv) setProvince(pickedProv)
    if (pickedDist) setDistrict(pickedDist)
    if (pickedAddr || displayName) setSearchAddress(pickedAddr || displayName)
  }

  // คืนค่ากลับไปใช้พิกัดตามโปรไฟล์ของผู้ใช้
  const handleResetToProfileLocation = () => {
    if (profileLocation) {
      setProvince(profileLocation.province || '')
      setDistrict(profileLocation.district || '')
      setSearchAddress(profileLocation.address || '')
      setMemberCoords(profileLocation.coords || null)
      setIsCustomLocation(false)
    }
  }

  const fetchMyPatients = async () => {
    try {
      const res = await api.get('/member/patients')
      // แสดงเฉพาะผู้ป่วยที่มีสถานะ ACTIVE เท่านั้นในการค้นหาพยาบาล
      const patientsList = (res.data || []).filter(p => (p.status || 'ACTIVE') === 'ACTIVE')
      setMyPatients(patientsList)
      // โหลดการประเมิน clinical จาก Backend เป็น source หลัก
      if (patientsList.length > 0) fetchClinicalAssessments(patientsList).catch(() => setBackendAssessments([]))

      // เลือกคนแรกเป็นค่าเริ่มต้นหากมีผู้ป่วย
      if (patientsList.length > 0) {
        setSelectedPatientIds([patientsList[0].id || patientsList[0].patient_id])
      }
    } catch (err) {
      console.warn('Could not load patients', err)
    }
  }

  const fetchClinicalAssessments = async (patientsList) => {
    const assessments = await Promise.all(patientsList.map(async patient => {
      const patientId = patient.id || patient.patient_id
      const response = await api.get(`/member/patients/${patientId}/clinical-assessment`)
      return response.data
    }))
    setBackendAssessments(assessments)
  }

  // จัดการการเลือก/ไม่เลือกผู้ป่วยแบบ Checkbox (เลือกได้มากกว่า 1 คน)
  const handleTogglePatient = (patientId) => {
    if (selectedPatientIds.includes(patientId)) {
      setSelectedPatientIds(selectedPatientIds.filter(id => id !== patientId))
    } else {
      setSelectedPatientIds([...selectedPatientIds, patientId])
    }
  }

  // ผู้ป่วยทั้งหมดที่เลือกอยู่ในขณะนี้
  const selectedPatients = useMemo(() => {
    return myPatients.filter(p => selectedPatientIds.includes(p.id || p.patient_id))
  }, [myPatients, selectedPatientIds])

  // คำนวณระดับพยาบาลสูงสุดที่จำเป็น (Highest Required Tier)
  const calculatedTier = useMemo(() => {
    const selectedAssessments = backendAssessments.filter(assessment => selectedPatientIds.includes(assessment.patient_id))
    if (selectedAssessments.length > 0) {
      const tier = selectedAssessments.some(item => item.tier === 'RN') ? 'RN' : selectedAssessments.some(item => item.tier === 'PN') ? 'PN' : 'CG'
      return { tier, label: tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' : tier === 'PN' ? 'ผู้ช่วยพยาบาล (PN หรือ RN)' : 'ผู้ดูแลผู้สูงอายุ (CG / PN / RN)' }
    }
    if (selectedAssessments.length > 0) {
      const tier = selectedAssessments.some(item => item.tier === 'RN') ? 'RN' : selectedAssessments.some(item => item.tier === 'PN') ? 'PN' : 'CG'
      return { tier, label: tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' : tier === 'PN' ? 'ผู้ช่วยพยาบาล (PN หรือ RN)' : 'ผู้ดูแลผู้สูงอายุ (CG / PN / RN)' }
    }
    if (selectedPatients.length > 0) {
      return calculateOverallRequiredTier(selectedPatients)
    }
    return null
  }, [backendAssessments, selectedPatientIds, selectedPatients])

  // ระดับพยาบาลที่นำไปใช้ในการฟิลเตอร์จริง (Auto calculated หรือ Manual)
  const activeRequiredTier = calculatedTier?.tier || manualTier

  // สลับวันในสัปดาห์
  const handleToggleWeeklyDay = (day) => {
    if (weeklyDays.includes(day)) {
      setWeeklyDays(weeklyDays.filter(d => d !== day))
    } else {
      setWeeklyDays([...weeklyDays, day])
    }
  }

  // เปลี่ยนรูปแบบการจองและตั้งค่าฟิลด์ที่เกี่ยวข้องให้สอดคล้องกัน
  const handleBookingTypeChange = (type) => {
    setBookingType(type)
    if (type === 'shift') {
      setSelectedShift(selectedShift || 'morning_8h')
      setDateMode('range')
      setShiftDateMode('single')
      setFilterRetiredOnly(false)
    } else if (type === 'monthly') {
      setDateMode('range')
      setShiftDateMode('range')
      setSelectedShift(monthlyPlan === 'day12_26d' ? 'day_12h' : monthlyPlan === 'livein_24h' ? 'day_12h' : 'morning_8h')
      setEndDate(monthlyEndDate)
      setFilterRetiredOnly(true)
    }
  }

  const handleMonthlyPlanChange = (plan) => {
    setMonthlyPlan(plan)
    const planShift = plan === 'day12_26d' || plan === 'livein_24h' ? 'day_12h' : 'morning_8h'
    setSelectedShift(planShift)
    if (bookingType === 'monthly') setEndDate(monthlyEndDate)
  }

  // ค้นหาพยาบาล
  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    setError('')
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams()
      // ใช้จังหวัดเป็นตัวกรองกว้าง เพื่อไม่ตัดพยาบาลต่างอำเภอออกทั้งหมด
      // ระยะทางจริงและรัศมีบริการจะใช้จัดอันดับ/แสดงผลต่อใน Frontend
      if (province.trim()) params.append('area', province.trim())

      if (activeRequiredTier) {
        params.append('tier', activeRequiredTier)
      }

      if (bookingType === 'monthly' || filterRetiredOnly) {
        params.append('is_retired', 'true')
      }

      const response = await api.get(`/nurses/public-search?${params.toString()}`)
      const rawNurses = response.data || []

      // ทำการกรอง Matching Logic เพิ่มเติมที่ Frontend (ตารางเวร, วันที่, และรูปแบบการจอง)
      const matched = rawNurses.filter(nurse => {
        // กรองเฉพาะพยาบาลเกษียณอายุราชการ (ถ้าเลือกจองรายเดือน หรือผู้ใช้ติ๊กเลือก)
        if ((bookingType === 'monthly' || filterRetiredOnly) && !nurse.is_retired) {
          return false
        }

        // 1. ตรวจสอบคุณสมบัติระดับวิชาชีพ (Tier check)
        const nurseTier = nurse.professional_tier ? nurse.professional_tier.toUpperCase() : 'CG'
        if (activeRequiredTier === 'RN' && nurseTier !== 'RN') {
          return false
        }
        if (activeRequiredTier === 'PN' && nurseTier !== 'RN' && nurseTier !== 'PN') {
          return false
        }

        // 2. ตรวจสอบวันหมดอายุใบประกอบวิชาชีพ (License Expiration Check)
        const todayStr = new Date().toISOString().split('T')[0]
        if (nurse.license_expire_date && nurse.license_expire_date < todayStr) {
          return false
        }

        const requestedLastDate = bookingType === 'monthly'
          ? monthlyEndDate
          : (dateMode === 'weekly' && weeklyGeneratedDates.length > 0)
          ? weeklyGeneratedDates[weeklyGeneratedDates.length - 1]
          : (endDate || startDate)

        if (nurse.license_expire_date && requestedLastDate && requestedLastDate > nurse.license_expire_date) {
          return false
        }

        const activeBookings = nurse.active_bookings || []

        // 2. ถ้าเป็นเคสเหมาจ่ายรายเดือน (Dedicated 1-on-1 Monthly Care)
        if (bookingType === 'monthly') {
          // สัญญาเหมาจ่ายรายเดือนจองได้เฉพาะพยาบาลเกษียณอายุราชการเท่านั้น
          if (!nurse.is_retired) {
            return false
          }

          // พยาบาลที่รับงานเฉพาะวันหยุด ไม่สามารถรับงานรายเดือนเต็มเวลาได้
          if (nurse.availability_type === 'WEEKEND_ONLY') {
            return false
          }

          // สร้างรายการวันที่ 30 วันของสัญญาเดือน
          const monthlyDates = []
          if (startDate) {
            const cur = new Date(`${startDate}T00:00:00`)
            for (let i = 0; i < 30; i++) {
              monthlyDates.push(cur.toISOString().split('T')[0])
              cur.setDate(cur.getDate() + 1)
            }
          }

          // ตรวจสอบว่าพยาบาลมีนัดหมายบริการที่กำลังดำเนินการ (Active Booking) ทับซ้อนในช่วง 30 วันนี้หรือไม่
          const hasBookingConflict = activeBookings.some(booking => {
            if (booking.service_dates && booking.service_dates.length > 0) {
              return booking.service_dates.some(d => monthlyDates.includes(d.trim()))
            }
            if (booking.start_date) {
              const bStart = booking.start_date
              const bEnd = booking.end_date || bStart
              return monthlyDates.some(d => d >= bStart && d <= bEnd)
            }
            return false
          })
          if (hasBookingConflict) {
            return false
          }

          // ตรวจตารางเวรทุกวันของสัญญา 30 วันจาก roster แบบปี-เดือน > วันที่
          if (nurse.availability_type !== 'FLEXIBLE' && nurse.shift_schedule && startDate) {
            try {
              const sched = JSON.parse(nurse.shift_schedule)
              const roster = sched.hospital_code_schedule || {}
              const targetShift = selectedShift || (monthlyPlan === 'day12_26d' || monthlyPlan === 'livein_24h' ? 'day_12h' : 'morning_8h')
              for (const dateStr of monthlyDates) {
                const [y, m, d] = dateStr.split('-')
                const monthKey = `${y}-${m}`
                const dayNum = String(parseInt(d, 10))
                const monthData = roster[monthKey] || {}
                const code = monthData[dayNum]
                if (code && !isShiftCompatibleWithHospitalCode(code, targetShift)) return false
              }
            } catch (err) {
              return false
            }
          }
        }

        // ตรวจสอบการจองทับซ้อนสำหรับรูปแบบการจองแบบกะ/รายวัน
        if (bookingType === 'shift') {
          const searchDates = (dateMode === 'weekly' && weeklyGeneratedDates.length > 0)
            ? weeklyGeneratedDates
            : (dateMode === 'range' && endDate && endDate !== startDate)
            ? (() => {
                const dates = []
                const cur = new Date(`${startDate}T00:00:00`)
                const end = new Date(`${endDate}T00:00:00`)
                while (cur <= end) {
                  dates.push(cur.toISOString().split('T')[0])
                  cur.setDate(cur.getDate() + 1)
                }
                return dates
              })()
            : (startDate ? [startDate] : [])

          // 1. ถ้าพยาบาลติดสัญญาเหมาจ่ายรายเดือน (Monthly) ในวันที่ลูกค้าค้นหา -> ปิดรับงานรายวันทันที
          const hasMonthlyConflict = activeBookings.some(booking => {
            if (!booking.is_monthly) return false
            if (booking.service_dates && booking.service_dates.length > 0) {
              return booking.service_dates.some(d => searchDates.includes(d.trim()))
            }
            if (booking.start_date) {
              const bStart = booking.start_date
              const bEnd = booking.end_date || bStart
              return searchDates.some(d => d >= bStart && d <= bEnd)
            }
            return false
          })
          if (hasMonthlyConflict) {
            return false
          }

          // 2. ถ้าพยาบาลมีนัดหมายกะเวลาเดียวกันในวันดังกล่าว
          const hasShiftConflict = activeBookings.some(booking => {
            if (booking.is_monthly) return false
            if (selectedShift && booking.time_slot && booking.time_slot !== selectedShift) return false
            if (booking.service_dates && booking.service_dates.length > 0) {
              return booking.service_dates.some(d => searchDates.includes(d.trim()))
            }
            if (booking.start_date) {
              const bStart = booking.start_date
              const bEnd = booking.end_date || bStart
              return searchDates.some(d => d >= bStart && d <= bEnd)
            }
            return false
          })
          if (hasShiftConflict) {
            return false
          }
        }

        // 3. ตรวจสอบความพร้อมด้านกะเวลา (เมื่อจองตามกะเวลา)
        if (bookingType === 'shift' && selectedShift) {
          if (nurse.availability_type !== 'FLEXIBLE') {
            if (nurse.shift_schedule) {
              try {
                const sched = JSON.parse(nurse.shift_schedule)
                const shifts = sched.shifts || []
                if (shifts.length > 0 && !shifts.includes(selectedShift)) {
                  return false
                }
              } catch (err) {}
            }
          }
        }

        // 4. ตรวจสอบวันในสัปดาห์ (Weekly Day Matching)
        if (bookingType === 'shift' && dateMode === 'weekly' && weeklyDays.length > 0) {
          if (nurse.availability_type !== 'FLEXIBLE') {
            if (nurse.shift_schedule) {
              try {
                const sched = JSON.parse(nurse.shift_schedule)
                const nurseDays = sched.days || []
                if (nurseDays.length > 0) {
                  const coversAllRequestedDays = weeklyDays.every(d => nurseDays.includes(d))
                  if (!coversAllRequestedDays) return false
                }
                const roster = sched.hospital_code_schedule || {}
                for (const dateStr of weeklyGeneratedDates) {
                  const [y, m, d] = dateStr.split('-')
                  const monthKey = `${y}-${m}`
                  const dayNum = String(parseInt(d, 10))
                  const monthData = roster[monthKey] || {}
                  const code = monthData[dayNum]
                  if (code && !isShiftCompatibleWithHospitalCode(code, selectedShift)) {
                    return false
                  }
                }
              } catch (err) {}
            }
          }
        }

        // 5. ตรวจตารางเวรทุกวันในช่วงวันที่เลือก รองรับการข้ามเดือนไม่ใช่เฉพาะเดือนของ startDate
        if (bookingType === 'shift' && dateMode === 'range' && startDate && nurse.shift_schedule) {
          if (nurse.availability_type !== 'FLEXIBLE') {
            try {
              const sched = JSON.parse(nurse.shift_schedule)
              const roster = sched.hospital_code_schedule || {}
              const rangeEnd = endDate || startDate
              const cursor = new Date(`${startDate}T00:00:00`)
              const lastDate = new Date(`${rangeEnd}T00:00:00`)
              while (cursor <= lastDate) {
                const year = cursor.getFullYear()
                const monthKey = `${year}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
                const dayNum = String(cursor.getDate())
                const monthData = roster[monthKey] || {}
                const hospitalCode = monthData[dayNum]
                if (hospitalCode && !isShiftCompatibleWithHospitalCode(hospitalCode, selectedShift)) {
                  return false
                }
                cursor.setDate(cursor.getDate() + 1)
              }
            } catch (err) {
              return false
            }
          }
        }

        return true
      })

      // เพิ่มข้อมูลระยะทางจริง และ availability_hint สำหรับแสดงผล
      const enriched = matched.map(nurse => {
        let dist = null
        if (memberCoords && nurse.latitude && nurse.longitude) {
          dist = calculateDistanceKm(memberCoords.lat, memberCoords.lng, Number(nurse.latitude), Number(nurse.longitude))
        }

        let availabilityHint = null
        if (bookingType === 'monthly') {
          availabilityHint = { status: 'monthly', label: 'พร้อมรับงานรายเดือนประจำ', color: 'emerald' }
        } else if (bookingType === 'shift' && startDate && nurse.shift_schedule) {
          try {
            const sched = JSON.parse(nurse.shift_schedule)
            if (sched.hospital_code_schedule && Object.keys(sched.hospital_code_schedule).length > 0) {
              const dateObj = new Date(startDate)
              const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
              const dayNum = String(dateObj.getDate())
              const monthData = sched.hospital_code_schedule[monthKey]
              if (monthData && monthData[dayNum]) {
                const code = monthData[dayNum]
                if (code === 'X' || code === 'พ') {
                  availabilityHint = { status: 'all_day', label: 'ว่างรับงานทั้งวัน', color: 'emerald' }
                } else if (code === 'ช' || code === 'ป') {
                  availabilityHint = { status: 'evening', label: 'ว่างช่วงเย็น (หลัง 16:30 น.)', color: 'amber' }
                } else if (code === 'บ') {
                  availabilityHint = { status: 'morning', label: 'ว่างช่วงเช้า (08:00-15:00 น.)', color: 'sky' }
                }
              }
            }
            if (!availabilityHint && sched.shifts && sched.shifts.length > 0) {
              availabilityHint = { status: 'regular', label: 'พร้อมรับงานตามกะปกติ', color: 'emerald' }
            }
          } catch (err) {}
        }
        return { ...nurse, _distanceKm: dist, _availabilityHint: availabilityHint }
      })

      // จัดเรียงผลลัพธ์: พยาบาลที่อยู่ใกล้บ้านที่สุดขึ้นก่อน (Sort by Distance)
      enriched.sort((a, b) => {
        if (a._distanceKm != null && b._distanceKm != null) {
          return a._distanceKm - b._distanceKm
        }
        if (a._distanceKm != null) return -1
        if (b._distanceKm != null) return 1
        return 0
      })

      setNurses(enriched)
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  // เรียกค้นหาทันทีเมื่อโหลดหน้า หรือเมื่อข้อมูลเริ่มต้นพร้อม
  useEffect(() => {
    handleSearch()
  }, [province, district, activeRequiredTier, selectedShift, bookingType, shiftDateMode, monthlyPlan, memberCoords, dateMode, startDate, endDate, weeklyDays, weeksCount, filterRetiredOnly])

  // นำทางไปหน้าจองพร้อมส่งข้อมูลผู้ป่วย รูปแบบการจอง และเวลาที่เลือก
  const handleBookNurse = (nurse) => {
    if (!isLoggedIn) {
      showAlert({
        type: 'info',
        title: 'กรุณาเข้าสู่ระบบ',
        message: 'คุณต้องเข้าสู่ระบบก่อนทำการขอรับบริการพยาบาล',
        confirmText: 'ไปหน้าเข้าสู่ระบบ',
        onConfirm: () => navigate('/login')
      })
      return
    }

    if (nurse._distanceKm != null && nurse.service_radius_km && nurse._distanceKm > nurse.service_radius_km) {
      showAlert({
        type: 'warning',
        title: 'อยู่นอกพื้นที่ให้บริการ',
        message: `สถานที่ของคุณอยู่ห่าง ${nurse._distanceKm} กม. ซึ่งเกินกว่ารัศมีให้บริการของพยาบาล (${nurse.service_radius_km} กม.) กรุณาเลือกพยาบาลที่อยู่ในพื้นที่ใกล้เคียง`
      })
      return
    }

    const requestedLastDate = bookingType === 'monthly'
      ? monthlyEndDate
      : (dateMode === 'weekly' && weeklyGeneratedDates.length > 0)
      ? weeklyGeneratedDates[weeklyGeneratedDates.length - 1]
      : (endDate || startDate)

    if (nurse.license_expire_date && requestedLastDate && requestedLastDate > nurse.license_expire_date) {
      showAlert({
        type: 'warning',
        title: 'ใบอนุญาตไม่ครอบคลุมช่วงเวลา',
        message: `ใบอนุญาตประกอบวิชาชีพของพยาบาลจะหมดอายุในวันที่ ${formatDate(nurse.license_expire_date)} ซึ่งไม่ครอบคลุมวันที่รับบริการถึงวันที่ ${formatDate(requestedLastDate)} กรุณาเลือกพยาบาลท่านอื่นหรือปรับลดช่วงวันรับบริการ`
      })
      return
    }

    const firstPatientId = selectedPatientIds[0] || ''
    const patientIdsParam = selectedPatientIds.join(',')

    const query = new URLSearchParams()
    query.set('nurse_id', nurse.id || nurse.nurse_id)
    if (firstPatientId) query.set('patient_id', firstPatientId)
    if (patientIdsParam) query.set('patient_ids', patientIdsParam)

    // ส่งรูปแบบการจอง (Booking Type)
    query.set('booking_type', bookingType)

    if (bookingType === 'shift') {
      if (selectedShift) query.set('shift', selectedShift)
      query.set('time_slot', selectedShift)
      query.set('date_mode', dateMode)
      if (startDate) query.set('start_date', startDate)
      if (dateMode === 'range') {
        query.set('end_date', endDate || startDate)
      } else if (dateMode === 'weekly' && weeklyDays.length > 0) {
        query.set('weekly_days', weeklyDays.join(','))
        query.set('weeks_count', weeksCount.toString())
        query.set('end_date', weeklyEndDate || startDate)
        if (weeklyGeneratedDates.length > 0) {
          query.set('generated_dates', weeklyGeneratedDates.join(','))
        }
      }
    } else if (bookingType === 'monthly') {
      query.set('monthly_plan', monthlyPlan)
      query.set('start_date', startDate)
      query.set('end_date', monthlyEndDate)
      query.set('date_mode', 'range')
      const shiftForMonthly = monthlyPlan === 'day12_26d' ? 'day_12h' : monthlyPlan === 'livein_24h' ? 'day_12h' : 'morning_8h'
      query.set('shift', shiftForMonthly)
      query.set('time_slot', shiftForMonthly)
    }

    // ส่งพิกัดและที่อยู่ที่เลือกจากแผนที่
    if (memberCoords?.lat && memberCoords?.lng) {
      query.set('lat', memberCoords.lat.toString())
      query.set('lng', memberCoords.lng.toString())
    }
    if (province) query.set('province', province)
    if (district) query.set('district', district)
    if (searchAddress) {
      query.set('address', searchAddress)
    }

    // ล้าง draft เก่าที่อาจค้างใน sessionStorage เพื่อให้ข้อมูลวันที่และกะที่เพิ่งเลือกจากหน้าค้นหาถูกนำมาใช้ 100%
    try {
      sessionStorage.removeItem('request_service_draft')
    } catch (e) {}

    navigate(`/member/request-service?${query.toString()}`)
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Header */}
          <div>
            <h1 className="headline-font text-3xl font-bold text-[#222222]">ค้นหาและจับคู่พยาบาล (Smart Matching)</h1>
            <p className="text-[#45515e] text-sm mt-1">
              ระบบจับคู่พยาบาลวิชาชีพตามข้อมูลอาการของผู้ป่วย และตารางเวรการปฏิบัติงาน
            </p>
          </div>

          {/* กล่องค้นหาหลัก (Search & Matching Form) */}
          <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-purple-card border border-gray-100 p-6 lg:p-8 space-y-6">

            {/* SECTION 1: เลือกผู้ป่วยที่ต้องการรับบริการ (รองรับเลือกหลายคน) */}
            <div className="space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 pb-2.5">
                <label className="text-sm font-bold text-[#222222] headline-font flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1456f0] text-xl">personal_injury</span>
                  1. เลือกผู้ป่วยที่ต้องการรับบริการ (เลือกได้มากกว่า 1 ท่าน)
                </label>
                {isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => navigate('/member/patients/add')}
                    className="text-xs text-[#1456f0] font-semibold hover:underline flex items-center gap-1 py-1 px-3 rounded-full hover:bg-blue-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    + เพิ่มผู้ป่วยใหม่
                  </button>
                )}
              </div>

              {/* กรณีล็อกอินและมีผู้ป่วย */}
              {isLoggedIn && myPatients.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {myPatients.map(patient => {
                      const patientId = patient.id || patient.patient_id
                      const isSelected = selectedPatientIds.includes(patientId)
                      const assessed = assessPatientTier(patient)

                      return (
                        <div
                          key={patientId}
                          onClick={() => handleTogglePatient(patientId)}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-50/70 border-[#1456f0] ring-2 ring-[#1456f0]/20 shadow-purple-sm'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by div click
                                  className="w-4 h-4 text-[#1456f0] rounded border-gray-300 focus:ring-[#1456f0]"
                                />
                                <span className="font-bold text-sm text-[#222222]">
                                  {patient.first_name} {patient.last_name}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${assessed.badgeClass}`}>
                                {assessed.tier === 'RN' ? 'พยาบาลวิชาชีพ' : assessed.tier === 'PN' ? 'ผู้ช่วยพยาบาล' : 'ผู้ดูแลผู้สูงอายุ'}
                              </span>
                            </div>

                            <p className="text-xs text-[#45515e] mb-1">
                              {patient.relationship_to_member || 'ผู้ป่วย'} • อายุ {patient.age || '-'} ปี ({patient.gender || '-'})
                            </p>

                            <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed flex items-start gap-1 mt-1">
                              <span className="material-symbols-outlined text-xs text-[#1456f0] mt-0.5">stethoscope</span>
                              <span>{assessed.reason}</span>
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* สรุปผลการคำนวณระดับพยาบาล (Highest Tier Summary Bar) */}
                  {calculatedTier && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#1456f0] text-lg">verified_user</span>
                        <div>
                          <span className="font-bold text-[#222222]">
                            สรุปเกณฑ์จับคู่ ({selectedPatients.length} ท่าน):
                          </span>
                          <span className="ml-1 text-[#45515e]">
                            {selectedPatients.map(p => p.first_name).join(', ')}
                          </span>
                          <span className="mx-2 text-gray-300">|</span>
                          <span className="text-[#222222]">{calculatedTier.description}</span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold text-xs border ${calculatedTier.badgeClass}`}>
                        ต้องการระดับ: {calculatedTier.label}
                      </span>
                    </div>
                  )}

                  {/* คำแนะนำเมื่อเลือกผู้ป่วยมากกว่า 1 ท่าน (กฎอยู่บ้านเดียวกัน) */}
                  {selectedPatients.length > 1 && (
                    <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900">
                      <span className="material-symbols-outlined text-[#1456f0] text-base shrink-0">home</span>
                      <span>
                        <strong>ข้อกำหนดการดูแลผู้ป่วยหลายท่าน:</strong> ผู้ป่วยทั้ง {selectedPatients.length} ท่านต้องพักอาศัยอยู่ในบ้าน/สถานที่เดียวกันในรอบการให้บริการ เพื่อให้พยาบาลสามารถเฝ้าดูแลได้อย่างปลอดภัยและต่อเนื่อง
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Fallback สำหรับ Guest หรือยังไม่มีผู้ป่วย */
                <div className="p-4 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="text-tertiary">
                      {isLoggedIn
                        ? 'คุณยังไม่มีข้อมูลผู้ป่วยในระบบ กรุณาเพิ่มผู้ป่วยเพื่อการจับคู่ที่แม่นยำ หรือเลือกระดับพยาบาลที่ต้องการด้านล่าง'
                        : 'ยังไม่ได้เข้าสู่ระบบ คุณสามารถเลือกระดับพยาบาลที่ต้องการค้นหาได้โดยตรง:'}
                    </p>
                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={() => navigate('/member/patients/add')}
                        className="bg-[#007BFF] text-white px-3 py-1 rounded-[4px] font-semibold hover:bg-[#0069d9]"
                      >
                        + เพิ่มผู้ป่วย
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { id: '', label: 'ทุกระดับวิชาชีพ' },
                      { id: 'RN', label: 'พยาบาลวิชาชีพ (RN)' },
                      { id: 'PN', label: 'ผู้ช่วยพยาบาล (PN)' },
                      { id: 'CG', label: 'ผู้ดูแลผู้สูงอายุ (CG)' },
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setManualTier(t.id)}
                        className={`px-3 py-1.5 rounded-[4px] border font-semibold transition-all ${
                          manualTier === t.id
                            ? 'bg-[#007BFF] text-white border-[#007BFF]'
                            : 'bg-white border-[#ced4da] text-[#343A40] hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: พื้นที่จากแผนที่และรูปแบบการจอง */}
            <div className="pt-2 border-t border-gray-100 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-bold text-[#222222] headline-font flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1456f0] text-xl">location_on</span>
                  2. พื้นที่รับบริการ (พิกัดแผนที่ อำเภอ และจังหวัด)
                </label>
                {isCustomLocation && profileLocation && (
                  <button
                    type="button"
                    onClick={handleResetToProfileLocation}
                    className="text-xs font-semibold text-[#1456f0] hover:underline flex items-center gap-1 py-1 px-3 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">replay</span>
                    กลับไปใช้พิกัดตามโปรไฟล์
                  </button>
                )}
              </div>

              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1456f0]/10 text-[#1456f0] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-xl">home_pin</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#1456f0]">
                        {isCustomLocation ? 'ตำแหน่งที่เลือกชั่วคราวบนแผนที่' : 'ตำแหน่งตามโปรไฟล์ของคุณ'}
                      </span>
                      {memberCoords && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span>
                          มีพิกัด GPS แล้ว
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[#222222] mt-1">
                      {district ? `อำเภอ${district.replace(/^(อำเภอ|เขต)/g, '')}` : 'ไม่ระบุอำเภอ'}
                      {province ? ` จังหวัด${province.replace(/^จังหวัด/g, '')}` : 'ไม่ระบุจังหวัด'}
                    </p>
                    <p className="text-xs text-[#45515e] mt-0.5 truncate max-w-xl">
                      {searchAddress || 'คลิกหรือค้นหาบนแผนที่ด้านล่างเพื่อเปลี่ยนจุดรับบริการ'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-[#45515e] bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm font-semibold flex items-center gap-1 self-end sm:self-center shrink-0">
                  <span className="material-symbols-outlined text-sm text-gray-500">touch_app</span>
                  คลิกบนแผนที่เพื่อเปลี่ยนจุดได้
                </span>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm">
                <LocationPicker
                  lat={memberCoords?.lat}
                  lng={memberCoords?.lng}
                  onChangeLocation={handleLocationPicked}
                  readOnly={false}
                  height="260px"
                  label="ตำแหน่งแผนที่สำหรับค้นหาพยาบาล (คลิกเพื่อย้ายหมุด หรือพิมพ์ค้นหาสถานที่)"
                />
                {!memberCoords && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-amber-600">info</span>
                    กรุณาปักหมุดบนแผนที่ หรือเพิ่มพิกัดในหน้าโปรไฟล์ เพื่อให้ระบบคำนวณและเรียงลำดับพยาบาลตามระยะทางจริงได้
                  </p>
                )}
              </div>

              {/* รูปแบบการจอง */}
              <div>
                <label className="text-sm font-semibold text-on-surface-variant headline-font block mb-2">รูปแบบการจอง</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {[
                    { id: 'shift', icon: 'schedule', title: 'จองรายวัน / สัปดาห์', desc: 'เลือกวันและกะ 8 หรือ 12 ชั่วโมง' },
                    { id: 'monthly', icon: 'calendar_month', title: 'เหมาจ่ายรายเดือน', desc: 'ผู้ดูแลคนเดียวตลอดสัญญา 30 วัน' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => handleBookingTypeChange(type.id)}
                      className={`p-3 rounded-[4px] border text-left transition-all ${bookingType === type.id ? 'bg-[#007BFF]/10 border-[#007BFF] ring-1 ring-[#007BFF]' : 'bg-white border-[#ced4da] hover:border-[#007BFF]'}`}
                    >
                      <span className={`material-symbols-outlined text-xl ${bookingType === type.id ? 'text-[#007BFF]' : 'text-tertiary'}`}>{type.icon}</span>
                      <p className="font-bold text-sm mt-1">{type.title}</p>
                      <p className="text-[11px] text-tertiary mt-0.5">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {bookingType === 'shift' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant block mb-1">กะเวลาที่ต้องการ</label>
                      <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="w-full bg-white border border-[#ced4da] rounded-[4px] py-2.5 px-3 text-sm">
                        {SHIFT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-on-surface-variant block mb-1">รูปแบบวัน</label>
                      <div className="flex border border-[#ced4da] rounded-[4px] overflow-hidden">
                        <button type="button" onClick={() => { setDateMode('range'); setShiftDateMode('single') }} className={`flex-1 py-2 text-xs font-semibold ${dateMode === 'range' && shiftDateMode === 'single' ? 'bg-[#007BFF] text-white' : 'bg-white text-tertiary'}`}>วัน/ช่วงวัน</button>
                        <button type="button" onClick={() => { setDateMode('weekly'); setShiftDateMode('range') }} className={`flex-1 py-2 text-xs font-semibold ${dateMode === 'weekly' ? 'bg-[#007BFF] text-white' : 'bg-white text-tertiary'}`}>รายสัปดาห์</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingType === 'monthly' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-[4px] p-3.5 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-emerald-900">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                    <p><strong>ผู้ดูแลคนเดียวตลอดสัญญา (เฉพาะพยาบาลเกษียณอายุราชการ)</strong> บริการเหมาจ่ายรายเดือนสงวนสิทธิ์สำหรับพยาบาลเกษียณอายุราชการ เนื่องจากสามารถปฏิบัติงานต่อเนื่องเต็มเวลา 30 วัน โดยไม่มีตารางเวรโรงพยาบาล</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-emerald-900 block mb-1">แพ็กเกจรายเดือน</label>
                    <select value={monthlyPlan} onChange={e => handleMonthlyPlanChange(e.target.value)} className="w-full bg-white border border-emerald-200 rounded-[4px] py-2.5 px-3 text-sm">
                      <option value="day_26d">กะวัน 8 ชม. จันทร์–เสาร์ (26 วัน/เดือน)</option>
                      <option value="day12_26d">กะวัน 12 ชม. จันทร์–เสาร์ (26 วัน/เดือน)</option>
                      <option value="full_30d">เหมาดูแลทุกวัน (30 วัน/เดือน)</option>
                      <option value="livein_24h">พักอาศัยประจำ 24 ชม. (Live-in Care)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-emerald-800 block mb-1">วันเริ่มสัญญา</span><input type="date" value={startDate} min={new Date().toISOString().split('T')[0]} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-white border border-emerald-200 rounded-[4px]" /></div>
                    <div><span className="text-emerald-800 block mb-1">วันสิ้นสุดสัญญา (อัตโนมัติ)</span><input type="date" value={monthlyEndDate} readOnly className="w-full p-2.5 bg-emerald-100 border border-emerald-200 rounded-[4px] text-emerald-900" /></div>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: รายละเอียดวันที่สำหรับจองตามกะเวลา */}
            {bookingType === 'shift' && (
              <div className="bg-[#F8F9FA] border border-[#ced4da] p-4 rounded-[4px] space-y-3">
                {dateMode === 'range' ? (
                  /* โหมดช่วงวัน (Date Range) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-on-surface-variant block mb-1">วันที่เริ่มต้นรับบริการ</label>
                      <input
                        type="date"
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#ced4da] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-on-surface-variant block mb-1">วันที่สิ้นสุด (ถ้าจองหลายวันติดต่อกัน)</label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2.5 bg-white border border-[#ced4da] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                      />
                    </div>
                  </div>
                ) : (
                  /* โหมดรายสัปดาห์ (ล็อกไม่เกิน 4 สัปดาห์ / 1 เดือน) */
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-on-surface-variant">
                        เลือกวันในสัปดาห์ที่ต้องการรับบริการประจำ:
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-tertiary font-semibold">ระยะเวลา:</span>
                        <select
                          value={weeksCount}
                          onChange={(e) => setWeeksCount(parseInt(e.target.value) || 1)}
                          className="bg-white border border-[#ced4da] rounded-[4px] px-2.5 py-1 text-xs font-bold text-[#007BFF] focus:outline-none"
                        >
                          <option value={1}>1 สัปดาห์</option>
                          <option value={2}>2 สัปดาห์</option>
                          <option value={3}>3 สัปดาห์</option>
                          <option value={4}>4 สัปดาห์ (1 เดือน สูงสุด)</option>
                        </select>
                        <span className="text-tertiary text-[11px]">(ล็อกสูงสุดไม่เกิน 1 เดือน)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-on-surface-variant block mb-1">วันเริ่มต้นสัปดาห์แรก</label>
                        <input
                          type="date"
                          value={startDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-2.5 bg-white border border-[#ced4da] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                        />
                      </div>
                      <div className="flex items-end">
                        <p className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-[4px] text-xs text-blue-900">
                          <strong>รอบ Rolling:</strong> {startDate || '-'} ถึง {weeklyEndDate || '-'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant mb-2">เลือกวันที่ต้องการในแต่ละสัปดาห์:</p>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {ALL_DAYS.map(day => {
                          const isSelected = weeklyDays.includes(day)
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleToggleWeeklyDay(day)}
                              className={`py-2 text-center text-xs font-bold rounded-[4px] border transition-all ${
                                isSelected
                                  ? 'bg-[#007BFF] text-white border-[#007BFF] shadow-sm'
                                  : 'bg-white border-[#ced4da] text-[#343A40] hover:bg-gray-50'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {weeklyGeneratedDates.length > 0 && (
                      <div className="p-3 bg-white border border-[#ced4da] rounded-[4px]">
                        <p className="text-xs font-bold text-on-surface-variant mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[#007BFF] text-base">event_available</span>
                          วันที่นัดหมายจริง ({weeklyGeneratedDates.length} ครั้ง)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {weeklyGeneratedDates.map(date => (
                            <span key={date} className="px-2 py-1 bg-[#007BFF]/10 text-[#007BFF] border border-[#007BFF]/20 rounded text-[11px] font-semibold">
                              {new Date(`${date}T00:00:00`).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ตัวเลือกฟิลเตอร์เพิ่มเติม & ปุ่มกดค้นหา */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100">
              <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer border px-3.5 py-2 rounded-xl transition-all ${
                bookingType === 'monthly'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-amber-50/70 border-amber-200 text-[#222222]'
              }`}>
                <input
                  type="checkbox"
                  checked={bookingType === 'monthly' ? true : filterRetiredOnly}
                  disabled={bookingType === 'monthly'}
                  onChange={(e) => setFilterRetiredOnly(e.target.checked)}
                  className="w-4 h-4 text-[#1456f0] rounded border-gray-300"
                />
                <span>🎖️ เฉพาะพยาบาลเกษียณอายุราชการ {bookingType === 'monthly' ? '(ใช้กับแพ็กเกจรายเดือนอัตโนมัติ)' : '(ประสบการณ์สูง)'}</span>
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-8 py-3 bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white rounded-[4px] font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">search</span>
                {isLoading ? 'กำลังค้นหาและจับคู่...' : 'ค้นหาและจับคู่พยาบาล'}
              </button>
            </div>
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-[4px] flex items-center gap-3 text-sm text-[#DC3545]">
              <span className="material-symbols-outlined text-base">error</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Results Section */}
          {hasSearched && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-on-surface">
                  พบพยาบาลที่ตรงตามเกณฑ์: <span className="text-[#007BFF] font-bold text-base">{nurses.length}</span> ท่าน
                </p>
                {activeRequiredTier && (
                  <span className="text-xs text-tertiary">
                    คัดกรองพยาบาลระดับ: <strong>{activeRequiredTier}</strong> ขึ้นไป
                  </span>
                )}
              </div>

              {nurses.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl">person_search</span>
                  </div>
                  <h2 className="headline-font text-xl font-bold text-[#222222] mb-1.5">ไม่พบพยาบาลที่ตรงกับเกณฑ์การค้นหา</h2>
                  <p className="text-[#45515e] text-xs max-w-md mx-auto">
                    ลองขยายพื้นที่การค้นหา หรือปรับเปลี่ยนกะเวลาที่ต้องการเพื่อให้ระบบสามารถจับคู่พยาบาลได้มากขึ้น
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {nurses.map(nurse => {
                    const nurseId = nurse.id || nurse.nurse_id

                    return (
                      <div
                        key={nurseId}
                        className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-6 hover:shadow-purple-hover hover:-translate-y-1 transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Top: Avatar & Info */}
                          <div className="flex items-start gap-3.5 mb-4">
                            <div className="w-14 h-14 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center text-xl font-bold shrink-0 border border-blue-100 shadow-2xs">
                              {nurse.fullname?.[0] || nurse.first_name?.[0] || 'N'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-bold text-[#222222] text-base truncate group-hover:text-[#1456f0] transition-colors">
                                  {nurse.fullname || nurse.first_name} {nurse.surname || nurse.last_name}
                                </h3>
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  nurse.professional_tier === 'RN'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : nurse.professional_tier === 'PN'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {nurse.professional_tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' : nurse.professional_tier === 'PN' ? 'ผู้ช่วยพยาบาล (PN)' : 'ผู้ดูแลผู้สูงอายุ (CG)'}
                                </span>
                                {nurse.is_retired && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                                    🎖️ เกษียณอายุราชการ
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#45515e] mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-gray-400">location_on</span>
                                {nurse.service_area || 'ไม่ระบุพื้นที่'}
                              </p>

                              {nurse.license_expire_date && (
                                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-gray-400">verified</span>
                                  <span>ใบอนุญาตถึง: {formatDate(nurse.license_expire_date)}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Matching Criteria Badge */}
                          {selectedPatients.length > 0 && (
                            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                              <span>
                                ผ่านเกณฑ์ดูแลผู้ป่วย {selectedPatients.length} ท่าน ({nurse.professional_tier === 'RN' ? 'พยาบาลวิชาชีพ' : nurse.professional_tier === 'PN' ? 'ผู้ช่วยพยาบาล' : 'ผู้ดูแลผู้สูงอายุ'})
                              </span>
                            </div>
                          )}

                          {/* Quick Details */}
                          <div className="space-y-1.5 text-xs text-[#45515e] mb-4 py-2 border-t border-gray-100">
                            {nurse.specialty && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-[#1456f0]">medical_information</span>
                                <span>ความชำนาญ: <strong className="text-[#222222]">{nurse.specialty}</strong></span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                              <span>
                                รูปแบบการรับงาน: {nurse.availability_type === 'FLEXIBLE' ? 'เวลายืดหยุ่น' : 'เวลาตายตัวตามรอบเวร'}
                              </span>
                            </div>

                            {/* ระยะทางและการครอบคลุมรัศมีบริการ (Distance & Radius Badge) */}
                            {(() => {
                              if (nurse._distanceKm != null) {
                                const dist = nurse._distanceKm
                                const radius = nurse.service_radius_km || 10
                                const isWithin = dist <= radius
                                return (
                                  <div className={`flex items-center gap-1.5 p-2 rounded-xl border text-[11px] ${
                                    isWithin
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                    <span className="material-symbols-outlined text-sm">
                                      {isWithin ? 'near_me' : 'info'}
                                    </span>
                                    <span>
                                      ห่างจากบ้านคุณ <strong>{dist} กม.</strong> ({isWithin ? `อยู่ในรัศมีบริการ ${radius} กม.` : `เกินรัศมีบริการ ${radius} กม.`})
                                    </span>
                                  </div>
                                )
                              }
                              return null
                            })()}

                            {/* ความพร้อมรับงานวันที่ลูกค้าเลือก (PDPA-safe: ไม่เปิดเผยตารางเวร รพ. จริง) */}
                            {nurse._availabilityHint ? (
                              <div className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                nurse._availabilityHint.color === 'emerald'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : nurse._availabilityHint.color === 'amber'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-sky-50 text-sky-800 border-sky-300'
                              }`}>
                                <span className="material-symbols-outlined text-[13px]">event_available</span>
                                {nurse._availabilityHint.label}
                              </div>
                            ) : nurse.shift_schedule && (() => {
                              try {
                                const sched = JSON.parse(nurse.shift_schedule)
                                const shiftLabels = {
                                  morning_8h: 'เวรเช้า (8h)',
                                  afternoon_8h: 'เวรบ่าย (8h)',
                                  night_8h: 'เวรดึก (8h)',
                                  day_12h: 'กะวัน (12h)',
                                  night_12h: 'กะดึก (12h)'
                                }
                                const hasHospitalRoster = sched.hospital_code_schedule && Object.keys(sched.hospital_code_schedule).length > 0
                                return (
                                  <div className="pt-1 space-y-1">
                                    {hasHospitalRoster && (
                                      <span className="text-[10px] font-bold text-[#1456f0] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px]">local_hospital</span>
                                        พยาบาลประจำ รพ.
                                      </span>
                                    )}
                                    {sched.shifts && sched.shifts.length > 0 && (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="text-gray-400 text-[11px]">กะที่รับ:</span>
                                        {sched.shifts.map(s => (
                                          <span key={s} className="bg-gray-100 text-[#222222] px-2 py-0.5 rounded-full text-[10px] font-bold border border-gray-200">
                                            {shiftLabels[s] || s}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              } catch (e) {
                                return null
                              }
                            })()}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => handleBookNurse(nurse)}
                            disabled={nurse._distanceKm != null && nurse.service_radius_km && nurse._distanceKm > nurse.service_radius_km}
                            className="w-full bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-2.5 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-purple-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-sm">send</span>
                            ขอรับบริการทันที
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Initial / Default State */}
          {!hasSearched && (
            <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">clinical_notes</span>
              </div>
              <h2 className="headline-font text-xl font-bold text-[#222222] mb-1.5">เลือกผู้ป่วยและช่วงเวลาเพื่อเริ่มการค้นหา</h2>
              <p className="text-[#45515e] text-xs max-w-md mx-auto">
                ระบบจะวิเคราะห์ความต้องการทางการแพทย์ของผู้ป่วยและตารางเวร เพื่อจับคู่พยาบาลที่เหมาะสมที่สุดให้กับคุณ
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
