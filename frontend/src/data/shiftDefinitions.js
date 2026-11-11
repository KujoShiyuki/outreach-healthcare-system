export const ALL_DAYS = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']

export const SHIFT_DEFINITIONS = [
  {
    id: 'morning_8h',
    name: 'เวรเช้า (Morning Shift)',
    label: 'เวรเช้า 8 ชม.',
    category: '8_HOURS',
    categoryLabel: 'กะ 8 ชั่วโมง',
    time: '08.00 – 16.00 น.',
    description: 'เน้นการทำหัตถการ ส่งตรวจ และดูแลกิจวัตรผู้ป่วยประจำวัน',
    icon: 'wb_sunny'
  },
  {
    id: 'afternoon_8h',
    name: 'เวรบ่าย (Afternoon Shift)',
    label: 'เวรบ่าย 8 ชม.',
    category: '8_HOURS',
    categoryLabel: 'กะ 8 ชั่วโมง',
    time: '16.00 – 24.00 น.',
    description: 'รับต่อจากเวรเช้า และให้ยา/การพยาบาลช่วงเย็น',
    icon: 'wb_twilight'
  },
  {
    id: 'night_8h',
    name: 'เวรดึก (Night Shift)',
    label: 'เวรดึก 8 ชม.',
    category: '8_HOURS',
    categoryLabel: 'กะ 8 ชั่วโมง',
    time: '24.00 – 08.00 น.',
    description: 'ดูแลความสงบ พลิกตัว พ่นยา และเคสฉุกเฉินยามวิกาล',
    icon: 'bedtime'
  },
  {
    id: 'day_12h',
    name: 'กะกลางวัน 12 ชม. (Day Shift)',
    label: 'กะกลางวัน 12 ชม.',
    category: '12_HOURS',
    categoryLabel: 'กะยาว 12 ชั่วโมง',
    time: '08.00 – 20.00 น.',
    description: 'ดูแลผู้ป่วยและเฝ้าไข้เต็มวันแบบต่อเนื่อง',
    icon: 'light_mode'
  },
  {
    id: 'night_12h',
    name: 'กะกลางคืน 12 ชม. (Night Shift)',
    label: 'กะกลางคืน 12 ชม.',
    category: '12_HOURS',
    categoryLabel: 'กะยาว 12 ชั่วโมง',
    time: '20.00 – 08.00 น.',
    description: 'เฝ้าไข้ติดเตียงยามค่ำคืน ดูดเสมหะ พลิกตัว ดูแลเครื่องช่วยหายใจ',
    icon: 'nights_stay'
  }
]

export const SHIFT_OPTIONS = [
  { id: '', label: 'ทุกกะเวลา' },
  ...SHIFT_DEFINITIONS.map(shift => ({
    id: shift.id,
    label: `${shift.label} (${shift.time})`,
    category: shift.category,
    icon: shift.icon
  }))
]

export const STANDARD_SHIFTS = SHIFT_DEFINITIONS.map(shift => ({
  v: shift.id,
  label: shift.label,
  desc: shift.time,
  icon: shift.icon
}))

export const getShiftLabel = (value) => {
  const shift = SHIFT_DEFINITIONS.find(item => item.id === value)
  if (shift) return `${shift.label} (${shift.time})`

  const legacy = {
    morning: 'ช่วงเช้า (08:00 - 12:00 น.)',
    afternoon: 'ช่วงบ่าย (13:00 - 17:00 น.)',
    evening: 'ช่วงเย็น (17:00 - 20:00 น.)',
    fullday: 'ทั้งวัน (08:00 - 20:00 น.)',
    flexible: 'เวลายืดหยุ่น (ตามตกลง)'
  }
  return legacy[value] || value || '-'
}

