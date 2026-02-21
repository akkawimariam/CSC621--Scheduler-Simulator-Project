"""
Main entry point for the Transaction Scheduler Simulator.
Handles user interaction and schedule analysis.
Supports Manual input or Automatic (built-in test cases).
"""

import os

from scheduler import Scheduler
from parser import Parser
from history_diagram import HistoryDiagram

# Output folder for precedence graph and history diagram (relative to this file)
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(_SCRIPT_DIR, "Generated Graphs & History Diagram")


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
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] w2[x] c2"],
        "history": "r1[x] w1[x] r2[x] w2[x] c1 c2",
    },
    {
        "label": "Case 1.2 - Recoverable only (RC, not ACA)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[x] r1[y] w1[y] c1", "T2: r2[x] r2[y] w2[y] c2"],
        "history": "r1[x] w1[x] r2[x] r1[y] w1[y] r2[y] w2[y] c1 c2",
    },
    {
        "label": "Case 2.1 - Not recoverable",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] c2"],
        "history": "r1[x] w1[x] r2[x] c2 c1",
    },
    {
        "label": "Case 2.2 - Not recoverable (3 txns)",
        "num_txns": 3,
        "transactions": ["T1: w1[x] w1[y] c1", "T2: r2[x] w2[x] c2", "T3: r3[y] w3[y] c3"],
        "history": "w1[x] r2[x] w2[x] c2 w1[y] r3[y] w3[y] c3 c1",
    },
    {
        "label": "Case 3.1 - Strict (and Rigorous)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] w2[x] c2"],
        "history": "r1[x] w1[x] c1 r2[x] w2[x] c2",
    },
    {
        "label": "Case 3.2 - Strict (and Rigorous, 3 txns)",
        "num_txns": 3,
        "transactions": ["T1: w1[x] c1", "T2: w2[y] c2", "T3: r3[x] r3[y] w3[x] c3"],
        "history": "w1[x] c1 w2[y] c2 r3[x] r3[y] w3[x] c3",
    },
    {
        "label": "Case 4.1 - ACA but not Strict (dirty write)",
        "num_txns": 2,
        "transactions": ["T1: w1[x] c1", "T2: w2[x] c2"],
        "history": "w1[x] w2[x] c1 c2",
    },
    {
        "label": "Case 5.1 - Conflict serializable (interleaved)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[y] w2[y] c2"],
        "history": "r1[x] r2[y] w1[x] w2[y] c1 c2",
    },
    {
        "label": "Case 5.2 - NOT conflict serializable (cycle)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[y] c1", "T2: r2[y] w2[x] c2"],
        "history": "r1[x] r2[y] w1[y] w2[x] c1 c2",
    },
    {
        "label": "Case 6.1 - Rigorous (serial)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] w2[x] c2"],
        "history": "r1[x] w1[x] c1 r2[x] w2[x] c2",
    },
    {
        "label": "Case 7.1 - Edge: single transaction",
        "num_txns": 1,
        "transactions": ["T1: r1[x] w1[x] r1[y] w1[y] c1"],
        "history": "r1[x] w1[x] r1[y] w1[y] c1",
    },
    {
        "label": "Case 7.2 - Edge: only reads",
        "num_txns": 2,
        "transactions": ["T1: r1[x] c1", "T2: r2[x] c2"],
        "history": "r1[x] r2[x] c1 c2",
    },
    {
        "label": "Case 8.1 - Conflict-Serializable (Acyclic) T1→T2→T3",
        "num_txns": 3,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] w2[y] c2", "T3: r3[y] w3[z] c3"],
        "history": "r1[x] w1[x] r2[x] w2[y] r3[y] w3[z] c1 c2 c3",
    },
    {
        "label": "Case 8.2 - Non-Serializable (Cycle x,y)",
        "num_txns": 2,
        "transactions": ["T1: r1[x] w1[y] c1", "T2: r2[x] w2[y] c2"],
        "history": "r1[x] w2[x] r2[y] w1[y] c1 c2",
    },
    {
        "label": "Case 8.3 - 4 Txns serializable T1→T2→T3→T4",
        "num_txns": 4,
        "transactions": ["T1: r1[x] w1[x] c1", "T2: r2[x] w2[y] c2", "T3: r3[y] w3[z] c3", "T4: r4[z] w4[x] c4"],
        "history": "r1[x] w1[x] r2[x] w2[y] r3[y] w3[z] r4[z] w4[x] c1 c2 c3 c4",
    },
        # --- 9. Complex 4-transaction scenarios ---
    {
        "label": "Case 9.1 - 4 txns interleaved conflicts acyclic",
        "num_txns": 4,
        "transactions": ["T1: r1[x] w1[y] c1", "T2: r2[y] w2[z] c2", "T3: r3[z] w3[x] c3", "T4: r4[x] r4[y] w4[z] c4"],
        "history": "r1[x] r2[y] r3[z] w1[y] r4[x] w2[z] w3[x] r4[y] w4[z] c1 c2 c3 c4",
    },
    {
        "label": "Case 9.2 - 4 txns with cycle (T1→T2→T1)",
        "num_txns": 4,
        "transactions": ["T1: w1[x] r1[y] c1", "T2: r2[x] w2[y] c2", "T3: w3[z] r3[x] c3", "T4: r4[z] w4[x] c4"],
        "history": "w1[x] r2[x] w2[y] w3[z] r3[x] r4[z] r1[y] w4[x] c1 c2 c3 c4",
    },
    # --- 10. Scenarios with aborts ---
    {
        "label": "Case 10.1 - Abort T1, T2 committed after dirty read",
        "num_txns": 3,
        "transactions": ["T1: w1[x] a1", "T2: r2[x] w2[y] c2", "T3: r3[y] w3[z] c3"],
        "history": "w1[x] r2[x] w2[y] a1 r3[y] w3[z] c2 c3",
    },
    {
        "label": "Case 10.2 - Cascading abort (T1,T2 abort, T3 commits)",
        "num_txns": 3,
        "transactions": ["T1: w1[x] a1", "T2: r2[x] w2[y] a2", "T3: r3[y] w3[z] c3"],
        "history": "w1[x] r2[x] w2[y] r3[y] w3[z] a1 a2 c3",
    },
    {
        "label": "Case 10.3 - T2 aborts, T3 reads from T2 then commits",
        "num_txns": 3,
        "transactions": ["T1: w1[x] c1", "T2: r2[x] w2[y] a2", "T3: r3[y] w3[z] c3"],
        "history": "w1[x] c1 r2[x] w2[y] r3[y] w3[z] a2 c3",
    },
    # --- 11. INC/DEC operations ---
    {
        "label": "Case 11.1 - INC/DEC read-write conflicts",
        "num_txns": 3,
        "transactions": ["T1: r1[x] inc1[x] dec1[y] c1", "T2: inc2[x] r2[y] c2", "T3: r3[x] dec3[z] c3"],
        "history": "r1[x] inc2[x] inc1[x] r2[y] r3[x] dec1[y] dec3[z] c1 c2 c3",
    },
    {
        "label": "Case 11.2 - INC/DEC acyclic",
        "num_txns": 3,
        "transactions": ["T1: inc1[x] dec1[y] c1", "T2: r2[x] inc2[y] c2", "T3: r3[y] dec3[x] c3"],
        "history": "inc1[x] r2[x] inc2[y] r3[y] dec3[x] dec1[y] c1 c2 c3",
    },
    {
        "label": "Case 11.3 - INC/DEC cycle (non-serializable)",
        "num_txns": 3,
        "transactions": ["T1: inc1[x] dec1[y] c1", "T2: inc2[y] dec2[z] c2", "T3: inc3[z] dec3[x] c3"],
        "history": "inc1[x] inc2[y] inc3[z] dec3[x] dec1[y] dec2[z] c1 c2 c3",
    },
]


