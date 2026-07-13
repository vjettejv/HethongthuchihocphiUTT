import { formatVnd } from './formatVnd'
import { formatViDateTime } from './formatViDateTime'

export function buildPaymentReceiptHtml({
  title = 'BIÊN LAI THANH TOÁN HỌC PHÍ',
  paymentId,
  invoiceId,
  semesterName,
  amount,
  paymentDate,
  method,
  studentCode,
  payerName
}) {
  const methodLabel =
    method === 'VietQR'
      ? 'VietQR / Chuyển khoản'
      : method === 'online'
        ? 'Chuyển khoản / Online'
        : method === 'cash'
          ? 'Tiền mặt'
          : method || '—'
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/><title>Biên lai #${paymentId}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:24px auto;padding:16px;color:#111}
h1{font-size:1.25rem;text-align:center;margin:0 0 16px}
table{width:100%;border-collapse:collapse;margin-top:12px}
td{padding:8px 0;border-bottom:1px solid #eee}
td:first-child{color:#666;width:42%}
.footer{margin-top:20px;font-size:12px;color:#666;text-align:center}
</style></head><body>
<h1>${title}</h1>
<table>
<tr><td>Mã giao dịch</td><td><strong>#${paymentId}</strong></td></tr>
<tr><td>Mã hóa đơn</td><td>#${invoiceId}</td></tr>
<tr><td>Học kỳ</td><td>${semesterName || '—'}</td></tr>
<tr><td>Mã SV</td><td>${studentCode || '—'}</td></tr>
<tr><td>Người nộp</td><td>${payerName || '—'}</td></tr>
<tr><td>Ngày thanh toán</td><td>${formatViDateTime(paymentDate)}</td></tr>
<tr><td>Phương thức</td><td>${methodLabel}</td></tr>
<tr><td>Số tiền</td><td><strong>${formatVnd(amount)}</strong></td></tr>
</table>
<p class="footer">Chứng từ điện tử mô phỏng — hệ thống quản lý học phí</p>
</body></html>`
}

export function downloadReceiptHtml(filename, html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
