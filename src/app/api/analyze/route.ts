import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

// POST /api/analyze - Analyze a curriculum using AI
export async function POST(request: NextRequest) {
  try {
    const { curriculumId } = await request.json();

    if (!curriculumId) {
      return NextResponse.json({ error: 'Curriculum ID is required' }, { status: 400 });
    }

    // Fetch curriculum with its batch info
    const curriculum = await db.curriculum.findUnique({
      where: { id: curriculumId },
      include: { batch: true, analysis: true }
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    const weekData = JSON.parse(curriculum.weekData);
    
    // Prepare curriculum text for AI
    const curriculumText = weekData.map((w: { week: number; topics: string[] }) => 
      `Week ${w.week}: ${w.topics.join(', ')}`
    ).join('\n');

    const zai = await ZAI.create();

    // Step 1: Analyze curriculum effectiveness and generate scores
    const analysisPrompt = `You are an expert curriculum evaluator and technology trend analyst. Analyze the following curriculum and provide a comprehensive assessment against current industry trends in 2025-2026.

Curriculum for "${curriculum.batch.name}":
${curriculumText}

Please respond ONLY with valid JSON (no markdown, no code blocks) in this exact format:
{
  "effectivenessScore": <number 0-100, how well the curriculum matches current industry needs>,
  "overallScore": <number 0-100, overall quality rating>,
  "summary": "<2-3 sentence executive summary of the curriculum's current state>",
  "outdatedTopics": [
    { "topic": "<topic name>", "reason": "<why it's outdated>", "week": <week number> }
  ],
  "recommendedTopics": [
    { "topic": "<topic name to add>", "reason": "<why it should be added>", "priority": "<high/medium/low>", "suggestedWeek": <recommended week number> }
  ],
  "weekAnalysis": [
    { "week": <number>, "relevanceScore": <0-100>, "status": "<current/outdated/needs_update>", "notes": "<brief analysis>" }
  ],
  "trendComparison": {
    "categories": ["Programming", "AI/ML", "Cloud", "DevOps", "Data Science", "Security", "Soft Skills"],
    "curriculumScore": [<scores 0-100 for each category>],
    "industryDemand": [<industry demand 0-100 for each category>],
    "gap": [<gap values: industryDemand - curriculumScore>]
  }
}

Be thorough and realistic. Consider that technology moves fast - topics from 3+ years ago may need updates.`;

    const response = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a curriculum analysis AI. You must respond with ONLY valid JSON, no markdown formatting, no code blocks, no additional text.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
    });

    let analysisResult;
    const content = response.choices[0]?.message?.content || '';
    
    try {
      // Clean potential markdown code block wrappers
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI analysis. Please try again.' },
        { status: 500 }
      );
    }

    // Step 2: Save or update analysis in database
    const analysisData = {
      effectivenessScore: analysisResult.effectivenessScore || 0,
      overallScore: analysisResult.overallScore || 0,
      trendMatch: JSON.stringify(analysisResult.trendComparison || { categories: [], curriculumScore: [], industryDemand: [], gap: [] }),
      outdatedTopics: JSON.stringify(analysisResult.outdatedTopics || []),
      recommendedTopics: JSON.stringify(analysisResult.recommendedTopics || []),
      weekAnalysis: JSON.stringify(analysisResult.weekAnalysis || []),
      summary: analysisResult.summary || '',
    };

    if (curriculum.analysis) {
      // Update existing analysis
      await db.analysis.update({
        where: { id: curriculum.analysis.id },
        data: analysisData
      });
    } else {
      // Create new analysis
      await db.analysis.create({
        data: {
          curriculumId: curriculum.id,
          ...analysisData
        }
      });
    }

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      curriculumId: curriculum.id,
    });
  } catch (error) {
    console.error('Error analyzing curriculum:', error);
    return NextResponse.json(
      { error: 'Failed to analyze curriculum. Please try again.' },
      { status: 500 }
    );
  }
}
