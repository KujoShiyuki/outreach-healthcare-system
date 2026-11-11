import { Navigate, useLocation } from 'react-router-dom'

/**
 * Route guard สำหรับตรวจสอบ Token และ Role ก่อนเรนเดอร์หน้าเว็บ
 * @param {Array<string>} allowedRoles - บทบาทที่อนุญาต เช่น ['member', 'patient'], ['nurse'], ['admin']
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  // หากไม่มี Token ให้ส่งไปหน้า Login ทันที
  if (!token || !userStr) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  let userRole = ''
  try {
    const user = JSON.parse(userStr)
    userRole = (user.role || '').toLowerCase()
  } catch (e) {
    localStorage.clear()
    return <Navigate to="/login" replace />
  }

  // หากกำหนด allowedRoles และ Role ปัจจุบันไม่อยู่ในรายการที่อนุญาต
  if (allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase())
    // สมาชิกทั่วไปยอมรับทั้ง member และ patient
    const isMemberOrPatient = (userRole === 'member' || userRole === 'patient') &&
      (normalizedAllowed.includes('member') || normalizedAllowed.includes('patient'))

    if (!normalizedAllowed.includes(userRole) && !isMemberOrPatient) {
      // Redirect ไปหน้าแรกของ Role นั้น ๆ
      if (userRole === 'admin') return <Navigate to="/admin/verify" replace />
      if (userRole === 'nurse') return <Navigate to="/nurse/requests" replace />
      return <Navigate to="/member/search-nurse" replace />
    }
  }

  return children
}
