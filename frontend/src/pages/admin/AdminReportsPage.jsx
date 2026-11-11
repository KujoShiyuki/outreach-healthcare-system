import Navbar from "../../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { useModal } from '../../context/ModalContext.jsx'
import { formatDate } from '../../utils/formatDate.js'

export default function AdminReportsPage() {
  const navigate = useNavigate()
  const { showAlert, showConfirm } = useModal()
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (!token || !userStr) { navigate('/login'); return }
    const user = JSON.parse(userStr)
    if (user.role?.toLowerCase() !== 'admin') { navigate('/login'); return }

    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await api.get('/admin/reports/settlement')
      setReports(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePay = (rep) => {
    const accNumber = rep.raw_bank_account || rep.bank_account || '-'
    const bankNameInfo = rep.bank_name && rep.bank_name !== '-' ? `\n• ธนาคาร: ${rep.bank_name}` : ''
    showConfirm({
      type: 'info',
      title: 'ยืนยันการโอนเงินค่าตอบแทน',
      message: `กรุณาตรวจสอบว่าได้ทำการโอนเงินเข้าบัญชีพยาบาลเรียบร้อยแล้ว:\n• พยาบาล: ${rep.nurse_name}${bankNameInfo}\n• เลขที่บัญชี: ${accNumber}\n• ยอดเงินโอน: ฿${Number(rep.amount).toLocaleString('th-TH')} บาท`,
      confirmText: 'ยืนยันโอนเงินแล้ว',
      cancelText: 'ยกเลิก',
      onConfirm: async () => {
        try {
          await api.post(`/admin/fee-requests/${rep.id}/pay`)
          showAlert({ type: 'success', title: 'โอนเงินสำเร็จ', message: 'บันทึกการโอนเงินค่าบริการสำเร็จเรียบร้อยแล้ว' })
          fetchReports()
        } catch (err) {
          showAlert({ type: 'error', title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก' })
        }
      }
    })
  }

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="p-6 lg:p-10 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2">รายงานรายได้และเบิกจ่ายเงิน (Settlement Report)</h1>
        <p className="text-tertiary mb-8">จัดการคำขอเบิกเงินจากพยาบาล และตรวจสอบยอดโอนจ่าย</p>

        {isLoading ? <p>กำลังโหลด...</p> : (
          <div className="bg-white rounded-[4px] shadow-sm border border-[#ced4da] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9FA] text-[#343A40] border-b border-[#ced4da]">
                <tr>
                  <th className="p-4 font-semibold">รายการบริการ</th>
                  <th className="p-4 font-semibold">พยาบาล (ผู้เบิก)</th>
                  <th className="p-4 font-semibold">เลขบัญชี</th>
                  <th className="p-4 font-semibold">ยอดเบิก</th>
                  <th className="p-4 font-semibold">สถานะ</th>
                  <th className="p-4 font-semibold text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ced4da]">
                {reports.map(rep => (
                  <tr key={rep.id}>
                    <td className="p-4">
                      <p className="font-bold text-sm">ID: {rep.service_request_id}</p>
                      <p className="text-xs text-tertiary">{formatDate(rep.service_date)}</p>
                    </td>
                    <td className="p-4 font-medium text-sm">{rep.nurse_name}</td>
                    <td className="p-4">
                      <p className="font-medium text-xs text-tertiary">{rep.bank_name && rep.bank_name !== '-' ? rep.bank_name : ''}</p>
                      <p className="font-mono text-sm font-semibold text-[#1456f0]">{rep.raw_bank_account || rep.bank_account}</p>
                    </td>
                    <td className="p-4 font-bold text-primary">฿{Number(rep.amount).toLocaleString('th-TH')}</td>
                    <td className="p-4">
                      {rep.status === 'Paid' ? (
                        <span className="text-[#28A745] bg-[#28A745]/10 border border-[#28A745]/20 px-2 py-1 rounded-[4px] text-xs font-semibold flex items-center w-max gap-1">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>โอนแล้ว
                        </span>
                      ) : (
                        <span className="text-[#FFC107] bg-[#FFC107]/10 border border-[#FFC107]/20 px-2 py-1 rounded-[4px] text-xs font-semibold flex items-center w-max gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>รอโอนจ่าย
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {rep.status === 'Pending' && (
                        <button onClick={() => handlePay(rep)} className="bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white text-sm font-semibold px-4 py-2 rounded-[4px] transition-all cursor-pointer">
                          ยืนยันการโอนเงิน
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-tertiary">ไม่พบข้อมูลการเบิกจ่าย</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
