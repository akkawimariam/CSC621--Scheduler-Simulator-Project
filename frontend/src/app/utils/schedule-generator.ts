// Schedule Generator Utility
// Generates random interleavings of transactions while preserving intra-transaction order

export interface Transaction {
  id: number;
  operations: string[];
}

export interface GenerationOptions {
  restrictToSerializable?: boolean; // Future enhancement
}

/**
 * Parse transaction string into operations array
 * Example: "r1[x] w1[x] c1" => ["r1[x]", "w1[x]", "c1"]
 */
export function parseTransactionString(txString: string): string[] {
  return txString.trim().split(/\s+/).filter(op => op.length > 0);
}

/**
 * Generate a random interleaving of transactions
 * Preserves the order of operations within each transaction
 */
export function generateSchedule(
  transactions: Transaction[],
  options: GenerationOptions = {}
): string {
  // Create pointers for each transaction
  const pointers = transactions.map(() => 0);
  const schedule: string[] = [];
  
  // Track remaining operations
  let totalRemaining = transactions.reduce((sum, tx) => sum + tx.operations.length, 0);
  
  while (totalRemaining > 0) {
    // Find transactions that still have operations
    const availableTransactions: number[] = [];
    transactions.forEach((tx, idx) => {
      if (pointers[idx] < tx.operations.length) {
        availableTransactions.push(idx);
      }
    });
    
    if (availableTransactions.length === 0) break;
    
    // Randomly pick one of the available transactions
    const chosenIdx = availableTransactions[Math.floor(Math.random() * availableTransactions.length)];
    
    // Add the next operation from chosen transaction
    const operation = transactions[chosenIdx].operations[pointers[chosenIdx]];
    schedule.push(operation);
    pointers[chosenIdx]++;
    totalRemaining--;
  }
  
  return schedule.join(' ');
}

/**
 * Validate that operations belong to their declared transactions
 */
export function validateTransactionOperations(transactions: Transaction[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  transactions.forEach((tx, idx) => {
    tx.operations.forEach((op, opIdx) => {
      // Check if operation references the correct transaction ID
      const match = op.match(/^[a-z]+(\d+)/);
      if (match) {
        const opTxId = parseInt(match[1]);
        if (opTxId !== tx.id) {
          errors.push(`Transaction T${tx.id}, operation ${opIdx + 1}: "${op}" references T${opTxId} instead of T${tx.id}`);
        }
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate multiple different schedules
 */
export function generateMultipleSchedules(
  transactions: Transaction[],
  count: number,
  options: GenerationOptions = {}
): string[] {
  const schedules = new Set<string>();
  let attempts = 0;
  const maxAttempts = count * 100; // Prevent infinite loop
  
  while (schedules.size < count && attempts < maxAttempts) {
    const schedule = generateSchedule(transactions, options);
    schedules.add(schedule);
    attempts++;
  }
  
  return Array.from(schedules);
}

/**
 * Count total possible interleavings (combinatorial calculation)
 * This is the multinomial coefficient
 */
export function countPossibleInterleavings(transactions: Transaction[]): number {
  const lengths = transactions.map(tx => tx.operations.length);
  const total = lengths.reduce((sum, len) => sum + len, 0);
  
  // Calculate multinomial coefficient: total! / (len1! * len2! * ... * lenN!)
  let result = factorial(total);
  lengths.forEach(len => {
    result = result / factorial(len);
  });
  
  return Math.round(result);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}
