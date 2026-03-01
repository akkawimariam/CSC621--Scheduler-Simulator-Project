"""
Main entry point for the Transaction Scheduler Simulator.
Handles user interaction and schedule analysis.
Supports Manual input or Automatic (built-in test cases).
"""

import os

from scheduler import Scheduler
from parser import Parser
from history_diagram import HistoryDiagram
from schedule_generator import ScheduleGenerator
from schedule_generator_2pl import generate_schedule_with_protocol
from locking import Strict2PLHistory, validate_2pl_strict2pl

# Output folder for precedence graph and history diagram (relative to this file)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(_SCRIPT_DIR, "Generated Graphs & History Diagram")

import sys
from io import StringIO

class Tee:
    """Write to both stdout and a file."""
    def __init__(self, file):
        self.file = file
        self.stdout = sys.stdout
    def write(self, data):
        self.stdout.write(data)
        self.file.write(data)
    def flush(self):
        self.stdout.flush()
        self.file.flush()

def _output_path(filename):
    """Return path for a file in OUTPUT_DIR, creating the directory if needed."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    return os.path.join(OUTPUT_DIR, filename)

# ---------------------------------------------------------------------------
# Hardcoded test cases (from test_cases_schedules.txt) for automatic mode
# ---------------------------------------------------------------------------
TEST_CASES = [
    {
        "label": "Case 1.1 - Recoverable only (RC, not ACA)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[x] c1 c2",
    },
    {
        "label": "Case 1.2 - Recoverable only (RC, not ACA)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] r1[y] w1[y] c1", "T2: start2 r2[x] r2[y] w2[y] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] r1[y] w1[y] r2[y] w2[y] c1 c2",
    },
    {
        "label": "Case 2.1 - Not recoverable",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] c2 c1",
    },
    {
        "label": "Case 2.2 - Not recoverable (3 txns)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] w1[y] c1", "T2: start2 r2[x] w2[x] c2", "T3: start3 r3[y] w3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[x] c2 w1[y] start3 r3[y] w3[y] c3 c1",
    },
    {
        "label": "Case 3.1 - Strict (and Rigorous)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[x] c2",
    },
    {
        "label": "Case 3.2 - Strict (and Rigorous, 3 txns)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[y] c2", "T3: start3 r3[x] r3[y] w3[x] c3"],
        "history": "start1 w1[x] c1 start2 w2[y] c2 start3 r3[x] r3[y] w3[x] c3",
    },
    {
        "label": "Case 4.1 - ACA but not Strict (dirty write)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] c2"],
        "history": "start1 w1[x] start2 w2[x] c1 c2",
    },
    {
        "label": "Case 5.1 - Conflict serializable (interleaved)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[y] w2[y] c2"],
        "history": "start1 r1[x] start2 r2[y] w1[x] w2[y] c1 c2",
    },
    {
        "label": "Case 5.2 - NOT conflict serializable (cycle)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[y] w2[x] c2"],
        "history": "start1 r1[x] start2 r2[y] w1[y] w2[x] c1 c2",
    },
    {
        "label": "Case 6.1 - Rigorous (serial)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[x] c2",
    },
    {
        "label": "Case 7.1 - Edge: single transaction",
        "num_txns": 1,
        "transactions": ["T1: start1 r1[x] w1[x] r1[y] w1[y] c1"],
        "history": "start1 r1[x] w1[x] r1[y] w1[y] c1",
    },
    {
        "label": "Case 7.2 - Edge: only reads",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] c1", "T2: start2 r2[x] c2"],
        "history": "start1 r1[x] start2 r2[x] c1 c2",
    },
    {
        "label": "Case 8.1 - Conflict-Serializable (Acyclic) T1→T2→T3",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] c1 c2 c3",
    },
    {
        "label": "Case 8.2 - Non-Serializable (Cycle x,y)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 r1[x] start2 w2[x] r2[y] w1[y] c1 c2",
    },
    {
        "label": "Case 8.3 - 4 Txns serializable T1→T2→T3→T4",
        "num_txns": 4,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3", "T4: start4 r4[z] w4[x] c4"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] start4 r4[z] w4[x] c1 c2 c3 c4",
    },
        # --- 9. Complex 4-transaction scenarios ---
    {
        "label": "Case 9.1 - 4 txns interleaved conflicts acyclic",
        "num_txns": 4,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[y] w2[z] c2", "T3: start3 r3[z] w3[x] c3", "T4: start4 r4[x] r4[y] w4[z] c4"],
        "history": "start1 r1[x] start2 r2[y] start3 r3[z] w1[y] start4 r4[x] w2[z] w3[x] r4[y] w4[z] c1 c2 c3 c4",
    },
    {
        "label": "Case 9.2 - 4 txns with cycle (T1→T2→T1)",
        "num_txns": 4,
        "transactions": ["T1: start1 w1[x] r1[y] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 w3[z] r3[x] c3", "T4: start4 r4[z] w4[x] c4"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 w3[z] r3[x] start4 r4[z] r1[y] w4[x] c1 c2 c3 c4",
    },
    # --- 10. Scenarios with aborts ---
    {
        "label": "Case 10.1 - Abort T1, T2 committed after dirty read",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] a1 start3 r3[y] w3[z] c2 c3",
    },
    {
        "label": "Case 10.2 - Cascading abort (T1,T2 abort, T3 commits)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] w2[y] a2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] a1 a2 c3",
    },
    {
        "label": "Case 10.3 - T2 aborts, T3 reads from T2 then commits",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] a2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] c1 start2 r2[x] w2[y] start3 r3[y] w3[z] a2 c3",
    },
    # --- 11. INC/DEC operations ---
    {
        "label": "Case 11.1 - INC/DEC read-write conflicts",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] inc1[x] dec1[y] c1", "T2: start2 inc2[x] r2[y] c2", "T3: start3 r3[x] dec3[z] c3"],
        "history": "start1 r1[x] start2 inc2[x] inc1[x] r2[y] start3 r3[x] dec1[y] dec3[z] c1 c2 c3",
    },
    {
        "label": "Case 11.2 - INC/DEC acyclic",
        "num_txns": 3,
        "transactions": ["T1: start1 inc1[x] dec1[y] c1", "T2: start2 r2[x] inc2[y] c2", "T3: start3 r3[y] dec3[x] c3"],
        "history": "start1 inc1[x] start2 r2[x] inc2[y] start3 r3[y] dec3[x] dec1[y] c1 c2 c3",
    },
    {
        "label": "Case 11.3 - INC/DEC cycle (non-serializable)",
        "num_txns": 3,
        "transactions": ["T1: start1 inc1[x] dec1[y] c1", "T2: start2 inc2[y] dec2[z] c2", "T3: start3 inc3[z] dec3[x] c3"],
        "history": "start1 inc1[x] start2 inc2[y] start3 inc3[z] dec3[x] dec1[y] dec2[z] c1 c2 c3",
    },
        # --- 12. Basic 2PL / Strict 2PL (Chapter 3 style) ---
    {
        "label": "Case 12.1 — Basic 2PL (SR=YES, RC=YES, ACA=NO, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 w1[x] start2 r2[x] w2[y] c1 c2",
    },
    {
        "label": "Case 12.2 — Basic 2PL (SR=YES, RC=YES, ACA=YES, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] c2"],
        "history": "start1 w1[x] start2 w2[x] c1 c2",
    },
    {
        "label": "Case 12.3 — Strict 2PL (SR=YES, ST=YES, Rigorous=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[z] c2"],
        "history": "start1 r1[x] w1[y] c1 start2 r2[x] w2[z] c2",
    },
    {
        "label": "Case 12.4 — Rigorous 2PL (SR=YES, ST=YES, Rigorous=YES)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[y] c2",
    },
    {
        "label": "Case 12.5 — Basic 2PL (SR=YES, RC=NO, ACA=NO, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] c2"],
        "history": "start1 w1[x] start2 r2[x] c2 a1",
    },
    {
        "label": "Case 12.6 — Basic 2PL (SR=YES, RC=YES, ACA=NO, ST=NO)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 r3[y] c1 c2 c3",
    },
    {
        "label": "Case 12.7 — Basic 2PL (SR=YES, RC=YES, ACA=YES, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] w2[y] c2"],
        "history": "start1 w1[x] start2 w2[x] w2[y] c1 c2",
    },
    {
        "label": "Case 12.8 — Strict 2PL (3 txns chain)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] c1 start2 r2[x] w2[y] c2 start3 r3[y] w3[z] c3",
    },
    {
        "label": "Case 12.9 — Strict 2PL (parallel non-conflicting reads)",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[z] c2", "T3: start3 r3[y] c3"],
        "history": "start1 r1[x] w1[y] c1 start2 r2[x] w2[z] c2 start3 r3[y] c3",
    },
    {
        "label": "Case 12.10 — Rigorous 2PL (full commit separation)",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[y] c2 start3 r3[y] c3",
    },
]


def print_analysis_results(results):
    """Print analysis results and step-by-step explanations when available."""
    print("\n" + "="*60)
    print("ANALYSIS RESULTS")
    print("="*60)

    # Conflict-Serializability
    sr_result = results['conflict_serializable']
    print(f"\n[Conflict-Serializable (SR)]")
    print(f"  Result: {'YES' if sr_result['is_serializable'] else 'NO'}")
    if sr_result.get('serial_order'):
        print(f"  Serial Order: {sr_result['serial_order']}")
    print(f"  Explanation: {sr_result['explanation']}")
    if sr_result.get('steps'):
        print("  Step-by-step:")
        for i, s in enumerate(sr_result['steps'], 1):
            print(f"    {i}. {s}")

    # Recoverability
    rc_result = results['recoverable']
    print(f"\n[Recoverable (RC)]")
    print(f"  Result: {'YES' if rc_result['is_recoverable'] else 'NO'}")
    print(f"  Explanation: {rc_result['explanation']}")
    if rc_result.get('steps'):
        print("  Step-by-step:")
        for i, s in enumerate(rc_result['steps'], 1):
            print(f"    {i}. {s}")

    # ACA
    aca_result = results['aca']
    print(f"\n[Avoids Cascading Aborts (ACA)]")
    print(f"  Result: {'YES' if aca_result['avoids_cascading_aborts'] else 'NO'}")
    print(f"  Explanation: {aca_result['explanation']}")
    if aca_result.get('steps'):
        print("  Step-by-step:")
        for i, s in enumerate(aca_result['steps'], 1):
            print(f"    {i}. {s}")

    # Strict
    strict_result = results['strict']
    print(f"\n[Strict (ST)]")
    print(f"  Result: {'YES' if strict_result['is_strict'] else 'NO'}")
    print(f"  Explanation: {strict_result['explanation']}")
    if strict_result.get('steps'):
        print("  Step-by-step:")
        for i, s in enumerate(strict_result['steps'], 1):
            print(f"    {i}. {s}")

    # Rigorous
    rigorous_result = results['rigorous']
    print(f"\n[Rigorous]")
    print(f"  Result: {'YES' if rigorous_result['is_rigorous'] else 'NO'}")
    print(f"  Explanation: {rigorous_result['explanation']}")
    if rigorous_result.get('steps'):
        print("  Step-by-step:")
        for i, s in enumerate(rigorous_result['steps'], 1):
            print(f"    {i}. {s}")

    print("\n" + "="*60 + "\n")

def print_2pl_validation(schedule):
    """Print 2PL / Strict 2PL validation (follows2PL, followsStrict2PL, step-by-step)."""
    follows_strict, follows_2pl, steps = validate_2pl_strict2pl(schedule)
    print("\n--- 2PL / Strict 2PL validation ---")
    print(f"  Follows Strict 2PL: {'YES' if follows_strict else 'NO'}")
    print(f"  Follows 2PL:        {'YES' if follows_2pl else 'NO'}")
    print("  Step-by-step (rl, wl, ru, wu):")
    for s in steps:
        print(f"    {s['event']}  ->  {s['explanation']}")
    print()

def run_test_case(tc, graph_filename=None):
    """
    Run analysis for one test case (from TEST_CASES).
    Parses transactions and history, runs scheduler, prints results, saves precedence graph.
    """
    schedule = Parser.parse_schedule(tc["history"])
    scheduler = Scheduler(schedule)
    results = scheduler.analyze()
    print_analysis_results(results)

    print_2pl_validation(schedule)

    base = graph_filename or "precedence_graph"
    pg = scheduler.get_precedence_graph()
    hd = HistoryDiagram(schedule)

    print()
    pg.print_graph()
    print("\n--- History diagram (terminal) ---")
    hd.print_ascii()
    print("\n--- Strict 2PL lock history ---")
    Strict2PLHistory(schedule).print_ascii()
    print()

    try:
        out_path = pg.render(filepath=_output_path(base), format="png")
        print(f"Precedence graph saved: {out_path}")
        if out_path.endswith(".dot"):
            print("  (Install 'networkx' and 'matplotlib' to generate PNG.)")
    except Exception as e:
        print(f"Could not save precedence graph: {e}")
    try:
        history_path = "history_diagram_" + base if base != "precedence_graph" else "history_diagram"
        if "precedence_graph_case_" in base:
            history_path = base.replace("precedence_graph", "history_diagram", 1)
        out_h = hd.render(filepath=_output_path(history_path))
        if out_h:
            print(f"History diagram saved: {out_h}")
    except Exception as e:
        print(f"Could not save history diagram: {e}")


def run_manual_mode():
    """One iteration of manual input: number of txns, transaction lines, history, then analyze."""
    num_txns_input = input("Enter the number of transactions: ").strip()
    if num_txns_input.lower() in ['quit', 'exit', 'q']:
        return 'quit'
    try:
        num_txns = int(num_txns_input)
        if num_txns < 1:
            print("Error: Number of transactions must be at least 1.\n")
            return None
    except ValueError:
        print("Error: Please enter a valid number.\n")
        return None

    transactions = []
    print(f"\nEnter {num_txns} transaction sequence(s) in format: T1: start1 r1[x] w1[x] c1")
    for i in range(num_txns):
        while True:
            txn_input = input(f"Transaction {i+1}: ").strip()
            if txn_input.lower() in ['quit', 'exit', 'q']:
                return 'quit'
            try:
                transaction = Parser.parse_transaction(txn_input)
                transactions.append(transaction)
                print(f"  Parsed: {transaction}")
                break
            except ValueError as e:
                print(f"  Error: {e}")
                print("  Please enter in format: T1: start1 r1[x] w1[x] c1")

    print(f"\nEnter the history (schedule) in one line:")
    print("Example: start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2")
    while True:
        history_input = input("History: ").strip()
        if history_input.lower() in ['quit', 'exit', 'q']:
            return 'quit'
        if not history_input:
            print("Error: History cannot be empty.")
            continue
        try:
            schedule = Parser.parse_schedule(history_input)
            print(f"  Parsed schedule: {schedule}")
            break
        except ValueError as e:
            print(f"  Error: {e}")
            print("  Please enter in format: r1[x] w1[x] r2[y] w2[y] c1 c2")

    scheduler = Scheduler(schedule)
    results = scheduler.analyze()
    print_analysis_results(results)

    print_2pl_validation(schedule)

    pg = scheduler.get_precedence_graph()
    hd = HistoryDiagram(schedule)
    print()
    pg.print_graph()
    print("\n--- History diagram (terminal) ---")
    hd.print_ascii()
    print("\n--- Strict 2PL lock history ---")
    Strict2PLHistory(schedule).print_ascii()
    print()

    try:
        out_path = pg.render(filepath=_output_path("precedence_graph"), format="png")
        print(f"Precedence graph saved: {out_path}")
        if out_path.endswith(".dot"):
            print("  (Install 'networkx' and 'matplotlib' to generate PNG.)")
    except Exception as e:
        print(f"Could not save precedence graph: {e}")
    try:
        out_h = hd.render(filepath=_output_path("history_diagram"))
        if out_h:
            print(f"History diagram saved: {out_h}")
    except Exception as e:
        print(f"Could not save history diagram: {e}")
    return None


def run_automatic_mode():
    """Menu of test cases: pick one, run all, or quit."""
    while True:
        print("\n--- Test cases ---")
        for i, tc in enumerate(TEST_CASES, 1):
            print(f"  {i:2}. {tc['label']}")
        print("   0. Run ALL test cases")
        print("   q. Back to mode selection")
        choice = input("Select test case (1-{}, 0, or q): ".format(len(TEST_CASES))).strip().lower()
        if choice == 'q':
            return
        if choice == '0':
            from datetime import datetime
            log_name = "all_test_cases_output_{}.txt".format(datetime.now().strftime("%Y%m%d_%H%M%S"))
            log_path = _output_path(log_name)
            with open(log_path, 'w', encoding='utf-8') as log_file:
                tee = Tee(log_file)
                old_stdout = sys.stdout
                sys.stdout = tee
                try:
                    for i, tc in enumerate(TEST_CASES):
                        print("\n" + "#"*60)
                        print(f"Running: {tc['label']}")
                        print("#"*60)
                        run_test_case(tc, graph_filename="precedence_graph_case_{}".format(i + 1))
                finally:
                    sys.stdout = old_stdout
            print("\nFull output saved to: {}".format(log_path))
            continue
        try:
            idx = int(choice)
            if 1 <= idx <= len(TEST_CASES):
                tc = TEST_CASES[idx - 1]
                print("\nRunning: {}".format(tc["label"]))
                run_test_case(tc, graph_filename="precedence_graph_case_{}".format(idx))
            else:
                print("Invalid number. Enter 1-{}, 0, or q.".format(len(TEST_CASES)))
        except ValueError:
            print("Invalid input. Enter a number or q.")


def run_generation_mode():
    """Schedule generation: choose Interleaving, 2PL, or Strict 2PL, then generate and analyze."""
    print("\n--- Schedule generation ---")
    print("  1 - Interleaving (random)")
    print("  2 - 2PL (Basic 2PL, early release allowed)")
    print("  3 - Strict 2PL (release only at commit/abort)")
    gen_choice = input("Choice (1, 2, or 3): ").strip()
    if gen_choice not in ("1", "2", "3"):
        print("Invalid choice. Using 1 (Interleaving).")
        gen_choice = "1"
    
    try:
        num_txns_input = input("Enter number of transactions (e.g., 2 or 3): ").strip()
        if num_txns_input.lower() in ["q", "quit", "exit"]:
            return
        num_txns = int(num_txns_input)

        max_ops_input = input("Enter max number of data operations per transaction (e.g., 3 or 4): ").strip()
        if max_ops_input.lower() in ["q", "quit", "exit"]:
            return
        max_ops = int(max_ops_input)

        data_items_input = input("Enter data items separated by spaces or commas (default: x y): ").strip()
        if not data_items_input:
            data_items = ["x", "y"]
        else:
            # Allow both "x y" and "x,y z" styles.
            cleaned = data_items_input.replace(",", " ")
            data_items = [token for token in cleaned.split() if token]

        allow_aborts_input = input("Allow some transactions to abort? (y/n, default: y): ").strip().lower()
        allow_aborts = allow_aborts_input not in ["n", "no"]
    except ValueError:
        print("Error: please enter valid numeric values.\n")
        return

    try:
        txn_strings, history = ScheduleGenerator.generate_transactions_and_history(
            num_transactions=num_txns,
            max_ops_per_transaction=max_ops,
            data_items=data_items,
            allow_aborts=allow_aborts,
        )
    except Exception as e:
        print(f"Error generating schedule: {e}\n")
        return

    # If 2PL or Strict 2PL, re-generate schedule using the protocol (same transactions)
    if gen_choice in ("2", "3"):
        mode = "strict2pl" if gen_choice == "3" else "2pl"
        transactions_list = []
        for s in txn_strings:
            part = s.split(":", 1)[1].strip() if ":" in s else s
            transactions_list.append(part.split())
        try:
            history = generate_schedule_with_protocol(transactions_list, mode)
        except Exception as e:
            print(f"Error generating {mode} schedule: {e}\n")
            return

    print("\nGenerated transactions:")
    for s in txn_strings:
        print("  " + s)
    print("\nGenerated history:")
    print("  " + history)
    print()

    try:
        schedule = Parser.parse_schedule(history)
        print(f"Parsed schedule: {schedule}")
    except ValueError as e:
        print(f"\nError: generated history could not be parsed: {e}\n")
        return

    scheduler = Scheduler(schedule)
    results = scheduler.analyze()
    print_analysis_results(results)

    print_2pl_validation(schedule)

    pg = scheduler.get_precedence_graph()
    hd = HistoryDiagram(schedule)

    print()
    pg.print_graph()
    print("\n--- History diagram (terminal) ---")
    hd.print_ascii()
    print("\n--- Strict 2PL lock history ---")
    Strict2PLHistory(schedule).print_ascii()
    print()

    try:
        out_path = pg.render(filepath=_output_path("precedence_graph_generated"), format="png")
        print(f"Precedence graph saved: {out_path}")
        if out_path.endswith(".dot"):
            print("  (Install 'networkx' and 'matplotlib' to generate PNG.)")
    except Exception as e:
        print(f"Could not save precedence graph: {e}")
    try:
        out_h = hd.render(filepath=_output_path("history_diagram_generated"))
        if out_h:
            print(f"History diagram saved: {out_h}")
    except Exception as e:
        print(f"Could not save history diagram: {e}")


def main():
    """Main function: choose Manual or Automatic mode, then run."""
    print("="*60)
    print("Transaction Scheduler Simulator")
    print("="*60)
    print("\nEnter 'quit' or 'exit' to terminate the program.\n")

    while True:
        try:
            print("Input mode:")
            print("  1 - Manual (enter transactions and history yourself)")
            print("  2 - Test cases (run a test case from the built-in list)")
            print("  3 - Schedule generation (Interleaving, 2PL, or Strict 2PL)")
            mode_input = input("Choice (1, 2, 3, or q to quit): ").strip().lower()
            if mode_input in ['quit', 'exit', 'q']:
                print("Exiting program. Goodbye!")
                break
            if mode_input == '1':
                while True:
                    result = run_manual_mode()
                    if result == 'quit':
                        break
                    # else loop again for another manual run
            elif mode_input == '2':
                run_automatic_mode()
            elif mode_input == '3':
                run_generation_mode()
            else:
                print("Invalid choice. Enter 1, 2, 3, or q.\n")
        except KeyboardInterrupt:
            print("\n\nExiting program. Goodbye!")
            break
        except Exception as e:
            print(f"\nUnexpected error: {e}\n")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()
