const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
})

export function formatVnd(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return '0 đ'
  return vndFormatter.format(n)
}
