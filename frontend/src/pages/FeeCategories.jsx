import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

function FeeCategories() {
  const [fees, setFees] = useState([])
  const [semesters, setSemesters] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingFee, setEditingFee] = useState(null)
  const [form] = Form.useForm()

  const fetchSemesters = async () => {
    try {
      const response = await axiosClient.get('/semesters')
      setSemesters(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách học kỳ!')
    }
  }

  const fetchFees = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/fees')
      setFees(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách khoản phí!')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSemesters()
    fetchFees()
  }, [])

  const semesterNameById = useMemo(() => {
    const map = new Map()
    semesters.forEach((semester) => {
      map.set(semester.id, semester.semesterName)
    })
    return map
  }, [semesters])

  const semesterOptions = useMemo(
    () => semesters.map((semester) => ({ value: semester.id, label: semester.semesterName })),
    [semesters]
  )

  const openCreateModal = () => {
    setEditingFee(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const openEditModal = (record) => {
    setEditingFee(record)
    form.setFieldsValue({
      semesterId: record.semesterId,
      feeName: record.feeName,
      amount: record.amount
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (record) => {
    try {
      await axiosClient.delete(`/fees/${record.id}`)
      message.success('Xóa khoản phí thành công!')
      await fetchFees()
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Xóa khoản phí thất bại!')
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)
      if (editingFee) {
        await axiosClient.put(`/fees/${editingFee.id}`, values)
        message.success('Cập nhật khoản phí thành công!')
      } else {
        await axiosClient.post('/fees', values)
        message.success('Tạo khoản phí thành công!')
      }
      setIsModalOpen(false)
      setEditingFee(null)
      form.resetFields()
      await fetchFees()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Lưu khoản phí thất bại!')
    } finally {
      setIsSaving(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        title: 'Học kỳ',
        dataIndex: 'semesterId',
        key: 'semesterId',
        render: (semesterId) => semesterNameById.get(semesterId) || `ID: ${semesterId}`
      },
      { title: 'Tên khoản phí', dataIndex: 'feeName', key: 'feeName' },
      { title: 'Số tiền', dataIndex: 'amount', key: 'amount' },
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
    [semesterNameById, form, editingFee]
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý khoản phí
        </Title>
        <Button type="primary" onClick={openCreateModal}>
          Thêm khoản phí
        </Button>
      </Space>

      <Table rowKey="id" loading={isLoading} dataSource={fees} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal
        open={isModalOpen}
        title={editingFee ? 'Cập nhật khoản phí' : 'Thêm khoản phí'}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText="Lưu"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Học kỳ"
            name="semesterId"
            rules={[{ required: true, message: 'Vui lòng chọn Học kỳ!' }]}
          >
            <Select placeholder="Chọn học kỳ" options={semesterOptions} />
          </Form.Item>
          <Form.Item
            label="Tên khoản phí"
            name="feeName"
            rules={[{ required: true, message: 'Vui lòng nhập Tên khoản phí!' }]}
          >
            <Input placeholder="VD: Học phí" />
          </Form.Item>
          <Form.Item
            label="Số tiền"
            name="amount"
            rules={[{ required: true, message: 'Vui lòng nhập Số tiền!' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 1500000" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default FeeCategories
