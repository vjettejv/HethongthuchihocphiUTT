import { Alert, Button, Form, Input } from 'antd'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axiosClient from '../utils/axiosClient'

function Login() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleFinish = async (values) => {
    const { username, password } = values
    setLoginError('')
    setIsSubmitting(true)
    try {
      const response = await axiosClient.post('/auth/login', { username, password })
      const token = response?.data?.token
      const user = response?.data?.user

      if (!token || !user) {
        setLoginError('Đăng nhập thất bại: Thiếu token hoặc user!')
        return
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      if (user.role === 'admin') {
        navigate('/admin/users')
        return
      }
      if (user.role === 'staff') {
        navigate('/dashboard')
        return
      }

      navigate('/my-tuition')
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      setLoginError(apiMessage || 'Sai tài khoản hoặc mật khẩu!')
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
          <h2 className="loginFormTitle">Đăng nhập vào hệ thống</h2>
          {loginError ? (
            <Alert
              className="loginAlert"
              type="error"
              message={loginError}
              showIcon
              closable
              onClose={() => setLoginError('')}
            />
          ) : null}
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={handleFinish}
            autoComplete="off"
            colon={false}
          >
            <Form.Item
              name="username"
              style={{ marginBottom: 16 }}
              rules={[{ required: true, message: 'Vui lòng nhập username!' }]}
            >
              <Input variant="filled" placeholder="Username" size="large" />
            </Form.Item>
            <Form.Item
              name="password"
              style={{ marginBottom: 8 }}
              rules={[{ required: true, message: 'Vui lòng nhập password!' }]}
            >
              <Input.Password
                variant="filled"
                placeholder="Password"
                size="large"
                visibilityToggle={false}
              />
            </Form.Item>
            <div className="loginForgotWrap">
              <Link className="loginForgotLink" to="/reset-password">
                Khôi phục mật khẩu
              </Link>
            </div>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                className="loginSubmitBtn"
                htmlType="submit"
                loading={isSubmitting}
                block
              >
                Đăng Nhập
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default Login
