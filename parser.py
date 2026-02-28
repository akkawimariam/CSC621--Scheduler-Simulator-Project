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
        Example: "T1: start1 r1[x] w1[x] c1"
        Transaction must begin with START(Ti) and end with COMMIT(Ti) or ABORT(Ti).
        """
        from transaction import Transaction

        match = re.match(r'^T(\d+):\s*(.+)$', transaction_string.strip())
        if not match:
            raise ValueError(f"Invalid transaction format: {transaction_string}")

        tid = int(match.group(1))
        operations_str = match.group(2)

        if not operations_str.strip():
            raise ValueError(f"Transaction T{tid}: no operations given. Use e.g. T{tid}: start{tid} r{tid}[x] w{tid}[x] c{tid}")

        transaction = Transaction(tid)
        op_strings = operations_str.split()
        for op_str in op_strings:
            operation = Parser.parse_operation(op_str)
            transaction.add_operation(operation)

        Parser._validate_transaction_operations(transaction.operations, tid, "Transaction")
        return transaction

    @staticmethod
    def _validate_transaction_operations(operations, tid, context="Transaction"):
        """
        Validate well-formedness: transaction must begin with START, end with exactly one
        COMMIT or ABORT, and contain only valid operations in between.
        Raises ValueError with a clear message if not.
        """
        if not operations:
            raise ValueError(f"{context} T{tid}: transaction has no operations.")
        first = operations[0]
        if not first.is_start() or first.transaction_id != tid:
            raise ValueError(
                f"{context} T{tid}: must begin with START (e.g. start{tid}). "
                f"First operation is {first}."
            )
        last = operations[-1]
        if not (last.is_commit() or last.is_abort()) or last.transaction_id != tid:
            raise ValueError(
                f"{context} T{tid}: must end with COMMIT or ABORT (e.g. c{tid} or a{tid}). "
                f"Last operation is {last}."
            )
        # Exactly one COMMIT or ABORT, and it must be the last operation (no commit/abort in middle)
        mid_ops = operations[1:-1]
        for op in mid_ops:
            if op.is_commit() or op.is_abort():
                raise ValueError(
                    f"{context} T{tid}: must end with exactly one COMMIT or ABORT. "
                    f"Found {op} in the middle of the transaction."
                )

    @staticmethod
    def parse_schedule(schedule_string):
        """
        Parse a schedule string (history).
        Example: "start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2"
        Each transaction must begin with START(Ti) and end with COMMIT(Ti) or ABORT(Ti).
        """
        from schedule import Schedule

        schedule = Schedule()
        op_strings = schedule_string.strip().split()
        if not op_strings:
            raise ValueError("Schedule (history) cannot be empty.")

        for op_str in op_strings:
            operation = Parser.parse_operation(op_str)
            schedule.add_operation(operation)

        # Group each transaction's operations by first appearance order (schedule order)
        by_tid = {}
        for op in schedule.operations:
            tid = op.transaction_id
            if tid not in by_tid:
                by_tid[tid] = []
            by_tid[tid].append(op)

        for tid, ops in by_tid.items():
            first_op = ops[0]
            last_op = ops[-1]
            if not first_op.is_start() or first_op.transaction_id != tid:
                raise ValueError(
                    f"Schedule: transaction T{tid} must begin with START (e.g. start{tid}). "
                    f"First operation of T{tid} in schedule is {first_op}."
                )
            if not (last_op.is_commit() or last_op.is_abort()) or last_op.transaction_id != tid:
                raise ValueError(
                    f"Schedule: transaction T{tid} must end with COMMIT or ABORT (e.g. c{tid} or a{tid}). "
                    f"Last operation of T{tid} in schedule is {last_op}."
                )
            # Exactly one COMMIT or ABORT per transaction, at the end
            for op in ops[1:-1]:
                if op.is_commit() or op.is_abort():
                    raise ValueError(
                        f"Schedule: transaction T{tid} must end with exactly one COMMIT or ABORT. "
                        f"Found {op} in the middle of T{tid}."
                    )

        return schedule