// รหัสเวรมาตรฐานตามโรงพยาบาล (เช่น รพ.นครพิงค์) พร้อมความหมายและการเชื่อมโยงกับ Home Care
export const HOSPITAL_SHIFT_TYPES = {
  X: {
    code: 'X',
    name: 'วันหยุด (Off)',
    time: 'ไม่มีเวร รพ.',
    homeCareStatus: 'AVAILABLE_ALL_DAY',
    homeCareLabel: 'ว่างทั้งวัน',
    homeCareDesc: 'รับงาน Home Care ได้ตลอดทั้งวัน (เช้า / บ่าย / 12 ชม.)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    indicatorClass: 'bg-emerald-500',
    icon: 'check_circle'
  },
  'ช': {
    code: 'ช',
    name: 'เวรเช้า รพ.',
    time: '08:00 – 16:00 น.',
    homeCareStatus: 'AVAILABLE_EVENING',
    homeCareLabel: 'ว่างช่วงเย็น',
    homeCareDesc: 'รับงาน Home Care ได้ช่วงเย็น (หลัง 16:30 น. หรือเวรบ่าย 16:00-24:00 น.)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    indicatorClass: 'bg-amber-500',
    icon: 'wb_sunny'
  },
  'บ': {
    code: 'บ',
    name: 'เวรบ่าย รพ.',
    time: '16:00 – 24:00 น.',
    homeCareStatus: 'AVAILABLE_MORNING',
    homeCareLabel: 'ว่างช่วงเช้า',
    homeCareDesc: 'รับงาน Home Care ได้ช่วงเช้า (08:00 – 15:00 น.)',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    indicatorClass: 'bg-sky-500',
    icon: 'wb_twilight'
  },
  'ด': {
    code: 'ด',
    name: 'เวรดึก รพ.',
    time: '24:00 – 08:00 น.',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'ติดเวรดึก (ไม่รับงาน)',
    homeCareDesc: 'ออกเวรเช้า ต้องนอนพักผ่อน ปิดรับงานเพื่อความปลอดภัย',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    indicatorClass: 'bg-purple-500',
    icon: 'bedtime'
  },
  'ช/บ': {
    code: 'ช/บ',
    name: 'ควบเช้า-บ่าย (16 ชม.)',
    time: '08:00 – 24:00 น.',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'ควบ ช/บ (ไม่รับงาน)',
    homeCareDesc: 'ปฏิบัติงานควบเวร 16 ชม. ต่อเนื่อง ปิดรับงานเพื่อพักผ่อน',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-500',
    icon: 'block'
  },
  'ชด': {
    code: 'ชด',
    name: 'ควบเช้า-ดึก',
    time: '08:00–16:00 & 24:00–08:00 น.',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'ควบ ชด (ไม่รับงาน)',
    homeCareDesc: 'ปฏิบัติงานเวรเช้าและดึก ปิดรับงานทั้งวัน',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-500',
    icon: 'block'
  },
  'ด/บ': {
    code: 'ด/บ',
    name: 'ควบดึก-บ่าย',
    time: '24:00–08:00 & 16:00–24:00 น.',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'ควบ ด/บ (ไม่รับงาน)',
    homeCareDesc: 'ปฏิบัติงานเวรดึกและเวรบ่าย ปิดรับงานทั้งวัน',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-500',
    icon: 'block'
  },
  'ชด/บ': {
    code: 'ชด/บ',
    name: 'ควบ 3 กะ / เวรยาว',
    time: 'เวรยาวพิเศษ',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'ควบยาว (ไม่รับงาน)',
    homeCareDesc: 'ปฏิบัติงานเวรยาวต่อเนื่อง ปิดรับงานทั้งวัน',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-500',
    icon: 'block'
  },
  'หยุด': {
    code: 'หยุด',
    name: 'วันหยุดส่วนตัว (ไม่รับงาน)',
    time: 'ปิดรับงานทั้งวัน',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: 'หยุดส่วนตัว (ไม่รับงาน)',
    homeCareDesc: 'ต้องการหยุดพักผ่อนส่วนตัว ปิดรับงานดูแลผู้ป่วยทุกเคสในวันนี้',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    indicatorClass: 'bg-rose-500',
    icon: 'event_busy'
  },
  'พ': {
    code: 'พ',
    name: 'ลาพักผ่อน',
    time: 'ลาพักผ่อนประจำปี',
    homeCareStatus: 'AVAILABLE_ALL_DAY',
    homeCareLabel: 'ว่างทั้งวัน',
    homeCareDesc: 'วันลาพักผ่อน ว่างรับงาน Home Care ได้เต็มวัน',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
    indicatorClass: 'bg-teal-500',
    icon: 'beach_access'
  },
  'ป': {
    code: 'ป',
    name: 'ประชุม / อบรม',
    time: '08:30 – 16:30 น.',
    homeCareStatus: 'AVAILABLE_EVENING',
    homeCareLabel: 'ว่างช่วงเย็น',
    homeCareDesc: 'เสร็จอบรม ว่างรับเคสช่วงเย็นหลัง 17:00 น.',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    indicatorClass: 'bg-indigo-500',
    icon: 'school'
  }
}

