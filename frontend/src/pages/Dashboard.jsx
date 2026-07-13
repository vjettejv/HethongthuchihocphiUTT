import { Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import MetricCardsRow from '../components/MetricCardsRow'
import { formatVnd } from '../utils/formatVnd'
import axiosClient from '../utils/axiosClient'

const { Title } = Typography

function Dashboard() {
  const [totalAmount, setTotalAmount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const response = await axiosClient.get('/invoices/stats')
        const data = response?.data?.data
        if (cancelled) return
        setTotalAmount(Number(data?.totalAmount ?? 0))
        setPaidAmount(Number(data?.paidAmount ?? 0))
      } catch (error) {
        if (!cancelled) {
          const apiMessage = error?.response?.data?.message
          message.error(apiMessage || 'Không tải được thống kê hóa đơn!')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [])

  const outstanding = Math.max(0, totalAmount - paidAmount)

  const metricItems = useMemo(
    () => [
      {
        key: 'due',
        label: 'Khoản phải nộp (dự kiến)',
        value: formatVnd(totalAmount),
        variant: 'amber'
      },
      {
        key: 'paid',
        label: 'Khoản đã thu',
        value: formatVnd(paidAmount),
        variant: 'emerald'
      },
      {
        key: 'debt',
        label: 'Còn nợ',
        value: formatVnd(outstanding),
        variant: 'sky'
      }
    ],
    [totalAmount, paidAmount, outstanding]
  )

  return (
    <div>
      <Title level={3} style={{ marginTop: 0, marginBottom: 20 }}>
        Tổng quan thu học phí
      </Title>
      <MetricCardsRow items={metricItems} loading={isLoading} />
    </div>
  )
}

export default Dashboard
