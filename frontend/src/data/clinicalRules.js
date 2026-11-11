export const SYMPTOM_OPTIONS = [
  { label: 'ต้องการคนช่วยพยุงเดิน/ฝึกกายภาพ', value: 'rehab_need' },
  { label: 'มีภาวะหลงลืม/สมองเสื่อม/อัลไซเมอร์', value: 'dementia' },
  { label: 'มีแผลเรื้อรัง/แผลกดทับ/แผลผ่าตัด', value: 'wound_care' },
  { label: 'ต้องให้อาหารทางสายยาง', value: 'tube_feeding' },
  { label: 'ต้องสวนปัสสาวะ/ดูแลสายสวน', value: 'urinary_catheter' },
  { label: 'ต้องดูดเสมหะ/มีท่อเจาะคอ', value: 'suction_needed' },
  { label: 'ใช้เครื่องช่วยหายใจที่บ้าน', value: 'ventilator_user' },
  { label: 'ผู้ป่วยโรคมะเร็ง (ต้องการการดูแลประคับประคอง)', value: 'oncology_care' },
  { label: 'ผู้ป่วยโรคหลอดเลือดสมอง (Stroke)', value: 'stroke_care' },
  { label: 'ภาวะสับสนเฉียบพลัน เพ้อ โวยวาย (Delirium)', value: 'delirium' },
  { label: 'ภาวะซึมเศร้า แยกตัว ไม่ยอมทานข้าว', value: 'depression' },
  { label: 'มีภาวะกลืนลำบาก / สำลักอาหารหรือน้ำบ่อย', value: 'choking_risk' },
  { label: 'ต้องการคนพาไปพบแพทย์ตามนัด (Hospital Escort)', value: 'hospital_escort' },
  { label: 'ต้องการคนจัดและบริหารยาประจำสัปดาห์', value: 'medication_management' },
  { label: 'ผู้ป่วยติดเตียง / กลั้นขับถ่ายไม่ได้ / ต้องพลิกตัวทุก 2 ชม.', value: 'bedridden_hygiene' },
  { label: 'มีภาวะออกซิเจนต่ำ / ต้องพ่นยา / ให้ออกซิเจนที่บ้าน', value: 'oxygen_dependent' },
  { label: 'ผู้ป่วยเบาหวาน เจาะน้ำตาล DTX และฉีดอินซูลิน', value: 'insulin_injection' },
  { label: 'มีสายระบายเลือด/น้ำเหลือง (Drainage Tube)', value: 'drainage_care' },
  { label: 'มีทวารเทียมทางหน้าท้อง (Colostomy Bag)', value: 'ostomy_care' },
  { label: 'อื่นๆ (ระบุอาการหรือข้อควรระวังเพิ่มเติม)', value: 'other' }
]

export const SYMPTOM_GROUPS = [
  {
    title: 'หัตถการและอุปกรณ์การแพทย์',
    subtitle: 'อาการหรืออุปกรณ์ที่อาจต้องใช้ RN',
    icon: 'medical_services',
    values: ['wound_care', 'tube_feeding', 'urinary_catheter', 'suction_needed', 'ventilator_user', 'oxygen_dependent', 'insulin_injection', 'drainage_care', 'ostomy_care', 'choking_risk']
  },
  {
    title: 'โรคและภาวะเฉพาะทาง',
    subtitle: 'โรคเรื้อรัง ระบบประสาท และสุขภาพจิต',
    icon: 'neurology',
    values: ['stroke_care', 'dementia', 'delirium', 'depression', 'oncology_care']
  },
  {
    title: 'ฟื้นฟู กิจวัตร และสุขอนามัย',
    subtitle: 'การช่วยเหลือในชีวิตประจำวัน',
    icon: 'accessibility_new',
    values: ['rehab_need', 'bedridden_hygiene', 'medication_management']
  },
  {
    title: 'ความช่วยเหลือเพิ่มเติม',
    subtitle: 'การเดินทางและรายละเอียดอื่นๆ',
    icon: 'support_agent',
    values: ['hospital_escort', 'other']
  }
]

export const CLINICAL_KEYWORDS = {
  rnEquipment: [
    'เครื่องช่วยหายใจ', 'ventilator', 'bipap',
    'ท่อเจาะคอ', 'tracheostomy',
    'สายให้อาหาร', 'tube',
    'สายสวนปัสสาวะ', 'catheter',
    'ล้างไต', 'capd'
  ],
  rnComplaints: [
    'tube_feeding', 'urinary_catheter', 'suction_needed', 'ventilator_user',
    'wound_care', 'oncology_care', 'choking_risk', 'delirium',
    'oxygen_dependent', 'insulin_injection', 'drainage_care', 'ostomy_care',
    'แผลเรื้อรัง', 'แผลกดทับ', 'แผลผ่าตัด',
    'สายยาง', 'สายสวน', 'ดูดเสมหะ', 'มะเร็ง',
    'กลืนลำบาก', 'สำลัก', 'เพ้อ', 'ออกซิเจน', 'อินซูลิน', 'สายระบาย', 'ทวารเทียม'
  ],
  rnCustomKeywords: [
    'แผล', 'เย็บ', 'ตัดไหม', 'ล้างแผล', 'สาย', 'ท่อ', 'เจาะคอ', 'ดูดเสมหะ', 'พ่นยา',
    'ออกซิเจน', 'อินซูลิน', 'ฉีดยา', 'เจาะเลือด', 'น้ำเกลือ', 'สารน้ำ', 'ล้างไต', 'ทวารเทียม',
    'wound', 'catheter', 'suction', 'insulin', 'injection', 'oxygen'
  ],
  pnComplaints: [
    'rehab_need', 'stroke_care', 'medication_management', 'hospital_escort',
    'กายภาพ', 'พยุงเดิน', 'หลอดเลือดสมอง', 'stroke', 'จัดยา'
  ],
  pnCustomKeywords: ['กายภาพ', 'พยุงเดิน', 'อ่อนแรง', 'อัมพฤกษ์', 'จัดยา', 'ฝึกเดิน', 'rehab']
}
