import React, { useState, useMemo } from 'react'
import {
  getDayConflicts,
  getMonthConflicts,
  formatAppointmentTime,
  getAppointmentTimeFull
} from '../../utils/shiftConflictHelper.js'

// รหัสเวรมาตรฐานตามโรงพยาบาลและการเชื่อมโยงกับ Home Care (ย้ายไปยัง shiftDefinitions.js เพื่อให้โมดูลอื่นใช้งานได้)
export {
  HOSPITAL_SHIFT_TYPES,
  getShiftDef,
  getShiftOptionFullLabel
} from '../../data/shiftDefinitions.js'

import {
  HOSPITAL_SHIFT_TYPES,
  getShiftDef,
  getShiftOptionFullLabel
} from '../../data/shiftDefinitions.js'

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

const DAY_NAMES_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function NurseHospitalRosterCalendar({
  isEditing = false,
  hospitalSchedule = {}, // { "2026-10": { "1": "X", "2": "ช", ... } }
  onChangeSchedule = () => {},
  appointments = [], // [ { id, start_date, patient_name, time_slot, status, service_address, ... } ]
}) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0 - 11

  // Selected date สำหรับดูรายละเอียดใน modal
  const [selectedDayDetail, setSelectedDayDetail] = useState(null)

  // Modal แจ้งเตือนเมื่อมีการลงเวรทับซ้อนกันแบบ Real-time
  const [conflictConfirmModal, setConflictConfirmModal] = useState(null)

  // Modal แสดงรายการเวรที่ทับซ้อนกันทั้งหมดในเดือน
  const [showAllConflictsModal, setShowAllConflictsModal] = useState(false)

  // คีย์ของเดือนปัจจุบัน เช่น "2026-10"
  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  // ข้อมูลเวรของเดือนปัจจุบัน
  const currentMonthData = useMemo(() => {
    return hospitalSchedule[monthKey] || {}
  }, [hospitalSchedule, monthKey])

  // คำนวณจำนวนวันในเดือน
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }, [currentYear, currentMonth])

  // วันแรกของเดือนตรงกับวันอะไรในสัปดาห์ (0 = อาทิตย์, 1 = จันทร์, ...)
  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay()
  }, [currentYear, currentMonth])

  // จัดกลุ่มคำขอนัดหมายตามวันที่จริง รองรับงานหลายวันและรายเดือน
  const appointmentsByDate = useMemo(() => {
    const map = {}
    const addAppointment = (date, appointment, occurrenceType = 'single') => {
      if (!date) return
      if (!map[date]) map[date] = []
      map[date].push({ ...appointment, occurrence_type: occurrenceType })
    }

    appointments.forEach((apt) => {
      if (!apt.start_date) return
      const start = apt.start_date.split('T')[0]
      const end = (apt.end_date || apt.start_date).split('T')[0]
      const storedDates = typeof apt.service_dates === 'string'
        ? apt.service_dates.split(',').map(value => value.trim()).filter(Boolean)
        : Array.isArray(apt.service_dates) ? apt.service_dates : []

      if (storedDates.length > 0) {
        storedDates.forEach(date => addAppointment(date, apt, 'scheduled'))
        return
      }

      const startDate = new Date(`${start}T00:00:00`)
      const endDate = new Date(`${end}T00:00:00`)
      if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime()) && endDate >= startDate) {
        const isMultiDay = end !== start
        const cursor = new Date(startDate)
        while (cursor <= endDate) {
          addAppointment(cursor.toISOString().split('T')[0], apt, isMultiDay ? 'range' : 'single')
          cursor.setDate(cursor.getDate() + 1)
        }
      }
    })
    return map
  }, [appointments])

  // ตรวจสอบความขัดแย้งของตารางเวร รพ. กับคิวงานดูแลผู้ป่วยประจำเดือนนี้
  const monthlyConflicts = useMemo(() => {
    return getMonthConflicts(currentYear, currentMonth, currentMonthData, appointmentsByDate)
  }, [currentYear, currentMonth, currentMonthData, appointmentsByDate])

  // เลื่อนเดือน
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  const handleResetToCurrentMonth = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
  }

  // อัปเดตกะของวันที่ระบุ (บันทึกจริง)
  const executeSetDayShift = (dayNum, code) => {
    const updatedMonthData = { ...currentMonthData }
    if (code) {
      updatedMonthData[String(dayNum)] = code
    } else {
      delete updatedMonthData[String(dayNum)]
    }
    onChangeSchedule({
      ...hospitalSchedule,
      [monthKey]: updatedMonthData
    })
  }

  // อัปเดตกะของวันที่ระบุ พร้อมระบบตรวจจับและแจ้งเตือนเวรทับซ้อน (Shift Conflict Detection)
  const handleSetDayShift = (dayNum, code, skipConfirm = false) => {
    if (!isEditing) return

    // ตรวจสอบว่ากะใหม่ที่จะลง ขัดแย้งกับคิวงานที่รับไว้แล้วหรือไม่
    if (!skipConfirm && code) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
      const dayApts = appointmentsByDate[dateStr] || []
      const conflicts = getDayConflicts(dateStr, code, dayApts)

      if (conflicts.length > 0) {
        // พบเวรชนกัน -> เปิด Modal แจ้งเตือนเพื่อให้พยาบาลตัดสินใจ
        setConflictConfirmModal({
          isPreset: false,
          dayNum,
          dateStr,
          code,
          shiftDef: getShiftDef(code),
          conflicts,
          onConfirm: () => {
            executeSetDayShift(dayNum, code)
            setConflictConfirmModal(null)
          },
          onCancel: () => {
            setConflictConfirmModal(null)
          }
        })
        return
      }
    }

    executeSetDayShift(dayNum, code)
  }

  // คลิกวันที่ในปฏิทิน -> เปิด Modal แสดงรายละเอียดคิวงานและเวรประจำวัน
  const handleDayClick = (dayNum) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
    const shiftCode = currentMonthData[String(dayNum)]
    const dayApts = appointmentsByDate[dateStr] || []
    setSelectedDayDetail({
      dayNum,
      dateStr,
      shiftCode,
      shiftDef: getShiftDef(shiftCode),
      appointments: dayApts
    })
  }

  // Presets จัดตารางด่วนทั้งเดือน พร้อมระบบตรวจจับและแจ้งเตือนเวรทับซ้อน
  const handleApplyPreset = (presetType, skipConfirm = false) => {
    if (!isEditing) return
    const updated = {}
    for (let d = 1; d <= daysInMonth; d++) {
      const dayOfWeek = new Date(currentYear, currentMonth, d).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      if (presetType === 'weekday_morning_weekend_off') {
        // จันทร์-ศุกร์ เวรเช้า (ช) / เสาร์-อาทิตย์ หยุด (X)
        updated[String(d)] = isWeekend ? 'X' : 'ช'
      } else if (presetType === 'all_off') {
        // ทุกวันหยุด (X) ว่างทั้งเดือน
        updated[String(d)] = 'X'
      } else if (presetType === 'all_morning') {
        // ทุกวันเวรเช้า (ช) ว่างช่วงเย็น
        updated[String(d)] = 'ช'
      } else if (presetType === 'clear') {
        // ล้างทั้งหมด
      }
    }

    // ตรวจสอบว่า Preset นี้จะทำให้เวรชนกับคิวงานที่รับไว้แล้วหรือไม่
    if (!skipConfirm && presetType !== 'clear') {
      const presetConflicts = []
      for (let d = 1; d <= daysInMonth; d++) {
        const newCode = updated[String(d)]
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const dayApts = appointmentsByDate[dateStr] || []
        if (newCode && dayApts.length > 0) {
          const cList = getDayConflicts(dateStr, newCode, dayApts)
          if (cList.length > 0) {
            presetConflicts.push({ dayNum: d, dateStr, code: newCode, conflicts: cList })
          }
        }
      }

      if (presetConflicts.length > 0) {
        const presetLabels = {
          weekday_morning_weekend_off: 'จ-ศ เวรเช้า (ช) / ส-อา หยุด (X)',
          all_off: 'ตั้งค่าทุกวันเป็นวันหยุด (X)',
          all_morning: 'ตั้งค่าทุกวันเป็นเวรเช้า (ช)'
        }
        setConflictConfirmModal({
          isPreset: true,
          presetTitle: presetLabels[presetType] || presetType,
          presetConflicts,
          onConfirm: () => {
            onChangeSchedule({
              ...hospitalSchedule,
              [monthKey]: updated
            })
            setConflictConfirmModal(null)
          },
          onCancel: () => {
            setConflictConfirmModal(null)
          }
        })
        return
      }
    }

    onChangeSchedule({
      ...hospitalSchedule,
      [monthKey]: updated
    })
  }

  // สรุปสถิติกะประจำเดือนนี้
  const monthlyStats = useMemo(() => {
    let offDays = 0
    let morningDays = 0
    let afternoonDays = 0
    let nightDays = 0
    let personalOffDays = 0
    let comboDays = 0
    let totalBooked = 0

    for (let d = 1; d <= daysInMonth; d++) {
      const code = currentMonthData[String(d)]
      if (!code) continue
      if (code === 'X' || code === 'พ') offDays++
      else if (code === 'ช') morningDays++
      else if (code === 'บ') afternoonDays++
      else if (code === 'ด') nightDays++
      else if (code === 'หยุด') personalOffDays++
      else comboDays++

      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      if (appointmentsByDate[dateStr]) {
        totalBooked += appointmentsByDate[dateStr].length
      }
    }

    return { offDays, morningDays, afternoonDays, nightDays, personalOffDays, comboDays, totalBooked }
  }, [currentMonthData, daysInMonth, appointmentsByDate, currentYear, currentMonth])

  return (
    <div className="space-y-4">

      {/* แถบหัวปฏิทิน: เลือกเดือน & ปุ่มเปลี่ยนเดือน */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA] border border-[#ced4da] p-3.5 rounded-[4px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#007BFF] text-white flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">calendar_month</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-on-surface">
                {MONTH_NAMES_TH[currentMonth]} {currentYear + 543} ({currentYear})
              </h3>
              <button
                type="button"
                onClick={handleResetToCurrentMonth}
                className="text-[11px] px-2 py-0.5 rounded-[4px] bg-white border border-[#ced4da] hover:bg-gray-100 text-tertiary font-semibold"
                title="กลับสู่เดือนปัจจุบัน"
              >
                เดือนปัจจุบัน
              </button>
            </div>
            <p className="text-xs text-tertiary mt-0.5">
              ตารางเวร รพ. ประจำเดือน และเวลาว่างรับงาน Home Care
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 border border-[#ced4da] rounded-[4px] bg-white hover:bg-gray-100 text-[#343A40] transition-all flex items-center justify-center"
            title="เดือนก่อนหน้า"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 border border-[#ced4da] rounded-[4px] bg-white hover:bg-gray-100 text-[#343A40] transition-all flex items-center justify-center"
            title="เดือนถัดไป"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>
        </div>
      </div>

      {/* แจ้งเตือนตารางเวรทับซ้อนกับคิวงาน (Conflict Alert Banner) */}
      {monthlyConflicts.conflictCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-rose-50 to-amber-50 border-2 border-rose-300 rounded-[6px] space-y-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <span className="material-symbols-outlined text-xl">crisis_alert</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-rose-950 flex items-center gap-1.5">
                  แจ้งเตือนตารางเวรทับซ้อนกัน! ({monthlyConflicts.conflictCount} รายการในเดือนนี้)
                </h4>
                <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                  พบการลงเวร รพ. หรือวันหยุดส่วนตัวทับซ้อนกับคิวงานดูแลผู้ป่วยที่รับไว้แล้ว กรุณาคลิกเลือกวันที่ด้านล่างเพื่อปรับเปลี่ยนตารางเวร
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAllConflictsModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold rounded shadow-xs flex items-center gap-1 shrink-0 transition-all"
            >
              <span className="material-symbols-outlined text-sm">list_alt</span>
              ดูรายการที่ชนกันทั้งหมด ({monthlyConflicts.conflictCount})
            </button>
          </div>

          {/* รายการวันที่ทับซ้อนกันแบบปุ่มด่วน */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-rose-200/60">
            <span className="text-[11px] font-bold text-rose-900 shrink-0">วันที่ตรวจพบการชนกัน:</span>
            {Object.entries(monthlyConflicts.conflictsByDay).map(([dNum, cList]) => (
              <button
                key={dNum}
                type="button"
                onClick={() => handleDayClick(Number(dNum))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold shadow-xs transition-all"
                title={cList.map(c => c.reason).join('\n')}
              >
                <span className="material-symbols-outlined text-xs text-rose-600">warning</span>
                วันที่ {dNum}: {cList[0].hospitalShiftCode ? `[${cList[0].hospitalShiftCode}]` : ''} ชนคิวงาน
              </button>
            ))}
          </div>
        </div>
      )}

      {/* แถบตัวช่วยจัดตารางเวรในโหมด Edit (Presets ช่วยเติมทั้งเดือน) */}
      {isEditing && (
        <div className="bg-white border border-[#007BFF]/30 p-3 rounded-[4px] flex flex-wrap items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-[#007BFF] animate-pulse" />
            <span className="font-bold text-[#007BFF]">โหมดลงตารางเวร:</span>
            <span className="text-tertiary">เลือกกะเวรผ่าน Dropdown ในแต่ละช่องวัน หรือคลิกช่องวันเพื่อดูรายละเอียด</span>
          </div>

          {/* ปุ่มตัวช่วยเติมทั้งเดือน (Presets) */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-tertiary font-semibold flex items-center gap-1 text-[11px]">
              <span className="material-symbols-outlined text-sm text-[#007BFF]">auto_fix_high</span>
              ทางลัดช่วยเติม:
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset('weekday_morning_weekend_off')}
              className="px-2.5 py-1 bg-white border border-[#ced4da] hover:bg-[#007BFF]/10 hover:border-[#007BFF] hover:text-[#007BFF] rounded text-[11px] font-semibold text-tertiary transition-all"
            >
              จ-ศ เช้า (ช) / ส-อา หยุด (X)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all_off')}
              className="px-2.5 py-1 bg-white border border-[#ced4da] hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 rounded text-[11px] font-semibold text-tertiary transition-all"
            >
              ทุกวันเป็นวันหยุด (X)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('all_morning')}
              className="px-2.5 py-1 bg-white border border-[#ced4da] hover:bg-amber-50 hover:border-amber-500 hover:text-amber-700 rounded text-[11px] font-semibold text-tertiary transition-all"
            >
              ทุกวันเป็นเวรเช้า (ช)
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('clear')}
              className="px-2.5 py-1 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-[11px] font-semibold transition-all"
            >
              ล้างตารางเดือนนี้
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          ปฏิทินตารางเดือน (MONTH GRID CALENDAR)
         ======================================================== */}
      <div className="bg-white border border-[#ced4da] rounded-[4px] overflow-hidden shadow-xs">

        {/* แถวชื่อวันในสัปดาห์ (อา จ อ พ พฤ ศ ส) */}
        <div className="grid grid-cols-7 bg-[#F8F9FA] border-b border-[#ced4da] text-center font-bold text-xs py-2 text-on-surface">
          {DAY_NAMES_SHORT.map((name, idx) => (
            <div key={name} className={idx === 0 || idx === 6 ? 'text-rose-600' : 'text-tertiary'}>
              {name}
            </div>
          ))}
        </div>

        {/* ช่องตารางวัน 1 - 31 */}
        <div className="grid grid-cols-7 border-collapse">
          {/* ช่องว่างก่อนวันที่ 1 */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`blank-${idx}`} className="min-h-[115px] sm:min-h-[125px] bg-gray-50/60 border-b border-r border-[#ced4da]/50 p-1.5" />
          ))}

          {/* วันที่ 1 ถึงสิ้นเดือน */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((dayNum) => {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            const shiftCode = currentMonthData[String(dayNum)]
            const shiftDef = getShiftDef(shiftCode)
            const dayApts = appointmentsByDate[dateStr] || []
            const dayConflicts = monthlyConflicts.conflictsByDay[String(dayNum)] || []
            const hasConflict = dayConflicts.length > 0
            const dayOfWeek = new Date(currentYear, currentMonth, dayNum).getDay()
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

            return (
              <div
                key={dayNum}
                onClick={() => handleDayClick(dayNum)}
                className={`min-h-[115px] sm:min-h-[125px] h-auto border-b border-r p-1.5 flex flex-col justify-between transition-all select-none relative ${
                  hasConflict
                    ? 'border-rose-400 bg-rose-50/75 ring-2 ring-rose-400/80 shadow-xs'
                    : shiftDef?.homeCareStatus === 'AVAILABLE_ALL_DAY'
                    ? 'border-[#ced4da]/70 bg-emerald-50/20'
                    : 'border-[#ced4da]/70 bg-white'
                } ${
                  isEditing ? 'cursor-pointer hover:bg-blue-50/50 hover:border-[#007BFF]' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                {/* แถวบน: เลขวันที่ & รหัสเวร รพ. & แจ้งเตือนเวรชน */}
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      hasConflict ? 'bg-rose-600 text-white shadow-xs' : isWeekend ? 'text-rose-600' : 'text-on-surface'
                    }`}>
                      {dayNum}
                    </span>
                    {hasConflict && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white animate-pulse shadow-xs"
                        title={`⚠️ ตารางเวรทับซ้อนกัน:\n${dayConflicts.map(c => c.reason).join('\n')}`}
                      >
                        <span className="material-symbols-outlined text-[10px]">warning</span>
                        <span className="hidden sm:inline">เวรชน</span>
                      </span>
                    )}
                  </div>

                  {/* รหัสเวร รพ. เลือกได้โดยตรงภายในช่องวัน */}
                  {isEditing ? (
                    <select
                      value={shiftCode || ''}
                      onChange={(event) => handleSetDayShift(dayNum, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      className={`w-16 sm:w-20 text-[10px] font-bold rounded px-0.5 py-0.5 truncate cursor-pointer focus:outline-none focus:ring-1 ${
                        hasConflict
                          ? 'bg-rose-100 border-2 border-rose-500 text-rose-900 focus:ring-rose-500'
                          : 'bg-white border border-[#007BFF] hover:border-[#0056b3] focus:ring-[#007BFF]'
                      }`}
                      aria-label={`เลือกเวรวันที่ ${dayNum}`}
                      title={shiftDef ? getShiftOptionFullLabel(shiftCode, shiftDef) : 'เลือกกะเวร'}
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {Object.entries(HOSPITAL_SHIFT_TYPES).map(([code, st]) => (
                        <option key={code} value={code}>
                          {getShiftOptionFullLabel(code, st)}
                        </option>
                      ))}
                    </select>
                  ) : shiftDef ? (
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-[2px] border ${shiftDef.badgeClass}`} title={`${shiftDef.name}: ${shiftDef.time}`}>
                      {shiftDef.code}
                    </span>
                  ) : <span className="text-[10px] text-gray-300 font-mono">-</span>}
                </div>

                {/* ตรงกลาง: สถานะความพร้อมรับงาน Home Care หรือแจ้งเตือนเวรชน */}
                <div className="my-0.5">
                  {hasConflict ? (
                    <div
                      className="bg-rose-100/90 text-rose-800 border border-rose-300 px-1 py-0.5 rounded-[2px] text-[10px] font-bold flex items-center gap-0.5 truncate"
                      title={dayConflicts.map(c => c.reason).join('\n')}
                    >
                      <span className="material-symbols-outlined text-[11px] text-rose-600 shrink-0">error</span>
                      <span className="truncate">เวลาทับซ้อนกัน!</span>
                    </div>
                  ) : shiftDef ? (
                    <div className="space-y-0.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1 py-0.5 rounded-[2px] w-full truncate ${
                        shiftDef.homeCareStatus === 'AVAILABLE_ALL_DAY'
                          ? 'bg-emerald-100/90 text-emerald-800'
                          : shiftDef.homeCareStatus === 'AVAILABLE_EVENING'
                          ? 'bg-amber-100/90 text-amber-800'
                          : shiftDef.homeCareStatus === 'AVAILABLE_MORNING'
                          ? 'bg-sky-100/90 text-sky-800'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${shiftDef.indicatorClass} shrink-0`} />
                        <span className="truncate">{shiftDef.homeCareLabel}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 italic text-center">
                      {isEditing ? 'คลิกเลือกกะ' : 'ไม่ระบุ'}
                    </div>
                  )}
                </div>

                {/* ด้านล่าง: คิวงานนัดหมายที่มีคนไข้จอง (Appointments) พร้อมเวลา */}
                <div className="mt-1 space-y-1">
                  {dayApts.length > 0 ? (
                    dayApts.slice(0, 1).map((apt) => {
                      const timeText = formatAppointmentTime(apt.time_slot)
                      return (
                        <div
                          key={apt.id || 0}
                          className={`${
                            hasConflict
                              ? 'bg-rose-600 border border-rose-700 ring-1 ring-rose-400'
                              : apt.subscription_type === 'Monthly' || apt.occurrence_type === 'range'
                              ? 'bg-emerald-600'
                              : 'bg-[#007BFF]'
                          } text-white px-1.5 py-1 rounded-[3px] text-[10px] shadow-xs flex flex-col gap-0.5 leading-tight`}
                          title={`${getAppointmentTimeFull(apt.time_slot)}\nผู้ป่วย: ${apt.patient_name}${dayApts.length > 1 ? `\n(และอีก ${dayApts.length - 1} เคส)` : ''}`}
                        >
                          {/* บรรทัดเวลา */}
                          <div className="flex items-center justify-between font-bold text-[9px] text-white/95">
                            <span className="flex items-center gap-0.5 truncate">
                              <span className="material-symbols-outlined text-[11px] shrink-0">schedule</span>
                              <span className="font-mono tracking-tight truncate">{timeText || 'ตามเวลานัด'}</span>
                            </span>
                            {dayApts.length > 1 && (
                              <span className="text-[9px] bg-black/20 text-white font-bold px-1 rounded-full shrink-0 ml-1">
                                +{dayApts.length - 1}
                              </span>
                            )}
                          </div>
                          {/* บรรทัดชื่อผู้ป่วย */}
                          <div className="truncate flex items-center gap-0.5 font-medium text-[10px]">
                            <span className="material-symbols-outlined text-[11px] shrink-0">person</span>
                            <span className="truncate">{apt.patient_name}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="h-0.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ========================================================
          คำอธิบายสัญลักษณ์ (LEGEND) & สรุปประจำเดือน
         ======================================================== */}
      <div className="bg-[#F8F9FA] border border-[#ced4da] p-3.5 rounded-[4px] space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ced4da]/70 pb-2">
          <span className="font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[#007BFF]">info</span>
            คำอธิบายรหัสเวรโรงพยาบาล และความพร้อมรับงาน Home Care:
          </span>
          <span className="text-tertiary text-[11px]">
            อ้างอิงตามมาตรฐานเวร รพ. (เช่น หอผู้ป่วย รพ.นครพิงค์)
          </span>
        </div>

        {/* แถบสัญลักษณ์ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {['X', 'ช', 'บ', 'ด', 'ช/บ', 'หยุด'].map(code => {
            const st = HOSPITAL_SHIFT_TYPES[code]
            return (
              <div key={st.code} className="flex items-center gap-1.5">
                <span className={`w-6 h-5 rounded-[2px] font-bold text-xs flex items-center justify-center border shrink-0 ${st.badgeClass}`}>
                  {st.code}
                </span>
                <div className="truncate">
                  <span className="font-semibold text-on-surface">{st.name}: </span>
                  <span className="text-tertiary">{st.homeCareLabel}</span>
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-5 rounded-[2px] font-bold text-xs flex items-center justify-center bg-[#007BFF] text-white shrink-0">
              <span className="material-symbols-outlined text-xs">schedule</span>
            </span>
            <div className="truncate">
              <span className="font-semibold text-[#007BFF]">คิวงานที่รับแล้ว (แสดงเวลานัด)</span>
            </div>
          </div>
        </div>

        {/* แถบสรุปสถิติประจำเดือน */}
        <div className="pt-2 border-t border-[#ced4da]/70 flex flex-wrap items-center justify-between gap-3 text-tertiary">
          <div className="flex flex-wrap items-center gap-3 font-semibold">
            <span>วันหยุด รพ. (X/พ): <strong className="text-emerald-700">{monthlyStats.offDays}</strong> วัน</span>
            <span>เวรเช้า (ช): <strong className="text-amber-700">{monthlyStats.morningDays}</strong> วัน</span>
            <span>เวรบ่าย (บ): <strong className="text-sky-700">{monthlyStats.afternoonDays}</strong> วัน</span>
            <span>เวรดึก (ด): <strong className="text-purple-700">{monthlyStats.nightDays}</strong> วัน</span>
            <span>เวรควบ (ช/บ, ชด, ด/บ): <strong className="text-rose-700">{monthlyStats.comboDays}</strong> วัน</span>
            <span>หยุดส่วนตัว: <strong className="text-rose-700">{monthlyStats.personalOffDays}</strong> วัน</span>
            <span>คิวงานนัดหมาย: <strong className="text-[#007BFF]">{monthlyStats.totalBooked}</strong> เคส</span>
            {monthlyConflicts.conflictCount > 0 && (
              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-300 font-bold flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-xs text-rose-600">warning</span>
                เวรทับซ้อนคิวงาน: <strong className="text-rose-700">{monthlyConflicts.conflictCount}</strong> รายการ
              </span>
            )}
          </div>
          {isEditing && (
            <span className="text-[11px] text-[#007BFF] font-semibold">
              💡 คลิกที่วันที่ในปฏิทินเพื่อเปลี่ยนกะได้ตลอดเวลา (ระบบจะเตือนหากเวรชนกัน)
            </span>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL: รายละเอียดวันที่คลิก (สำหรับโหมดดูข้อมูล)
         ======================================================== */}
      {selectedDayDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[4px] border border-[#ced4da] max-w-md w-full p-5 space-y-4 shadow-lg animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#ced4da] pb-3">
              <div>
                <h4 className="font-bold text-base text-on-surface">
                  รายละเอียดวันที่ {selectedDayDetail.dayNum} {MONTH_NAMES_TH[currentMonth]} {currentYear + 543}
                </h4>
                <p className="text-xs text-tertiary mt-0.5 font-mono">{selectedDayDetail.dateStr}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-[4px]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* แสดงแจ้งเตือนกรณีมีเวรทับซ้อนกันในวันนี้ */}
            {(() => {
              const detailConflicts = getDayConflicts(
                selectedDayDetail.dateStr,
                selectedDayDetail.shiftCode,
                selectedDayDetail.appointments
              )
              if (detailConflicts.length === 0) return null
              return (
                <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-[4px] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                    <span className="material-symbols-outlined text-base text-rose-600">crisis_alert</span>
                    ตรวจพบการลงตารางเวรทับซ้อนกันในวันนี้ ({detailConflicts.length} รายการ):
                  </div>
                  <div className="space-y-1.5">
                    {detailConflicts.map((c, idx) => (
                      <div key={idx} className="p-2 bg-white rounded border border-rose-200 text-xs text-rose-800 leading-relaxed shadow-xs">
                        ⚠️ {c.reason}
                      </div>
                    ))}
                  </div>
                  {isEditing && (
                    <div className="pt-1 flex flex-wrap gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          executeSetDayShift(selectedDayDetail.dayNum, 'X')
                          setSelectedDayDetail(prev => ({
                            ...prev,
                            shiftCode: 'X',
                            shiftDef: getShiftDef('X')
                          }))
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        แก้เป็นวันหยุด รพ. (X: ว่างทั้งวัน)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          executeSetDayShift(selectedDayDetail.dayNum, null)
                          setSelectedDayDetail(prev => ({
                            ...prev,
                            shiftCode: null,
                            shiftDef: null
                          }))
                        }}
                        className="px-2.5 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-bold shadow-xs transition-all"
                      >
                        ล้างเวรวันนี้
                      </button>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ข้อมูลเวร รพ. */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-tertiary block">ตารางเวรโรงพยาบาล:</span>
              {selectedDayDetail.shiftDef ? (
                <div className={`p-3 rounded-[4px] border flex items-center justify-between ${selectedDayDetail.shiftDef.badgeClass}`}>
                  <div>
                    <span className="font-bold text-sm block">
                      [{selectedDayDetail.shiftDef.code}] {selectedDayDetail.shiftDef.name}
                    </span>
                    <span className="text-xs block mt-0.5">⏱ เวลาเวร: {selectedDayDetail.shiftDef.time}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-[4px] bg-white border border-current shadow-xs">
                    {selectedDayDetail.shiftDef.homeCareLabel}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-tertiary italic bg-gray-50 p-2.5 rounded-[4px]">
                  ไม่ได้ระบุกะเวร รพ. สำหรับวันนี้
                </p>
              )}
            </div>

            {/* ข้อมูลคิวงานผู้ป่วย (Appointments) */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-tertiary block">
                คิวงานดูแลผู้ป่วยในวันนี้ ({selectedDayDetail.appointments.length} เคส):
              </span>
              {selectedDayDetail.appointments.length === 0 ? (
                <p className="text-xs text-tertiary italic bg-gray-50 p-2.5 rounded-[4px]">
                  ไม่มีคิวงานดูแลผู้ป่วยในวันนี้
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedDayDetail.appointments.map((apt) => (
                    <div key={apt.id} className="p-3 bg-[#007BFF]/5 border border-[#007BFF]/30 rounded-[4px] space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-[#007BFF]">{apt.patient_name}</span>
                        <span className="text-xs bg-white text-[#28A745] border border-[#28A745]/30 px-2 py-0.5 rounded-[4px] font-semibold">
                          {apt.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-on-surface">
                        <span className="material-symbols-outlined text-sm text-[#007BFF]">schedule</span>
                        <span>เวลา/กะ: <strong className="text-[#007BFF] font-semibold">{getAppointmentTimeFull(apt.time_slot)}</strong></span>
                      </div>
                      {apt.service_address && (
                        <p className="text-xs text-tertiary truncate">📍 สถานที่: {apt.service_address}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#ced4da] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayDetail(null)}
                className="px-4 py-2 bg-white border border-[#ced4da] hover:bg-gray-100 text-on-surface rounded-[4px] text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: แจ้งเตือนยืนยันเมื่อลงเวรทับซ้อนกับคิวงาน (Conflict Confirm)
         ======================================================== */}
      {conflictConfirmModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-rose-300 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-2xl">crisis_alert</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-950 headline-font">
                  {conflictConfirmModal.isPreset ? 'พบตารางเวรทับซ้อนกับคิวงานที่รับไว้แล้ว!' : 'แจ้งเตือน: ตารางเวรทับซ้อนกัน!'}
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  {conflictConfirmModal.isPreset
                    ? `การตั้งค่าทางลัด "${conflictConfirmModal.presetTitle}" จะทำให้มีเวรทับซ้อนกับคิวงานผู้ป่วยจำนวน ${conflictConfirmModal.presetConflicts.length} วัน`
                    : `การลงเวรในวันที่ ${conflictConfirmModal.dayNum} ${MONTH_NAMES_TH[currentMonth]} ${currentYear + 543} จะทำให้เวลาปฏิบัติงานทับซ้อนกับคิวงานที่รับไว้แล้ว`}
                </p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5 p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl text-xs">
              <span className="font-bold text-rose-900 block">รายละเอียดความขัดแย้ง:</span>
              {conflictConfirmModal.isPreset ? (
                conflictConfirmModal.presetConflicts.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-rose-200 space-y-1 shadow-2xs">
                    <div className="font-bold text-rose-900 flex items-center justify-between">
                      <span>วันที่ {item.dayNum} {MONTH_NAMES_TH[currentMonth]}:</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                        ลงเวร [{item.code}]
                      </span>
                    </div>
                    {item.conflicts.map((c, cIdx) => (
                      <p key={cIdx} className="text-rose-700 pl-2 border-l-2 border-rose-400 leading-relaxed">
                        • {c.reason}
                      </p>
                    ))}
                  </div>
                ))
              ) : (
                conflictConfirmModal.conflicts.map((c, idx) => (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-rose-200 space-y-1 shadow-2xs">
                    <p className="font-bold text-rose-900">
                      • กะเวร รพ. ที่จะลง: [{conflictConfirmModal.code}] {conflictConfirmModal.shiftDef?.name || ''}
                    </p>
                    <p className="text-rose-700 leading-relaxed">
                      {c.reason}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-600 mt-0.5 shrink-0">warning</span>
              <div>
                <strong>ข้อควรระวัง:</strong> การยืนยันลงเวรนี้อาจส่งผลให้ไม่สามารถไปปฏิบัติงานตามคิวงานที่นัดหมายไว้ได้ และอาจเกิดข้อร้องเรียนจากผู้รับบริการ
              </div>
            </div>

            <div className="flex gap-2.5 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={conflictConfirmModal.onCancel}
                className="flex-1 py-2.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl font-semibold text-xs transition-all"
              >
                ยกเลิก (ไม่ลงเวรนี้)
              </button>
              <button
                type="button"
                onClick={conflictConfirmModal.onConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl font-bold text-xs transition-all shadow-xs"
              >
                ยืนยันลงเวรต่อไป
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: แสดงรายการเวรที่ทับซ้อนกันทั้งหมดในเดือนนี้
         ======================================================== */}
      {showAllConflictsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-rose-600 text-2xl">crisis_alert</span>
                <div>
                  <h4 className="font-bold text-base text-rose-950 headline-font">
                    รายการตารางเวรทับซ้อนในเดือน {MONTH_NAMES_TH[currentMonth]} {currentYear + 543}
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    พบทั้งหมด {monthlyConflicts.conflictCount} รายการ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllConflictsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {monthlyConflicts.conflictCount === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800">
                  <span className="material-symbols-outlined text-emerald-600 text-2xl mb-1 block">check_circle</span>
                  ไม่มีตารางเวรทับซ้อนกันในเดือนนี้
                </div>
              ) : (
                Object.entries(monthlyConflicts.conflictsByDay).map(([dayNum, cList]) => (
                  <div key={dayNum} className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-rose-900">
                        📅 วันที่ {dayNum} {MONTH_NAMES_TH[currentMonth]}:
                      </span>
                      {isEditing && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              executeSetDayShift(Number(dayNum), 'X')
                            }}
                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-2xs"
                          >
                            แก้เป็นวันหยุด (X)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              executeSetDayShift(Number(dayNum), null)
                            }}
                            className="px-2 py-0.5 bg-gray-500 hover:bg-gray-600 text-white rounded text-[11px] font-semibold shadow-2xs"
                          >
                            ล้างเวร
                          </button>
                        </div>
                      )}
                    </div>
                    {cList.map((c, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-rose-200 text-xs text-rose-800 shadow-2xs leading-relaxed">
                        • {c.reason}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllConflictsModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-all"
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
