import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../services/api.js'

export default function PaymentPage() {
  const navigate = useNavigate()
  const { requestId } = useParams()
  const [detail, setDetail] = useState(null)
  const [isFetching, setIsFetching] = useState(true)
  const [slipFile, setSlipFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchDetail()
  }, [requestId])

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/service-requests/${requestId}`)
      setDetail(res.data)
      const st = res.data?.status
      if (st === 'Paid' || st === 'Completed' || res.data?.payment_status === 'Paid') {
        navigate(`/member/service/${requestId}/receipt`)
      } else if (st !== 'Accepted') {
        setServerError(
          st === 'Rejected'
            ? 'คำขอนี้ถูกปฏิเสธโดยพยาบาลแล้ว ไม่สามารถชำระเงินได้'
            : st === 'Cancelled'
            ? 'คำขอนี้ถูกยกเลิกแล้ว ไม่สามารถชำระเงินได้'
            : 'สามารถชำระเงินได้เฉพาะคำขอที่พยาบาลตอบรับแล้ว (Accepted) เท่านั้น'
        )
      }
    } catch (err) {
      setServerError('ไม่สามารถโหลดข้อมูลคำขอรับบริการได้')
    } finally {
      setIsFetching(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setServerError('กรุณาเลือกไฟล์รูปภาพ (JPG หรือ PNG)')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setServerError('ขนาดไฟล์ต้องไม่เกิน 10MB')
        return
      }
      setSlipFile(file)
      setPreview(URL.createObjectURL(file))
      setServerError('')
    }
  }

  const handleRemoveFile = () => {
    setSlipFile(null)
    setPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    if (detail?.status !== 'Accepted') {
      setServerError('สามารถชำระเงินได้เฉพาะคำขอที่พยาบาลตอบรับแล้ว (Accepted) เท่านั้น')
      return
    }

    if (!slipFile) {
      setServerError('กรุณาแนบหลักฐานการโอนเงิน (Slip)')
      return
    }

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('slip', slipFile)

      await api.post(`/service-requests/${requestId}/pay`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setSuccess(true)
      setTimeout(() => navigate(`/member/service/${requestId}/receipt`), 2000)
    } catch (err) {
      console.error('>>> PAY ERROR RESPONSE:', err.response?.data)
      const errorMsg = err.response?.data?.message || 'การตรวจสอบสลิปล้มเหลว กรุณาตรวจสอบและลองใหม่อีกครั้ง'
      setServerError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-[#1456f0]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-[#45515e]">กำลังโหลดข้อมูลคำขอรับบริการ...</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow flex justify-center p-6 lg:p-10">
        <div className="w-full max-w-lg">
          <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 text-[#1456f0] rounded-full mb-3 shadow-2xs">
                <span className="material-symbols-outlined text-3xl">payments</span>
              </div>
              <h1 className="headline-font text-2xl font-bold text-[#222222] mb-1.5">ชำระค่าบริการ</h1>
              <p className="text-xs text-[#45515e]">แนบสลิปโอนเงินเพื่อตรวจสอบและยืนยันการชำระเงินอัตโนมัติ</p>
            </div>

            {/* รายละเอียดคำขอและยอดเงินที่ต้องชำระ */}
            {detail && (
              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 mb-5 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[#45515e]">ผู้ป่วย:</span>
                  <span className="font-bold text-[#222222] text-sm">{detail.patient_name || '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#45515e]">บริการ:</span>
                  <span className="font-bold text-[#222222]">{detail.service_type_name || 'ทั่วไป'}</span>
                </div>
                {detail.nurse_name && (
                  <div className="flex justify-between items-center">
                    <span className="text-[#45515e]">พยาบาล:</span>
                    <span className="font-bold text-[#222222]">{detail.nurse_name}</span>
                  </div>
                )}
                <div className="border-t border-gray-200/60 pt-3 flex justify-between items-center">
                  <span className="font-bold text-sm text-[#222222]">ยอดที่ต้องชำระ:</span>
                  <span className="headline-font text-xl font-bold text-[#1456f0]">
                    {Number(detail.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                  </span>
                </div>
              </div>
            )}

            {/* ข้อมูลบัญชีธนาคารสำหรับโอนเงินเข้าสู่ระบบ */}
            <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl p-5 mb-6 text-xs space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-blue-200/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1456f0] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    KTB
                  </div>
                  <div>
                    <span className="font-bold text-[#222222] text-sm block">ธนาคารกรุงไทย (Krungthai)</span>
                    <span className="text-[11px] text-[#45515e]">บัญชีทางการ Smart Elder Care</span>
                  </div>
                </div>
                <span className="bg-blue-100 text-[#1456f0] px-2.5 py-1 rounded-full text-[11px] font-bold">
                  บัญชีรับโอน
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#45515e] block mb-0.5">ชื่อบัญชี:</span>
                  <span className="font-bold text-[#222222] text-sm">วัชรพงษ์ เกิดไกล</span>
                </div>
                <div>
                  <span className="text-[#45515e] block mb-0.5">เลขที่บัญชี:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1456f0] text-base tracking-wider">548-0-34665-2</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('5480346652')
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="px-2.5 py-1 bg-white border border-blue-200 text-[#1456f0] hover:bg-blue-50 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                    >
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {success ? (
              <div className="text-center p-8">
                <span className="material-symbols-outlined text-emerald-600 text-6xl mb-3">check_circle</span>
                <h2 className="headline-font text-xl font-bold text-emerald-700 mb-1.5">ตรวจสอบสลิปและชำระเงินสำเร็จ!</h2>
                <p className="text-xs text-[#45515e]">กำลังนำคุณไปยังหน้าใบเสร็จรับเงิน...</p>
              </div>
            ) : detail?.status === 'Accepted' ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                {serverError && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                    <span className="material-symbols-outlined text-rose-600 text-xl mt-0.5">error</span>
                    <div className="flex-1">
                      <p className="text-rose-800 text-xs font-bold mb-0.5">ไม่สามารถยืนยันการชำระเงิน</p>
                      <p className="text-rose-700 text-xs">{serverError}</p>
                    </div>
                  </div>
                )}

                {/* คำแนะนำการโอน */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-[#1456f0] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-base">verified</span>
                    ระบบตรวจสอบสลิปอัตโนมัติ (Slip Verification)
                  </div>
                  <p className="text-xs text-[#45515e]">
                    กรุณาโอนเงินตามยอดที่ระบุ และแนบสลิปต้นฉบับที่มี QR Code คมชัด เพื่อให้ระบบตรวจยอดเงินได้ทันที
                  </p>
                </div>

                {/* อัปโหลดสลิป */}
                <div>
                  <label className="text-xs font-bold text-[#222222] block mb-2">
                    แนบหลักฐานการโอนเงิน (Slip) <span className="text-rose-500">*</span>
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-[#1456f0] transition-all cursor-pointer bg-gray-50/50 hover:bg-blue-50/20 relative"
                    role="button"
                    tabIndex={0}
                    aria-label="อัปโหลดสลิปโอนเงิน"
                    onClick={() => document.getElementById('slip-input').click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        document.getElementById('slip-input').click()
                      }
                    }}
                  >
                    {preview ? (
                      <div className="relative inline-block">
                        <img src={preview} alt="Slip Preview" className="max-h-60 mx-auto rounded-xl shadow-sm border border-gray-200" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveFile()
                          }}
                          className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-rose-700 shadow cursor-pointer"
                          title="ลบรูปภาพ"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                        <p className="text-xs text-gray-500 mt-2">คลิกเพื่อเปลี่ยนรูปภาพใหม่</p>
                      </div>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">upload_file</span>
                        <p className="text-xs font-bold text-[#222222]">คลิกเพื่ออัปโหลดสลิปโอนเงิน</p>
                        <p className="text-[11px] text-[#45515e] mt-1">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 10MB</p>
                      </>
                    )}
                    <input
                      id="slip-input"
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    disabled={isLoading}
                    className="flex-1 border border-gray-200 bg-white hover:bg-gray-50 text-[#45515e] py-3 rounded-full text-xs font-semibold transition-all disabled:opacity-50"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !slipFile}
                    className="flex-1 bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-3 rounded-full text-xs font-semibold transition-all shadow-purple-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>กำลังตรวจสอบสลิป...</span>
                      </>
                    ) : (
                      'ยืนยันชำระเงิน'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/member/service-status')}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-[#222222] py-3 rounded-full text-xs font-semibold transition-all cursor-pointer"
                >
                  กลับไปหน้ารายการคำขอ
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
