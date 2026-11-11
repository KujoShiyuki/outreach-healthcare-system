// ฟังก์ชันตรวจสอบและแจ้งเตือนความขัดแย้งของตารางเวร (Shift Overlap & Conflict Detection)
// ครอบคลุม:
// 1. ตารางเวรโรงพยาบาล (Hospital Code) ชนกับคิวงานดูแลผู้ป่วย (Appointments)
// 2. คิวงานดูแลผู้ป่วยชนกันเองในวันเดียวกัน (Appointment vs Appointment Overlap)
// 3. กะเวรแบบฟรีแลนซ์ (Freelance Shifts) ที่มีช่วงเวลาทับซ้อนกัน

import { getShiftDef, HOSPITAL_SHIFT_TYPES, SHIFT_DEFINITIONS } from '../data/shiftDefinitions.js'

/**
 * แปลงรหัสกะเวลาให้เป็นข้อความช่วงเวลาที่อ่านง่ายและกระชับ สำหรับแสดงในช่องปฏิทิน
 * เช่น "morning_8h" -> "08:00–16:00"
 */
export function formatAppointmentTime(timeSlot = '') {
  if (!timeSlot) return ''
  const slot = String(timeSlot).trim()
  const map = {
    morning_8h: '08:00–16:00',
    afternoon_8h: '16:00–24:00',
    night_8h: '24:00–08:00',
    day_12h: '08:00–20:00',
    night_12h: '20:00–08:00',
    morning: '08:00–12:00',
    afternoon: '13:00–17:00',
    evening: '17:00–20:00',
    fullday: '08:00–20:00',
    flexible: 'ตามตกลง'
  }
  if (map[slot]) return map[slot]
  return slot.replace(/\s*น\.?$/, '').replace(/\s*-\s*/, '–')
}

/**
 * แปลงรหัสกะเวลาเป็นชื่อเต็มภาษาไทยพร้อมระบุเวลา สำหรับ Modal และ Tooltip
 */
export function getAppointmentTimeFull(timeSlot = '') {
  if (!timeSlot) return '-'
  const slot = String(timeSlot).trim()
  const map = {
    morning_8h: 'เวรเช้า 8 ชม. (08:00 – 16:00 น.)',
    afternoon_8h: 'เวรบ่าย 8 ชม. (16:00 – 24:00 น.)',
    night_8h: 'เวรดึก 8 ชม. (24:00 – 08:00 น.)',
    day_12h: 'กะกลางวัน 12 ชม. (08:00 – 20:00 น.)',
    night_12h: 'กะกลางคืน 12 ชม. (20:00 – 08:00 น.)',
    morning: 'ช่วงเช้า (08:00 – 12:00 น.)',
    afternoon: 'ช่วงบ่าย (13:00 – 17:00 น.)',
    evening: 'ช่วงเย็น (17:00 – 20:00 น.)',
    fullday: 'ทั้งวัน (08:00 – 20:00 น.)',
    flexible: 'เวลายืดหยุ่น (ตามตกลง)'
  }
  return map[slot] || slot
}

/**
 * วิเคราะห์ว่า time_slot เป็นช่วงเวลาเช้า/กลางวันหรือไม่
 */
export function isMorningSlot(slot = '') {
  if (!slot) return false
  const s = String(slot).toLowerCase()
  return (
    s === 'morning_8h' ||
    s === 'day_12h' ||
    s === 'morning' ||
    s === 'fullday' ||
    s.includes('เช้า') ||
    s.includes('morning') ||
    s.includes('08:') ||
    s.includes('08.') ||
    s.includes('09:') ||
    s.includes('09.') ||
    s.includes('10:') ||
    s.includes('10.') ||
    s.includes('11:') ||
    s.includes('11.') ||
    s.includes('12:') ||
    s.includes('12.') ||
    s.includes('13:') ||
    s.includes('14:') ||
    s.includes('15:')
  )
}

/**
 * วิเคราะห์ว่า time_slot เป็นช่วงเวลาบ่าย/เย็นหรือไม่
 */
