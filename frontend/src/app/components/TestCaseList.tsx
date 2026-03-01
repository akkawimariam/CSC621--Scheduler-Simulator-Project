import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, PlayCircle, Play, Search, FlaskConical, Loader2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import type { TestCase } from '../utils/api';

interface TestCaseListProps {
  onBack: () => void;
  onRunTestCase: (testCase: TestCase) => void;
  onRunAll: (testCases: TestCase[]) => void;
  getTestCases: () => Promise<TestCase[]>;
}

export function TestCaseList({ onBack, onRunTestCase, onRunAll, getTestCases }: TestCaseListProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getTestCases()
      .then(setTestCases)
      .catch((e) => {
        console.error('Failed to load test cases:', e);
        setTestCases([]);
      })
      .finally(() => setLoading(false));
  }, [getTestCases]);

  const filteredTestCases = testCases.filter(
    (tc) =>
      tc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tc.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (id: string) => {
    const num = parseInt(id.replace(/\D/g, ''), 10) || 0;
    if (num % 3 === 0) return 'from-indigo-500 to-purple-500';
    if (num % 3 === 1) return 'from-purple-500 to-violet-500';
    return 'from-violet-500 to-indigo-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
          <p className="text-slate-600">Loading test cases from server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <FlaskConical className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Test Cases
                </h1>
                <p className="text-slate-600">{filteredTestCases.length} predefined test cases available</p>
              </div>
            </div>
            <Button
              onClick={() => onRunAll(testCases)}
              size="lg"
              className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:via-indigo-700 hover:to-purple-700 shadow-xl"
            >
              <Play className="w-4 h-4 mr-2" />
              Run All {testCases.length} Test Cases
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search test cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 border-2 focus:border-violet-400 bg-white shadow-md"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid gap-4 pr-4">
            {filteredTestCases.map((testCase) => (
              <Card
                key={testCase.id}
                className={`cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
                  selectedCase === testCase.id
                    ? 'ring-4 ring-violet-400 border-violet-300 shadow-2xl'
                    : 'border-2 hover:border-violet-300'
                }`}
                onClick={() => setSelectedCase(testCase.id)}
              >
                <CardHeader className="bg-gradient-to-r from-slate-50 to-violet-50">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`w-10 h-10 rounded-lg bg-gradient-to-r ${getCategoryColor(testCase.id)} flex items-center justify-center shadow-md`}
                        >
                          <span className="text-white font-bold text-sm">
                            {testCase.id.replace('case-', '')}
                          </span>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          {testCase.numTransactions} TX
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-800">{testCase.name}</CardTitle>
                      {testCase.description && (
                        <CardDescription className="mt-2 text-slate-600">{testCase.description}</CardDescription>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunTestCase(testCase);
                      }}
                      className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md"
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Run
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-slate-50 to-purple-50 p-4 rounded-lg border-2 border-slate-200 shadow-sm">
                      <p className="text-xs font-semibold text-slate-600 mb-2">Schedule:</p>
                      <p className="font-mono text-sm text-slate-800 break-all leading-relaxed">{testCase.schedule}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        {filteredTestCases.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-lg text-slate-600">No test cases found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
