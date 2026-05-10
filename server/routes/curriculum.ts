import { Router, Request, Response } from 'express'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { db } from '../lib/db.js'

const router = Router()

// Store file in memory (Buffer), not on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase()
    if (['.xls', '.xlsx'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only XLS and XLSX files are supported.'))
    }
  },
})

// POST /api/curriculum/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    const batchId = req.body.batchId as string | undefined

    if (!file) {
      res.status(400).json({ error: 'File is required' })
      return
    }

    if (!batchId) {
      res.status(400).json({ error: 'Batch ID is required' })
      return
    }

    // Verify batch exists
    const batch = await db.batch.findUnique({ where: { id: batchId } })
    if (!batch) {
      res.status(404).json({ error: 'Batch not found' })
      return
    }

    // Parse the XLS/XLSX file from memory buffer
    const workbook = XLSX.read(file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' })

    if (jsonData.length === 0) {
      res.status(400).json({ error: 'The file appears to be empty.' })
      return
    }

    // Auto-detect columns
    const headers = Object.keys(jsonData[0])

    const weekPatterns = /week|unit|module|part|session|period/i
    let weekCol = headers.find(h => weekPatterns.test(h))

    if (!weekCol) {
      for (const header of headers) {
        const numericCount = jsonData.filter(row => {
          const val = String(row[header]).trim()
          return /^\d+$/.test(val) || /^week\s*\d+/i.test(val) || /^unit\s*\d+/i.test(val)
        }).length
        if (numericCount > jsonData.length * 0.5) {
          weekCol = header
          break
        }
      }
    }

    if (!weekCol) weekCol = headers[0]

    const topicPatterns = /topic|subject|content|description|syllabus|title|name|curriculum/i
    let topicCol = headers.find(h => topicPatterns.test(h))

    if (!topicCol) {
      topicCol = headers.find(h => h !== weekCol) || headers[1] || headers[0]
    }

    // Parse weeks and topics
    const weekData: { week: number; rawLabel: string; topics: string[] }[] = []
    let weekCounter = 0

    for (const row of jsonData) {
      const rawWeek = String(row[weekCol!] || '').trim()
      const rawTopic = String(row[topicCol!] || '').trim()

      if (!rawWeek && !rawTopic) continue

      const weekMatch = rawWeek.match(/(\d+)/)
      const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : ++weekCounter

      const topicDelimiters = /;\s*\n|\n|;/
      const topics = rawTopic
        .split(topicDelimiters)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0)
        .map((t: string) => t.replace(/^\s*[\d]+\s*[\.)\-]\s*/, '').trim())
        .filter((t: string) => t.length > 0)

      if (topics.length > 0 || rawWeek) {
        weekData.push({ week: weekNum, rawLabel: rawWeek, topics })
        weekCounter = weekNum
      }
    }

    if (weekData.length === 0) {
      res.status(400).json({ error: 'Could not parse any week/topic data from the file.' })
      return
    }

    const curriculum = await db.curriculum.create({
      data: {
        batchId,
        fileName: file.originalname,
        weekData: JSON.stringify(weekData),
      },
    })

    res.status(201).json({
      success: true,
      curriculum: {
        id: curriculum.id,
        batchId: curriculum.batchId,
        fileName: curriculum.fileName,
        weekData: curriculum.weekData,
        createdAt: curriculum.createdAt,
      },
    })
  } catch (error) {
    console.error('Error uploading curriculum:', error)
    res.status(500).json({
      error: 'Failed to process curriculum file. Please check the file format and try again.',
    })
  }
})

export default router
