const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db'); // Gọi file kết nối DB
const authRoutes = require('./routes/authRoutes'); // Gọi API đăng nhập
const sinhVienRoutes = require('./routes/sinhVienRoutes');
const hocKyRoutes = require('./routes/hocKyRoutes');
const khoanPhiRoutes = require('./routes/khoanPhiRoutes');
const hoaDonRoutes = require('./routes/hoaDonRoutes');
const { verifyTokenAndRole } = require('./middleware/authMiddleware');
const { getStudentInvoices, getInvoicePaymentPreview } = require('./controllers/hoaDonController');
const giaoDichRoutes = require('./routes/giaoDichRoutes');
const giaHanRoutes = require('./routes/giaHanRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { runOverdueJobs, startOverdueCron } = require('./helpers/updateOverdueStatus');

const app = express();

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: frontendUrl,
    credentials: true
  })
);
app.use(express.json()); 

// Gắn route Auth vào đường dẫn /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/students', sinhVienRoutes);
app.use('/api/semesters', hocKyRoutes);
app.use('/api/fees', khoanPhiRoutes);
// Đăng ký trước mount router để GET /api/invoices/me luôn khớp (sinh viên)
app.get('/api/invoices/me', verifyTokenAndRole(['student']), getStudentInvoices);
app.get('/api/invoices/me/:invoiceId/payment-preview', verifyTokenAndRole(['student']), getInvoicePaymentPreview);
app.use('/api/invoices', hoaDonRoutes);
// Giao dịch thanh toán: prefix /api/payments + router gốc `/` => GET|POST /api/payments
app.use('/api/payments', giaoDichRoutes);
app.use('/api/extensions', giaHanRoutes);
app.use('/api/system', systemRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'API Quản lý học phí đang chạy!' });
});

// Ưu tiên chạy port 8080 để không bị kẹt
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
    console.log(`🚀 Server backend đang chạy tại http://localhost:${PORT}`);
    try {
        const { overdueInvoices, bannedStudents } = await runOverdueJobs();
        console.log(`📅 Quá hạn hóa đơn: ${overdueInvoices}; khóa SV (hạn+15 ngày): ${bannedStudents}.`);
    } catch (err) {
        console.error('❌ Lỗi runOverdueJobs:', err.message);
    }
    startOverdueCron();
});