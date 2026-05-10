

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Upload,
  FileSpreadsheet,
  BarChart3,
  Brain,
  GraduationCap,
  Plus,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Target,
  Lightbulb,
  ChevronRight,
  Loader2,
  Layers,
  Zap,
  ArrowLeftRight,
  Download,
  FileDown,
} from 'lucide-react';

// ==================== Data Normalization ====================
function normalizeAnalysis(raw: any): Analysis | null {
  if (!raw) return null;
  try {
    // The AI returns trendComparison; the DB stores it as stringified trendMatch
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

// ==================== Main App ====================
export default function Home() {
  const [activeTab, setActiveTab] = useState('batches');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  const analysisSteps = [
    "Scanning curriculum structure...",
    "Extracting weekly topics...",
    "Consulting 2025 industry trends database...",
    "Identifying outdated technologies...",
    "Mapping skill gaps across domains...",
    "Synthesizing recommendations...",
    "Finalizing effectiveness scores..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (analyzing) {
      setAnalysisStep(0);
      setProcessingLogs(["[INFO] Initializing AI Analysis Engine..."]);
      interval = setInterval(() => {
        setAnalysisStep(prev => {
          const next = (prev + 1) % analysisSteps.length;
          setProcessingLogs(logs => [
            ...logs.slice(-5),
            `[PROCESS] ${analysisSteps[next]}`,
            `[DATA] Analyzing weight for Week ${Math.floor(Math.random() * 12) + 1}...`
          ]);
          return next;
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  // Dialog states
  const [createBatchOpen, setCreateBatchOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchDesc, setNewBatchDesc] = useState('');

  // Upload states
  const [uploadBatchId, setUploadBatchId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Load batches
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/batch');
      if (res.ok) {
        const data = await res.json();
        setBatches(data);
      }
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
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

  // Delete batch
  const handleDeleteBatch = async (id: string) => {
    try {
      await fetch(`/api/batch?id=${id}`, { method: 'DELETE' });
      await loadBatches();
      if (selectedBatch?.id === id) {
        setSelectedBatch(null);
        setSelectedCurriculum(null);
        setAnalysis(null);
      }
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  // Upload curriculum
  const handleUpload = async () => {
    if (!uploadFile || !uploadBatchId) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('batchId', uploadBatchId);

      const res = await fetch('/api/curriculum/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      await loadBatches();
      setUploadDialogOpen(false);
      setUploadFile(null);

      // Select the uploaded curriculum
      const updatedBatch = batches.find(b => b.id === uploadBatchId);
      if (updatedBatch) {
        setSelectedBatch(updatedBatch);
        // Re-fetch to get updated curricula
        const batchRes = await fetch('/api/batch');
        if (batchRes.ok) {
          const allBatches = await batchRes.json();
          const freshBatch = allBatches.find((b: Batch) => b.id === uploadBatchId);
          if (freshBatch && freshBatch.curricula.length > 0) {
            const latestCurriculum = freshBatch.curricula[freshBatch.curricula.length - 1];
            setSelectedCurriculum(latestCurriculum);
            if (latestCurriculum.analysis) {
              setAnalysis(normalizeAnalysis(latestCurriculum.analysis));
            }
          }
        }
      }
    } catch (err) {
      setError('Failed to upload curriculum');
    } finally {
      setUploading(false);
    }
  };

  // Analyze curriculum
  const handleAnalyze = async () => {
    if (!selectedCurriculum) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculumId: selectedCurriculum.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Analysis failed');
        return;
      }
      setAnalysis(normalizeAnalysis(data.analysis));
      setActiveTab('dashboard');
    } catch (err) {
      setError('Failed to analyze curriculum');
    } finally {
      setAnalyzing(false);
    }
  };

  // View curriculum analysis
  const handleViewCurriculum = async (curriculum: Curriculum) => {
    setSelectedCurriculum(curriculum);
    const normalized = normalizeAnalysis(curriculum.analysis);
    setAnalysis(normalized);
    setActiveTab('dashboard');
  };

  // ==================== Download XLS ====================
  const handleDownloadXLS = async () => {
    if (!analysis || !selectedCurriculum) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Updated Curriculum with Recommendations
      const weekDataRaw = selectedCurriculum.weekData;
      const weekData: WeekData[] = typeof weekDataRaw === 'string' ? JSON.parse(weekDataRaw) : weekDataRaw || [];

      const curriculumRows: Record<string, string | number>[] = [];
      weekData.forEach(w => {
        w.topics.forEach((t, idx) => {
          const weekNote = analysis.weekAnalysis?.find(wa => wa.week === w.week);
          const isOutdated = analysis.outdatedTopics?.some(ot => ot.week === w.week && ot.topic.toLowerCase().includes(t.toLowerCase()));
          curriculumRows.push({
            'Week': w.week,
            'Topic': t,
            'Status': isOutdated ? 'OUTDATED - Replace' : (weekNote?.status || 'Current'),
            'Relevance Score': weekNote?.relevanceScore || '-',
            'Notes': weekNote?.notes || '',
            'Action': isOutdated ? 'Remove or update this topic' : 'Keep as is',
          });
        });
        // Add recommended topics for this week
        const recommended = analysis.recommendedTopics?.filter(rt => rt.suggestedWeek === w.week) || [];
        recommended.forEach(rt => {
          curriculumRows.push({
            'Week': w.week,
            'Topic': rt.topic,
            'Status': 'NEW - Add',
            'Relevance Score': '-',
            'Notes': rt.reason,
            'Action': `Add this topic (${rt.priority} priority)`,
          });
        });
      });
      // Add recommended topics that don't match existing weeks
      const existingWeeks = new Set(weekData.map(w => w.week));
      const orphanRecs = (analysis.recommendedTopics || []).filter(rt => !existingWeeks.has(rt.suggestedWeek));
      orphanRecs.forEach(rt => {
        curriculumRows.push({
          'Week': rt.suggestedWeek,
          'Topic': rt.topic,
          'Status': 'NEW - Add',
          'Relevance Score': '-',
          'Notes': rt.reason,
          'Action': `Add this topic (${rt.priority} priority)`,
        });
      });

      const ws1 = XLSX.utils.json_to_sheet(curriculumRows);
      ws1['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 20 }, { wch: 16 }, { wch: 50 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Updated Curriculum');

      // Sheet 2: Analysis Summary
      const summaryRows: Record<string, string | number>[] = [
        { 'Metric': 'Effectiveness Score', 'Value': analysis.effectivenessScore + '%' },
        { 'Metric': 'Overall Quality Score', 'Value': analysis.overallScore + '%' },
        { 'Metric': 'Total Weeks', 'Value': weekData.length },
        { 'Metric': 'Outdated Topics', 'Value': analysis.outdatedTopics?.length || 0 },
        { 'Metric': 'Recommended Additions', 'Value': analysis.recommendedTopics?.length || 0 },
        { 'Metric': 'Analysis Date', 'Value': new Date().toLocaleDateString() },
        { 'Metric': 'Summary', 'Value': analysis.summary },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryRows);
      ws2['!cols'] = [{ wch: 30 }, { wch: 80 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Analysis Summary');

      // Sheet 3: Trend Comparison
      if (analysis.trendMatch && analysis.trendMatch.categories.length > 0) {
        const trendRows = analysis.trendMatch.categories.map((cat, i) => ({
          'Category': cat,
          'Curriculum Score': analysis.trendMatch.curriculumScore[i],
          'Industry Demand': analysis.trendMatch.industryDemand[i],
          'Gap': analysis.trendMatch.gap[i],
        }));
        const ws3 = XLSX.utils.json_to_sheet(trendRows);
        ws3['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Trend Comparison');
      }

      // Sheet 4: Outdated Topics
      if (analysis.outdatedTopics && analysis.outdatedTopics.length > 0) {
        const outdatedRows = analysis.outdatedTopics.map(ot => ({
          'Week': ot.week,
          'Topic': ot.topic,
          'Reason': ot.reason,
        }));
        const ws4 = XLSX.utils.json_to_sheet(outdatedRows);
        ws4['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws4, 'Outdated Topics');
      }

      // Sheet 5: Recommended Topics
      if (analysis.recommendedTopics && analysis.recommendedTopics.length > 0) {
        const recRows = analysis.recommendedTopics.map(rt => ({
          'Suggested Week': rt.suggestedWeek,
          'Topic': rt.topic,
          'Priority': rt.priority,
          'Reason': rt.reason,
        }));
        const ws5 = XLSX.utils.json_to_sheet(recRows);
        ws5['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 60 }];
        XLSX.utils.book_append_sheet(wb, ws5, 'Recommended Topics');
      }

      const fileName = selectedCurriculum.fileName.replace(/\.[^.]+$/, '') + '_analysis.xlsx';
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to generate download file');
    }
  };

  // ==================== Chart Data Helpers ====================
  const getComparisonData = () => {
    if (!analysis?.trendMatch) return [];
    return analysis.trendMatch.categories.map((cat, i) => ({
      category: cat,
      'Curriculum Score': analysis.trendMatch.curriculumScore[i],
      'Industry Demand': analysis.trendMatch.industryDemand[i],
      'Gap': analysis.trendMatch.gap[i],
    }));
  };

  const getRadarData = () => {
    if (!analysis?.trendMatch) return [];
    return analysis.trendMatch.categories.map((cat, i) => ({
      category: cat,
      'Curriculum': analysis.trendMatch.curriculumScore[i],
      'Industry': analysis.trendMatch.industryDemand[i],
    }));
  };

  const getWeekScoreData = () => {
    if (!analysis?.weekAnalysis) return [];
    return analysis.weekAnalysis.map(w => ({
      week: `W${w.week}`,
      'Relevance Score': w.relevanceScore,
    }));
  };

  const getStatusDistribution = () => {
    if (!analysis?.weekAnalysis) return [];
    const counts: Record<string, number> = {};
    analysis.weekAnalysis.forEach(w => {
      counts[w.status] = (counts[w.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6'];

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'current': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'outdated': return 'bg-red-100 text-red-700 border-red-200';
      case 'needs_update': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // ==================== Render ====================
  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="container flex-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
              <Brain className="h-7 w-7" />
            </div>
            <div>
              <h1 className="heading-hero">
                Curriculum<span className="text-gradient-emerald">IQ</span>
              </h1>
              <p className="text-muted">AI-Powered Curriculum Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="iq-btn iq-btn-outline"
              onClick={() => { setActiveTab('batches'); loadBatches(); }}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button
              className="iq-btn iq-btn-primary"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>Upload XLS</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container grow animate-up">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="batches" className="gap-2">
              <Layers className="h-4 w-4 hidden sm:block" />
              Batches & Upload
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2" disabled={!selectedCurriculum}>
              <BarChart3 className="h-4 w-4 hidden sm:block" />
              Analysis Dashboard
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="gap-2" disabled={!analysis}>
              <Lightbulb className="h-4 w-4 hidden sm:block" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* ==================== Tab 1: Batches & Upload ==================== */}
          <TabsContent value="batches" className="space-y-6">
            {/* Create Batch */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Admin Panel</h2>
                <p className="text-muted-foreground">Manage batches, upload curricula, and analyze effectiveness</p>
              </div>
              <Dialog open={createBatchOpen} onOpenChange={setCreateBatchOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4" />
                    Create Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
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
                      <Textarea
                        id="batch-desc"
                        placeholder="Optional description of the batch"
                        value={newBatchDesc}
                        onChange={e => setNewBatchDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateBatchOpen(false)}>Cancel</Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleCreateBatch}
                      disabled={!newBatchName.trim()}
                    >
                      Create Batch
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Batch List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : batches.length === 0 ? (
              <Card className="py-20">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No batches yet</h3>
                    <p className="text-muted-foreground mt-1">Create your first batch to get started with curriculum analysis.</p>
                  </div>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setCreateBatchOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Create First Batch
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {batches.map(batch => (
                  <Card key={batch.id} className="relative group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{batch.name}</CardTitle>
                          {batch.description && (
                            <CardDescription className="line-clamp-2">{batch.description}</CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteBatch(batch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>{batch.curricula?.length || 0} curriculum{(batch.curricula?.length || 0) !== 1 ? 's' : ''}</span>
                      </div>

                      {/* Curriculum list in batch */}
                      {batch.curricula && batch.curricula.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Curricula</p>
                          {batch.curricula.map(cur => (
                            <div
                              key={cur.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => handleViewCurriculum(cur)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span className="text-sm truncate">{cur.fileName}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                {cur.analysis && (
                                  <Badge variant={cur.analysis.effectivenessScore >= 70 ? 'default' : 'destructive'} className="text-xs">
                                    {cur.analysis.effectivenessScore}%
                                  </Badge>
                                )}
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload button for this batch */}
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          setUploadBatchId(batch.id);
                          setUploadDialogOpen(true);
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload Curriculum (XLS)
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Curriculum</DialogTitle>
                  <DialogDescription>
                    Upload an XLS/XLSX file containing week-wise curriculum topics. The system will automatically extract and organize the data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Target Batch</Label>
                    <Select value={uploadBatchId} onValueChange={setUploadBatchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {batches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Curriculum File (XLS/XLSX)</Label>
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      {uploadFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
                          <p className="text-sm font-medium">{uploadFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-10 w-10" />
                          <p className="text-sm font-medium">Click to upload or drag & drop</p>
                          <p className="text-xs">XLS, XLSX formats supported</p>
                        </div>
                      )}
                      <input
                        id="file-input"
                        type="file"
                        accept=".xls,.xlsx"
                        className="hidden"
                        onChange={e => setUploadFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">Expected file format:</p>
                    <p>Column 1: Week number (e.g., &quot;Week 1&quot;, &quot;Unit 1&quot;)</p>
                    <p>Column 2: Topics covered in that week</p>
                    <p>The system will auto-detect column headers.</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setUploadDialogOpen(false); setUploadFile(null); }}>Cancel</Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={handleUpload}
                    disabled={!uploadFile || !uploadBatchId || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload & Parse
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ==================== Tab 2: Analysis Dashboard ==================== */}
          <TabsContent value="dashboard" className="space-y-6">
            {!selectedCurriculum ? (
              <Card className="py-20">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No curriculum selected</h3>
                    <p className="text-muted-foreground mt-1">Go to the Batches tab and select a curriculum to analyze.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Curriculum Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl font-bold tracking-tight">
                        {selectedCurriculum.fileName}
                      </h2>
                      {selectedBatch && (
                        <Badge variant="outline">{selectedBatch.name}</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Uploaded on {new Date(selectedCurriculum.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {!analysis && (
                      <Button
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing with AI...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            Analyze Curriculum
                          </>
                        )}
                      </Button>
                    )}
                    {analysis && (
                      <>
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={handleAnalyze}
                          disabled={analyzing}
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Re-analyzing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Re-Analyze
                            </>
                          )}
                        </Button>
                        <Button
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleDownloadXLS}
                        >
                          <FileDown className="h-4 w-4" />
                          Download Analysis (XLS)
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Analyzing State */}
                {analyzing && (
                  <div className="iq-card border-emerald-200 bg-emerald-50/50">
                    <div className="p-8">
                      <div className="flex flex-col items-center gap-6">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full border-4 border-emerald-200 flex items-center justify-center">
                            <Brain className="h-10 w-10 text-emerald-600 animate-pulse" />
                          </div>
                          <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-bold text-xl text-emerald-900">AI Analysis in Progress</h3>
                          <p className="text-sm font-semibold text-emerald-600 h-5">
                            {analysisSteps[analysisStep]}
                          </p>
                        </div>
                        <div className="terminal-container">
                          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/20">
                            <div className="h-full bg-emerald-500" style={{ width: '30%', animation: 'progressMove 2s infinite' }} />
                          </div>
                          <div className="terminal-lines">
                            {processingLogs.map((log, i) => (
                              <div key={i} className="terminal-line">
                                {log}
                              </div>
                            ))}
                            <div className="animate-pulse">_</div>
                          </div>
                        </div>
                        <div style={{ width: '100%', maxWidth: '300px' }}>
                          <Progress value={((analysisStep + 1) / analysisSteps.length) * 100} className="h-2" />
                          <p className="text-xs text-muted mt-2 text-center">Estimated time: 15-20 seconds</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Analysis Results */}
                {analysis && !analyzing && (
                  <>
                    {/* Top Stats - Featured Score Card */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <div className="iq-card featured-report-card lg:col-span-2 overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 transition-transform duration-1000 group-hover:scale-110">
                          <Brain className="h-48 w-48" />
                        </div>
                        <div className="relative z-10 p-8 pb-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-white/10 backdrop-blur-md">
                              <Sparkles className="h-5 w-5 text-amber-300" />
                            </div>
                            <div>
                              <h3 className="text-emerald-50 font-bold text-2xl">Curriculum Intelligence Report</h3>
                              <p className="text-emerald-100/60 font-medium">Strategic Industry Alignment Analysis</p>
                            </div>
                          </div>
                        </div>
                        <CardContent className="relative z-10 flex flex-col md:flex-row items-center gap-10 py-8">
                        <div className="relative flex items-center justify-center shrink-0">
                          <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl animate-pulse" />
                          <svg className="w-40 h-40 transform -rotate-90 drop-shadow-2xl">
                              <circle
                                cx="80"
                                cy="80"
                                r="72"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-white/10"
                              />
                              <circle
                                cx="80"
                                cy="80"
                                r="72"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={452}
                                strokeDashoffset={452 - (452 * analysis.effectivenessScore) / 100}
                                strokeLinecap="round"
                                className="text-emerald-300 transition-all duration-[2000ms] ease-out"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-4xl font-black">{analysis.effectivenessScore}%</span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200/70">Score</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-inner">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                              </span>
                              <span className="text-xs font-black uppercase tracking-widest text-emerald-50">AI Executive Summary</span>
                            </div>
                            <p className="text-xl font-medium leading-relaxed text-emerald-50 text-pretty">
                              {analysis.summary}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Industry Match Card */}
                      <Card className="border-none bg-white shadow-xl flex flex-col justify-between overflow-hidden group">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Market Alignment</CardTitle>
                            <div className="p-2 rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                              <Target className="h-5 w-5" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center py-6">
                          <div className="text-7xl font-black text-slate-800 tracking-tighter transition-transform duration-500 group-hover:scale-110">
                            {analysis.overallScore}
                            <span className="text-2xl text-slate-300 font-bold ml-1">/100</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-500 mt-4 text-center px-4">
                            Matching 2025 industry competency requirements
                          </p>
                        </CardContent>
                        <div className="p-6 bg-slate-50 mt-auto border-t border-slate-100">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            <span>Legacy</span>
                            <span>Modern Standard</span>
                          </div>
                          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-[1500ms] ease-in-out shadow-sm" 
                              style={{ width: `${analysis.overallScore}%` }}
                            />
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Charts Section */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 pb-4 bg-slate-50/30">
                          <CardTitle className="flex items-center gap-3 text-slate-800 text-lg">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                              <BarChart3 className="h-5 w-5 text-emerald-600" />
                            </div>
                            Domain Coverage Map
                          </CardTitle>
                          <CardDescription className="font-medium text-slate-500">Industry demand vs. current curriculum focus</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-10">
                          <ResponsiveContainer width="100%" height={340}>
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getComparisonData()}>
                              <PolarGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                              <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar
                                name="Current Curriculum"
                                dataKey="Curriculum"
                                stroke="#10b981"
                                strokeWidth={3}
                                fill="#10b981"
                                fillOpacity={0.4}
                              />
                              <Radar
                                name="Industry Standard"
                                dataKey="Industry"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fill="#6366f1"
                                fillOpacity={0.1}
                                strokeDasharray="5 5"
                              />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                itemStyle={{ fontWeight: 600 }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="border-none shadow-xl bg-white overflow-hidden">
                        <CardHeader className="border-b border-slate-50 pb-4 bg-slate-50/30">
                          <CardTitle className="flex items-center gap-3 text-slate-800 text-lg">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                              <TrendingDown className="h-5 w-5 text-amber-600" />
                            </div>
                            Critical Skill Gap Audit
                          </CardTitle>
                          <CardDescription className="font-medium text-slate-500">Identification of deficit areas in the learning path</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 pt-10">
                          <ResponsiveContainer width="100%" height={340}>
                            <BarChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="1 6" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} />
                              <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                              />
                              <Bar dataKey="Gap" radius={[8, 8, 0, 0]} barSize={44}>
                                {getComparisonData().map((entry, index) => (
                                  <Cell
                                    key={index}
                                    fill={entry.Gap < 0 ? '#fb7185' : entry.Gap === 0 ? '#fbbf24' : '#34d399'}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Table Section */}
                    <Card className="border-none shadow-xl bg-white overflow-hidden">
                      <CardHeader className="border-b border-slate-100 px-8 py-6 bg-slate-50/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <CardTitle className="flex items-center gap-3 text-slate-800 text-xl font-bold">
                              <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                                <BookOpen className="h-6 w-6" />
                              </div>
                              Granular Curriculum Audit
                            </CardTitle>
                            <CardDescription className="mt-1 font-medium text-slate-500">A week-by-week deep dive into content relevance and industry alignment</CardDescription>
                          </div>
                          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 shadow-sm">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Duration:</span>
                            <span className="text-sm font-black text-emerald-600">{analysis.weekAnalysis?.length} Weeks</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="iq-table-container">
                          <table className="iq-table">
                            <thead>
                              <tr>
                                <th className="w-28 text-center">Timeline</th>
                                <th className="w-44">Status Maturity</th>
                                <th className="w-60">Relevance Index</th>
                                <th>Strategic Analyst Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysis.weekAnalysis.map((item, index) => (
                                <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-xs font-black text-slate-400">WEEK</span>
                                      <span className="text-2xl font-black text-emerald-600 leading-none">{item.week}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className={`iq-badge ${
                                      item.status.toLowerCase().includes('current') ? 'status-current' : 
                                      item.status.toLowerCase().includes('outdated') ? 'status-outdated' : 
                                      'status-missing'
                                    }`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${
                                        wa.status === 'outdated' ? 'bg-rose-500' :
                                        'bg-amber-500'
                                      }`} />
                                      {wa.status.replace('_', ' ')}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-4 group/score">
                                      <div className="h-2.5 flex-1 bg-slate-100 rounded-full overflow-hidden shadow-inner p-0.5">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-1000 group-hover/score:scale-y-110 ${
                                            wa.relevanceScore >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 
                                            wa.relevanceScore >= 60 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
                                            'bg-gradient-to-r from-rose-400 to-rose-500'
                                          }`}
                                          style={{ width: `${wa.relevanceScore}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-black text-slate-700 min-w-[4ch] tabular-nums">{wa.relevanceScore}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-6">
                                    <p className="text-sm font-semibold leading-relaxed text-slate-600 max-w-xl group-hover:text-slate-900 transition-colors">
                                      {wa.notes}
                                    </p>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
              </>
            )}
          </TabsContent>

          {/* ==================== Tab 3: Recommendations ==================== */}
          <TabsContent value="recommendations" className="space-y-6">
            {!analysis ? (
              <Card className="py-20">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Lightbulb className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No analysis available</h3>
                    <p className="text-muted-foreground mt-1">Analyze a curriculum first to see recommendations.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Lightbulb className="h-6 w-6 text-amber-500" />
                    AI Recommendations
                  </h2>
                  <p className="text-muted-foreground">Smart suggestions to modernize your curriculum based on current industry trends</p>
                </div>

                {/* Outdated Topics */}
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Outdated Topics ({analysis.outdatedTopics?.length || 0})
                    </CardTitle>
                    <CardDescription>These topics are outdated and need to be updated or replaced</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!analysis.outdatedTopics || analysis.outdatedTopics.length === 0) ? (
                      <div className="flex items-center gap-2 py-4 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="font-medium">No outdated topics detected!</p>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        {analysis.outdatedTopics.map((topic, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-red-600">{topic.week}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-red-900">{topic.topic}</p>
                              <p className="text-xs text-red-600 mt-1">{topic.reason}</p>
                            </div>
                            <Badge variant="destructive" className="shrink-0">Week {topic.week}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recommended Topics to Add */}
                <Card className="border-emerald-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                      <Sparkles className="h-5 w-5" />
                      Recommended Topics to Add ({analysis.recommendedTopics?.length || 0})
                    </CardTitle>
                    <CardDescription>These modern topics should be added to keep the curriculum competitive</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(!analysis.recommendedTopics || analysis.recommendedTopics.length === 0) ? (
                      <p className="text-muted-foreground py-4">No specific topic recommendations at this time.</p>
                    ) : (
                      <div className="max-h-96 overflow-y-auto space-y-3">
                        {analysis.recommendedTopics.map((topic, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                              <span className="text-xs font-bold text-emerald-600">{topic.suggestedWeek}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm text-emerald-900">{topic.topic}</p>
                                <Badge
                                  variant={getPriorityColor(topic.priority) as "destructive" | "default" | "secondary"}
                                  className="text-xs"
                                >
                                  {topic.priority} priority
                                </Badge>
                              </div>
                              <p className="text-xs text-emerald-600 mt-1">{topic.reason}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 bg-white border-emerald-200 text-emerald-700">
                              Week {topic.suggestedWeek}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Download Updated Curriculum XLS */}
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                  <CardContent className="py-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <FileDown className="h-7 w-7 text-emerald-600" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="font-semibold text-emerald-900">Download Updated Curriculum</h3>
                        <p className="text-sm text-emerald-700 mt-0.5">Get a complete XLS file with outdated topics marked, recommended topics added, and full analysis report across 5 sheets</p>
                      </div>
                      <Button
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 shrink-0"
                        onClick={handleDownloadXLS}
                      >
                        <Download className="h-4 w-4" />
                        Download XLS
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex items-center justify-between text-sm text-muted-foreground">
          <p>CurriculumIQ — AI-Powered Curriculum Intelligence</p>
          <p>Built with Next.js & AI Analysis</p>
        </div>
      </footer>
    </div>
  );
}
