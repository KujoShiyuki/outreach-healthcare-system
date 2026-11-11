import { formatDate } from './formatDate.js'

// ฟังก์ชันวิเคราะห์และจัดหมวดหมู่รูปแบบความถี่ของบริการ (รายครั้ง / รายสัปดาห์ / รายเดือน / ต่อเนื่อง)
export function getServiceFrequencyBadge(req = {}) {
  const notes = req.additional_notes || ''
  const subType = req.subscription_type || ''
  const pkgName = req.package_name || ''
  const count = req.service_count || 1
  const completed = req.completed_service_count || 0

  const sDate = formatDate(req.start_date)
  const eDate = formatDate(req.end_date)

  // 1. ตรวจสอบกรณีเหมาจ่ายรายเดือน
  if (subType === 'Monthly' || pkgName.includes('รายเดือน') || notes.includes('รายเดือน')) {
    return {
      type: 'monthly',
      label: 'เหมาจ่ายรายเดือน (30 วัน)',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: 'calendar_month',
      dateRangeText: req.end_date ? `${sDate} ถึง ${eDate}` : `เริ่ม ${sDate}`,
      progressText: `${completed} / ${count} วัน`,
      isRecurring: true
    }
  }

  // 2. ตรวจสอบกรณีรายสัปดาห์
  if (notes.includes('รายสัปดาห์')) {
    const match = notes.match(/รายสัปดาห์\s*([^\]\n]+)/)
    const detail = match ? match[1].trim() : `${count} ครั้ง`
    return {
      type: 'weekly',
      label: `รายสัปดาห์ (${detail})`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: 'calendar_view_week',
      dateRangeText: req.end_date ? `${sDate} ถึง ${eDate}` : sDate,
      progressText: `${completed} / ${count} ครั้ง`,
      isRecurring: true
    }
  }

  // 3. ดูแลต่อเนื่องหลายวัน (Range / Multi-dates)
  if (count > 1) {
    return {
      type: 'multi_days',
      label: `ดูแลต่อเนื่อง (${count} วัน/ครั้ง)`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      icon: 'date_range',
      dateRangeText: req.end_date && req.end_date !== req.start_date ? `${sDate} ถึง ${eDate}` : sDate,
      progressText: `${completed} / ${count} ครั้ง`,
      isRecurring: true
    }
  }

  // 4. นัดหมายบริการรายครั้ง (Single Visit)
  return {
    type: 'single',
    label: 'บริการรายครั้ง',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'event_available',
    dateRangeText: sDate,
    progressText: `${completed} / 1 ครั้ง`,
    isRecurring: false
  }
}
