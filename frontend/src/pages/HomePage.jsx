import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import thaiLocations from '../data/thaiLocations.js'
import Navbar from '../components/Navbar.jsx'

export default function HomePage() {
  const navigate = useNavigate()
  const [province, setProvince] = useState('')
  // เติม State ให้ตรงกับ SearchNursePage
  const [serviceGroup, setServiceGroup] = useState('')

  const provinces = Object.keys(thaiLocations)

  const handleSearch = (e) => {
    e.preventDefault()
    // ในหน้าแรกเราค้นหาด้วยบริการ (serviceGroup) แทนความชำนาญ (specialty)
    navigate(`/member/search-nurse?area=${encodeURIComponent(province)}&specialty=${encodeURIComponent(serviceGroup)}`)
  }

  return (
    <div className="bg-white text-[#222222] min-h-[100dvh] flex flex-col font-body scroll-smooth">
      {/* Navbar */}
      <Navbar />

      <main>
        {/* Hero Section */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden flex-grow flex items-center">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] bg-blue-100/50 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[450px] h-[450px] bg-pink-100/40 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-[#1456f0] font-bold text-xs mb-6 border border-blue-200 shadow-2xs">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              ดูแลคนที่คุณรัก ด้วยทีมพยาบาลและผู้ดูแลคนไทย
            </div>
            <h1 className="headline-font text-4xl lg:text-6xl font-bold leading-[1.15] mb-6 text-[#222222]">
              อุ่นใจทุกวัน ให้คนที่คุณรักได้รับการดูแล <span className="text-[#1456f0]">ถึงบ้าน</span>
            </h1>
            <p className="text-base lg:text-lg text-[#45515e] mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              ค้นหาพยาบาลวิชาชีพและผู้ดูแลคนไทยที่เหมาะกับครอบครัวคุณ ตรวจสอบประวัติและใบอนุญาต พร้อมบริการดูแลผู้สูงอายุและผู้ป่วยอย่างใส่ใจในพื้นที่ของคุณ
            </p>

            {/* Quick Search Box - MiniMax Card Style */}
            <form onSubmit={handleSearch} className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-purple-card border border-gray-100 flex flex-col md:flex-row gap-2.5 max-w-2xl mx-auto lg:mx-0">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">location_on</span>
                <label htmlFor="home-province" className="sr-only">จังหวัด</label>
                <select
                  id="home-province"
                  name="province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-xs font-medium text-[#222222] transition-all appearance-none"
                >
                  <option value="">-- ทุกจังหวัด --</option>
                  {provinces.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">health_and_safety</span>
                <label htmlFor="home-service-group" className="sr-only">ประเภทบริการ</label>
                <select
                  id="home-service-group"
                  name="serviceGroup"
                  value={serviceGroup}
                  onChange={(e) => setServiceGroup(e.target.value)}
                  className="w-full bg-gray-50/70 border border-gray-200 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#1456f0] text-xs font-medium text-[#222222] transition-all appearance-none"
                >
                  <option value="">-- บริการทั้งหมด (9 รายการ) --</option>
                  <option value="เฝ้าไข้ดูแลทั่วไป">เฝ้าไข้ดูแลทั่วไป</option>
                  <option value="ดูแลผู้สูงอายุ">ดูแลผู้สูงอายุ</option>
                  <option value="ดูแลผู้ป่วยติดเตียง / สุขอนามัย">ดูแลผู้ป่วยติดเตียง / สุขอนามัย</option>
                  <option value="กายภาพบำบัด / ฟื้นฟูเบื้องต้น">กายภาพบำบัด / ฟื้นฟูเบื้องต้น</option>
                  <option value="เจาะเลือด / ให้น้ำเกลือ">เจาะเลือด / ให้น้ำเกลือ</option>
                  <option value="ดูแลแผลกดทับ / แผลผ่าตัด">ดูแลแผลกดทับ / แผลผ่าตัด</option>
                  <option value="เปลี่ยนสายให้อาหาร / สายสวน">เปลี่ยนสายให้อาหาร / สายสวน</option>
                  <option value="เจาะน้ำตาล DTX และฉีดอินซูลิน">เจาะน้ำตาล DTX และฉีดอินซูลิน</option>
                  <option value="ดูแลท่อเจาะคอ / พ่นยา / ออกซิเจน">ดูแลท่อเจาะคอ / พ่นยา / ออกซิเจน</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[#1456f0] hover:bg-[#0f45c2] active:scale-[0.98] text-white px-7 py-2.5 rounded-full font-semibold text-xs transition-all flex justify-center items-center gap-1.5 shadow-purple-sm shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">search</span> ค้นหาพยาบาล
              </button>
            </form>
            <p className="text-xs text-[#45515e] mt-3.5">
              เป็นพยาบาลวิชาชีพหรือผู้ดูแล? <a href="/register/nurse" className="text-[#1456f0] font-bold hover:underline">สมัครร่วมงานกับเรา</a>
            </p>
          </div>

          {/* Hero Image & Floating Cards */}
          <div className="relative hidden lg:block z-10">
            <div className="relative rounded-3xl overflow-hidden shadow-purple-card border border-gray-100">
              <img
                src="/hero-thai-nurse.jpg"
                alt="พยาบาลดูแลผู้สูงอายุชาวไทยอย่างอบอุ่น"
                className="object-cover h-[480px] w-full"
              />
            </div>

            {/* Floating Card 1: Verified Nurse */}
            <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-purple-hover border border-gray-100 flex items-center gap-3">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <div>
                <p className="font-bold text-[#222222] text-sm leading-tight">ตรวจสอบประวัติเข้มงวด 100%</p>
                <p className="text-xs text-[#45515e] mt-0.5">ใบประกอบวิชาชีพ • ประวัติอาชญากรรม • ใบรับรองแพทย์</p>
              </div>
            </div>

            {/* Floating Card 2: Clinical Match */}
            <div className="absolute -top-4 -right-4 bg-white py-2.5 px-4 rounded-full shadow-purple-sm border border-gray-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-[#222222]">พยาบาลพร้อมดูแลในพื้นที่ของคุณ</span>
            </div>
          </div>
        </div>
      </section>

        {/* Services Section - MiniMax Colorful Cards */}
        <section id="services" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1456f0] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
              Comprehensive Home Care
            </span>
            <h2 className="headline-font text-3xl lg:text-4xl font-bold mb-3 text-[#222222]">บริการที่ครอบคลุมทุกความต้องการ</h2>
            <p className="text-[#45515e] text-sm max-w-2xl mx-auto">
              ดูแลตั้งแต่กิจวัตรประจำวัน กายภาพบำบัด ไปจนถึงหัตถการทางการแพทย์โดยพยาบาลวิชาชีพ
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: 'elderly',
                color: 'from-blue-500 to-indigo-600',
                badge: 'CG / PN',
                badgeClass: 'bg-green-50 text-green-700 border-green-200',
                title: 'ดูแลผู้สูงอายุและกิจวัตร',
                desc: 'เช็ดตัว อาบน้ำ ป้อนอาหาร พยุงเดิน จัดยาประจำสัปดาห์ และเฝ้าไข้ดูแลใกล้ชิด',
                actionText: 'เริ่มต้น 700฿ / กะ'
              },
              {
                icon: 'healing',
                color: 'from-pink-500 to-rose-600',
                badge: 'RN เท่านั้น',
                badgeClass: 'bg-red-50 text-red-700 border-red-200',
                title: 'ดูแลบาดแผลและหัตถการ',
                desc: 'ทำแผลกดทับ แผลผ่าตัด แผลเบาหวาน ตัดไหม ฉีดอินซูลิน เปลี่ยนสายยาง และท่อเจาะคอ',
                actionText: 'เริ่มต้น 600 - 1,000฿'
              },
              {
                icon: 'directions_walk',
                color: 'from-amber-500 to-orange-600',
                badge: 'PN / RN',
                badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                title: 'กายภาพบำบัดและฟื้นฟู',
                desc: 'ดัดข้อต่อ ฝึกยืนเดิน บริหารปอด ฝึกกลืน ฟื้นฟูผู้ป่วยโรคหลอดเลือดสมอง (Stroke)',
                actionText: 'เริ่มต้น 1,000฿ / กะ'
              },
            ].map(s => (
              <div
                key={s.title}
                className="bg-white p-8 rounded-3xl shadow-purple-card border border-gray-100 hover:shadow-purple-hover hover:-translate-y-1 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform" style={{ background: s.icon === 'elderly' ? '#1456f0' : s.icon === 'healing' ? '#ea5ec1' : '#f59e0b' }}>
                      <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${s.badgeClass}`}>
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="headline-font text-xl font-bold mb-2 text-[#222222]">{s.title}</h3>
                  <p className="text-[#45515e] text-xs leading-relaxed mb-6">{s.desc}</p>
                </div>
                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1456f0]">{s.actionText}</span>
                  <a
                    href="/member/search-nurse"
                    className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#1456f0] group-hover:text-white text-gray-400 flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* How it works Section */}
        <section id="how-it-works" className="py-20 bg-gray-50/60 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1456f0] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
              Easy 3 Steps
            </span>
            <h2 className="headline-font text-3xl font-bold mb-3 text-[#222222]">วิธีใช้งานแสนง่าย</h2>
            <p className="text-[#45515e] text-sm">จองบริการพยาบาลวิชาชีพได้ใน 3 ขั้นตอน</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', icon: 'person_search', title: 'ระบุผู้ป่วยและวันเวลา', desc: 'เลือกอาการผู้ป่วยและช่วงเวลาที่ต้องการ ระบบจะช่วยประเมินระดับพยาบาลที่เหมาะสม' },
              { step: '02', icon: 'verified', title: 'เลือกพยาบาลที่ตรงใจ', desc: 'ดูประวัติ วุฒิการศึกษา ความชำนาญ และระยะทางจากบ้านคุณ พร้อมตรวจสอบเวร รพ. จริง' },
              { step: '03', icon: 'health_and_safety', title: 'รับการดูแลถึงบ้าน', desc: 'พยาบาลเข้าให้บริการตามวันเวลา พร้อมบันทึกสัญญาณชีพและรายงานผลผ่านระบบ' }
            ].map(item => (
              <div key={item.step} className="bg-white p-7 rounded-3xl shadow-purple-sm border border-gray-100 relative">
                <div className="text-3xl font-bold headline-font text-gray-200 mb-4">{item.step}</div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1456f0] flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-bold text-base text-[#222222] mb-1.5">{item.title}</h3>
                <p className="text-xs text-[#45515e] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* Why Choose Us Section */}
        <section id="why-us" className="py-20 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Benefits */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1456f0] bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-block mb-3">
                Safety & Trust Standard
              </span>
              <h2 className="headline-font text-3xl lg:text-4xl font-bold mb-4 text-[#222222]">
                ทำไมครอบครัวไทยจึงไว้วางใจเลือกใช้บริการกับเรา
              </h2>
              <p className="text-[#45515e] text-sm leading-relaxed mb-8">
                เพราะความปลอดภัยและสุขภาพของคนที่คุณรักคือสิ่งสำคัญที่สุด เราจึงคัดกรองบุคลากรทางการแพทย์และผู้ดูแลอย่างเข้มงวดที่สุดในทุกขั้นตอน
              </p>

              <div className="space-y-4">
                {[
                  {
                    icon: 'verified_user',
                    title: 'ตรวจสอบใบอนุญาตและประวัติอาชญากรรม 100%',
                    desc: 'ตรวจสอบเลขที่ใบประกอบวิชาชีพพยาบาล และต้องมีหนังสือรับรองประวัติอาชญากรรมจากสำนักงานตำรวจแห่งชาติ (สตช.)'
                  },
                  {
                    icon: 'medical_services',
                    title: 'ตรวจสุขภาพปลอดโรคติดต่อร้ายแรง 5 โรค',
                    desc: 'ผู้ให้บริการทุกคนต้องแนบใบรับรองแพทย์ตรวจโรคติดต่อร้ายแรง เพื่อสุขอนามัยที่ดีของผู้ป่วยและคนในบ้าน'
                  },
                  {
                    icon: 'pin_drop',
                    title: 'จับคู่พยาบาลในพื้นที่ใกล้บ้าน รวดเร็ว ทันใจ',
                    desc: 'ระบบค้นหาตามระยะทางจริงจากบ้านคุณ ทำให้พยาบาลสามารถเดินทางมาดูแลได้อย่างสะดวกและตรงเวลา'
                  },
                  {
                    icon: 'clinical_notes',
                    title: 'รายงานผลการดูแลและสัญญาณชีพผ่านระบบ',
                    desc: 'บันทึกความดัน ชีพจร ระดับน้ำตาล และอาการสำคัญ ให้ญาติสามารถเปิดดูและติดตามอาการได้ตลอดเวลา'
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-gray-50 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1456f0] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#222222] mb-0.5">{item.title}</h3>
                      <p className="text-xs text-[#45515e] leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Image with Stats */}
            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-purple-card border border-gray-100 relative">
                <img
                  src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1000&q=80"
                  alt="การดูแลผู้สูงอายุอย่างอบอุ่นและใส่ใจ"
                  className="object-cover h-[460px] w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <p className="text-xs uppercase tracking-wider font-semibold text-blue-200 mb-1">มาตรฐานการดูแลด้วยหัวใจ</p>
                  <p className="text-lg font-bold">ดูแลด้วยความเชี่ยวชาญ อบอุ่นเสมือนคนในครอบครัว</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#181e25] text-white py-14 mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-8 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-[#1456f0] text-white flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-lg">health_and_safety</span>
              </div>
              <div>
                <span className="text-lg font-bold headline-font block">Smart Elder Care</span>
                <span className="text-[11px] text-gray-400">ระบบดูแลผู้ป่วยนอกสถานที่โดยเจ้าหน้าที่ทางการแพทย์</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#services" className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors">บริการ</a>
              <a href="#how-it-works" className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors">วิธีใช้งาน</a>
              <a href="/login" className="text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors">เข้าสู่ระบบ</a>
              <a href="/register/nurse" className="text-xs text-[#ea5ec1] hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors">สำหรับพยาบาล</a>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
            <p>© 2026 Smart Elder Care Platform. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-emerald-400">verified</span>
              มาตรฐานวิชาชีพพยาบาลตามกฎหมายไทย
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
