import { Button, Form, Input, InputNumber, Modal, Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

function Semesters() {
  const [semesters, setSemesters] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingSemester, setEditingSemester] = useState(null)
  const [form] = Form.useForm()

  const fetchSemesters = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/semesters')
      setSemesters(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách học kỳ!')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSemesters()
  }, [])

  const openCreateModal = () => {
    setEditingSemester(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingSemester(record)
    form.setFieldsValue({
      semesterName: record.semesterName,
      startDate: record.startDate,
      deadlineDays: record.deadlineDays
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (record) => {
    try {
      await axiosClient.delete(`/semesters/${record.id}`)
      message.success('Xóa học kỳ thành công!')
      await fetchSemesters()
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Xóa học kỳ thất bại!')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)
      if (editingSemester) {
        await axiosClient.put(`/semesters/${editingSemester.id}`, values)
        message.success('Cập nhật học kỳ thành công!')
      } else {
        await axiosClient.post('/semesters', values)
        message.success('Tạo học kỳ thành công!')
      }
      setIsModalOpen(false)
      setEditingSemester(null)
      form.resetFields()
      await fetchSemesters()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Lưu học kỳ thất bại!')
    } finally {
      setIsSaving(false)
    }
  }

  const columns = useMemo(
    () => [
      { title: 'Tên học kỳ', dataIndex: 'semesterName', key: 'semesterName' },
      { title: 'Ngày bắt đầu', dataIndex: 'startDate', key: 'startDate' },
      { title: 'Số ngày hạn', dataIndex: 'deadlineDays', key: 'deadlineDays' },
      {
        title: 'Thao tác',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button className="app-btn-edit" onClick={() => openEditModal(record)}>
              Sửa
            </Button>
            <Button danger onClick={() => handleDelete(record)}>
              Xóa
            </Button>
          </Space>
        )
      }
    ],
    [form, editingSemester]
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý học kỳ
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          Thêm học kỳ
        </Button>
      </Space>

      <Table rowKey="id" loading={isLoading} dataSource={semesters} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal
        open={isModalOpen}
        title={editingSemester ? 'Cập nhật học kỳ' : 'Thêm học kỳ'}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Tên học kỳ"
            name="semesterName"
            rules={[{ required: true, message: 'Vui lòng nhập Tên học kỳ!' }]}
          >
            <Input placeholder="VD: HK1 2026" />
          </Form.Item>
          <Form.Item
            label="Ngày bắt đầu"
            name="startDate"
            rules={[{ required: true, message: 'Vui lòng chọn Ngày bắt đầu!' }]}
          >
            <Input type="date" />
          </Form.Item>
          <Form.Item
            label="Số ngày hạn"
            name="deadlineDays"
            rules={[{ required: true, message: 'Vui lòng nhập Số ngày hạn!' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 30" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Semesters
