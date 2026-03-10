import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowLeft, Download, ChevronDown, ChevronUp, TrendingUp, GitBranch, BarChart3, Lock, LockKeyhole, UnlockKeyhole, PlayCircle } from 'lucide-react';
import type { AnalysisResult } from '../utils/api';
import { validate2PL, type Validate2PLResult, type Validate2PLStep } from '../utils/api';

/** Classify 2PL step for styling: lock acquire, lock release, schedule op, violation, or result. */
function get2PLStepType(step: Validate2PLStep): 'acquire' | 'release' | 'schedule' | 'violation' | 'result' {
  const e = step.event.trim();
  const ex = step.explanation.toLowerCase();
  if (e === '(result)') return 'result';
  if (/^rl\d+\[/.test(e) || /^wl\d+\[/.test(e)) {
    return ex.includes('cannot acquire') || ex.includes('does not follow strict 2pl') ? 'violation' : 'acquire';
  }
  if (/^ru\d+\[/.test(e) || /^wu\d+\[/.test(e)) return 'release';
  return 'schedule';
}
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
  const colorName = result ? (color.startsWith('from-brand-') ? color.split(' ')[0].split('-').slice(1, 3).join('-') : 'brand-a') : '';

  return (
    <Card className={`overflow-hidden border-2 transition-all hover:shadow-xl ${result ? `border-${colorName}-200` : 'border-error-200'}`}>
      <CardHeader className={`${result ? `bg-gradient-to-r from-${colorName}-50 to-${colorName}-100` : 'bg-error-50 border-error-200'}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant={result ? 'default' : 'destructive'} 
                className={`text-sm font-bold ${result ? `bg-gradient-to-r ${color}` : 'bg-gradient-to-r from-error-600 to-error-700'} shadow-md`}
              >
                {abbreviation}
              </Badge>
              {result ? (
                <CheckCircle2 className={`w-6 h-6 text-${colorName}-600`} />
              ) : (
                <AlertCircle className="w-6 h-6 text-error-600" />
              )}
            </div>
            <CardTitle className="text-lg font-bold">{title}</CardTitle>
            <CardDescription className="mt-2">
              <span className={`font-bold text-base ${result ? `text-${colorName}-700` : 'text-error-700'}`}>
                {result ? 'YES' : 'NO'}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {serialOrder != null && serialOrder.length > 0 && (
          <p className="text-sm font-semibold text-brand-a-700 mb-2">
            Equivalent serial order: {serialOrder.map((t) => `T${t}`).join(' → ')}
          </p>
        )}
        <p className="text-sm text-neutral-700 mb-3 leading-relaxed">{explanation}</p>
        
        {steps.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between hover:bg-neutral-50 border-2">
                <span className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Step-by-step analysis
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="bg-gradient-to-r from-neutral-50 to-brand-a-50 p-4 rounded-lg border-2 border-neutral-200 shadow-inner">
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
    <div className="min-h-screen bg-gradient-to-br from-brand-a-50 via-brand-b-50 to-brand-c-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-between items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-a-600 via-brand-b-600 to-brand-c-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-a-600 via-brand-b-600 to-brand-c-600 bg-clip-text text-transparent">
                  Analysis Results
                </h1>
                <p className="text-neutral-600 font-mono text-sm mt-1">{schedule}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleDownloadResults} className="border-2 hover:bg-white shadow-md">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={onNewSchedule} className="bg-gradient-to-r from-brand-b-600 to-brand-c-600 hover:from-brand-b-700 hover:to-brand-c-700 shadow-lg">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analyze Another
              </Button>
            </div>
          </div>
        </div>

        {/* Score Card */}
        <Card className="mb-6 bg-gradient-to-r from-white via-brand-a-50 to-brand-b-50 border-2 border-brand-a-200 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-600 mb-1">Properties Satisfied</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-brand-a-600 via-brand-b-600 to-brand-c-600 bg-clip-text text-transparent">
                  {passedCount} / 5
                </p>
              </div>
              <div className="flex gap-2">
                <div className={`w-3 h-16 rounded-full ${result.conflictSerializable.result ? 'bg-gradient-to-b from-brand-a-400 to-brand-a-600' : 'bg-neutral-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.recoverable.result ? 'bg-gradient-to-b from-brand-b-400 to-brand-b-600' : 'bg-neutral-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.avoidsCascadingAborts.result ? 'bg-gradient-to-b from-brand-c-400 to-brand-c-600' : 'bg-neutral-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.strict.result ? 'bg-gradient-to-b from-brand-a-400 to-brand-b-600' : 'bg-neutral-200'}`}></div>
                <div className={`w-3 h-16 rounded-full ${result.rigorous.result ? 'bg-gradient-to-b from-brand-b-400 to-brand-c-600' : 'bg-neutral-200'}`}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {result.violations.length > 0 && (
          <Alert variant="destructive" className="mb-6 border-2 border-error-200 shadow-lg">
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
            color="from-brand-a-600 to-brand-b-600"
            serialOrder={result.conflictSerializable.serialOrder}
          />
          <PropertyCard
            title="Recoverable"
            abbreviation="RC"
            result={result.recoverable.result}
            explanation={result.recoverable.explanation}
            steps={result.recoverable.steps}
            color="from-brand-b-600 to-brand-c-600"
          />
          <PropertyCard
            title="Avoids Cascading Aborts"
            abbreviation="ACA"
            result={result.avoidsCascadingAborts.result}
            explanation={result.avoidsCascadingAborts.explanation}
            steps={result.avoidsCascadingAborts.steps}
            color="from-brand-c-600 to-brand-a-600"
          />
          <PropertyCard
            title="Strict Schedule"
            abbreviation="ST"
            result={result.strict.result}
            explanation={result.strict.explanation}
            steps={result.strict.steps}
            color="from-brand-a-500 to-brand-b-500"
          />
          <PropertyCard
            title="Rigorous Schedule"
            abbreviation="RG"
            result={result.rigorous.result}
            explanation={result.rigorous.explanation}
            steps={result.rigorous.steps}
            color="from-brand-b-500 to-brand-c-500"
          />
        </div>

        <Card className="border-2 border-neutral-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-neutral-50 via-brand-a-50 to-brand-b-50">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-brand-a-600" />
              Visual Diagrams
            </CardTitle>
            <CardDescription className="text-base">
              Graphical representation of the schedule and conflicts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs value={diagramTab} onValueChange={setDiagramTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-gradient-to-r from-brand-a-100 to-brand-b-100">
                <TabsTrigger value="precedence" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-a-600 data-[state=active]:to-brand-b-600 data-[state=active]:text-white">
                  Precedence Graph
                </TabsTrigger>
                <TabsTrigger value="history" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-b-600 data-[state=active]:to-brand-c-600 data-[state=active]:text-white">
                  History Diagram
                </TabsTrigger>
                <TabsTrigger value="2pl" className="font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-brand-c-600 data-[state=active]:to-brand-a-600 data-[state=active]:text-white">
                  <LockKeyhole className="w-4 h-4 mr-1 inline" />
                  2PL / Strict 2PL
                </TabsTrigger>
              </TabsList>
              <TabsContent value="precedence" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-brand-a-50 to-brand-b-50 p-4 rounded-lg border-2 border-brand-a-200 shadow-sm">
                  <h3 className="font-semibold text-brand-a-900 mb-2 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    About Precedence Graph
                  </h3>
                  <p className="text-sm text-brand-a-800 leading-relaxed">
                    The precedence graph shows conflict relationships between transactions. 
                    A <span className="font-bold">cycle</span> indicates the schedule is NOT conflict-serializable. 
                    An <span className="font-bold">acyclic graph</span> means the schedule is serializable with the topological order representing the equivalent serial schedule.
                  </p>
                </div>
                {result.conflictSerializable.result && result.conflictSerializable.serialOrder?.length ? (
                  <p className="text-sm font-semibold text-brand-a-700">
                    Equivalent serial order: {result.conflictSerializable.serialOrder.map((t) => `T${t}`).join(' → ')}
                  </p>
                ) : null}
                {result.precedenceGraph.nodes.length > 0 ? (
                  <PrecedenceGraph
                    nodes={result.precedenceGraph.nodes}
                    edges={result.precedenceGraph.edges}
                  />
                ) : (
                  <div className="text-center py-12 text-neutral-500">
                    <GitBranch className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <p className="text-lg">No precedence graph data available</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="history" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-brand-b-50 to-brand-c-50 p-4 rounded-lg border-2 border-brand-b-200 shadow-sm">
                  <h3 className="font-semibold text-brand-b-900 mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    About History Diagram
                  </h3>
                  <p className="text-sm text-brand-b-800 leading-relaxed">
                    The history diagram shows the operation-level view of the schedule. 
                    Each row represents a transaction timeline. <span className="font-bold">Solid lines</span> connect operations within a transaction. 
                    <span className="font-bold text-error-600"> Dashed red lines</span> show conflict edges between operations from different transactions.
                  </p>
                </div>
                {operations.length > 0 ? (
                  <HistoryDiagram
                    operations={operations}
                    numTransactions={numTransactions}
                  />
                ) : (
                  <div className="text-center py-12 text-neutral-500">
                    <BarChart3 className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <p className="text-lg">No history diagram data available</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="2pl" className="space-y-4 mt-4">
                <div className="bg-gradient-to-r from-brand-c-50 to-brand-a-50 p-4 rounded-lg border-2 border-brand-c-200 shadow-sm">
                  <h3 className="font-semibold text-brand-c-900 mb-2 flex items-center gap-2">
                    <LockKeyhole className="w-5 h-5" />
                    2PL / Strict 2PL validation
                  </h3>
                  <p className="text-sm text-brand-c-800 leading-relaxed mb-3">
                    Check whether this schedule could have been produced by a Two-Phase Locking (2PL) or Strict 2PL scheduler.
                    <span className="block mt-2 font-medium text-brand-c-900">Legend:</span>
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 font-mono font-semibold border border-emerald-300">
                      <Lock className="w-3.5 h-3.5" /> rl / wl
                    </span>
                    <span className="text-neutral-600">acquire read/write lock</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100 text-sky-800 px-2 py-1 font-mono font-semibold border border-sky-300">
                      <UnlockKeyhole className="w-3.5 h-3.5" /> ru / wu
                    </span>
                    <span className="text-neutral-600">release lock</span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 px-2 py-1 font-mono font-semibold border border-amber-300">
                      <PlayCircle className="w-3.5 h-3.5" /> r1[x], c1, …
                    </span>
                    <span className="text-neutral-600">schedule operation</span>
                  </div>
                </div>
                {validate2PLLoading && (
                  <p className="text-sm text-neutral-600">Loading validation…</p>
                )}
                {validate2PLError && (
                  <Alert variant="destructive" className="border-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{validate2PLError}</AlertDescription>
                  </Alert>
                )}
                {!validate2PLLoading && !validate2PLError && validate2PLData && (
                  <>
                    <div className="flex flex-wrap gap-3 items-center">
                      <Badge className={validate2PLData.followsStrict2PL ? 'bg-success' : 'bg-error-600'}>
                        Strict 2PL: {validate2PLData.followsStrict2PL ? 'YES' : 'NO'}
                      </Badge>
                      <Badge className={validate2PLData.follows2PL ? 'bg-success' : 'bg-error-600'}>
                        2PL: {validate2PLData.follows2PL ? 'YES' : 'NO'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-neutral-800">Step-by-step</h4>
                      <div className="bg-gradient-to-r from-neutral-50 to-brand-c-50 p-4 rounded-lg border-2 border-neutral-200 shadow-inner max-h-[420px] overflow-y-auto">
                        <ol className="space-y-2 list-none pl-0">
                          {validate2PLData.steps.map((step, index) => {
                            const stepType = get2PLStepType(step);
                            const isViolation = stepType === 'violation';
                            const isResult = stepType === 'result';
                            const borderClass = isViolation
                              ? 'border-l-4 border-error-500 bg-error-50'
                              : stepType === 'acquire'
                                ? 'border-l-4 border-emerald-500 bg-emerald-50/50'
                                : stepType === 'release'
                                  ? 'border-l-4 border-sky-500 bg-sky-50/50'
                                  : stepType === 'schedule'
                                    ? 'border-l-4 border-amber-400 bg-amber-50/30'
                                    : 'border-l-4 border-brand-c-500 bg-brand-c-50/50';
                            return (
                              <li key={index} className={`flex gap-3 items-start text-sm rounded-r px-3 py-2 ${borderClass}`}>
                                <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/80 text-neutral-600 font-semibold text-xs shadow-sm">
                                  {index + 1}
                                </span>
                                {stepType === 'acquire' && <Lock className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
                                {stepType === 'release' && <UnlockKeyhole className="w-4 h-4 shrink-0 text-sky-600 mt-0.5" />}
                                {stepType === 'schedule' && <PlayCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />}
                                {isViolation && <AlertCircle className="w-4 h-4 shrink-0 text-error-600 mt-0.5" />}
                                <div className="flex-1 min-w-0">
                                  <span className="font-mono font-bold text-neutral-800">{step.event}</span>
                                  {isViolation && (
                                    <span className="ml-2 inline-flex items-center rounded bg-error-200 text-error-800 text-xs font-semibold px-1.5 py-0.5">Violation</span>
                                  )}
                                  <p className="text-neutral-700 mt-0.5">{step.explanation}</p>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
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
