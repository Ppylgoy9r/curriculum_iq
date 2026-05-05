'use client';

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-[1600px] mx-auto flex h-16 items-center px-4 md:px-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">CurriculumIQ</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Curriculum Intelligence</p>
            </div>
          </div>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setActiveTab('batches'); loadBatches(); }}
            className="gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 md:px-6 py-6">
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
                      {selectedCurriculum.batch && (
                        <Badge variant="outline">{selectedCurriculum.batch.name}</Badge>
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
                  <Card className="border-emerald-200 bg-emerald-50/50">
                    <CardContent className="py-12">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full border-4 border-emerald-200 flex items-center justify-center">
                            <Brain className="h-10 w-10 text-emerald-600 animate-pulse" />
                          </div>
                          <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                        </div>
                        <div className="text-center">
                          <h3 className="font-semibold text-lg text-emerald-900">AI Analysis in Progress</h3>
                          <p className="text-sm text-emerald-700 mt-1">Comparing curriculum against current industry trends...</p>
                        </div>
                        <div className="w-64">
                          <Progress value={undefined} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2 text-center">This may take 15-30 seconds</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Analysis Results */}
                {analysis && !analyzing && (
                  <>
                    {/* Summary */}
                    <Alert className="border-emerald-200 bg-emerald-50/50">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <AlertTitle className="text-emerald-900">AI Analysis Summary</AlertTitle>
                      <AlertDescription className="text-emerald-800">{analysis.summary}</AlertDescription>
                    </Alert>

                    {/* Score Cards */}
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="border-l-4 border-l-emerald-500">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Effectiveness Score</p>
                              <p className={`text-4xl font-bold mt-1 ${getScoreColor(analysis.effectivenessScore)}`}>
                                {analysis.effectivenessScore}%
                              </p>
                            </div>
                            <Target className={`h-12 w-12 ${analysis.effectivenessScore >= 70 ? 'text-emerald-200' : analysis.effectivenessScore >= 50 ? 'text-amber-200' : 'text-red-200'}`} />
                          </div>
                          <Progress value={analysis.effectivenessScore} className={`mt-3 h-2 ${getScoreBgColor(analysis.effectivenessScore)}`} />
                          <p className="text-xs text-muted-foreground mt-2">
                            {analysis.effectivenessScore >= 75 ? 'Great alignment with industry needs!' :
                             analysis.effectivenessScore >= 50 ? 'Moderate alignment - some updates needed' :
                             'Significant updates required'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Overall Quality</p>
                              <p className={`text-4xl font-bold mt-1 ${getScoreColor(analysis.overallScore)}`}>
                                {analysis.overallScore}%
                              </p>
                            </div>
                            <Zap className={`h-12 w-12 ${analysis.overallScore >= 70 ? 'text-blue-200' : analysis.overallScore >= 50 ? 'text-amber-200' : 'text-red-200'}`} />
                          </div>
                          <Progress value={analysis.overallScore} className="mt-3 h-2 bg-blue-500" />
                          <p className="text-xs text-muted-foreground mt-2">
                            Based on content depth, coverage, and relevance
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-purple-500">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Topics Status</p>
                              <p className="text-4xl font-bold mt-1">
                                {analysis.outdatedTopics?.length || 0}
                                <span className="text-lg text-muted-foreground font-normal ml-1">outdated</span>
                              </p>
                            </div>
                            <BookOpen className="h-12 w-12 text-purple-200" />
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              {analysis.recommendedTopics?.length || 0} to add
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {selectedCurriculum.weekData ? JSON.parse(selectedCurriculum.weekData as string).length : 0} weeks
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Topics need updating for current standards
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Comparison Bar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
                            Curriculum vs Industry Demand
                          </CardTitle>
                          <CardDescription>Compare curriculum coverage with current industry requirements</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={getComparisonData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Bar dataKey="Curriculum Score" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Industry Demand" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Radar Chart */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-emerald-600" />
                            Trend Coverage Radar
                          </CardTitle>
                          <CardDescription>Visual overview of curriculum alignment across technology domains</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={320}>
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData()}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} />
                              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                              <Radar
                                name="Curriculum"
                                dataKey="Curriculum"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.3}
                              />
                              <Radar
                                name="Industry"
                                dataKey="Industry"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.15}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              <Tooltip />
                            </RadarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Week-wise Analysis & Gap Chart */}
                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Week Relevance Line Chart */}
                      <Card className="lg:col-span-2">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-600" />
                            Week-wise Relevance Score
                          </CardTitle>
                          <CardDescription>How relevant each week&apos;s content is to current industry needs</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={getWeekScoreData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'white',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="Relevance Score"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#10b981', r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      {/* Status Distribution Pie */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <PieChart className="h-4 w-4 text-emerald-600" />
                            Status Distribution
                          </CardTitle>
                          <CardDescription>Week content status breakdown</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={getStatusDistribution()}
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                innerRadius={40}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {getStatusDistribution().map((_, index) => (
                                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex flex-wrap gap-2 mt-2 justify-center">
                            {getStatusDistribution().map((item, index) => (
                              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="capitalize">{item.name.replace('_', ' ')} ({item.value})</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Gap Analysis */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingDown className="h-5 w-5 text-amber-500" />
                          Gap Analysis: Curriculum vs Industry
                        </CardTitle>
                        <CardDescription>Negative gaps indicate areas where the curriculum falls behind industry demand</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getComparisonData()} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px',
                              }}
                            />
                            <Bar dataKey="Gap" radius={[4, 4, 0, 0]}>
                              {getComparisonData().map((entry, index) => (
                                <Cell
                                  key={index}
                                  fill={entry.Gap < 0 ? '#ef4444' : entry.Gap === 0 ? '#f59e0b' : '#22c55e'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Week-wise Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-emerald-600" />
                          Week-wise Analysis
                        </CardTitle>
                        <CardDescription>Detailed breakdown of each week&apos;s content relevance</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-20">Week</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-40">Relevance</TableHead>
                                <TableHead>Analysis Notes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {analysis.weekAnalysis?.map((wa) => (
                                <TableRow key={wa.week}>
                                  <TableCell className="font-medium">Week {wa.week}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={getStatusColor(wa.status)}>
                                      {wa.status.replace('_', ' ')}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Progress value={wa.relevanceScore} className={`h-2 w-20 ${getScoreBgColor(wa.relevanceScore)}`} />
                                      <span className="text-sm font-medium">{wa.relevanceScore}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{wa.notes}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
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
