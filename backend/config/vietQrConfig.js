require('dotenv').config()

const bankId = process.env.BANK_ID || 'MB'
const bankAccount = process.env.BANK_ACCOUNT || '0123456789'
const accountName = process.env.ACCOUNT_NAME || 'NGUYEN VAN A'

/**
 * URL ảnh QR theo VietQR (img.vietqr.io).
 * @param {{ invoiceId: number, amountVnd: number }} params
 */
function buildVietQrImageUrl({ invoiceId, amountVnd }) {
  const addInfo = `ThanhToan_HD${invoiceId}`
  const amountInt = Math.max(0, Math.round(Number(amountVnd)))
  const baseUrl = `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png`
  const query = new URLSearchParams({
    amount: String(amountInt),
    addInfo,
    accountName
  })
  return `${baseUrl}?${query.toString()}`
}

module.exports = {
  bankId,
  bankAccount,
  accountName,
  buildVietQrImageUrl
}
