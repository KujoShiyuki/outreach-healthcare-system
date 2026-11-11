import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { useModal } from '../../context/ModalContext.jsx'
import { getServiceFrequencyBadge } from '../../utils/serviceBadgeHelper.js'
import { formatDate } from '../../utils/formatDate.js'

export default function NurseRequestsPage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const [pendingRequests, setPendingRequests] = useState([])
  const [activeRequests, setActiveRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal ปฏิเสธคำขอพร้อมระบุเหตุผล
  const [rejectModalReq, setRejectModalReq] = useState(null)
  const [rejectReason, setRejectReason] = useState('ติดภารกิจ/เวรด่วนโรงพยาบาล')
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [isSubmittingReject, setIsSubmittingReject] = useState(false)

  useEffect(() => { fetchRequests() }, [])

  const getPriorityScore = (req) => {
    const today = new Date().toISOString().split('T')[0]
    const isToday = req.start_date === today
    const priorityNotes = (req.additional_notes || '').toLowerCase()
    const isHighRisk = req.is_complex_wound || priorityNotes.includes('เจาะคอ') || priorityNotes.includes('ออกซิเจน') || priorityNotes.includes('เครื่องช่วยหายใจ') || priorityNotes.includes('suction')
    const isTimeSensitive = priorityNotes.includes('อินซูลิน') || priorityNotes.includes('dtx') || priorityNotes.includes('สายให้อาหาร') || priorityNotes.includes('สายสวน')

    // 0 = Paid/InProgress วันนี้, 1 = ความเสี่ยงสูง, 2 = หัตถการตรงเวลา, 3 = นัดใกล้ที่สุด, 4 = รอชำระเงิน
    const statusScore = (req.status === 'Paid' || req.status === 'InProgress') && isToday ? 0
      : isHighRisk ? 1
      : isTimeSensitive ? 2
      : req.status === 'Paid' || req.status === 'InProgress' ? 3
      : req.status === 'Accepted' ? 4 : 5
    const dateScore = req.start_date ? new Date(req.start_date).getTime() : Number.MAX_SAFE_INTEGER
    return [statusScore, dateScore]
  }

  const sortRequestsByPriority = (requests) => [...requests].sort((a, b) => {
    const aScore = getPriorityScore(a)
    const bScore = getPriorityScore(b)
    for (let index = 0; index < aScore.length; index += 1) {
      if (aScore[index] !== bScore[index]) return aScore[index] - bScore[index]
    }
    return 0
  })

  const fetchRequests = async () => {
    try {
      const res = await api.get('/nurses/requests')
      const pendingList = sortRequestsByPriority(res.data.pending || [])
      // กรองงานที่จบแล้วและงานที่ยกเลิกออกไปอยู่หน้าประวัติ
      const activeList = sortRequestsByPriority((res.data.active || []).filter(req => req.status !== 'Completed' && req.status !== 'Cancelled'))
      setPendingRequests(pendingList)
      setActiveRequests(activeList)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      Accepted: 'รับงานแล้ว (รอชำระเงิน)',
      Paid: 'ชำระเงินแล้ว พร้อมเริ่มงาน',
      InProgress: 'กำลังให้บริการ',
      Completed: 'เสร็จสิ้นครบทุกครั้ง',
      Rejected: 'ปฏิเสธ',
      Cancelled: 'ยกเลิก'
    }
    return labels[status] || status
  }

  const handleResponse = async (id, action, reason = null) => {
    try {
      const payload = { action }
      if (reason) payload.reason = reason
      await api.post(`/nurses/requests/${id}/respond`, payload)
      showAlert({
        type: 'success',
        title: action === 'Accept' || action === 'AcceptHandover' ? 'รับงานเรียบร้อยแล้ว' : 'ปฏิเสธคำขอเรียบร้อยแล้ว',
        message: action === 'AcceptHandover' ? 'คุณได้รับงานช่วงต่อแล้ว สามารถเข้าดูรายละเอียดและบันทึกการดูแลได้' : action === 'Accept' ? 'คุณได้รับงานนี้แล้ว สามารถเข้าดูรายละเอียดได้ในส่วนงานที่ต้องดำเนินการ' : 'ระบบได้ส่งเหตุผลการปฏิเสธให้ผู้รับบริการทราบแล้ว'
      })
      fetchRequests()
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'เกิดข้อผิดพลาด',
        message: err.response?.data?.message || 'ไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
      })
    }
  }

  const handleConfirmReject = async () => {
    if (!rejectModalReq) return
    const finalReason = rejectReason === 'other' ? (customRejectReason.trim() || 'พยาบาลไม่สะดวกรับงานในวันเวลาดังกล่าว') : rejectReason
    setIsSubmittingReject(true)
    try {
      await handleResponse(rejectModalReq.id, 'Reject', finalReason)
      setRejectModalReq(null)
      setRejectReason('ติดภารกิจ/เวรด่วนโรงพยาบาล')
      setCustomRejectReason('')
    } finally {
      setIsSubmittingReject(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center">
        <span className="text-sm text-tertiary">กำลังโหลดรายการงาน...</span>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-8">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#FFC107]">pending_actions</span>
              คำขอใหม่ (รอยืนยัน)
            </h2>
            <span className="bg-[#FFC107]/15 text-[#856404] px-3 py-1 rounded-2xl text-xs font-bold border border-[#FFC107]/30">
              {pendingRequests.length} รายการ
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-gray-200 text-tertiary">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
              <p>ไม่มีคำขอใหม่ในขณะนี้</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingRequests.map(req => {
                const freq = getServiceFrequencyBadge(req)
                return (
                <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[gray-200] space-y-3">
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg text-on-surface">{req.patient_name}</h3>
                        {(req.patient_age || req.patient_gender) && (
                          <span className="text-xs text-tertiary">
                            ({req.patient_gender || '-'} อายุ {req.patient_age || '-'} ปี)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-[#1456f0] font-semibold">
                          {req.service_type_name || 'บริการพยาบาล'}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${freq.badgeClass}`}>
                          <span className="material-symbols-outlined text-[13px]">{freq.icon}</span>
                          {freq.label}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[#856404] bg-[#FFC107]/15 border border-[#FFC107]/30 px-2.5 py-0.5 rounded-2xl text-xs font-bold inline-block mb-1">
                        คำขอใหม่ (รอตอบรับ)
                      </span>
                      {req.total_price && (
                        <p className="text-sm font-bold text-on-surface">฿ {req.total_price.toLocaleString()}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-on-surface">
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#1456f0]">calendar_today</span>
                      <span>กำหนดการ: <strong>{freq.dateRangeText}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#1456f0]">schedule</span>
                      <span>เวลา: <strong>{req.time_slot}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5 md:col-span-2 text-tertiary">
                      <span className="material-symbols-outlined text-sm text-outline">location_on</span>
                      <span>สถานที่: {req.service_address}</span>
                    </p>
                  </div>

                  {/* สรุปข้อมูลทางคลินิก (Clinical Summary) */}
                  <div className="bg-[#F8F9FA] p-3 rounded-2xl border border-gray-200 text-xs space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#DC3545] shrink-0">อาการสำคัญ:</span>
                      <span className="text-on-surface">{req.chief_complaint}</span>
                    </div>
                    {req.allergies && req.allergies !== 'ไม่มี' && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-amber-700 shrink-0">ประวัติแพ้ยา/อาหาร:</span>
                        <span className="text-amber-900">{req.allergies}</span>
                      </div>
                    )}
                    {req.underlying_diseases && req.underlying_diseases !== '-' && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-semibold text-tertiary shrink-0">โรคประจำตัว:</span>
                        <span className="text-on-surface">{req.underlying_diseases}</span>
                      </div>
                    )}
                    {req.special_precautions && (
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-purple-700 shrink-0">ข้อควรระวัง:</span>
                        <span className="text-purple-900">{req.special_precautions}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => navigate(`/nurse/service/${req.id}`)}
                      className="border border-gray-200 text-[#1456f0] hover:bg-gray-50 px-4 py-2 rounded-full font-semibold transition-all text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      ดูรายละเอียด
                    </button>
                    {req.handover_status === 'NEEDED' ? (
                      <button
                        type="button"
                        onClick={() => handleResponse(req.id, 'AcceptHandover')}
                        className="bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white px-5 py-2 rounded-full font-semibold transition-all text-xs flex items-center gap-1 shadow-purple-sm"
                      >
                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                        รับช่วงต่อ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResponse(req.id, 'Accept')}
                        className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-5 py-2 rounded-full font-semibold transition-all text-xs flex items-center gap-1 shadow-purple-sm"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        รับงานนี้
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalReq(req)
                        setRejectReason('ติดภารกิจ/เวรด่วนโรงพยาบาล')
                        setCustomRejectReason('')
                      }}
                      className="border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-full font-semibold transition-all text-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#1456f0]">task</span>
              งานที่ต้องดำเนินการ (กำลังให้บริการ / รอชำระ)
            </h2>
            <span className="bg-[#1456f0]/10 text-[#1456f0] px-3 py-1 rounded-2xl text-xs font-bold border border-[#1456f0]/20">
              {activeRequests.length} รายการ
            </span>
          </div>

          {activeRequests.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-2xl border border-gray-200 text-tertiary">
              <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">inbox</span>
              <p>ไม่มีงานในขณะนี้</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeRequests.map(req => {
                const freq = getServiceFrequencyBadge(req)
                return (
                <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-[gray-200] space-y-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{req.patient_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-[#1456f0] font-semibold">{req.service_type_name || 'บริการพยาบาล'}</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${freq.badgeClass}`}>
                          <span className="material-symbols-outlined text-[13px]">{freq.icon}</span>
                          {freq.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-[#1456f0] bg-[#1456f0]/10 border border-[#1456f0]/20 px-2.5 py-0.5 rounded-2xl text-xs font-semibold">{getStatusLabel(req.status)}</span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-on-surface">
                    <p className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#1456f0]">calendar_today</span>
                      กำหนดการ: {freq.dateRangeText}
                    </p>
                    {freq.isRecurring && <p className="font-semibold text-[#1456f0]">บันทึกแล้ว {freq.progressText}</p>}
                    <p className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#1456f0]">schedule</span>
                      เวลา: {req.time_slot}
                    </p>
                    {req.total_price && (
                      <p className="font-bold text-on-surface">฿ {req.total_price.toLocaleString()}</p>
                    )}
                  </div>

                  <div className="mt-4 border-t pt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/nurse/service/${req.id}`)}
                      className="flex-1 border border-[#1456f0] text-[#1456f0] hover:bg-[#F8F9FA] py-2.5 rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      ดูรายละเอียดผู้ป่วยและคำขอ
                    </button>
                    {req.status === 'Paid' || req.status === 'InProgress' ? (
                      <button onClick={() => navigate(`/nurse/record/${req.id}`)} className="flex-1 bg-[#1456f0] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white py-2.5 rounded-2xl font-semibold transition-all text-sm flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-base">medical_information</span>
                        บันทึกการให้บริการ (Record Service)
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-tertiary italic">รอผู้รับบริการชำระเงิน...</p>
                      </div>
                    )}
                  </div>
                </div>
              )})}
            </div>
          )}
        </section>
      </main>

      {/* Modal ปฏิเสธคำขอ (พร้อมระบุเหตุผล) */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[gray-200] max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="font-bold text-lg text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-[#DC3545]">cancel</span>
                ระบุเหตุผลในการปฏิเสธคำขอ
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-tertiary">
              คำขอของ: <strong>{rejectModalReq.patient_name}</strong> (วันที่ {formatDate(rejectModalReq.start_date)})
            </p>

            <div className="space-y-2 text-xs">
              <label className="font-bold text-on-surface block">เลือกเหตุผล:</label>
              {[
                'ติดภารกิจ/เวรด่วนโรงพยาบาล',
                'อยู่นอกพื้นที่ให้บริการในวันเวลาดังกล่าว',
                'อาการหรือหัตถการเกินขอบเขตความเชี่ยวชาญ',
                'อุปกรณ์หรือยาของผู้ป่วยไม่พร้อม',
                'other'
              ].map(opt => (
                <label key={opt} className="flex items-center gap-2 p-2 border rounded-2xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="reject_reason"
                    value={opt}
                    checked={rejectReason === opt}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="text-[#1456f0]"
                  />
                  <span>{opt === 'other' ? 'ระบุเหตุผลอื่น ๆ...' : opt}</span>
                </label>
              ))}

              {rejectReason === 'other' && (
                <textarea
                  rows="2"
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  placeholder="พิมพ์เหตุผลที่ต้องการแจ้งผู้ขอรับบริการ..."
                  className="w-full p-2 border border-[gray-200] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0] resize-none mt-2"
                />
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="px-4 py-2 border border-[gray-200] bg-white hover:bg-gray-50 rounded-2xl text-xs font-semibold text-tertiary"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-[#DC3545] hover:bg-[#c82333] text-white rounded-2xl text-xs font-semibold transition-all disabled:opacity-50"
              >
                {isSubmittingReject ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
