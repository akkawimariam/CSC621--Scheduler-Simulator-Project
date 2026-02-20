"""
Parser module to parse transaction sequences and schedules from user input.
Supports format: T1: r1[x] w1[x] c1
"""

import re
from operation import Operation

class Parser:
    """Parser for transaction sequences and schedules."""
    
    @staticmethod
    def parse_operation(op_string):
        """
        Parse a single operation string.
        
        Examples:
            r1[x] -> Operation(READ, 1, 'x')
            w2[y] -> Operation(WRITE, 2, 'y')
            c1 -> Operation(COMMIT, 1, None)
            inc3[z] -> Operation(INCREMENT, 3, 'z')
            dec4[x] -> Operation(DECREMENT, 4, 'x')
        
        Args:
            op_string: String representation of operation
        
        Returns:
            Operation object
        """
        op_string = op_string.strip()
        
        # Match commit: c1, c2, etc.
        commit_match = re.match(r'^c(\d+)$', op_string)
        if commit_match:
            tid = int(commit_match.group(1))
            return Operation(Operation.COMMIT, tid)
        
        # Match abort: a1, a2, etc.
        abort_match = re.match(r'^a(\d+)$', op_string)
        if abort_match:
            tid = int(abort_match.group(1))
            return Operation(Operation.ABORT, tid)
        
        # Match start: start1, start2, etc.
        start_match = re.match(r'^start(\d+)$', op_string, re.IGNORECASE)
        if start_match:
            tid = int(start_match.group(1))
            return Operation(Operation.START, tid)
        
        # Match operations with data items: r1[x], w2[y], inc3[z], dec4[x]
        op_match = re.match(r'^(r|w|inc|dec)(\d+)\[([a-zA-Z0-9_]+)\]$', op_string, re.IGNORECASE)
        if op_match:
            op_type = op_match.group(1).lower()
            tid = int(op_match.group(2))
            data_item = op_match.group(3)
            
            # Map operation types
            if op_type == 'r':
                return Operation(Operation.READ, tid, data_item)
            elif op_type == 'w':
                return Operation(Operation.WRITE, tid, data_item)
            elif op_type == 'inc':
                return Operation(Operation.INCREMENT, tid, data_item)
            elif op_type == 'dec':
                return Operation(Operation.DECREMENT, tid, data_item)
        
        raise ValueError(f"Invalid operation format: {op_string}")
    
    @staticmethod
    def parse_transaction(transaction_string):
        """
        Parse a transaction string.
        
        Example: "T1: r1[x] w1[x] c1"
        
        Args:
            transaction_string: String representation of transaction
        
        Returns:
            Transaction object
        """
        from transaction import Transaction
        
        # Match format: T1: r1[x] w1[x] c1
        match = re.match(r'^T(\d+):\s*(.+)$', transaction_string.strip())
        if not match:
            raise ValueError(f"Invalid transaction format: {transaction_string}")
        
        tid = int(match.group(1))
        operations_str = match.group(2)
        
        # Create transaction
        transaction = Transaction(tid)
        
        # Parse operations
        op_strings = operations_str.split()
        for op_str in op_strings:
            operation = Parser.parse_operation(op_str)
            transaction.add_operation(operation)
        
        return transaction
    
    @staticmethod
    def parse_schedule(schedule_string):
        """
        Parse a schedule string (history).
        
        Example: "r1[x] w1[x] r2[y] w2[y] c1 c2"
        
        Args:
            schedule_string: String representation of schedule
        
        Returns:
            Schedule object
        """
        from schedule import Schedule
        
        schedule = Schedule()
        
        # Split by spaces and parse each operation
        op_strings = schedule_string.strip().split()
        for op_str in op_strings:
            operation = Parser.parse_operation(op_str)
            schedule.add_operation(operation)
        
        return schedule
