// Transaction Scheduler Analyzer - Core Logic

export type OperationType = 'read' | 'write' | 'increment' | 'decrement' | 'commit' | 'abort';

export interface Operation {
  type: OperationType;
  transaction: number;
  dataItem?: string;
  raw: string;
}

export interface Transaction {
  id: number;
  operations: Operation[];
}

export interface Schedule {
  operations: Operation[];
  transactions: Transaction[];
}

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

// Parse a single operation from string format
export function parseOperation(opStr: string): Operation | null {
  opStr = opStr.trim();
  
  // Commit: c1, c2, etc.
  const commitMatch = opStr.match(/^c(\d+)$/);
  if (commitMatch) {
    return {
      type: 'commit',
      transaction: parseInt(commitMatch[1]),
      raw: opStr
    };
  }
  
  // Abort: a1, a2, etc.
  const abortMatch = opStr.match(/^a(\d+)$/);
  if (abortMatch) {
    return {
      type: 'abort',
      transaction: parseInt(abortMatch[1]),
      raw: opStr
    };
  }
  
  // Read: r1[x], r2[y], etc.
  const readMatch = opStr.match(/^r(\d+)\[([a-zA-Z0-9_]+)\]$/);
  if (readMatch) {
    return {
      type: 'read',
      transaction: parseInt(readMatch[1]),
      dataItem: readMatch[2],
      raw: opStr
    };
  }
  
  // Write: w1[x], w2[y], etc.
  const writeMatch = opStr.match(/^w(\d+)\[([a-zA-Z0-9_]+)\]$/);
  if (writeMatch) {
    return {
      type: 'write',
      transaction: parseInt(writeMatch[1]),
      dataItem: writeMatch[2],
      raw: opStr
    };
  }
  
  // Increment: inc1[x], inc2[y], etc.
  const incMatch = opStr.match(/^inc(\d+)\[([a-zA-Z0-9_]+)\]$/);
  if (incMatch) {
    return {
      type: 'increment',
      transaction: parseInt(incMatch[1]),
      dataItem: incMatch[2],
      raw: opStr
    };
  }
  
  // Decrement: dec1[x], dec2[y], etc.
  const decMatch = opStr.match(/^dec(\d+)\[([a-zA-Z0-9_]+)\]$/);
  if (decMatch) {
    return {
      type: 'decrement',
      transaction: parseInt(decMatch[1]),
      dataItem: decMatch[2],
      raw: opStr
    };
  }
  
  return null;
}

// Parse a schedule from string
export function parseSchedule(scheduleStr: string, numTransactions: number): Schedule {
  const opStrings = scheduleStr.trim().split(/\s+/);
  const operations: Operation[] = [];
  
  for (const opStr of opStrings) {
    const op = parseOperation(opStr);
    if (op) {
      operations.push(op);
    }
  }
  
  // Group operations by transaction
  const transactionMap = new Map<number, Operation[]>();
  for (let i = 1; i <= numTransactions; i++) {
    transactionMap.set(i, []);
  }
  
  for (const op of operations) {
    const txOps = transactionMap.get(op.transaction);
    if (txOps) {
      txOps.push(op);
    }
  }
  
  const transactions: Transaction[] = [];
  for (let i = 1; i <= numTransactions; i++) {
    transactions.push({
      id: i,
      operations: transactionMap.get(i) || []
    });
  }
  
  return { operations, transactions };
}

// Check if two operations conflict
function operationsConflict(op1: Operation, op2: Operation): boolean {
  if (op1.transaction === op2.transaction) return false;
  if (!op1.dataItem || !op2.dataItem) return false;
  if (op1.dataItem !== op2.dataItem) return false;
  
  const isWrite1 = op1.type === 'write' || op1.type === 'increment' || op1.type === 'decrement';
  const isWrite2 = op2.type === 'write' || op2.type === 'increment' || op2.type === 'decrement';
  const isRead1 = op1.type === 'read';
  const isRead2 = op2.type === 'read';
  
  // Conflict if at least one is a write
  return (isWrite1 && (isRead2 || isWrite2)) || (isRead1 && isWrite2);
}

