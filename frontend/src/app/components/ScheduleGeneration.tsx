import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ArrowLeft, Shuffle, PlayCircle, Info, Plus, Copy, Lock, LockKeyhole } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { generateSchedule, type GenerateMode } from '../utils/api';

interface ScheduleGenerationProps {
  onBack: () => void;
  onAnalyze: (numTransactions: number, schedule: string) => void;
}

export function ScheduleGeneration({ onBack, onAnalyze }: ScheduleGenerationProps) {
  const [numTransactions, setNumTransactions] = useState('2');
  const [transactionInputs, setTransactionInputs] = useState<string[]>(['', '']);
  const [generationMode, setGenerationMode] = useState<GenerateMode>('random');
  const [generatedSchedule, setGeneratedSchedule] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const updateNumTransactions = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      setNumTransactions(value);
      const newInputs = Array(num).fill('').map((_, idx) => 
        idx < transactionInputs.length ? transactionInputs[idx] : ''
      );
      setTransactionInputs(newInputs);
    }
  };

  const updateTransaction = (index: number, value: string) => {
    const newInputs = [...transactionInputs];
    newInputs[index] = value;
    setTransactionInputs(newInputs);
  };

  const handleGenerate = async () => {
    setError('');
    setInfo('');

    if (transactionInputs.some(t => !t.trim())) {
      setError('Please define operations for all transactions');
      return;
    }

    try {
      const { history } = await generateSchedule({
        mode: generationMode,
        transactions: transactionInputs.map(t => t.trim()),
      });
      setGeneratedSchedule(history);
      const modeLabel = generationMode === 'random' ? 'random interleaving' : generationMode === '2pl' ? '2PL protocol' : 'Strict 2PL protocol';
      setInfo(`Generated schedule using ${modeLabel} (backend)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
      setGeneratedSchedule('');
    }
  };

  const handleGenerateAgain = () => {
    handleGenerate();
  };

  const handleAnalyze = () => {
    if (!generatedSchedule.trim()) {
      setError('Please generate a schedule first');
      return;
    }

    const num = parseInt(numTransactions);
    onAnalyze(num, generatedSchedule);
  };

  const handleLoadExample = () => {
    setNumTransactions('2');
    setTransactionInputs([
      'start1 r1[x] w1[x] c1',
      'start2 r2[y] w2[y] c2'
    ]);
    setError('');
    setInfo('');
    setGeneratedSchedule('');
  };

  const handleCopySchedule = () => {
    if (generatedSchedule) {
      navigator.clipboard.writeText(generatedSchedule);
      setInfo('Schedule copied to clipboard!');
      setTimeout(() => setInfo(''), 2000);
    }
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <Shuffle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Schedule Generation
              </h1>
              <p className="text-slate-600">Define transactions and generate random interleavings</p>
            </div>
          </div>
        </div>

        {/* Transaction Definition */}
        <Card className="shadow-xl border-2 border-purple-100 mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-6 h-6 text-purple-600" />
              Define Transactions
            </CardTitle>
            <CardDescription>
              Specify the operations for each transaction
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
                onChange={(e) => updateNumTransactions(e.target.value)}
                placeholder="e.g., 2"
                className="text-lg h-12 border-2 focus:border-purple-400"
              />
            </div>

            <div className="space-y-4">
              {transactionInputs.map((input, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-lg bg-gradient-to-r ${transactionColors[index % transactionColors.length]} text-white font-semibold text-sm shadow-md`}>
                      T{index + 1}
                    </div>
                    <Label htmlFor={`tx-${index}`} className="text-base">
                      Transaction {index + 1} Operations
                    </Label>
                  </div>
                  <Input
                    id={`tx-${index}`}
                    value={input}
                    onChange={(e) => updateTransaction(index, e.target.value)}
                    placeholder={`e.g., start${index + 1} r${index + 1}[x] w${index + 1}[x] c${index + 1}`}
                    className="font-mono text-sm border-2 focus:border-violet-400"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-base">Generation mode</Label>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="genMode"
                    checked={generationMode === 'random'}
                    onChange={() => setGenerationMode('random')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <Shuffle className="w-4 h-4 text-slate-500" />
                  <span>Random</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="genMode"
                    checked={generationMode === '2pl'}
                    onChange={() => setGenerationMode('2pl')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500" />
                  <span>2PL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="genMode"
                    checked={generationMode === 'strict2pl'}
                    onChange={() => setGenerationMode('strict2pl')}
                    className="text-violet-600 focus:ring-violet-500"
                  />
                  <LockKeyhole className="w-4 h-4 text-slate-500" />
                  <span>Strict 2PL</span>
                </label>
              </div>
              <p className="text-xs text-slate-500">
                Random: interleave operations randomly. 2PL / Strict 2PL: simulate the locking protocol to produce a valid schedule.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
              </Alert>
            )}

            {info && !error && (
              <Alert className="bg-purple-50 border-purple-200">
                <Info className="w-4 h-4 text-purple-600" />
                <AlertDescription className="text-purple-800">{info}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button onClick={handleGenerate} size="lg" className="flex-1 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 shadow-lg">
                <Shuffle className="w-4 h-4 mr-2" />
                Generate Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generated Schedule Display */}
        {generatedSchedule && (
          <Card className="shadow-xl border-2 border-violet-100 mb-6">
            <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shuffle className="w-6 h-6 text-violet-600" />
                    Generated Schedule
                  </CardTitle>
                  <CardDescription>
                    {generationMode === 'random' ? 'Random interleaving' : generationMode === '2pl' ? '2PL-simulated schedule' : 'Strict 2PL-simulated schedule'} of transaction operations
                  </CardDescription>
                </div>
                <Button onClick={handleCopySchedule} variant="outline" size="sm">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="bg-gradient-to-r from-slate-50 to-purple-50 p-4 rounded-lg border-2 border-slate-200">
                <p className="font-mono text-sm text-slate-800 break-all leading-relaxed">
                  {generatedSchedule}
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAnalyze} size="lg" className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg">
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Analyze This Schedule
                </Button>
                <Button onClick={handleGenerateAgain} variant="outline" size="lg">
                  <Shuffle className="w-4 h-4 mr-2" />
                  Generate Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 border-2 border-slate-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-purple-600" />
              How Schedule Generation Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
          
            
            <div className="bg-white p-3 rounded-lg border border-violet-200">
              <p className="font-semibold text-violet-700 mb-2">Example:</p>
              <div className="font-mono text-xs space-y-1 text-slate-700">
                <div><span className="text-purple-600 font-bold">T1:</span> start1 r1[x] w1[x] c1</div>
                <div><span className="text-violet-600 font-bold">T2:</span> start2 r2[y] w2[y] c2</div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-indigo-600 font-bold">Possible schedule:</span> start1 r1[x] start2 r2[y] w1[x] w2[y] c1 c2
                </div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-indigo-200">
              <p className="font-semibold text-indigo-700 mb-2">Usage:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Define your transactions with their operations</li>
                <li>Click "Generate Schedule" to create a random interleaving</li>
                <li>Click "Analyze This Schedule" to check properties (SR, RC, ACA, etc.)</li>
                <li>Click "Generate Again" to try different interleavings</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
