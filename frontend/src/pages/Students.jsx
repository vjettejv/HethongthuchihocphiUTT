import { Button, Form, Input, Modal, Space, Switch, Table, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

function Students() {
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [form] = Form.useForm()

  const fetchStudents = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/students')
      setStudents(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách sinh viên!')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const openCreateModal = () => {
    setEditingStudent(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingStudent(record)
    form.setFieldsValue({
      studentCode: record.studentCode,
      fullName: record.fullName,
      className: record.className,
      email: record.email,
      phone: record.phone
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)
      if (editingStudent) {
        await axiosClient.put(`/students/${editingStudent.id}`, values)
        message.success('Cập nhật sinh viên thành công!')
      } else {
        await axiosClient.post('/students', values)
        message.success('Tạo sinh viên thành công! (Mật khẩu mặc định: 123456)')
      }
      setIsModalOpen(false)
      setEditingStudent(null)
      form.resetFields()
      await fetchStudents()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Lưu sinh viên thất bại!')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleBan = async (record) => {
    try {
      await axiosClient.patch(`/students/${record.id}/ban`)
      await fetchStudents()
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không thể khóa/mở khóa tài khoản!')
    }
  }

  const columns = [
    { title: 'Mã SV', dataIndex: 'studentCode', key: 'studentCode' },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Lớp', dataIndex: 'className', key: 'className' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Khóa tài khoản',
      dataIndex: 'isBanned',
      key: 'isBanned',
      render: (_, record) => (
        <Switch checked={!!record.isBanned} onChange={() => handleToggleBan(record)} />
      )
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button className="app-btn-edit" onClick={() => openEditModal(record)}>
            Sửa
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý sinh viên
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          Thêm sinh viên
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={students}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        open={isModalOpen}
        title={editingStudent ? 'Cập nhật sinh viên' : 'Thêm sinh viên'}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Mã SV"
            name="studentCode"
            rules={[{ required: true, message: 'Vui lòng nhập Mã SV!' }]}
          >
            <Input placeholder="VD: SV001" />
          </Form.Item>
          <Form.Item
            label="Họ tên"
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập Họ tên!' }]}
          >
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item label="Lớp" name="className">
            <Input placeholder="VD: CNTT1" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ type: 'email', message: 'Email không hợp lệ!' }]}>
            <Input placeholder="VD: a@example.com" />
          </Form.Item>
          <Form.Item label="SĐT" name="phone">
            <Input placeholder="VD: 090..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Students
