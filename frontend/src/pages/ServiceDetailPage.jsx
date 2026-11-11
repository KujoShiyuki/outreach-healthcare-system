import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api.js'
import LocationPicker from '../components/LocationPicker.jsx'
import { useModal } from '../context/ModalContext.jsx'
import { getServiceFrequencyBadge } from '../utils/serviceBadgeHelper.js'
import { formatDate, formatDateTime, formatConsciousness } from '../utils/formatDate.js'

const SYMPTOM_LABELS = {
  rehab_need: 'ต้องการช่วยพยุงเดิน/ฝึกกายภาพ', dementia: 'ภาวะหลงลืม/สมองเสื่อม', wound_care: 'แผลเรื้อรัง/แผลกดทับ/แผลผ่าตัด',
  tube_feeding: 'ให้อาหารทางสายยาง', urinary_catheter: 'ดูแลสายสวนปัสสาวะ', suction_needed: 'ดูดเสมหะ/ดูแลท่อเจาะคอ',
  ventilator_user: 'ใช้เครื่องช่วยหายใจ', oncology_care: 'ผู้ป่วยโรคมะเร็ง', stroke_care: 'โรคหลอดเลือดสมอง (Stroke)',
  delirium: 'ภาวะสับสนเฉียบพลัน', depression: 'ภาวะซึมเศร้า', choking_risk: 'มีความเสี่ยงสำลัก', hospital_escort: 'ต้องพาไปพบแพทย์',
  medication_management: 'ต้องจัดและบริหารยา', bedridden_hygiene: 'ผู้ป่วยติดเตียง/ต้องพลิกตัว', oxygen_dependent: 'ต้องใช้ออกซิเจน/พ่นยา',
  insulin_injection: 'เจาะน้ำตาล/ฉีดอินซูลิน', drainage_care: 'ดูแลสายระบาย', ostomy_care: 'ดูแลทวารเทียม'
}

