"""
Scheduler class to analyze schedules for correctness properties.
Analyzes: Conflict-Serializability, Recoverability, ACA, Strict, Rigorous
"""

from schedule import Schedule
from precedence_graph import PrecedenceGraph

class Scheduler:
    """Analyzes schedules for various correctness properties."""
    
    def __init__(self, schedule):
        """
        Initialize the scheduler with a schedule.
        
        Args:
            schedule: Schedule object to analyze
        """
        self.schedule = schedule
        self._precedence_graph = None

    def get_precedence_graph(self):
        """Build and return the precedence graph for the schedule (cached)."""
        if self._precedence_graph is None:
            self._precedence_graph = PrecedenceGraph(self.schedule)
        return self._precedence_graph
    
    def is_conflict_serializable(self):
        """
        Check if the schedule is conflict-serializable.
        Uses the precedence graph: acyclic iff conflict-serializable.
        
        Returns:
            tuple: (is_serializable: bool, serial_order: list, explanation: str)
        """
        pg = self.get_precedence_graph()
        if pg.has_cycle():
            return False, [], (
                "The precedence graph contains a cycle, so the schedule is not conflict-serializable."
            )
        serial_order = pg.topological_order()
        order_str = ", ".join(f"T{k}" for k in serial_order) if serial_order else "N/A"
        return True, serial_order, (
            f"The precedence graph is acyclic. Equivalent serial order(s): {order_str}."
        )
    
    def _get_commit_abort_indices(self):
        """Return (commit_index, abort_index): tid -> first index of commit/abort in schedule, or None."""
        commit_index = {}
        abort_index = {}
        for idx, op in enumerate(self.schedule.operations):
            tid = op.transaction_id
            if op.is_commit() and tid not in commit_index:
                commit_index[tid] = idx
            if op.is_abort() and tid not in abort_index:
                abort_index[tid] = idx
        return commit_index, abort_index

    def _aborted_before(self, tid, p, abort_index):
        """True iff transaction tid has aborted before position p in the schedule."""
        return abort_index.get(tid) is not None and abort_index[tid] < p

    def _read_from_pairs(self):
        """
        Compute read-from pairs (Chapter 2): Ti reads x from Tj.
        Returns list of (reader_tid, writer_tid, data_item, read_index).
        """
        commit_index, abort_index = self._get_commit_abort_indices()
        ops = self.schedule.operations
        read_from = []

        for p_ri, op_ri in enumerate(ops):
            if not op_ri.is_read() or op_ri.data_item is None:
                continue
            x = op_ri.data_item
            ti = op_ri.transaction_id

            # All writes on x strictly before this read (index, writer_tid)
            writers_before = [
                (idx, op.transaction_id)
                for idx, op in enumerate(ops)
                if idx < p_ri and op.data_item == x and op.is_write()
            ]
            if not writers_before:
                continue

            # Visible writer: last write on x before p_ri whose writer did not abort before p_ri,
            # and any write on x between that and ri[x] is from a transaction that aborted before p_ri.
            # Equivalent: walk backwards; first writer that did not abort before p_ri is the one Ti reads from.
            visible_writer = None
            for idx, tj in reversed(writers_before):
                if self._aborted_before(tj, p_ri, abort_index):
                    continue
                visible_writer = tj
                break

            if visible_writer is not None:
                read_from.append((ti, visible_writer, x, p_ri))

        return read_from

    def is_recoverable(self):
        """
        Check if the schedule is recoverable (RC).
        Chapter 2: H is RECOVERABLE if whenever Ti reads from Tj, then cj < ci.
        """
        commit_index, abort_index = self._get_commit_abort_indices()
        read_from = self._read_from_pairs()
        violations = []

        for (ti, tj, x, p_ri) in read_from:
            ci_idx = commit_index.get(ti)
            cj_idx = commit_index.get(tj)
            # Ti reads from Tj. For RC we need cj < ci when both commit.
            if ci_idx is not None:  # Ti commits
                if cj_idx is None:
                    violations.append(
                        f"T{ti} reads x from T{tj} but T{tj} never commits (T{ti} commits)."
                    )
                elif cj_idx >= ci_idx:
                    violations.append(
                        f"T{ti} reads from T{tj} but c{tj} (index {cj_idx}) does not precede c{ti} (index {ci_idx})."
                    )

        if violations:
            return False, "Not recoverable: " + "; ".join(violations)
        if not read_from:
            return True, "No read-from dependency between transactions; schedule is recoverable."
        return True, "Every transaction that reads from another commits only after the writer commits (cj < ci)."

    def avoids_cascading_aborts(self):
        """
        Check if the schedule avoids cascading aborts (ACA).
        Chapter 2: H is ACA if whenever Ti reads x from Tj, then cj < ri[x].
        """
        commit_index, abort_index = self._get_commit_abort_indices()
        read_from = self._read_from_pairs()
        violations = []

        for (ti, tj, x, p_ri) in read_from:
            cj_idx = commit_index.get(tj)
            if cj_idx is None:
                violations.append(
                    f"T{ti} reads x from T{tj} but T{tj} never commits."
                )
            elif cj_idx >= p_ri:
                violations.append(
                    f"T{ti} reads x from T{tj} at index {p_ri} but c{tj} (index {cj_idx}) is not before the read."
                )

        if violations:
            return False, "Does not avoid cascading aborts: " + "; ".join(violations)
        if not read_from:
            return True, "No read-from dependency; ACA holds trivially."
        return True, "Every read is from a transaction that had already committed (cj < ri[x])."
    
    def is_strict(self):
        """
        Check if the schedule is strict (ST).
        
        A schedule is strict if no transaction reads or writes a data item
        until the transaction that last wrote that item has committed or aborted.
        
        Returns:
            tuple: (is_strict: bool, explanation: str)
        """
        # TODO: Implement strictness check
        return False, "Not yet implemented"
    
    def is_rigorous(self):
        """
        Check if the schedule is rigorous.
        
        A schedule is rigorous if it is strict and additionally,
        no transaction writes a data item until all transactions that
        previously read that item have committed or aborted.
        
        Returns:
            tuple: (is_rigorous: bool, explanation: str)
        """
        # TODO: Implement rigorousness check
        return False, "Not yet implemented"
    
    def analyze(self):
        """
        Perform complete analysis of the schedule.
        
        Returns:
            dict: Dictionary containing all analysis results
        """
        results = {}
        
        # Conflict-Serializability
        is_sr, serial_order, sr_explanation = self.is_conflict_serializable()
        results['conflict_serializable'] = {
            'is_serializable': is_sr,
            'serial_order': serial_order,
            'explanation': sr_explanation
        }
        
        # Recoverability
        is_rc, rc_explanation = self.is_recoverable()
        results['recoverable'] = {
            'is_recoverable': is_rc,
            'explanation': rc_explanation
        }
        
        # ACA
        is_aca, aca_explanation = self.avoids_cascading_aborts()
        results['aca'] = {
            'avoids_cascading_aborts': is_aca,
            'explanation': aca_explanation
        }
        
        # Strict
        is_strict, strict_explanation = self.is_strict()
        results['strict'] = {
            'is_strict': is_strict,
            'explanation': strict_explanation
        }
        
        # Rigorous
        is_rigorous, rigorous_explanation = self.is_rigorous()
        results['rigorous'] = {
            'is_rigorous': is_rigorous,
            'explanation': rigorous_explanation
        }
        
        return results
