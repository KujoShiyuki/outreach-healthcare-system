import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { useModal } from '../../context/ModalContext.jsx'
import { formatDate } from '../../utils/formatDate.js'

export default function AdminVerifyNursePage() {
  const navigate = useNavigate()
  const { showAlert } = useModal()
  const [nurses, setNurses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showImageModal, setShowImageModal] = useState(null)
  // showImageModal: { url: string, title: string, nurseName: string }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { navigate('/login'); return }
    const user = JSON.parse(userStr)
    if (user.role?.toLowerCase() !== 'admin') { navigate('/login'); return }

    fetchPendingNurses()
  }, [])

  const fetchPendingNurses = async () => {
    try {
      const res = await api.get('/admin/nurses/pending')
      setNurses(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (nurseId, decision) => {
    try {
      await api.post(`/admin/nurses/${nurseId}/verify`, { decision })
      showAlert({
        type: decision === 'Verified' ? 'success' : 'warning',
        title: decision === 'Verified' ? 'อนุมัติสำเร็จ' : 'ปฏิเสธสำเร็จ',
        message: decision === 'Verified' ? 'อนุมัติใบประกอบวิชาชีพของพยาบาลเรียบร้อยแล้ว' : 'ปฏิเสธคำขอตรวจสอบเรียบร้อยแล้ว'
      })
      fetchPendingNurses()
    } catch (err) {
      showAlert({ type: 'error', title: 'ดำเนินการไม่สำเร็จ', message: err.response?.data?.message || 'เกิดข้อผิดพลาด' })
    }
  }

  const getLicenseExpireStatus = (expireDateStr) => {
    if (!expireDateStr) return null
    const exp = new Date(expireDateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      return {
        statusText: `หมดอายุแล้ว (${Math.abs(diffDays)} วันที่ผ่านมา)`,
        color: 'bg-[#DC3545]/15 text-[#DC3545] border-[#DC3545]/30',
        icon: 'cancel'
      }
    } else if (diffDays <= 30) {
      return {
        statusText: `ใกล้หมดอายุ (เหลือ ${diffDays} วัน)`,
        color: 'bg-[#FFC107]/20 text-[#856404] border-[#FFC107]/40',
        icon: 'warning'
      }
    } else {
      return {
        statusText: 'ยังไม่หมดอายุ (ปกติ)',
        color: 'bg-[#28A745]/15 text-[#28A745] border-[#28A745]/30',
        icon: 'check_circle'
      }
    }
  }

  const getAgeText = (birthDateStr) => {
    if (!birthDateStr) return ''
    const b = new Date(birthDateStr)
    if (isNaN(b.getTime())) return ''
    const today = new Date()
    let age = today.getFullYear() - b.getFullYear()
    const m = today.getMonth() - b.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--
    return ` (อายุ ${age} ปี)`
  }

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-6">ตรวจสอบเอกสารผู้ให้บริการพยาบาล</h1>
        <p className="text-tertiary mb-6">ตรวจสอบใบอนุญาต เอกสารยืนยันตัวตน และเอกสารความปลอดภัยก่อนอนุมัติผู้สมัคร</p>

        {isLoading ? <p>กำลังโหลด...</p> : nurses.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[4px] shadow-sm border border-[#ced4da]">
            <span className="material-symbols-outlined text-6xl text-gray-300">verified</span>
            <p className="text-tertiary mt-2">ไม่มีรายการรอตรวจสอบ</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {nurses.map(nurse => (
              <div key={nurse.id} className="bg-white p-6 rounded-[4px] shadow-sm border border-[#ced4da] flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">
                    {nurse.fullname} {nurse.surname}
                    <span className="ml-2 text-xs font-bold bg-[#007BFF]/10 text-[#007BFF] px-2 py-0.5 rounded-[4px]">{nurse.professional_tier || 'Nurse'}</span>
                  </h3>
                  {nurse.professional_tier === 'RN' && (
                    <div className="my-2 p-3 bg-[#F8F9FA] border border-[#ced4da] rounded-[4px] space-y-1">
                      <p className="text-sm">
                        เลขที่ใบประกอบวิชาชีพ: <span className="font-semibold text-on-surface font-mono text-[#007BFF]">{nurse.license_number || '-'}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-tertiary">
                          วันออกใบอนุญาต: <strong className="text-on-surface">{formatDate(nurse.license_issue_date)}</strong>
                        </span>
                        <span className="text-tertiary">
                          วันหมดอายุ: <strong className="text-on-surface">{formatDate(nurse.license_expire_date)}</strong>
                        </span>
                        {(() => {
                          const expStatus = getLicenseExpireStatus(nurse.license_expire_date)
                          if (!expStatus) return <span className="text-[11px] text-tertiary">(ยังไม่ได้ระบุวันหมดอายุ)</span>
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border text-[11px] font-bold ${expStatus.color}`}>
                              <span className="material-symbols-outlined text-[13px]">{expStatus.icon}</span>
                              {expStatus.statusText}
                            </span>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm mt-1">
                    <p className="text-[#45515e]">เลขบัตรประชาชน: <span className="font-semibold text-on-surface">{nurse.national_id || '-'}</span></p>
                    {nurse.birth_date && (
                      <p className="text-[#45515e]">วันเกิด: <span className="font-semibold text-on-surface">{formatDate(nurse.birth_date)}{getAgeText(nurse.birth_date)}</span></p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {/* 1. บัตรประชาชน */}
                    {nurse.identity_document_url ? (
                      <button
                        type="button"
                        className="text-xs text-blue-800 font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5 w-fit bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200 cursor-pointer"
                        onClick={() => setShowImageModal({ url: nurse.identity_document_url, title: 'รูปถ่ายบัตรประชาชน', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                      >
                        <span className="material-symbols-outlined text-base">badge</span>
                        บัตรประชาชน
                      </button>
                    ) : (
                      <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                        ยังไม่มีบัตรประชาชน
                      </span>
                    )}

                    {/* 2. หนังสือรับรองประวัติอาชญากรรม */}
                    {nurse.criminal_record_url ? (
                      <button
                        type="button"
                        className="text-xs text-purple-800 font-bold hover:bg-purple-100 transition-colors flex items-center gap-1.5 w-fit bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 cursor-pointer"
                        onClick={() => setShowImageModal({ url: nurse.criminal_record_url, title: 'หนังสือรับรองประวัติอาชญากรรม (สตช.)', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                      >
                        <span className="material-symbols-outlined text-base">shield_person</span>
                        ประวัติอาชญากรรม (สตช.)
                      </button>
                    ) : (
                      <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                        ยังไม่มีประวัติอาชญากรรม
                      </span>
                    )}

                    {/* 3. ใบรับรองแพทย์ 5 โรค */}
                    {nurse.medical_certificate_url ? (
                      <button
                        type="button"
                        className="text-xs text-teal-800 font-bold hover:bg-teal-100 transition-colors flex items-center gap-1.5 w-fit bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200 cursor-pointer"
                        onClick={() => setShowImageModal({ url: nurse.medical_certificate_url, title: 'ใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง 5 โรค', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                      >
                        <span className="material-symbols-outlined text-base">medical_services</span>
                        ใบรับรองแพทย์ 5 โรค
                      </button>
                    ) : (
                      <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                        ยังไม่มีใบรับรองแพทย์
                      </span>
                    )}

                    {/* 4. ใบประกอบวิชาชีพ (เฉพาะ RN) */}
                    {nurse.professional_tier === 'RN' && (
                      nurse.license_file_url ? (
                        <button
                          type="button"
                          className="text-xs text-emerald-800 font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1.5 w-fit bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 cursor-pointer"
                          onClick={() => setShowImageModal({ url: nurse.license_file_url, title: 'ใบอนุญาตประกอบวิชาชีพพยาบาล', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                        >
                          <span className="material-symbols-outlined text-base">description</span>
                          ใบประกอบวิชาชีพ RN
                        </button>
                      ) : (
                        <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-amber-600">info</span>
                          ยังไม่มีใบประกอบวิชาชีพ
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleVerify(nurse.id, 'Verified')} className="bg-[#28A745] hover:bg-[#218838] active:translate-y-[1px] hover:shadow-sm text-white px-5 py-2 rounded-[4px] font-semibold transition-all text-sm">
                    อนุมัติ
                  </button>
                  <button onClick={() => handleVerify(nurse.id, 'Rejected')} className="bg-[#DC3545] hover:bg-[#c82333] active:translate-y-[1px] hover:shadow-sm text-white px-5 py-2 rounded-[4px] font-semibold transition-all text-sm">
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Document Viewer Modal Popup */}
      {showImageModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#181e25]/60 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={() => setShowImageModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">
                    {showImageModal.title.includes('บัตร') ? 'badge' : showImageModal.title.includes('อาชญากรรม') ? 'shield_person' : showImageModal.title.includes('แพทย์') ? 'medical_services' : 'description'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#222222] headline-font">{showImageModal.title}</h3>
                  <p className="text-xs text-[#45515e]">พยาบาล: {showImageModal.nurseName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50/40 flex justify-center items-center min-h-[360px]">
              {showImageModal.url && (showImageModal.url.startsWith('data:image') || showImageModal.url.startsWith('http') || showImageModal.url.startsWith('blob:') || showImageModal.url.endsWith('.jpg') || showImageModal.url.endsWith('.png')) ? (
                <div className="flex flex-col items-center">
                  <img
                    src={showImageModal.url}
                    alt={showImageModal.title}
                    className="max-h-[68vh] w-auto max-w-full rounded-2xl shadow-sm border border-gray-200 object-contain bg-white"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden border-2 border-dashed border-gray-200 rounded-2xl w-full max-w-md h-72 flex-col items-center justify-center text-[#45515e] bg-white p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">broken_image</span>
                    <p className="font-bold text-sm text-[#222222]">ไม่สามารถโหลดไฟล์รูปภาพได้</p>
                    <p className="text-xs text-gray-400 mt-1 break-all">{showImageModal.url}</p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl w-full max-w-md h-72 flex flex-col items-center justify-center text-[#45515e] bg-white p-6 text-center">
                  <span className="material-symbols-outlined text-5xl text-gray-300 mb-2">article</span>
                  <p className="font-bold text-sm text-[#222222]">ไฟล์เอกสารที่แนบมา</p>
                  <p className="text-xs text-gray-400 mt-1 break-all">{showImageModal.url || 'ไม่มีข้อมูล URL'}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
              <button
                type="button"
                onClick={() => setShowImageModal(null)}
                className="bg-gray-100 hover:bg-gray-200 text-[#222222] px-5 py-2 rounded-full font-semibold text-xs transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
