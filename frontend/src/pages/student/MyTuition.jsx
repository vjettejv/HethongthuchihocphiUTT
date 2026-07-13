import { Button, Modal, Space, Spin, Table, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosClient from '../../utils/axiosClient'
import { formatVnd } from '../../utils/formatVnd'
import { formatViDateTime } from '../../utils/formatViDateTime'
import MetricCardsRow from '../../components/MetricCardsRow'
import PaymentCheckoutModal from '../../components/student/paymentCheckoutModal'
import InvoiceDetailModal from '../../components/student/invoiceDetailModal'

const { Title, Text } = Typography

const getStatusTag = (status) => {
  if (status === 'paid') return <Tag color="green">Đã nộp</Tag>
  if (status === 'partial') return <Tag color="orange">Nộp một phần</Tag>
  if (status === 'overdue') return <Tag color="volcano">Quá hạn</Tag>
  return <Tag color="red">Chưa nộp</Tag>
}

const getRemaining = (record) => {
  const total = Number(record.totalAmount || 0)
  const paid = Number(record.paidAmount || 0)
  return Math.max(0, total - paid)
}

const isFullySettled = (record) => getRemaining(record) === 0

function MyTuition() {
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [payInvoiceId, setPayInvoiceId] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)

  const [vietQrOpen, setVietQrOpen] = useState(false)
  const [vietQrInvoiceId, setVietQrInvoiceId] = useState(null)
  const [vietQrUrl, setVietQrUrl] = useState('')
  const [vietQrAmount, setVietQrAmount] = useState(null)
  const [vietQrLoading, setVietQrLoading] = useState(false)
  const [vietQrConfirmLoading, setVietQrConfirmLoading] = useState(false)

  const fetchInvoices = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/invoices/me')
      setInvoices(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được học phí của bạn!')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvoices()
  }, [])

  const openPayModal = useCallback((record) => {
    setPayInvoiceId(record.id)
    setPayModalOpen(true)
  }, [])

  const openDetailModal = useCallback((record) => {
    setDetailRecord(record)
    setDetailOpen(true)
  }, [])

  const loadVietQr = useCallback(async (invoiceId) => {
    setVietQrLoading(true)
    setVietQrUrl('')
    setVietQrAmount(null)
    try {
      const response = await axiosClient.get(`/payments/qr/${invoiceId}`)
      const data = response?.data?.data
      setVietQrUrl(data?.qrImageUrl || '')
      setVietQrAmount(data?.amountToPay ?? null)
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được mã QR thanh toán!')
      setVietQrOpen(false)
      setVietQrInvoiceId(null)
    } finally {
      setVietQrLoading(false)
    }
  }, [])

  const openVietQrModal = useCallback(
    (record) => {
      setVietQrInvoiceId(record.id)
      setVietQrOpen(true)
      loadVietQr(record.id)
    },
    [loadVietQr]
  )

  const closeVietQrModal = useCallback(() => {
    setVietQrOpen(false)
    setVietQrInvoiceId(null)
    setVietQrUrl('')
    setVietQrAmount(null)
  }, [])

  const handleConfirmVietQr = async () => {
    if (!vietQrInvoiceId) return
    setVietQrConfirmLoading(true)
    try {
      await axiosClient.post(`/payments/confirm/${vietQrInvoiceId}`)
      message.success('Đã xác nhận thanh toán thành công!')
      closeVietQrModal()
      await fetchInvoices()
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Xác nhận thanh toán thất bại!')
    } finally {
      setVietQrConfirmLoading(false)
    }
  }

  const studentMetrics = useMemo(() => {
    let totalDue = 0
    let totalPaid = 0
    for (const inv of invoices) {
      totalDue += Number(inv.totalAmount || 0)
      totalPaid += Number(inv.paidAmount || 0)
    }
    const remaining = Math.max(0, totalDue - totalPaid)
    return [
      { key: 'due', label: 'Khoản phải nộp', value: formatVnd(totalDue), variant: 'amber' },
      { key: 'paid', label: 'Khoản đã đóng', value: formatVnd(totalPaid), variant: 'emerald' },
      { key: 'left', label: 'Còn phải đóng', value: formatVnd(remaining), variant: 'sky' }
    ]
  }, [invoices])

  const columns = useMemo(
    () => [
      { title: 'Học kỳ', dataIndex: 'semesterName', key: 'semesterName' },
      {
        title: 'Tổng tiền',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        align: 'right',
        render: (v) => formatVnd(v)
      },
      {
        title: 'Đã đóng',
        dataIndex: 'paidAmount',
        key: 'paidAmount',
        align: 'right',
        render: (v) => formatVnd(v)
      },
      {
        title: 'Còn nợ',
        key: 'remaining',
        align: 'right',
        render: (_, record) => formatVnd(getRemaining(record))
      },
      {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        render: (status) => getStatusTag(status)
      },
      {
        title: 'Hạn nộp',
        dataIndex: 'effectiveDeadline',
        key: 'effectiveDeadline',
        render: (v) => formatViDateTime(v, { withTime: true })
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 280,
        render: (_, record) => {
          const remaining = getRemaining(record)
          const settled = isFullySettled(record)
          if (settled) {
            return (
              <Space wrap size="small">
                <Button type="link" style={{ padding: 0 }} onClick={() => openDetailModal(record)}>
                  Xem chi tiết
                </Button>
                <Button type="primary" ghost size="small" onClick={() => openDetailModal(record)}>
                  Biên lai
                </Button>
              </Space>
            )
          }
          if (remaining > 0) {
            return (
              <Space wrap size="small">
                <Button type="primary" size="small" onClick={() => openPayModal(record)}>
                  Thanh toán
                </Button>
                <Button size="small" onClick={() => openVietQrModal(record)}>
                  Thanh toán QR
                </Button>
              </Space>
            )
          }
          return null
        }
      }
    ],
    [openPayModal, openDetailModal, openVietQrModal]
  )

  return (
    <div>
      <MetricCardsRow items={studentMetrics} loading={isLoading} />
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Học phí của tôi
        </Title>
      </Space>
      <Table rowKey="id" loading={isLoading} dataSource={invoices} columns={columns} pagination={{ pageSize: 10 }} />

      <PaymentCheckoutModal
        open={payModalOpen}
        invoiceId={payInvoiceId}
        onClose={() => {
          setPayModalOpen(false)
          setPayInvoiceId(null)
        }}
        onPaid={fetchInvoices}
      />

      <InvoiceDetailModal
        open={detailOpen}
        invoiceRecord={detailRecord}
        onClose={() => {
          setDetailOpen(false)
          setDetailRecord(null)
        }}
      />

      <Modal
        title="Thanh toán VietQR"
        open={vietQrOpen}
        onCancel={closeVietQrModal}
        footer={null}
        destroyOnClose
        width={420}
      >
        <Spin spinning={vietQrLoading}>
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <Text type="secondary" style={{ display: 'block' }}>
              Vui lòng quét mã để thanh toán
            </Text>
            {vietQrAmount != null ? (
              <Text strong style={{ fontSize: 16 }}>
                Số tiền: {formatVnd(vietQrAmount)}
              </Text>
            ) : null}
            {vietQrUrl ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img
                  src={vietQrUrl}
                  alt="VietQR thanh toán"
                  style={{ maxWidth: '100%', width: 280, height: 'auto', borderRadius: 8 }}
                />
              </div>
            ) : !vietQrLoading ? (
              <Text type="secondary">Không có ảnh QR.</Text>
            ) : null}
            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button onClick={closeVietQrModal}>Đóng</Button>
              <Button
                type="primary"
                loading={vietQrConfirmLoading}
                disabled={vietQrLoading || !vietQrUrl}
                onClick={handleConfirmVietQr}
              >
                Tôi đã chuyển khoản
              </Button>
            </Space>
          </Space>
        </Spin>
      </Modal>
    </div>
  )
}

export default MyTuition