export function isAfternoonEveningSlot(slot = '') {
  if (!slot) return false
  const s = String(slot).toLowerCase()
  return (
    s === 'afternoon_8h' ||
    s === 'night_12h' ||
    s === 'day_12h' ||
    s === 'afternoon' ||
    s === 'evening' ||
    s === 'fullday' ||
    s.includes('บ่าย') ||
    s.includes('เย็น') ||
    s.includes('afternoon') ||
    s.includes('evening') ||
    s.includes('16:') ||
    s.includes('16.') ||
    s.includes('17:') ||
    s.includes('17.') ||
    s.includes('18:') ||
    s.includes('18.') ||
    s.includes('19:') ||
    s.includes('19.') ||
    s.includes('20:') ||
    s.includes('20.') ||
    s.includes('21:') ||
    s.includes('22:') ||
    s.includes('23:')
  )
}

/**
 * วิเคราะห์ว่าเป็นคิวงานแบบเต็มวัน หรือเหมาจ่ายรายเดือนหรือไม่
 */
export function isFullDayOrMonthly(apt = {}) {
  const slot = String(apt.time_slot || '').toLowerCase()
  const subType = String(apt.subscription_type || '').toLowerCase()
  const pkgName = String(apt.package_name || '').toLowerCase()
  const pkgSub = String(apt.service_package?.subscriptionType || '').toLowerCase()

  return (
    apt.is_monthly ||
    subType === 'monthly' ||
    pkgSub === 'monthly' ||
    pkgName.includes('รายเดือน') ||
    slot === 'day_12h' ||
    slot === 'fullday' ||
    slot.includes('ทั้งวัน') ||
    slot.includes('12 ชม.')
  )
}

/**
 * ตรวจสอบว่ารหัสเวร รพ. (Hospital Shift Code) ทับซ้อนกับคิวงานที่รับไว้แล้วหรือไม่
 * @param {string} shiftCode - รหัสเวร รพ. เช่น 'ช', 'บ', 'ด', 'ช/บ', 'หยุด', 'X', 'พ', 'ป'
 * @param {object} appointment - ข้อมูลนัดหมายผู้ป่วย
 * @returns {{ hasConflict: boolean, reason: string, severity: 'error' | 'warning' }}
 */
