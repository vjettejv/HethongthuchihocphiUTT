import { Button, Space, Table, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosClient from '../../utils/axiosClient'
import { formatVnd } from '../../utils/formatVnd'
import { formatViDateTime } from '../../utils/formatViDateTime'
import { buildPaymentReceiptHtml, downloadReceiptHtml } from '../../utils/studentReceiptHtml'

const { Title, Text } = Typography

const methodLabel = (method) => {
  if (method === 'VietQR') return 'VietQR / CK'
  if (method === 'online') return 'Online'
  if (method === 'cash') return 'Tiền mặt'
  return method || '—'
}

function readUserMeta() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return { studentCode: u.studentCode || '—', username: u.username || '—' }
  } catch {
    return { studentCode: '—', username: '—' }
  }
}

function MyHistory() {
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchPayments = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/payments/me')
      setPayments(response?.data?.data || [])
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được lịch sử thanh toán!')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleDownload = useCallback((record) => {
    const { studentCode, username } = readUserMeta()
    const html = buildPaymentReceiptHtml({
      paymentId: record.id,
      invoiceId: record.invoiceId,
      semesterName: record.semesterName,
      amount: record.amount,
      paymentDate: record.paymentDate,
      method: record.method,
      studentCode,
      payerName: username
    })
    downloadReceiptHtml(`bien-lai-hd${record.invoiceId}-${record.id}.html`, html)
    message.success('Đã tải biên lai!')
  }, [])

  const columns = useMemo(
    () => [
      {
        title: 'Ngày thanh toán',
        dataIndex: 'paymentDate',
        key: 'paymentDate',
        render: (v) => formatViDateTime(v, { withTime: true })
      },
      {
        title: 'Số tiền',
        dataIndex: 'amount',
        key: 'amount',
        align: 'right',
        render: (v) => formatVnd(v)
      },
      {
        title: 'Phương thức',
        dataIndex: 'method',
        key: 'method',
        render: (m) => methodLabel(m)
      },
      { title: 'Mã hóa đơn', dataIndex: 'invoiceId', key: 'invoiceId', width: 110 },
      {
        title: 'Học kỳ',
        dataIndex: 'semesterName',
        key: 'semesterName',
        ellipsis: true
      },
      {
        title: 'Thao tác',
        key: 'actions',
        width: 140,
        render: (_, record) => (
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleDownload(record)}>
            Tải biên lai
          </Button>
        )
      }
    ],
    [handleDownload]
  )

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Title level={3} style={{ margin: 0 }}>
            Lịch sử thanh toán
          </Title>
        </Space>
        <Text type="secondary">
          Chỉ hiển thị các giao dịch thuộc hóa đơn đã <strong>đóng đủ</strong> (trạng thái &quot;Đã nộp&quot;).
        </Text>
      </Space>
      <Table
        style={{ marginTop: 12 }}
        rowKey="id"
        loading={isLoading}
        dataSource={payments}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </div>
  )
}

export default MyHistory
