import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { ArrowLeft, PlayCircle, Info, ChevronRight, ListOrdered, FileEdit, GitBranch } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface ManualInputProps {
  onBack: () => void;
  onAnalyze: (numTransactions: number, schedule: string) => void;
}

export function ManualInput({ onBack, onAnalyze }: ManualInputProps) {
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
    onAnalyze(num, schedule.trim());
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
    'from-purple-500 to-violet-500',
    'from-violet-500 to-indigo-500',
    'from-indigo-500 to-purple-500',
    'from-purple-600 to-violet-600',
    'from-violet-600 to-indigo-600',
    'from-indigo-600 to-purple-600',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-lg">
              <FileEdit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Manual Input
              </h1>
              <p className="text-slate-600">Create your transaction schedule step-by-step</p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-6">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? 'bg-gradient-to-br from-purple-600 to-violet-600 text-white shadow-md' : 'bg-slate-200'}`}>
                1
              </div>
              <span className="text-sm font-medium">Count</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-violet-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md' : 'bg-slate-200'}`}>
                2
              </div>
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 3 ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md' : 'bg-slate-200'}`}>
                3
              </div>
              <span className="text-sm font-medium">Schedule</span>
            </div>
          </div>
        </div>

        {/* Step 1: Number of Transactions */}
        {step === 1 && (
          <Card className="shadow-xl border-2 border-purple-100">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
              <CardTitle className="flex items-center gap-2">
                <ListOrdered className="w-6 h-6 text-purple-600" />
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
                  className="text-lg h-12 border-2 focus:border-purple-400"
                />
                <p className="text-sm text-slate-500">Enter a number between 1 and 10</p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleNextToTransactions} size="lg" className="w-full bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg">
                Next: Define Transactions
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Transaction Definitions */}
        {step === 2 && (
          <Card className="shadow-xl border-2 border-violet-100">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="w-6 h-6 text-violet-600" />
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
                    className="font-mono text-sm border-2 focus:border-violet-400"
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
                <Button onClick={handleNextToSchedule} size="lg" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg">
                  Next: Enter Schedule
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Schedule Input */}
        {step === 3 && (
          <Card className="shadow-xl border-2 border-indigo-100">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-indigo-600" />
                Step 3: Enter Schedule (History)
              </CardTitle>
              <CardDescription>
                Enter the complete interleaved schedule of all operations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Show defined transactions */}
              <div className="bg-gradient-to-r from-slate-50 to-purple-50 p-4 rounded-lg border-2 border-slate-200">
                <p className="text-sm font-semibold text-slate-700 mb-3">Defined Transactions:</p>
                <div className="space-y-2">
                  {transactions.map((transaction, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className={`px-2 py-0.5 rounded bg-gradient-to-r ${transactionColors[index % transactionColors.length]} text-white font-semibold text-xs`}>
                        T{index + 1}
                      </div>
                      <span className="font-mono text-sm text-slate-700">{transaction}</span>
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
                  className="font-mono text-sm border-2 focus:border-indigo-400"
                />
                <p className="text-xs text-slate-500">
                  Enter the complete sequence of operations as they execute in the schedule
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3">
                <Button onClick={() => setStep(2)} variant="outline" size="lg" className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleAnalyze} size="lg" className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Analyze Schedule
                </Button>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Operation Guide - Always visible */}
        <Card className="mt-6 bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 border-2 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              Operation Format Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg border border-purple-200">
                <span className="font-semibold text-purple-700 flex items-center gap-2 mb-2">
                  <FileEdit className="w-4 h-4" />
                  Data Operations:
                </span>
                <div className="ml-4 mt-2 space-y-1 font-mono text-xs">
                  <div><span className="text-purple-600 font-bold">r1[x]</span> - Transaction T1 reads data item x</div>
                  <div><span className="text-violet-600 font-bold">w1[x]</span> - Transaction T1 writes data item x</div>
                  <div><span className="text-indigo-600 font-bold">inc1[x]</span> - Transaction T1 increments x</div>
                  <div><span className="text-purple-600 font-bold">dec1[x]</span> - Transaction T1 decrements x</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-violet-200">
                <span className="font-semibold text-violet-700 flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4" />
                  Transaction Control:
                </span>
                <div className="ml-4 mt-2 space-y-1 font-mono text-xs">
                  <div><span className="text-violet-600 font-bold">start1</span> - Transaction T1 starts (required first)</div>
                  <div><span className="text-violet-600 font-bold">c1</span> - Transaction T1 commits</div>
                  <div><span className="text-indigo-600 font-bold">a1</span> - Transaction T1 aborts</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t-2 border-slate-200">
              <span className="font-semibold text-slate-700 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                Example Schedule:
              </span>
              <div className="mt-2 font-mono text-xs bg-white p-3 rounded-lg border-2 border-slate-200 shadow-sm">
                start1 r1[x] w1[x] start2 r2[y] w2[y] r2[x] c1 c2
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
