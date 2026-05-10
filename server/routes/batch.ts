import { Router, Request, Response } from 'express'
import { db } from '../lib/db.js'

const router = Router()

// GET /api/batch — list all batches
router.get('/', async (_req: Request, res: Response) => {
  try {
    const batches = await db.batch.findMany({
      include: {
        curricula: {
          include: { analysis: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(batches)
  } catch (error) {
    console.error('Error fetching batches:', error)
    res.status(500).json({ error: 'Failed to fetch batches' })
  }
})

// POST /api/batch — create a new batch
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body

    if (!name || String(name).trim().length === 0) {
      res.status(400).json({ error: 'Batch name is required' })
      return
    }

    const batch = await db.batch.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
      },
    })

    res.status(201).json(batch)
  } catch (error) {
    console.error('Error creating batch:', error)
    res.status(500).json({ error: 'Failed to create batch' })
  }
})

// DELETE /api/batch?id= — delete a batch
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query

    if (!id) {
      res.status(400).json({ error: 'Batch ID is required' })
      return
    }

    await db.batch.delete({ where: { id: String(id) } })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting batch:', error)
    res.status(500).json({ error: 'Failed to delete batch' })
  }
})

export default router
