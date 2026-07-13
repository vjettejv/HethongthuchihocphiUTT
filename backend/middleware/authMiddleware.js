const jwt = require('jsonwebtoken');

const verifyTokenAndRole = (allowedRoles) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Không tìm thấy token. Vui lòng đăng nhập!" });
        }

        const token = authHeader.split(' ')[1]; // Lấy phần token sau chữ 'Bearer '

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });

            // Lưu thông tin giải mã được vào request để các controller sau dùng
            req.user = decoded; 

            // Kiểm tra quyền
            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({ message: "Lỗi 403: Bạn không có quyền truy cập!" });
            }

            next(); // Hợp lệ, cho đi tiếp
        });
    };
};

module.exports = { verifyTokenAndRole };