// Build precedence graph
function buildPrecedenceGraph(schedule: Schedule): { nodes: number[]; edges: ConflictEdge[] } {
  const nodes = schedule.transactions.map(t => t.id);
  const edges: ConflictEdge[] = [];
  const edgeSet = new Set<string>();
  
  for (let i = 0; i < schedule.operations.length; i++) {
    for (let j = i + 1; j < schedule.operations.length; j++) {
      const op1 = schedule.operations[i];
      const op2 = schedule.operations[j];
      
      if (operationsConflict(op1, op2)) {
        const edgeKey = `${op1.transaction}-${op2.transaction}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({
            from: op1.transaction,
            to: op2.transaction,
            reason: `${op1.raw} conflicts with ${op2.raw}`
          });
        }
      }
    }
  }
  
  return { nodes, edges };
}

// Detect cycle in directed graph using DFS
function hasCycle(nodes: number[], edges: ConflictEdge[]): { hasCycle: boolean; cycle?: number[] } {
  const adjList = new Map<number, number[]>();
  nodes.forEach(node => adjList.set(node, []));
  edges.forEach(edge => {
    const neighbors = adjList.get(edge.from) || [];
    neighbors.push(edge.to);
    adjList.set(edge.from, neighbors);
  });
  
  const visited = new Set<number>();
  const recStack = new Set<number>();
  const path: number[] = [];
  
  function dfs(node: number): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);
    
    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        // Found cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor);
        return true;
      }
    }
    
    recStack.delete(node);
    path.pop();
    return false;
  }
  
  for (const node of nodes) {
    if (!visited.has(node)) {
      if (dfs(node)) {
        return { hasCycle: true, cycle: path };
      }
    }
  }
  
  return { hasCycle: false };
}

// Topological sort for serial order
function topologicalSort(nodes: number[], edges: ConflictEdge[]): number[] | null {
  const adjList = new Map<number, number[]>();
  const inDegree = new Map<number, number>();
  
  nodes.forEach(node => {
    adjList.set(node, []);
    inDegree.set(node, 0);
  });
  
  edges.forEach(edge => {
    const neighbors = adjList.get(edge.from) || [];
    neighbors.push(edge.to);
    adjList.set(edge.from, neighbors);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  });
  
  const queue: number[] = [];
  nodes.forEach(node => {
    if (inDegree.get(node) === 0) {
      queue.push(node);
    }
  });
  
  const result: number[] = [];
  
  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    
    const neighbors = adjList.get(node) || [];
    for (const neighbor of neighbors) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor);
      }
    }
  }
  
  return result.length === nodes.length ? result : null;
}

// Analyze conflict serializability
function analyzeConflictSerializability(schedule: Schedule, graph: { nodes: number[]; edges: ConflictEdge[] }) {
  const steps: string[] = [];
  steps.push('1. Building precedence graph from conflicting operations...');
  steps.push(`   Found ${graph.edges.length} conflict edge(s).`);
  
  if (graph.edges.length > 0) {
    steps.push('   Conflict edges:');
    graph.edges.forEach(edge => {
      steps.push(`   - T${edge.from} → T${edge.to}: ${edge.reason}`);
    });
  }
  
  steps.push('2. Checking for cycles in precedence graph...');
  
  const cycleResult = hasCycle(graph.nodes, graph.edges);
  
  if (cycleResult.hasCycle) {
    steps.push(`   ✗ Cycle detected: ${cycleResult.cycle?.map(n => `T${n}`).join(' → ')}`);
    return {
      result: false,
      explanation: 'The schedule is NOT conflict-serializable because the precedence graph contains a cycle.',
      steps
    };
  }
  
  steps.push('   ✓ No cycle detected. The graph is acyclic.');
  steps.push('3. Computing topological sort to find equivalent serial order...');
  
  const serialOrder = topologicalSort(graph.nodes, graph.edges);
  
  if (serialOrder) {
    steps.push(`   ✓ Equivalent serial order: ${serialOrder.map(n => `T${n}`).join(' → ')}`);
    return {
      result: true,
      explanation: `The schedule is conflict-serializable. Equivalent serial order: ${serialOrder.map(n => `T${n}`).join(', ')}.`,
      serialOrder,
      steps
    };
  }
  
  return {
    result: false,
    explanation: 'Unable to determine serial order.',
    steps
  };
}

// Get reads-from relationships
function getReadsFromRelations(schedule: Schedule): Map<string, { reader: number; writer: number; dataItem: string }[]> {
  const relations = new Map<string, { reader: number; writer: number; dataItem: string }[]>();
  const lastWriter = new Map<string, number>();
  
  for (const op of schedule.operations) {
    if (op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
      if (op.dataItem) {
        lastWriter.set(op.dataItem, op.transaction);
      }
    } else if (op.type === 'read' && op.dataItem) {
      const writer = lastWriter.get(op.dataItem);
      if (writer !== undefined && writer !== op.transaction) {
        const key = `T${writer}-T${op.transaction}`;
        if (!relations.has(key)) {
          relations.set(key, []);
        }
        relations.get(key)!.push({
          reader: op.transaction,
          writer: writer,
          dataItem: op.dataItem
        });
      }
    }
  }
  
  return relations;
}

// Get commit/abort positions
function getTransactionEndPositions(schedule: Schedule): Map<number, { position: number; type: 'commit' | 'abort' }> {
  const positions = new Map<number, { position: number; type: 'commit' | 'abort' }>();
  
  schedule.operations.forEach((op, index) => {
    if (op.type === 'commit' || op.type === 'abort') {
      positions.set(op.transaction, { position: index, type: op.type });
    }
  });
  
  return positions;
}

// Analyze recoverability
function analyzeRecoverability(schedule: Schedule) {
  const steps: string[] = [];
  steps.push('1. Identifying reads-from relationships...');
  
  const readsFrom = getReadsFromRelations(schedule);
  const endPositions = getTransactionEndPositions(schedule);
  
  if (readsFrom.size === 0) {
    steps.push('   No reads-from relationships found.');
    steps.push('2. Schedule is trivially recoverable (no dependencies).');
    return {
      result: true,
      explanation: 'The schedule is recoverable. No transaction reads from another.',
      steps
    };
  }
  
  readsFrom.forEach((relations, key) => {
    relations.forEach(rel => {
      steps.push(`   T${rel.reader} reads ${rel.dataItem} from T${rel.writer}`);
    });
  });
  
  steps.push('2. Checking commit order for each reads-from relationship...');
  
  const violations: string[] = [];
  
  readsFrom.forEach((relations, key) => {
    relations.forEach(rel => {
      const writerEnd = endPositions.get(rel.writer);
      const readerEnd = endPositions.get(rel.reader);
      
      if (!writerEnd) {
        violations.push(`T${rel.writer} does not commit or abort`);
        steps.push(`   ✗ T${rel.writer} does not commit/abort`);
      } else if (!readerEnd) {
        violations.push(`T${rel.reader} does not commit or abort`);
        steps.push(`   ✗ T${rel.reader} does not commit/abort`);
      } else if (writerEnd.type === 'commit' && readerEnd.type === 'commit') {
        if (readerEnd.position < writerEnd.position) {
          violations.push(`T${rel.reader} commits before T${rel.writer} (reads ${rel.dataItem})`);
          steps.push(`   ✗ T${rel.reader} commits at position ${readerEnd.position} before T${rel.writer} commits at position ${writerEnd.position}`);
        } else {
          steps.push(`   ✓ T${rel.writer} commits before T${rel.reader}`);
        }
      }
    });
  });
  
  if (violations.length > 0) {
    return {
      result: false,
      explanation: `The schedule is NOT recoverable. ${violations[0]}.`,
      steps
    };
  }
  
  steps.push('3. All reads-from relationships satisfy recoverability constraint.');
  return {
    result: true,
    explanation: 'The schedule is recoverable. Every transaction that reads from another commits only after the writer commits.',
    steps
  };
}

// Analyze ACA (Avoids Cascading Aborts)
function analyzeACA(schedule: Schedule) {
  const steps: string[] = [];
  steps.push('1. Checking if any transaction reads from uncommitted data...');
  
  const committedTx = new Set<number>();
  const abortedTx = new Set<number>();
  const violations: string[] = [];
  
  for (const op of schedule.operations) {
    if (op.type === 'commit') {
      committedTx.add(op.transaction);
    } else if (op.type === 'abort') {
      abortedTx.add(op.transaction);
    }
  }
  
  const readsFrom = getReadsFromRelations(schedule);
  
  // Check each read operation
  const lastWriter = new Map<string, number>();
  
  for (const op of schedule.operations) {
    if (op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
      if (op.dataItem) {
        lastWriter.set(op.dataItem, op.transaction);
      }
    } else if (op.type === 'read' && op.dataItem) {
      const writer = lastWriter.get(op.dataItem);
      if (writer !== undefined && writer !== op.transaction) {
        // Check if writer has committed at this point
        if (!committedTx.has(writer) && !abortedTx.has(writer)) {
          violations.push(`T${op.transaction} reads ${op.dataItem} from uncommitted T${writer}`);
          steps.push(`   ✗ T${op.transaction} reads ${op.dataItem} from T${writer} before T${writer} commits`);
        } else if (committedTx.has(writer)) {
          steps.push(`   ✓ T${op.transaction} reads ${op.dataItem} from committed T${writer}`);
        }
      }
    } else if (op.type === 'commit') {
      committedTx.add(op.transaction);
    } else if (op.type === 'abort') {
      abortedTx.add(op.transaction);
    }
  }
  
  if (violations.length > 0) {
    steps.push('2. Schedule does NOT avoid cascading aborts.');
    return {
      result: false,
      explanation: `The schedule does NOT avoid cascading aborts. ${violations[0]}.`,
      steps
    };
  }
  
  steps.push('2. All reads are from committed transactions.');
  return {
    result: true,
    explanation: 'The schedule avoids cascading aborts (ACA). All transactions read only from committed data.',
    steps
  };
}

// Analyze strict schedule
function analyzeStrict(schedule: Schedule) {
  const steps: string[] = [];
  steps.push('1. Checking if any transaction reads or writes data modified by uncommitted transactions...');
  
  const committedTx = new Set<number>();
  const abortedTx = new Set<number>();
  const lastModifier = new Map<string, number>();
  const violations: string[] = [];
  
  for (const op of schedule.operations) {
    if (op.type === 'read' || op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
      if (op.dataItem) {
        const modifier = lastModifier.get(op.dataItem);
        if (modifier !== undefined && modifier !== op.transaction) {
          if (!committedTx.has(modifier) && !abortedTx.has(modifier)) {
            violations.push(`T${op.transaction} accesses ${op.dataItem} modified by uncommitted T${modifier}`);
            steps.push(`   ✗ T${op.transaction} ${op.type}s ${op.dataItem} while T${modifier} (last modifier) has not committed`);
          }
        }
        
        if (op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
          lastModifier.set(op.dataItem, op.transaction);
        }
      }
    } else if (op.type === 'commit') {
      committedTx.add(op.transaction);
    } else if (op.type === 'abort') {
      abortedTx.add(op.transaction);
    }
  }
  
  if (violations.length > 0) {
    steps.push('2. Schedule is NOT strict.');
    return {
      result: false,
      explanation: `The schedule is NOT strict. ${violations[0]}.`,
      steps
    };
  }
  
  steps.push('2. All data accesses occur only after previous modifiers have committed.');
  return {
    result: true,
    explanation: 'The schedule is strict. No transaction reads or writes data modified by an uncommitted transaction.',
    steps
  };
}

// Analyze rigorous schedule
function analyzeRigorous(schedule: Schedule) {
  const steps: string[] = [];
  steps.push('1. Checking if any transaction accesses data read or written by uncommitted transactions...');
  
  const committedTx = new Set<number>();
  const abortedTx = new Set<number>();
  const lastAccessor = new Map<string, number>();
  const violations: string[] = [];
  
  for (const op of schedule.operations) {
    if (op.type === 'read' || op.type === 'write' || op.type === 'increment' || op.type === 'decrement') {
      if (op.dataItem) {
        const accessor = lastAccessor.get(op.dataItem);
        if (accessor !== undefined && accessor !== op.transaction) {
          if (!committedTx.has(accessor) && !abortedTx.has(accessor)) {
            violations.push(`T${op.transaction} accesses ${op.dataItem} accessed by uncommitted T${accessor}`);
            steps.push(`   ✗ T${op.transaction} ${op.type}s ${op.dataItem} while T${accessor} (last accessor) has not committed`);
          }
        }
        
        lastAccessor.set(op.dataItem, op.transaction);
      }
    } else if (op.type === 'commit') {
      committedTx.add(op.transaction);
    } else if (op.type === 'abort') {
      abortedTx.add(op.transaction);
    }
  }
  
  if (violations.length > 0) {
    steps.push('2. Schedule is NOT rigorous.');
    return {
      result: false,
      explanation: `The schedule is NOT rigorous. ${violations[0]}.`,
      steps
    };
  }
  
  steps.push('2. All data accesses occur only after previous accessors have committed.');
  return {
    result: true,
    explanation: 'The schedule is rigorous. No transaction accesses data that has been read or written by an uncommitted transaction.',
    steps
  };
}

// Main analysis function
export function analyzeSchedule(schedule: Schedule): AnalysisResult {
  const graph = buildPrecedenceGraph(schedule);
  
  const conflictSerializable = analyzeConflictSerializability(schedule, graph);
  const recoverable = analyzeRecoverability(schedule);
  const avoidsCascadingAborts = analyzeACA(schedule);
  const strict = analyzeStrict(schedule);
  const rigorous = analyzeRigorous(schedule);
  
  const violations: string[] = [];
  if (!conflictSerializable.result) violations.push('Not conflict-serializable');
  if (!recoverable.result) violations.push('Not recoverable');
  if (!avoidsCascadingAborts.result) violations.push('Does not avoid cascading aborts');
  if (!strict.result) violations.push('Not strict');
  if (!rigorous.result) violations.push('Not rigorous');
  
  return {
    conflictSerializable,
    recoverable,
    avoidsCascadingAborts,
    strict,
    rigorous,
    violations,
    precedenceGraph: graph
  };
}
