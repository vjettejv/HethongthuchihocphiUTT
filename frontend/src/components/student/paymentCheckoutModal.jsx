import { Alert, Button, Checkbox, Divider, Modal, QRCode, Space, Spin, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import axiosClient from '../../utils/axiosClient'
import { formatVnd } from '../../utils/formatVnd'

const { Text, Title } = Typography

function buildVietQrPayload(invoiceId, amountVnd) {
  return `NAPAS|VIETQR|INV:${invoiceId}|VND:${Math.round(amountVnd)}|MOCK`
}

function PaymentCheckoutModal({ open, invoiceId, onClose, onPaid }) {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [waivedFeeIds, setWaivedFeeIds] = useState(() => new Set())
  const [submitting, setSubmitting] = useState(false)

  const resetState = useCallback(() => {
    setPreview(null)
    setWaivedFeeIds(new Set())
  }, [])

  const loadPreview = useCallback(async () => {
    if (!invoiceId) return
    setLoading(true)
    try {
      const response = await axiosClient.get(`/invoices/me/${invoiceId}/payment-preview`)
      setPreview(response?.data?.data || null)
      setWaivedFeeIds(new Set())
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được chi tiết khoản phí!')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    if (open && invoiceId) loadPreview()
    if (!open) resetState()
  }, [open, invoiceId, loadPreview, resetState])

  const lineItems = preview?.lineItems || []
  const invoiceTotal = Number(preview?.invoiceTotal || 0)
  const paidAmount = Number(preview?.paidAmount || 0)
  const catalogSum = useMemo(
    () => lineItems.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [lineItems]
  )
  const totalsMismatch =
    lineItems.length > 0 && Math.abs(catalogSum - invoiceTotal) > 0.01

  const includedTotal = useMemo(() => {
    return lineItems.reduce((sum, row) => {
      const amt = Number(row.amount || 0)
      if (!row.isOptional) return sum + amt
      if (waivedFeeIds.has(row.khoanPhiId)) return sum
      return sum + amt
    }, 0)
  }, [lineItems, waivedFeeIds])

  const remainingFromApi = Math.max(0, Number(preview?.remaining ?? invoiceTotal - paidAmount))
  const amountToPay =
    lineItems.length === 0
      ? remainingFromApi
      : Math.max(0, includedTotal - paidAmount)

  const waiveFeeIdsArray = useMemo(() => {
    if (lineItems.length === 0 || totalsMismatch || paidAmount > 0) return []
    return lineItems.filter((row) => row.isOptional && waivedFeeIds.has(row.khoanPhiId)).map((row) => row.khoanPhiId)
  }, [lineItems, waivedFeeIds, totalsMismatch, paidAmount])

  const toggleWaive = (khoanPhiId, checked) => {
    setWaivedFeeIds((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(khoanPhiId)
      else next.add(khoanPhiId)
      return next
    })
  }

  const handleConfirmPay = async () => {
    if (!invoiceId || amountToPay <= 0) {
      message.warning('Không có số tiền hợp lệ để thanh toán!')
      return
    }
    setSubmitting(true)
    try {
      await axiosClient.post('/payments/me/pay', {
        invoiceId,
        amount: amountToPay,
        waiveFeeIds: waiveFeeIdsArray.length ? waiveFeeIdsArray : undefined
      })
      message.success('Thanh toán online thành công!')
      onPaid?.()
      onClose?.()
      resetState()
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Thanh toán thất bại!')
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
      <Button onClick={() => { onClose?.(); resetState() }}>Đóng</Button>
      <Button type="primary" loading={submitting} disabled={loading || amountToPay <= 0} onClick={handleConfirmPay}>
        Xác nhận thanh toán
      </Button>
    </Space>
  )

  return (
    <Modal
      open={open}
      title={`Thanh toán — hóa đơn #${invoiceId ?? ''}`}
      onCancel={() => { onClose?.(); resetState() }}
      footer={footer}
      width={560}
      destroyOnClose
    >
      <Spin spinning={loading}>
        {totalsMismatch ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
            message="Hóa đơn đã được điều chỉnh so với danh mục khoản phí. Thanh toán theo số còn nợ hiện tại, không bỏ thêm khoản tùy chọn."
          />
        ) : null}
        {paidAmount > 0 && !totalsMismatch ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message="Đã có khoản thanh toán trước đó — không thể bỏ khoản phí tùy chọn qua giao diện này."
          />
        ) : null}

        <Title level={5} style={{ marginTop: 0 }}>
          Chi tiết khoản phí
        </Title>
        {lineItems.length === 0 && !loading ? (
          <Alert type="warning" showIcon message="Chưa có danh mục khoản phí cho học kỳ này — thanh toán theo số còn nợ trên hóa đơn." />
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lineItems.map((row) => (
            <div
              key={row.khoanPhiId}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0'
              }}
            >
              <Space align="start">
                {row.isOptional && !totalsMismatch && paidAmount === 0 ? (
                  <Checkbox
                    checked={!waivedFeeIds.has(row.khoanPhiId)}
                    onChange={(e) => toggleWaive(row.khoanPhiId, e.target.checked)}
                  />
                ) : (
                  <span style={{ width: 16 }} />
                )}
                <div>
                  <div>{row.feeName}</div>
                  {row.isOptional ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Khoản tùy chọn
                    </Text>
                  ) : null}
                </div>
              </Space>
              <Text strong>{formatVnd(row.amount)}</Text>
            </div>
          ))}
        </div>

        <Divider style={{ margin: '16px 0' }} />
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>Tổng phải thanh toán (ước tính)</Text>
            <Text strong style={{ fontSize: 16 }}>
              {formatVnd(amountToPay)}
            </Text>
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Quét mã QR (mô phỏng VietQR/Napas) với đúng số tiền trên, sau đó bấm &quot;Xác nhận thanh toán&quot;.
          </Text>
        </Space>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 12 }}>
          {amountToPay > 0 ? (
            <QRCode value={buildVietQrPayload(invoiceId, amountToPay)} size={180} />
          ) : (
            <Text type="secondary">Không có số tiền để tạo mã</Text>
          )}
        </div>
      </Spin>
    </Modal>
  )
}

export default PaymentCheckoutModal
