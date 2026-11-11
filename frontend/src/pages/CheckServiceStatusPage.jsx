import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useModal } from '../context/ModalContext.jsx'
import { getServiceFrequencyBadge } from '../utils/serviceBadgeHelper.js'

const STATUS_MAP = {
  'Pending': { label: 'รอการตอบรับ', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'hourglass_top' },
  'Accepted': { label: 'รับงานแล้ว (รอชำระเงิน)', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: 'check_circle' },
  'Paid': { label: 'ชำระเงินแล้ว', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'paid' },
  'InProgress': { label: 'กำลังให้บริการ', color: 'bg-indigo-50 text-indigo-800 border-indigo-200', icon: 'medical_services' },
  'Completed': { label: 'เสร็จสิ้น', color: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'task_alt' },
  'Rejected': { label: 'ปฏิเสธ', color: 'bg-rose-50 text-rose-800 border-rose-200', icon: 'cancel' },
  'Cancelled': { label: 'ยกเลิก', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: 'block' },
}

export default function CheckServiceStatusPage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useModal()
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [cancelLoadingId, setCancelLoadingId] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      const res = await api.get('/service-requests')
      setRequests(res.data)
    } catch (err) {
      setError('ไม่พบข้อมูลคำขอรับบริการ')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelRequest = async (e, reqId) => {
    e.stopPropagation()
    showConfirm({
      type: 'warning',
      title: 'ยืนยันการยกเลิกคำขอ',
      message: 'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกคำขอรับบริการนี้?',
      confirmText: 'ยืนยันยกเลิก',
      onConfirm: async () => {
        setCancelLoadingId(reqId)
        try {
          await api.post(`/service-requests/${reqId}/cancel`)
          await fetchRequests()
          showAlert({ type: 'success', title: 'ยกเลิกคำขอสำเร็จ', message: 'คำขอรับบริการถูกยกเลิกเรียบร้อยแล้ว' })
        } catch (err) {
          showAlert({ type: 'error', title: 'ยกเลิกคำขอไม่สำเร็จ', message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิกคำขอ' })
        } finally {
          setCancelLoadingId(null)
        }
      }
    })
  }

  const getStatus = (status) => STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-600', icon: 'help' }

  if (isLoading) {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-[#1456f0]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="headline-font text-3xl font-bold text-[#222222]">สถานะคำขอรับบริการ</h1>
              <p className="text-[#45515e] text-sm mt-1">ตรวจสอบสถานะการตอบรับและการชำระเงินของคำขอทั้งหมด</p>
            </div>
            <button
              onClick={() => navigate('/member/search-nurse')}
              className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-5 py-2.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">search</span>
              ค้นหาพยาบาลใหม่
            </button>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 mb-6 text-rose-800 text-sm">
              <span className="material-symbols-outlined text-rose-600">error</span>
              <p>{error}</p>
            </div>
          )}

          {requests.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">inbox</span>
              </div>
              <h2 className="headline-font text-xl font-bold text-[#222222] mb-2">ยังไม่มีคำขอรับบริการ</h2>
              <p className="text-[#45515e] text-sm mb-6">คุณยังไม่มีคำขอรับบริการในขณะนี้ ค้นหาพยาบาลเพื่อส่งคำขอ</p>
              <button onClick={() => navigate('/member/search-nurse')} className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-6 py-2.5 rounded-full headline-font font-semibold text-sm transition-all shadow-purple-sm">ค้นหาพยาบาล</button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const s = getStatus(req.status)
                const freq = getServiceFrequencyBadge(req)
                return (
                  <div key={req.id || req.request_id} onClick={() => navigate(`/member/service/${req.id || req.request_id}`)}
                    className="bg-white rounded-2xl shadow-purple-sm border border-gray-100 p-6 hover:shadow-purple-hover hover:-translate-y-0.5 transition-all cursor-pointer group">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`material-symbols-outlined ${s.color} p-2 rounded-full text-base border`}>{s.icon}</span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#222222] text-base group-hover:text-[#1456f0] transition-colors">{req.patient_name || 'ผู้ป่วย'}</p>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${freq.badgeClass}`}>
                              <span className="material-symbols-outlined text-[13px]">{freq.icon}</span>
                              {freq.label}
                            </span>
                          </div>
                          <p className="text-xs text-[#45515e]">พยาบาล: {req.nurse_name || '-'}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${s.color}`}>{s.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#45515e] pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5" title="ระยะเวลาการให้บริการ">
                          <span className="material-symbols-outlined text-sm text-[#1456f0]">calendar_today</span>
                          <span>{freq.dateRangeText}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-[#1456f0]">schedule</span>
                          {req.time_slot || '-'}
                        </span>
                        {freq.isRecurring && (
                          <span className="text-[11px] bg-blue-50 text-[#1456f0] font-bold px-2 py-0.5 rounded-full border border-blue-200" title="ความคืบหน้าการให้บริการ">
                            ดำเนินการแล้ว {freq.progressText}
                          </span>
                        )}
                        {req.total_price && (
                          <span className="font-bold text-sm text-[#222222] bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">฿ {req.total_price.toLocaleString()}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'Pending' && (
                          <button
                            type="button"
                            disabled={cancelLoadingId === (req.id || req.request_id)}
                            onClick={(e) => handleCancelRequest(e, req.id || req.request_id)}
                            className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                            {cancelLoadingId === (req.id || req.request_id) ? 'กำลังยกเลิก...' : 'ยกเลิกคำขอ'}
                          </button>
                        )}
                        {req.status === 'Accepted' && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/member/service/${req.id || req.request_id}/payment`) }}
                            className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-purple-sm">
                            ชำระเงินก่อนเริ่มงาน
                          </button>
                        )}
                        {(req.status === 'Paid' || req.status === 'InProgress') && (
                          <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
                            ชำระเงินแล้ว รอเริ่ม/กำลังให้บริการ
                          </span>
                        )}
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-[#1456f0] group-hover:translate-x-0.5 transition-all text-base">arrow_forward</span>
                      </div>
                    </div>

                    {/* แสดงเหตุผลหากถูกปฏิเสธ */}
                    {req.status === 'Rejected' && req.additional_notes && req.additional_notes.includes('เหตุผลที่ปฏิเสธ') && (
                      <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                        <span className="font-bold">หมายเหตุจากพยาบาล: </span>
                        {req.additional_notes.split('\n').find(l => l.includes('เหตุผลที่ปฏิเสธ')) || req.additional_notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
