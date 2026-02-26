# Transaction Scheduler Simulator

A Python-based transaction scheduler simulator that analyzes database schedules for correctness properties including conflict-serializability, recoverability, ACA, strict, and rigorous schedules.

## Project Structure

```
.
├── operation.py        # Operation class (START, READ, WRITE, INCREMENT, DECREMENT, COMMIT, ABORT)
├── transaction.py      # Transaction class (collection of operations)
├── schedule.py         # Schedule class (history of operations)
├── scheduler.py        # Scheduler class (analyzer; uses precedence graph for SR)
├── precedence_graph.py # Precedence graph from schedule (conflict edges, cycle check, DOT/PNG)
├── parser.py           # Parser for user input (transaction sequences and schedules)
├── main.py             # Main entry point with user interaction
└── README.md           # This file
```

## Classes Overview

### Operation
Represents a single database operation:
- Types: START (start), READ (r), WRITE (w), INCREMENT (inc), DECREMENT (dec), COMMIT (c), ABORT (a)
- Contains: operation type, transaction ID, data item (if applicable)

### Transaction
Represents a database transaction (well-formed):
- Must **begin with START(Ti)** and **end with COMMIT(Ti) or ABORT(Ti)**
- Contains a sequence of operations in between
- Format: `T1: start1 r1[x] w1[x] c1`

### Schedule
Represents a history/schedule:
- Contains operations from multiple transactions in execution order
- Tracks all transactions in the schedule

### Scheduler
Analyzes schedules for correctness properties (each returns result, explanation, and step-by-step steps):
- `is_conflict_serializable()` - Uses precedence graph (acyclic ⇒ serializable; cycle path shown when not SR)
- `get_precedence_graph()` - Returns the precedence graph for the schedule (for visualization)
- `is_recoverable()` - Check recoverability (RC)
- `avoids_cascading_aborts()` - Check ACA
- `is_strict()` - Check strictness (ST)
- `is_rigorous()` - Check rigorousness

### Precedence graph (precedence_graph.py)
Builds the serialization/precedence graph from the schedule history:
- **Nodes**: transactions (T1, T2, …)
- **Edge T_i → T_j**: conflicting operations in schedule order (T_i before T_j)
- `has_cycle()` — True if not conflict-serializable
- `topological_order()` — one equivalent serial order when acyclic
- `to_networkx()` — build a NetworkX DiGraph
- `to_dot()` — DOT source string (for external tools)
- `render(filepath, format)` — save as PNG/SVG using NetworkX + matplotlib (no Graphviz required), or as `.dot` if format is `"dot"`

After each run, the program saves the precedence graph (e.g. `precedence_graph.png`). Install `networkx` and `matplotlib` (see `requirements.txt`) for image output.

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

Each transaction must be **well-formed**: it must **begin with START(Ti)** and **end with COMMIT(Ti) or ABORT(Ti)**. The system will report an error if any transaction is missing START or COMMIT/ABORT.

1. **Number of transactions**: Enter an integer (e.g., `2`)

2. **Transaction sequences**: Enter each transaction in format (START first, COMMIT or ABORT last):
   ```
   T1: start1 r1[x] w1[x] c1
   T2: start2 r2[y] w2[y] c2
   ```

3. **History/Schedule**: Enter the schedule in one line. The **first** occurrence of each transaction in the schedule must be its START (e.g. `start1`, `start2`):
   ```
   start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2
   ```

### Validation Errors

- **Missing START:** e.g. "Transaction T1 must begin with START (e.g. start1). First operation is r1[x]."
- **Missing COMMIT/ABORT:** e.g. "Transaction T2 must end with COMMIT or ABORT (e.g. c2 or a2). Last operation is w2[y]."
- These apply to both transaction strings (manual input) and the history string.

### Example Session

```
Enter the number of transactions: 2

Enter 2 transaction sequence(s) in format: T1: start1 r1[x] w1[x] c1
Transaction 1: T1: start1 r1[x] w1[x] c1
  Parsed: T1: start1 r1[x] w1[x] c1
Transaction 2: T2: start2 r2[y] w2[y] c2
  Parsed: T2: start2 r2[y] w2[y] c2

Enter the history (schedule) in one line:
Example: start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2
History: start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2
  Parsed schedule: start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2

[Analysis results will be displayed]
```

### Supported Operations

- `start1` - START operation for transaction 1 (required as first op of each transaction)
- `r1[x]` - READ operation by transaction 1 on data item x
- `w1[x]` - WRITE operation by transaction 1 on data item x
- `inc1[x]` - INCREMENT operation by transaction 1 on data item x
- `dec1[x]` - DECREMENT operation by transaction 1 on data item x
- `c1` - COMMIT operation for transaction 1 (required as last op if transaction commits)
- `a1` - ABORT operation for transaction 1 (required as last op if transaction aborts)

## Exiting

Type `quit`, `exit`, or `q` at any prompt to terminate the program.

## Implementation Status

- ✅ Basic structure and classes
- ✅ Parser for transactions and schedules (with well-formedness: START, COMMIT/ABORT)
- ✅ User input handling
- ✅ Conflict-serializability analysis (precedence graph, cycle check, serial order, cycle path when not SR)
- ✅ Precedence graph generation and visualization (DOT/PNG)
- ✅ Recoverability (RC) and ACA analysis with step-by-step explanation and summary
- ✅ Strict (ST) analysis with step-by-step explanation
- ✅ Rigorous analysis with step-by-step explanation
- ✅ Detection of violations with step-by-step explanation (bonus)
- ✅ Visualization of precedence graphs (bonus)
- ⏳ Schedule generation (optional bonus)
- ⏳ Extension to locking protocols (2PL, strict 2PL) (optional bonus)

