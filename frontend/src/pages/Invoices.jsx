import { Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

const getStatusTag = (status) => {
  if (status === 'paid') return <Tag color="green">Đã nộp</Tag>
  if (status === 'partial') return <Tag color="orange">Nộp một phần</Tag>
  if (status === 'overdue') return <Tag color="volcano">Quá hạn</Tag>
  return <Tag color="red">Chưa nộp</Tag>
}

function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [students, setStudents] = useState([])
  const [semesters, setSemesters] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form] = Form.useForm()
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [payingInvoice, setPayingInvoice] = useState(null)
  const [payForm] = Form.useForm()
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false)
  const [isExtending, setIsExtending] = useState(false)
  const [extendingInvoice, setExtendingInvoice] = useState(null)
  const [extendForm] = Form.useForm()
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/invoices')
      setInvoices(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách hóa đơn!')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await axiosClient.get('/students')
      setStudents(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách sinh viên!')
    }
  }

  const fetchSemesters = async () => {
    try {
      const response = await axiosClient.get('/semesters')
      setSemesters(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được danh sách học kỳ!')
    }
  }

  useEffect(() => {
    fetchInvoices()
    fetchStudents()
    fetchSemesters()
  }, [])

  const debtInvoices = useMemo(
    () => invoices.filter((row) => Number(row.paidAmount || 0) < Number(row.totalAmount || 0)),
    [invoices]
  )

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    try {
      const response = await axiosClient.get('/invoices/debt/export', { responseType: 'blob' })
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `danh-sach-no-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Đã tải file Excel!')
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Xuất Excel thất bại!')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = () => {
    if (!debtInvoices.length) {
      message.warning('Không có hóa đơn còn nợ để xuất!')
      return
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const head = [['Ma HD', 'Ma SV', 'Ho ten', 'Hoc ky', 'Tong', 'Da nop', 'Con no', 'TT', 'Han nop']]
    const body = debtInvoices.map((r) => [
      String(r.id),
      String(r.studentCode || ''),
      String(r.fullName || ''),
      String(r.semesterName || ''),
      String(Number(r.totalAmount || 0)),
      String(Number(r.paidAmount || 0)),
      String(Math.max(0, Number(r.totalAmount || 0) - Number(r.paidAmount || 0))),
      String(r.status || ''),
      String(r.effectiveDeadline || '').slice(0, 10)
    ])
    autoTable(doc, {
      head,
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 119, 255] }
    })
    doc.save(`danh-sach-no-${new Date().toISOString().slice(0, 10)}.pdf`)
    message.success('Đã tải file PDF!')
  }

  const studentOptions = useMemo(
    () =>
      students.map((student) => ({
        value: student.id,
        label: `${student.studentCode} - ${student.fullName}`
      })),
    [students]
  )

  const semesterOptions = useMemo(
    () =>
      semesters.map((semester) => ({
        value: semester.id,
        label: semester.semesterName
      })),
    [semesters]
  )

  const openCreateModal = () => {
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleCreate = async () => {
    try {
      const values = await form.validateFields()
      setIsSaving(true)
      await axiosClient.post('/invoices', values)
      message.success('Tạo hóa đơn thành công!')
      setIsModalOpen(false)
      form.resetFields()
      await fetchInvoices()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Tạo hóa đơn thất bại!')
    } finally {
      setIsSaving(false)
    }
  }

  const openPayModal = useCallback((record) => {
    setPayingInvoice(record)
    payForm.setFieldsValue({
      amount: Math.max(0, Number(record.totalAmount || 0) - Number(record.paidAmount || 0)),
      method: 'cash'
    })
    setIsPayModalOpen(true)
  }, [payForm])

  const openExtendModal = useCallback(
    (record) => {
      setExtendingInvoice(record)
      extendForm.resetFields()
      extendForm.setFieldsValue({ daysAdded: 7, reason: '' })
      setIsExtendModalOpen(true)
    },
    [extendForm]
  )

  const handlePay = async () => {
    if (!payingInvoice) return
    try {
      const values = await payForm.validateFields()
      setIsPaying(true)
      await axiosClient.post('/payments', { invoiceId: payingInvoice.id, ...values })
      message.success('Thanh toán thành công!')
      setIsPayModalOpen(false)
      setPayingInvoice(null)
      payForm.resetFields()
      await fetchInvoices()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Thanh toán thất bại!')
    } finally {
      setIsPaying(false)
    }
  }

  const handleExtend = async () => {
    if (!extendingInvoice) return
    try {
      const values = await extendForm.validateFields()
      setIsExtending(true)
      await axiosClient.post('/extensions', {
        invoiceId: extendingInvoice.id,
        daysAdded: values.daysAdded,
        reason: values.reason
      })
      message.success('Gia hạn thành công!')
      setIsExtendModalOpen(false)
      setExtendingInvoice(null)
      extendForm.resetFields()
      await fetchInvoices()
    } catch (error) {
      if (error?.errorFields) return
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Gia hạn thất bại!')
    } finally {
      setIsExtending(false)
    }
  }

  const columns = useMemo(
    () => [
      { title: 'Mã hóa đơn', dataIndex: 'id', key: 'id' },
      {
        title: 'Sinh viên',
        key: 'student',
        render: (_, record) => `${record.studentCode || ''} - ${record.fullName || ''}`.trim()
      },
      { title: 'Học kỳ', dataIndex: 'semesterName', key: 'semesterName' },
      { title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount' },
      { title: 'Đã nộp', dataIndex: 'paidAmount', key: 'paidAmount' },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (status) => getStatusTag(status)
      },
      { title: 'Hạn nộp', dataIndex: 'effectiveDeadline', key: 'effectiveDeadline' },
      {
        title: 'Thao tác',
        key: 'actions',
        render: (_, record) => (
          <Space wrap>
            <Button type="primary" disabled={record.status === 'paid'} onClick={() => openPayModal(record)}>
              Thanh toán
            </Button>
            <Button disabled={record.status === 'paid'} onClick={() => openExtendModal(record)}>
              Gia hạn
            </Button>
          </Space>
        )
      }
    ],
    [openPayModal, openExtendModal]
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }} wrap>
        <Title level={3} style={{ margin: 0 }}>
          Quản lý hóa đơn
        </Title>
        <Space wrap>
          <Button loading={isExportingExcel} onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button onClick={handleExportPdf}>Export PDF</Button>
          <Button type="primary" onClick={openCreateModal}>
            Tạo hóa đơn
          </Button>
        </Space>
      </Space>

      <Table rowKey="id" loading={isLoading} dataSource={invoices} columns={columns} pagination={{ pageSize: 10 }} />

      <Modal
        open={isModalOpen}
        title="Tạo hóa đơn"
        onCancel={() => setIsModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={isSaving}
        okText="Tạo"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" autoComplete="off">
          <Form.Item
            label="Sinh viên"
            name="studentId"
            rules={[{ required: true, message: 'Vui lòng chọn Sinh viên!' }]}
          >
            <Select placeholder="Chọn sinh viên" options={studentOptions} />
          </Form.Item>
          <Form.Item
            label="Học kỳ"
            name="semesterId"
            rules={[{ required: true, message: 'Vui lòng chọn Học kỳ!' }]}
          >
            <Select placeholder="Chọn học kỳ" options={semesterOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={isPayModalOpen}
        title={`Thanh toán hóa đơn #${payingInvoice?.id ?? ''}`}
        onCancel={() => setIsPayModalOpen(false)}
        onOk={handlePay}
        confirmLoading={isPaying}
        okText="Thanh toán"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={payForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="Số tiền"
            name="amount"
            rules={[
              { required: true, message: 'Vui lòng nhập Số tiền!' },
              { type: 'number', min: 1, message: 'Số tiền phải lớn hơn 0!' }
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="Nhập số tiền" />
          </Form.Item>
          <Form.Item
            label="Phương thức"
            name="method"
            rules={[{ required: true, message: 'Vui lòng chọn Phương thức!' }]}
          >
            <Select
              placeholder="Chọn phương thức"
              options={[
                { value: 'online', label: 'Online' },
                { value: 'cash', label: 'Tiền mặt' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={isExtendModalOpen}
        title={`Gia hạn hóa đơn #${extendingInvoice?.id ?? ''}`}
        onCancel={() => setIsExtendModalOpen(false)}
        onOk={handleExtend}
        confirmLoading={isExtending}
        okText="Xác nhận gia hạn"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={extendForm} layout="vertical" autoComplete="off">
          <Form.Item
            label="Số ngày gia hạn"
            name="daysAdded"
            rules={[
              { required: true, message: 'Vui lòng nhập số ngày!' },
              { type: 'number', min: 1, message: 'Phải là số nguyên dương!' }
            ]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="Ví dụ: 7" />
          </Form.Item>
          <Form.Item label="Lý do" name="reason">
            <Input.TextArea rows={3} placeholder="Nhập lý do gia hạn (không bắt buộc)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Invoices

