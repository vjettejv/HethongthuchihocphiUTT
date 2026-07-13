/**
 * Khoản phí tùy chọn (sinh viên có thể bỏ khi thanh toán online lần đầu).
 * Có thể mở rộng theo tên hoặc sau này thêm cột DB.
 */
function isOptionalFeeName(feeName) {
  if (!feeName || typeof feeName !== 'string') return false
  const normalized = feeName.toLowerCase()
  return (
    normalized.includes('bảo hiểm') ||
    normalized.includes('bao hiem') ||
    normalized.includes('tùy chọn') ||
    normalized.includes('tuy chon')
  )
}

module.exports = { isOptionalFeeName }