export function checkHospitalShiftConflict(shiftCode, appointment) {
  if (!shiftCode || !appointment) {
    return { hasConflict: false, reason: '', severity: 'none' }
  }

  const code = String(shiftCode).trim()
  const slot = appointment.time_slot || ''
  const patient = appointment.patient_name || 'ผู้ป่วย'

  // 1. วันหยุด รพ. (X) หรือลาพักผ่อน (พ) -> ว่างรับงาน Home Care ได้ตลอดทั้งวัน
  if (code === 'X' || code === 'พ') {
    return { hasConflict: false, reason: '', severity: 'none' }
  }

  // 2. วันหยุดส่วนตัว (หยุด) -> พยาบาลตั้งใจปิดรับงาน แต่มีคิวงานที่รับไว้แล้ว
  if (code === 'หยุด') {
    return {
      hasConflict: true,
      reason: `ตั้งเป็นวันหยุดส่วนตัว (ไม่รับงาน) แต่มีคิวงานของ "${patient}" (${slot || 'ไม่ระบุกะ'})`,
      severity: 'error'
    }
  }

  // 3. เวรดึก รพ. (ด: 24:00 - 08:00 น.) -> ออกเวรเช้า ต้องนอนพักผ่อน ปิดรับงานทุกเคส
  if (code === 'ด') {
    return {
      hasConflict: true,
      reason: `ติดเวรดึก รพ. (24:00–08:00 น.) ต้องนอนพักผ่อน ปิดรับงาน Home Care ชนกับคิวงานของ "${patient}" (${slot || 'ไม่ระบุกะ'})`,
      severity: 'error'
    }
  }

  // 4. เวรควบสองเวร / เวรยาว 16 ชม. ขึ้นไป (ช/บ, ชด, ด/บ, ชด/บ, หรือรหัสควบใดๆ)
  if (code.includes('/') || code.includes('ควบ') || code === 'ชด' || code.startsWith('ดด') || code.length > 2) {
    return {
      hasConflict: true,
      reason: `ปฏิบัติงานเวรควบ รพ. [${code}] (16 ชม. ขึ้นไป) ไม่สามารถรับงาน Home Care ได้ ชนกับคิวงานของ "${patient}" (${slot || 'ไม่ระบุกะ'})`,
      severity: 'error'
    }
  }

  // 5. เวรเช้า รพ. (ช: 08:00 - 16:00 น.) หรือ ประชุม/อบรม (ป: 08:30 - 16:30 น.)
  if (code === 'ช' || code === 'ป') {
    const shiftLabel = code === 'ป' ? 'ประชุม/อบรม (08:30–16:30 น.)' : 'เวรเช้า รพ. (08:00–16:00 น.)'
    if (isFullDayOrMonthly(appointment)) {
      return {
        hasConflict: true,
        reason: `ติด${shiftLabel} ทับซ้อนกับคิวงานดูแลเต็มวัน/เหมาจ่ายของ "${patient}" (${slot || 'เต็มวัน'})`,
        severity: 'error'
      }
    }
    if (isMorningSlot(slot)) {
      return {
        hasConflict: true,
        reason: `ติด${shiftLabel} ทับซ้อนกับคิวงานช่วงเช้าของ "${patient}" (${slot})`,
        severity: 'error'
      }
    }
    // หากคิวงานเป็นช่วงบ่าย/เย็น (หลัง 16.00 น.) ถือว่าว่างรับงานได้
    return { hasConflict: false, reason: '', severity: 'none' }
  }

  // 6. เวรบ่าย รพ. (บ: 16:00 - 24:00 น.)
  if (code === 'บ') {
    const shiftLabel = 'เวรบ่าย รพ. (16:00–24:00 น.)'
    if (isFullDayOrMonthly(appointment)) {
      return {
        hasConflict: true,
        reason: `ติด${shiftLabel} ทับซ้อนกับคิวงานดูแลเต็มวัน/เหมาจ่ายของ "${patient}" (${slot || 'เต็มวัน'})`,
        severity: 'error'
      }
    }
    if (isAfternoonEveningSlot(slot)) {
      return {
        hasConflict: true,
        reason: `ติด${shiftLabel} ทับซ้อนกับคิวงานช่วงบ่าย/เย็นของ "${patient}" (${slot})`,
        severity: 'error'
      }
    }
    // หากคิวงานเป็นช่วงเช้า (08.00 - 16.00 น.) ถือว่าว่างรับงานได้
    return { hasConflict: false, reason: '', severity: 'none' }
  }

  // 7. รหัสอื่นๆ ที่นิยามว่า UNAVAILABLE
  const def = getShiftDef(code)
  if (def && def.homeCareStatus === 'UNAVAILABLE') {
    return {
      hasConflict: true,
      reason: `กะเวร รพ. [${code}] ไม่อยู่ในสถานะพร้อมรับงาน ชนกับคิวงานของ "${patient}" (${slot || 'ไม่ระบุกะ'})`,
      severity: 'error'
    }
  }

  return { hasConflict: false, reason: '', severity: 'none' }
}

/**
 * ตรวจสอบความขัดแย้งระหว่างคิวงาน 2 รายการในวันเดียวกัน
 */
