// Two-Phase Locking (2PL) and Strict 2PL Analyzer

export interface LockOperation {
  position: number;
  transaction: number;
  type: 'read_lock' | 'write_lock' | 'unlock';
  dataItem: string;
  operation: string; // Original operation that triggered this lock
}

export interface LockViolation {
  type: 'conflict' | 'protocol' | 'strict';
  description: string;
  position: number;
}

export interface TwoPLResult {
  valid: boolean;
  violations: LockViolation[];
  lockOperations: LockOperation[];
  explanation: string;
  lockTable: LockTableEntry[];
}

export interface LockTableEntry {
  transaction: number;
  dataItem: string;
  lockType: 'read' | 'write';
  acquiredAt: number;
  releasedAt: number | null;
  phase: 'growing' | 'shrinking';
}

interface TransactionPhase {
  transaction: number;
  phase: 'growing' | 'shrinking';
  firstRelease: number | null;
}

/**
 * Parse an operation to extract transaction ID, type, and data item
 */
function parseOperation(op: string): {
  transaction: number;
  type: 'read' | 'write' | 'commit' | 'abort';
  dataItem: string | null;
} | null {
  const readMatch = op.match(/^r(\d+)\[([a-z]+)\]$/i);
  if (readMatch) {
    return { transaction: parseInt(readMatch[1]), type: 'read', dataItem: readMatch[2] };
  }

  const writeMatch = op.match(/^(?:w|inc|dec)(\d+)\[([a-z]+)\]$/i);
  if (writeMatch) {
    return { transaction: parseInt(writeMatch[1]), type: 'write', dataItem: writeMatch[2] };
  }

  const commitMatch = op.match(/^c(\d+)$/i);
  if (commitMatch) {
    return { transaction: parseInt(commitMatch[1]), type: 'commit', dataItem: null };
  }

  const abortMatch = op.match(/^a(\d+)$/i);
  if (abortMatch) {
    return { transaction: parseInt(abortMatch[1]), type: 'abort', dataItem: null };
  }

  return null;
}

/**
 * Analyze schedule under Two-Phase Locking (2PL)
 * 2PL: Growing phase (only acquire locks) followed by shrinking phase (only release locks)
 */
export function analyzeTwoPL(schedule: string): TwoPLResult {
  const operations = schedule.trim().split(/\s+/);
  const lockOperations: LockOperation[] = [];
  const violations: LockViolation[] = [];
  const lockTable: LockTableEntry[] = [];

  // Track locks held by each transaction on each data item
  const locks: Map<string, Map<number, 'read' | 'write'>> = new Map();
  
  // Track transaction phases
  const phases: Map<number, TransactionPhase> = new Map();

  operations.forEach((op, position) => {
    const parsed = parseOperation(op);
    if (!parsed) return;

    const { transaction, type, dataItem } = parsed;

    // Initialize phase tracking for this transaction
    if (!phases.has(transaction)) {
      phases.set(transaction, {
        transaction,
        phase: 'growing',
        firstRelease: null
      });
    }

    const txPhase = phases.get(transaction)!;

    // Handle data operations (read/write)
    if (dataItem && (type === 'read' || type === 'write')) {
      const lockType = type === 'read' ? 'read' : 'write';
      
      // Check if transaction needs to acquire a lock
      const itemLocks = locks.get(dataItem) || new Map();
      const currentLock = itemLocks.get(transaction);

      // Try to acquire lock if not already held or needs upgrade
      if (!currentLock || (currentLock === 'read' && lockType === 'write')) {
        // Check 2PL protocol: can't acquire in shrinking phase
        if (txPhase.phase === 'shrinking') {
          violations.push({
            type: 'protocol',
            description: `T${transaction} tries to acquire ${lockType} lock on ${dataItem} during shrinking phase (after position ${txPhase.firstRelease})`,
            position
          });
        }

        // Check for conflicts with other transactions
        for (const [otherTx, otherLockType] of itemLocks.entries()) {
          if (otherTx !== transaction) {
            // Conflict: write lock conflicts with any lock, read lock conflicts with write lock
            if (lockType === 'write' || otherLockType === 'write') {
              violations.push({
                type: 'conflict',
                description: `T${transaction} cannot acquire ${lockType} lock on ${dataItem}: T${otherTx} holds ${otherLockType} lock`,
                position
              });
            }
          }
        }

        // Acquire the lock
        itemLocks.set(transaction, lockType);
        locks.set(dataItem, itemLocks);

        lockOperations.push({
          position,
          transaction,
          type: lockType === 'read' ? 'read_lock' : 'write_lock',
          dataItem,
          operation: op
        });

        lockTable.push({
          transaction,
          dataItem,
          lockType,
          acquiredAt: position,
          releasedAt: null,
          phase: txPhase.phase
        });
      }
    }

    // Handle commit/abort: release all locks in 2PL (but not strict 2PL)
    if (type === 'commit' || type === 'abort') {
      // In 2PL (non-strict), we can release locks before commit
      // But for this simulation, we'll release at commit/abort
      for (const [dataItem, itemLocks] of locks.entries()) {
        if (itemLocks.has(transaction)) {
          itemLocks.delete(transaction);
          lockOperations.push({
            position,
            transaction,
            type: 'unlock',
            dataItem,
            operation: op
          });

          // Update lock table
          const entry = lockTable.find(
            e => e.transaction === transaction && 
                 e.dataItem === dataItem && 
                 e.releasedAt === null
          );
          if (entry) {
            entry.releasedAt = position;
          }

          // Enter shrinking phase on first release
          if (txPhase.phase === 'growing') {
            txPhase.phase = 'shrinking';
            txPhase.firstRelease = position;
          }
        }
      }
    }
  });

  const valid = violations.length === 0;
  const explanation = valid
    ? `The schedule is valid under 2PL. All transactions follow the two-phase protocol: growing phase (acquiring locks) followed by shrinking phase (releasing locks). No transaction acquires a new lock after releasing any lock.`
    : `The schedule violates 2PL. ${violations.length} violation(s) detected: ${violations.map(v => v.description).join('; ')}.`;

  return {
    valid,
    violations,
    lockOperations,
    explanation,
    lockTable
  };
}

