import { Button, Divider, Modal, Space, Spin, Table, Typography, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import axiosClient from '../../utils/axiosClient'
import { formatVnd } from '../../utils/formatVnd'
import { formatViDateTime } from '../../utils/formatViDateTime'
import { buildPaymentReceiptHtml, downloadReceiptHtml } from '../../utils/studentReceiptHtml'

const { Text, Title } = Typography

function readUserMeta() {
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}')
    return { studentCode: u.studentCode || '—', username: u.username || '—' }
  } catch {
    return { studentCode: '—', username: '—' }
  }
}

function InvoiceDetailModal({ open, invoiceRecord, onClose }) {
  const [loading, setLoading] = useState(false)
  const [lineItems, setLineItems] = useState([])
  const [paymentRow, setPaymentRow] = useState(null)

  const invoiceId = invoiceRecord?.id

  const load = useCallback(async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const [previewRes, payRes] = await Promise.all([
        axiosClient.get(`/invoices/me/${invoiceId}/payment-preview`),
        axiosClient.get('/payments/me')
      ])
      const preview = previewRes?.data?.data
      setLineItems(preview?.lineItems || [])
      const payments = payRes?.data?.data || []
      const forInvoice = payments.filter((p) => Number(p.invoiceId) === Number(invoiceId))
      const latest = forInvoice.reduce((best, cur) => {
        if (!best) return cur
        return Number(cur.id) > Number(best.id) ? cur : best
      }, null)
      setPaymentRow(latest)
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được chi tiết!')
      setLineItems([])
      setPaymentRow(null)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (open && invoiceId) load()
  }, [open, invoiceId, load])

  const handleDownloadReceipt = () => {
    if (!paymentRow || !invoiceRecord) {
      message.warning('Không tìm thấy giao dịch để in biên lai!')
      return
    }
    const { studentCode, username } = readUserMeta()
    const html = buildPaymentReceiptHtml({
      paymentId: paymentRow.id,
      invoiceId: invoiceRecord.id,
      semesterName: invoiceRecord.semesterName,
      amount: paymentRow.amount,
      paymentDate: paymentRow.paymentDate,
      method: paymentRow.method,
      studentCode,
      payerName: username
    })
    downloadReceiptHtml(`bien-lai-hd${invoiceRecord.id}-${paymentRow.id}.html`, html)
    message.success('Đã tải file biên lai!')
  }

  const columns = [
    { title: 'Khoản phí', dataIndex: 'feeName', key: 'feeName' },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (v) => formatVnd(v)
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_, row) => (row.isOptional ? 'Tùy chọn' : 'Bắt buộc')
    }
  ]

  return (
    <Modal
      open={open}
      title={`Chi tiết / biên lai — hóa đơn #${invoiceId ?? ''}`}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button type="primary" onClick={handleDownloadReceipt} disabled={!paymentRow}>
            Tải biên lai
          </Button>
        </Space>
      }
      width={640}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text type="secondary">Học kỳ: </Text>
            <Text strong>{invoiceRecord?.semesterName || '—'}</Text>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <Text type="secondary">Tổng tiền: </Text>
              <Text strong>{formatVnd(invoiceRecord?.totalAmount)}</Text>
            </div>
            <div>
              <Text type="secondary">Đã đóng: </Text>
              <Text strong>{formatVnd(invoiceRecord?.paidAmount)}</Text>
            </div>
          </div>
          {paymentRow ? (
            <div>
              <Text type="secondary">Giao dịch gần nhất: </Text>
              <Text>
                {formatViDateTime(paymentRow.paymentDate)} — {formatVnd(paymentRow.amount)}
              </Text>
            </div>
          ) : (
            <Text type="secondary">Chưa có dòng giao dịch trong lịch sử (hoặc hóa đơn chưa đánh dấu đã nộp đủ).</Text>
          )}
          <Divider style={{ margin: '8px 0' }} />
          <Title level={5}>Danh mục theo học kỳ</Title>
          <Table rowKey="khoanPhiId" size="small" pagination={false} columns={columns} dataSource={lineItems} />
        </Space>
      </Spin>
    </Modal>
  )
}

export default InvoiceDetailModal