export function checkAppointmentsConflict(aptA, aptB) {
  if (!aptA || !aptB || aptA.id === aptB.id) {
    return { hasConflict: false, reason: '' }
  }

  const patientA = aptA.patient_name || 'ผู้ป่วย A'
  const patientB = aptB.patient_name || 'ผู้ป่วย B'
  const slotA = aptA.time_slot || ''
  const slotB = aptB.time_slot || ''

  // กรณีมีเคสเหมาจ่ายรายเดือนหรือเต็มวัน
  if (isFullDayOrMonthly(aptA) || isFullDayOrMonthly(aptB)) {
    return {
      hasConflict: true,
      reason: `คิวงานของ "${patientA}" (${slotA || 'เต็มวัน'}) ทับซ้อนกับคิวงานของ "${patientB}" (${slotB || 'เต็มวัน'})`
    }
  }

  // กรณีช่วงเวลา/กะเดียวกันตรงๆ
  if (slotA && slotB && slotA === slotB) {
    return {
      hasConflict: true,
      reason: `มีคิวงานของ "${patientA}" และ "${patientB}" ในช่วงกะเวลาเดียวกัน (${slotA})`
    }
  }

  // กรณีเช้าชนเช้า หรือบ่ายชนบ่าย
  const aMorning = isMorningSlot(slotA)
  const bMorning = isMorningSlot(slotB)
  if (aMorning && bMorning) {
    return {
      hasConflict: true,
      reason: `คิวงานช่วงเช้าของ "${patientA}" (${slotA}) ทับซ้อนกับคิวงานของ "${patientB}" (${slotB})`
    }
  }

  const aAfternoon = isAfternoonEveningSlot(slotA)
  const bAfternoon = isAfternoonEveningSlot(slotB)
  if (aAfternoon && bAfternoon) {
    return {
      hasConflict: true,
      reason: `คิวงานช่วงบ่าย/เย็นของ "${patientA}" (${slotA}) ทับซ้อนกับคิวงานของ "${patientB}" (${slotB})`
    }
  }

  return { hasConflict: false, reason: '' }
}

/**
 * ตรวจสอบความขัดแย้งทั้งหมดในวันที่ระบุ (ทั้งเวร รพ. vs คิวงาน และคิวงาน vs คิวงาน)
 * @param {string} dateStr - วันที่ รูปแบบ "YYYY-MM-DD"
 * @param {string} hospitalShiftCode - รหัสเวร รพ. ของวันนั้น
 * @param {Array} appointmentsOnDate - รายการนัดหมายในวันนั้น
 * @returns {Array} รายการความขัดแย้งในวันนั้น
 */
export function getDayConflicts(dateStr, hospitalShiftCode, appointmentsOnDate = []) {
  const conflicts = []

  // 1. ตรวจสอบเวร รพ. กับแต่ละคิวงาน
  if (hospitalShiftCode && appointmentsOnDate.length > 0) {
    appointmentsOnDate.forEach(apt => {
      const res = checkHospitalShiftConflict(hospitalShiftCode, apt)
      if (res.hasConflict) {
        conflicts.push({
          type: 'HOSPITAL_VS_APPOINTMENT',
          dateStr,
          hospitalShiftCode,
          appointment: apt,
          reason: res.reason,
          severity: res.severity
        })
      }
    })
  }

  // 2. ตรวจสอบคิวงานชนกันเอง
  if (appointmentsOnDate.length >= 2) {
    for (let i = 0; i < appointmentsOnDate.length; i++) {
      for (let j = i + 1; j < appointmentsOnDate.length; j++) {
        const res = checkAppointmentsConflict(appointmentsOnDate[i], appointmentsOnDate[j])
        if (res.hasConflict) {
          conflicts.push({
            type: 'APPOINTMENT_VS_APPOINTMENT',
            dateStr,
            appointmentA: appointmentsOnDate[i],
            appointmentB: appointmentsOnDate[j],
            reason: res.reason,
            severity: 'error'
          })
        }
      }
    }
  }

  return conflicts
}

/**
 * ตรวจสอบความขัดแย้งของทั้งเดือน
 * @param {number} year - ปี ค.ศ.
 * @param {number} month - เดือน 0 - 11
 * @param {object} monthHospitalSchedule - { "1": "X", "2": "ช", ... }
 * @param {object} appointmentsByDate - { "2026-11-01": [apt1, apt2], ... }
 * @returns {{ conflictCount: number, conflictsByDay: object, allConflicts: Array }}
 */