def print_analysis_results(results):
    """Print the analysis results in a formatted way."""
    print("\n" + "="*60)
    print("SCHEDULE ANALYSIS RESULTS")
    print("="*60)
    
    # Conflict-Serializability
    sr_result = results['conflict_serializable']
    print(f"\n[Conflict-Serializable (SR)]")
    print(f"  Result: {'YES' if sr_result['is_serializable'] else 'NO'}")
    if sr_result['serial_order']:
        print(f"  Serial Order: {sr_result['serial_order']}")
    print(f"  Explanation: {sr_result['explanation']}")
    
    # Recoverability
    rc_result = results['recoverable']
    print(f"\n[Recoverable (RC)]")
    print(f"  Result: {'YES' if rc_result['is_recoverable'] else 'NO'}")
    print(f"  Explanation: {rc_result['explanation']}")
    
    # ACA
    aca_result = results['aca']
    print(f"\n[Avoids Cascading Aborts (ACA)]")
    print(f"  Result: {'YES' if aca_result['avoids_cascading_aborts'] else 'NO'}")
    print(f"  Explanation: {aca_result['explanation']}")
    
    # Strict
    strict_result = results['strict']
    print(f"\n[Strict (ST)]")
    print(f"  Result: {'YES' if strict_result['is_strict'] else 'NO'}")
    print(f"  Explanation: {strict_result['explanation']}")
    
    # Rigorous
    rigorous_result = results['rigorous']
    print(f"\n[Rigorous]")
    print(f"  Result: {'YES' if rigorous_result['is_rigorous'] else 'NO'}")
    print(f"  Explanation: {rigorous_result['explanation']}")
    
    print("\n" + "="*60 + "\n")


def run_test_case(tc, graph_filename=None):
    """
    Run analysis for one test case (from TEST_CASES).
    Parses transactions and history, runs scheduler, prints results, saves precedence graph.
    """
    schedule = Parser.parse_schedule(tc["history"])
    scheduler = Scheduler(schedule)
    results = scheduler.analyze()
    print_analysis_results(results)

    base = graph_filename or "precedence_graph"
    pg = scheduler.get_precedence_graph()
    hd = HistoryDiagram(schedule)

    print()
    pg.print_graph()
    print("\n--- History diagram (terminal) ---")
    hd.print_ascii()
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
    print(f"\nEnter {num_txns} transaction sequence(s) in format: T1: r1[x] w1[x] c1")
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
                print("  Please enter in format: T1: r1[x] w1[x] c1")

    print(f"\nEnter the history (schedule) in one line:")
    print("Example: r1[x] w1[x] r2[y] w2[y] c1 c2")
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

    pg = scheduler.get_precedence_graph()
    hd = HistoryDiagram(schedule)
    print()
    pg.print_graph()
    print("\n--- History diagram (terminal) ---")
    hd.print_ascii()
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
            for i, tc in enumerate(TEST_CASES):
                print("\n" + "#"*60)
                print(f"Running: {tc['label']}")
                print("#"*60)
                run_test_case(tc, graph_filename="precedence_graph_case_{}".format(i + 1))
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
            print("  2 - Automatic (run a test case from the built-in list)")
            mode_input = input("Choice (1, 2, or q to quit): ").strip().lower()
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
            else:
                print("Invalid choice. Enter 1, 2, or q.\n")
        except KeyboardInterrupt:
            print("\n\nExiting program. Goodbye!")
            break
        except Exception as e:
            print(f"\nUnexpected error: {e}\n")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    main()
