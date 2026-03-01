// Test cases for the Transaction Scheduler Simulator

export interface TestCase {
  id: string;
  name: string;
  description: string;
  numTransactions: number;
  schedule: string;
  expectedResults?: {
    conflictSerializable: boolean;
    recoverable: boolean;
    aca: boolean;
    strict: boolean;
    rigorous: boolean;
  };
}

export const testCases: TestCase[] = [
  {
    id: 'case-1-1',
    name: 'Case 1.1 - Recoverable only (RC, not ACA)',
    description: 'T2 reads from T1 before T1 commits, but T2 commits after T1',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] r2[x] c1 c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: false,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-1-2',
    name: 'Case 1.2 - Not Recoverable',
    description: 'T2 reads from T1 and commits before T1',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] r2[x] c2 c1',
    expectedResults: {
      conflictSerializable: true,
      recoverable: false,
      aca: false,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-2-1',
    name: 'Case 2.1 - ACA (Avoids Cascading Aborts)',
    description: 'T2 reads from T1 only after T1 commits',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] c1 r2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-3-1',
    name: 'Case 3.1 - Strict Schedule',
    description: 'T2 writes x only after T1 commits',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] c1 w2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: false
    }
  },
  {
    id: 'case-3-2',
    name: 'Case 3.2 - Not Strict (but ACA)',
    description: 'T2 writes x before T1 commits (but doesnt read)',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] w2[x] c1 c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-4-1',
    name: 'Case 4.1 - Rigorous Schedule',
    description: 'T2 reads x only after T1 commits',
    numTransactions: 2,
    schedule: 'r1[x] c1 r2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-5-1',
    name: 'Case 5.1 - Conflict Serializable (SR)',
    description: 'Three transactions with no cycle',
    numTransactions: 3,
    schedule: 'r1[x] w1[x] r2[x] w2[y] r3[y] w3[z] c1 c2 c3',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: false,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-5-2',
    name: 'Case 5.2 - NOT Conflict Serializable (cycle)',
    description: 'Classic cycle: T1 → T2 → T1',
    numTransactions: 2,
    schedule: 'r1[x] r2[y] w1[y] w2[x] c1 c2',
    expectedResults: {
      conflictSerializable: false,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-6-1',
    name: 'Case 6.1 - Three transaction cycle',
    description: 'T1 → T2 → T3 → T1 cycle',
    numTransactions: 3,
    schedule: 'r1[x] r2[y] r3[z] w1[y] w2[z] w3[x] c1 c2 c3',
    expectedResults: {
      conflictSerializable: false,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-7-1',
    name: 'Case 7.1 - All properties satisfied',
    description: 'Serial execution T1 then T2',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] c1 r2[x] w2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-8-1',
    name: 'Case 8.1 - With ABORT operation',
    description: 'T1 aborts instead of commits',
    numTransactions: 2,
    schedule: 'r1[x] w1[x] a1 r2[x] w2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-9-1',
    name: 'Case 9.1 - Complex 4 transactions',
    description: 'Four transactions with multiple conflicts',
    numTransactions: 4,
    schedule: 'r1[x] w2[y] r3[y] w1[x] r4[x] w3[z] c1 c2 c3 c4',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: false,
      strict: false,
      rigorous: false
    }
  },
  {
    id: 'case-10-1',
    name: 'Case 10.1 - Increment/Decrement operations',
    description: 'Using increment and decrement operations',
    numTransactions: 2,
    schedule: 'r1[x] inc1[x] c1 r2[x] dec2[x] c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-11-1',
    name: 'Case 11.1 - Blind writes',
    description: 'Write without read (blind write)',
    numTransactions: 2,
    schedule: 'w1[x] w2[x] c1 c2',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  },
  {
    id: 'case-12-1',
    name: 'Case 12.1 - No conflicts (independent)',
    description: 'Transactions access different data items',
    numTransactions: 3,
    schedule: 'r1[x] w1[x] r2[y] w2[y] r3[z] w3[z] c1 c2 c3',
    expectedResults: {
      conflictSerializable: true,
      recoverable: true,
      aca: true,
      strict: true,
      rigorous: true
    }
  }
];
