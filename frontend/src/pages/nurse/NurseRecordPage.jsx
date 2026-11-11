import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api.js'
import { getServiceFrequencyBadge } from '../../utils/serviceBadgeHelper.js'
import { formatDate, formatDateTime, formatConsciousness } from '../../utils/formatDate.js'

export default function NurseRecordPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()

  const [currentUser, setCurrentUser] = useState(null)
  const [userRole, setUserRole] = useState('')
  const [patientDetails, setPatientDetails] = useState(null)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [error, setError] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  const [form, setForm] = useState({
    check_in_time: '',
    check_out_time: '',
    visit_date: new Date().toISOString().split('T')[0],
    blood_pressure: '',
    heart_rate: '',
    body_temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    weight: '',
    pain_score: '',
    pain_location: '',
    consciousness: '',
    excretion: '',
    patient_condition: '',
    care_given: '',
    symptom_summary: '',
    medication_record: '',
    follow_up_date: '',
    care_image_url: ''
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const u = JSON.parse(userStr)
        setCurrentUser(u)
        setUserRole(u.role ? u.role.toLowerCase() : '')
      } catch (e) {}
    }
    fetchPatientData()
  }, [requestId])

  const fetchPatientData = async () => {
    try {
      const res = await api.get(`/service-requests/${requestId}`)
      const d = res.data
      setPatientDetails(d)

      // คัดกรองวันที่บันทึกไปแล้ว และกำหนดวันที่เริ่มต้นสำหรับการบันทึกครั้งใหม่
      const existingRecords = Array.isArray(d.care_records) ? d.care_records : []
      const recordedDates = existingRecords.map(r => r.visit_date).filter(Boolean)
      const todayStr = new Date().toISOString().split('T')[0]

      // หาวันที่ยังไม่ได้บันทึก: ถ้าวันนี้ยังไม่เคยบันทึกให้ใช้วันนี้
      let initialVisitDate = todayStr
      if (recordedDates.includes(todayStr)) {
        const scheduledDates = Array.isArray(d.service_dates)
          ? d.service_dates
          : (typeof d.service_dates === 'string' ? d.service_dates.split(',').map(s => s.trim()) : [])
        const unrecorded = scheduledDates.find(date => !recordedDates.includes(date))
        if (unrecorded) {
          initialVisitDate = unrecorded
        }
      }

      // สำหรับการบันทึกครั้งใหม่ ดึงเฉพาะข้อมูลพื้นฐานบางส่วนจากครั้งล่าสุด แต่ล้างเวลาและบันทึกของรอบใหม่ให้พร้อมกรอก
      const latestRecord = existingRecords[0] || d.care_record

      // ข้อ 5: การนัดหมายครั้งถัดไป จะขึ้นมาอัตโนมัติเมื่อจองเป็นรายเดือน
      let autoFollowUp = ''
      const isMonthly = d.subscription_type === 'Monthly' ||
                        (d.package_name && d.package_name.includes('รายเดือน')) ||
                        (d.additional_notes && d.additional_notes.includes('รายเดือน'))
      if (isMonthly) {
        const scheduledDates = Array.isArray(d.service_dates)
          ? d.service_dates
          : (typeof d.service_dates === 'string' ? d.service_dates.split(',').map(s => s.trim()) : [])

        // หาวันที่ในกำหนดการที่อยู่ถัดจาก initialVisitDate
        const nextScheduled = scheduledDates.find(date => date > initialVisitDate && !recordedDates.includes(date))
        if (nextScheduled) {
          autoFollowUp = nextScheduled
        } else {
          // ถ้าไม่มีในกำหนดการหรือวิ่งครบ ให้เป็นวันถัดไป (+1 วัน)
          try {
            const baseDate = new Date(initialVisitDate)
            baseDate.setDate(baseDate.getDate() + 1)
            autoFollowUp = baseDate.toISOString().split('T')[0]
          } catch (e) {
            autoFollowUp = ''
          }
        }
      }

      setForm(prev => ({
        ...prev,
        visit_date: initialVisitDate,
        check_in_time: '',
        check_out_time: '',
        blood_pressure: '',
        heart_rate: '',
        body_temperature: '',
        respiratory_rate: '',
        oxygen_saturation: '',
        weight: latestRecord?.weight != null ? String(latestRecord.weight) : prev.weight,
        pain_score: '',
        pain_location: '',
        consciousness: latestRecord?.consciousness || prev.consciousness,
        excretion: latestRecord?.excretion || prev.excretion,
        patient_condition: '',
        care_given: '',
        symptom_summary: '',
        medication_record: latestRecord?.medication_record || latestRecord?.medication || '',
        follow_up_date: autoFollowUp,
        care_image_url: ''
      }))

      // ดึงประวัติการดูแลครั้งก่อนหน้า (เฉพาะกรณีพยาบาลเป็นผู้เปิดดู)
      const uStr = localStorage.getItem('user')
      const role = uStr ? JSON.parse(uStr).role?.toLowerCase() : ''
      if (role === 'nurse' && d.patient_id) {
        try {
          const histRes = await api.get(`/nurses/patients/${d.patient_id}/history`)
          setHistory(histRes.data || [])
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถโหลดข้อมูลคำขอรับบริการได้')
    } finally {
      setIsFetching(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => {
      const updated = { ...prev, [name]: value }
      if (name === 'check_in_time' && value && value.includes('T')) {
        updated.visit_date = value.split('T')[0]
      }
      return updated
    })
    if (error) setError('')
  }

  const setTimeNow = (field) => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    const isoString = now.toISOString().slice(0, 16)
    setForm(prev => {
      const updated = { ...prev, [field]: isoString }
      if (field === 'check_in_time') {
        updated.visit_date = isoString.split('T')[0]
      }
      return updated
    })
    if (error) setError('')
  }

  const handleCareImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG หรือ WEBP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('ขนาดรูปภาพต้องไม่เกิน 5MB')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, care_image_url: reader.result }))
    }
    reader.readAsDataURL(file)
    if (error) setError('')
  }

  const removeCareImage = () => {
    setForm(prev => ({ ...prev, care_image_url: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // ข้อ 3: Validation เวลา Check-in และ Check-out (กำหนดให้เวลา Check-out ต้องมากกว่า Check-in อย่างน้อย 30 นาที)
    if (form.check_in_time && form.check_out_time) {
      const inTime = new Date(form.check_in_time).getTime()
      const outTime = new Date(form.check_out_time).getTime()
      const diffMinutes = (outTime - inTime) / (1000 * 60)

      if (diffMinutes <= 0) {
        setError('เวลาสิ้นสุด (Check-out) ต้องอยู่หลังเวลาเริ่มต้น (Check-in)')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (diffMinutes < 30) {
        setError('เวลา Check-out ต้องมากกว่าเวลา Check-in อย่างน้อย 30 นาที (ระยะเวลาบริการขั้นต่ำ 30 นาที)')
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
    }

    if (!form.symptom_summary.trim()) {
      setError('กรุณากรอกบันทึกพยาบาล (Nurse Notes) ก่อนส่งงาน')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (form.symptom_summary.length > 1000) {
      setError('บันทึกการพยาบาล (Nurse Notes) ต้องมีความยาวไม่เกิน 1,000 ตัวอักษร')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // กำหนดวันที่ประเมินจริง: ซิงค์ให้ตรงกับวันที่ของ Check-in ถ้ามีการระบุเวลา Check-in
    const targetDate = form.check_in_time && form.check_in_time.includes('T')
      ? form.check_in_time.split('T')[0]
      : form.visit_date

    const today = new Date().toISOString().split('T')[0]
    if (targetDate > today) {
      setError('ไม่สามารถบันทึกการให้บริการล่วงหน้าในอนาคตได้')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (form.follow_up_date && form.follow_up_date < today) {
      setError('วันนัดหมายครั้งถัดไปต้องเป็นวันที่ปัจจุบันหรือในอนาคตเท่านั้น')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const existingRecordForDate = careRecords.some(record => record.visit_date === targetDate)
    if (existingRecordForDate) {
      setError(`วันที่ ${targetDate} มีการบันทึกการดูแลแล้ว กรุณาเลือกวันที่ยังไม่มีบันทึก`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Range Validation สำหรับสัญญาณชีพ
    if (form.blood_pressure && !/^\d{2,3}\/\d{2,3}$/.test(form.blood_pressure.trim())) {
      setError('รูปแบบความดันโลหิตไม่ถูกต้อง (ต้องเป็น ตัวเลข/ตัวเลข เช่น 120/80)')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.heart_rate && (form.heart_rate < 30 || form.heart_rate > 220)) {
      setError('อัตราเต้นของหัวใจต้องอยู่ระหว่าง 30 ถึง 220 bpm')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.body_temperature && (form.body_temperature < 30 || form.body_temperature > 45)) {
      setError('อุณหภูมิร่างกายต้องอยู่ระหว่าง 30.0 ถึง 45.0 °C')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.oxygen_saturation && (form.oxygen_saturation < 50 || form.oxygen_saturation > 100)) {
      setError('ระดับออกซิเจนในเลือด (SpO2) ต้องอยู่ระหว่าง 50 ถึง 100%')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.respiratory_rate && (form.respiratory_rate < 5 || form.respiratory_rate > 60)) {
      setError('อัตราการหายใจต้องอยู่ระหว่าง 5 ถึง 60 ครั้งต่อนาที')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.pain_score && (form.pain_score < 0 || form.pain_score > 10)) {
      setError('ระดับความเจ็บปวด (Pain Score) ต้องอยู่ระหว่าง 0 ถึง 10')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (form.weight && (form.weight < 1 || form.weight > 300)) {
      setError('น้ำหนักต้องอยู่ระหว่าง 1 ถึง 300 กิโลกรัม')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setIsLoading(true)

    const payload = { ...form, visit_date: targetDate }
    if (payload.heart_rate) payload.heart_rate = parseInt(payload.heart_rate)
    if (payload.body_temperature) payload.body_temperature = parseFloat(payload.body_temperature)
    if (payload.respiratory_rate) payload.respiratory_rate = parseInt(payload.respiratory_rate)
    if (payload.oxygen_saturation) payload.oxygen_saturation = parseInt(payload.oxygen_saturation)
    if (payload.pain_score) payload.pain_score = parseInt(payload.pain_score)
    if (payload.weight) payload.weight = parseFloat(payload.weight)
    if (!payload.follow_up_date) payload.follow_up_date = null

    try {
      await api.post(`/nurses/requests/${requestId}/record`, payload)
      const savedCount = (patientDetails?.completed_service_count || 0) + 1
      const totalCount = patientDetails?.service_count || 1
      const remainingCount = Math.max(0, totalCount - savedCount)
      if (remainingCount > 0) {
        setSubmitMessage(`บันทึกการดูแลครั้งที่ ${savedCount} สำเร็จ เหลืออีก ${remainingCount} ครั้ง`)
        setIsLoading(false)
        setForm(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(key => [key, key === 'visit_date' ? prev[key] : ''])) }))
        await fetchPatientData()
      } else {
        navigate(`/nurse/fee/${requestId}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'บันทึกไม่สำเร็จ')
      setIsLoading(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (isFetching) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-[#007BFF]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-tertiary text-sm">กำลังโหลดข้อมูลการให้บริการ...</p>
        </div>
      </div>
    )
  }

  const d = patientDetails || {}
  const careRecords = Array.isArray(d.care_records) ? d.care_records : (d.care_record ? [d.care_record] : [])
  const cr = careRecords[0] || form
  const isRecurring = (d.service_count || 1) > 1
  const isCompleted = d.status === 'Completed'
  const isMember = userRole === 'member' || userRole === 'patient'
  const today = new Date().toISOString().split('T')[0]
  const isTodayRecorded = careRecords.some(record => record.visit_date === today)

  // รายการต่อเนื่องต้องเปิดฟอร์มต่อได้จนกว่าจะครบทุกครั้ง
  const showReportView = isMember || (isCompleted && !isRecurring)

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-grow p-6 lg:p-10 max-w-4xl mx-auto w-full space-y-6">

        {/* ========================================================
            VIEW MODE: รายงานบันทึกผลการพยาบาล (สำหรับ Member & Completed View)
           ======================================================== */}
        {showReportView ? (
          <div className="bg-white p-6 sm:p-10 rounded-[4px] shadow-sm border border-[#ced4da] space-y-6" id="care-report-print">

            {/* Report Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#ced4da]">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#007BFF] bg-[#007BFF]/10 px-2.5 py-1 rounded-[4px] mb-2 border border-[#007BFF]/20">
                  <span className="material-symbols-outlined text-sm">clinical_notes</span>
                  รายงานผลการพยาบาลและการดูแลผู้ป่วย (Care Service Report)
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold headline-font text-on-surface">
                  บันทึกการให้บริการ
                </h1>
                <p className="text-xs text-tertiary mt-1">
                  รหัสคำขอ: <span className="font-mono font-semibold text-on-surface">{requestId}</span> • วันที่ให้บริการ: <span className="font-semibold text-on-surface">{formatDate(d.start_date || cr.visit_date)}</span>
                </p>
              </div>

              {/* Status Badge & Print */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#28A745]/10 text-[#28A745] border border-[#28A745]/30 px-3 py-1 rounded-[4px] text-xs font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {d.status === 'Completed' ? 'เสร็จสิ้นสมบูรณ์' : 'บันทึกการดูแลแล้ว'}
                </span>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="print:hidden border border-[#ced4da] hover:bg-[#F8F9FA] text-[#343A40] px-3 py-1 rounded-[4px] text-xs font-semibold flex items-center gap-1 transition-all"
                  title="พิมพ์เอกสารรายงาน"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  พิมพ์รายงาน
                </button>
              </div>
            </div>

            {/* 1. ข้อมูลผู้ป่วยและพยาบาลผู้รับผิดชอบ (Context Card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8F9FA] border border-[#ced4da] p-5 rounded-[4px] text-xs">
              {/* ข้อมูลผู้ป่วย */}
              <div className="space-y-1.5">
                <p className="font-bold text-sm text-[#007BFF] headline-font flex items-center gap-1 mb-2">
                  <span className="material-symbols-outlined text-base">person</span>
                  ข้อมูลผู้ป่วย
                </p>
                <p><span className="text-tertiary">ชื่อ-นามสกุล:</span> <strong className="text-sm text-on-surface">{d.patient_name}</strong></p>
                <p><span className="text-tertiary">เพศ / อายุ:</span> {d.patient_gender || '-'} • อายุ {d.patient_age || '-'} ปี</p>
                <p><span className="text-tertiary">หมู่เลือด:</span> {d.blood_type || '-'}</p>
                <p><span className="text-tertiary">บริการที่ได้รับ:</span> <strong className="text-[#007BFF]">{d.service_type_name || 'ทั่วไป'}</strong></p>
                <p><span className="text-tertiary">สถานที่รับบริการ:</span> {d.service_address || '-'}</p>
              </div>

              {/* ข้อมูลพยาบาลผู้ดูแล */}
              <div className="space-y-1.5 md:border-l md:border-[#ced4da] md:pl-5">
                <p className="font-bold text-sm text-[#007BFF] headline-font flex items-center gap-1 mb-2">
                  <span className="material-symbols-outlined text-base">medical_services</span>
                  พยาบาลผู้ให้บริการ
                </p>
                <p><span className="text-tertiary">ชื่อพยาบาล:</span> <strong className="text-sm text-on-surface">{d.nurse_name || '-'}</strong></p>
                <p><span className="text-tertiary">ระดับวิชาชีพ:</span> <span className="bg-[#007BFF]/10 text-[#007BFF] px-2 py-0.5 rounded-[4px] font-bold text-[11px]">{d.nurse_tier || 'Nurse'}</span></p>
                {d.nurse_license_no && <p><span className="text-tertiary">เลขที่ใบประกอบวิชาชีพ:</span> {d.nurse_license_no}</p>}
                {d.nurse_phone && <p><span className="text-tertiary">เบอร์ติดต่อ:</span> {d.nurse_phone}</p>}
                {d.emergency_contact_phone && (
                  <p className="pt-1 text-tertiary">
                    ติดต่อฉุกเฉิน (ญาติ): <strong className="text-on-surface">{d.emergency_contact_name}</strong> ({d.emergency_contact_phone})
                  </p>
                )}
              </div>
            </div>

            {/* แถบเตือนประวัติแพ้ยา / แพ้อาหาร (Allergy & Medical Warning) */}
            {(d.drug_allergy || d.food_allergy || d.congenital_disease || d.special_precautions) && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-[4px] text-xs space-y-1 text-red-950">
                <div className="flex items-center gap-1.5 font-bold text-red-700 text-sm mb-1">
                  <span className="material-symbols-outlined text-base">emergency</span>
                  ข้อมูลความปลอดภัยทางการแพทย์ที่สำคัญ
                </div>
                {d.drug_allergy && <p><strong className="text-red-700">⚠️ ประวัติแพ้ยา:</strong> {d.drug_allergy}</p>}
                {d.food_allergy && <p><strong className="text-red-700">⚠️ ประวัติแพ้อาหาร:</strong> {d.food_allergy}</p>}
                {d.congenital_disease && <p><strong>โรคประจำตัว:</strong> {d.congenital_disease}</p>}
                {d.special_precautions && <p><strong>ข้อควรระวังพิเศษ:</strong> {d.special_precautions}</p>}
              </div>
            )}

            {/* 2. เวลาปฏิบัติงานจริง (Check-in & Check-out) */}
            {(cr.check_in_time || cr.check_out_time) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50 border border-blue-200 p-4 rounded-[4px] text-xs">
                <div>
                  <span className="text-tertiary block mb-0.5">เวลาเริ่มต้นปฏิบัติงาน (Check-in):</span>
                  <p className="font-bold text-sm text-blue-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">login</span>
                    {cr.check_in_time ? formatDateTime(cr.check_in_time) : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-tertiary block mb-0.5">เวลาสิ้นสุดปฏิบัติงาน (Check-out):</span>
                  <p className="font-bold text-sm text-blue-900 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">logout</span>
                    {cr.check_out_time ? formatDateTime(cr.check_out_time) : '-'}
                  </p>
                </div>
              </div>
            )}

            {/* 3. สัญญาณชีพ (Vital Signs) */}
            <section className="space-y-3">
              <h3 className="font-bold text-base text-primary headline-font flex items-center gap-2 border-b border-[#ced4da] pb-1.5">
                <span className="material-symbols-outlined text-lg">monitor_heart</span>
                สัญญาณชีพที่วัดได้ (Vital Signs)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <div className="bg-red-50/70 p-3 rounded-[4px] border border-red-200">
                  <span className="text-[11px] text-tertiary block mb-0.5">ความดันโลหิต</span>
                  <p className="font-bold text-lg text-red-700">{cr.blood_pressure || '-'}</p>
                  <span className="text-[10px] text-tertiary">mmHg</span>
                </div>

                <div className="bg-pink-50/70 p-3 rounded-[4px] border border-pink-200">
                  <span className="text-[11px] text-tertiary block mb-0.5">ชีพจร/หัวใจ</span>
                  <p className="font-bold text-lg text-pink-700">{cr.heart_rate || '-'}</p>
                  <span className="text-[10px] text-tertiary">ครั้ง/นาที (bpm)</span>
                </div>

                <div className="bg-orange-50/70 p-3 rounded-[4px] border border-orange-200">
                  <span className="text-[11px] text-tertiary block mb-0.5">อุณหภูมิร่างกาย</span>
                  <p className="font-bold text-lg text-orange-700">{cr.temperature || cr.body_temperature || '-'}</p>
                  <span className="text-[10px] text-tertiary">°C</span>
                </div>

                <div className="bg-cyan-50/70 p-3 rounded-[4px] border border-cyan-200">
                  <span className="text-[11px] text-tertiary block mb-0.5">ออกซิเจนในเลือด</span>
                  <p className="font-bold text-lg text-cyan-700">{cr.oxygen_saturation ? `${cr.oxygen_saturation}%` : '-'}</p>
                  <span className="text-[10px] text-tertiary">SpO2</span>
                </div>

                <div className="bg-blue-50/70 p-3 rounded-[4px] border border-blue-200">
                  <span className="text-[11px] text-tertiary block mb-0.5">อัตราการหายใจ</span>
                  <p className="font-bold text-lg text-blue-700">{cr.respiratory_rate || '-'}</p>
                  <span className="text-[10px] text-tertiary">ครั้ง/นาที</span>
                </div>

                <div className="bg-gray-50 p-3 rounded-[4px] border border-[#ced4da]">
                  <span className="text-[11px] text-tertiary block mb-0.5">น้ำหนักตัว</span>
                  <p className="font-bold text-lg text-on-surface">{cr.weight || '-'}</p>
                  <span className="text-[10px] text-tertiary">กก. (kg)</span>
                </div>
              </div>
            </section>

            {/* 4. การประเมินทางคลินิก (Clinical Tags) */}
            <section className="space-y-3">
              <h3 className="font-bold text-base text-primary headline-font flex items-center gap-2 border-b border-[#ced4da] pb-1.5">
                <span className="material-symbols-outlined text-lg">assignment</span>
                การประเมินสภาพผู้ป่วยเบื้องต้น
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px]">
                  <span className="text-tertiary block mb-1">ระดับความรู้สึกตัว (Consciousness):</span>
                  <span className="font-bold text-sm text-on-surface">{formatConsciousness(cr.consciousness)}</span>
                </div>
                <div className="p-3 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px]">
                  <span className="text-tertiary block mb-1">ระดับความปวด (Pain Score: 0-10):</span>
                  <span className="font-bold text-sm text-orange-700">
                    {cr.pain_score != null ? `${cr.pain_score}/10` : 'ไม่ระบุ'}
                    {cr.pain_location ? ` (${cr.pain_location})` : ''}
                  </span>
                </div>
                <div className="p-3 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px]">
                  <span className="text-tertiary block mb-1">สภาพการขับถ่าย (Excretion):</span>
                  <span className="font-bold text-sm text-on-surface">{cr.excretion || 'ไม่ระบุ'}</span>
                </div>
              </div>
            </section>

            {/* 5. บันทึกรายละเอียดการพยาบาลและการให้ยา */}
            <section className="space-y-4">
              <h3 className="font-bold text-base text-primary headline-font flex items-center gap-2 border-b border-[#ced4da] pb-1.5">
                <span className="material-symbols-outlined text-lg">medical_information</span>
                บันทึกการพยาบาลและการให้ยา
              </h3>

              <div className="space-y-3 text-xs">
                {/* การให้ยาและหัตถการ */}
                <div className="p-3.5 bg-white border border-[#ced4da] rounded-[4px]">
                  <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1 text-sm text-[#007BFF]">
                    <span className="material-symbols-outlined text-base">vaccines</span>
                    การให้ยา / การทำหัตถการทางการแพทย์ (Medication & Procedure Record)
                  </p>
                  <p className="text-on-surface whitespace-pre-wrap pl-6 leading-relaxed">
                    {cr.medication || cr.medication_record || 'ไม่มีการให้ยาหรือหัตถการพิเศษ'}
                  </p>
                </div>

                {/* สภาพผู้ป่วยและการพยาบาลที่ให้ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white border border-[#ced4da] rounded-[4px]">
                    <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1 text-sm text-[#007BFF]">
                      <span className="material-symbols-outlined text-base">face</span>
                      สภาพผู้ป่วยระหว่างการดูแล
                    </p>
                    <p className="text-on-surface whitespace-pre-wrap pl-6 leading-relaxed">
                      {cr.patient_condition || '-'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-[#ced4da] rounded-[4px]">
                    <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1 text-sm text-[#007BFF]">
                      <span className="material-symbols-outlined text-base">healing</span>
                      การพยาบาลที่ปฏิบัติ
                    </p>
                    <p className="text-on-surface whitespace-pre-wrap pl-6 leading-relaxed">
                      {cr.care_given || '-'}
                    </p>
                  </div>
                </div>

                {/* บันทึกพยาบาล / ข้อสังเกตและคำแนะนำ */}
                <div className="p-3.5 bg-white border border-[#ced4da] rounded-[4px]">
                  <p className="font-bold text-on-surface flex items-center gap-1.5 mb-1 text-sm text-[#007BFF]">
                    <span className="material-symbols-outlined text-base">notes</span>
                    บันทึกพยาบาล / ข้อสังเกตและคำแนะนำ (Nurse Notes)
                  </p>
                  <p className="text-on-surface whitespace-pre-wrap pl-6 leading-relaxed font-medium">
                    {cr.nursing_notes || cr.symptom_summary || '-'}
                  </p>
                </div>

                {/* รูปถ่ายการปฏิบัติงาน / ผลการดูแล (Care Image) */}
                {cr.care_image_url && (
                  <div className="p-3.5 bg-white border border-[#ced4da] rounded-[4px]">
                    <p className="font-bold text-on-surface flex items-center gap-1.5 mb-2 text-sm text-[#007BFF]">
                      <span className="material-symbols-outlined text-base">photo_camera</span>
                      รูปถ่ายการปฏิบัติงาน / ผลการดูแล (Care Image)
                    </p>
                    <div className="pl-6">
                      <img
                        src={cr.care_image_url}
                        alt="รูปถ่ายการปฏิบัติงาน"
                        onClick={() => setSelectedPhoto(cr.care_image_url)}
                        className="max-h-64 max-w-sm rounded-lg border border-[#ced4da] object-contain cursor-pointer hover:opacity-90 transition-opacity bg-black/5"
                      />
                      <p className="text-[11px] text-tertiary mt-1">คลิกที่รูปภาพเพื่อเปิดดูภาพขยายขนาดเต็ม</p>
                    </div>
                  </div>
                )}

                {/* วันนัดหมายครั้งถัดไป */}
                {cr.follow_up_date && (
                  <div className="p-3.5 bg-[#007BFF]/10 border border-[#007BFF]/30 rounded-[4px] flex items-center gap-2 text-sm text-[#007BFF]">
                    <span className="material-symbols-outlined text-lg">event</span>
                    <p><span className="font-semibold">วันนัดหมายดูแลครั้งถัดไป:</span> <strong>{formatDate(cr.follow_up_date)}</strong></p>
                  </div>
                )}
              </div>
            </section>

            {/* Footer Navigation Buttons (ซ่อนเวลาพิมพ์) */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-[#ced4da] print:hidden">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] text-[#343A40] px-5 py-2.5 rounded-[4px] font-semibold text-sm transition-all"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                ย้อนกลับ
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-[#007BFF] hover:bg-[#0069d9] text-white px-5 py-2.5 rounded-[4px] font-semibold text-sm transition-all"
              >
                <span className="material-symbols-outlined text-base">print</span>
                พิมพ์รายงานบันทึก
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================
              RECORD FORM: ฟอร์มสำหรับพยาบาลกรอกบันทึกขณะให้บริการ
             ======================================================== */
          <>
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-2xl font-bold headline-font text-on-surface">บันทึกการให้บริการ</h1>
              <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-[4px] font-bold">● กำลังให้บริการ</span>
            </div>

            {error && (
              <div className="p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-[4px] flex items-center gap-3 text-sm text-[#DC3545]">
                <span className="material-symbols-outlined text-base">error</span>
                <p className="font-medium">{error}</p>
              </div>
            )}
            {submitMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[4px] flex items-center gap-3 text-sm text-emerald-800">
                <span className="material-symbols-outlined text-base">check_circle</span>
                <p className="font-medium">{submitMessage}</p>
              </div>
            )}
            {isTodayRecorded && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-[4px] text-xs text-amber-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-lg">event_busy</span>
                <span><strong>บันทึกประจำวันครบแล้ว:</strong> เคสนี้มีการบันทึกการดูแลสำหรับวันนี้ไปแล้ว เพื่อความโปร่งใสระบบจำกัดการบันทึกได้เพียง 1 ครั้งต่อวัน คุณสามารถบันทึกรอบถัดไปได้ในวันพรุ่งนี้</span>
              </div>
            )}
            {patientDetails?.service_count > 1 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-[4px] text-sm text-blue-900">
                <p className="font-bold">ความคืบหน้าการดูแล</p>
                <p className="mt-1">บันทึกแล้ว {patientDetails.completed_service_count || 0} / {patientDetails.service_count} ครั้ง • เหลืออีก {patientDetails.remaining_service_count ?? patientDetails.service_count} ครั้ง</p>
              </div>
            )}

            {/* --- Patient Info Card & Bedside Safety Alert --- */}
            {patientDetails && (
              <div className="bg-white p-5 rounded-[4px] shadow-sm border border-[#ced4da] space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[4px] bg-[#007BFF]/10 text-[#007BFF] flex items-center justify-center text-2xl font-bold border border-[#007BFF]/20">
                      {patientDetails.patient_name?.[0] || 'P'}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-on-surface">{patientDetails.patient_name}</h2>
                      <p className="text-xs text-tertiary mt-0.5">
                        บริการ: <span className="font-semibold text-primary">{patientDetails.service_type_name || 'ทั่วไป'}</span> • อายุ {patientDetails.patient_age || '-'} ปี ({patientDetails.patient_gender || '-'})
                      </p>
                      {patientDetails.is_complex_wound && (
                        <span className="inline-block mt-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-[4px] font-bold border border-orange-200">
                          แผลซับซ้อน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View History Button */}
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-1.5 border border-[#007BFF] text-[#007BFF] hover:bg-[#F8F9FA] px-3.5 py-1.5 rounded-[4px] text-xs font-semibold transition-all"
                  >
                    <span className="material-symbols-outlined text-base">history</span>
                    {showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติคนไข้ครั้งก่อน'}
                  </button>
                </div>

                {/* เตือนข้อมูลสุขภาพและความปลอดภัยข้างเตียงผู้ป่วย */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#ced4da] text-xs">
                  <div>
                    {patientDetails.drug_allergy ? (
                      <p className="text-[#DC3545] font-bold">⚠️ แพ้ยา: {patientDetails.drug_allergy}</p>
                    ) : (
                      <p className="text-tertiary">ประวัติแพ้ยา: <span className="text-on-surface">ปฏิเสธประวัติแพ้ยา</span></p>
                    )}
                    {patientDetails.food_allergy && <p className="text-orange-700 font-semibold">⚠️ แพ้อาหาร: {patientDetails.food_allergy}</p>}
                    <p className="text-tertiary">โรคประจำตัว: <span className="text-on-surface font-semibold">{patientDetails.congenital_disease || 'ไม่มี'}</span></p>
                  </div>
                  <div>
                    <p className="text-tertiary">อาการสำคัญ: <span className="text-on-surface font-semibold">{patientDetails.chief_complaint || '-'}</span></p>
                    {patientDetails.special_precautions && <p className="text-red-700 font-semibold">ข้อควรระวัง: {patientDetails.special_precautions}</p>}
                    <p className="text-tertiary">ติดต่อญาติฉุกเฉิน: <span className="text-on-surface font-semibold">{patientDetails.emergency_contact_phone || '-'}</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* --- History View --- */}
            {showHistory && (
              <div className="bg-surface-container-lowest p-5 rounded-[4px] shadow-sm border border-[#ced4da]">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#ced4da]">
                  <h3 className="font-bold text-primary text-sm flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">description</span>
                    ประวัติการดูแลครั้งก่อนหน้าของผู้ป่วยรายนี้
                  </h3>
                  <button onClick={() => setShowHistory(false)} className="text-tertiary hover:text-error">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
                {history.length === 0 ? (
                  <p className="text-xs text-tertiary italic text-center py-4">ยังไม่มีประวัติการดูแลบันทึกไว้ก่อนหน้านี้</p>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {history.map(h => (
                      <div key={h.id} className="bg-white p-3.5 rounded-[4px] border border-[#ced4da] text-xs">
                        <div className="flex justify-between mb-2 pb-1.5 border-b border-gray-100 font-semibold">
                          <span>วันที่: {formatDate(h.visit_date)}</span>
                          <span className="text-[#007BFF]">พยาบาล: {h.nurse_name}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2 text-[11px]">
                          {h.blood_pressure && <p><span className="text-tertiary">BP:</span> <strong>{h.blood_pressure}</strong></p>}
                          {h.heart_rate && <p><span className="text-tertiary">HR:</span> <strong>{h.heart_rate} bpm</strong></p>}
                          {h.body_temperature && <p><span className="text-tertiary">Temp:</span> <strong>{h.body_temperature} °C</strong></p>}
                          {h.oxygen_saturation && <p><span className="text-tertiary">SpO2:</span> <strong>{h.oxygen_saturation}%</strong></p>}
                        </div>
                        {h.symptom_summary && <p className="bg-[#F8F9FA] p-2 rounded-[4px] mt-1 text-[11px]"><strong>บันทึก:</strong> {h.symptom_summary}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-[4px] shadow-sm border border-[#ced4da] space-y-8">

              {/* 1. ข้อมูลพื้นฐานและเวลาปฏิบัติงาน */}
              <section>
                <h3 className="font-bold text-lg text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">schedule</span>ข้อมูลพื้นฐานและเวลาปฏิบัติงาน
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-tertiary mb-1 block">วันที่ประเมิน (บันทึกได้วันละ 1 ครั้ง)</label>
                    <input type="date" name="visit_date" value={form.visit_date} max={today} onChange={handleChange} className="w-full p-2.5 bg-white border border-[#ced4da] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-tertiary mb-1 block">เวลาเริ่ม (Check-in)</label>
                    <div className="flex gap-1">
                      <input type="datetime-local" name="check_in_time" value={form.check_in_time} onChange={handleChange} className="w-full p-2.5 bg-white border border-[#ced4da] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2" />
                      <button type="button" onClick={() => setTimeNow('check_in_time')} className="border border-[#007BFF] text-[#007BFF] px-2 rounded-[4px] hover:bg-[#F8F9FA]" title="เวลาปัจจุบัน"><span className="material-symbols-outlined text-[20px]">my_location</span></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-tertiary mb-1 block">เวลาสิ้นสุด (Check-out)</label>
                    <div className="flex gap-1">
                      <input
                        type="datetime-local"
                        name="check_out_time"
                        value={form.check_out_time}
                        min={form.check_in_time || undefined}
                        onChange={handleChange}
                        className={`w-full p-2.5 bg-white border rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 ${
                          form.check_in_time && form.check_out_time && new Date(form.check_out_time) <= new Date(form.check_in_time)
                            ? 'border-[#DC3545]'
                            : 'border-[#ced4da]'
                        }`}
                      />
                      <button type="button" onClick={() => setTimeNow('check_out_time')} className="border border-[#007BFF] text-[#007BFF] px-2 rounded-[4px] hover:bg-[#F8F9FA]" title="เวลาปัจจุบัน"><span className="material-symbols-outlined text-[20px]">my_location</span></button>
                    </div>
                    {form.check_in_time && form.check_out_time && new Date(form.check_out_time) <= new Date(form.check_in_time) && (
                      <p className="text-[#DC3545] text-[11px] mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        เวลา Check-out ต้องอยู่หลังเวลา Check-in (วันเดียวกันได้ แต่เวลาต้องไม่เท่ากันหรือก่อนหน้า)
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. สัญญาณชีพ */}
              <section>
                <h3 className="font-bold text-lg text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">monitor_heart</span>สัญญาณชีพ (Vital Signs)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-red-50/50 p-3 rounded-[4px] border border-red-100">
                    <label className="text-xs font-bold text-red-800 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">blood_pressure</span> ความดันโลหิต</label>
                    <div className="flex items-center gap-2"><input type="text" name="blood_pressure" value={form.blood_pressure} onChange={handleChange} placeholder="120/80" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-red-600">mmHg</span></div>
                  </div>
                  <div className="bg-pink-50/50 p-3 rounded-[4px] border border-pink-100">
                    <label className="text-xs font-bold text-pink-800 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">favorite</span> อัตราเต้นหัวใจ</label>
                    <div className="flex items-center gap-2"><input type="number" name="heart_rate" value={form.heart_rate} onChange={handleChange} placeholder="72" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-pink-600">bpm</span></div>
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-[4px] border border-orange-100">
                    <label className="text-xs font-bold text-orange-800 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">device_thermostat</span> อุณหภูมิ</label>
                    <div className="flex items-center gap-2"><input type="number" step="0.1" name="body_temperature" value={form.body_temperature} onChange={handleChange} placeholder="36.5" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-orange-600">°C</span></div>
                  </div>
                  <div className="bg-cyan-50/50 p-3 rounded-[4px] border border-cyan-100">
                    <label className="text-xs font-bold text-cyan-800 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">air</span> ระดับออกซิเจน</label>
                    <div className="flex items-center gap-2"><input type="number" name="oxygen_saturation" value={form.oxygen_saturation} onChange={handleChange} placeholder="98" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-cyan-600">%</span></div>
                  </div>
                  <div className="bg-blue-50/50 p-3 rounded-[4px] border border-blue-100">
                    <label className="text-xs font-bold text-blue-800 flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">pulmonology</span> อัตราการหายใจ</label>
                    <div className="flex items-center gap-2"><input type="number" name="respiratory_rate" value={form.respiratory_rate} onChange={handleChange} placeholder="20" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-blue-600">/min</span></div>
                  </div>
                  <div className="bg-surface-container p-3 rounded-[4px] border border-outline-variant/30">
                    <label className="text-xs font-bold text-tertiary flex items-center gap-1 mb-1"><span className="material-symbols-outlined text-[16px]">weight</span> น้ำหนัก</label>
                    <div className="flex items-center gap-2"><input type="number" step="0.1" name="weight" value={form.weight} onChange={handleChange} placeholder="55.0" className="w-full p-2 rounded-[4px] border border-[#ced4da] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" /><span className="text-[10px] text-tertiary">kg</span></div>
                  </div>
                </div>
              </section>

              {/* 3. การประเมินเบื้องต้น */}
              <section>
                <h3 className="font-bold text-lg text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">assignment</span>การประเมินเบื้องต้น (Clinical Tags)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-tertiary mb-2 block">ระดับความรู้สึกตัว (CONSCIOUSNESS)</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: 'Alert', label: 'รู้สึกตัวดี' },
                        { key: 'Drowsy', label: 'ซึมลง' },
                        { key: 'Confusion', label: 'สับสน' },
                        { key: 'Unconscious', label: 'ไม่รู้สึกตัว' }
                      ].map(({ key, label }) => (
                        <label key={key} className={`cursor-pointer px-3 py-1.5 rounded-[4px] text-xs font-semibold border transition-colors ${form.consciousness === key ? 'bg-[#007BFF] text-white border-[#007BFF]' : 'bg-white border-[#ced4da] hover:bg-[#F8F9FA]'}`}>
                          <input type="radio" name="consciousness" value={key} onChange={handleChange} className="hidden" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#FFC107]/10 p-4 rounded-[4px] border border-[#FFC107]/30">
                    <label className="text-xs font-bold text-[#343A40] mb-2 block">ระดับความปวด (PAIN SCORE: 0-10)</label>
                    <div className="flex gap-1 mb-3">
                      {[0,1,2,3,4,5,6,7,8,9,10].map(score => (
                        <label key={score} className={`cursor-pointer w-6 h-6 flex items-center justify-center rounded-[4px] text-[10px] font-bold border transition-colors ${parseInt(form.pain_score) === score ? (score >= 7 ? 'bg-[#DC3545] text-white border-[#DC3545]' : score >= 4 ? 'bg-[#FFC107] text-[#343A40] border-[#FFC107]' : 'bg-[#007BFF] text-white border-[#007BFF]') : 'bg-white border-[#ced4da] hover:bg-[#F8F9FA]'}`}>
                          <input type="radio" name="pain_score" value={score} onChange={handleChange} className="hidden" />
                          {score}
                        </label>
                      ))}
                    </div>
                    {form.pain_score > 0 && (
                      <input type="text" name="pain_location" value={form.pain_location} onChange={handleChange} placeholder="ตำแหน่งที่ปวด เช่น ท้องซ้ายล่าง, แขนขวา" className="w-full p-2 text-xs border border-[#ced4da] rounded-[4px] bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]" />
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-tertiary mb-2 block">การขับถ่าย</label>
                    <div className="flex flex-wrap gap-2">
                      {['ถ่ายปกติ', 'ไม่ถ่าย', 'ท้องผูก', 'ท้องเสีย', 'ปัสสาวะผิดปกติ'].map(status => (
                        <label key={status} className={`cursor-pointer px-4 py-2 rounded-[4px] text-xs font-semibold border transition-colors ${form.excretion === status ? 'bg-[#007BFF] text-white border-[#007BFF]' : 'bg-white border-[#ced4da] hover:bg-[#F8F9FA]'}`}>
                          <input type="radio" name="excretion" value={status} onChange={handleChange} className="hidden" />
                          {status}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. รายละเอียดเพิ่มเติม & นัดหมาย */}
              <section className="space-y-4">
                <h3 className="font-bold text-lg text-primary border-b border-outline-variant/20 pb-2 flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined">edit_note</span>บันทึกรายละเอียดและการพยาบาล
                </h3>

                <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                  <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[18px] text-tertiary">vaccines</span>การให้ยา/หัตถการ (Medication Record)</label>
                  <textarea name="medication_record" value={form.medication_record} onChange={handleChange} rows="2" placeholder="เช่น Berodual fort 1 NB พ่นยาขยายหลอดลม (09:00 น.) หรือ เช็ดตัวลดไข้" className="w-full p-3 bg-white border border-[#ced4da] rounded-[4px] resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                    <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[18px] text-tertiary">face</span>สภาพผู้ป่วย</label>
                    <textarea name="patient_condition" value={form.patient_condition} onChange={handleChange} rows="3" placeholder="ระบุอาการปัจจุบัน เช่น ความรู้สึกตัว การรับประทานอาหาร การขับถ่าย" className="w-full p-3 bg-white border border-[#ced4da] rounded-[4px] resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"></textarea>
                  </div>
                  <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                    <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[18px] text-tertiary">healing</span>การพยาบาลที่ให้</label>
                    <textarea name="care_given" value={form.care_given} onChange={handleChange} rows="3" placeholder="ระบุการพยาบาลที่ปฏิบัติ เช่น การให้ยา เช็ดตัว พลิกตะแคงตัว ทำแผล" className="w-full p-3 bg-white border border-[#ced4da] rounded-[4px] resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"></textarea>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                  <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[18px] text-tertiary">notes</span>บันทึกพยาบาล (Nurse Notes) *</label>
                  <textarea name="symptom_summary" value={form.symptom_summary} onChange={handleChange} rows="4" placeholder="บันทึกเพิ่มเติม ข้อสังเกต หรือสิ่งที่ต้องการแจ้งแพทย/ผู้ดูแล..." className="w-full p-3 bg-white border border-[#ced4da] rounded-[4px] resize-none text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"></textarea>
                </div>

                {/* รูปถ่ายการปฏิบัติงาน / บาดแผล / ผลการดูแล (Care Image) */}
                <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                  <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[18px] text-[#007BFF]">photo_camera</span>
                    รูปถ่ายการปฏิบัติงาน / ผลการดูแล (Care Image - ถ้ามี)
                  </label>
                  <p className="text-xs text-tertiary mb-3">
                    แนบรูปถ่ายการทำแผล การจัดยา สภาพผู้ป่วย หรือหลักฐานการปฏิบัติงาน (ไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 5MB)
                  </p>

                  {form.care_image_url ? (
                    <div className="relative inline-block border border-[#ced4da] rounded-lg p-2 bg-white">
                      <img
                        src={form.care_image_url}
                        alt="รูปถ่ายการปฏิบัติงาน"
                        className="max-h-56 max-w-full rounded object-contain"
                      />
                      <button
                        type="button"
                        onClick={removeCareImage}
                        className="absolute top-3 right-3 bg-[#DC3545] hover:bg-red-700 text-white p-1.5 rounded-full shadow-md flex items-center justify-center cursor-pointer transition-all"
                        title="ลบรูปภาพ"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-[#ced4da] rounded-lg p-6 text-center hover:bg-gray-50/50 transition-colors">
                      <input
                        type="file"
                        id="care-image-upload"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleCareImageChange}
                        className="hidden"
                      />
                      <label htmlFor="care-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-[#007BFF]">add_photo_alternate</span>
                        <span className="text-sm font-semibold text-[#007BFF] hover:underline">คลิกเพื่ออัปโหลดรูปถ่าย</span>
                        <span className="text-xs text-tertiary">รองรับไฟล์ภาพ JPG, PNG, WEBP</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* วันนัดหมายครั้งถัดไป */}
                <div className="bg-surface-container-lowest p-4 border border-[#ced4da] rounded-[4px]">
                  <label className="text-sm font-bold text-on-surface flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px] text-[#007BFF]">event</span>
                    วันนัดหมายดูแลครั้งถัดไป (Follow-up Date - ถ้ามี)
                  </label>
                  <input
                    type="date"
                    name="follow_up_date"
                    value={form.follow_up_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={handleChange}
                    className="w-full sm:w-64 p-2.5 bg-white border border-[#ced4da] rounded-[4px] text-sm focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
                  />
                  <p className="text-[11px] text-tertiary mt-1">
                    ระบุวันนัดติดตามผลหรือทำแผลรอบถัดไป เพื่อให้ผู้รับบริการทราบล่วงหน้า
                    {form.follow_up_date && (patientDetails?.subscription_type === 'Monthly' || patientDetails?.package_name?.includes('รายเดือน') || patientDetails?.additional_notes?.includes('รายเดือน')) && (
                      <span className="text-[#007BFF] font-medium ml-1">(ระบบกำหนดวันนัดหมายถัดไปให้อัตโนมัติสำหรับการจองรายเดือน - สามารถเปลี่ยนได้)</span>
                    )}
                  </p>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-outline-variant/20">
                <button type="button" onClick={() => navigate('/nurse/requests')} className="w-1/3 py-3 border border-[#ced4da] bg-white hover:bg-[#F8F9FA] text-[#343A40] rounded-[4px] font-semibold transition-all">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isLoading || !form.symptom_summary || isTodayRecorded} className="w-2/3 flex items-center justify-center gap-2 bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white rounded-[4px] font-semibold transition-all disabled:opacity-50">
                  {isLoading ? 'กำลังบันทึก...' : isTodayRecorded ? 'บันทึกของวันนี้เรียบร้อยแล้ว' : <><span className="material-symbols-outlined">send</span> {patientDetails?.service_count > 1 ? `บันทึกการดูแล (รอบที่ ${(patientDetails?.completed_service_count || 0) + 1}/${patientDetails?.service_count})` : 'ส่งบันทึกและแจ้งงานเสร็จสิ้น'}</>}
                </button>
              </div>
            </form>
          </>
        )}
      </main>

      {/* Lightbox Modal สำหรับดูรูปภาพขยายขนาดเต็ม */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <span className="font-bold text-sm text-[#222222] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#007BFF] text-lg">photo_camera</span>
                รูปถ่ายการปฏิบัติงาน / ผลการดูแล (ขนาดเต็ม)
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4 bg-black/5 flex items-center justify-center overflow-auto max-h-[78vh]">
              <img
                src={selectedPhoto}
                alt="รูปถ่ายการพยาบาลขนาดเต็ม"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
