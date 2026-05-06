import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const batchId = formData.get('batchId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Validate file type
    const validExtensions = ['.xls', '.xlsx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validExtensions.includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type. Only XLS and XLSX files are supported.' }, { status: 400 });
    }

    // Validate file size (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    // Verify batch exists
    const batch = await db.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Parse the XLS/XLSX file
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet, { defval: '' });

    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'The file appears to be empty.' }, { status: 400 });
    }

    // Auto-detect columns
    const headers = Object.keys(jsonData[0]);

    // Detect week column - match headers containing "week", "unit", "module", or numeric-like
    const weekPatterns = /week|unit|module|part|session|period/i;
    let weekCol = headers.find(h => weekPatterns.test(h));

    // Fallback: find a column where most values look like week numbers
    if (!weekCol) {
      for (const header of headers) {
        const numericCount = jsonData.filter(row => {
          const val = String(row[header]).trim();
          return /^\d+$/.test(val) || /^week\s*\d+/i.test(val) || /^unit\s*\d+/i.test(val);
        }).length;
        if (numericCount > jsonData.length * 0.5) {
          weekCol = header;
          break;
        }
      }
    }

    // If still no week column, assume the first column is the week column
    if (!weekCol) {
      weekCol = headers[0];
    }

    // Detect topic column - match headers containing "topic", "subject", "content", "description", "syllabus"
    const topicPatterns = /topic|subject|content|description|syllabus|title|name|curriculum/i;
    let topicCol = headers.find(h => topicPatterns.test(h));

    // Fallback: use any column that isn't the week column
    if (!topicCol) {
      topicCol = headers.find(h => h !== weekCol) || headers[1] || headers[0];
    }

    // Parse weeks and topics
    const weekData: { week: number; rawLabel: string; topics: string[] }[] = [];
    let weekCounter = 0;

    for (const row of jsonData) {
      const rawWeek = String(row[weekCol] || '').trim();
      const rawTopic = String(row[topicCol] || '').trim();

      if (!rawWeek && !rawTopic) continue;

      // Extract week number
      const weekMatch = rawWeek.match(/(\d+)/);
      const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : ++weekCounter;

      // Parse topics by delimiters
      const topicDelimiters = /;\s*\n|\n|;/;
      const topics = rawTopic
        .split(topicDelimiters)
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0)
        .map((t: string) => {
          // Remove numbered prefixes like "1.", "2)", "a)", etc.
          return t.replace(/^\s*[\d]+\s*[\.\)\-]\s*/, '').trim();
        })
        .filter((t: string) => t.length > 0);

      if (topics.length > 0 || rawWeek) {
        weekData.push({
          week: weekNum,
          rawLabel: rawWeek,
          topics,
        });
        weekCounter = weekNum;
      }
    }

    if (weekData.length === 0) {
      return NextResponse.json({ error: 'Could not parse any week/topic data from the file.' }, { status: 400 });
    }

    // Store in database
    const curriculum = await db.curriculum.create({
      data: {
        batchId,
        fileName: file.name,
        weekData: JSON.stringify(weekData),
      },
    });

    return NextResponse.json({
      success: true,
      curriculum: {
        id: curriculum.id,
        batchId: curriculum.batchId,
        fileName: curriculum.fileName,
        weekData: curriculum.weekData,
        createdAt: curriculum.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading curriculum:', error);
    return NextResponse.json(
      { error: 'Failed to process curriculum file. Please check the file format and try again.' },
      { status: 500 }
    );
  }
}
