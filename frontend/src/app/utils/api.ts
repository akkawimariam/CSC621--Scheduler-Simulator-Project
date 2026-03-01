/**
 * API client for the Transaction Scheduler backend.
 * All analysis is performed by the Python backend; this module only fetches and maps responses.
 */

// Use relative URL in dev so Vite proxy forwards /api to the Python backend (localhost:5000)
const API_BASE = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL
  ? (import.meta as any).env.VITE_API_URL
  : '';

export interface ConflictEdge {
  from: number;
  to: number;
  reason: string;
}

export interface AnalysisResult {
  conflictSerializable: {
    result: boolean;
    explanation: string;
    serialOrder?: number[];
    steps: string[];
  };
  recoverable: {
    result: boolean;
    explanation: string;
    steps: string[];
  };
  avoidsCascadingAborts: {
    result: boolean;
    explanation: string;
    steps: string[];
  };
  strict: {
    result: boolean;
    explanation: string;
    steps: string[];
  };
  rigorous: {
    result: boolean;
    explanation: string;
    steps: string[];
  };
  violations: string[];
  precedenceGraph: {
    nodes: number[];
    edges: ConflictEdge[];
  };
}

export interface Operation {
  type: 'read' | 'write' | 'increment' | 'decrement' | 'commit' | 'abort' | 'start';
  transaction: number;
  dataItem?: string;
  raw: string;
}

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  numTransactions: number;
  schedule: string;
  transactions?: string[];
}

/** Map backend snake_case response to frontend camelCase AnalysisResult */
function mapAnalyzeResponse(data: any): { result: AnalysisResult; operations: Operation[]; numTransactions: number } {
  const op = data.operations || [];
  const ops: Operation[] = op.map((o: any) => ({
    type: o.type || 'read',
    transaction: o.transaction_id ?? o.transaction,
    dataItem: o.data_item ?? o.dataItem,
    raw: o.raw || '',
  }));

  return {
    numTransactions: data.num_transactions ?? ops.reduce((max, o) => Math.max(max, o.transaction), 0),
    operations: ops,
    result: {
      conflictSerializable: {
        result: data.conflict_serializable?.is_serializable ?? false,
        explanation: data.conflict_serializable?.explanation ?? '',
        serialOrder: data.conflict_serializable?.serial_order,
        steps: data.conflict_serializable?.steps ?? [],
      },
      recoverable: {
        result: data.recoverable?.is_recoverable ?? false,
        explanation: data.recoverable?.explanation ?? '',
        steps: data.recoverable?.steps ?? [],
      },
      avoidsCascadingAborts: {
        result: data.aca?.avoids_cascading_aborts ?? false,
        explanation: data.aca?.explanation ?? '',
        steps: data.aca?.steps ?? [],
      },
      strict: {
        result: data.strict?.is_strict ?? false,
        explanation: data.strict?.explanation ?? '',
        steps: data.strict?.steps ?? [],
      },
      rigorous: {
        result: data.rigorous?.is_rigorous ?? false,
        explanation: data.rigorous?.explanation ?? '',
        steps: data.rigorous?.steps ?? [],
      },
      violations: Array.isArray(data.violations) ? data.violations : [],
      precedenceGraph: {
        nodes: data.precedence_graph?.nodes ?? [],
        edges: (data.precedence_graph?.edges ?? []).map((e: any) => ({
          from: e.from,
          to: e.to,
          reason: e.reason ?? `T${e.from} → T${e.to}`,
        })),
      },
    },
  };
}

export async function analyzeSchedule(scheduleStr: string): Promise<{
  result: AnalysisResult;
  operations: Operation[];
  numTransactions: number;
}> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: scheduleStr }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Analysis failed: ${res.status}`);
  }
  const data = await res.json();
  return mapAnalyzeResponse(data);
}

export async function getTestCases(): Promise<TestCase[]> {
  const res = await fetch(`${API_BASE}/api/test-cases`);
  if (!res.ok) throw new Error('Failed to load test cases');
  const data = await res.json();
  return (data || []).map((tc: any) => ({
    id: tc.id ?? `case-${tc.name}`,
    name: tc.name ?? '',
    numTransactions: tc.numTransactions ?? tc.num_transactions ?? 0,
    schedule: tc.schedule ?? '',
    transactions: tc.transactions,
  }));
}

export type GenerateMode = 'random' | '2pl' | 'strict2pl';

export interface GenerateOptions {
  /** Generation mode: random interleaving, or simulate 2PL / Strict 2PL */
  mode?: GenerateMode;
  /** If provided, use these transaction strings; otherwise use numTransactions/maxOps/dataItems */
  transactions?: string[];
  numTransactions?: number;
  maxOpsPerTransaction?: number;
  dataItems?: string[];
  allowAborts?: boolean;
  seed?: number;
}

export async function generateSchedule(options: GenerateOptions): Promise<{
  transactions: string[];
  history: string;
}> {
  const body: Record<string, unknown> = {
    mode: options.mode ?? 'random',
    numTransactions: options.numTransactions ?? 2,
    maxOpsPerTransaction: options.maxOpsPerTransaction ?? 3,
    dataItems: options.dataItems ?? ['x', 'y'],
    allowAborts: options.allowAborts ?? true,
  };
  if (options.seed != null) body.seed = options.seed;
  if (options.transactions != null && options.transactions.length > 0) {
    body.transactions = options.transactions;
  }
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Generation failed');
  }
  const data = await res.json();
  return {
    transactions: data.transactions ?? [],
    history: data.history ?? '',
  };
}

export interface Strict2PLLockEntry {
  transaction: number;
  dataItem: string;
  lockType: 'read' | 'write';
  acquiredAt: number;
  releasedAt: number | null;
}

export interface Strict2PLHistoryResult {
  events: string[];
  lockTable: Strict2PLLockEntry[];
  explanation: string;
}

export interface Validate2PLStep {
  event: string;
  explanation: string;
}

export interface Validate2PLResult {
  follows2PL: boolean;
  followsStrict2PL: boolean;
  steps: Validate2PLStep[];
}

export async function validate2PL(scheduleStr: string): Promise<Validate2PLResult> {
  const res = await fetch(`${API_BASE}/api/validate-2pl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: scheduleStr.trim() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '2PL validation failed');
  }
  const data = await res.json();
  return {
    follows2PL: data.follows2PL ?? false,
    followsStrict2PL: data.followsStrict2PL ?? false,
    steps: (data.steps ?? []).map((s: any) => ({ event: s.event ?? '', explanation: s.explanation ?? '' })),
  };
}

export async function getStrict2PLHistory(scheduleStr: string): Promise<Strict2PLHistoryResult> {
  const res = await fetch(`${API_BASE}/api/strict2pl-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedule: scheduleStr.trim() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Strict 2PL history failed');
  }
  const data = await res.json();
  return {
    events: data.events ?? [],
    lockTable: (data.lockTable ?? []).map((e: any) => ({
      transaction: e.transaction,
      dataItem: e.dataItem,
      lockType: e.lockType ?? 'read',
      acquiredAt: e.acquiredAt,
      releasedAt: e.releasedAt ?? null,
    })),
    explanation: data.explanation ?? '',
  };
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
