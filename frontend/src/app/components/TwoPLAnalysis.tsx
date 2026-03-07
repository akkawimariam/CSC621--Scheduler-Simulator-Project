import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ArrowLeft, Lock, UnlockKeyhole, Info, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { getStrict2PLHistory, type Strict2PLLockEntry } from '../utils/api';

interface TwoPLAnalysisProps {
  schedule: string;
  numTransactions: number;
  onBack: () => void;
}

function LockTimeline({ lockTable }: { lockTable: Strict2PLLockEntry[] }) {
  const transactionColors = [
    'bg-brand-a-500',
    'bg-brand-b-500',
    'bg-brand-c-500',
    'bg-brand-a-600',
    'bg-brand-b-600',
    'bg-brand-c-600',
  ];

  const groupedByTransaction: { [key: number]: Strict2PLLockEntry[] } = {};
  lockTable.forEach((entry) => {
    if (!groupedByTransaction[entry.transaction]) {
      groupedByTransaction[entry.transaction] = [];
    }
    groupedByTransaction[entry.transaction].push(entry);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groupedByTransaction).map(([txId, entries]) => {
        const tx = parseInt(txId);
        return (
          <div key={tx} className="bg-white p-4 rounded-lg border-2 border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
              <div
                className={`px-3 py-1 rounded-lg ${transactionColors[(tx - 1) % transactionColors.length]} text-white font-semibold text-sm shadow-md`}
              >
                T{tx}
              </div>
              <span className="text-sm font-semibold text-neutral-700">Lock Operations</span>
            </div>
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <Lock className="w-4 h-4 text-brand-a-600" />
                  <span className="font-mono text-neutral-700">
                    <span className="font-semibold">{entry.lockType.toUpperCase()}_LOCK</span>({entry.dataItem})
                  </span>
                  <span className="text-neutral-500">at position {entry.acquiredAt}</span>
                  {entry.releasedAt !== null ? (
                    <>
                      <UnlockKeyhole className="w-4 h-4 text-neutral-400 ml-2" />
                      <span className="text-neutral-500">released at {entry.releasedAt}</span>
                    </>
                  ) : (
                    <span className="text-neutral-400 ml-2">(held until commit/abort)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LockTableView({ lockTable }: { lockTable: Strict2PLLockEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-brand-a-100 to-brand-b-100">
            <th className="border-2 border-neutral-300 px-3 py-2 text-left font-semibold">Transaction</th>
            <th className="border-2 border-neutral-300 px-3 py-2 text-left font-semibold">Data Item</th>
            <th className="border-2 border-neutral-300 px-3 py-2 text-left font-semibold">Lock Type</th>
            <th className="border-2 border-neutral-300 px-3 py-2 text-left font-semibold">Acquired At</th>
            <th className="border-2 border-neutral-300 px-3 py-2 text-left font-semibold">Released At</th>
          </tr>
        </thead>
        <tbody>
          {lockTable.map((entry, idx) => (
            <tr key={idx} className="hover:bg-brand-a-50">
              <td className="border border-neutral-300 px-3 py-2 font-mono">T{entry.transaction}</td>
              <td className="border border-neutral-300 px-3 py-2 font-mono">{entry.dataItem}</td>
              <td className="border border-neutral-300 px-3 py-2">
                <span
                  className={
                    entry.lockType === 'read'
                      ? 'rounded px-2 py-0.5 bg-blue-500 text-white text-xs font-medium'
                      : 'rounded px-2 py-0.5 bg-brand-a-500 text-white text-xs font-medium'
                  }
                >
                  {entry.lockType.toUpperCase()}
                </span>
              </td>
              <td className="border border-neutral-300 px-3 py-2 text-center">{entry.acquiredAt}</td>
              <td className="border border-neutral-300 px-3 py-2 text-center">
                {entry.releasedAt !== null ? entry.releasedAt : <span className="text-neutral-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TwoPLAnalysis({ schedule, onBack }: TwoPLAnalysisProps) {
  const [data, setData] = useState<{ events: string[]; lockTable: Strict2PLLockEntry[]; explanation: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStrict2PLHistory(schedule)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [schedule]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-a-50 via-brand-b-50 to-brand-c-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={onBack} className="mb-4 hover:bg-white/50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-a-600 to-brand-b-600 flex items-center justify-center shadow-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-a-600 via-brand-b-600 to-brand-c-600 bg-clip-text text-transparent">
                Strict 2PL Lock History
              </h1>
              <p className="text-neutral-600 font-mono text-sm mt-1">{schedule}</p>
            </div>
          </div>
        </div>

        {/* Info: same as main.py */}
        <Card className="mb-6 bg-gradient-to-r from-brand-a-50 via-brand-b-50 to-brand-c-50 border-2 border-brand-a-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info className="w-5 h-5 text-brand-a-600" />
              About Strict 2PL (derived from your schedule)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="text-neutral-700 leading-relaxed">
              For each operation on a data item: acquire read or write lock before the access. All locks held by a
              transaction are released only at commit or abort (Strict 2PL). This view shows one possible
              strict-2PL-compatible lock/unlock sequence for your schedule—same as in the command-line tool.
            </p>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-12 h-12 text-brand-b-600 animate-spin" />
            <p className="text-neutral-600">Deriving Strict 2PL lock history...</p>
          </div>
        )}

        {error && (
          <Card className="border-2 border-error-200 bg-error-50">
            <CardContent className="pt-6">
              <p className="text-error-700 font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && data && (
          <Card className="border-2 border-brand-a-200">
            <CardHeader className="bg-gradient-to-r from-brand-a-50 to-brand-b-50">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-6 h-6 text-brand-a-600" />
                Derived Lock/Unlock Sequence
              </CardTitle>
              <CardDescription>{data.explanation}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="bg-neutral-50 border-2 border-neutral-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-neutral-600 mb-2">Lock and operation sequence (rl = read lock, wl = write lock, ru/wu = release):</p>
                <p className="font-mono text-sm text-neutral-800 break-all leading-relaxed">
                  {data.events.length ? data.events.join('  ') : '(no operations)'}
                </p>
              </div>

              <Tabs defaultValue="timeline" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-brand-a-100 to-brand-b-100">
                  <TabsTrigger value="timeline">Lock Timeline</TabsTrigger>
                  <TabsTrigger value="table">Lock Table</TabsTrigger>
                </TabsList>
                <TabsContent value="timeline" className="mt-4">
                  {data.lockTable.length > 0 ? (
                    <LockTimeline lockTable={data.lockTable} />
                  ) : (
                    <p className="text-center text-neutral-500 py-8">No lock operations in this schedule</p>
                  )}
                </TabsContent>
                <TabsContent value="table" className="mt-4">
                  {data.lockTable.length > 0 ? (
                    <LockTableView lockTable={data.lockTable} />
                  ) : (
                    <p className="text-center text-neutral-500 py-8">No lock operations in this schedule</p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
