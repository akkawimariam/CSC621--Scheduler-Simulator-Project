import React, { useState, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { ManualInput } from './components/ManualInput';
import { TestCaseList } from './components/TestCaseList';
import { AnalysisResults } from './components/AnalysisResults';
import { ScheduleGeneration } from './components/ScheduleGeneration';
import { TwoPLAnalysis } from './components/TwoPLAnalysis';
import { analyzeSchedule, getTestCases, type AnalysisResult, type TestCase } from './utils/api';

type Screen = 'home' | 'manual' | 'testcases' | 'results' | 'allresults' | 'generation' | 'twopl';

interface AnalysisData {
  result: AnalysisResult;
  schedule: string;
  numTransactions: number;
  operations: any[];
}

interface MultipleTestResults {
  testCase: TestCase;
  result: AnalysisResult;
  operations: any[];
  numTransactions: number;
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [multipleResults, setMultipleResults] = useState<MultipleTestResults[]>([]);
  const [failedRunAll, setFailedRunAll] = useState<{ testCase: TestCase; error: string }[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [returnToScreen, setReturnToScreen] = useState<Screen>('home');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [testCaseCount, setTestCaseCount] = useState<number | null>(null);

  useEffect(() => {
    if (currentScreen === 'home') {
      getTestCases()
        .then((t) => setTestCaseCount(t.length))
        .catch(() => setTestCaseCount(null));
    }
  }, [currentScreen]);

  const handleManualInput = () => {
    setCurrentScreen('manual');
    setAnalysisError(null);
  };

  const handleTestCases = () => {
    setCurrentScreen('testcases');
    setAnalysisError(null);
  };

  const handleScheduleGeneration = () => {
    setCurrentScreen('generation');
    setAnalysisError(null);
  };

  const handleTwoPLAnalysis = () => {
    if (analysisData) {
      setCurrentScreen('twopl');
    }
  };

  const handleAnalyze = async (numTransactions: number, scheduleStr: string) => {
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      const { result, operations, numTransactions: n } = await analyzeSchedule(scheduleStr.trim());
      setAnalysisData({
        result,
        schedule: scheduleStr.trim(),
        numTransactions: n,
        operations,
      });
      setReturnToScreen(currentScreen);
      setCurrentScreen('results');
    } catch (error) {
      console.error('Analysis error:', error);
      const message = error instanceof Error ? error.message : 'Error analyzing schedule. Please check your input format (include start1, start2, etc.).';
      setAnalysisError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunTestCase = (testCase: TestCase) => {
    handleAnalyze(testCase.numTransactions, testCase.schedule);
  };

  const handleRunAllTestCases = async (testCases: TestCase[]) => {
    const results: MultipleTestResults[] = [];
    const failed: { testCase: TestCase; error: string }[] = [];
    let firstData: AnalysisData | null = null;
    for (const testCase of testCases) {
      try {
        const { result, operations, numTransactions } = await analyzeSchedule(testCase.schedule);
        results.push({ testCase, result, operations, numTransactions });
        if (!firstData) {
          firstData = {
            result,
            schedule: testCase.schedule,
            numTransactions,
            operations,
          };
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        failed.push({ testCase, error: msg });
        console.error(`Error analyzing test case ${testCase.id}:`, error);
      }
    }
    setMultipleResults(results);
    setFailedRunAll(failed);
    setCurrentResultIndex(0);
    setAnalysisData(firstData ?? null);
    setCurrentScreen('allresults');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setAnalysisData(null);
    setMultipleResults([]);
    setFailedRunAll([]);
    setCurrentResultIndex(0);
    setAnalysisError(null);
  };

  const handleBackFromResults = () => {
    setCurrentScreen(returnToScreen);
    setAnalysisData(null);
  };

  const handleNewSchedule = () => {
    setCurrentScreen('manual');
    setAnalysisData(null);
  };

  const handleNavigateResult = (index: number) => {
    if (index >= 0 && index < multipleResults.length) {
      const r = multipleResults[index];
      setAnalysisData({
        result: r.result,
        schedule: r.testCase.schedule,
        numTransactions: r.numTransactions,
        operations: r.operations,
      });
      setCurrentResultIndex(index);
    }
  };

  if (currentScreen === 'home') {
    return (
      <HomeScreen 
        onManualInput={handleManualInput} 
        onTestCases={handleTestCases}
        onScheduleGeneration={handleScheduleGeneration}
        testCaseCount={testCaseCount}
      />
    );
  }

  if (currentScreen === 'manual') {
    return (
      <ManualInput
        onBack={handleBackToHome}
        onAnalyze={handleAnalyze}
        analysisError={analysisError}
        clearAnalysisError={() => setAnalysisError(null)}
        analyzing={analyzing}
      />
    );
  }

  if (currentScreen === 'generation') {
    return (
      <ScheduleGeneration
        onBack={handleBackToHome}
        onAnalyze={handleAnalyze}
        analysisError={analysisError}
        clearAnalysisError={() => setAnalysisError(null)}
        analyzing={analyzing}
      />
    );
  }

  if (currentScreen === 'testcases') {
    return (
      <TestCaseList
        onBack={handleBackToHome}
        onRunTestCase={handleRunTestCase}
        onRunAll={handleRunAllTestCases}
        getTestCases={getTestCases}
      />
    );
  }

  if (currentScreen === 'twopl' && analysisData) {
    return (
      <TwoPLAnalysis
        schedule={analysisData.schedule}
        numTransactions={analysisData.numTransactions}
        onBack={() => setCurrentScreen('results')}
      />
    );
  }

  if (currentScreen === 'results' && analysisData) {
    return (
      <AnalysisResults
        result={analysisData.result}
        schedule={analysisData.schedule}
        numTransactions={analysisData.numTransactions}
        operations={analysisData.operations}
        onBack={handleBackFromResults}
        onNewSchedule={handleNewSchedule}
        onTwoPLAnalysis={handleTwoPLAnalysis}
      />
    );
  }

  if (currentScreen === 'allresults') {
    const totalRun = multipleResults.length + failedRunAll.length;
    const passedCount = multipleResults.length;
    const failedCount = failedRunAll.length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-c-50 via-white to-brand-a-50">
        <div className="bg-white border-b border-neutral-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold">All Test Cases Results</h2>
                <p className="text-sm text-neutral-600">
                  {totalRun > 0 ? (
                    <>
                      <span className="text-success font-medium">{passedCount} passed</span>
                      {failedCount > 0 && (
                        <>, <span className="text-error-600 font-medium">{failedCount} failed</span></>
                      )}
                      {multipleResults.length > 0 && (
                        <> — Viewing {currentResultIndex + 1} of {multipleResults.length}: {multipleResults[currentResultIndex].testCase.name}</>
                      )}
                    </>
                  ) : (
                    'No test cases run.'
                  )}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                {multipleResults.length > 0 && (
                  <>
                    <button
                      onClick={() => handleNavigateResult(currentResultIndex - 1)}
                      disabled={currentResultIndex === 0}
                      className="px-3 py-1 text-sm border rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-neutral-600">
                      {currentResultIndex + 1} / {multipleResults.length}
                    </span>
                    <button
                      onClick={() => handleNavigateResult(currentResultIndex + 1)}
                      disabled={currentResultIndex === multipleResults.length - 1}
                      className="px-3 py-1 text-sm border rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </>
                )}
                <button
                  onClick={handleBackToHome}
                  className="ml-2 px-4 py-1 text-sm bg-neutral-800 text-white rounded hover:bg-neutral-700"
                >
                  Back to Home
                </button>
              </div>
            </div>
            {failedRunAll.length > 0 && (
              <div className="mt-3 p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-sm font-medium text-error-800 mb-2">Failed cases:</p>
                <ul className="text-sm text-error-700 space-y-1 list-disc list-inside">
                  {failedRunAll.map(({ testCase, error }) => (
                    <li key={testCase.id}>
                      <span className="font-medium">{testCase.name}</span> ({testCase.id}): {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <div className="pt-0">
          {analysisData && multipleResults.length > 0 ? (
            <AnalysisResults
              result={analysisData.result}
              schedule={analysisData.schedule}
              numTransactions={analysisData.numTransactions}
              operations={analysisData.operations}
              onBack={handleBackToHome}
              onNewSchedule={handleNewSchedule}
            />
          ) : failedRunAll.length > 0 ? (
            <div className="max-w-7xl mx-auto p-6">
              <p className="text-neutral-600">All test cases failed. See the list above for error details.</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <HomeScreen 
      onManualInput={handleManualInput} 
      onTestCases={handleTestCases}
      onScheduleGeneration={handleScheduleGeneration}
      testCaseCount={testCaseCount}
    />
  );
}