## Optional Next Steps (Bonus)

- Schedule generation: generate histories that aim for SR/RC/ACA/Strict/Rigorous, then classify to verify.
- 2PL / Strict 2PL: generate schedules using a locking protocol, then classify to verify.

## Next Steps

Each team member can implement one of the analysis methods:
1. Conflict-Serializability (SR)
2. Recoverability (RC)
3. Avoids Cascading Aborts (ACA)
4. Strict (ST)
5. Rigorous

## Code structure

### Files and what they do

| File | Role |
|------|------|
| **main.py** | Entry point. Shows the menu (Manual / Automatic), reads input or loads a test case, builds the schedule, runs the analyzer, prints results and step-by-step explanations, saves graphs. When "Run ALL test cases" is selected, full terminal output is also saved to a timestamped file in the output folder. |
| **parser.py** | Converts text into `Operation` objects and builds `Transaction` / `Schedule` objects. Enforces well-formedness (START, COMMIT/ABORT). No analysis logic. |
| **operation.py** | Defines one operation: type (start, r, w, inc, dec, c, a), transaction ID, optional data item. Provides `conflicts_with()` for conflict detection. |
| **transaction.py** | A single transaction: list of `Operation`s and helpers (e.g. `is_committed()`, `is_aborted()`). |
| **schedule.py** | The full history: list of all `Operation`s in execution order, plus a map of transaction ID → `Transaction`. Built by the parser when you enter (or load) a history. |
| **scheduler.py** | Analyzer. Takes a `Schedule`, builds the precedence graph, runs SR / RC / ACA / Strict / Rigorous checks, returns results and explanations. |
| **precedence_graph.py** | Builds the precedence (serialization) graph from the schedule (nodes = transactions, edges = conflict order), detects cycles, computes serial order, draws and saves the graph (PNG). |
| **history_diagram.py** | Builds the operation-level history view (schedule order, per-transaction chains, conflict edges), prints ASCII and saves PNG. |

### Classes and flow of data

1. **Operation** (operation.py)  
   One step: e.g. `r1[x]`, `w2[y]`, `c1`. Has `transaction_id`, `data_item` (for r/w/inc/dec), and `conflicts_with(other)`.

2. **Transaction** (transaction.py)  
   One transaction: list of `Operation`s. Used to know if a transaction committed or aborted (`is_committed()`, `is_aborted()`).

3. **Schedule** (schedule.py)  
   The history: `operations` (list of `Operation` in schedule order) and `transactions` (dict of transaction ID → `Transaction`). The parser fills this when you type or load a history.

4. **Parser** (parser.py)  
   - `parse_schedule(history_string)` → builds a `Schedule` (list of operations + transactions).  
   - `parse_transaction(line)` → builds a `Transaction` (used in manual mode to validate; the real analysis uses the schedule’s history).

5. **PrecedenceGraph** (precedence_graph.py)  
   Built from a `Schedule`. Represents “who must precede whom”: nodes = transactions, edge T_i → T_j if some op of T_i conflicts with and precedes an op of T_j. Used for SR (cycle check, topological order) and for drawing the precedence graph.

6. **HistoryDiagram** (history_diagram.py)  
   Built from a `Schedule`. Represents the history at operation level (chains per transaction, conflict edges). Used only for printing and drawing the history diagram.

7. **Scheduler** (scheduler.py)  
   Holds a `Schedule`. Uses `PrecedenceGraph` for conflict-serializability. Implements read-from and commit/abort positions for RC and ACA. Calls `get_precedence_graph()` when graphs need to be printed or saved. Does not use `HistoryDiagram`; main builds that separately.

---

## How main runs

1. **Start**  
   `python main.py` → `main()` runs. It prints a banner and enters a loop.

2. **Choose mode**  
   User picks:
   - **1 – Manual:** `run_manual_mode()` runs once (or repeats until user types quit).
   - **2 – Automatic:** `run_automatic_mode()` runs (menu of test cases; user picks one number, or 0 for all, or q to go back).
   - **q:** Exit the loop and the program ends.

3. **Get a schedule**
   - **Manual:** Ask for number of transactions, then each transaction line (e.g. `T1: start1 r1[x] w1[x] c1`), then one history line. Parse the **history** with `Parser.parse_schedule(history_input)` → get a `Schedule` object. Each transaction must begin with START and end with COMMIT or ABORT.
   - **Automatic:** Take the chosen test case; `Parser.parse_schedule(tc["history"])` → same `Schedule` object.

4. **Analyze**  
   - Create `Scheduler(schedule)`.
   - Call `scheduler.analyze()` → returns a dict with SR, RC, ACA, Strict, Rigorous (each with result, explanation, and step-by-step steps).
   - `print_analysis_results(results)` prints that dict and the step-by-step explanations.

5. **Diagrams**  
   - **Precedence graph:** `scheduler.get_precedence_graph()` → `PrecedenceGraph` instance. Call `print_graph()` (terminal) and `render(...)` (saves PNG in the output folder).
   - **History diagram:** `HistoryDiagram(schedule)` → call `print_ascii()` (terminal) and `render(...)` (saves PNG in the output folder).

6. **Loop or quit**  
   - Manual: after one run, ask again for transactions/history until user types quit, then back to step 2.  
   - Automatic: after one run (or all), show the test menu again until user types q, then back to step 2.  
   - If user chose q at the mode prompt, the loop exits and the program ends.