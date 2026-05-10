import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import batchRouter from './routes/batch.js'
import curriculumRouter from './routes/curriculum.js'
import analyzeRouter from './routes/analyze.js'

const app = express()
const PORT = process.env.SERVER_PORT || 3001

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api', (_req, res) => {
  res.json({ message: 'CurriculumIQ API is running', status: 'ok' })
})

// Routes
app.use('/api/batch', batchRouter)
app.use('/api/curriculum', curriculumRouter)
app.use('/api/analyze', analyzeRouter)

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`\n✅  CurriculumIQ API server running on http://localhost:${PORT}`)
  console.log(`   Ollama: ${process.env.OLLAMA_URL || 'http://127.0.0.1:11434'}`)
  console.log(`   Model:  ${process.env.OLLAMA_MODEL || 'qwen2.5:3b'}\n`)
})

export default app
