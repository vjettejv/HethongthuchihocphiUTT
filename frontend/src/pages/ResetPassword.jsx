import { Alert, Button, Form, Input, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

const successAlertText = 'Mật khẩu đã được khôi phục về mặc định: 123456'

function ResetPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const handleFinish = async (values) => {
    setFeedback({ type: '', message: '' })
    setIsSubmitting(true)
    try {
      await axiosClient.post('/auth/reset-password', { studentCode: values.studentCode.trim() })
      setFeedback({ type: 'success', message: successAlertText })
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      setFeedback({
        type: 'error',
        message: apiMessage || 'Không thực hiện được. Thử lại sau.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="loginPage">
      <div className="loginHero">
        <div className="loginHeroInner">
          <h1 className="loginHeroTitle">HỆ THỐNG QUẢN LÍ THU HỌC PHÍ SINH VIÊN</h1>
        </div>
      </div>
      <div className="loginFormColumn">
        <div className="loginFormCard">
          <Title level={4} style={{ marginTop: 0 }}>
            Khôi phục mật khẩu mặc định
          </Title>
          {feedback.message ? (
            <Alert
              style={{ marginBottom: 16 }}
              type={feedback.type === 'success' ? 'success' : 'error'}
              message={feedback.message}
              showIcon
            />
          ) : null}
          <Form layout="vertical" requiredMark={false} onFinish={handleFinish} autoComplete="off">
            <Form.Item
              name="studentCode"
              label="Mã sinh viên"
              rules={[{ required: true, message: 'Nhập mã sinh viên!' }]}
            >
              <Input variant="filled" placeholder="VD: SV001" size="large" />
            </Form.Item>
            <Form.Item>
              <Button className="loginSubmitBtn" htmlType="submit" loading={isSubmitting} block>
                Đặt lại mật khẩu
              </Button>
            </Form.Item>
          </Form>
          <Link className="loginForgotLink" to="/login">
            ← Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
