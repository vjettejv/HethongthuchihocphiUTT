const express = require('express');
const { register, login, getAllAccounts, resetPassword } = require('../controllers/authController');
const { verifyTokenAndRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/accounts', verifyTokenAndRole(['admin']), getAllAccounts);
router.post('/register', verifyTokenAndRole(['admin']), register);
router.post('/login', login);
router.post('/reset-password', resetPassword);

module.exports = router;