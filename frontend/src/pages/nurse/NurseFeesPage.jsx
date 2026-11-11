import Navbar from '../../components/Navbar.jsx'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { getServiceFrequencyBadge } from '../../utils/serviceBadgeHelper.js'

export default function NurseFeesPage() {
  const navigate = useNavigate()
  const [completedRequests, setCompletedRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCompletedRequests = async () => {
      try {
        const res = await api.get('/nurses/requests')
        setCompletedRequests((res.data.active || []).filter(request => request.status === 'Completed'))
      } catch (err) {
        setError(err.response?.data?.message || 'ไม่สามารถโหลดรายการเบิกค่าบริการได้')
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompletedRequests()
  }, [])

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-2">เบิกค่าบริการ</h1>
        <p className="text-sm text-[#45515e] mb-6">รายการงานที่ให้บริการเสร็จสิ้นแล้วและสามารถส่งคำขอเบิกค่าตอบแทนได้</p>

        {isLoading ? (
          <p>กำลังโหลดรายการ...</p>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-5 text-sm">{error}</div>
        ) : completedRequests.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[4px] shadow-sm border border-[#ced4da]">
            <span className="material-symbols-outlined text-6xl text-gray-300">payments</span>
            <p className="text-tertiary mt-2">ยังไม่มีงานที่เสร็จสิ้นสำหรับเบิกค่าบริการ</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {completedRequests.map(item => {
              const frequency = getServiceFrequencyBadge(item)
              const feeRequested = Boolean(item.fee_request_id || item.fee_request_status)

              return (
                <article key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div>
                      <h2 className="font-bold text-lg">{item.patient_name}</h2>
                      <p className="text-sm text-tertiary mt-1">ให้บริการวันที่: {frequency.dateRangeText}</p>
                    </div>
                    <span className="text-[#28A745] bg-[#28A745]/10 border border-[#28A745]/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                      เสร็จสิ้นครบทุกครั้ง
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100 text-sm">
                    <span className="text-tertiary">ยอดค่าบริการ</span>
                    <span className="font-bold text-lg">฿ {Number(item.total_price || 0).toLocaleString('th-TH')}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => navigate(`/nurse/service/${item.id}`)} className="border border-[#1456f0] text-[#1456f0] px-4 py-2 rounded-full text-xs font-semibold">
                      ดูรายละเอียด
                    </button>
                    <button
                      type="button"
                      disabled={feeRequested}
                      onClick={() => { if (!feeRequested) navigate(`/nurse/fee/${item.id}`) }}
                      className={feeRequested
                        ? 'bg-gray-200 text-gray-500 px-4 py-2 rounded-full text-xs font-semibold cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-full text-xs font-semibold'}
                    >
                      {feeRequested ? 'ส่งเบิกแล้ว' : 'เบิกค่าบริการ'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
