"""
Main entry point for the Transaction Scheduler Simulator.
Handles user interaction and schedule analysis.
"""

from scheduler import Scheduler
from parser import Parser

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

def main():
    """Main function to handle user interaction."""
    print("="*60)
    print("Transaction Scheduler Simulator")
    print("="*60)
    print("\nEnter 'quit' or 'exit' to terminate the program.\n")
    
    while True:
        try:
            # Get number of transactions
            num_txns_input = input("Enter the number of transactions: ").strip()
            
            if num_txns_input.lower() in ['quit', 'exit', 'q']:
                print("Exiting program. Goodbye!")
                break
            
            try:
                num_txns = int(num_txns_input)
                if num_txns < 1:
                    print("Error: Number of transactions must be at least 1.\n")
                    continue
            except ValueError:
                print("Error: Please enter a valid number.\n")
                continue
            
            # Get transaction sequences
            transactions = []
            print(f"\nEnter {num_txns} transaction sequence(s) in format: T1: r1[x] w1[x] c1")
            for i in range(num_txns):
                while True:
                    txn_input = input(f"Transaction {i+1}: ").strip()
                    
                    if txn_input.lower() in ['quit', 'exit', 'q']:
                        print("Exiting program. Goodbye!")
                        return
                    
                    try:
                        transaction = Parser.parse_transaction(txn_input)
                        transactions.append(transaction)
                        print(f"  Parsed: {transaction}")
                        break
                    except ValueError as e:
                        print(f"  Error: {e}")
                        print("  Please enter in format: T1: r1[x] w1[x] c1")
            
            # Get history/schedule
            print(f"\nEnter the history (schedule) in one line:")
            print("Example: r1[x] w1[x] r2[y] w2[y] c1 c2")
            while True:
                history_input = input("History: ").strip()
                
                if history_input.lower() in ['quit', 'exit', 'q']:
                    print("Exiting program. Goodbye!")
                    return
                
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
            
            # Analyze the schedule
            scheduler = Scheduler(schedule)
            results = scheduler.analyze()
            
            # Print results
            print_analysis_results(results)
            
        except KeyboardInterrupt:
            print("\n\nExiting program. Goodbye!")
            break
        except Exception as e:
            print(f"\nUnexpected error: {e}\n")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
