import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    if (token && userStr) {
      setIsLoggedIn(true)
      try {
        const user = JSON.parse(userStr)
        setUserRole(user.role ? user.role.toLowerCase() : '')
      } catch (e) {
        console.error('Failed to parse user session:', e)
      }
    } else {
      setIsLoggedIn(false)
      setUserRole('')
    }
  }, [location.pathname])

  // ปิดเมนูมือถืออัตโนมัติเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  // กำหนดข้อมูล Logo และเมนูตาม Role
  let brand = {
    title: 'Smart Elder Care',
    badge: 'Home Care Platform',
    badgeColor: 'bg-blue-50 text-[#1456f0]',
    icon: 'health_and_safety'
  }

  let navItems = [
    { title: 'ค้นหาพยาบาล', path: '/member/search-nurse' },
    { title: 'บริการของเรา', path: '/#services' },
    { title: 'วิธีใช้งาน', path: '/#how-it-works' },
    { title: 'ทำไมต้องเรา', path: '/#why-us' }
  ]

  const isMember = userRole === 'member' || userRole === 'patient' || (isLoggedIn && !['admin', 'nurse'].includes(userRole))
  const isNurse = userRole === 'nurse'
  const isAdmin = userRole === 'admin'

  if (isMember) {
    brand = {
      title: 'Smart Elder Care',
      badge: 'สมาชิกผู้รับบริการ',
      badgeColor: 'bg-blue-50 text-[#1456f0]',
      icon: 'health_and_safety'
    }
    navItems = [
      { title: 'ค้นหาพยาบาล', path: '/member/search-nurse' },
      { title: 'คำขอของฉัน', path: '/member/service-status' },
      { title: 'ผู้ป่วยในดูแล', path: '/member/patients' },
      { title: 'โปรไฟล์', path: '/member/profile' }
    ]
  } else if (isNurse) {
    brand = {
      title: 'Nurse Portal',
      badge: 'พยาบาล / ผู้ดูแล',
      badgeColor: 'bg-emerald-50 text-emerald-700',
      icon: 'medical_services'
    }
    navItems = [
      { title: 'รายการคำขอ', path: '/nurse/requests' },
      { title: 'ประวัติการทำงาน', path: '/nurse/history' },
      { title: 'ข้อมูลวิชาชีพ/เวร', path: '/nurse/profile' },
      { title: 'เบิกค่าบริการ', path: '/nurse/fees' }
    ]
  } else if (isAdmin) {
    brand = {
      title: 'Admin Portal',
      badge: 'ผู้ดูแลระบบ (Admin)',
      badgeColor: 'bg-purple-50 text-purple-700',
      icon: 'admin_panel_settings'
    }
    navItems = [
      { title: 'ตรวจสอบผู้สมัคร', path: '/admin/verify' },
      { title: 'จัดการบัญชี', path: '/admin/accounts' },
      { title: 'รายงานการเงิน', path: '/admin/reports' }
    ]
  }

  const isPathActive = (path) => {
    if (path.startsWith('/#')) return false
    return location.pathname.startsWith(path)
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-[#e5e7eb] shadow-purple-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex justify-between items-center">
        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-2 group cursor-pointer select-none">
          <div className="w-9 h-9 rounded-full bg-[#1456f0] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-lg">{brand.icon}</span>
          </div>
          <div>
            <span className="text-lg font-bold text-[#222222] headline-font block leading-tight">{brand.title}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block ${brand.badgeColor}`}>
              {brand.badge}
            </span>
          </div>
        </a>

        {/* Desktop Navigation Pills */}
        <nav className="hidden md:flex gap-1.5 items-center bg-gray-50/80 p-1.5 rounded-full border border-gray-200/60">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={
                isPathActive(item.path)
                  ? "bg-[#1456f0] text-white shadow-sm font-semibold px-4 py-2 rounded-full text-xs transition-all"
                  : "text-[#45515e] hover:text-[#1456f0] hover:bg-gray-100/70 font-medium px-4 py-2 rounded-full text-xs transition-all"
              }
            >
              {item.title}
            </a>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-2">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 px-4 py-2 rounded-full font-semibold transition-all text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              ออกจากระบบ
            </button>
          ) : (
            <>
              <a
                href="/login"
                className="border border-gray-200 text-[#222222] hover:bg-gray-50 px-4 py-2 rounded-full font-semibold transition-all text-xs"
              >
                เข้าสู่ระบบ
              </a>
              <a
                href="/register"
                className="bg-[#1456f0] text-white hover:bg-[#0f45c2] hover:shadow-purple-sm active:translate-y-[1px] px-4 py-2 rounded-full font-semibold transition-all text-xs"
              >
                ลงทะเบียนผู้ใช้
              </a>
              <a
                href="/register/nurse"
                className="border border-[#ea5ec1] text-[#ea5ec1] hover:bg-pink-50 px-3.5 py-2 rounded-full text-xs font-semibold transition-all"
              >
                สำหรับพยาบาล
              </a>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="border border-rose-200 text-rose-600 p-2 rounded-full text-xs flex items-center justify-center sm:hidden"
              title="ออกจากระบบ"
            >
              <span className="material-symbols-outlined text-base">logout</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#45515e] hover:bg-gray-100 border border-gray-200 transition-colors"
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div id="mobile-navigation" className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-md px-5 py-4 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-lg">
          <div className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={
                  isPathActive(item.path)
                    ? "bg-[#1456f0] text-white font-semibold px-4 py-2.5 rounded-xl text-sm"
                    : "text-[#45515e] hover:bg-gray-50 font-medium px-4 py-2.5 rounded-xl text-sm"
                }
              >
                {item.title}
              </a>
            ))}
          </div>

          {!isLoggedIn && (
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
              <a
                href="/login"
                className="w-full text-center border border-gray-200 text-[#222222] py-2.5 rounded-xl font-semibold text-sm"
              >
                เข้าสู่ระบบ
              </a>
              <a
                href="/register"
                className="w-full text-center bg-[#1456f0] text-white py-2.5 rounded-xl font-semibold text-sm shadow-sm"
              >
                ลงทะเบียนผู้ใช้
              </a>
              <a
                href="/register/nurse"
                className="w-full text-center border border-[#ea5ec1] text-[#ea5ec1] py-2.5 rounded-xl font-semibold text-sm"
              >
                สมัครเป็นพยาบาล / ผู้ดูแล
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