/**
 * Analyze schedule under Strict Two-Phase Locking (Strict 2PL)
 * Strict 2PL: All locks held until commit/abort (no early releases)
 */
export function analyzeStrictTwoPL(schedule: string): TwoPLResult {
  const operations = schedule.trim().split(/\s+/);
  const lockOperations: LockOperation[] = [];
  const violations: LockViolation[] = [];
  const lockTable: LockTableEntry[] = [];

  // Track locks held by each transaction on each data item
  const locks: Map<string, Map<number, 'read' | 'write'>> = new Map();
  
  // Track when transactions commit/abort
  const commitAbortPositions: Map<number, number> = new Map();

  // First pass: find commit/abort positions
  operations.forEach((op, position) => {
    const parsed = parseOperation(op);
    if (parsed && (parsed.type === 'commit' || parsed.type === 'abort')) {
      commitAbortPositions.set(parsed.transaction, position);
    }
  });

  operations.forEach((op, position) => {
    const parsed = parseOperation(op);
    if (!parsed) return;

    const { transaction, type, dataItem } = parsed;

    // Handle data operations (read/write)
    if (dataItem && (type === 'read' || type === 'write')) {
      const lockType = type === 'read' ? 'read' : 'write';
      
      // Check if transaction needs to acquire a lock
      const itemLocks = locks.get(dataItem) || new Map();
      const currentLock = itemLocks.get(transaction);

      // Try to acquire lock if not already held or needs upgrade
      if (!currentLock || (currentLock === 'read' && lockType === 'write')) {
        // Check for conflicts with other transactions
        for (const [otherTx, otherLockType] of itemLocks.entries()) {
          if (otherTx !== transaction) {
            // Check if other transaction should have released (committed/aborted)
            const otherCommitPos = commitAbortPositions.get(otherTx);
            if (otherCommitPos !== undefined && otherCommitPos < position) {
              // Other transaction has committed/aborted, lock should be released
              continue;
            }

            // Conflict: write lock conflicts with any lock, read lock conflicts with write lock
            if (lockType === 'write' || otherLockType === 'write') {
              violations.push({
                type: 'conflict',
                description: `T${transaction} cannot acquire ${lockType} lock on ${dataItem}: T${otherTx} holds ${otherLockType} lock`,
                position
              });
            }
          }
        }

        // Acquire the lock
        itemLocks.set(transaction, lockType);
        locks.set(dataItem, itemLocks);

        lockOperations.push({
          position,
          transaction,
          type: lockType === 'read' ? 'read_lock' : 'write_lock',
          dataItem,
          operation: op
        });

        lockTable.push({
          transaction,
          dataItem,
          lockType,
          acquiredAt: position,
          releasedAt: null,
          phase: 'growing' // Strict 2PL always in growing until commit
        });
      }
    }

    // Handle commit/abort: release all locks (only valid release point in strict 2PL)
    if (type === 'commit' || type === 'abort') {
      for (const [dataItem, itemLocks] of locks.entries()) {
        if (itemLocks.has(transaction)) {
          itemLocks.delete(transaction);
          lockOperations.push({
            position,
            transaction,
            type: 'unlock',
            dataItem,
            operation: op
          });

          // Update lock table
          const entries = lockTable.filter(
            e => e.transaction === transaction && 
                 e.dataItem === dataItem && 
                 e.releasedAt === null
          );
          entries.forEach(entry => {
            entry.releasedAt = position;
            entry.phase = 'shrinking'; // Released at commit/abort
          });
        }
      }
    }
  });

  // Check for unreleased locks (transactions that didn't commit/abort)
  for (const entry of lockTable) {
    if (entry.releasedAt === null) {
      violations.push({
        type: 'strict',
        description: `T${entry.transaction} did not release ${entry.lockType} lock on ${entry.dataItem} (no commit/abort found)`,
        position: entry.acquiredAt
      });
    }
  }

  const valid = violations.length === 0;
  const explanation = valid
    ? `The schedule is valid under Strict 2PL. All transactions hold their locks until commit/abort. No locks are released during the execution phase, ensuring recoverability and avoiding cascading aborts.`
    : `The schedule violates Strict 2PL. ${violations.length} violation(s) detected: ${violations.map(v => v.description).join('; ')}.`;

  return {
    valid,
    violations,
    lockOperations,
    explanation,
    lockTable
  };
}
