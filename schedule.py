"""
Schedule class to represent a history/schedule of operations.
A schedule is a sequence of operations from multiple transactions.
"""

from operation import Operation

class Schedule:
    """Represents a schedule (history) of operations."""
    
    def __init__(self):
        """Initialize an empty schedule."""
        self.operations = []  # List of Operation objects in execution order
        self.transactions = {}  # Dictionary mapping transaction_id -> Transaction
    
    def add_operation(self, operation):
        """
        Add an operation to the schedule.
        
        Args:
            operation: Operation object to add
        """
        self.operations.append(operation)
        
        # Update transaction
        tid = operation.transaction_id
        if tid not in self.transactions:
            from transaction import Transaction
            self.transactions[tid] = Transaction(tid)
        self.transactions[tid].add_operation(operation)
    
    def get_transaction(self, transaction_id):
        """Get a transaction by its ID."""
        return self.transactions.get(transaction_id)
    
    def get_all_transactions(self):
        """Get all transactions in the schedule."""
        return list(self.transactions.values())
    
    def get_committed_transactions(self):
        """Get all committed transactions."""
        return [t for t in self.transactions.values() if t.is_committed()]
    
    def get_aborted_transactions(self):
        """Get all aborted transactions."""
        return [t for t in self.transactions.values() if t.is_aborted()]
    
    def get_active_transactions(self):
        """Get all active transactions."""
        return [t for t in self.transactions.values() if t.is_active()]
    
    def __str__(self):
        """String representation of the schedule."""
        return ' '.join(str(op) for op in self.operations)
    
    def __repr__(self):
        return self.__str__()
