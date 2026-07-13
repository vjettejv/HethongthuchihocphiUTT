import { Space, Table, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

function Payments() {
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const normalizePaymentList = (payload) => {
    if (Array.isArray(payload)) return payload
    if (payload && Array.isArray(payload.data)) return payload.data
    return []
  }

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const response = await axiosClient.get('/payments')
      const body = response?.data

      if (body == null) {
        console.error('[Payments] API trả về response.data rỗng/undefined', { response })
        setPayments([])
        return
      }

      const list = normalizePaymentList(body)
      if (!Array.isArray(list)) {
        console.error('[Payments] Dữ liệu không phải mảng sau khi chuẩn hóa', { body, list })
        setPayments([])
        return
      }

      setPayments(list)
    } catch (error) {
      console.error('[Payments] fetchPayments lỗi:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        stack: error?.stack
      })
      const apiMessage = error?.response?.data?.message
      message.error(apiMessage || 'Không tải được lịch sử giao dịch!')
      setPayments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const columns = useMemo(
    () => [
      { title: 'Mã giao dịch', dataIndex: 'id', key: 'id' },
      { title: 'Mã hóa đơn', dataIndex: 'invoiceId', key: 'invoiceId' },
      { title: 'Số tiền', dataIndex: 'amount', key: 'amount' },
      { title: 'Phương thức', dataIndex: 'method', key: 'method' },
      { title: 'Ngày thanh toán', dataIndex: 'paymentDate', key: 'paymentDate' }
    ],
    []
  )

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          Lịch sử giao dịch
        </Title>
      </Space>

      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={Array.isArray(payments) ? payments : []}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </div>
  )
}

export default Payments

