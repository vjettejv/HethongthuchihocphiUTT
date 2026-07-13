const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const { getSystemInfo } = require('../controllers/systemController')

const router = express.Router()

router.get('/info', verifyTokenAndRole(['admin']), getSystemInfo)

module.exports = router
