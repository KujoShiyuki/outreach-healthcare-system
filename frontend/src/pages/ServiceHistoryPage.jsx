import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { formatDate } from '../utils/formatDate.js'

export default function ServiceHistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/service-requests')
      // กรองเฉพาะที่เสร็จแล้ว หรือแสดงทั้งหมดเพื่อดูย้อนหลัง
      setHistory(res.data)
    } catch (err) {
      setError('ไม่พบประวัติการให้บริการ')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusLabel = (status) => {
    const map = {
      'Pending': 'รอการตอบรับ', 'Accepted': 'รับงานแล้ว', 'Paid': 'ชำระเงินแล้ว',
      'InProgress': 'กำลังให้บริการ', 'Completed': 'เสร็จสิ้น', 'Rejected': 'ปฏิเสธ', 'Cancelled': 'ยกเลิก'
    }
    return map[status] || status
  }

  const getStatusColor = (status) => {
    const map = {
      'Completed': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'Paid': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'InProgress': 'bg-indigo-50 text-indigo-800 border-indigo-200',
      'Accepted': 'bg-blue-50 text-blue-800 border-blue-200',
      'Pending': 'bg-amber-50 text-amber-800 border-amber-200',
      'Rejected': 'bg-rose-50 text-rose-800 border-rose-200',
      'Cancelled': 'bg-gray-100 text-gray-600 border-gray-200'
    }
    return map[status] || 'bg-gray-100 text-gray-600 border-gray-200'
  }

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
          <div className="mb-8">
            <h1 className="headline-font text-3xl font-bold text-[#222222]">ประวัติการรับบริการ</h1>
            <p className="text-[#45515e] text-sm mt-1">ดูประวัติการขอรับบริการดูแลผู้ป่วยนอกสถานที่ทั้งหมดที่ผ่านมา</p>
          </div>

          {error && !history.length && (
            <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">history</span>
              </div>
              <h2 className="headline-font text-xl font-bold text-[#222222] mb-2">ไม่พบประวัติการให้บริการ</h2>
              <p className="text-[#45515e] text-sm">ยังไม่มีรายการใช้บริการย้อนหลังในระบบ</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id || item.request_id}
                  onClick={() => navigate(`/member/service/${item.id || item.request_id}`)}
                  className="bg-white rounded-2xl shadow-purple-sm border border-gray-100 p-6 hover:shadow-purple-hover hover:-translate-y-0.5 transition-all cursor-pointer group">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-bold text-[#222222] text-base group-hover:text-[#1456f0] transition-colors">{item.patient_name || 'ผู้ป่วย'}</p>
                      <p className="text-xs text-[#45515e]">พยาบาล: {item.nurse_name || '-'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#45515e] pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-[#1456f0]">calendar_today</span>{formatDate(item.start_date)}</span>
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-sm text-[#1456f0]">schedule</span>{item.time_slot || '-'}</span>
                      {item.total_price && <span className="font-bold text-sm text-[#222222] bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">฿{item.total_price.toLocaleString()}</span>}
                    </div>
                    <span className="text-xs text-[#1456f0] font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      ดูรายละเอียด <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
