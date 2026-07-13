import { Button, Space, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'

const { Text } = Typography

function readUsername() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.username ?? ''
  } catch {
    return ''
  }
}

function Header() {
  const navigate = useNavigate()
  const username = readUsername()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 16 }}>
      <span className="app-shell-header-title">Hệ thống quản lý thu học phí sinh viên</span>
      <Space style={{ marginLeft: 'auto' }} size="middle">
        {username ? <Text style={{ color: '#0a4d5c' }}>{username}</Text> : null}
        <Button type="primary" ghost onClick={handleLogout}>
          Đăng xuất
        </Button>
      </Space>
    </div>
  )
}

export default Header
