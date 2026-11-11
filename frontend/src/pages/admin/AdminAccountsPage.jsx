import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { useModal } from '../../context/ModalContext.jsx'
import { formatDate } from '../../utils/formatDate.js'

export default function AdminAccountsPage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useModal()
  const [query, setQuery] = useState('')
  const [nurses, setNurses] = useState([])
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showImageModal, setShowImageModal] = useState(null)
  // showImageModal: { url: string, title: string, nurseName: string }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { navigate('/login'); return }
    const user = JSON.parse(userStr)
    if (user.role?.toLowerCase() !== 'admin') { navigate('/login'); return }

    fetchNurses()
  }, [])

  const fetchNurses = async (searchQuery = '') => {
    try {
      setIsLoading(true)
      const res = await api.get(`/admin/nurses/search?query=${searchQuery}`)
      setNurses(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchNurses(query)
  }

  const handleSuspend = (nurseId, currentStatus) => {
    const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended'
    const confirmMsg = newStatus === 'Suspended'
      ? 'คุณแน่ใจหรือไม่ที่จะระงับบัญชีนี้?'
      : 'คุณแน่ใจหรือไม่ที่จะปลดระงับบัญชีนี้?'

    showConfirm({
      type: newStatus === 'Suspended' ? 'warning' : 'info',
      title: newStatus === 'Suspended' ? 'ยืนยันการระงับบัญชี' : 'ยืนยันการปลดระงับบัญชี',
      message: confirmMsg,
      confirmText: newStatus === 'Suspended' ? 'ระงับบัญชี' : 'ปลดระงับบัญชี',
      onConfirm: async () => {
        try {
          await api.post(`/admin/nurses/${nurseId}/status`, { status: newStatus })
          showAlert({ type: 'success', title: 'เปลี่ยนสถานะสำเร็จ', message: `เปลี่ยนสถานะบัญชีเป็น ${newStatus} เรียบร้อยแล้ว` })
          fetchNurses(query)
        } catch (err) {
          showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'เกิดข้อผิดพลาด' })
        }
      }
    })
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

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">จัดการบัญชีพยาบาล</h1>
            <p className="text-tertiary">ค้นหาและจัดการสถานะบัญชีของพยาบาลในระบบ</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ, อีเมล, เลขใบอนุญาต"
                className="p-2.5 border border-[#ced4da] rounded-[4px] w-64 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#007BFF]"
              />
              <button type="submit" className="bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white px-4 py-2.5 rounded-[4px] font-semibold text-sm transition-all">ค้นหา</button>
            </form>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold bg-[#FFC107]/10 text-[#343A40] px-3 py-1.5 rounded-[4px] border border-[#FFC107]/30">
              <input type="checkbox" checked={filterExpiring} onChange={(e) => setFilterExpiring(e.target.checked)} className="rounded-[4px] border-[#ced4da] text-[#007BFF] focus:ring-[#007BFF] w-4 h-4" />
              เฉพาะใบประกอบวิชาชีพใกล้หมดอายุ / หมดอายุ
            </label>
          </div>
        </div>

        {isLoading ? <p>กำลังโหลด...</p> : (
          <div className="bg-white rounded-[4px] shadow-sm border border-[#ced4da] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9FA] text-[#343A40] border-b border-[#ced4da]">
                <tr>
                  <th className="p-4 font-semibold">ชื่อ-นามสกุล / ระดับวิชาชีพ</th>
                  <th className="p-4 font-semibold">อีเมล</th>
                  <th className="p-4 font-semibold">สถานะ / วันหมดอายุใบอนุญาต</th>
                  <th className="p-4 font-semibold">สถานะบัญชี</th>
                  <th className="p-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ced4da]">
                {nurses.filter(nurse => {
                  if (!filterExpiring) return true;
                  if (!nurse.license_expire_date) return false;
                  const expDate = new Date(nurse.license_expire_date);
                  const today = new Date();
                  const diffTime = expDate - today;
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 30; // แสดงคนที่หมดอายุแล้ว หรือใกล้หมดอายุใน 30 วัน
                }).sort((a, b) => {
                  if (filterExpiring) {
                     const dateA = a.license_expire_date ? new Date(a.license_expire_date) : new Date(8640000000000000);
                     const dateB = b.license_expire_date ? new Date(b.license_expire_date) : new Date(8640000000000000);
                     return dateA - dateB;
                  }
                  return 0;
                }).map(nurse => {
                  const isExpiringSoon = () => {
                    if (!nurse.license_expire_date) return false;
                    const exp = new Date(nurse.license_expire_date);
                    const diffDays = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30;
                  };

                  return (
                  <tr key={nurse.id} className={isExpiringSoon() && filterExpiring ? "bg-[#FFC107]/10" : ""}>
                    <td className="p-4 font-medium">
                      <div>
                        <span className="font-bold text-on-surface">{nurse.fullname} {nurse.surname}</span>
                        <span className="ml-2 text-xs font-bold bg-[#007BFF]/10 text-[#007BFF] px-2 py-0.5 rounded-[4px]">{nurse.professional_tier || 'Nurse'}</span>
                      </div>
                      {nurse.license_number && (
                        <p className="text-xs text-tertiary mt-0.5">
                          เลขที่ใบอนุญาต: <span className="font-mono text-on-surface font-semibold">{nurse.license_number}</span>
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {nurse.license_file_url ? (
                          <button
                            type="button"
                            onClick={() => setShowImageModal({ url: nurse.license_file_url, title: 'ใบอนุญาตประกอบวิชาชีพพยาบาล', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">description</span>
                            ดูใบประกอบวิชาชีพ
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200 text-[10px]">
                            <span className="material-symbols-outlined text-[12px]">remove_circle_outline</span>
                            ไม่มีไฟล์ใบประกอบ
                          </span>
                        )}

                        {nurse.identity_document_url && (
                          <button
                            type="button"
                            onClick={() => setShowImageModal({ url: nurse.identity_document_url, title: 'รูปถ่ายบัตรประชาชน', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">badge</span>
                            บัตรประชาชน
                          </button>
                        )}

                        {nurse.criminal_record_url && (
                          <button
                            type="button"
                            onClick={() => setShowImageModal({ url: nurse.criminal_record_url, title: 'หนังสือรับรองประวัติอาชญากรรม (สตช.)', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">shield_person</span>
                            ประวัติอาชญากรรม
                          </button>
                        )}

                        {nurse.medical_certificate_url && (
                          <button
                            type="button"
                            onClick={() => setShowImageModal({ url: nurse.medical_certificate_url, title: 'ใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง 5 โรค', nurseName: `${nurse.fullname} ${nurse.surname}` })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold hover:bg-teal-100 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px]">medical_services</span>
                            ใบรับรองแพทย์ 5 โรค
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-tertiary">{nurse.email}</td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div>
                          {nurse.approval_status === 'Verified' ? (
                            <span className="text-[#28A745] text-xs font-bold bg-[#28A745]/10 border border-[#28A745]/20 px-2 py-0.5 rounded-[4px] inline-block">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="text-[#856404] text-xs font-bold bg-[#FFC107]/20 border border-[#FFC107]/40 px-2 py-0.5 rounded-[4px] inline-block">
                              ⏳ {nurse.approval_status || 'Pending'}
                            </span>
                          )}
                        </div>

                        {nurse.license_expire_date ? (
                          <div className="space-y-0.5 pt-0.5">
                            <p className="text-xs">
                              <span className="text-tertiary">หมดอายุ: </span>
                              <strong className="text-on-surface">{formatDate(nurse.license_expire_date)}</strong>
                            </p>
                            {(() => {
                              const expStatus = getLicenseExpireStatus(nurse.license_expire_date);
                              if (!expStatus) return null;
                              return (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border text-[10px] font-bold ${expStatus.color}`}>
                                  <span className="material-symbols-outlined text-[12px]">{expStatus.icon}</span>
                                  {expStatus.statusText}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-tertiary">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {nurse.user_status === 'Suspended' ? <span className="text-[#DC3545] bg-[#DC3545]/10 border border-[#DC3545]/20 px-2 py-1 rounded-[4px] text-xs font-bold">ระงับการใช้งาน</span> : <span className="text-[#28A745] bg-[#28A745]/10 border border-[#28A745]/20 px-2 py-1 rounded-[4px] text-xs font-bold">ใช้งานปกติ</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleSuspend(nurse.id, nurse.user_status)}
                        className={`text-sm font-semibold px-3 py-1.5 rounded-[4px] transition-all ${nurse.user_status === 'Suspended' ? 'bg-[#28A745] text-white hover:bg-[#218838]' : 'bg-[#DC3545] text-white hover:bg-[#c82333]'}`}
                      >
                        {nurse.user_status === 'Suspended' ? 'ปลดระงับ' : 'ระงับบัญชี'}
                      </button>
                    </td>
                  </tr>
                )})}
                {nurses.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-tertiary">ไม่พบข้อมูล</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Document Viewer Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#181e25]/60 backdrop-blur-sm p-4" onClick={() => setShowImageModal(null)}>
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/70">
              <div>
                <h3 className="font-bold text-base text-[#222222]">{showImageModal.title}</h3>
                <p className="text-xs text-[#45515e] mt-0.5">พยาบาล: {showImageModal.nurseName}</p>
              </div>
              <button type="button" onClick={() => setShowImageModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-6 flex items-center justify-center min-h-[360px] bg-gray-50/40 overflow-auto">
              <img
                src={showImageModal.url}
                alt={showImageModal.title}
                className="max-h-[65vh] max-w-full object-contain rounded-2xl border border-gray-200 bg-white shadow-sm"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button type="button" onClick={() => setShowImageModal(null)} className="bg-gray-100 hover:bg-gray-200 text-[#222222] px-5 py-2 rounded-full text-xs font-semibold">ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
