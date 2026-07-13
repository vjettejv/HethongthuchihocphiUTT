import './App.css'
import './layouts/appShellLayout.css'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Students from './pages/Students'
import Semesters from './pages/Semesters'
import FeeCategories from './pages/FeeCategories'
import Invoices from './pages/Invoices'
import Payments from './pages/Payments'
import MyTuition from './pages/student/MyTuition'
import MyHistory from './pages/student/MyHistory'
import MyProfile from './pages/student/MyProfile'
import Dashboard from './pages/Dashboard'
import AccountManagement from './pages/admin/accountManagement'
import SystemSettings from './pages/admin/systemSettings'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminOnlyRoute from './routes/AdminOnlyRoute'
import StaffOnlyRoute from './routes/StaffOnlyRoute'
import AppShellLayout from './layouts/AppShellLayout'
import { appAntdTheme } from './layouts/appTheme'

function UnauthorizedPage() {
  let role = null
  try {
    role = JSON.parse(localStorage.getItem('user') || '{}')?.role ?? null
  } catch {
    role = null
  }
  const homeLink =
    role === 'student' ? (
      <Link to="/my-tuition">Về trang học phí</Link>
    ) : role === 'admin' ? (
      <Link to="/admin/users">Về quản lý tài khoản</Link>
    ) : (
      <Link to="/dashboard">Về Dashboard</Link>
    )
  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Không có quyền truy cập</h2>
      <p>Bạn không có quyền xem trang này với vai trò hiện tại.</p>
      {role === 'staff' ? (
        <p>
          Trang này dành cho <strong>quản trị viên</strong>. Cán bộ tài vụ dùng menu nghiệp vụ thu phí (Dashboard, Sinh
          viên, Hóa đơn, …).
        </p>
      ) : null}
      {role === 'admin' ? (
        <p>
          Trang này dành cho <strong>cán bộ tài vụ</strong>. Quản trị viên chỉ quản lý tài khoản và cấu hình hệ thống.
        </p>
      ) : null}
      <p>{homeLink}</p>
    </div>
  )
}

function App() {
  return (
    <ConfigProvider locale={viVN} theme={appAntdTheme}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'staff']} />}>
            <Route element={<AppShellLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route element={<StaffOnlyRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/semesters" element={<Semesters />} />
                <Route path="/fees" element={<FeeCategories />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payments" element={<Payments />} />
              </Route>
              <Route element={<AdminOnlyRoute />}>
                <Route path="/admin/users" element={<AccountManagement />} />
                <Route path="/admin/system" element={<SystemSettings />} />
              </Route>
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<AppShellLayout />}>
              <Route path="/my-tuition" element={<MyTuition />} />
              <Route path="/my-history" element={<MyHistory />} />
              <Route path="/my-profile" element={<MyProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
