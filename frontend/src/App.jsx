import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ModalProvider } from './context/ModalContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'

// Member Pages
import EditProfilePage from './pages/EditProfilePage.jsx'
import AddPatientPage from './pages/AddPatientPage.jsx'
import ListPatientPage from './pages/ListPatientPage.jsx'
import EditPatientPage from './pages/EditPatientPage.jsx'
import SearchNursePage from './pages/SearchNursePage.jsx'
import RequestServicePage from './pages/RequestServicePage.jsx'
import CheckServiceStatusPage from './pages/CheckServiceStatusPage.jsx'
import PaymentPage from './pages/PaymentPage.jsx'
import ReceiptPage from './pages/ReceiptPage.jsx'
import ServiceHistoryPage from './pages/ServiceHistoryPage.jsx'
import ServiceDetailPage from './pages/ServiceDetailPage.jsx'
import ChangePasswordPage from './pages/ChangePasswordPage.jsx'

// Nurse Pages
import RegisterNursePage from './pages/nurse/RegisterNursePage.jsx'
import NurseProfilePage from './pages/nurse/NurseProfilePage.jsx'
import NurseRequestsPage from './pages/nurse/NurseRequestsPage.jsx'
import NurseRecordPage from './pages/nurse/NurseRecordPage.jsx'
import NurseFeePage from './pages/nurse/NurseFeePage.jsx'
import NurseHistoryPage from './pages/nurse/NurseHistoryPage.jsx'
import NurseFeesPage from './pages/nurse/NurseFeesPage.jsx'

// Admin Pages
import AdminVerifyNursePage from './pages/admin/AdminVerifyNursePage.jsx'
import AdminAccountsPage from './pages/admin/AdminAccountsPage.jsx'
import AdminReportsPage from './pages/admin/AdminReportsPage.jsx'

function App() {
  return (
    <ModalProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/nurse" element={<RegisterNursePage />} />

          {/* Protected Routes - Member / Patient */}
          <Route path="/member/profile" element={<ProtectedRoute allowedRoles={['member', 'patient']}><EditProfilePage /></ProtectedRoute>} />
          <Route path="/member/change-password" element={<ProtectedRoute allowedRoles={['member', 'patient']}><ChangePasswordPage /></ProtectedRoute>} />
          <Route path="/member/patients" element={<ProtectedRoute allowedRoles={['member', 'patient']}><ListPatientPage /></ProtectedRoute>} />
          <Route path="/member/patients/add" element={<ProtectedRoute allowedRoles={['member', 'patient']}><AddPatientPage /></ProtectedRoute>} />
          <Route path="/member/patients/:patientId/edit" element={<ProtectedRoute allowedRoles={['member', 'patient']}><EditPatientPage /></ProtectedRoute>} />
          <Route path="/member/patients/:patientId" element={<ProtectedRoute allowedRoles={['member', 'patient']}><EditPatientPage /></ProtectedRoute>} />
          <Route path="/member/search-nurse" element={<SearchNursePage />} />
          <Route path="/member/request-service" element={<ProtectedRoute allowedRoles={['member', 'patient']}><RequestServicePage /></ProtectedRoute>} />
          <Route path="/member/service-status" element={<ProtectedRoute allowedRoles={['member', 'patient']}><CheckServiceStatusPage /></ProtectedRoute>} />
          <Route path="/member/service-history" element={<ProtectedRoute allowedRoles={['member', 'patient']}><ServiceHistoryPage /></ProtectedRoute>} />
          <Route path="/member/service/:requestId" element={<ProtectedRoute allowedRoles={['member', 'patient', 'nurse', 'admin']}><ServiceDetailPage /></ProtectedRoute>} />
          <Route path="/member/record/:requestId" element={<ProtectedRoute allowedRoles={['member', 'patient', 'nurse', 'admin']}><NurseRecordPage /></ProtectedRoute>} />
          <Route path="/member/service/:requestId/payment" element={<ProtectedRoute allowedRoles={['member', 'patient']}><PaymentPage /></ProtectedRoute>} />
          <Route path="/member/service/:requestId/receipt" element={<ProtectedRoute allowedRoles={['member', 'patient', 'admin']}><ReceiptPage /></ProtectedRoute>} />

          {/* Protected Routes - Nurse */}
          <Route path="/nurse/profile" element={<ProtectedRoute allowedRoles={['nurse']}><NurseProfilePage /></ProtectedRoute>} />
          <Route path="/nurse/requests" element={<ProtectedRoute allowedRoles={['nurse']}><NurseRequestsPage /></ProtectedRoute>} />
          <Route path="/nurse/service/:requestId" element={<ProtectedRoute allowedRoles={['nurse', 'admin']}><ServiceDetailPage /></ProtectedRoute>} />
          <Route path="/nurse/record/:requestId" element={<ProtectedRoute allowedRoles={['nurse']}><NurseRecordPage /></ProtectedRoute>} />
          <Route path="/nurse/fee/:requestId" element={<ProtectedRoute allowedRoles={['nurse']}><NurseFeePage /></ProtectedRoute>} />
          <Route path="/nurse/history" element={<ProtectedRoute allowedRoles={['nurse']}><NurseHistoryPage /></ProtectedRoute>} />
          <Route path="/nurse/fees" element={<ProtectedRoute allowedRoles={['nurse']}><NurseFeesPage /></ProtectedRoute>} />

          {/* Protected Routes - Admin */}
          <Route path="/admin/verify" element={<ProtectedRoute allowedRoles={['admin']}><AdminVerifyNursePage /></ProtectedRoute>} />
          <Route path="/admin/accounts" element={<ProtectedRoute allowedRoles={['admin']}><AdminAccountsPage /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReportsPage /></ProtectedRoute>} />

          {/* Redirect Shortcuts */}
          <Route path="/member" element={<Navigate to="/member/search-nurse" replace />} />
          <Route path="/nurse" element={<Navigate to="/nurse/requests" replace />} />
          <Route path="/admin" element={<Navigate to="/admin/verify" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ModalProvider>
  )
}

export default App
