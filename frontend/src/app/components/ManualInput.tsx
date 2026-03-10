import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ArrowLeft, PlayCircle, Info, ChevronRight, ListOrdered, FileEdit, GitBranch, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface ManualInputProps {
  onBack: () => void;
  onAnalyze: (numTransactions: number, schedule: string, transactions?: string[]) => void;
  analysisError?: string | null;
  clearAnalysisError?: () => void;
  analyzing?: boolean;
}

export function ManualInput({ onBack, onAnalyze, analysisError, clearAnalysisError, analyzing = false }: ManualInputProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [numTransactions, setNumTransactions] = useState('2');
  const [transactions, setTransactions] = useState<string[]>(['', '']);
  const [schedule, setSchedule] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const num = parseInt(numTransactions);
    if (!isNaN(num) && num > 0) {
      setTransactions(Array(num).fill(''));
    }
  }, [numTransactions]);

  const handleNextToTransactions = () => {
    const num = parseInt(numTransactions);
    if (isNaN(num) || num < 1) {
      setError('Please enter a valid number of transactions (≥ 1)');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextToSchedule = () => {
    const allFilled = transactions.every(t => t.trim() !== '');
    if (!allFilled) {
      setError('Please define operations for all transactions');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleAnalyze = () => {
    const num = parseInt(numTransactions);
    
    if (!schedule.trim()) {
      setError('Please enter a schedule');
      return;
    }
    
    setError('');
    onAnalyze(num, schedule.trim(), transactions.filter((t) => t.trim() !== ''));
  };

  const handleExample = () => {
    setNumTransactions('2');
    setTransactions(['start1 r1[x] w1[x] c1', 'start2 r2[x] w2[y] c2']);
    setSchedule('start1 r1[x] w1[x] start2 r2[x] w2[y] c1 c2');
    setStep(3);
    setError('');
  };

  const updateTransaction = (index: number, value: string) => {
    const newTransactions = [...transactions];
    newTransactions[index] = value;
    setTransactions(newTransactions);
  };

  const transactionColors = [
    'from-brand-a-500 to-brand-b-500',
    'from-brand-b-500 to-brand-c-500',
    'from-brand-c-500 to-brand-a-500',
    'from-brand-a-600 to-brand-b-600',
    'from-brand-b-600 to-brand-c-600',
    'from-brand-c-600 to-brand-a-600',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-a-50 via-brand-b-50 to-brand-c-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-a-600 to-brand-b-600 flex items-center justify-center shadow-lg">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-a-600 via-brand-b-600 to-brand-c-600 bg-clip-text text-transparent">
                Manual Input
              </h1>
              <p className="text-neutral-600">Create your transaction schedule step-by-step</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-brand-a-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-gradient-to-br from-brand-a-600 to-brand-b-600 text-white shadow-md' : 'bg-neutral-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Count</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-brand-b-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-gradient-to-br from-brand-b-600 to-brand-c-600 text-white shadow-md' : 'bg-neutral-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-brand-c-600' : 'text-neutral-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-gradient-to-br from-brand-c-600 to-brand-a-600 text-white shadow-md' : 'bg-neutral-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Schedule</span>
            </div>
          </div>
        </div>

        {/* Step 1: Number of Transactions */}
        {step === 1 && (
          <Card className="shadow-xl border-2 border-brand-a-100">
            <CardHeader className="bg-gradient-to-r from-brand-a-50 to-brand-b-50">
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="w-6 h-6 text-brand-a-600" />
                Step 1: Number of Transactions
              </CardTitle>
              <CardDescription>
                How many transactions will be in your schedule?
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="numTransactions" className="text-base">Number of Transactions</Label>
                <Input
                  id="numTransactions"
                  type="number"
                  min="1"
                  max="10"
                  value={numTransactions}
                  onChange={(e) => setNumTransactions(e.target.value)}
                  placeholder="e.g., 2"
                  className="text-lg h-12 border-2 focus:border-brand-a-400"
                />
                <p className="text-sm text-neutral-500">Enter a number between 1 and 10</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleNextToTransactions} size="lg" className="w-full bg-gradient-to-r from-brand-a-600 to-brand-b-600 hover:from-brand-a-700 hover:to-brand-b-700 shadow-lg">
                Next: Define Transactions
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Transaction Definitions */}
        {step === 2 && (
          <Card className="shadow-xl border-2 border-brand-b-100">
            <CardHeader className="bg-gradient-to-r from-brand-b-50 to-brand-c-50">
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-6 h-6 text-brand-b-600" />
                Step 2: Define Transaction Operations
              </CardTitle>
              <CardDescription>
                Each transaction must start with startN and end with cN or aN (e.g., T1: start1 r1[x] w1[x] c1)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {transactions.map((transaction, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${transactionColors[index % transactionColors.length]} text-white font-semibold text-sm shadow-md`}>
                      T{index + 1}
                    </div>
                    <Label htmlFor={`transaction-${index}`} className="text-base">
                      Transaction {index + 1} Operations
                    </Label>
                  </div>
                  <Input
                    id={`transaction-${index}`}
                    value={transaction}
                    onChange={(e) => updateTransaction(index, e.target.value)}
                    placeholder={`e.g., start${index + 1} r${index + 1}[x] w${index + 1}[x] c${index + 1}`}
                    className="font-mono text-sm border-2 focus:border-brand-b-400"
                  />
                </div>
              ))}

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setStep(1)} variant="outline" size="lg" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNextToSchedule} size="lg" className="flex-1 bg-gradient-to-r from-brand-b-600 to-brand-c-600 hover:from-brand-b-700 hover:to-brand-c-700 shadow-lg">
                  Next: Enter Schedule
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Schedule Input */}
        {step === 3 && (
          <Card className="shadow-xl border-2 border-brand-c-100">
            <CardHeader className="bg-gradient-to-r from-brand-c-50 to-brand-a-50">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-brand-c-600" />
                Step 3: Enter Schedule (History)
              </CardTitle>
              <CardDescription>
                Enter the complete interleaved schedule of all operations. The first occurrence of each transaction in the schedule must be its START (e.g. start1, start2, …).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Show defined transactions */}
              <div className="bg-gradient-to-r from-neutral-50 to-brand-a-50 p-4 rounded-lg border-2 border-neutral-200">
                <p className="text-sm font-semibold text-neutral-700 mb-3">Defined Transactions:</p>
                <div className="space-y-2">
                  {transactions.map((transaction, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className={`px-2 py-0.5 rounded bg-gradient-to-r ${transactionColors[index % transactionColors.length]} text-white font-semibold text-xs`}>
                        T{index + 1}
                      </div>
                      <span className="font-mono text-sm text-neutral-700">{transaction}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule" className="text-base">Schedule (Interleaved History)</Label>
                <Textarea
                  id="schedule"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="e.g., start1 r1[x] w1[x] start2 r2[x] w2[y] c1 c2"
                  rows={5}
                  className="font-mono text-sm border-2 focus:border-brand-c-400"
                />
                <p className="text-xs text-neutral-500">
                  Enter the complete sequence of operations as they execute in the schedule
                </p>
              </div>

              {(error || analysisError) && (
                <Alert variant="destructive">
                  <AlertDescription>{error || analysisError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button onClick={() => { setStep(2); clearAnalysisError?.(); }} variant="outline" size="lg" className="flex-1" disabled={analyzing}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleAnalyze} size="lg" className="flex-1 bg-gradient-to-r from-brand-c-600 to-brand-a-600 hover:from-brand-c-700 hover:to-brand-a-700 shadow-lg" disabled={analyzing}>
                  {analyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
                  {analyzing ? 'Analyzing…' : 'Analyze Schedule'}
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Operation Guide - Always visible */}
        <Card className="mt-6 bg-gradient-to-r from-brand-a-50 via-brand-b-50 to-brand-c-50 border-2 border-neutral-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-a-600" />
              Operation Format Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-brand-a-200">
                <span className="font-semibold text-brand-a-700 flex items-center gap-2 mb-2">
                  <FileEdit className="w-4 h-4" />
                  Data Operations:
                </span>
                <div className="ml-4 mt-2 space-y-1 font-mono text-xs">
                  <div><span className="text-brand-a-600 font-bold">r1[x]</span> - Transaction T1 reads data item x</div>
                  <div><span className="text-brand-b-600 font-bold">w1[x]</span> - Transaction T1 writes data item x</div>
                  <div><span className="text-brand-c-600 font-bold">inc1[x]</span> - Transaction T1 increments x</div>
                  <div><span className="text-brand-a-600 font-bold">dec1[x]</span> - Transaction T1 decrements x</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-brand-b-200">
                <span className="font-semibold text-brand-b-700 flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4" />
                  Transaction Control:
                </span>
                <div className="ml-4 mt-2 space-y-1 font-mono text-xs">
                  <div><span className="text-brand-b-600 font-bold">start1</span> - Transaction T1 starts (required first)</div>
                  <div><span className="text-brand-b-600 font-bold">c1</span> - Transaction T1 commits</div>
                  <div><span className="text-brand-c-600 font-bold">a1</span> - Transaction T1 aborts</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t-2 border-neutral-200">
              <span className="font-semibold text-neutral-700 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                Example Schedule:
              </span>
              <div className="mt-2 font-mono text-xs bg-white p-3 rounded-lg border-2 border-neutral-200 shadow-sm">
                start1 r1[x] w1[x] start2 r2[y] w2[y] r2[x] c1 c2
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
