import Navbar from "../components/Navbar.jsx"
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { SYMPTOM_OPTIONS, SYMPTOM_GROUPS } from '../data/clinicalRules.js'

/* Shared clinical catalog lives in data/clinicalRules.js. */
/* The remaining local declarations are replaced below. */

export default function AddPatientPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    gender: '',
    birth_date: '',
    age: '',
    relationship_to_member: '',
    religion: '',
    main_language: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    congenital_disease: '',
    blood_type: '',
    consciousness: '',
    chief_complaint: [],
    current_assistance: [],
    adl_score: '',
    elimination: '',
    laxative_use: '',
    hearing: '',
    vision: [],
    mood: [],
    food_allergy: '',
    drug_allergy: '',
    dietary_restrictions: ''
  })

  const [memberProfile, setMemberProfile] = useState(null)
  const [useApplicantContact, setUseApplicantContact] = useState(false)
  const [customComplaintText, setCustomComplaintText] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ดึงข้อมูลโปรไฟล์ผู้สมัคร เพื่อรองรับการคลิกใช้ข้อมูลผู้ติดต่อฉุกเฉินอัตโนมัติ
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    api.get('/member/profile')
      .then(res => setMemberProfile(res.data))
      .catch(err => console.warn('Could not load member profile', err))
  }, [])

  // ฟังก์ชันคำนวณอายุอัตโนมัติจากวันเดือนปีเกิด
  const calculateAge = (dobString) => {
    if (!dobString) return ''
    const dob = new Date(dobString)
    const today = new Date()
    if (isNaN(dob.getTime()) || dob > today) return ''
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age >= 0 ? age : 0
  }

  // จัดการการเปลี่ยนวันเดือนปีเกิด และคำนวณอายุทันที
  const handleBirthDateChange = (e) => {
    const val = e.target.value
    const calculatedAge = calculateAge(val)
    setForm(prev => ({
      ...prev,
      birth_date: val,
      age: calculatedAge !== '' ? calculatedAge.toString() : ''
    }))
    if (errors.birth_date) setErrors(prev => ({ ...prev, birth_date: '' }))
    if (errors.age) setErrors(prev => ({ ...prev, age: '' }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    if (errors[name]) setErrors({ ...errors, [name]: '' })
  }

  const handleCheckboxChange = (e, field) => {
    const { value, checked } = e.target
    const arr = [...(form[field] || [])]
    if (checked) {
      arr.push(value)
    } else {
      const i = arr.indexOf(value)
      if (i > -1) arr.splice(i, 1)
    }
    setForm({ ...form, [field]: arr })
    if (errors[field]) setErrors({ ...errors, [field]: '' })
  }

  // ฟังก์ชันใช้ข้อมูลติดต่อของผู้สมัครเป็นบุคคลติดต่อฉุกเฉิน
  const handleUseApplicantContactChange = async (e) => {
    const checked = e.target.checked
    setUseApplicantContact(checked)

    if (checked) {
      let prof = memberProfile
      if (!prof) {
        try {
          const res = await api.get('/member/profile')
          prof = res.data
          setMemberProfile(prof)
        } catch (err) {
          console.warn('Cannot fetch profile', err)
        }
      }

      if (prof) {
        const fullName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim()
        setForm(prev => ({
          ...prev,
          emergency_contact_name: fullName,
          emergency_contact_phone: prof.phone || '',
          emergency_contact_relationship: prev.relationship_to_member ? `ผู้สมัคร (${prev.relationship_to_member})` : 'ผู้สมัคร'
        }))
        setErrors(prev => ({
          ...prev,
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: ''
        }))
      }
    }
  }

  // Validation ตาม SRS 3.1.5
  const validate = () => {
    const errs = {}
    if (!form.first_name.trim()) {
      errs.first_name = 'กรุณากรอกชื่อจริง'
    } else if (!/^[ก-๏\s]+$/.test(form.first_name)) {
      errs.first_name = 'ชื่อต้องเป็นภาษาไทยเท่านั้น'
    } else if (form.first_name.trim().length < 2 || form.first_name.trim().length > 50) {
      errs.first_name = 'ชื่อจริงต้องมี 2-50 ตัวอักษร'
    }

    if (!form.last_name.trim()) {
      errs.last_name = 'กรุณากรอกนามสกุล'
    } else if (!/^[ก-๏\s]+$/.test(form.last_name)) {
      errs.last_name = 'นามสกุลต้องเป็นภาษาไทยเท่านั้น'
    } else if (form.last_name.trim().length < 2 || form.last_name.trim().length > 50) {
      errs.last_name = 'นามสกุลต้องมี 2-50 ตัวอักษร'
    }

    if (!form.gender) errs.gender = 'กรุณาเลือกเพศ'

    if (!form.birth_date && !form.age) {
      errs.birth_date = 'กรุณาเลือกวันเดือนปีเกิด'
    } else if (form.birth_date) {
      const bDate = new Date(form.birth_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (bDate > today) errs.birth_date = 'วันเกิดต้องเป็นวันที่ในอดีต'
    }

    if (!form.age || parseInt(form.age) < 0 || parseInt(form.age) > 120) {
      errs.age = 'ไม่สามารถคำนวณอายุได้ หรืออายุไม่อยู่ในช่วง 0-120 ปี'
    }

    if (!form.relationship_to_member.trim()) {
      errs.relationship_to_member = 'กรุณาระบุความสัมพันธ์กับผู้สมัคร'
    } else if (!/^[ก-๏\s]+$/.test(form.relationship_to_member.trim())) {
      errs.relationship_to_member = 'ความสัมพันธ์ต้องเป็นภาษาไทย'
    }

    if (!form.blood_type) errs.blood_type = 'กรุณาเลือกหมู่เลือด'
    if (!form.consciousness) errs.consciousness = 'กรุณาเลือกระดับความรู้สึกตัว'

    if (!form.chief_complaint || form.chief_complaint.length === 0) {
      errs.chief_complaint = 'กรุณาระบุอาการสำคัญอย่างน้อย 1 รายการ'
    } else if (form.chief_complaint.length === 1 && form.chief_complaint[0] === 'other' && !customComplaintText.trim()) {
      errs.chief_complaint = 'กรุณาระบุรายละเอียดอาการในช่อง "อื่นๆ"'
    }

    if (!form.adl_score) errs.adl_score = 'กรุณาเลือกระดับ ADL'
    if (!form.hearing) errs.hearing = 'กรุณาเลือกการได้ยิน'

    if (!form.vision || (Array.isArray(form.vision) && form.vision.length === 0)) {
      errs.vision = 'กรุณาเลือกระดับการมองเห็นอย่างน้อย 1 รายการ'
    }

    if (!form.emergency_contact_name.trim()) {
      errs.emergency_contact_name = 'กรุณากรอกชื่อผู้ติดต่อฉุกเฉิน'
    } else if (!/^[ก-๏\s]+$/.test(form.emergency_contact_name)) {
      errs.emergency_contact_name = 'ชื่อผู้ติดต่อฉุกเฉินต้องเป็นภาษาไทย'
    } else if (form.emergency_contact_name.trim().length < 2 || form.emergency_contact_name.trim().length > 50) {
      errs.emergency_contact_name = 'ชื่อผู้ติดต่อฉุกเฉินต้องมี 2-50 ตัวอักษร'
    }

    if (!form.emergency_contact_relationship.trim()) {
      errs.emergency_contact_relationship = 'กรุณาระบุความสัมพันธ์ของผู้ติดต่อฉุกเฉิน'
    } else if (!/^[ก-๏\s()]+$/.test(form.emergency_contact_relationship.trim())) {
      errs.emergency_contact_relationship = 'ความสัมพันธ์ต้องเป็นภาษาไทย'
    }

    if (!form.emergency_contact_phone.trim()) {
      errs.emergency_contact_phone = 'กรุณากรอกเบอร์โทรฉุกเฉิน'
    } else if (/\s/.test(form.emergency_contact_phone)) {
      errs.emergency_contact_phone = 'เบอร์โทรฉุกเฉินห้ามมีช่องว่าง'
    } else if (!/^(06|07|08|09)\d{8}$/.test(form.emergency_contact_phone)) {
      errs.emergency_contact_phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09'
    }

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setSuccessMsg('')

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors({})
    setIsLoading(true)

    const complaintValues = (form.chief_complaint || []).filter(value => value !== 'other')
    if (form.chief_complaint?.includes('other') && customComplaintText.trim()) {
      complaintValues.push(`other:${customComplaintText.trim()}`)
    }

    const payload = {
      first_name: form.first_name,
      last_name: form.last_name,
      gender: form.gender,
      birth_date: form.birth_date,
      age: parseInt(form.age),
      religion: form.religion,
      main_language: form.main_language,
      relationship_to_member: form.relationship_to_member,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      emergency_contact_relationship: form.emergency_contact_relationship,
      health_profile: {
        congenital_disease: form.congenital_disease,
        blood_type: form.blood_type,
        consciousness: form.consciousness,
        chief_complaint: complaintValues.join(', '),
        current_assistance: (form.current_assistance || []).join(', '),
        adl_score: form.adl_score,
        elimination: form.elimination,
        laxative_use: form.laxative_use,
        hearing: form.hearing,
        vision: Array.isArray(form.vision) ? form.vision.join(', ') : form.vision,
        mood: (form.mood || []).join(', '),
        food_allergy: form.food_allergy,
        drug_allergy: form.drug_allergy,
        dietary_restrictions: form.dietary_restrictions
      }
    }

    try {
      await api.post('/member/patients', payload)
      setSuccessMsg('เพิ่มข้อมูลผู้ป่วยสำเร็จ')
      setTimeout(() => {
        navigate('/member/patients')
      }, 1500)
    } catch (err) {
      setServerError(err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  const SectionHeader = ({ title, icon }) => (
    <div className="flex items-center gap-2.5 mb-5 pb-2.5 border-b border-gray-100">
      <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1456f0] flex items-center justify-center shadow-2xs">
        <span className="material-symbols-outlined text-base">{icon}</span>
      </div>
      <h3 className="text-base font-bold headline-font text-[#222222]">{title}</h3>
    </div>
  )

  const ErrorLabel = ({ field }) => errors[field] ? (
    <p className="text-rose-600 text-xs mt-1.5 flex items-center gap-1 font-medium">
      <span className="material-symbols-outlined text-[14px]">warning</span>{errors[field]}
    </p>
  ) : null

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body">
      <Navbar />

      <main className="flex-grow flex justify-center p-6 lg:p-10">
        <div className="w-full max-w-4xl">
          <div className="bg-white p-8 lg:p-12 rounded-3xl shadow-purple-card border border-gray-100">
            <div className="mb-8">
              <h1 className="headline-font text-3xl font-bold text-[#222222] mb-1.5">เพิ่มข้อมูลผู้ป่วย</h1>
              <p className="text-[#45515e] text-sm">กรอกรายละเอียดเพื่อใช้ประกอบการพิจารณาการดูแลของเจ้าหน้าที่</p>
            </div>

            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
                <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                <p className="font-medium">{successMsg}</p>
              </div>
            )}
            {serverError && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
                <span className="material-symbols-outlined text-rose-600">error</span>
                <p className="font-medium">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10" noValidate>
              {/* 1. ข้อมูลพื้นฐาน */}
              <section>
                <SectionHeader title="ข้อมูลพื้นฐาน" icon="person" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ชื่อจริง <span className="text-[#DC3545]">*</span></label>
                    <input type="text" name="first_name" value={form.first_name} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.first_name ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="ภาษาไทย" />
                    <ErrorLabel field="first_name" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">นามสกุล <span className="text-[#DC3545]">*</span></label>
                    <input type="text" name="last_name" value={form.last_name} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.last_name ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="ภาษาไทย" />
                    <ErrorLabel field="last_name" />
                  </div>

                  {/* เพศ: Radio button */}
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant block mb-2">เพศ <span className="text-[#DC3545]">*</span></label>
                    <div className="flex gap-4">
                      {['ชาย', 'หญิง'].map(g => (
                        <label key={g} className={`flex-1 py-3 px-4 text-center rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 ${form.gender === g ? 'bg-[#1456f0]/10 border-[#1456f0] font-semibold text-[#1456f0] ring-2 ring-[#1456f0]/20' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}>
                          <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={handleChange} className="text-[#1456f0] focus:ring-[#1456f0] w-4 h-4" />
                          <span>{g}</span>
                        </label>
                      ))}
                    </div>
                    <ErrorLabel field="gender" />
                  </div>

                  {/* ความสัมพันธ์ */}
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ความสัมพันธ์กับสมาชิก <span className="text-[#DC3545]">*</span></label>
                    <input type="text" name="relationship_to_member" value={form.relationship_to_member} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.relationship_to_member ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="เช่น บิดา, มารดา, ตนเอง (ภาษาไทย)" />
                    <ErrorLabel field="relationship_to_member" />
                  </div>

                  {/* วันเดือนปีเกิด & คำนวณอายุอัตโนมัติ */}
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-[#F8F9FA] p-4 rounded-xl border border-gray-200">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-primary">calendar_today</span>
                        วันเดือนปีเกิด <span className="text-[#DC3545]">*</span>
                      </label>
                      <input
                        type="date"
                        name="birth_date"
                        value={form.birth_date}
                        onChange={handleBirthDateChange}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.birth_date ? 'border-[#DC3545]' : 'border-gray-200'}`}
                      />
                      <ErrorLabel field="birth_date" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-primary">cake</span>
                        อายุ (คำนวณอัตโนมัติจากวันเกิด) <span className="text-[#DC3545]">*</span>
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          name="age"
                          value={form.age !== '' ? `${form.age} ปี` : ''}
                          readOnly
                          placeholder="เลือกวันเกิดเพื่อคำนวณอายุ"
                          className={`w-full p-3 bg-gray-50 border rounded-xl font-bold text-primary cursor-not-allowed ${errors.age ? 'border-[#DC3545]' : 'border-gray-200'}`}
                        />
                        {form.age !== '' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold bg-[#1456f0]/10 text-[#1456f0] px-2.5 py-1 rounded-xl">
                            คำนวณอัตโนมัติ
                          </span>
                        )}
                      </div>
                      <ErrorLabel field="age" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">ศาสนา (ถ้ามี)</label>
                      <input type="text" name="religion" value={form.religion} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">ภาษาที่ใช้สื่อสาร</label>
                      <input type="text" name="main_language" value={form.main_language} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="เช่น ไทย, เหนือ" />
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. ข้อมูลทางการแพทย์ */}
              <section>
                <SectionHeader title="ข้อมูลทางการแพทย์" icon="monitor_heart" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-on-surface-variant">โรคประจำตัว (ถ้ามี)</label>
                    <input type="text" name="congenital_disease" value={form.congenital_disease} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="ระบุโรคประจำตัว" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">หมู่เลือด <span className="text-[#DC3545]">*</span></label>
                    <div className="flex gap-2 mt-2">
                      {['A', 'B', 'AB', 'O'].map(t => (
                        <label key={t} className={`flex-1 py-2 text-center rounded-xl border cursor-pointer transition-all ${form.blood_type === t ? 'bg-[#1456f0] text-white border-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}>
                          <input type="radio" name="blood_type" value={t} className="hidden" onChange={handleChange} checked={form.blood_type === t} />{t}
                        </label>
                      ))}
                    </div>
                    <ErrorLabel field="blood_type" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ระดับความรู้สึกตัว <span className="text-[#DC3545]">*</span></label>
                    <select name="consciousness" value={form.consciousness} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.consciousness ? 'border-[#DC3545]' : 'border-gray-200'}`}>
                      <option value="">-- เลือก --</option>
                      <option value="รู้สึกตัวดี">รู้สึกตัวดี</option>
                      <option value="สับสน">สับสน</option>
                      <option value="ซึม">ซึม</option>
                      <option value="ไม่รู้สึกตัว">ไม่รู้สึกตัว</option>
                    </select>
                    <ErrorLabel field="consciousness" />
                  </div>

                  {/* อาการสำคัญ: ระบบ Checkbox Tags */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-on-surface-variant block mb-2">
                      อาการสำคัญ / ความต้องการการดูแล (เลือกได้มากกว่า 1) <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="space-y-2.5">
                      {SYMPTOM_GROUPS.map(group => {
                        const groupOptions = group.values.map(value => SYMPTOM_OPTIONS.find(item => item.value === value)).filter(Boolean)
                        const selectedCount = groupOptions.filter(item => (form.chief_complaint || []).includes(item.value)).length
                        return (
                          <details key={group.title} open={group.title.includes('หัตถการ')} className="group rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <summary className="flex items-center gap-2.5 p-3 cursor-pointer list-none hover:bg-[#F8F9FA]">
                              <span className="material-symbols-outlined text-[#1456f0] text-lg">{group.icon}</span>
                              <span className="flex-1">
                                <span className="block text-sm font-bold text-on-surface">{group.title}</span>
                                <span className="block text-[11px] text-tertiary">{group.subtitle}</span>
                              </span>
                              {selectedCount > 0 && <span className="text-[11px] font-bold text-[#1456f0] bg-[#1456f0]/10 border border-[#1456f0]/20 px-2 py-0.5 rounded-full">เลือกแล้ว {selectedCount}</span>}
                              <span className="material-symbols-outlined text-tertiary text-lg group-open:rotate-180 transition-transform">expand_more</span>
                            </summary>
                            <div className="p-2.5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {groupOptions.map(item => {
                                const isChecked = (form.chief_complaint || []).includes(item.value)
                                return (
                                  <label key={item.value} className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2 text-xs ${isChecked ? 'bg-[#1456f0]/10 border-[#1456f0] font-semibold text-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA] text-on-surface-variant'}`}>
                                    <input type="checkbox" value={item.value} checked={isChecked} onChange={(e) => handleCheckboxChange(e, 'chief_complaint')} className="mt-0.5 w-3.5 h-3.5 shrink-0 text-[#1456f0] rounded border-gray-200 focus:ring-[#1456f0]" />
                                    <span>{item.label}</span>
                                  </label>
                                )
                              })}
                            </div>
                            {group.values.includes('other') && (form.chief_complaint || []).includes('other') && (
                              <div className="px-2.5 pb-2.5">
                                <textarea value={customComplaintText} onChange={e => setCustomComplaintText(e.target.value)} rows="3" placeholder="ระบุอาการ ภาวะหลังผ่าตัด หรือข้อควรระวังเพิ่มเติม..." className="w-full p-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#1456f0] resize-none" />
                              </div>
                            )}
                          </details>
                        )
                      })}
                    </div>
                    <ErrorLabel field="chief_complaint" />
                  </div>

                  {/* ความช่วยเหลือที่ได้รับในปัจจุบัน: 7 รายการการแพทย์ */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-on-surface-variant block mb-2">ความช่วยเหลือที่ได้รับในปัจจุบัน (ถ้ามี)</label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        'เครื่องช่วยหายใจ (Home Ventilator / BiPAP)',
                        'ท่อเจาะคอ (Tracheostomy)',
                        'สายให้อาหาร',
                        'สายสวนปัสสาวะ',
                        'ล้างไตทางหน้าท้อง (CAPD)',
                        'ไม้เท้า',
                        'รถเข็น (Wheelchair)'
                      ].map(item => (
                        <label key={item} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" value={item} onChange={(e) => handleCheckboxChange(e, 'current_assistance')} checked={(form.current_assistance || []).includes(item)} className="w-5 h-5 text-[#1456f0] rounded-xl border-gray-200 focus:ring-[#1456f0]" />
                          <span className="text-sm">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 3. กิจวัตรประจำวัน */}
              <section>
                <SectionHeader title="กิจวัตรประจำวัน (ADL)" icon="accessibility_new" />
                <div>
                  <label className="text-sm font-semibold text-on-surface-variant block mb-2">ระดับ ADL <span className="text-[#DC3545]">*</span></label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[{v:'อิสระ',d:'ช่วยเหลือตัวเองได้'},{v:'ช่วยเหลือบางส่วน',d:'ต้องการคนช่วยบ้าง'},{v:'ไม่ได้เลย',d:'ติดเตียง'}].map(item => (
                      <label key={item.v} className={`p-4 rounded-xl border cursor-pointer transition-all ${form.adl_score === item.v ? 'bg-[#1456f0]/10 border-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}>
                        <div className="flex items-center gap-2"><input type="radio" name="adl_score" value={item.v} onChange={handleChange} checked={form.adl_score === item.v} className="text-[#1456f0] focus:ring-[#1456f0]" /><span className="font-semibold text-on-surface">{item.v}</span></div>
                        <p className="text-xs text-tertiary ml-6">{item.d}</p>
                      </label>
                    ))}
                  </div>
                  <ErrorLabel field="adl_score" />
                </div>

                {/* การขับถ่าย */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">การขับถ่าย (Dropdown)</label>
                    <select
                      name="elimination"
                      value={form.elimination}
                      onChange={handleChange}
                      className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all"
                    >
                      <option value="">-- เลือกรูปแบบการขับถ่าย --</option>
                      <option value="ปกติ (ควบคุมได้)">ปกติ (ควบคุมได้)</option>
                      <option value="กลั้นไม่ได้ / ปัสสาวะเล็ด">กลั้นไม่ได้ / ปัสสาวะเล็ด</option>
                      <option value="ท้องผูกบ่อย">ท้องผูกบ่อย</option>
                      <option value="ท้องเสีย / ถ่ายเหลวเรื้อรัง">ท้องเสีย / ถ่ายเหลวเรื้อรัง</option>
                      <option value="ใช้อุปกรณ์ช่วย / สายสวนปัสสาวะ">ใช้อุปกรณ์ช่วย / สายสวนปัสสาวะ</option>
                      <option value="ขับถ่ายทางหน้าท้อง / ทวารเทียม (Colostomy)">ขับถ่ายทางหน้าท้อง / ทวารเทียม (Colostomy)</option>
                      <option value="ใช้ผ้าอ้อมผู้ใหญ่">ใช้ผ้าอ้อมผู้ใหญ่</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">การใช้ยาถ่าย/สวนทวาร</label>
                    <input type="text" name="laxative_use" value={form.laxative_use} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="ระบุความถี่หรือชนิด (ถ้ามี)" />
                  </div>
                </div>
              </section>

              {/* 4. การแพ้ */}
              <section>
                <SectionHeader title="การแพ้และโภชนาการ" icon="no_meals" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">แพ้อาหาร (ถ้ามี)</label>
                    <input type="text" name="food_allergy" value={form.food_allergy} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="ระบุอาหารที่แพ้" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">แพ้ยา (ถ้ามี)</label>
                    <input type="text" name="drug_allergy" value={form.drug_allergy} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="ระบุยาที่แพ้" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ข้อจำกัดอาหาร (ถ้ามี)</label>
                    <input type="text" name="dietary_restrictions" value={form.dietary_restrictions} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all" placeholder="เช่น กินเจ, งดเค็ม" />
                  </div>
                </div>
              </section>

              {/* 5. ประสาทสัมผัส */}
              <section>
                <SectionHeader title="ประสาทสัมผัส และสภาพจิตใจ" icon="psychology" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">การได้ยิน <span className="text-[#DC3545]">*</span></label>
                    <select name="hearing" value={form.hearing} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.hearing ? 'border-[#DC3545]' : 'border-gray-200'}`}>
                      <option value="">-- เลือก --</option>
                      <option value="ปกติ">ปกติ</option>
                      <option value="บกพร่อง/ใช้เครื่องช่วยฟัง">บกพร่อง/ใช้เครื่องช่วยฟัง</option>
                      <option value="หูหนวก">หูหนวก</option>
                    </select>
                    <ErrorLabel field="hearing" />
                  </div>

                  {/* การมองเห็น: Checkbox แยกหัวข้อ */}
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-on-surface-variant block mb-2">
                      ระดับการมองเห็น (Checkbox แยกหัวข้อ) <span className="text-[#DC3545]">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {['ปกติ', 'ใส่แว่นสายตา', 'พร่ามัว', 'ต้อกระจก', 'ตาบอด'].map(opt => {
                        const isChecked = (form.vision || []).includes(opt)
                        return (
                          <label
                            key={opt}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 text-sm ${
                              isChecked
                                ? 'bg-[#1456f0]/10 border-[#1456f0] font-semibold text-[#1456f0] ring-2 ring-[#1456f0]/20'
                                : 'bg-white border-gray-200 hover:bg-[#F8F9FA] text-on-surface-variant'
                            }`}
                          >
                            <input
                              type="checkbox"
                              value={opt}
                              checked={isChecked}
                              onChange={(e) => handleCheckboxChange(e, 'vision')}
                              className="w-4 h-4 text-[#1456f0] rounded-xl border-gray-200 focus:ring-[#1456f0]"
                            />
                            <span>{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                    <ErrorLabel field="vision" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-on-surface-variant block mb-2">อารมณ์และความรู้สึก (เลือกได้มากกว่า 1)</label>
                    <div className="flex flex-wrap gap-3">
                      {['ร่าเริงปกติ', 'เงียบขรึม', 'หงุดหงิดง่าย', 'ซึมเศร้า/กังวล', 'ก้าวร้าว'].map(m => (
                        <label key={m} className={`px-4 py-2 rounded-xl border cursor-pointer transition-all text-sm ${(form.mood || []).includes(m) ? 'bg-[#1456f0] text-white border-[#1456f0]' : 'bg-white border-gray-200 hover:bg-[#F8F9FA]'}`}>
                          <input type="checkbox" value={m} onChange={(e) => handleCheckboxChange(e, 'mood')} checked={(form.mood || []).includes(m)} className="hidden" />{m}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* 6. ติดต่อฉุกเฉิน */}
              <section>
                <SectionHeader title="บุคคลติดต่อฉุกเฉิน" icon="emergency" />

                {/* ช่องติ๊กใช้ข้อมูลผู้สมัครทันที */}
                <div className="mb-4 bg-[#1456f0]/5 border border-[#1456f0]/20 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useApplicantContact}
                      onChange={handleUseApplicantContactChange}
                      className="w-5 h-5 rounded-xl border-gray-200 text-[#1456f0] focus:ring-[#1456f0] cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-sm text-[#1456f0] headline-font flex items-center gap-1">
                        <span className="material-symbols-outlined text-base">person_pin</span>
                        ใช้ข้อมูลติดต่อของผู้สมัครเป็นบุคคลติดต่อฉุกเฉิน
                      </span>
                      <p className="text-xs text-tertiary mt-0.5">
                        ดึงชื่อ-นามสกุล และเบอร์โทรศัพท์ของบัญชีผู้สมัครมากรอกให้อัตโนมัติ ไม่ต้องกรอกซ้ำ
                      </p>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ชื่อผู้ติดต่อ <span className="text-[#DC3545]">*</span></label>
                    <input type="text" name="emergency_contact_name" value={form.emergency_contact_name} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.emergency_contact_name ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="ภาษาไทย" />
                    <ErrorLabel field="emergency_contact_name" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">ความสัมพันธ์ <span className="text-[#DC3545]">*</span></label>
                    <input type="text" name="emergency_contact_relationship" value={form.emergency_contact_relationship} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.emergency_contact_relationship ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="เช่น บิดา, มารดา, บุตร" />
                    <ErrorLabel field="emergency_contact_relationship" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-on-surface-variant">เบอร์โทรศัพท์ <span className="text-[#DC3545]">*</span></label>
                    <input type="tel" name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1456f0] focus:ring-offset-2 transition-all ${errors.emergency_contact_phone ? 'border-[#DC3545]' : 'border-gray-200'}`} placeholder="0812345678" />
                    <ErrorLabel field="emergency_contact_phone" />
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-gray-100">
                <button type="button" onClick={() => navigate('/member/patients')} className="flex-1 min-w-[140px] border border-gray-200 bg-white hover:bg-gray-50 text-[#45515e] py-3 rounded-full headline-font text-sm font-semibold transition-all">ยกเลิก</button>
                <button type="submit" disabled={isLoading} className="flex-1 min-w-[180px] bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white py-3 rounded-full headline-font text-sm font-semibold transition-all shadow-purple-sm disabled:opacity-50">
                  {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้ป่วย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