// ฟังก์ชันแปลงโค้ดเวรให้มีข้อมูลความพร้อมเสมอ (รองรับโค้ดควบเวรใดๆ ในใบเวร รพ.)
export function getShiftDef(code) {
  if (!code) return null
  if (HOSPITAL_SHIFT_TYPES[code]) return HOSPITAL_SHIFT_TYPES[code]

  // ถ้ารหัสมีเครื่องหมาย / หรือ ชด หรือ ดด แสดงว่าเป็นเวรควบ
  if (code.includes('/') || code === 'ชด' || code.startsWith('ดด') || code.length >= 2) {
    return {
      code,
      name: `ควบเวร (${code})`,
      time: 'ควบสองเวร รพ.',
      homeCareStatus: 'UNAVAILABLE',
      homeCareLabel: `ควบ ${code} (ไม่รับงาน)`,
      homeCareDesc: 'ปฏิบัติงานควบเวรต่อเนื่อง ปิดรับงานเพื่อความปลอดภัย',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
      indicatorClass: 'bg-rose-500',
      icon: 'block'
    }
  }

  return {
    code,
    name: `กะ ${code}`,
    time: 'ระบุในใบเวร',
    homeCareStatus: 'UNAVAILABLE',
    homeCareLabel: `${code} (ไม่รับงาน)`,
    homeCareDesc: 'ไม่พร้อมรับงานในกะนี้',
    badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
    indicatorClass: 'bg-gray-500',
    icon: 'info'
  }
}

// ข้อความอธิบายเวรแบบเต็มสำหรับตัวเลือก Dropdown
export function getShiftOptionFullLabel(code, st) {
  if (!st && HOSPITAL_SHIFT_TYPES[code]) st = HOSPITAL_SHIFT_TYPES[code]
  if (code === 'X') return 'X - วันหยุด (Off / ว่างทั้งวัน)'
  if (code === 'พ') return 'พ - ลาพักผ่อน (ว่างทั้งวัน)'
  if (code === 'หยุด') return 'หยุด - วันหยุดส่วนตัว (ไม่รับงาน)'
  if (code === 'ช') return 'ช - เวรเช้า รพ. (08:00 – 16:00 น.)'
  if (code === 'บ') return 'บ - เวรบ่าย รพ. (16:00 – 24:00 น.)'
  if (code === 'ด') return 'ด - เวรดึก รพ. (24:00 – 08:00 น.)'
  if (code === 'ช/บ') return 'ช/บ - ควบเช้า-บ่าย 16 ชม. (08:00 – 24:00 น.)'
  if (code === 'ชด') return 'ชด - ควบเช้า-ดึก (08:00–16:00 & 24:00–08:00 น.)'
  if (code === 'ด/บ') return 'ด/บ - ควบดึก-บ่าย (24:00–08:00 & 16:00–24:00 น.)'
  if (code === 'ชด/บ') return 'ชด/บ - ควบยาว 3 กะ (เวรยาวพิเศษ)'
  if (code === 'ป') return 'ป - ประชุม / อบรม (08:30 – 16:30 น.)'
  if (st) return `${code} - ${st.name} ${st.time ? `(${st.time})` : ''}`.trim()
  return code
}
