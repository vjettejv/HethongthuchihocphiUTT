const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const { createExtension } = require('../controllers/giaHanController')

const router = express.Router()

router.post('/', verifyTokenAndRole(['staff']), createExtension)

module.exports = router
