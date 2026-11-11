import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { useModal } from '../context/ModalContext.jsx'
import { formatDate } from '../utils/formatDate.js'

export default function ListPatientPage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useModal()
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'inactive'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchPatients()
  }, [])

  // Basic Flow ขั้นตอนที่ 4: ค้นหารายชื่อผู้ป่วยจากฐานข้อมูล
  const fetchPatients = async () => {
    try {
      const response = await api.get('/member/patients')
      setPatients(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันลบผู้ป่วย
  const handleStatusChange = (e, patient, nextStatus) => {
    e.stopPropagation()
    const patientId = patient.id || patient.patient_id
    const isInactive = nextStatus === 'INACTIVE'
    showConfirm({
      type: isInactive ? 'warning' : 'info',
      title: isInactive ? 'พักการดูแลผู้ป่วยรายนี้?' : 'นำผู้ป่วยกลับมารับการดูแล?',
      message: isInactive
        ? 'ระบบจะตรวจสอบก่อนว่าผู้ป่วยยังมีบริการที่กำลังดำเนินการอยู่หรือไม่ หากมีจะไม่สามารถพักการดูแลได้'
        : 'ผู้ป่วยจะกลับมาแสดงในรายชื่อที่พร้อมจองบริการอีกครั้ง',
      confirmText: isInactive ? 'พักการดูแล' : 'นำกลับมาใช้งาน',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          await api.put(`/member/patients/${patientId}/status`, { status: nextStatus })
          showAlert({ type: 'success', title: 'อัปเดตสถานะสำเร็จ', message: isInactive ? 'ย้ายผู้ป่วยไปยังรายการพักการดูแลแล้ว' : 'นำผู้ป่วยกลับมารับการดูแลแล้ว' })
          fetchPatients()
        } catch (err) {
          const errMsg = err.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะผู้ป่วยได้'
          setError(errMsg)
          showAlert({ type: 'error', title: 'ไม่สามารถเปลี่ยนสถานะได้', message: errMsg })
        }
      }
    })
  }

  const handleDelete = (e, patientId) => {
    e.stopPropagation() // ป้องกันไม่ให้ทะลุไปกดเปิดดูรายละเอียด
    showConfirm({
      type: 'warning',
      title: 'ยืนยันการลบข้อมูลผู้ป่วย',
      message: 'คุณแน่ใจหรือไม่ที่จะลบข้อมูลผู้ป่วยรายนี้? การลบจะไม่สามารถกู้คืนได้',
      confirmText: 'ลบข้อมูล',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          await api.delete(`/member/patients/${patientId}`)
          showAlert({
            type: 'success',
            title: 'ลบข้อมูลสำเร็จ',
            message: 'ลบข้อมูลผู้ป่วยเรียบร้อยแล้ว'
          })
          fetchPatients() // โหลดข้อมูลใหม่
        } catch (err) {
          const errMsg = err.response?.data?.message || 'ไม่สามารถลบข้อมูลผู้ป่วยได้'
          setError(errMsg)
          showAlert({ type: 'error', title: 'ไม่สามารถลบข้อมูลได้', message: errMsg })
        }
      }
    })
  }

  const activePatients = patients.filter(patient => (patient.status || 'ACTIVE') === 'ACTIVE')
  const inactivePatients = patients.filter(patient => patient.status === 'INACTIVE')
  const displayedPatients = activeTab === 'active' ? activePatients : inactivePatients

  if (isLoading) {
    return (
      <div className="bg-white min-h-[100dvh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-[#1456f0]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[#45515e] text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      {/* Header */}
      <Navbar />

      {/* Main */}
      <main className="flex-grow p-6 lg:p-10">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="headline-font text-3xl font-bold text-[#222222]">รายชื่อผู้ป่วยในความดูแล</h1>
              <p className="text-[#45515e] text-sm mt-1">จัดการข้อมูลประวัติสุขภาพและความต้องการการดูแลของผู้ป่วย</p>
            </div>
            <button
              onClick={() => navigate('/member/patients/add')}
              className="flex items-center gap-2 bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-5 py-2.5 rounded-full headline-font font-semibold text-sm transition-all shadow-purple-sm hover:shadow-purple-hover"
            >
              <span className="material-symbols-outlined text-lg">person_add</span>
              เพิ่มผู้ป่วยใหม่
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
              <span className="material-symbols-outlined text-rose-600">error</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* แท็บสลับ: ผู้ป่วยปัจจุบัน vs ผู้ป่วยที่พักการดูแล */}
          <div className="flex border-b border-gray-200 mb-6 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('active')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'active'
                  ? 'border-[#1456f0] text-[#1456f0]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="material-symbols-outlined text-base">person</span>
              คนในความดูแลปัจจุบัน ({activePatients.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inactive')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'inactive'
                  ? 'border-[#1456f0] text-[#1456f0]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="material-symbols-outlined text-base">archive</span>
              พักการดูแลแล้ว ({inactivePatients.length})
            </button>
          </div>

          {/* Patient List */}
          {displayedPatients.length === 0 ? (
            // ไม่พบข้อมูล
            <div className="bg-white rounded-3xl shadow-purple-sm border border-gray-100 p-12 text-center max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">{activeTab === 'active' ? 'person_off' : 'inventory_2'}</span>
              </div>
              <h2 className="headline-font text-xl font-bold text-[#222222] mb-2">
                {activeTab === 'active' ? 'ยังไม่มีข้อมูลผู้ป่วยในความดูแล' : 'ไม่มีผู้ป่วยที่พักการดูแล'}
              </h2>
              <p className="text-[#45515e] text-sm mb-6">
                {activeTab === 'active' ? 'เริ่มต้นเพิ่มข้อมูลผู้ป่วยเพื่อให้ระบบจับคู่พยาบาลได้อย่างแม่นยำ' : 'ผู้ป่วยที่กดพักการดูแลจะแสดงในส่วนนี้'}
              </p>
              {activeTab === 'active' && (
                <button
                  onClick={() => navigate('/member/patients/add')}
                  className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-6 py-2.5 rounded-full headline-font font-semibold text-sm transition-all shadow-purple-sm"
                >
                  + เพิ่มผู้ป่วยรายแรก
                </button>
              )}
            </div>
          ) : (
            // Basic Flow ขั้นตอนที่ 5: แสดงรายการข้อมูลรายชื่อผู้ป่วย
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayedPatients.map((patient) => {
                const isInactive = patient.status === 'INACTIVE'
                return (
                <div
                  key={patient.id || patient.patient_id}
                  onClick={() => navigate(`/member/patients/${patient.id || patient.patient_id}`)}
                  className={`bg-white rounded-2xl shadow-purple-sm border p-6 hover:shadow-purple-hover hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between ${
                    isInactive ? 'border-gray-200 opacity-80' : 'border-gray-100'
                  }`}
                >
                  <div>
                    {/* Avatar & Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm ${
                        patient.gender === 'ชาย' ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-pink-400 to-rose-500'
                      }`}>
                        {(patient.first_name || patient.firstname || '?')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-[#222222] text-lg group-hover:text-[#1456f0] transition-colors">
                            {patient.first_name || patient.firstname} {patient.last_name || patient.lastname}
                          </h3>
                          {isInactive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                              พักการดูแล
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#45515e] mt-0.5">
                          {patient.gender || '-'} • อายุ {patient.age || '-'} ปี{patient.birth_date ? ` (เกิด ${formatDate(patient.birth_date)})` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Quick Info Badges */}
                    <div className="space-y-2 text-xs text-[#45515e] py-2 border-t border-gray-100">
                      {patient.relationship_to_member && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#1456f0]">family_restroom</span>
                          <span>ความสัมพันธ์: <strong className="text-[#222222]">{patient.relationship_to_member}</strong></span>
                        </div>
                      )}
                      {(patient.blood_type || patient.health_profile?.blood_type) && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-rose-500">bloodtype</span>
                          <span>หมู่เลือด: <strong className="text-rose-600">{patient.blood_type || patient.health_profile?.blood_type}</strong></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDelete(e, patient.id || patient.patient_id)}
                        className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5 py-1 px-2 rounded-full hover:bg-rose-50 transition-colors"
                        title="ลบข้อมูลผู้ป่วย"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span> ลบ
                      </button>
                      <button
                        onClick={(e) => handleStatusChange(e, patient, isInactive ? 'ACTIVE' : 'INACTIVE')}
                        className={`text-xs font-semibold flex items-center gap-0.5 py-1 px-2.5 rounded-full transition-colors border ${
                          isInactive
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                        }`}
                        title={isInactive ? 'นำกลับมารับบริการ' : 'พักการดูแลผู้ป่วยรายนี้'}
                      >
                        <span className="material-symbols-outlined text-sm">{isInactive ? 'replay' : 'person_cancel'}</span>
                        {isInactive ? 'นำกลับมารับการดูแล' : 'พักการดูแล'}
                      </button>
                    </div>
                    <span className="text-xs text-[#1456f0] font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                      ดูรายละเอียด <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
