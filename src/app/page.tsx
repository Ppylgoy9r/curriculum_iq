'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from 'recharts';
import {
  Upload,
  FileSpreadsheet,
  GraduationCap,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Eye,
  ArrowRight,
  Paperclip,
  Loader2,
  Shield,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Target,
  X,
  Brain,
  ChevronDown,
  RefreshCw,
  BarChart3,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ==================== Types ====================
interface WeekData {
  week: number;
  rawLabel: string;
  topics: string[];
}

interface Batch {
  id: string;
  name: string;
  description: string | null;
  curricula: Curriculum[];
  createdAt: string;
}

interface Curriculum {
  id: string;
  batchId: string;
  fileName: string;
  weekData: string;
  analysis: Analysis | null;
  createdAt: string;
  batch?: Batch;
}

interface Analysis {
  id: string;
  effectivenessScore: number;
  overallScore: number;
  trendMatch: TrendComparison;
  outdatedTopics: OutdatedTopic[];
  recommendedTopics: RecommendedTopic[];
  weekAnalysis: WeekAnalysis[];
  summary: string;
}

interface TrendComparison {
  categories: string[];
  curriculumScore: number[];
  industryDemand: number[];
  gap: number[];
}

interface OutdatedTopic {
  topic: string;
  reason: string;
  week: number;
}

interface RecommendedTopic {
  topic: string;
  reason: string;
  priority: string;
  suggestedWeek: number;
}

interface WeekAnalysis {
  week: number;
  relevanceScore: number;
  status: string;
  notes: string;
}

type ViewState = 'upload' | 'analyzing' | 'results';

// ==================== Data Normalization ====================
function normalizeAnalysis(raw: any): Analysis | null {
  if (!raw) return null;
  try {
    const trendMatch = raw.trendMatch
      ? (typeof raw.trendMatch === 'string' ? JSON.parse(raw.trendMatch) : raw.trendMatch)
      : raw.trendComparison
        ? (typeof raw.trendComparison === 'string' ? JSON.parse(raw.trendComparison) : raw.trendComparison)
        : { categories: [], curriculumScore: [], industryDemand: [], gap: [] };

    const outdatedTopics = raw.outdatedTopics
      ? (typeof raw.outdatedTopics === 'string' ? JSON.parse(raw.outdatedTopics) : raw.outdatedTopics)
      : [];

    const recommendedTopics = raw.recommendedTopics
      ? (typeof raw.recommendedTopics === 'string' ? JSON.parse(raw.recommendedTopics) : raw.recommendedTopics)
      : [];

    const weekAnalysis = raw.weekAnalysis
      ? (typeof raw.weekAnalysis === 'string' ? JSON.parse(raw.weekAnalysis) : raw.weekAnalysis)
      : [];

    return {
      id: raw.id || '',
      effectivenessScore: raw.effectivenessScore || 0,
      overallScore: raw.overallScore || 0,
      trendMatch: trendMatch as TrendComparison,
      outdatedTopics: outdatedTopics as OutdatedTopic[],
      recommendedTopics: recommendedTopics as RecommendedTopic[],
      weekAnalysis: weekAnalysis as WeekAnalysis[],
      summary: raw.summary || '',
    };
  } catch (e) {
    console.error('Failed to normalize analysis:', e);
    return null;
  }
}

// ==================== Circular Progress Component ====================
function CircularProgress({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Score</span>
      </div>
    </div>
  );
}

// ==================== Main Component ====================
export default function Home() {
  const [view, setView] = useState<ViewState>('upload');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create batch dialog
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');

  // Analyze step tracker
  const [analyzeStep, setAnalyzeStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load batches
  const loadBatches = useCallback(async () => {
    try {
      const res = await fetch('/api/batch');
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Create batch
  const handleCreateBatch = async () => {
    if (!newBatchName.trim()) return;
    try {
      const res = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBatchName, description: newBatchDesc }),
      });
      if (res.ok) {
        await loadBatches();
        setCreateBatchOpen(false);
        setNewBatchName('');
        setNewBatchDesc('');
      }
    } catch (err) {
      console.error('Failed to create batch:', err);
    }
  };

  // Upload + Analyze flow
  const handleUploadAndAnalyze = async () => {
    if (!uploadFile || !selectedBatchId) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('batchId', selectedBatchId);

      const res = await fetch('/api/curriculum/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        setUploading(false);
        return;
      }

      setCurriculum(data.curriculum);
      setView('analyzing');
      setUploading(false);

      // Start analyzing automatically
      await runAnalysis(data.curriculum.id);
    } catch (err) {
      setError('Failed to upload curriculum');
      setUploading(false);
    }
  };

  const runAnalysis = async (curriculumId: string) => {
    setAnalyzing(true);
    setAnalyzeStep(1);

    try {
      setAnalyzeStep(2);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculumId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed');
        setView('upload');
        setAnalyzing(false);
        return;
      }

      setAnalyzeStep(3);
      await new Promise(r => setTimeout(r, 800));

      const normalized = normalizeAnalysis(data.analysis);
      setAnalysis(normalized);
      setView('results');
      setAnalyzing(false);
    } catch (err) {
      setError('Failed to analyze curriculum');
      setView('upload');
      setAnalyzing(false);
    }
  };

  // Re-analyze
  const handleReAnalyze = async () => {
    if (!curriculum) return;
    setView('analyzing');
    setAnalysis(null);
    await runAnalysis(curriculum.id);
  };

  // Change file (go back to upload)
  const handleChangeFile = () => {
    setView('upload');
    setAnalysis(null);
    setCurriculum(null);
    setUploadFile(null);
    setError(null);
  };

  // Download XLS
  const handleDownloadXLS = async () => {
    if (!analysis || !curriculum) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const weekDataRaw = curriculum.weekData;
      const weekData: WeekData[] = typeof weekDataRaw === 'string' ? JSON.parse(weekDataRaw) : weekDataRaw || [];

      const curriculumRows: Record<string, string | number>[] = [];
      weekData.forEach(w => {
        w.topics.forEach((t) => {
          const weekNote = analysis.weekAnalysis?.find(wa => wa.week === w.week);
          const isOutdated = analysis.outdatedTopics?.some(ot => ot.week === w.week && ot.topic.toLowerCase().includes(t.toLowerCase()));
          curriculumRows.push({
            'Week': w.week,
            'Topic': t,
            'Status': isOutdated ? 'OUTDATED - Replace' : (weekNote?.status || 'Current'),
            'Relevance Score': weekNote?.relevanceScore || '-',
            'Notes': weekNote?.notes || '',
          });
        });
      });

      const ws1 = XLSX.utils.json_to_sheet(curriculumRows);
      XLSX.utils.book_append_sheet(wb, ws1, 'Updated Curriculum');

      const summaryRows: Record<string, string | number>[] = [
        { 'Metric': 'Effectiveness Score', 'Value': analysis.effectivenessScore + '%' },
        { 'Metric': 'Overall Quality Score', 'Value': analysis.overallScore + '%' },
        { 'Metric': 'Summary', 'Value': analysis.summary },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

      const fileName = curriculum.fileName.replace(/\.[^.]+$/, '') + '_analysis.xlsx';
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // ==================== Derived Data ====================
  const weekData: WeekData[] = curriculum?.weekData
    ? (typeof curriculum.weekData === 'string' ? JSON.parse(curriculum.weekData) : curriculum.weekData)
    : [];

  const allTopics = weekData.flatMap(w => w.topics);
  const uniqueTopics = [...new Set(allTopics)];

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Excellent';
    if (score >= 50) return 'Needs Improvement';
    return 'Critical Review';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  const getStatusBadge = (score: number) => {
    if (score >= 75) return { text: 'Good Standing', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' };
    if (score >= 50) return { text: 'Moderate', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    return { text: 'Needs Attention', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
  };

  const whatIsGood = analysis?.weekAnalysis
    ?.filter(w => w.status === 'current' && w.relevanceScore >= 70)
    .slice(0, 5)
    .map(w => ({ week: w.week, note: w.notes || `Week ${w.week} content is well-aligned` })) || [];

  const needsImprovement = analysis?.outdatedTopics?.slice(0, 5) || [];

  const aiSuggestions = analysis?.recommendedTopics?.slice(0, 3) || [];
  const quickFixes = analysis?.recommendedTopics?.slice(3, 7) || [];

  const comparisonData = analysis?.trendMatch?.categories?.map((cat, i) => ({
    category: cat,
    Curriculum: analysis.trendMatch.curriculumScore[i],
    Industry: analysis.trendMatch.industryDemand[i],
  })) || [];

  const weekScoreData = analysis?.weekAnalysis?.map(w => ({
    week: `W${w.week}`,
    score: w.relevanceScore,
  })) || [];

  // ==================== Render ====================
  return (
    <div className="min-h-screen flex flex-col">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 max-w-md shadow-lg"
          >
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==================== UPLOAD VIEW ==================== */}
      {view === 'upload' && (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
          {/* Background - split diagonal */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2563EB] via-[#2563EB] to-[#1E40AF]" />
          <div
            className="absolute inset-0 bg-white"
            style={{
              clipPath: 'polygon(55% 0%, 100% 0%, 100% 100%, 35% 100%)',
            }}
          />

          {/* Upload Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-[520px] mx-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-xl bg-[#2563EB] flex items-center justify-center shadow-lg shadow-blue-200">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
              </div>

              {/* Heading */}
              <h1 className="text-2xl font-bold text-[#1F2937] text-center mb-1">
                Upload File
              </h1>
              <p className="text-[#6B7280] text-center text-base mb-8">
                Upload your curriculum securely.
              </p>

              {/* Batch Selection */}
              <div className="mb-5">
                <Label className="text-sm font-medium text-[#374151] mb-2 block">
                  Select Batch
                </Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                  <SelectTrigger className="w-full h-11 bg-[#F8FAFC] border-[#E5E7EB]">
                    <SelectValue placeholder="Choose a batch..." />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Input Area */}
              <div className="mb-4">
                <Label className="text-sm font-medium text-[#374151] mb-2 block">
                  Curriculum File
                </Label>
                <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden h-11">
                  <div className="flex-1 flex items-center px-4 gap-2 text-[#6B7280] min-w-0">
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">
                      {uploadFile ? uploadFile.name : 'Choose a file to upload'}
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 h-full bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    Browse
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xls,.xlsx"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                    }}
                  />
                </div>
              </div>

              {/* Supported Formats */}
              <p className="text-[#9CA3AF] text-center text-xs mb-6">
                Supports: XLS, XLSX (Max 50MB)
              </p>

              {/* Upload Button */}
              <Button
                onClick={handleUploadAndAnalyze}
                disabled={!uploadFile || !selectedBatchId || uploading}
                className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-lg gap-2 text-base"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5" />
                    Upload & Analyze
                  </>
                )}
              </Button>

              {/* Create Batch */}
              <div className="mt-4 text-center">
                <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                  <DialogTrigger asChild>
                    <button className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium inline-flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      Create New Batch
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create New Batch</DialogTitle>
                      <DialogDescription>Add a new batch to organize your curricula.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="batch-name">Batch Name *</Label>
                        <Input
                          id="batch-name"
                          placeholder="e.g., Computer Science 2025"
                          value={newBatchName}
                          onChange={e => setNewBatchName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="batch-desc">Description</Label>
                        <Input
                          id="batch-desc"
                          placeholder="Optional description"
                          value={newBatchDesc}
                          onChange={e => setNewBatchDesc(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCreateBatchOpen(false)}>Cancel</Button>
                      <Button
                        className="bg-[#2563EB] hover:bg-[#1D4ED8]"
                        onClick={handleCreateBatch}
                        disabled={!newBatchName.trim()}
                      >
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Brand */}
            <p className="text-center text-white/80 text-sm mt-6 font-medium">
              CurriculumIQ &mdash; AI-Powered Curriculum Intelligence
            </p>
          </motion.div>
        </div>
      )}

      {/* ==================== ANALYZING VIEW ==================== */}
      {view === 'analyzing' && (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#3B82F6]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-10 max-w-lg w-full mx-4 text-center"
          >
            {/* Animated Brain Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-[#2563EB] animate-pulse" />
                </div>
                <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-[#1F2937] mb-2">
              Analyzing Curriculum...
            </h2>
            <p className="text-[#6B7280] text-sm mb-8">
              AI is evaluating your curriculum against current industry trends
            </p>

            {/* 3-Step Progress */}
            <div className="flex items-center justify-center gap-0 mb-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center z-10">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: analyzeStep >= 1 ? '#10B981' : '#E5E7EB',
                    scale: analyzeStep === 1 ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                >
                  {analyzeStep > 1 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : analyzeStep === 1 ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    '1'
                  )}
                </motion.div>
                <span className="text-xs text-[#374151] mt-2 font-medium">Upload File</span>
              </div>

              {/* Line 1-2 */}
              <div className="w-16 sm:w-24 h-0.5 -mx-1 relative top-[-14px]">
                <div className="absolute inset-0 bg-gray-200" />
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: analyzeStep >= 2 ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-[#2563EB]"
                />
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center z-10">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: analyzeStep >= 2 ? '#2563EB' : '#E5E7EB',
                    scale: analyzeStep === 2 ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                >
                  {analyzeStep > 2 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : analyzeStep === 2 ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    '2'
                  )}
                </motion.div>
                <span className="text-xs text-[#374151] mt-2 font-medium">Generate Report</span>
              </div>

              {/* Line 2-3 */}
              <div className="w-16 sm:w-24 h-0.5 -mx-1 relative top-[-14px]">
                <div className="absolute inset-0 bg-gray-200" />
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: analyzeStep >= 3 ? '100%' : '0%' }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-y-0 left-0 bg-[#2563EB]"
                />
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center z-10">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: analyzeStep >= 3 ? '#2563EB' : '#E5E7EB',
                    scale: analyzeStep === 3 ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                >
                  {analyzeStep > 3 ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : analyzeStep === 3 ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    '3'
                  )}
                </motion.div>
                <span className="text-xs text-[#374151] mt-2 font-medium">Get Suggestions</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-[#2563EB] rounded-full"
                animate={{ width: `${(analyzeStep / 3) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-3">
              This may take 15-30 seconds
            </p>
          </motion.div>
        </div>
      )}

      {/* ==================== RESULTS VIEW ==================== */}
      {view === 'results' && analysis && (
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A8A] via-[#2563EB] to-[#60A5FA] py-8 px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-[1140px] mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* File Uploaded Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100 px-6 py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1F2937] text-sm">File Uploaded Successfully</p>
                    <p className="text-xs text-[#6B7280]">
                      {curriculum?.fileName} &bull; {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleChangeFile}
                  className="text-xs gap-1.5 border-[#E5E7EB] text-[#374151] hover:bg-gray-50"
                >
                  Change File
                </Button>
              </div>
            </div>

            {/* 3-Step Progress Indicator (Completed) */}
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-0">
                  {[
                    { label: 'Upload File', step: 1 },
                    { label: 'Generate Report', step: 2 },
                    { label: 'Get Suggestions', step: 3 },
                  ].map((item, idx) => (
                    <React.Fragment key={item.step}>
                      {idx > 0 && (
                        <div className="w-10 sm:w-16 h-0.5 bg-[#2563EB] -mx-0.5" />
                      )}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-bold">
                          {item.step}
                        </div>
                        <span className="text-[10px] text-[#374151] mt-1 font-medium hidden sm:block">{item.label}</span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* ==================== 4 Score Cards ==================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Overall Score */}
                <div className="border border-[#E5E7EB] rounded-xl p-5 flex flex-col items-center">
                  <p className="text-sm font-medium text-[#6B7280] mb-3">Overall Score</p>
                  <CircularProgress value={analysis.overallScore} size={100} strokeWidth={8} />
                </div>

                {/* 2. Report Status */}
                <div className="border border-[#E5E7EB] rounded-xl p-5 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-[#6B7280] mb-3">Report Status</p>
                  {(() => {
                    const badge = getStatusBadge(analysis.effectivenessScore);
                    return (
                      <>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${badge.color}`}>
                          <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                          {badge.text}
                        </span>
                        <p className="text-xs text-[#9CA3AF] mt-2 text-center">
                          {getScoreLabel(analysis.effectivenessScore)} — analysis of {weekData.length} weeks
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* 3. Confidence Score */}
                <div className="border border-[#E5E7EB] rounded-xl p-5 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-[#6B7280] mb-3">Confidence Score</p>
                  <p className="text-4xl font-bold text-[#2563EB]">{analysis.effectivenessScore}%</p>
                  <p className="text-xs text-[#9CA3AF] mt-2 text-center">
                    AI confidence in evaluation accuracy
                  </p>
                </div>

                {/* 4. Detected Topics */}
                <div className="border border-[#E5E7EB] rounded-xl p-5 flex flex-col items-center justify-center">
                  <p className="text-sm font-medium text-[#6B7280] mb-3">Detected Topics</p>
                  <p className="text-lg font-bold text-[#1F2937]">{uniqueTopics.length} Topics</p>
                  <div className="flex flex-wrap gap-1 mt-2 justify-center max-h-16 overflow-hidden">
                    {uniqueTopics.slice(0, 5).map(t => (
                      <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] rounded-full font-medium">
                        {t.length > 18 ? t.slice(0, 18) + '...' : t}
                      </span>
                    ))}
                    {uniqueTopics.length > 5 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-medium">
                        +{uniqueTopics.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================== What's Good / Needs Improvement ==================== */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What's Good */}
                <div className="border border-green-100 rounded-xl p-5 bg-green-50/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h3 className="font-semibold text-green-800 text-sm">What&apos;s Good</h3>
                  </div>
                  {whatIsGood.length > 0 ? (
                    <ul className="space-y-2.5">
                      {whatIsGood.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 shrink-0" />
                          <span className="text-[#374151]">{item.note || `Week ${item.week} topics are current and relevant`}</span>
                        </li>
                      ))}
                      {whatIsGood.length === 0 && (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 shrink-0" />
                          <span className="text-[#374151]">Curriculum structure is well organized</span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <ul className="space-y-2.5">
                      {analysis.summary ? (
                        <li className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 shrink-0" />
                          <span className="text-[#374151]">{analysis.summary}</span>
                        </li>
                      ) : null}
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-[#10B981] mt-0.5 shrink-0" />
                        <span className="text-[#374151]">Curriculum structure covers multiple weeks</span>
                      </li>
                    </ul>
                  )}
                </div>

                {/* Needs Improvement */}
                <div className="border border-orange-100 rounded-xl p-5 bg-orange-50/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center">
                      <AlertTriangle className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h3 className="font-semibold text-orange-800 text-sm">Needs Improvement</h3>
                  </div>
                  {needsImprovement.length > 0 ? (
                    <ul className="space-y-2.5">
                      {needsImprovement.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-[#F59E0B] mt-0.5 shrink-0" />
                          <span className="text-[#374151]">
                            <strong>{item.topic}</strong> — {item.reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-2.5">
                      <li className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-[#F59E0B] mt-0.5 shrink-0" />
                        <span className="text-[#374151]">Consider adding modern industry-relevant topics</span>
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              {/* ==================== AI Suggestions ==================== */}
              <div>
                <h3 className="font-semibold text-[#1F2937] text-base mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#2563EB]" />
                  AI Suggestions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiSuggestions.map((sug, i) => (
                    <div
                      key={i}
                      className="border border-[#E5E7EB] rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <Lightbulb className="h-4 w-4 text-[#2563EB]" />
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityColor(sug.priority)}`}>
                          {sug.priority}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-[#1F2937] mb-1">{sug.topic}</p>
                      <p className="text-xs text-[#6B7280] line-clamp-2">{sug.reason}</p>
                      <div className="flex items-center gap-1 mt-3 text-[#2563EB] text-xs font-medium">
                        Learn more
                        <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ==================== Quick Fix Suggestions ==================== */}
              {quickFixes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#1F2937] text-base mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Quick Fix Suggestions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {quickFixes.map((fix, i) => (
                      <div
                        key={i}
                        className="border border-[#E5E7EB] rounded-xl p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-[#1F2937]">{fix.topic}</p>
                          <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{fix.reason}</p>
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1.5 ${getPriorityColor(fix.priority)}`}>
                            {fix.priority} priority
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== Report Summary & Charts ==================== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Summary Stats */}
                <div className="border border-[#E5E7EB] rounded-xl p-5">
                  <h3 className="font-semibold text-[#1F2937] text-sm mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-[#2563EB]" />
                    Report Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                      <span className="text-sm text-[#6B7280]">Total Weeks</span>
                      <span className="text-sm font-semibold text-[#1F2937]">{weekData.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                      <span className="text-sm text-[#6B7280]">Total Topics</span>
                      <span className="text-sm font-semibold text-[#1F2937]">{uniqueTopics.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                      <span className="text-sm text-[#6B7280]">Outdated Topics</span>
                      <span className="text-sm font-semibold text-red-600">{analysis.outdatedTopics?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                      <span className="text-sm text-[#6B7280]">Recommended Additions</span>
                      <span className="text-sm font-semibold text-blue-600">{analysis.recommendedTopics?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-[#6B7280]">Generated Date</span>
                      <span className="text-sm font-semibold text-[#1F2937]">{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="border border-[#E5E7EB] rounded-xl p-5">
                  <h3 className="font-semibold text-[#1F2937] text-sm mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                    Week Relevance Scores
                  </h3>
                  <div className="h-[200px]">
                    {weekScoreData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weekScoreData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                              fontSize: '12px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#2563EB"
                            strokeWidth={2}
                            dot={{ fill: '#2563EB', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
                        No week analysis data
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ==================== Trend Comparison Chart ==================== */}
              {comparisonData.length > 0 && (
                <div className="border border-[#E5E7EB] rounded-xl p-5">
                  <h3 className="font-semibold text-[#1F2937] text-sm mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#2563EB]" />
                    Curriculum vs Industry Trends
                  </h3>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6B7280' }} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="Curriculum" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={24} />
                        <Bar dataKey="Industry" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* ==================== Action Buttons ==================== */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleDownloadXLS}
                  variant="outline"
                  className="gap-2 border-[#E5E7EB] text-[#2563EB] hover:bg-blue-50 font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download XLS
                </Button>
                <Button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  variant="outline"
                  className="gap-2 border-[#E5E7EB] text-[#2563EB] hover:bg-blue-50 font-medium"
                >
                  <Eye className="h-4 w-4" />
                  View Detailed Report
                </Button>
                <Button
                  onClick={handleReAnalyze}
                  className="gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium"
                >
                  <Sparkles className="h-4 w-4" />
                  Apply AI Improvements
                </Button>
              </div>

              {/* Security Note */}
              <div className="flex items-center justify-center gap-2 pt-2 pb-2">
                <Shield className="h-3.5 w-3.5 text-[#9CA3AF]" />
                <p className="text-xs text-[#9CA3AF]">Your data is secure with us.</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


