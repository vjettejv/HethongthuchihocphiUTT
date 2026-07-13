import { Button, Form, Input, Modal, Select, Space, Table, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosClient from '../../utils/axiosClient'

const { Title } = Typography

const roleOptions = [
  { value: 'staff', label: 'Cán bộ tài vụ (staff)' },
  { value: 'admin', label: 'Quản trị viên (admin)' },
  { value: 'student', label: 'Sinh viên (student)' }
]

function AccountManagement() {
  const [accounts, setAccounts] = useState([])
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form] = Form.useForm()

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/auth/accounts')
      setAccounts(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách tài khoản!')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const response = await axiosClient.get('/students')
      setStudents(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải danh sách sinh viên (cần để gắn tài khoản SV)!')
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const openCreateModal = () => {
    form.resetFields()
    form.setFieldsValue({ role: 'staff' })
    fetchStudents()
    setIsModalOpen(true)
  }

  const studentOptions = useMemo(
    () =>
      students.map((s) => ({
        value: s.id,
        label: `${s.studentCode} — ${s.fullName}`
      })),
    [students]
  )

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)
      const payload = {
        username: values.username,
        password: values.password,
        role: values.role,
        studentId: values.role === 'student' ? values.studentId : null
      }
      await axiosClient.post('/auth/register', payload)
      message.success('Tạo tài khoản thành công!')
      setIsModalOpen(false)
      form.resetFields()
      await fetchAccounts()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Tạo tài khoản thất bại!')
    } finally {
      setIsSaving(false)
    }
  }

  const columns = useMemo(
    () => [
      { title: 'ID', dataIndex: 'id', key: 'id', width: 64 },
      { title: 'Username', dataIndex: 'username', key: 'username' },
      {
        title: 'Vai trò',
        dataIndex: 'role',
        key: 'role',
        render: (role) => {
          if (role === 'admin') return 'Admin'
          if (role === 'staff') return 'Cán bộ tài vụ'
          return 'Sinh viên'
        }
      },
      {
        title: 'Sinh viên liên kết',
        key: 'student',
        render: (_, record) =>
          record.studentId
            ? `${record.studentCode || ''} ${record.fullName || ''}`.trim() || `ID ${record.studentId}`
            : '—'
      }
    ],
    []
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý tài khoản
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          Tạo tài khoản
        </Button>
      </Space>
      <Table rowKey="id" loading={isLoading} dataSource={accounts} columns={columns} pagination={{ pageSize: 12 }} />

      <Modal
        open={isModalOpen}
        title="Tạo tài khoản mới"
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Username"
            name="username"
            rules={[{ required: true, message: 'Nhập username!' }]}
          >
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
          >
            <Input.Password placeholder="Mật khẩu" />
          </Form.Item>
          <Form.Item label="Vai trò" name="role" rules={[{ required: true }]}>
            <Select options={roleOptions} />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.role !== cur.role}
          >
            {({ getFieldValue }) =>
              getFieldValue('role') === 'student' ? (
                <Form.Item
                  label="Sinh viên (hồ sơ)"
                  name="studentId"
                  rules={[{ required: true, message: 'Chọn sinh viên để gắn tài khoản!' }]}
                >
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Chọn sinh viên"
                    options={studentOptions}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default AccountManagement