export function getMonthConflicts(year, month, monthHospitalSchedule = {}, appointmentsByDate = {}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const conflictsByDay = {}
  const allConflicts = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const shiftCode = monthHospitalSchedule[String(d)]
    const dayApts = appointmentsByDate[dateStr] || []

    const dayConflicts = getDayConflicts(dateStr, shiftCode, dayApts)
    if (dayConflicts.length > 0) {
      conflictsByDay[String(d)] = dayConflicts
      allConflicts.push(...dayConflicts)
    }
  }

  return {
    conflictCount: allConflicts.length,
    conflictsByDay,
    allConflicts
  }
}

/**
 * ตรวจสอบความขัดแย้งระหว่างกะเวรที่เลือกในรูปแบบ Freelance (schedule.shifts)
 * เช่น เลือกทั้ง day_12h (08.00-20.00) และ morning_8h (08.00-16.00)
 * @param {Array<string>} selectedShiftIds - รายการ id กะที่เลือก
 * @returns {Array<object>} รายการกะที่ทับซ้อนกัน
 */
export function checkFreelanceShiftsOverlap(selectedShiftIds = []) {
  if (!Array.isArray(selectedShiftIds) || selectedShiftIds.length < 2) {
    return []
  }

  const overlaps = []
  const has = (id) => selectedShiftIds.includes(id)

  // 1. กะกลางวัน 12 ชม. (day_12h: 08.00 - 20.00 น.)
  if (has('day_12h')) {
    if (has('morning_8h')) {
      overlaps.push({
        shiftA: 'day_12h',
        shiftB: 'morning_8h',
        nameA: 'กะกลางวัน 12 ชม.',
        nameB: 'เวรเช้า 8 ชม.',
        message: 'กะกลางวัน 12 ชม. (08.00 – 20.00 น.) มีช่วงเวลาทับซ้อนกับ เวรเช้า 8 ชม. (08.00 – 16.00 น.)'
      })
    }
    if (has('afternoon_8h')) {
      overlaps.push({
        shiftA: 'day_12h',
        shiftB: 'afternoon_8h',
        nameA: 'กะกลางวัน 12 ชม.',
        nameB: 'เวรบ่าย 8 ชม.',
        message: 'กะกลางวัน 12 ชม. (08.00 – 20.00 น.) มีช่วงเวลาทับซ้อนกับ เวรบ่าย 8 ชม. (16.00 – 24.00 น.) ในช่วง 16.00 – 20.00 น.'
      })
    }
  }

  // 2. กะกลางคืน 12 ชม. (night_12h: 20.00 - 08.00 น.)
  if (has('night_12h')) {
    if (has('afternoon_8h')) {
      overlaps.push({
        shiftA: 'night_12h',
        shiftB: 'afternoon_8h',
        nameA: 'กะกลางคืน 12 ชม.',
        nameB: 'เวรบ่าย 8 ชม.',
        message: 'กะกลางคืน 12 ชม. (20.00 – 08.00 น.) มีช่วงเวลาทับซ้อนกับ เวรบ่าย 8 ชม. (16.00 – 24.00 น.) ในช่วง 20.00 – 24.00 น.'
      })
    }
    if (has('night_8h')) {
      overlaps.push({
        shiftA: 'night_12h',
        shiftB: 'night_8h',
        nameA: 'กะกลางคืน 12 ชม.',
        nameB: 'เวรดึก 8 ชม.',
        message: 'กะกลางคืน 12 ชม. (20.00 – 08.00 น.) มีช่วงเวลาทับซ้อนกับ เวรดึก 8 ชม. (24.00 – 08.00 น.)'
      })
    }
  }

  // 3. กะ 12 ชม. ทั้งกลางวันและกลางคืนรวมกัน = 24 ชม.
  if (has('day_12h') && has('night_12h')) {
    overlaps.push({
      shiftA: 'day_12h',
      shiftB: 'night_12h',
      nameA: 'กะกลางวัน 12 ชม.',
      nameB: 'กะกลางคืน 12 ชม.',
      message: 'เลือกทั้งกะกลางวันและกะกลางคืน 12 ชม. (ครอบคลุม 24 ชม. ต่อเนื่อง) ควรระมัดระวังการรับเคสต่อเนื่องที่อาจพักผ่อนไม่เพียงพอ'
    })
  }

  return overlaps
}
