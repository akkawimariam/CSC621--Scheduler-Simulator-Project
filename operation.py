"""
Operation class to represent individual database operations.
Supports: READ, WRITE, INCREMENT, DECREMENT, COMMIT, ABORT
"""

class Operation:
    """Represents a single database operation."""
    
    # Operation types
    READ = 'r'
    WRITE = 'w'
    INCREMENT = 'inc'
    DECREMENT = 'dec'
    COMMIT = 'c'
    ABORT = 'a'
    START = 'start'
    
    def __init__(self, op_type, transaction_id, data_item=None):
        """
        Initialize an operation.
        
        Args:
            op_type: Type of operation (r, w, inc, dec, c, a, start)
            transaction_id: ID of the transaction (e.g., 1 for T1)
            data_item: Data item name (e.g., 'x', 'y') - None for commit/abort/start
        """
        self.op_type = op_type.lower()
        self.transaction_id = transaction_id
        self.data_item = data_item
    
    def is_read(self):
        """Check if operation is a read."""
        return self.op_type == Operation.READ
    
    def is_write(self):
        """Check if operation is a write (including increment/decrement)."""
        return self.op_type in [Operation.WRITE, Operation.INCREMENT, Operation.DECREMENT]
    
    def is_commit(self):
        """Check if operation is a commit."""
        return self.op_type == Operation.COMMIT
    
    def is_abort(self):
        """Check if operation is an abort."""
        return self.op_type == Operation.ABORT
    
    def is_start(self):
        """Check if operation is a start."""
        return self.op_type == Operation.START
    
    def conflicts_with(self, other):
        """
        Check if this operation conflicts with another operation.
        Two operations conflict if they operate on the same data item
        and at least one is a write.
        """
        if self.data_item is None or other.data_item is None:
            return False
        if self.data_item != other.data_item:
            return False
        return self.is_write() or other.is_write()
    
    def __str__(self):
        """String representation of the operation."""
        if self.op_type == Operation.COMMIT:
            return f"c{self.transaction_id}"
        elif self.op_type == Operation.ABORT:
            return f"a{self.transaction_id}"
        elif self.op_type == Operation.START:
            return f"start{self.transaction_id}"
        elif self.data_item:
            return f"{self.op_type}{self.transaction_id}[{self.data_item}]"
        else:
            return f"{self.op_type}{self.transaction_id}"
    
    def __repr__(self):
        return self.__str__()
    
    def __eq__(self, other):
        """Check equality of two operations."""
        if not isinstance(other, Operation):
            return False
        return (self.op_type == other.op_type and
                self.transaction_id == other.transaction_id and
                self.data_item == other.data_item)
