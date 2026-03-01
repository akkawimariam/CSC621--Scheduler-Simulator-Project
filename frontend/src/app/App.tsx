import React, { useState } from 'react';
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
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [returnToScreen, setReturnToScreen] = useState<Screen>('home');

  const handleManualInput = () => {
    setCurrentScreen('manual');
  };

  const handleTestCases = () => {
    setCurrentScreen('testcases');
  };

  const handleScheduleGeneration = () => {
    setCurrentScreen('generation');
  };

  const handleTwoPLAnalysis = () => {
    if (analysisData) {
      setCurrentScreen('twopl');
    }
  };

  const handleAnalyze = async (numTransactions: number, scheduleStr: string) => {
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
      alert(error instanceof Error ? error.message : 'Error analyzing schedule. Please check your input format (include start1, start2, etc.).');
    }
  };

  const handleRunTestCase = (testCase: TestCase) => {
    handleAnalyze(testCase.numTransactions, testCase.schedule);
  };

  const handleRunAllTestCases = async (testCases: TestCase[]) => {
    const results: MultipleTestResults[] = [];
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
        console.error(`Error analyzing test case ${testCase.id}:`, error);
      }
    }
    setMultipleResults(results);
    setCurrentResultIndex(0);
    if (firstData) {
      setAnalysisData(firstData);
      setCurrentScreen('allresults');
    }
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
    setAnalysisData(null);
    setMultipleResults([]);
    setCurrentResultIndex(0);
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
      />
    );
  }

  if (currentScreen === 'manual') {
    return <ManualInput onBack={handleBackToHome} onAnalyze={handleAnalyze} />;
  }

  if (currentScreen === 'generation') {
    return <ScheduleGeneration onBack={handleBackToHome} onAnalyze={handleAnalyze} />;
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

  if (currentScreen === 'allresults' && analysisData && multipleResults.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">All Test Cases Results</h2>
              <p className="text-sm text-slate-600">
                Viewing {currentResultIndex + 1} of {multipleResults.length}: {multipleResults[currentResultIndex].testCase.name}
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => handleNavigateResult(currentResultIndex - 1)}
                disabled={currentResultIndex === 0}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                {currentResultIndex + 1} / {multipleResults.length}
              </span>
              <button
                onClick={() => handleNavigateResult(currentResultIndex + 1)}
                disabled={currentResultIndex === multipleResults.length - 1}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={handleBackToHome}
                className="ml-4 px-4 py-1 text-sm bg-slate-800 text-white rounded hover:bg-slate-700"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
        <div className="pt-0">
          <AnalysisResults
            result={analysisData.result}
            schedule={analysisData.schedule}
            numTransactions={analysisData.numTransactions}
            operations={analysisData.operations}
            onBack={handleBackToHome}
            onNewSchedule={handleNewSchedule}
          />
        </div>
      </div>
    );
  }

  return (
    <HomeScreen 
      onManualInput={handleManualInput} 
      onTestCases={handleTestCases}
      onScheduleGeneration={handleScheduleGeneration}
    />
  );
}
