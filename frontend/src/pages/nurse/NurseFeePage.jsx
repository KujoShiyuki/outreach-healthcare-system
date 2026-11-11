import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api.js'
import { useModal } from '../../context/ModalContext.jsx'

export default function NurseFeePage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const { requestId } = useParams()
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serviceDetail, setServiceDetail] = useState(null)
  const [nurseProfile, setNurseProfile] = useState(null)

  useEffect(() => {
    fetchServiceDetail()
    api.get('/nurses/profile').then(res => setNurseProfile(res.data)).catch(() => {})
  }, [requestId])

  const fetchServiceDetail = async () => {
    try {
      const res = await api.get(`/service-requests/${requestId}`)
      const detail = res.data
      setServiceDetail(detail)
      // ระบบคำนวณยอดจากข้อมูลใน Server ไม่เปิดให้แก้ไขเอง
      setAmount(detail.total_price || 0)
      if (detail.status !== 'Completed') {
        setError('สามารถเบิกค่าตอบแทนได้เมื่อให้บริการเสร็จสิ้นแล้วเท่านั้น')
      }
    } catch(err) {
      setError('ไม่สามารถดึงข้อมูลค่าบริการได้')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!amount || amount <= 0) {
      setError('ไม่พบยอดเงินค่าบริการ')
      return
    }

    setIsSubmitting(true)
    try {
      await api.post('/nurses/fee-requests', { service_request_id: requestId, amount: parseFloat(amount) })
      const formattedAmount = parseFloat(amount).toLocaleString('th-TH')
      showAlert({
        type: 'success',
        title: 'ส่งคำขอเบิกค่าตอบแทนสำเร็จ',
        message: `ระบบได้ส่งคำขอเบิกเงินจำนวน ฿${formattedAmount} บาท ไปยังผู้ดูแลระบบเรียบร้อยแล้ว`,
        confirmText: 'กลับไปหน้ารายการ',
        onConfirm: () => navigate('/nurse/requests')
      })
    } catch (err) {
      setError(err.response?.data?.message || 'ไม่สามารถส่งคำขอเบิกเงินได้')
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="text-center p-10 text-xs text-[#45515e]">กำลังโหลดข้อมูล...</div>

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex items-center justify-center p-6 font-body">
      <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-purple-card w-full max-w-md text-center border border-gray-100">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xs">
          <span className="material-symbols-outlined text-3xl">payments</span>
        </div>
        <h1 className="headline-font text-2xl font-bold text-[#222222] mb-1.5">ยืนยันเบิกค่าตอบแทน</h1>
        <p className="text-[#45515e] mb-6 text-xs">การปฏิบัติงานเสร็จสิ้น ระบบได้คำนวณยอดเงินรวมแล้ว</p>

        {error && <p className="text-rose-700 bg-rose-50 border border-rose-200 py-2.5 px-3 rounded-2xl text-xs mb-4 font-medium">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-gray-50/70 p-6 rounded-2xl border border-gray-100">
            <label className="text-xs font-bold text-[#45515e] block mb-2">ยอดเงินค่าบริการสุทธิ (บาท)</label>
            <input
              type="text"
              value={amount ? parseFloat(amount).toLocaleString() : '0'}
              className="w-full text-4xl border-none bg-transparent text-center font-bold text-[#1456f0] focus:ring-0"
              readOnly
            />
            <p className="text-[11px] text-[#45515e] mt-2">ยอดนี้เป็นยอดที่ลูกค้าชำระเข้าสู่ระบบแล้ว</p>
          </div>

          {/* ข้อมูลบัญชีธนาคารปลายทางสำหรับรับเงิน */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs text-left space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 border-b border-emerald-200/60 pb-2">
              <span className="material-symbols-outlined text-base text-emerald-700">account_balance</span>
              บัญชีธนาคารสำหรับรับเงินโอน
            </div>
            <div className="space-y-1.5 pt-0.5">
              <div className="flex justify-between items-center">
                <span className="text-[#45515e]">ชื่อบัญชีผู้รับ:</span>
                <span className="font-bold text-[#222222]">
                  {nurseProfile?.first_name ? `${nurseProfile.first_name} ${nurseProfile.last_name || ''}` : 'บัญชีของพยาบาล'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#45515e]">เลขที่บัญชีธนาคาร:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm tracking-wider">
                  {nurseProfile?.bank_account_no || '-'}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-emerald-700 pt-1">
              * ระบบจะโอนเงินค่าบริการเข้าบัญชีนี้เมื่อผู้ดูแลระบบอนุมัติการจ่ายเงิน
            </p>
          </div>
          <button type="submit" disabled={isSubmitting || amount <= 0 || serviceDetail?.status !== 'Completed'} className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white py-3 rounded-full font-semibold text-sm transition-all shadow-purple-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {isSubmitting ? 'กำลังส่งคำขอ...' : 'ยืนยันและส่งคำขอเบิกเงิน'}
          </button>
          <button type="button" onClick={() => navigate('/nurse/requests')} className="w-full border border-gray-200 bg-white hover:bg-gray-50 text-[#45515e] py-2.5 rounded-full font-semibold text-xs transition-all">กลับไปหน้ารายการ</button>
        </form>
      </div>
    </div>
  )
}
