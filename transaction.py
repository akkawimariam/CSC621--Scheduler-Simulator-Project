"""
Transaction class to represent a database transaction.
A transaction consists of a sequence of operations.
"""

from operation import Operation

class Transaction:
    """Represents a database transaction with its operations."""
    
    def __init__(self, transaction_id):
        """
        Initialize a transaction.
        
        Args:
            transaction_id: ID of the transaction (e.g., 1 for T1)
        """
        self.transaction_id = transaction_id
        self.operations = []  # List of Operation objects
    
    def add_operation(self, operation):
        """Add an operation to this transaction."""
        if operation.transaction_id != self.transaction_id:
            raise ValueError(f"Operation transaction ID {operation.transaction_id} "
                           f"does not match transaction ID {self.transaction_id}")
        self.operations.append(operation)
    
    def is_committed(self):
        """Check if transaction has a commit operation."""
        return any(op.is_commit() for op in self.operations)
    
    def is_aborted(self):
        """Check if transaction has an abort operation."""
        return any(op.is_abort() for op in self.operations)
    
    def is_active(self):
        """Check if transaction is active (not committed or aborted)."""
        return not (self.is_committed() or self.is_aborted())
    
    def get_committed_operations(self):
        """Get all operations if transaction is committed, empty list otherwise."""
        if self.is_committed():
            return self.operations
        return []
    
    def __str__(self):
        """String representation of the transaction."""
        ops_str = ' '.join(str(op) for op in self.operations)
        return f"T{self.transaction_id}: {ops_str}"
    
    def __repr__(self):
        return self.__str__()
