import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, FlaskConical, Database, Zap, TrendingUp, GitBranch, Clock, Shuffle } from 'lucide-react';

interface HomeScreenProps {
  onManualInput: () => void;
  onTestCases: () => void;
  onScheduleGeneration: () => void;
}

export function HomeScreen({ onManualInput, onTestCases, onScheduleGeneration }: HomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-6">
      <div className="max-w-5xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Transaction Scheduler
          </h1>
          <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Simulator
          </h2>
          <p className="text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed">
            Analyze database transaction schedules for <span className="font-semibold text-purple-600">conflict-serializability</span>, 
            <span className="font-semibold text-violet-600"> recoverability</span>, 
            and <span className="font-semibold text-indigo-600">concurrency properties (including 2PL validation).</span>
          </p>
          <p className="text-sm text-slate-500 mt-3">
            A graduate-level DBMS tool for Transaction Processing Systems
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <Card 
            className="hover:shadow-2xl transition-all cursor-pointer border-2 hover:border-purple-400 hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50" 
            onClick={onManualInput}
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Manual Input
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Enter your own transaction schedule and analyze it step-by-step with detailed explanations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={onManualInput} size="lg" className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg">
                <Zap className="w-4 h-4 mr-2" />
                Start Manual Input
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-2xl transition-all cursor-pointer border-2 hover:border-violet-400 hover:-translate-y-1 bg-gradient-to-br from-white to-violet-50" 
            onClick={onScheduleGeneration}
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
                <Shuffle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Generate Schedule
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Define transactions and automatically generate random interleavings for analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={onScheduleGeneration} size="lg" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg">
                <Shuffle className="w-4 h-4 mr-2" />
                Generate Schedules
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-2xl transition-all cursor-pointer border-2 hover:border-indigo-400 hover:-translate-y-1 bg-gradient-to-br from-white to-indigo-50" 
            onClick={onTestCases}
          >
            <CardHeader>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                <FlaskConical className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Run Test Cases
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Select from 16 predefined test cases or run all cases automatically with comprehensive results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={onTestCases} size="lg" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                <FlaskConical className="w-4 h-4 mr-2" />
                Browse Test Cases
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="pt-6">
              <TrendingUp className="w-8 h-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-purple-900 mb-1">5 Property Analysis</h3>
              <p className="text-sm text-purple-700">SR, RC, ACA, Strict, Rigorous</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200">
            <CardContent className="pt-6">
              <GitBranch className="w-8 h-8 text-violet-600 mb-2" />
              <h3 className="font-semibold text-violet-900 mb-1">Visual Diagrams</h3>
              <p className="text-sm text-violet-700">Precedence & History graphs</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="pt-6">
              <Clock className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-indigo-900 mb-1">Step-by-step</h3>
              <p className="text-sm text-indigo-700">Detailed explanations</p>
            </CardContent>
          </Card>
        </div>

        {/* Operation Reference Card */}
        <Card className="bg-gradient-to-r from-slate-50 via-purple-50 to-violet-50 border-2 border-slate-200 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Supported Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="font-mono font-bold text-slate-600 text-base mb-1">start1</div>
                <div className="text-xs text-slate-600">START(T1)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                <div className="font-mono font-bold text-purple-600 text-base mb-1">r1[x]</div>
                <div className="text-xs text-slate-600">READ(T1, x)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-violet-200 shadow-sm">
                <div className="font-mono font-bold text-violet-600 text-base mb-1">w1[x]</div>
                <div className="text-xs text-slate-600">WRITE(T1, x)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                <div className="font-mono font-bold text-indigo-600 text-base mb-1">inc1[x]</div>
                <div className="text-xs text-slate-600">INCREMENT(T1, x)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-purple-200 shadow-sm">
                <div className="font-mono font-bold text-purple-600 text-base mb-1">dec1[x]</div>
                <div className="text-xs text-slate-600">DECREMENT(T1, x)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-violet-200 shadow-sm">
                <div className="font-mono font-bold text-violet-600 text-base mb-1">c1</div>
                <div className="text-xs text-slate-600">COMMIT(T1)</div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm">
                <div className="font-mono font-bold text-indigo-600 text-base mb-1">a1</div>
                <div className="text-xs text-slate-600">ABORT(T1)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
