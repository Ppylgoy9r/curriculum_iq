import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

// POST /api/curriculum/upload - Upload and parse XLS curriculum
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const batchId = formData.get('batchId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Validate batch exists
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse XLS/XLSX
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    // Extract week-wise topics
    const weekData = extractWeekData(rawData);

    if (weekData.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract week-wise topics from the file. Ensure your file has week/topic columns.' },
        { status: 400 }
      );
    }

    // Save to database
    const curriculum = await db.curriculum.create({
      data: {
        batchId,
        fileName: file.name,
        weekData: JSON.stringify(weekData),
      }
    });

    return NextResponse.json({
      success: true,
      curriculum: {
        id: curriculum.id,
        fileName: curriculum.fileName,
        weekData,
        totalWeeks: weekData.length,
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading curriculum:', error);
    return NextResponse.json({ error: 'Failed to process curriculum file' }, { status: 500 });
  }
}

function extractWeekData(rawData: Record<string, unknown>[]): WeekData[] {
  const weekData: WeekData[] = [];

  // Try to detect column names
  const keys = rawData.length > 0 ? Object.keys(rawData[0]) : [];
  
  // Common column name patterns
  const weekPatterns = /week|wk|unit|module|session/i;
  const topicPatterns = /topic|subject|content|syllabus|chapter|description|title/i;

  let weekCol = keys.find(k => weekPatterns.test(k));
  let topicCol = keys.find(k => topicPatterns.test(k));

  // Fallback: use first column as week, second as topic
  if (!weekCol && keys.length >= 1) weekCol = keys[0];
  if (!topicCol && keys.length >= 2) topicCol = keys[1];
  if (!weekCol && keys.length >= 1) weekCol = keys[0];
  if (!topicCol) topicCol = weekCol;

  for (const row of rawData) {
    const weekStr = String(row[weekCol] || '').trim();
    const topicStr = String(row[topicCol] || '').trim();

    if (!weekStr && !topicStr) continue;

    // Skip header rows
    if (weekPatterns.test(weekStr) || topicPatterns.test(weekStr)) continue;

    // Extract week number
    const weekMatch = weekStr.match(/(\d+)/);
    const weekNumber = weekMatch ? parseInt(weekMatch[1]) : weekData.length + 1;

    // Split topic if it contains multiple subtopics
    const topics = topicStr
      ? topicStr
          .split(/[;\n]|(?:(?:\d+)[).]\s*)/)
          .map(t => t.trim())
          .filter(t => t.length > 0)
      : [];

    weekData.push({
      week: weekNumber,
      rawLabel: weekStr,
      topics,
    });
  }

  // If no week structure detected, treat each row as a sequential topic block
  if (weekData.length === 0 && rawData.length > 0) {
    rawData.forEach((row, index) => {
      const values = Object.values(row).filter(v => String(v).trim());
      const topics = values.map(v => String(v).trim()).filter(v => v.length > 0);
      if (topics.length > 0) {
        weekData.push({
          week: index + 1,
          rawLabel: `Week ${index + 1}`,
          topics,
        });
      }
    });
  }

  return weekData;
}

interface WeekData {
  week: number;
  rawLabel: string;
  topics: string[];
}

// GET /api/curriculum/upload?id=xxx - Get a specific curriculum
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Curriculum ID is required' }, { status: 400 });
    }

    const curriculum = await db.curriculum.findUnique({
      where: { id },
      include: { analysis: true, batch: true }
    });

    if (!curriculum) {
      return NextResponse.json({ error: 'Curriculum not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...curriculum,
      weekData: JSON.parse(curriculum.weekData),
      analysis: curriculum.analysis ? {
        ...curriculum.analysis,
        trendMatch: JSON.parse(curriculum.analysis.trendMatch),
        outdatedTopics: JSON.parse(curriculum.analysis.outdatedTopics),
        recommendedTopics: JSON.parse(curriculum.analysis.recommendedTopics),
        weekAnalysis: JSON.parse(curriculum.analysis.weekAnalysis),
      } : null,
    });
  } catch (error) {
    console.error('Error fetching curriculum:', error);
    return NextResponse.json({ error: 'Failed to fetch curriculum' }, { status: 500 });
  }
}
