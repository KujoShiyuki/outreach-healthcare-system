import Navbar from "../../components/Navbar.jsx"
import { useState } from 'react'
import api from '../../services/api.js'
import thaiLocations from '../../data/thaiLocations.js'
import LocationPicker from '../../components/LocationPicker.jsx'

const THAI_BANKS = [
  'ธนาคารกสิกรไทย (KBANK)',
  'ธนาคารไทยพาณิชย์ (SCB)',
  'ธนาคารกรุงเทพ (BBL)',
  'ธนาคารกรุงไทย (KTB)',
  'ธนาคารกรุงศรีอยุธยา (BAY)',
  'ธนาคารทหารไทยธนชาต (TTB)',
  'ธนาคารออมสิน (GSB)',
  'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (ธ.ก.ส.)',
  'ธนาคารยูโอบี (UOB)',
  'ธนาคารซีไอเอ็มบีไทย (CIMB)',
  'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
  'ธนาคารเกียรตินาคินภัทร (KKP)',
]

export default function RegisterNursePage() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    national_id: '',
    professional_tier: '',
    license_no: '',
    license_issue_date: '',
    license_expire_date: '',
    service_area: '',
    latitude: null,
    longitude: null,
    service_radius_km: 10,
    phone: '',
    bank_name: '',
    bank_account_no: '',
    availability_type: 'FIXED_TIME',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [province, setProvince] = useState('')
  const [district, setDistrict] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // เอกสารอัปโหลด
  const [licenseFile, setLicenseFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [idCardFile, setIdCardFile] = useState(null)
  const [idCardPreview, setIdCardPreview] = useState(null)
  const [criminalFile, setCriminalFile] = useState(null)
  const [criminalPreview, setCriminalPreview] = useState(null)
  const [medicalCertFile, setMedicalCertFile] = useState(null)
  const [medicalCertPreview, setMedicalCertPreview] = useState(null)

  const calculateAge = (dateString) => {
    if (!dateString) return null
    const bDate = new Date(dateString)
    if (isNaN(bDate.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - bDate.getFullYear()
    const m = today.getMonth() - bDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--
    }
    return age
  }

  const getMinAge = () => (form.professional_tier === 'RN' ? 20 : 18)

  const getMaxBirthDate = () => {
    const d = new Date()
    const minAge = getMinAge()
    d.setFullYear(d.getFullYear() - minAge)
    return d.toISOString().split('T')[0]
  }

  const provinces = Object.keys(thaiLocations)
  const districts = province ? thaiLocations[province] || [] : []

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleProvinceChange = (e) => {
    const val = e.target.value
    setProvince(val)
    setDistrict('')
    setForm(prev => ({ ...prev, service_area: val }))
    if (errors.service_area) setErrors(prev => ({ ...prev, service_area: '' }))
  }

  const handleDistrictChange = (e) => {
    const val = e.target.value
    setDistrict(val)
    setForm(prev => ({ ...prev, service_area: val ? `${val}, ${province}` : province }))
    if (errors.service_area) setErrors(prev => ({ ...prev, service_area: '' }))
  }

  const handleLocationPicked = ({ lat, lng, province: pickedProv, district: pickedDist }) => {
    setForm(prev => {
      const updated = {
        ...prev,
        latitude: lat,
        longitude: lng,
      }
      if (pickedProv) {
        const matchedP = provinces.find(p => p.includes(pickedProv) || pickedProv.includes(p))
        if (matchedP) {
          setProvince(matchedP)
          const distList = thaiLocations[matchedP] || []
          if (pickedDist) {
            const matchedD = distList.find(d => d.includes(pickedDist) || pickedDist.includes(d))
            if (matchedD) {
              setDistrict(matchedD)
              updated.service_area = `${matchedD}, ${matchedP}`
            } else {
              updated.service_area = matchedP
            }
          } else {
            updated.service_area = matchedP
          }
        }
      }
      return updated
    })
    setErrors(prev => ({ ...prev, service_area: '' }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, license_file: 'ขนาดไฟล์ต้องไม่เกิน 5MB' }))
        return
      }
      setLicenseFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreview(reader.result)
      reader.readAsDataURL(file)
      if (errors.license_file) setErrors(prev => ({ ...prev, license_file: '' }))
    }
  }

  const readDocumentFile = (e, setFile, setPreview, errorKey) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setErrors(prev => ({ ...prev, [errorKey]: 'รองรับเฉพาะ JPG, PNG หรือ PDF' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [errorKey]: 'ขนาดไฟล์ต้องไม่เกิน 5MB' }))
      return
    }
    setFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result)
    reader.readAsDataURL(file)
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: '' }))
  }

  const handleIdentityFileChange = (e) => readDocumentFile(e, setIdCardFile, setIdCardPreview, 'identity_document')
  const handleCriminalFileChange = (e) => readDocumentFile(e, setCriminalFile, setCriminalPreview, 'criminal_record')
  const handleMedicalFileChange = (e) => readDocumentFile(e, setMedicalCertFile, setMedicalCertPreview, 'medical_certificate')

  const validate = () => {
    const errs = {}

    // ข้อมูลส่วนตัวและวิชาชีพ
    if (!form.first_name.trim()) errs.first_name = 'กรุณากรอกชื่อจริง'
    else if (!/^[ก-๏\s]+$/.test(form.first_name)) errs.first_name = 'ชื่อจริงต้องเป็นภาษาไทย'

    if (!form.last_name.trim()) errs.last_name = 'กรุณากรอกนามสกุล'
    else if (!/^[ก-๏\s]+$/.test(form.last_name)) errs.last_name = 'นามสกุลต้องเป็นภาษาไทย'

    if (!form.birth_date) {
      errs.birth_date = 'กรุณาระบุวันเกิด'
    } else {
      const age = calculateAge(form.birth_date)
      const minAge = getMinAge()
      if (age === null || age < minAge) {
        const tierName = form.professional_tier === 'RN' ? 'พยาบาลวิชาชีพ (RN)' : (form.professional_tier ? `ระดับ ${form.professional_tier}` : 'ผู้ให้บริการ')
        errs.birth_date = `อายุต้องไม่ต่ำกว่า ${minAge} ปีบริบูรณ์ สำหรับ${tierName} (ปัจจุบันอายุ ${age ?? 0} ปี)`
      }
    }

    if (!form.national_id) errs.national_id = 'กรุณากรอกเลขบัตรประชาชน 13 หลัก'
    else if (!/^\d{13}$/.test(form.national_id)) errs.national_id = 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก'

    if (!form.professional_tier) errs.professional_tier = 'กรุณาเลือกระดับวิชาชีพ'

    if (form.professional_tier === 'RN') {
      if (!form.license_no) errs.license_no = 'พยาบาลวิชาชีพกรุณากรอกเลขใบประกอบวิชาชีพ'
      if (!form.license_issue_date) errs.license_issue_date = 'กรุณาระบุวันออกใบอนุญาต'
      if (!form.license_expire_date) errs.license_expire_date = 'กรุณาระบุวันหมดอายุใบอนุญาต'
      else if (form.license_issue_date && new Date(form.license_expire_date) <= new Date(form.license_issue_date)) {
        errs.license_expire_date = 'วันหมดอายุต้องอยู่หลังวันออกใบอนุญาต'
      }
    }

    if (!form.service_area.trim()) errs.service_area = 'กรุณาระบุพื้นที่ให้บริการ'

    // การติดต่อและการเงิน
    if (!form.phone.trim()) errs.phone = 'กรุณากรอกเบอร์โทรศัพท์'
    else if (!/^(06|07|08|09)\d{8}$/.test(form.phone)) errs.phone = 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 06, 07, 08 หรือ 09'

    if (!form.bank_name) errs.bank_name = 'กรุณาเลือกธนาคาร'

    if (!form.bank_account_no) errs.bank_account_no = 'กรุณากรอกเลขบัญชีธนาคาร'
    else if (!/^\d{10,12}$/.test(form.bank_account_no)) errs.bank_account_no = 'เลขบัญชีธนาคารต้องเป็นตัวเลข 10-12 หลัก (ห้ามมีขีด)'

    // เอกสารยืนยันตัวตนและความปลอดภัย (บังคับทุกระดับ)
    if (!idCardFile && !idCardPreview) {
      errs.identity_document = 'กรุณาอัปโหลดรูปถ่ายบัตรประชาชน'
    }

    if (!criminalFile && !criminalPreview) {
      errs.criminal_record = 'กรุณาอัปโหลดหนังสือรับรองประวัติอาชญากรรม (สตช.)'
    }

    if (!medicalCertFile && !medicalCertPreview) {
      errs.medical_certificate = 'กรุณาอัปโหลดใบรับรองแพทย์ (ตรวจโรคติดต่อร้ายแรง 5 โรค)'
    }

    // เอกสารวิชาชีพ (เฉพาะ RN)
    if (form.professional_tier === 'RN' && !licenseFile && !preview) {
      errs.license_file = 'กรุณาอัปโหลดรูปถ่ายใบประกอบวิชาชีพพยาบาล'
    }

    // ข้อมูลบัญชีผู้ใช้
    if (!form.email.trim()) errs.email = 'กรุณากรอกอีเมล'
    else if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) errs.email = 'รูปแบบอีเมลไม่ถูกต้อง'

    if (!form.password) errs.password = 'กรุณากรอกรหัสผ่าน'
    else if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) errs.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์ใหญ่และตัวเลข'

    if (!form.confirmPassword) errs.confirmPassword = 'กรุณายืนยันรหัสผ่าน'
    else if (form.confirmPassword !== form.password) errs.confirmPassword = 'รหัสผ่านไม่ตรงกัน'

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const vErrors = validate()
    if (Object.keys(vErrors).length > 0) {
      setErrors(vErrors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors({})
    setIsLoading(true)

    try {
      const { confirmPassword, ...requestData } = form
      requestData.license_file_url = preview || null
      requestData.identity_document_url = idCardPreview || null
      requestData.criminal_record_url = criminalPreview || null
      requestData.medical_certificate_url = medicalCertPreview || null
      if (!requestData.license_issue_date) requestData.license_issue_date = null
      if (!requestData.license_expire_date) requestData.license_expire_date = null

      const res = await api.post('/auth/register/nurse', requestData)

      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      setRegisteredEmail(form.email)
      setIsSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setServerError(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsLoading(false)
    }
  }

  const ErrorLabel = ({ field }) => errors[field] ? (
    <p className="text-[#DC3545] text-xs mt-1 flex items-center gap-1">
      <span className="material-symbols-outlined text-[14px]">warning</span>{errors[field]}
    </p>
  ) : null

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow flex justify-center p-6 lg:p-10">
        <div className="w-full max-w-3xl">
          <div className="bg-surface-container-lowest p-6 lg:p-10 rounded-[4px] shadow-sm border border-[#ced4da]">

            {/* Header */}
            {!isSuccess && (
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#007BFF]/10 rounded-[4px] mb-4 text-[#007BFF]">
                  <span className="material-symbols-outlined text-4xl">medical_information</span>
                </div>
                <h1 className="headline-font text-3xl font-bold mb-2">สมัครผู้ให้บริการพยาบาล</h1>
                <p className="text-tertiary text-sm sm:text-base">กรอกข้อมูลเพื่อลงทะเบียนเป็นบุคลากรทางการแพทย์</p>
              </div>
            )}

            {serverError && (
              <div className="mb-6 p-4 bg-[#DC3545]/10 border border-[#DC3545]/30 rounded-[4px] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#DC3545]">error</span>
                <p className="text-[#DC3545] text-sm font-medium">{serverError}</p>
              </div>
            )}

            {!isSuccess ? (
              <form onSubmit={handleSubmit} className="space-y-8" noValidate>

                {/* --- หมวดที่ 1: ข้อมูลส่วนตัวและวิชาชีพ --- */}
                <div className="space-y-5">
                  <div className="border-b border-outline-variant/20 pb-2">
                    <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">person</span>
                      ข้อมูลส่วนตัวและระดับวิชาชีพ
                    </h2>
                    <p className="text-xs text-tertiary">กรอกข้อมูลส่วนบุคคลและระดับวิชาชีพทางการแพทย์</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">ชื่อจริง (ภาษาไทย) <span className="text-[#DC3545]">*</span></label>
                      <input type="text" name="first_name" value={form.first_name} onChange={handleChange} placeholder="ชื่อจริง (ภาษาไทย)" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.first_name ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="first_name" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">นามสกุล (ภาษาไทย) <span className="text-[#DC3545]">*</span></label>
                      <input type="text" name="last_name" value={form.last_name} onChange={handleChange} placeholder="นามสกุล (ภาษาไทย)" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.last_name ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="last_name" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">วันเกิด <span className="text-[#DC3545]">*</span></label>
                      <input type="date" name="birth_date" value={form.birth_date} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.birth_date ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} max={getMaxBirthDate()} />
                      <p className="text-xs text-tertiary mt-1">อายุขั้นต่ำ: {getMinAge()} ปี{form.professional_tier ? ` สำหรับ ${form.professional_tier}` : ''}</p>
                      <ErrorLabel field="birth_date" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">เลขบัตรประชาชน 13 หลัก <span className="text-[#DC3545]">*</span></label>
                      <input type="text" name="national_id" value={form.national_id} onChange={handleChange} placeholder="เลขประจำตัวประชาชน 13 หลัก" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.national_id ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="national_id" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-on-surface-variant">ระดับวิชาชีพ <span className="text-[#DC3545]">*</span></label>
                      <select name="professional_tier" value={form.professional_tier} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.professional_tier ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}>
                        <option value="">-- เลือกระดับวิชาชีพ --</option>
                        <option value="RN">พยาบาลวิชาชีพ (RN) - ทำหัตถการ/ฉีดยา/ทำแผลได้</option>
                        <option value="PN">ผู้ช่วยพยาบาล (PN) - ดูแลผู้ป่วย/ช่วยกายภาพ/จัดยา</option>
                        <option value="CG">ผู้ดูแลผู้สูงอายุ (CG) - ดูแลกิจวัตรประจำวัน/เฝ้าไข้</option>
                      </select>
                      <ErrorLabel field="professional_tier" />
                      <label className="mt-3 flex items-start gap-2 text-xs text-[#45515e] cursor-pointer">
                        <input type="checkbox" name="is_retired" checked={Boolean(form.is_retired)} onChange={(e) => setForm(prev => ({ ...prev, is_retired: e.target.checked }))} className="mt-0.5 w-4 h-4 text-[#1456f0] rounded border-gray-300" />
                        <span><strong>เป็นพยาบาลข้าราชการบำนาญ/เกษียณอายุราชการ</strong><br />มีประสบการณ์วิชาชีพสูงและพร้อมรับงานดูแลผู้ป่วย</span>
                      </label>
                    </div>

                    {form.professional_tier === 'RN' && (
                      <>
                        <div className="md:col-span-2">
                          <label className="text-sm font-semibold text-on-surface-variant">เลขที่ใบประกอบวิชาชีพ <span className="text-[#DC3545]">*</span></label>
                          <input type="text" name="license_no" value={form.license_no} onChange={handleChange} placeholder="กรอกเลขที่ใบประกอบวิชาชีพ" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.license_no ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                          <ErrorLabel field="license_no" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-on-surface-variant">วันออกใบอนุญาต <span className="text-[#DC3545]">*</span></label>
                          <input type="date" name="license_issue_date" value={form.license_issue_date} onChange={handleChange} max={new Date().toISOString().split('T')[0]} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.license_issue_date ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                          <ErrorLabel field="license_issue_date" />
                        </div>
                        <div>
                          <label className="text-sm font-semibold text-on-surface-variant">วันหมดอายุใบอนุญาต <span className="text-[#DC3545]">*</span></label>
                          <input type="date" name="license_expire_date" value={form.license_expire_date} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.license_expire_date ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                          <ErrorLabel field="license_expire_date" />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">จังหวัดที่ให้บริการ <span className="text-[#DC3545]">*</span></label>
                      <select name="province" value={province} onChange={handleProvinceChange} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.service_area && !province ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}>
                        <option value="">-- เลือกจังหวัด --</option>
                        {provinces.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">อำเภอ / เขต <span className="text-[#DC3545]">*</span></label>
                      <select name="district" value={district} onChange={handleDistrictChange} disabled={!province} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.service_area && province && !district ? 'border-[#DC3545]' : 'border-[#ced4da]'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <option value="">-- เลือกอำเภอ --</option>
                        {districts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ErrorLabel field="service_area" />
                    </div>

                    {/* แผนที่ปักหมุดที่ตั้งและแสดงวงกลมรัศมีให้บริการ (10 กม.) */}
                    <div className="md:col-span-2 pt-1">
                      <LocationPicker
                        lat={form.latitude}
                        lng={form.longitude}
                        onChangeLocation={handleLocationPicked}
                        showRadiusCircle={true}
                        radiusKm={form.service_radius_km || 10}
                        onRadiusChange={(r) => setForm(prev => ({ ...prev, service_radius_km: r }))}
                        height="260px"
                        label="ปักหมุดที่ตั้งบ้าน/จุดเริ่มเดินทาง และกำหนดรัศมีให้บริการ"
                      />
                    </div>
                  </div>
                </div>

                {/* --- หมวดที่ 2: การติดต่อและการเงิน --- */}
                <div className="space-y-5">
                  <div className="border-b border-outline-variant/20 pb-2">
                    <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">account_balance</span>
                      การติดต่อและการเงิน
                    </h2>
                    <p className="text-xs text-tertiary">ระบุเบอร์โทรศัพท์ เลขบัญชีรับเงิน และรูปแบบเวลาการรับงาน</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">เบอร์โทรศัพท์ <span className="text-[#DC3545]">*</span></label>
                      <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0812345678" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.phone ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="phone" />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">ธนาคารที่รับเงินโอน <span className="text-[#DC3545]">*</span></label>
                      <select name="bank_name" value={form.bank_name} onChange={handleChange} className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all ${errors.bank_name ? 'border-[#DC3545]' : 'border-[#ced4da]'}`}>
                        <option value="">-- เลือกธนาคาร --</option>
                        {THAI_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      <ErrorLabel field="bank_name" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-on-surface-variant">เลขบัญชีธนาคาร (10-12 หลัก) <span className="text-[#DC3545]">*</span></label>
                      <input type="text" name="bank_account_no" value={form.bank_account_no} onChange={handleChange} placeholder="เฉพาะตัวเลขไม่มีขีด" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.bank_account_no ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="bank_account_no" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-sm font-semibold text-on-surface-variant">รูปแบบเวลาการรับงาน (Availability Type) <span className="text-[#DC3545]">*</span></label>
                      <select name="availability_type" value={form.availability_type} onChange={handleChange} className="w-full p-3 mt-1 bg-white border border-[#ced4da] rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all">
                        <option value="FIXED_TIME">รับงานเวลาตายตัว (Fixed Time)</option>
                        <option value="FLEXIBLE">เวลายืดหยุ่น (Flexible)</option>
                        <option value="WEEKEND_ONLY">เฉพาะวันหยุด/เสาร์-อาทิตย์ (Weekend Only)</option>
                      </select>
                      <p className="text-xs text-tertiary mt-1">รูปแบบเวลานี้จะแสดงให้ลูกค้าเห็นเมื่อค้นหาพยาบาล (สามารถแก้ไขได้ในภายหลัง)</p>
                    </div>
                  </div>
                </div>

                {/* --- หมวดที่ 3: เอกสารยืนยันตัวตนและความปลอดภัยวิชาชีพ --- */}
                <div className="space-y-4">
                  <div className="border-b border-outline-variant/20 pb-2">
                    <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">verified_user</span>
                      เอกสารยืนยันตัวตนและความปลอดภัย
                    </h2>
                    <p className="text-xs text-tertiary">อัปโหลดเอกสารระบุตัวตนและเอกสารรับรองความปลอดภัยเพื่อการตรวจสอบก่อนรับงาน</p>
                  </div>

                  {/* 1. อัปโหลดบัตรประชาชน */}
                  <div className="bg-white p-5 rounded-[4px] border border-[#ced4da]">
                    <div className="mb-3 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-[#007BFF]">badge</span>
                          รูปถ่ายบัตรประจำตัวประชาชน <span className="text-[#DC3545]">*</span>
                        </h4>
                        <p className="text-xs text-tertiary">ถ่ายให้เห็นข้อมูลด้านหน้าบัตรชัดเจน ไม่เบลอ และไม่ถูกบดบัง</p>
                      </div>
                      {idCardPreview && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span> แนบเอกสารแล้ว
                        </span>
                      )}
                    </div>
                    {idCardPreview ? (
                      <div className="border border-[#ced4da] rounded-[4px] p-4 bg-[#F8F9FA] flex flex-col sm:flex-row items-center gap-4">
                        <img src={idCardPreview} alt="ID Card" className="max-h-28 max-w-[140px] object-cover rounded-[4px] border border-gray-200" />
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <p className="text-xs text-[#222222] font-semibold">ไฟล์บัตรประชาชนพร้อมสำหรับการส่งตรวจสอบ</p>
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <button type="button" onClick={() => document.getElementById('id-card-file').click()} className="text-xs text-[#007BFF] hover:bg-[#007BFF]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#007BFF]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">autorenew</span> เปลี่ยนไฟล์
                            </button>
                            <button type="button" onClick={() => { setIdCardFile(null); setIdCardPreview(null); }} className="text-xs text-[#DC3545] hover:bg-[#DC3545]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#DC3545]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">delete</span> ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#ced4da] rounded-[4px] p-6 cursor-pointer hover:border-[#007BFF] hover:bg-[#007BFF]/5 transition-all bg-[#F8F9FA] text-center" onClick={() => document.getElementById('id-card-file').click()}>
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">add_photo_alternate</span>
                        <p className="font-semibold text-on-surface-variant text-sm">คลิกเพื่ออัปโหลดรูปภาพบัตรประชาชน</p>
                        <p className="text-xs text-tertiary mt-1">รองรับ JPG, PNG หรือ PDF (ไม่เกิน 5MB)</p>
                      </div>
                    )}
                    <input id="id-card-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleIdentityFileChange} className="hidden" />
                    {errors.identity_document && <p className="text-[#DC3545] text-xs mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{errors.identity_document}</p>}
                  </div>

                  {/* 2. หนังสือรับรองประวัติอาชญากรรม */}
                  <div className="bg-white p-5 rounded-[4px] border border-[#ced4da]">
                    <div className="mb-3 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-[#007BFF]">shield_person</span>
                          หนังสือรับรองประวัติอาชญากรรม (สำนักงานตำรวจแห่งชาติ) <span className="text-[#DC3545]">*</span>
                        </h4>
                        <p className="text-xs text-tertiary">หนังสือรับรองความประพฤติ/ประวัติอาชญากรรม เพื่อความปลอดภัยของผู้รับบริการ</p>
                      </div>
                      {criminalPreview && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span> แนบเอกสารแล้ว
                        </span>
                      )}
                    </div>
                    {criminalPreview ? (
                      <div className="border border-[#ced4da] rounded-[4px] p-4 bg-[#F8F9FA] flex flex-col sm:flex-row items-center gap-4">
                        <img src={criminalPreview} alt="Criminal Record" className="max-h-28 max-w-[140px] object-cover rounded-[4px] border border-gray-200" />
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <p className="text-xs text-[#222222] font-semibold">ไฟล์หนังสือรับรองประวัติอาชญากรรมพร้อมส่ง</p>
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <button type="button" onClick={() => document.getElementById('criminal-file').click()} className="text-xs text-[#007BFF] hover:bg-[#007BFF]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#007BFF]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">autorenew</span> เปลี่ยนไฟล์
                            </button>
                            <button type="button" onClick={() => { setCriminalFile(null); setCriminalPreview(null); }} className="text-xs text-[#DC3545] hover:bg-[#DC3545]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#DC3545]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">delete</span> ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#ced4da] rounded-[4px] p-6 cursor-pointer hover:border-[#007BFF] hover:bg-[#007BFF]/5 transition-all bg-[#F8F9FA] text-center" onClick={() => document.getElementById('criminal-file').click()}>
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">fingerprint</span>
                        <p className="font-semibold text-on-surface-variant text-sm">คลิกเพื่ออัปโหลดหนังสือรับรองประวัติอาชญากรรม</p>
                        <p className="text-xs text-tertiary mt-1">รองรับ JPG, PNG หรือ PDF (ไม่เกิน 5MB)</p>
                      </div>
                    )}
                    <input id="criminal-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleCriminalFileChange} className="hidden" />
                    {errors.criminal_record && <p className="text-[#DC3545] text-xs mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{errors.criminal_record}</p>}
                  </div>

                  {/* 3. ใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง 5 โรค */}
                  <div className="bg-white p-5 rounded-[4px] border border-[#ced4da]">
                    <div className="mb-3 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-[#007BFF]">medical_services</span>
                          ใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง 5 โรค <span className="text-[#DC3545]">*</span>
                        </h4>
                        <p className="text-xs text-tertiary">อายุเอกสารไม่เกิน 1-3 เดือน (ตรวจวัณโรค, โรคเรื้อน, เท้าช้าง, สารเสพติด, พิษสุราเรื้อรัง)</p>
                      </div>
                      {medicalCertPreview && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                          <span className="material-symbols-outlined text-[13px]">check_circle</span> แนบเอกสารแล้ว
                        </span>
                      )}
                    </div>
                    {medicalCertPreview ? (
                      <div className="border border-[#ced4da] rounded-[4px] p-4 bg-[#F8F9FA] flex flex-col sm:flex-row items-center gap-4">
                        <img src={medicalCertPreview} alt="Medical Certificate" className="max-h-28 max-w-[140px] object-cover rounded-[4px] border border-gray-200" />
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <p className="text-xs text-[#222222] font-semibold">ไฟล์ใบรับรองแพทย์ 5 โรคพร้อมส่ง</p>
                          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                            <button type="button" onClick={() => document.getElementById('medical-cert-file').click()} className="text-xs text-[#007BFF] hover:bg-[#007BFF]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#007BFF]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">autorenew</span> เปลี่ยนไฟล์
                            </button>
                            <button type="button" onClick={() => { setMedicalCertFile(null); setMedicalCertPreview(null); }} className="text-xs text-[#DC3545] hover:bg-[#DC3545]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#DC3545]/30 transition-all flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">delete</span> ลบ
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-[#ced4da] rounded-[4px] p-6 cursor-pointer hover:border-[#007BFF] hover:bg-[#007BFF]/5 transition-all bg-[#F8F9FA] text-center" onClick={() => document.getElementById('medical-cert-file').click()}>
                        <span className="material-symbols-outlined text-4xl text-outline mb-2">clinical_notes</span>
                        <p className="font-semibold text-on-surface-variant text-sm">คลิกเพื่ออัปโหลดใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง 5 โรค</p>
                        <p className="text-xs text-tertiary mt-1">รองรับ JPG, PNG หรือ PDF (ไม่เกิน 5MB)</p>
                      </div>
                    )}
                    <input id="medical-cert-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleMedicalFileChange} className="hidden" />
                    {errors.medical_certificate && <p className="text-[#DC3545] text-xs mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{errors.medical_certificate}</p>}
                  </div>

                  {/* 4. อัปโหลดใบอนุญาตประกอบวิชาชีพ (เฉพาะพยาบาลวิชาชีพ RN) */}
                  {form.professional_tier === 'RN' && (
                    <div className="bg-white p-5 rounded-[4px] border border-[#ced4da]">
                      <div className="mb-3 flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-on-surface text-sm flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-[#007BFF]">assignment_ind</span>
                            ใบอนุญาตประกอบวิชาชีพพยาบาล <span className="text-[#DC3545]">*</span>
                          </h4>
                          <p className="text-xs text-tertiary">เลขที่ใบอนุญาต: <span className="font-semibold text-on-surface">{form.license_no || '-'}</span></p>
                        </div>
                        {preview && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 border border-emerald-200">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span> แนบเอกสารแล้ว
                          </span>
                        )}
                      </div>
                      {preview ? (
                        <div className="border border-[#ced4da] rounded-[4px] p-4 bg-[#F8F9FA] flex flex-col sm:flex-row items-center gap-4">
                          <img src={preview} alt="License" className="max-h-28 max-w-[140px] object-cover rounded-[4px] border border-gray-200" />
                          <div className="flex-1 space-y-2 text-center sm:text-left">
                            <p className="text-xs text-[#222222] font-semibold">ไฟล์ใบประกอบวิชาชีพพร้อมสำหรับการส่งตรวจสอบ</p>
                            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                              <button type="button" onClick={() => document.getElementById('license-file').click()} className="text-xs text-[#007BFF] hover:bg-[#007BFF]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#007BFF]/30 transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">autorenew</span> เปลี่ยนไฟล์
                              </button>
                              <button type="button" onClick={() => { setLicenseFile(null); setPreview(null); }} className="text-xs text-[#DC3545] hover:bg-[#DC3545]/10 font-bold px-3 py-1.5 rounded-[4px] border border-[#DC3545]/30 transition-all flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">delete</span> ลบ
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="border border-dashed border-[#ced4da] rounded-[4px] p-6 cursor-pointer hover:border-[#007BFF] hover:bg-[#007BFF]/5 transition-all bg-[#F8F9FA] text-center" onClick={() => document.getElementById('license-file').click()}>
                          <span className="material-symbols-outlined text-4xl text-outline mb-2">add_photo_alternate</span>
                          <p className="font-semibold text-on-surface-variant text-sm">คลิกเพื่ออัปโหลดรูปภาพใบอนุญาตประกอบวิชาชีพ</p>
                          <p className="text-xs text-tertiary mt-1">รองรับ JPG, PNG หรือ PDF (ไม่เกิน 5MB)</p>
                        </div>
                      )}
                      <input id="license-file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleFileChange} className="hidden" />
                      {errors.license_file && <p className="text-[#DC3545] text-xs mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{errors.license_file}</p>}
                    </div>
                  )}
                </div>

                {/* --- หมวดที่ 4: ข้อมูลบัญชีผู้ใช้ --- */}
                <div className="space-y-5">
                  <div className="border-b border-outline-variant/20 pb-2">
                    <h2 className="headline-font text-lg font-bold text-primary flex items-center gap-2">
                      <span className="material-symbols-outlined">lock</span>
                      ข้อมูลบัญชีผู้ใช้
                    </h2>
                    <p className="text-xs text-tertiary">กำหนดอีเมลและรหัสผ่านสำหรับเข้าสู่ระบบ</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-on-surface-variant">อีเมล (Username) <span className="text-[#DC3545]">*</span></label>
                      <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="example@email.com" className={`w-full p-3 mt-1 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.email ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                      <ErrorLabel field="email" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="text-sm font-semibold text-on-surface-variant">รหัสผ่าน <span className="text-[#DC3545]">*</span></label>
                        <div className="relative mt-1">
                          <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} placeholder="อย่างน้อย 8 ตัวอักษร" className={`w-full p-3 pr-10 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.password ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-[#007BFF]"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        <ErrorLabel field="password" />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-on-surface-variant">ยืนยันรหัสผ่าน <span className="text-[#DC3545]">*</span></label>
                        <div className="relative mt-1">
                          <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="กรอกรหัสผ่านอีกครั้ง" className={`w-full p-3 pr-10 bg-white border rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#007BFF] focus:ring-offset-2 transition-all placeholder:text-gray-400 ${errors.confirmPassword ? 'border-[#DC3545]' : 'border-[#ced4da]'}`} />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-[#007BFF]"
                          >
                            <span className="material-symbols-outlined text-lg">
                              {showConfirmPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        <ErrorLabel field="confirmPassword" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white rounded-[4px] headline-font font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        กำลังสมัครสมาชิก...
                      </span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span>ยืนยันการสมัครสมาชิกพยาบาล</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Success Screen */
              <div className="text-center py-10 max-w-md mx-auto">
                <span className="material-symbols-outlined text-[#28A745] text-7xl mb-4">task_alt</span>
                <h2 className="headline-font text-2xl font-bold text-on-surface mb-2">ลงทะเบียนเสร็จสมบูรณ์</h2>
                <p className="text-tertiary mb-8">
                  บัญชี <span className="font-semibold text-on-surface">{registeredEmail || form.email}</span> ถูกสร้างเรียบร้อยแล้ว<br />
                  {form.professional_tier === 'RN' ? (
                    <>ขณะนี้กำลังอยู่ระหว่างการ <span className="text-yellow-600 font-bold">รอตรวจสอบและยืนยัน</span> ใบอนุญาตจากผู้ดูแลระบบ</>
                  ) : (
                    <>ขณะนี้กำลังอยู่ระหว่างการ <span className="text-yellow-600 font-bold">รอตรวจสอบยืนยันตัวตน</span> จากผู้ดูแลระบบ</>
                  )}
                </p>
                <button onClick={() => { window.location.href = '/nurse/requests' }} className="w-full bg-[#007BFF] hover:bg-[#0069d9] active:translate-y-[1px] hover:shadow-sm text-white py-3 rounded-[4px] font-semibold transition-all">
                  เข้าสู่หน้าจัดการข้อมูล (Dashboard)
                </button>
              </div>
            )}

            {!isSuccess && (
              <div className="mt-8 pt-6 border-t border-outline-variant/10 text-center space-y-2">
                <p className="text-tertiary text-sm">
                  มีบัญชีอยู่แล้ว?{' '}
                  <a className="text-[#007BFF] font-bold ml-1 hover:underline headline-font" href="/login">
                    เข้าสู่ระบบที่นี่
                  </a>
                </p>
                <p className="text-tertiary text-xs">
                  ต้องการสมัครสมาชิกสำหรับผู้รับบริการ?{' '}
                  <a className="text-[#007BFF] font-bold ml-1 hover:underline headline-font" href="/register">
                    สมัครสมาชิกผู้รับบริการ
                  </a>
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}