export default function ServiceDetailPage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const { requestId } = useParams()
  const [detail, setDetail] = useState(null)
  const [history, setHistory] = useState([]) // สำหรับประวัติคนไข้
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isNurse, setIsNurse] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [showWoundModal, setShowWoundModal] = useState(false)
  const [selectedCareRecordId, setSelectedCareRecordId] = useState(null)
  const [selectedCarePhoto, setSelectedCarePhoto] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (!token) { navigate('/login'); return }
    const role = (user.role || '').toLowerCase()
    if (role === 'nurse') setIsNurse(true)
    if (role === 'member' || role === 'patient') setIsMember(true)
    fetchDetail()
  }, [])

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/service-requests/${requestId}`)
      setDetail(res.data)

      // ถ้าเป็นพยาบาล ให้ดึงประวัติการดูแลคนไข้มาด้วย
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      if (user.role === 'nurse' && res.data.patient_id) {
        try {
          const histRes = await api.get(`/nurses/patients/${res.data.patient_id}/history`)
          setHistory(histRes.data || [])
        } catch (histErr) {
          // หากไม่มีประวัติเดิมหรือไม่สามารถดึงได้ ไม่ควรทำให้หน้าแสดงรายละเอียดบริการล่ม
          console.warn('Could not load patient history', histErr)
        }
      }

    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResponse = async (action) => {
    try {
      await api.post(`/nurses/requests/${requestId}/respond`, { action })
      showAlert({
        type: 'success',
        title: action === 'Accept' ? 'รับงานเรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว',
        message: action === 'Accept' ? 'คุณได้รับงานนี้แล้ว สามารถเริ่มบันทึกการพยาบาลได้เมื่อเริ่มงาน' : 'ระบบได้บันทึกการปฏิเสธคำขอนี้เรียบร้อยแล้ว',
        confirmText: 'กลับไปหน้ารายการ',
        onConfirm: () => navigate('/nurse/requests')
      })
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
      })
    }
  }

  const handleCancelRequest = async () => {
    try {
      await api.post(`/service-requests/${requestId}/cancel`)
      showAlert({
        type: 'success',
        title: 'ยกเลิกคำขอสำเร็จ',
        message: 'คำขอรับบริการถูกยกเลิกเรียบร้อยแล้ว',
        confirmText: 'ตกลง',
        onConfirm: () => fetchDetail()
      })
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'ไม่สามารถยกเลิกได้',
        message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำขอ'
      })
    }
  }

  const getStatusLabel = (status) => {
    const map = {
      'Pending': 'รอการตอบรับ', 'Accepted': 'รับงานแล้ว', 'Paid': 'ชำระเงินแล้ว',
      'InProgress': 'กำลังให้บริการ', 'Completed': 'เสร็จสิ้น', 'Rejected': 'ปฏิเสธ', 'Cancelled': 'ยกเลิก'
    }
    return map[status] || status
  }

  // แปลงรหัสกะเวลาเป็นชื่อภาษาไทยมาตรฐานที่เข้าใจง่าย
  const getShiftLabel = (timeSlot) => {
    const shiftMap = {
      'morning_8h': 'เวรเช้า 8 ชม. (08.00 – 16.00 น.)',
      'afternoon_8h': 'เวรบ่าย 8 ชม. (16.00 – 24.00 น.)',
      'night_8h': 'เวรดึก 8 ชม. (24.00 – 08.00 น.)',
      'day_12h': 'กะกลางวัน 12 ชม. (08.00 – 20.00 น.)',
      'night_12h': 'กะกลางคืน 12 ชม. (20.00 – 08.00 น.)',
      'morning': 'ช่วงเช้า (08.00 – 12.00 น.)',
      'afternoon': 'ช่วงบ่าย (13.00 – 17.00 น.)',
      'evening': 'ช่วงเย็น (17.00 – 20.00 น.)',
      'fullday': 'ทั้งวัน (08.00 – 20.00 น.)',
      'flexible': 'เวลายืดหยุ่น (ตามตกลง)'
    }
    return shiftMap[timeSlot] || timeSlot || '-'
  }

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-primary" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
          <p className="text-error font-semibold">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-primary hover:underline">← กลับ</button>
        </div>
      </div>
    )
  }

  const d = detail || {}
  const careRecords = Array.isArray(d.care_records) ? d.care_records : (d.care_record ? [d.care_record] : [])
  const selectedCare = careRecords.find(record => record.id === selectedCareRecordId) || careRecords[0] || {}
  const care = selectedCare
  const frequency = getServiceFrequencyBadge(d)

  // แยกวิเคราะห์หมายเหตุและรูปแบบการให้บริการ (ไม่แสดงคำว่า "โหมดจอง" หรือวงเล็บก้ามปูทางเทคนิค)
  const parseNotes = (notes) => {
    if (!notes) return { userNotes: '', bookingPlan: '', otherTags: [] }

    let raw = notes
    let bookingPlan = ''
    const otherTags = []

    const bookingMatch = raw.match(/\[(?:โหมดจอง|รูปแบบการให้บริการ|รูปแบบการรับบริการ):\s*([^\]]+)\]/)
    if (bookingMatch) {
      let plan = bookingMatch[1].trim()
      const sameDay = plan.match(/^ช่วงวัน(?:ที่)?\s*(\d{4}-\d{2}-\d{2})\s*ถึง\s*\1$/)
      if (sameDay) {
        bookingPlan = `บริการรายครั้ง (วันที่ ${sameDay[1]})`
      } else if (plan.startsWith('ช่วงวัน ') && !plan.startsWith('ช่วงวันที่ ')) {
        bookingPlan = plan.replace(/^ช่วงวัน\s*/, 'ช่วงวันที่ ')
      } else {
        bookingPlan = plan
      }
      raw = raw.replace(bookingMatch[0], '')
    }

    const tagMatches = raw.match(/\[[^\]]+\]/g) || []
    for (const tag of tagMatches) {
      otherTags.push(tag.slice(1, -1))
      raw = raw.replace(tag, '')
    }

    const userNotes = raw.trim()
    return { userNotes, bookingPlan, otherTags }
  }

  const { userNotes, bookingPlan, otherTags } = parseNotes(d.additional_notes)

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow p-6 lg:p-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100">
            <h1 className="headline-font text-3xl font-bold text-[#222222] mb-6">รายละเอียดการบริการ</h1>

            {/* สถานะ */}
            <div className="mb-8 p-4 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-[#1456f0] uppercase tracking-wider">สถานะคำขอ</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${frequency.badgeClass}`}>
                  <span className="material-symbols-outlined text-sm">{frequency.icon}</span>
                  {frequency.label}
                </span>
                {frequency.isRecurring && (
                  <span className="text-xs font-bold text-[#1456f0] bg-white px-2.5 py-1 rounded-full border border-blue-200">
                    บันทึกแล้ว {frequency.progressText}
                  </span>
                )}
              </div>
              <span className="px-3.5 py-1 rounded-full bg-[#1456f0] text-white text-xs font-bold shadow-2xs">{getStatusLabel(d.status)}</span>
            </div>

            {/* ข้อมูลทั่วไป */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <span className="material-symbols-outlined text-[#1456f0] text-lg">info</span>
                <h3 className="text-base font-bold headline-font text-[#222222]">ข้อมูลทั่วไป</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[#45515e] mb-1">ผู้ป่วย</p>
                  <p className="font-bold text-sm text-[#222222]">{d.patient_name || '-'}</p>
                </div>
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[#45515e] mb-1">พยาบาล</p>
                  <p className="font-bold text-sm text-[#222222]">{d.nurse_name || '-'}</p>
                </div>
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[#45515e] mb-1">วันที่ให้บริการ</p>
                  <p className="font-bold text-sm text-[#222222]">{formatDate(d.start_date)}</p>
                </div>
                <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[#45515e] mb-1">ช่วงเวลา (กะที่ให้บริการ)</p>
                  <p className="font-bold text-sm text-[#1456f0]">{getShiftLabel(d.time_slot)}</p>
                </div>
                <div className="md:col-span-2 bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                  <p className="text-[#45515e] mb-1">ที่อยู่รับบริการ</p>
                  <p className="font-bold text-sm text-[#222222]">{d.service_address || '-'}</p>
                </div>
                {d.latitude && d.longitude && (
                  <div className="md:col-span-2 bg-white rounded-2xl p-4 border border-gray-200">
                    <LocationPicker
                      lat={Number(d.latitude)}
                      lng={Number(d.longitude)}
                      readOnly={true}
                      height="220px"
                      label="พิกัดแผนที่บ้านผู้ป่วย (จุดหมายปลายทาง)"
                    />
                  </div>
                )}
                {d.special_precautions && (
                  <div className="md:col-span-2 bg-rose-50 rounded-2xl p-4 border border-rose-200">
                    <p className="text-rose-700 text-xs mb-1 font-bold">ข้อควรระวังพิเศษ</p>
                    <p className="font-semibold text-rose-900">{d.special_precautions}</p>
                  </div>
                )}
                {bookingPlan && (
                  <div className="md:col-span-2 bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[#45515e] text-xs mb-1">รูปแบบการให้บริการ</p>
                    <p className="font-semibold text-sm text-[#222222]">{bookingPlan}</p>
                  </div>
                )}
                {userNotes && (
                  <div className="md:col-span-2 bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[#45515e] text-xs mb-1">หมายเหตุเพิ่มเติม</p>
                    <p className="font-semibold text-sm text-[#222222] whitespace-pre-line">{userNotes}</p>
                  </div>
                )}
                {otherTags.length > 0 && (
                  <div className="md:col-span-2 bg-blue-50/60 rounded-2xl p-4 border border-blue-100 space-y-1">
                    {otherTags.map((t, idx) => (
                      <p key={idx} className="text-xs text-blue-900 font-medium">ℹ️ {t}</p>
                    ))}
                  </div>
                )}
                {d.is_complex_wound && (
                  <div className="md:col-span-2 bg-amber-50 rounded-2xl p-4 border border-amber-200">
                    <p className="text-amber-800 text-sm mb-1 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">warning</span> เคสบาดแผลซับซ้อน
                    </p>
                    <p className="text-xs text-amber-700">ผู้ป่วยมีการระบุลักษณะบาดแผลที่ต้องการความเชี่ยวชาญเฉพาะทาง</p>
                  </div>
                )}
                {d.total_price && (
                  <div className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                    <p className="text-[#45515e] text-xs mb-1">ค่าบริการรวม</p>
                    <p className="font-bold text-[#1456f0] headline-font text-lg">฿{d.total_price.toLocaleString()}</p>
                  </div>
                )}
              </div>
            </section>

            {/* ข้อมูลสุขภาพและประวัติผู้ป่วยฉบับเต็ม (Read-Only Medical Profile) */}
            <section className="mb-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-lg font-bold headline-font text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#1456f0]">badge</span>
                  ประวัติและข้อมูลสุขภาพผู้ป่วย
                </h3>
              </div>

              {/* แจ้งเตือนความปลอดภัยทางการแพทย์ (แพ้ยา/แพ้อาหาร) */}
              {(d.drug_allergy || d.food_allergy) && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs space-y-1 text-red-950">
                  <div className="flex items-center gap-1.5 font-bold text-red-700 text-sm mb-1">
                    <span className="material-symbols-outlined text-base">emergency</span>
                    ข้อมูลเตือนภัยทางการแพทย์ที่ต้องระมัดระวังเป็นพิเศษ
                  </div>
                  {d.drug_allergy && <p><strong className="text-red-700">⚠️ ประวัติแพ้ยา:</strong> {d.drug_allergy}</p>}
                  {d.food_allergy && <p><strong className="text-orange-700">⚠️ ประวัติแพ้อาหาร:</strong> {d.food_allergy}</p>}
                </div>
              )}

              {/* 1. ข้อมูลผู้ป่วยและการติดต่อ */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1456f0]">person</span>
                  ข้อมูลพื้นฐานและการติดต่อฉุกเฉิน
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">ชื่อ-นามสกุล</span>
                    <strong className="text-[#222222]">{d.patient_name || '-'}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">เพศ / อายุ</span>
                    <strong className="text-[#222222]">{d.patient_gender || '-'} • {d.patient_age || '-'} ปี</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">วันเดือนปีเกิด</span>
                    <strong className="text-[#222222]">{formatDate(d.birth_date)}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">หมู่เลือด</span>
                    <strong className="text-rose-600">{d.blood_type || '-'}</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 sm:col-span-2 md:col-span-4">
                    <span className="text-gray-400 block mb-0.5">ผู้ติดต่อฉุกเฉิน (ญาติผู้ป่วย)</span>
                    <strong className="text-[#222222]">{d.emergency_contact_name || '-'} ({d.emergency_contact_relationship || '-'}) • โทร {d.emergency_contact_phone || '-'}</strong>
                  </div>
                </div>
              </div>

              {/* 2. อาการสำคัญและข้อบ่งชี้การดูแล */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1456f0]">clinical_notes</span>
                  อาการสำคัญและอุปกรณ์การแพทย์
                </h4>
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {d.chief_complaint
                      ? d.chief_complaint.split(',').filter(item => !item.trim().startsWith('other:')).map(item => {
                          const clean = item.trim()
                          return (
                            <span key={clean} className="px-2.5 py-1 bg-white text-[#1456f0] border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs">
                              {SYMPTOM_LABELS[clean] || clean}
                            </span>
                          )
                        })
                      : <span className="text-xs text-gray-400">ไม่มีการระบุอาการสำคัญ</span>}
                  </div>

                  {d.chief_complaint && d.chief_complaint.includes('other:') && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
                      <strong>ข้อมูล/อาการเพิ่มเติมที่ญาติระบุ: </strong>
                      {d.chief_complaint.split(',').find(item => item.trim().startsWith('other:'))?.replace('other:', '').trim()}
                    </div>
                  )}

                  {d.current_assistance && (
                    <p className="text-xs text-blue-900 border-t border-blue-100 pt-2">
                      <strong>อุปกรณ์การแพทย์/ความช่วยเหลือปัจจุบัน:</strong> {d.current_assistance}
                    </p>
                  )}
                </div>
              </div>

              {/* 3. การประเมินทางคลินิก (Functional Status) */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#1456f0]">assignment</span>
                  การประเมินทางคลินิกและสภาพทั่วไป (Functional Status)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">ระดับ ADL</span>
                    <strong className="text-[#222222]">{d.adl_score || '-'}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">ระดับความรู้สึกตัว</span>
                    <strong className="text-[#222222]">{formatConsciousness(d.consciousness)}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">โรคประจำตัว</span>
                    <strong className="text-[#222222]">{d.congenital_disease || 'ไม่มี'}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">การมองเห็น</span>
                    <strong className="text-[#222222]">{d.vision_ability || '-'}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">การได้ยิน</span>
                    <strong className="text-[#222222]">{d.hearing_ability || '-'}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block mb-0.5">การขับถ่าย / ยาระบาย</span>
                    <strong className="text-[#222222]">{d.elimination || '-'} {d.laxative_use ? `(${d.laxative_use})` : ''}</strong>
                  </div>
                </div>
              </div>

              {/* ข้อจำกัดด้านอาหาร */}
              {d.dietary_restrictions && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                  <span className="text-gray-400 block mb-0.5">ข้อจำกัดด้านอาหาร</span>
                  <p className="font-semibold text-[#222222]">{d.dietary_restrictions}</p>
                </div>
              )}

              {/* ภาพถ่ายบาดแผลจริง */}
              {d.wound_photo_url && (
                <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <p className="text-orange-900 text-xs font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-orange-600">photo_library</span>
                      รูปถ่ายบาดแผลของผู้ป่วยที่แนบมาในคำขอ
                    </p>
                    <span className="text-[11px] text-orange-700 font-semibold bg-orange-100 border border-orange-200 px-2 py-0.5 rounded">
                      คลิกเพื่อดูภาพขยาย
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-orange-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={d.wound_photo_url}
                      alt="รูปถ่ายบาดแผลผู้ป่วย"
                      onClick={() => setShowWoundModal(true)}
                      className="h-36 w-48 object-cover rounded-lg border border-gray-200 shadow-xs cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-[#1456f0] transition-all shrink-0"
                    />
                    <div className="text-xs text-tertiary space-y-1.5 flex-1">
                      <p className="font-bold text-sm text-on-surface">ภาพถ่ายบาดแผลจริงก่อนเริ่มการบริการ</p>
                      <p className="text-on-surface-variant leading-relaxed">
                        ภาพนี้ส่งตรงจากผู้ขอรับบริการ เพื่อให้พยาบาลประเมินลักษณะบาดแผล ความรุนแรง และเตรียมเวชภัณฑ์ที่เหมาะสมล่วงหน้า
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowWoundModal(true)}
                        className="mt-1 text-xs text-[#1456f0] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">zoom_in</span>
                        คลิกเปิดดูภาพขนาดเต็ม (Full Resolution)
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ความคืบหน้าและประวัติการดูแลรายวัน */}
            {frequency.isRecurring && (
              <section className="mb-8 bg-blue-50/60 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="font-bold text-[#1456f0] flex items-center gap-2"><span className="material-symbols-outlined">timeline</span>ความคืบหน้าการดูแล</h3>
                  <span className="text-sm font-bold text-[#1456f0]">{frequency.progressText}</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-blue-100">
                  <div className="h-full bg-[#1456f0] transition-all" style={{ width: `${d.service_count ? Math.min(100, ((d.completed_service_count || 0) / d.service_count) * 100) : 0}%` }} />
                </div>
                <p className="text-xs text-[#45515e] mt-2">ช่วงเวลา: {frequency.dateRangeText}</p>
              </section>
            )}

            {careRecords.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-bold headline-font text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">event_note</span>ประวัติการดูแลรายวัน ({careRecords.length} รอบ)
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {careRecords.map((record, index) => (
                    <button key={record.id || record.visit_date || index} type="button" onClick={() => setSelectedCareRecordId(record.id)}
                      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${care.id === record.id ? 'bg-[#1456f0] text-white border-[#1456f0]' : 'bg-white text-[#1456f0] border-blue-200 hover:bg-blue-50'}`}>
                      <span className="material-symbols-outlined text-sm align-middle mr-1">calendar_today</span>{formatDate(record.visit_date)}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* บันทึกการดูแลของวันที่เลือก */}
            {(care.blood_pressure || care.heart_rate || care.nursing_notes || care.consciousness || care.patient_condition || care.care_given) && (
              <section className="mb-8">
                <h3 className="text-lg font-bold headline-font text-primary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">monitor_heart</span>สัญญาณชีพ & บันทึกพยาบาล (ครั้งนี้)
                </h3>

                {/* ข้อมูลการเข้า-ออก */}
                {(care.check_in_time || care.check_out_time) && (
                  <div className="flex gap-4 mb-4 text-sm bg-blue-50 p-4 rounded-[4px] border border-blue-200">
                    <div className="flex-1">
                      <p className="text-tertiary text-xs">เวลาเข้างาน (Check-in)</p>
                      <p className="font-bold text-blue-800">{care.check_in_time ? formatDateTime(care.check_in_time) : '-'}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-tertiary text-xs">เวลาเลิกงาน (Check-out)</p>
                      <p className="font-bold text-blue-800">{care.check_out_time ? formatDateTime(care.check_out_time) : '-'}</p>
                    </div>
                  </div>
                )}

                <h4 className="font-bold text-sm text-tertiary mb-2 border-b pb-1">สัญญาณชีพ (Vital Signs)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {care.blood_pressure && (
                    <div className="bg-red-50 rounded-[4px] p-4 text-center border border-red-100">
                      <p className="text-xs text-tertiary">ความดันโลหิต</p>
                      <p className="font-bold text-lg text-red-700">{care.blood_pressure}</p>
                      <p className="text-xs text-tertiary">mmHg</p>
                    </div>
                  )}
                  {care.heart_rate && (
                    <div className="bg-pink-50 rounded-[4px] p-4 text-center border border-pink-100">
                      <p className="text-xs text-tertiary">ชีพจร</p>
                      <p className="font-bold text-lg text-pink-700">{care.heart_rate}</p>
                      <p className="text-xs text-tertiary">bpm</p>
                    </div>
                  )}
                  {care.respiratory_rate && (
                    <div className="bg-blue-50 rounded-[4px] p-4 text-center border border-blue-100">
                      <p className="text-xs text-tertiary">อัตราหายใจ</p>
                      <p className="font-bold text-lg text-blue-700">{care.respiratory_rate}</p>
                      <p className="text-xs text-tertiary">breaths/min</p>
                    </div>
                  )}
                  {care.temperature && (
                    <div className="bg-orange-50 rounded-[4px] p-4 text-center border border-orange-100">
                      <p className="text-xs text-tertiary">อุณหภูมิ</p>
                      <p className="font-bold text-lg text-orange-700">{care.temperature}</p>
                      <p className="text-xs text-tertiary">°C</p>
                    </div>
                  )}
                  {care.oxygen_saturation && (
                    <div className="bg-cyan-50 rounded-[4px] p-4 text-center border border-cyan-100">
                      <p className="text-xs text-tertiary">ออกซิเจน</p>
                      <p className="font-bold text-lg text-cyan-700">{care.oxygen_saturation}%</p>
                      <p className="text-xs text-tertiary">SpO2</p>
                    </div>
                  )}
                  {care.weight && (
                    <div className="bg-surface-container rounded-[4px] p-4 text-center border border-outline-variant/30">
                      <p className="text-xs text-tertiary">น้ำหนัก</p>
                      <p className="font-bold text-lg">{care.weight}</p>
                      <p className="text-xs text-tertiary">kg</p>
                    </div>
                  )}
                </div>

                {/* Clinical Tags */}
                {(care.consciousness || care.pain_score || care.excretion) && (
                  <>
                    <h4 className="font-bold text-sm text-tertiary mb-2 border-b pb-1 mt-4">การประเมินเบื้องต้น</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {care.consciousness && <span className="bg-[#007BFF]/10 text-[#007BFF] px-3 py-1 rounded-[4px] text-xs font-bold border border-[#007BFF]/20">ความรู้สึกตัว: {formatConsciousness(care.consciousness)}</span>}
                      {care.pain_score && <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-[4px] text-xs font-bold border border-orange-200">Pain Score: {care.pain_score}/10 {care.pain_location ? `(${care.pain_location})` : ''}</span>}
                      {care.excretion && <span className="bg-surface-container-highest text-on-surface px-3 py-1 rounded-[4px] text-xs font-bold border border-outline-variant/30">การขับถ่าย: {care.excretion}</span>}
                    </div>
                  </>
                )}

                {/* Medication & Care given */}
                <h4 className="font-bold text-sm text-tertiary mb-2 border-b pb-1 mt-4">บันทึกรายละเอียด</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {care.patient_condition && (
                    <div className="bg-white p-3 rounded-[4px] border border-[#ced4da]">
                      <p className="text-tertiary text-xs mb-1 font-bold">สภาพผู้ป่วย</p>
                      <p className="text-sm">{care.patient_condition}</p>
                    </div>
                  )}
                  {care.care_given && (
                    <div className="bg-white p-3 rounded-[4px] border border-[#ced4da]">
                      <p className="text-tertiary text-xs mb-1 font-bold">การพยาบาลที่ให้</p>
                      <p className="text-sm">{care.care_given}</p>
                    </div>
                  )}
                </div>
                {care.medication && (
                  <div className="bg-white p-3 rounded-[4px] border border-[#ced4da] mb-3">
                    <p className="text-tertiary text-xs mb-1 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">vaccines</span> การให้ยา/หัตถการ</p>
                    <p className="text-sm">{care.medication}</p>
                  </div>
                )}
                {care.nursing_notes && (
                  <div className="bg-surface-container rounded-[4px] p-4 border border-[#ced4da]">
                    <p className="text-tertiary text-xs mb-1 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">notes</span> บันทึกพยาบาล (สรุป)</p>
                    <p className="text-sm whitespace-pre-wrap">{care.nursing_notes}</p>
                  </div>
                )}

                {care.care_image_url && (
                  <div className="mt-3 bg-white border border-[#ced4da] rounded-[4px] p-4">
                    <p className="text-tertiary text-xs mb-2 font-bold flex items-center gap-1.5 text-primary">
                      <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                      รูปถ่ายการปฏิบัติงาน / ผลการดูแล (Care Image)
                    </p>
                    <img
                      src={care.care_image_url}
                      alt="รูปถ่ายการปฏิบัติงาน"
                      onClick={() => setSelectedCarePhoto(care.care_image_url)}
                      className="max-h-56 max-w-sm rounded object-cover cursor-pointer hover:opacity-90 border border-gray-200"
                    />
                    <p className="text-[11px] text-tertiary mt-1">คลิกที่รูปภาพเพื่อเปิดดูภาพขยายขนาดเต็ม</p>
                  </div>
                )}

                {care.follow_up_date && (
                  <div className="mt-3 bg-[#007BFF]/10 border border-[#007BFF]/20 rounded-[4px] p-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">event</span>
                    <p className="text-sm"><span className="font-semibold">วันนัดหมายครั้งถัดไป:</span> {formatDate(care.follow_up_date)}</p>
                  </div>
                )}
              </section>
            )}

            {/* ส่วนประวัติคนไข้ย้อนหลัง (เห็นเฉพาะพยาบาล) */}
            {isNurse && history.length > 0 && (
              <section className="mb-8">
                <h3 className="text-lg font-bold headline-font text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined">history</span>ประวัติการพยาบาลของผู้ป่วย
                </h3>
                <div className="space-y-4">
                  {history.map(hist => (
                    <div key={hist.id} className="bg-surface-container rounded-[4px] p-5 border border-[#ced4da]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-on-surface">วันที่: {formatDate(hist.visit_date)}</p>
                          <p className="text-sm text-tertiary">บริการ: {hist.service_type}</p>
                        </div>
                        <span className="bg-secondary-container text-secondary text-xs px-2 py-1 rounded-[4px] font-bold">พยาบาล: {hist.nurse_name}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                        {hist.blood_pressure && <div><span className="text-tertiary block">ความดัน</span><span className="font-bold text-red-600">{hist.blood_pressure}</span></div>}
                        {hist.heart_rate && <div><span className="text-tertiary block">ชีพจร</span><span className="font-bold text-pink-600">{hist.heart_rate}</span></div>}
                        {hist.respiratory_rate && <div><span className="text-tertiary block">หายใจ</span><span className="font-bold text-blue-600">{hist.respiratory_rate}</span></div>}
                        {hist.body_temperature && <div><span className="text-tertiary block">อุณหภูมิ</span><span className="font-bold text-orange-600">{hist.body_temperature}</span></div>}
                        {hist.oxygen_saturation && <div><span className="text-tertiary block">SpO2</span><span className="font-bold text-cyan-600">{hist.oxygen_saturation}%</span></div>}
                        {hist.pain_score && <div><span className="text-tertiary block">Pain Score</span><span className="font-bold">{hist.pain_score}/10</span></div>}
                      </div>
                      {hist.symptom_summary && (
                        <div className="mt-2 text-sm bg-white p-3 rounded-[4px] border border-[#ced4da]">
                          <p className="text-tertiary text-xs mb-0.5">อาการเบื้องต้น</p>
                          <p>{hist.symptom_summary}</p>
                        </div>
                      )}
                      {hist.medication_record && (
                        <div className="mt-2 text-sm bg-white p-3 rounded-[4px] border border-[#ced4da]">
                          <p className="text-tertiary text-xs mb-0.5">การให้ยา/หัตถการ</p>
                          <p>{hist.medication_record}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-6 border-t border-gray-100">
              {/* Nurse actions for Pending request */}
              {isNurse && d.status === 'Pending' && (
                <>
                  <button onClick={() => handleResponse('Accept')}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm">
                    <span className="material-symbols-outlined text-base">check_circle</span>รับงานนี้
                  </button>
                  <button onClick={() => handleResponse('Reject')}
                    className="flex items-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 px-6 py-2.5 rounded-full text-xs font-semibold transition-all">
                    <span className="material-symbols-outlined text-base">cancel</span>ปฏิเสธคำขอ
                  </button>
                </>
              )}

              {/* Nurse actions for Active/Paid service */}
              {isNurse && (d.status === 'Paid' || d.status === 'InProgress') && (
                <button onClick={() => navigate(`/nurse/record/${requestId}`)}
                  className="flex items-center gap-2 bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm">
                  <span className="material-symbols-outlined text-base">edit_note</span>
                  {d.service_count > 1 ? `บันทึกการดูแล (เหลือ ${d.remaining_service_count ?? d.service_count} ครั้ง)` : 'บันทึกการให้บริการ (Record Service)'}
                </button>
              )}

              {/* Member cancellation action: ยกเลิกได้ก่อนชำระเงินใน Pending/Accepted */}
              {isMember && (d.status === 'Pending' || d.status === 'Accepted') && d.payment_status !== 'Paid' && (
                <button onClick={handleCancelRequest}
                  className="flex items-center gap-2 border border-rose-200 text-rose-600 hover:bg-rose-50 px-6 py-2.5 rounded-full text-xs font-semibold transition-all">
                  <span className="material-symbols-outlined text-base">cancel</span>ยกเลิกคำขอ
                </button>
              )}

              {/* Member payment action */}
              {isMember && d.status === 'Accepted' && (
                <button onClick={() => navigate(`/member/service/${requestId}/payment`)}
                  className="flex items-center gap-2 bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm">
                  <span className="material-symbols-outlined text-base">payments</span>ชำระเงิน
                </button>
              )}
              {(d.status === 'Paid' || d.status === 'InProgress' || d.status === 'Completed') && (
                <button onClick={() => navigate(`/member/service/${requestId}/receipt`)}
                  className="flex items-center gap-2 border border-gray-200 text-[#1456f0] hover:bg-gray-50 px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-2xs">
                  <span className="material-symbols-outlined text-base">receipt</span>ดูใบเสร็จ
                </button>
              )}
              {(d.status === 'Completed' || (d.care_record && Object.keys(d.care_record).length > 0)) && (
                <button onClick={() => navigate(isNurse ? `/nurse/record/${requestId}` : `/member/record/${requestId}`)}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-6 py-2.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm">
                  <span className="material-symbols-outlined text-base">clinical_notes</span>ดูบันทึกการพยาบาลฉบับเต็ม
                </button>
              )}
              <button onClick={() => navigate(-1)}
                className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-[#45515e] px-6 py-2.5 rounded-full text-xs font-semibold transition-all">
                <span className="material-symbols-outlined text-base">arrow_back</span>กลับ
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Lightbox Modal สำหรับดูรูปถ่ายแผลขยายขนาดเต็ม */}
      {showWoundModal && d.wound_photo_url && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowWoundModal(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gray-50/70">
              <span className="font-bold text-sm text-[#222222] flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-lg">healing</span>
                รูปถ่ายบาดแผลของผู้ป่วย (ขนาดเต็ม)
              </span>
              <button
                type="button"
                onClick={() => setShowWoundModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4 bg-black/5 flex items-center justify-center overflow-auto max-h-[78vh]">
              <img
                src={d.wound_photo_url}
                alt="รูปถ่ายบาดแผลผู้ป่วยขนาดเต็ม"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal สำหรับดูรูปถ่ายการดูแล (Care Image) ขนาดเต็ม */}
      {selectedCarePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedCarePhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b bg-gray-50/70">
              <span className="font-bold text-sm text-[#222222] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#007BFF] text-lg">photo_camera</span>
                รูปถ่ายการปฏิบัติงาน / ผลการดูแล (ขนาดเต็ม)
              </span>
              <button
                type="button"
                onClick={() => setSelectedCarePhoto(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4 bg-black/5 flex items-center justify-center overflow-auto max-h-[78vh]">
              <img
                src={selectedCarePhoto}
                alt="รูปถ่ายการปฏิบัติงานขนาดเต็ม"
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-2xl shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
