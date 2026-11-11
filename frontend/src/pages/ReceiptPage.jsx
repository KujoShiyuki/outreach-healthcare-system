import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api.js'
import { formatDate, formatDateTime } from '../utils/formatDate.js'

export default function ReceiptPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const [receipt, setReceipt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchReceipt()
  }, [requestId])

  const fetchReceipt = async () => {
    try {
      const res = await api.get(`/service-requests/${requestId}/receipt`)
      setReceipt(res.data)
    } catch (err) {
      setError('ไม่พบข้อมูลใบเสร็จ')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => window.print()

  if (isLoading) {
    return (
      <div className="bg-white text-[#222222] min-h-[100dvh] flex items-center justify-center font-body">
        <svg className="animate-spin h-10 w-10 text-[#1456f0]" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow flex justify-center p-6 lg:p-10">
        <div className="w-full max-w-lg">
          {error ? (
            <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center">
              <span className="material-symbols-outlined text-gray-300 text-6xl mb-3">receipt_long</span>
              <h2 className="headline-font text-xl font-bold text-[#222222] mb-1.5">ไม่พบข้อมูลใบเสร็จ</h2>
              <p className="text-xs text-[#45515e]">{error}</p>
            </div>
          ) : (
            <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100" id="receipt-content">
              {/* Receipt Header */}
              <div className="text-center mb-8 pb-6 border-b border-dashed border-gray-200">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <span className="material-symbols-outlined text-2xl">receipt</span>
                </div>
                <h1 className="headline-font text-2xl font-bold text-[#1456f0] mb-0.5">Smart Elder Care</h1>
                <p className="text-xs text-[#45515e]">ระบบดูแลผู้ป่วยนอกสถานที่โดยเจ้าหน้าที่ทางการแพทย์</p>
                <h2 className="headline-font text-base font-bold text-[#222222] mt-3 bg-gray-50 py-1 px-4 rounded-full inline-block border border-gray-200">ใบเสร็จรับเงิน (Official Receipt)</h2>
              </div>

              {/* Receipt Details */}
              <div className="space-y-2.5 text-xs mb-8">
                <div className="flex justify-between"><span className="text-[#45515e]">เลขที่ใบเสร็จ:</span><span className="font-bold text-[#222222]">{receipt?.receipt_id || receipt?.id || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">วันที่ชำระ:</span><span className="font-bold text-[#222222]">{formatDateTime(receipt?.payment_date || receipt?.paid_at)}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">เลขอ้างอิงการโอน:</span><span className="font-bold text-[#222222]">{receipt?.slip_trans_ref || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">ผู้ป่วย:</span><span className="font-bold text-[#222222]">{receipt?.patient_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">พยาบาล:</span><span className="font-bold text-[#222222]">{receipt?.nurse_name || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">บริการ:</span><span className="font-bold text-[#222222]">{receipt?.service_type || '-'}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">วันที่ให้บริการ:</span><span className="font-bold text-[#222222]">{formatDate(receipt?.service_date || receipt?.start_date)}</span></div>
                <div className="flex justify-between"><span className="text-[#45515e]">ช่วงเวลา:</span><span className="font-bold text-[#222222]">{receipt?.time_slot || '-'}</span></div>
              </div>

              {/* Total */}
              <div className="border-t border-dashed border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-[#222222]">ยอดรวมทั้งสิ้น</span>
                  <span className="headline-font text-2xl font-bold text-[#1456f0]">฿{receipt?.total_price || receipt?.amount || '0.00'}</span>
                </div>
                <p className="text-xs text-emerald-700 font-bold mt-1 text-right flex items-center justify-end gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  สถานะ: ชำระเงินเรียบร้อยแล้ว
                </p>
              </div>

              {/* Footer */}
              <div className="text-center text-[11px] text-[#45515e] border-t border-gray-100 pt-4">
                <p>ขอบคุณที่ไว้วางใจใช้บริการ Smart Elder Care</p>
                <p className="mt-0.5">© 2026 Smart Elder Care Platform</p>
              </div>

              {/* Print Button */}
              <div className="mt-6 print:hidden">
                <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-3 rounded-full headline-font text-xs font-semibold transition-all shadow-purple-sm">
                  <span className="material-symbols-outlined text-sm">print</span>
                  พิมพ์ใบเสร็จรับเงิน
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
