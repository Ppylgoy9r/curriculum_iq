import { Router, Request, Response } from 'express'
import { db } from '../lib/db.js'
import { createOllamaChatCompletion } from '../lib/ollama.js'

const router = Router()

// POST /api/analyze — analyze a curriculum using local Ollama
router.post('/', async (req: Request, res: Response) => {
  try {
    const { curriculumId } = req.body

    if (!curriculumId) {
      res.status(400).json({ error: 'Curriculum ID is required' })
      return
    }

    const curriculum = await db.curriculum.findUnique({
      where: { id: curriculumId },
      include: { batch: true, analysis: true },
    })

    if (!curriculum) {
      res.status(404).json({ error: 'Curriculum not found' })
      return
    }

    const weekData = JSON.parse(curriculum.weekData)
    const curriculumText = weekData
      .map((w: { week: number; topics: string[] }) => `Week ${w.week}: ${w.topics.join(', ')}`)
      .join('\n')

    const analysisPrompt = `Analyze this curriculum for "${curriculum.batch.name}" against 2025-2026 industry trends.
    
${curriculumText}

Respond ONLY with valid JSON. Be extremely concise. Notes must be <10 words.
{
  "effectivenessScore": <0-100>,
  "overallScore": <0-100>,
  "summary": "<1-2 sentence summary>",
  "outdatedTopics": [{"topic":"<name>","reason":"<concise why>","week":<n>}],
  "recommendedTopics": [{"topic":"<name>","reason":"<concise why>","priority":"<high/medium/low>","suggestedWeek":<n>}],
  "weekAnalysis": [{"week":<n>,"relevanceScore":<0-100>,"status":"<current/outdated/needs_update>","notes":"<max 8 words>"}],
  "trendComparison": {
    "categories":["Programming","AI/ML","Cloud","DevOps","Data Science","Security","Soft Skills"],
    "curriculumScore":[<7 numbers>],
    "industryDemand":[<7 numbers>],
    "gap":[<7 numbers>]
  }
}`

    const response = await createOllamaChatCompletion(
      [
        {
          role: 'system',
          content:
            'You are a curriculum analysis AI. You must respond with ONLY valid JSON, no markdown formatting, no code blocks, no additional text.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      0.1
    )

    const content = response.choices[0]?.message?.content || ''
    let analysisResult: Record<string, unknown>

    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      analysisResult = JSON.parse(cleaned)
    } catch (parseError) {
      console.error('Failed to parse AI response:', content)
      console.error('Parse error:', parseError)
      res.status(500).json({ error: 'Failed to parse AI analysis. Please try again.' })
      return
    }

    const analysisData = {
      effectivenessScore: (analysisResult.effectivenessScore as number) || 0,
      overallScore: (analysisResult.overallScore as number) || 0,
      trendMatch: JSON.stringify(
        analysisResult.trendComparison || { categories: [], curriculumScore: [], industryDemand: [], gap: [] }
      ),
      outdatedTopics: JSON.stringify(analysisResult.outdatedTopics || []),
      recommendedTopics: JSON.stringify(analysisResult.recommendedTopics || []),
      weekAnalysis: JSON.stringify(analysisResult.weekAnalysis || []),
      summary: (analysisResult.summary as string) || '',
    }

    if (curriculum.analysis) {
      await db.analysis.update({
        where: { id: curriculum.analysis.id },
        data: analysisData,
      })
    } else {
      await db.analysis.create({
        data: { curriculumId: curriculum.id, ...analysisData },
      })
    }

    res.json({
      success: true,
      analysis: analysisResult,
      curriculumId: curriculum.id,
    })
  } catch (error) {
    console.error('Error analyzing curriculum:', error)
    res.status(500).json({ error: 'Failed to analyze curriculum. Please try again.' })
  }
})

export default router
