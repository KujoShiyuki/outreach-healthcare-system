/**
 * แปลงวันที่จาก YYYY-MM-DD เป็น DD/MM/YYYY (ปี พ.ศ.)
 * ตัวอย่าง: "2026-11-04" → "04/11/2569"
 */
export function formatDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return dateStr || '-'
  // รองรับทั้ง "YYYY-MM-DD" และ "YYYY-MM-DDTHH:mm:ss"
  const parts = dateStr.split('T')[0].split('-')
  if (parts.length !== 3) return dateStr
  const [year, month, day] = parts
  const buddhistYear = parseInt(year, 10) + 543
  return `${day}/${month}/${buddhistYear}`
}

/**
 * แปลง datetime เป็นรูปแบบไทย DD/MM/YYYY HH:mm
 * ตัวอย่าง: "2026-11-04T14:30:00" → "04/11/2569 14:30"
 */
export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '-'
  try {
    const d = new Date(dateTimeStr)
    if (isNaN(d.getTime())) return dateTimeStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const buddhistYear = d.getFullYear() + 543
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${buddhistYear} ${hours}:${minutes}`
  } catch {
    return dateTimeStr
  }
}

/**
 * Mapping ระดับความรู้สึกตัว อังกฤษ → ไทย
 */
export const consciousnessMap = {
  Alert: 'รู้สึกตัวดี',
  Drowsy: 'ซึมลง',
  Confusion: 'สับสน',
  Unconscious: 'ไม่รู้สึกตัว'
}

/**
 * แปลงค่า consciousness จากภาษาอังกฤษ → ไทย
 */
export function formatConsciousness(value) {
  if (!value) return 'ไม่ระบุ'
  return consciousnessMap[value] || value
}
