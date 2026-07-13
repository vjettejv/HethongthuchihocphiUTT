import { Card, Descriptions, Skeleton, Space, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import axiosClient from '../../utils/axiosClient'

const { Title, Text } = Typography

function fallbackUserMeta() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return {
      username: u?.username || '—',
      studentCode: u?.studentCode || '—'
    }
  } catch {
    return { username: '—', studentCode: '—' }
  }
}

function yesNo(v) {
  return v ? 'Có' : 'Không'
}

function MyProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await axiosClient.get('/students/me/profile')
        if (!mounted) return
        setProfile(res?.data?.data || null)
      } catch (error) {
        const apiMessage = error?.response?.data?.message
        message.error(apiMessage || 'Không tải được thông tin cá nhân!')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const meta = fallbackUserMeta()

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          Thông tin cá nhân
        </Title>
        <Text type="secondary">Kiểm tra lại thông tin sinh viên đã đăng ký trong hệ thống.</Text>
      </div>

      <Card>
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Tài khoản">{meta.username}</Descriptions.Item>
            <Descriptions.Item label="Mã sinh viên">{profile?.studentCode || meta.studentCode}</Descriptions.Item>
            <Descriptions.Item label="Họ và tên">{profile?.fullName || '—'}</Descriptions.Item>
            <Descriptions.Item label="Lớp">{profile?.className || '—'}</Descriptions.Item>
            <Descriptions.Item label="Email">{profile?.email || '—'}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{profile?.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Bị khóa">{profile ? yesNo(!!profile.isBanned) : '—'}</Descriptions.Item>
          </Descriptions>
        )}
      </Card>
    </Space>
  )
}

export default MyProfile

