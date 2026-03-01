import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, ChevronDown, ChevronUp, TrendingUp, GitBranch, BarChart3, Lock, LockKeyhole } from 'lucide-react';
import type { AnalysisResult } from '../utils/api';
import { validate2PL, type Validate2PLResult } from '../utils/api';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { PrecedenceGraph } from './PrecedenceGraph';
import { HistoryDiagram } from './HistoryDiagram';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalysisResultsProps {
  result: AnalysisResult;
  schedule: string;
  numTransactions: number;
  operations: any[];
  onBack: () => void;
  onNewSchedule: () => void;
  onTwoPLAnalysis?: () => void;
}

interface PropertyCardProps {
  title: string;
  abbreviation: string;
  result: boolean;
  explanation: string;
  steps: string[];
  color: string;
  serialOrder?: number[];
}

function PropertyCard({ title, abbreviation, result, explanation, steps, color, serialOrder }: PropertyCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className={`overflow-hidden border-2 transition-all hover:shadow-xl ${result ? `border-${color}-200` : 'border-red-200'}`}>
      <CardHeader className={`${result ? `bg-gradient-to-r from-${color}-50 to-${color}-100` : 'bg-gradient-to-r from-red-50 to-rose-100'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={result ? 'default' : 'destructive'} 
                className={`text-sm font-bold ${result ? `bg-gradient-to-r ${color}` : 'bg-gradient-to-r from-red-500 to-rose-500'} shadow-md`}
              >
                {abbreviation}
              </Badge>
              {result ? (
                <CheckCircle2 className={`w-6 h-6 text-${color.split('-')[1]}-600`} />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <CardTitle className="text-lg font-bold">{title}</CardTitle>
            <CardDescription className="mt-2">
              <span className={`font-bold text-base ${result ? `text-${color.split('-')[1]}-700` : 'text-red-700'}`}>
                {result ? 'YES' : 'NO'}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {serialOrder != null && serialOrder.length > 0 && (
          <p className="text-sm font-semibold text-purple-700 mb-2">
            Equivalent serial order: {serialOrder.map((t) => `T${t}`).join(' → ')}
          </p>
        )}
        <p className="text-sm text-slate-700 mb-3 leading-relaxed">{explanation}</p>
        
        {steps.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between hover:bg-slate-50 border-2">
                <span className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Step-by-step analysis
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-gradient-to-r from-slate-50 to-purple-50 p-4 rounded-lg border-2 border-slate-200 shadow-inner">
                <div className="space-y-1 text-xs font-mono leading-relaxed">
                  {steps.map((step, index) => (
                    <div key={index} className="whitespace-pre-wrap">{step}</div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalysisResults({ 
  result, 
  schedule, 
  numTransactions, 
  operations,
  onBack, 
  onNewSchedule,
  onTwoPLAnalysis
}: AnalysisResultsProps) {
  const [diagramTab, setDiagramTab] = useState('precedence');
  const [validate2PLData, setValidate2PLData] = useState<Validate2PLResult | null>(null);
  const [validate2PLLoading, setValidate2PLLoading] = useState(false);
  const [validate2PLError, setValidate2PLError] = useState<string | null>(null);

  useEffect(() => {
    if (diagramTab !== '2pl' || !schedule.trim()) return;
    setValidate2PLLoading(true);
    setValidate2PLError(null);
    validate2PL(schedule)
      .then(setValidate2PLData)
      .catch((e) => setValidate2PLError(e instanceof Error ? e.message : 'Validation failed'))
      .finally(() => setValidate2PLLoading(false));
  }, [diagramTab, schedule]);

  const handleDownloadResults = () => {
    const text = `Transaction Schedule Analysis Results
${'='.repeat(50)}

Schedule: ${schedule}
Number of Transactions: ${numTransactions}

RESULTS:
--------
Conflict-Serializable (SR): ${result.conflictSerializable.result ? 'YES' : 'NO'}
${result.conflictSerializable.explanation}

Recoverable (RC): ${result.recoverable.result ? 'YES' : 'NO'}
${result.recoverable.explanation}

Avoids Cascading Aborts (ACA): ${result.avoidsCascadingAborts.result ? 'YES' : 'NO'}
${result.avoidsCascadingAborts.explanation}

Strict: ${result.strict.result ? 'YES' : 'NO'}
${result.strict.explanation}

Rigorous: ${result.rigorous.result ? 'YES' : 'NO'}
${result.rigorous.explanation}

${result.violations.length > 0 ? `\nVIOLATIONS:\n${result.violations.map(v => '- ' + v).join('\n')}` : ''}
`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis-results.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const passedCount = [
    result.conflictSerializable.result,
    result.recoverable.result,
    result.avoidsCascadingAborts.result,
    result.strict.result,
    result.rigorous.result
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Analysis Results
                </h1>
                <p className="text-slate-600 font-mono text-sm mt-1">{schedule}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleDownloadResults} className="border-2 hover:bg-white shadow-md">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={onNewSchedule} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze Another
              </Button>
            </div>
          </div>
        </div>

        {/* Score Card */}
        <Card className="mb-6 bg-gradient-to-r from-white via-purple-50 to-violet-50 border-2 border-purple-200 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Properties Satisfied</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  {passedCount} / 5
                </p>
              </div>
              <div className="flex gap-2">
                <div className={`w-3 h-16 rounded-full ${result.conflictSerializable.result ? 'bg-gradient-to-b from-purple-400 to-purple-600' : 'bg-slate-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.recoverable.result ? 'bg-gradient-to-b from-violet-400 to-violet-600' : 'bg-slate-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.avoidsCascadingAborts.result ? 'bg-gradient-to-b from-indigo-400 to-indigo-600' : 'bg-slate-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.strict.result ? 'bg-gradient-to-b from-purple-400 to-violet-600' : 'bg-slate-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.rigorous.result ? 'bg-gradient-to-b from-violet-400 to-indigo-600' : 'bg-slate-200'}`}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {result.violations.length > 0 && (
          <Alert variant="destructive" className="mb-6 border-2 border-red-300 shadow-lg">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="font-bold text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Violations Detected
            </AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside mt-2 space-y-1">
                {result.violations.map((violation, index) => (
                  <li key={index} className="font-medium">{violation}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <PropertyCard
            title="Conflict-Serializable"
            abbreviation="SR"
            result={result.conflictSerializable.result}
            explanation={result.conflictSerializable.explanation}
            steps={result.conflictSerializable.steps}
            color="from-purple-600 to-violet-600"
            serialOrder={result.conflictSerializable.serialOrder}
          />
          <PropertyCard
            title="Recoverable"
            abbreviation="RC"
            result={result.recoverable.result}
            explanation={result.recoverable.explanation}
            steps={result.recoverable.steps}
            color="from-violet-600 to-indigo-600"
          />
          <PropertyCard
            title="Avoids Cascading Aborts"
            abbreviation="ACA"
            result={result.avoidsCascadingAborts.result}
            explanation={result.avoidsCascadingAborts.explanation}
            steps={result.avoidsCascadingAborts.steps}
            color="from-indigo-600 to-purple-600"
          />
          <PropertyCard
            title="Strict Schedule"
            abbreviation="ST"
            result={result.strict.result}
            explanation={result.strict.explanation}
            steps={result.strict.steps}
            color="from-purple-500 to-violet-500"
          />
          <PropertyCard
            title="Rigorous Schedule"
            abbreviation="RG"
            result={result.rigorous.result}
            explanation={result.rigorous.explanation}
            steps={result.rigorous.steps}
            color="from-violet-500 to-indigo-500"
          />
        </div>

        <Card className="border-2 border-slate-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-50 via-purple-50 to-violet-50">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-purple-600" />
              Visual Diagrams
            </CardTitle>
            <CardDescription className="text-base">
              Graphical representation of the schedule and conflicts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={diagramTab} onValueChange={setDiagramTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-gradient-to-r from-purple-100 to-violet-100">
                <TabsTrigger value="precedence" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-violet-600 data-[state=active]:text-white">
                  Precedence Graph
                </TabsTrigger>
                <TabsTrigger value="history" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  History Diagram
                </TabsTrigger>
                <TabsTrigger value="2pl" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
                  <LockKeyhole className="w-4 h-4 mr-1 inline" />
                  2PL / Strict 2PL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="precedence" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border-2 border-purple-200 shadow-sm">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    About Precedence Graph
                  </h3>
                  <p className="text-sm text-purple-800 leading-relaxed">
                    The precedence graph shows conflict relationships between transactions. 
                    A <span className="font-bold">cycle</span> indicates the schedule is NOT conflict-serializable. 
                    An <span className="font-bold">acyclic graph</span> means the schedule is serializable with the topological order representing the equivalent serial schedule.
                  </p>
                </div>
                {result.conflictSerializable.result && result.conflictSerializable.serialOrder?.length ? (
                  <p className="text-sm font-semibold text-purple-700">
                    Equivalent serial order: {result.conflictSerializable.serialOrder.map((t) => `T${t}`).join(' → ')}
                  </p>
                ) : null}
                {result.precedenceGraph.nodes.length > 0 ? (
                  <PrecedenceGraph
                    nodes={result.precedenceGraph.nodes}
                    edges={result.precedenceGraph.edges}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <GitBranch className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg">No precedence graph data available</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-4 rounded-lg border-2 border-violet-200 shadow-sm">
                  <h3 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    About History Diagram
                  </h3>
                  <p className="text-sm text-violet-800 leading-relaxed">
                    The history diagram shows the operation-level view of the schedule. 
                    Each row represents a transaction timeline. <span className="font-bold">Solid lines</span> connect operations within a transaction. 
                    <span className="font-bold text-red-600"> Dashed red lines</span> show conflict edges between operations from different transactions.
                  </p>
                </div>
                {operations.length > 0 ? (
                  <HistoryDiagram
                    operations={operations}
                    numTransactions={numTransactions}
                  />
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-lg">No history diagram data available</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="2pl" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border-2 border-indigo-200 shadow-sm">
                  <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                    <LockKeyhole className="w-5 h-5" />
                    2PL / Strict 2PL validation
                  </h3>
                  <p className="text-sm text-indigo-800 leading-relaxed">
                    Check whether this schedule could have been produced by a Two-Phase Locking (2PL) or Strict 2PL scheduler.
                    Lock commands: <span className="font-mono font-bold">rl</span> = read lock, <span className="font-mono font-bold">wl</span> = write lock, <span className="font-mono font-bold">ru</span> = release read, <span className="font-mono font-bold">wu</span> = release write.
                  </p>
                </div>
                {validate2PLLoading && (
                  <p className="text-sm text-slate-600">Loading validation…</p>
                )}
                {validate2PLError && (
                  <Alert variant="destructive" className="border-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validate2PLError}</AlertDescription>
                  </Alert>
                )}
                {!validate2PLLoading && !validate2PLError && validate2PLData && (
                  <>
                    <div className="flex flex-wrap gap-3">
                      <Badge className={validate2PLData.followsStrict2PL ? 'bg-green-600' : 'bg-red-600'}>
                        Strict 2PL: {validate2PLData.followsStrict2PL ? 'YES' : 'NO'}
                      </Badge>
                      <Badge className={validate2PLData.follows2PL ? 'bg-green-600' : 'bg-red-600'}>
                        2PL: {validate2PLData.follows2PL ? 'YES' : 'NO'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-800">Step-by-step (lock commands rl, wl, ru, wu)</h4>
                      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 p-4 rounded-lg border-2 border-slate-200 shadow-inner max-h-[420px] overflow-y-auto">
                        <div className="space-y-2">
                          {validate2PLData.steps.map((step, index) => (
                            <div key={index} className="flex gap-3 items-start text-sm">
                              <span className="font-mono font-bold text-indigo-700 shrink-0 min-w-[100px]">{step.event}</span>
                              <span className="text-slate-700">{step.explanation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
