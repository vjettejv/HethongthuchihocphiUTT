import { Layout, Menu } from 'antd'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/Header'

const { Header, Content, Sider } = Layout

function AppShellLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const userRaw = localStorage.getItem('user')
  let role = null
  try {
    role = userRaw ? JSON.parse(userRaw)?.role : null
  } catch {
    role = null
  }

  const staffMenuItems = [
    { key: '/dashboard', label: <Link to="/dashboard">Dashboard</Link> },
    { key: '/students', label: <Link to="/students">Sinh viên</Link> },
    { key: '/semesters', label: <Link to="/semesters">Học kỳ</Link> },
    { key: '/fees', label: <Link to="/fees">Khoản phí</Link> },
    { key: '/invoices', label: <Link to="/invoices">Hóa đơn</Link> },
    { key: '/payments', label: <Link to="/payments">Giao dịch</Link> }
  ]

  const adminMenuItems = [
    { key: '/admin/users', label: <Link to="/admin/users">Quản lý tài khoản</Link> },
    { key: '/admin/system', label: <Link to="/admin/system">Cấu hình hệ thống</Link> }
  ]

  const studentItems = [
    { key: '/my-tuition', label: <Link to="/my-tuition">Học phí của tôi</Link> },
    { key: '/my-history', label: <Link to="/my-history">Lịch sử</Link> },
    { key: '/my-profile', label: <Link to="/my-profile">Thông tin cá nhân</Link> }
  ]

  const items =
    role === 'student'
      ? studentItems
      : role === 'admin'
        ? adminMenuItems
        : role === 'staff'
          ? staffMenuItems
          : staffMenuItems

  const selectedKeys = items.some((item) => item.key === location.pathname) ? [location.pathname] : []

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const roleLabel =
    role === 'admin' ? 'Quản trị viên' : role === 'staff' ? 'Cán bộ tài vụ' : role === 'student' ? 'Sinh viên' : ''

  return (
    <Layout className="app-shell-root">
      <Sider width={240} theme="dark" className="app-shell-sider" breakpoint="lg" collapsedWidth={0}>
        <div className="app-shell-brand">Tuition System</div>
        {role ? <div className="app-shell-role">{roleLabel}</div> : null}
        <Menu
          theme="dark"
          mode="inline"
          className="app-shell-menu"
          items={items}
          selectedKeys={selectedKeys}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout className="app-shell-main">
        <Header className="app-shell-header">
          <AppHeader />
        </Header>
        <Content className="app-shell-content">
          <div className="app-shell-page-card">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppShellLayout
