# Transaction Scheduler Simulator

A Python-based transaction scheduler simulator that analyzes database schedules for correctness properties including conflict-serializability, recoverability, ACA, strict, and rigorous schedules.

## Project Structure

```
.
├── operation.py      # Operation class (READ, WRITE, INCREMENT, DECREMENT, COMMIT, ABORT)
├── transaction.py    # Transaction class (collection of operations)
├── schedule.py       # Schedule class (history of operations)
├── scheduler.py      # Scheduler class (analyzer with stub methods)
├── parser.py         # Parser for user input (transaction sequences and schedules)
├── main.py           # Main entry point with user interaction
└── README.md         # This file
```

## Classes Overview

### Operation
Represents a single database operation:
- Types: READ (r), WRITE (w), INCREMENT (inc), DECREMENT (dec), COMMIT (c), ABORT (a)
- Contains: operation type, transaction ID, data item (if applicable)

### Transaction
Represents a database transaction:
- Contains a sequence of operations
- Tracks commit/abort status
- Format: `T1: r1[x] w1[x] c1`

### Schedule
Represents a history/schedule:
- Contains operations from multiple transactions in execution order
- Tracks all transactions in the schedule

### Scheduler
Analyzes schedules for correctness properties:
- `is_conflict_serializable()` - Check conflict-serializability (stub)
- `is_recoverable()` - Check recoverability (stub)
- `avoids_cascading_aborts()` - Check ACA (stub)
- `is_strict()` - Check strictness (stub)
- `is_rigorous()` - Check rigorousness (stub)

### Parser
Parses user input:
- `parse_transaction()` - Parse transaction sequences
- `parse_schedule()` - Parse schedule/history

## Usage

Run the main program:
```bash
python main.py
```

### Input Format

1. **Number of transactions**: Enter an integer (e.g., `2`)

2. **Transaction sequences**: Enter each transaction in format:
   ```
   T1: r1[x] w1[x] c1
   T2: r2[y] w2[y] c2
   ```

3. **History/Schedule**: Enter the schedule in one line:
   ```
   r1[x] w1[x] r2[y] w2[y] c1 c2
   ```

### Example Session

```
Enter the number of transactions: 2

Enter 2 transaction sequence(s) in format: T1: r1[x] w1[x] c1
Transaction 1: T1: r1[x] w1[x] c1
  Parsed: T1: r1[x] w1[x] c1
Transaction 2: T2: r2[y] w2[y] c2
  Parsed: T2: r2[y] w2[y] c2

Enter the history (schedule) in one line:
Example: r1[x] w1[x] r2[y] w2[y] c1 c2
History: r1[x] w1[x] r2[y] w2[y] c1 c2
  Parsed schedule: r1[x] w1[x] r2[y] w2[y] c1 c2

[Analysis results will be displayed]
```

### Supported Operations

- `r1[x]` - READ operation by transaction 1 on data item x
- `w1[x]` - WRITE operation by transaction 1 on data item x
- `inc1[x]` - INCREMENT operation by transaction 1 on data item x
- `dec1[x]` - DECREMENT operation by transaction 1 on data item x
- `c1` - COMMIT operation for transaction 1
- `a1` - ABORT operation for transaction 1

## Exiting

Type `quit`, `exit`, or `q` at any prompt to terminate the program.

## Implementation Status

- ✅ Basic structure and classes
- ✅ Parser for transactions and schedules
- ✅ User input handling
- ⏳ Conflict-serializability analysis (stub)
- ⏳ Recoverability analysis (stub)
- ⏳ ACA analysis (stub)
- ⏳ Strict analysis (stub)
- ⏳ Rigorous analysis (stub)

## Next Steps

Each team member can implement one of the analysis methods:
1. Conflict-Serializability (SR)
2. Recoverability (RC)
3. Avoids Cascading Aborts (ACA)
4. Strict (ST)
5. Rigorous
