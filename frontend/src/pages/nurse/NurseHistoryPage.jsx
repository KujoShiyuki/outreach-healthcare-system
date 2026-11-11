import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { getServiceFrequencyBadge } from '../../utils/serviceBadgeHelper.js'

export default function NurseHistoryPage() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchHistory() }, [])

  const fetchHistory = async () => {
    try {
      const res = await api.get('/nurses/requests')
      // ดึงงานที่เสร็จสิ้นสมบูรณ์แล้ว (Completed) และงานที่ถูกยกเลิก (Cancelled) มาไว้ในหน้าประวัติ
      const historyList = (res.data.active || []).filter(req => req.status === 'Completed' || req.status === 'Cancelled')
      setHistory(historyList)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-2">ประวัติการให้บริการ</h2>
        <p className="text-sm text-[#45515e] mb-6">ประวัติงานที่เสร็จสิ้นหรือยกเลิกแล้ว</p>

        {isLoading ? <p>กำลังโหลด...</p> : history.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-[4px] shadow-sm border border-[#ced4da]">
            <span className="material-symbols-outlined text-6xl text-gray-300">history</span>
            <p className="text-tertiary mt-2">ยังไม่มีประวัติการให้บริการที่เสร็จสิ้นหรือยกเลิก</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map(item => {
              const frequency = getServiceFrequencyBadge(item)
              const isCancelled = item.status === 'Cancelled'
              return (
                <div key={item.id} onClick={() => navigate(`/nurse/service/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate(`/nurse/service/${item.id}`) }} role="button" tabIndex={0} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-[#1456f0] transition-all cursor-pointer">
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{item.patient_name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-sm text-tertiary">ให้บริการวันที่: {frequency.dateRangeText}</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${frequency.badgeClass}`}>
                          <span className="material-symbols-outlined text-[13px]">{frequency.icon}</span>
                          {frequency.label}
                        </span>
                      </div>
                    </div>
                    {isCancelled ? (
                      <span className="text-gray-600 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        ยกเลิกคำขอแล้ว
                      </span>
                    ) : (
                      <span className="text-[#28A745] bg-[#28A745]/10 border border-[#28A745]/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        เสร็จสิ้นครบทุกครั้ง
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="text-tertiary">
                      {isCancelled ? 'รายการนี้ถูกยกเลิก' : `บันทึกการดูแลแล้ว ${frequency.progressText}`}
                    </span>
                    <span className="font-bold">฿ {item.total_price || '-'}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/nurse/service/${item.id}`) }} className="border border-[#1456f0] text-[#1456f0] px-4 py-2 rounded-full text-xs font-semibold">
                      ดูรายละเอียดผู้ป่วยและคำขอ
                    </button>
                    {!isCancelled && (
                      <>
                        <button type="button" onClick={(event) => { event.stopPropagation(); navigate(`/nurse/record/${item.id}`) }} className="bg-[#1456f0] text-white px-4 py-2 rounded-full text-xs font-semibold">
                          ดูรายงานการพยาบาล
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
