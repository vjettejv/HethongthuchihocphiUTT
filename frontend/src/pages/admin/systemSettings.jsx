import { Card, Descriptions, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import axiosClient from '../../utils/axiosClient'

const { Title, Paragraph } = Typography

function SystemSettings() {
  const [info, setInfo] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const response = await axiosClient.get('/system/info')
        if (!cancelled) setInfo(response?.data?.data || null)
      } catch (error) {
        if (!cancelled) {
          const apiMessage = error?.response?.data?.message
          message.error(apiMessage || 'Không tải được thông tin cấu hình!')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 16 }}>
        Cấu hình hệ thống
      </Title>
      <Paragraph>
        Tham số chạy API (không hiển thị bí mật như mật khẩu DB hay JWT). Chi tiết đầy đủ nằm trong file{' '}
        <code>backend/.env</code> trên máy chủ.
      </Paragraph>
      <Card loading={isLoading} title="Thông tin runtime (đọc từ biến môi trường)">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="NODE_ENV">{info?.nodeEnv ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="PORT (API)">{info?.apiPort ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="FRONTEND_URL">{info?.frontendUrl || '—'}</Descriptions.Item>
          <Descriptions.Item label="DB_HOST">{info?.dbHost || '—'}</Descriptions.Item>
          <Descriptions.Item label="DB_NAME">{info?.dbName || '—'}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}

export default SystemSettings
