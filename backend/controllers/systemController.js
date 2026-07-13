const getSystemInfo = async (req, res) => {
  try {
    return res.json({
      data: {
        nodeEnv: process.env.NODE_ENV || 'development',
        apiPort: process.env.PORT || '8080',
        frontendUrl: process.env.FRONTEND_URL || '',
        dbHost: process.env.DB_HOST || '',
        dbName: process.env.DB_NAME || ''
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = { getSystemInfo }
