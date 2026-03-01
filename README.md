# Transaction Scheduler Simulator

A Python-based transaction scheduler simulator that analyzes database schedules for correctness properties including conflict-serializability, recoverability, ACA, strict, and rigorous schedules.

## Project Structure

```
.
├── operation.py          # Operation class (START, READ, WRITE, INCREMENT, DECREMENT, COMMIT, ABORT)
├── transaction.py       # Transaction class (collection of operations)
├── schedule.py           # Schedule class (history of operations)
├── scheduler.py          # Scheduler class (analyzer; uses precedence graph for SR)
├── precedence_graph.py   # Precedence graph from schedule (conflict edges, cycle check, DOT/PNG)
├── parser.py             # Parser for user input (transaction sequences and schedules)
├── main.py               # Main entry point (CLI)
├── api.py                # Flask API for the web UI (analyze, test-cases, generate); logs all requests
├── requirements-api.txt  # Flask + flask-cors for the API
├── frontend/             # React (Vite) web UI; calls the API for analysis
└── README.md             # This file
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

## How each feature is computed

The system analyzes schedules in two stages: (1) **parsing** the schedule string into operations and transactions, and (2) **analysis** by the scheduler, precedence graph, and locking modules. Below is how each property is determined.

### Parsing (`parser.py`)

- **Input:** A single history string (e.g. `start1 r1[x] w1[x] start2 r2[x] w2[y] c1 c2`) and optionally per-transaction strings (e.g. `T1: start1 r1[x] w1[x] c1`).
- **Process:** `Parser.parse_schedule(history_string)` tokenizes the string into operation tokens, builds an `Operation` for each (type, transaction ID, data item), and assembles a `Schedule` (ordered list of operations + map of transaction ID → `Transaction`).
- **Validation:** Each transaction in the schedule must **begin with START** (e.g. `start1`) and **end with COMMIT or ABORT** (e.g. `c1` or `a2`). Missing START or COMMIT/ABORT yields a clear error (e.g. "Transaction T1 must begin with START...").

### Conflict serializability (`scheduler.py` + `precedence_graph.py`)

- **Idea:** A schedule is conflict-serializable iff its **precedence (serialization) graph** is **acyclic**.
- **Precedence graph:** Built from the schedule: **nodes** = all transactions; **edge T_i → T_j** iff for some data item x, an operation of T_i conflicts with and **precedes** an operation of T_j in the schedule (conflict = read-write, write-read, or write-write on the same item).
- **Computation:** `PrecedenceGraph(schedule)` builds nodes and edges; `has_cycle()` (DFS) detects a cycle; if acyclic, `topological_order()` gives an equivalent serial order (e.g. T1 → T2 → T3).
- **Output:** Boolean (serializable or not), optional serial order, explanation, and step-by-step steps (build graph, list edges, report cycle or topological order).

### Recoverability (RC) (`scheduler.py`)

- **Idea:** For every **read-from** pair (T_i reads x from T_j), if T_i commits then T_j must commit and **c_j < c_i** (writer commits before reader).
- **Computation:** `_read_from_pairs()` does one pass over the schedule: for each read r_i[x], find the "visible" writer T_j (last write on x before this read, ignoring aborted transactions). Then for each such (T_i, T_j), check commit indices: if T_i commits, require T_j committed and at an earlier position.
- **Output:** Boolean (recoverable or not), explanation, and step-by-step steps (read-from pairs, rule, per-pair check, summary).

### Avoids cascading aborts (ACA) (`scheduler.py`)

- **Idea:** No transaction reads a value written by an **uncommitted** transaction. For each read-from (T_i, T_j, x), we need **c_j < p** where p is the position of the read (writer committed before the read).
- **Computation:** Uses the same read-from pairs as RC. For each pair, check that the writer T_j has committed **before** the read's position (commit_index[T_j] < p).
- **Output:** Boolean (avoids cascading aborts or not), explanation, and step-by-step steps (read-from pairs, rule, per-pair check, summary).

### Strict (ST) (`scheduler.py`)

- **Idea:** No transaction reads or writes a data item x until the transaction that **last wrote** x has committed or aborted.
- **Computation:** Single pass over the schedule; for each data item x maintain "last writer" (position, transaction). For each read/write on x at position p, require that the last writer of x has either committed or aborted at some position before p.
- **Output:** Boolean (strict or not), explanation, and step-by-step steps (rule, per-position check, violations if any, summary).

### Rigorous (`scheduler.py`)

- **Idea:** No read or write on x until the transaction that **last read or wrote** x has committed or aborted (stricter than strict: last **action** on x, not only last writer).
- **Computation:** Single pass; for each data item x maintain "last action" (position, transaction) for both reads and writes. For each read/write on x at position p (by another transaction), require that the last actor on x has committed or aborted before p.
- **Output:** Boolean (rigorous or not), explanation, and step-by-step steps (rule, per-position check, violations if any, summary).

### 2PL and Strict 2PL (`locking.py`)

- **Idea (Strict 2PL):** Locks are acquired **before** each data operation and released **only at commit or abort**. No early release.
- **Computation:** `validate_2pl_strict2pl(schedule)` simulates the canonical lock sequence: for each operation in order, if it's a data op (read/write on x), try to grant the required lock (read or write) on x; if another transaction holds an incompatible lock, record a conflict and set "follows Strict 2PL" to false. Lock steps are tied to schedule operations (e.g. "Before r1[x]: …", "Schedule operation w2[x]: …"). At commit/abort, all locks held by that transaction are released. A final "(result)" step states whether conditions hold or not.
- **Basic 2PL:** If Strict 2PL fails (e.g. lock conflict), the system still checks Basic 2PL via `_follows_basic_2pl(schedule)`: no transaction may **acquire** a lock **after** it has **released** any lock (growing then shrinking phase).
- **Output:** Two booleans (follows Strict 2PL, follows Basic 2PL), and a list of steps with `event` and `explanation` (lock commands rl/wl/ru/wu, schedule operations, and final result explanation).

### Schedule generation (`schedule_generator.py`, `schedule_generator_2pl.py`)

- **Random:** `ScheduleGenerator` generates transaction programs and then interleaves operations (with optional aborts) to produce a history string.
- **2PL / Strict 2PL:** `generate_schedule_with_protocol(transactions_list, mode, seed)` simulates a locking protocol: **Strict 2PL** = acquire lock before each read/write, release all at commit/abort; **Basic 2PL** = same but allows early release after last use of an item. The generated history is the sequence of data operations and commit/abort as ordered by the protocol.

## Usage

### Option 1: Command-line (Python only)

Run the main program:
```bash
python main.py
```

### Option 2: Web UI (React + Python API)

The frontend is a **React** app (Vite). To run the full stack:

1. **Backend (Python API)**  
   In one terminal, from the project root:
   ```bash
   pip install -r requirements-api.txt
   python api.py
   ```
   The API runs at `http://localhost:5000` and logs each request.

2. **Frontend (React)**  
   In a second terminal, from the project root:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   This starts the Vite dev server (React). Open the URL shown (e.g. `http://localhost:5173`). The UI talks to the API at `http://localhost:5000` (via Vite proxy if configured).

3. **Using the UI**  
   Use **Manual Input**, **Run Test Cases**, or **Generate Schedule**. For generation you can choose mode: **Random**, **2PL**, or **Strict 2PL**. Schedules must include `start1`, `start2`, etc.; see Input Format below.

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
- ✅ Conflict-serializability analysis (precedence graph, cycle check, serial order, step-by-step)
- ✅ Recoverability (RC), ACA, Strict (ST), Rigorous with step-by-step explanations
- ✅ 2PL and Strict 2PL validation with step-by-step lock explanation (schedule-operation–aware)
- ✅ Schedule generation (Random, 2PL, Strict 2PL) via API and CLI
- ✅ Precedence graph and history diagram generation and visualization
- ✅ Web UI (React + Vite) and Flask API

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