"""
Scheduler class to analyze schedules for correctness properties.
Analyzes: Conflict-Serializability, Recoverability, ACA, Strict, Rigorous.
Returns step-by-step explanations for each property.
"""

from schedule import Schedule
from precedence_graph import PrecedenceGraph


class Scheduler:
    """Analyzes schedules for various correctness properties."""

    def __init__(self, schedule):
        self.schedule = schedule
        self._precedence_graph = None
        self._commit_index = None
        self._abort_index = None
        self._read_from_cache = None

    def get_precedence_graph(self):
        if self._precedence_graph is None:
            self._precedence_graph = PrecedenceGraph(self.schedule)
        return self._precedence_graph

    def _get_commit_abort_indices(self):
        """Return (commit_index, abort_index). Cached after first call."""
        if self._commit_index is not None and self._abort_index is not None:
            return self._commit_index, self._abort_index
        commit_index = {}
        abort_index = {}
        for idx, op in enumerate(self.schedule.operations):
            tid = op.transaction_id
            if op.is_commit() and tid not in commit_index:
                commit_index[tid] = idx
            if op.is_abort() and tid not in abort_index:
                abort_index[tid] = idx
        self._commit_index = commit_index
        self._abort_index = abort_index
        return commit_index, abort_index

    def _aborted_before(self, tid, p, abort_index):
        return abort_index.get(tid) is not None and abort_index[tid] < p

    def _read_from_pairs(self):
        """Compute read-from pairs. Result cached for reuse by RC and ACA."""
        if self._read_from_cache is not None:
            return self._read_from_cache
        commit_index, abort_index = self._get_commit_abort_indices()
        ops = self.schedule.operations
        read_from = []
        for p_ri, op_ri in enumerate(ops):
            if not op_ri.is_read() or op_ri.data_item is None:
                continue
            x = op_ri.data_item
            ti = op_ri.transaction_id
            writers_before = [
                (idx, op.transaction_id)
                for idx, op in enumerate(ops)
                if idx < p_ri and op.data_item == x and op.is_write()
            ]
            if not writers_before:
                continue
            visible_writer = None
            for idx, tj in reversed(writers_before):
                if self._aborted_before(tj, p_ri, abort_index):
                    continue
                visible_writer = tj
                break
            if visible_writer is not None:
                read_from.append((ti, visible_writer, x, p_ri))
        self._read_from_cache = read_from
        return read_from

    def is_conflict_serializable(self):
        """
        Returns:
            tuple: (is_serializable: bool, serial_order: list, explanation: str, steps: list)
        """
        pg = self.get_precedence_graph()
        steps = []
        steps.append("Build precedence graph from schedule (nodes = transactions, edge Ti→Tj if some op of Ti precedes and conflicts with an op of Tj).")
        # In is_conflict_serializable, for building steps:
        edge_str = "; ".join(f"T{u}→T{v}" for (u, v) in sorted(pg.edges)) if pg.edges else "none"
        steps.append(f"Edges (conflict order): {edge_str}.")

        if pg.has_cycle():
            steps.append("Cycle detected in the graph → schedule is not conflict-serializable.")
            return False, [], "The precedence graph contains a cycle, so the schedule is not conflict-serializable.", steps
        serial_order = pg.topological_order()
        order_str = ", ".join(f"T{k}" for k in serial_order) if serial_order else "N/A"
        steps.append(f"No cycle. Topological order gives equivalent serial order: {order_str}.")
        return True, serial_order, f"The precedence graph is acyclic. Equivalent serial order(s): {order_str}.", steps

    def is_recoverable(self):
        """
        Returns:
            tuple: (is_recoverable: bool, explanation: str, steps: list)
        """
        commit_index, _ = self._get_commit_abort_indices()
        read_from = self._read_from_pairs()
        steps = []
        if not read_from:
            steps.append("Read-from pairs (single pass over schedule): none.")
            steps.append("Rule: For each (reader Ti, writer Tj), if Ti commits then Tj must commit and cj < ci.")
            steps.append("No read-from pairs to check.")
            steps.append("Conclusion: Schedule is recoverable.")
            return True, "No read-from dependency between transactions; schedule is recoverable.", steps
        rf_desc = "; ".join(f"T{ti} reads {x} from T{tj} at index {p}" for (ti, tj, x, p) in read_from)
        steps.append(f"Read-from pairs: {rf_desc}.")
        steps.append("Rule: For each (reader Ti, writer Tj), if Ti commits then Tj must commit and cj < ci.")
        violations = []
        for (ti, tj, x, p_ri) in read_from:
            ci_idx = commit_index.get(ti)
            cj_idx = commit_index.get(tj)
            if ci_idx is not None:
                if cj_idx is None:
                    violations.append((ti, tj, None, None, f"T{tj} never commits"))
                    steps.append(f"Pair (T{ti}, T{tj}): T{ti} commits at {ci_idx}, T{tj} never commits. Violation.")
                elif cj_idx >= ci_idx:
                    violations.append((ti, tj, cj_idx, ci_idx, "cj >= ci"))
                    steps.append(f"Pair (T{ti}, T{tj}): c{tj}={cj_idx}, c{ti}={ci_idx}. Need cj < ci? No. Violation.")
                else:
                    steps.append(f"Pair (T{ti}, T{tj}): c{tj}={cj_idx}, c{ti}={ci_idx}. Need cj < ci? Yes. Holds.")
            else:
                steps.append(f"Pair (T{ti}, T{tj}): T{ti} never commits. No RC requirement. OK.")

        if violations:
            expl = "Not recoverable: " + "; ".join(
                f"T{v[0]} reads from T{v[1]} but " + (v[4] if v[2] is None else f"c{v[1]} ({v[2]}) does not precede c{v[0]} ({v[3]})")
                for v in violations)
            steps.append("Conclusion: Schedule is not recoverable.")
            return False, expl, steps
        steps.append("Conclusion: Schedule is recoverable (every reader commits after its writers).")
        return True, "Every transaction that reads from another commits only after the writer commits (cj < ci).", steps

    def avoids_cascading_aborts(self):
        """
        Returns:
            tuple: (avoids_cascading_aborts: bool, explanation: str, steps: list)
        """
        commit_index, _ = self._get_commit_abort_indices()
        read_from = self._read_from_pairs()
        steps = []
        if not read_from:
            steps.append("Read-from pairs: none.")
            steps.append("Rule: For each read-from (Ti, Tj, x, p), we need cj < p (writer committed before the read).")
            steps.append("No pairs to check.")
            steps.append("Conclusion: Schedule avoids cascading aborts.")
            return True, "No read-from dependency; ACA holds trivially.", steps
        rf_desc = "; ".join(f"T{ti} reads {x} from T{tj} at index {p}" for (ti, tj, x, p) in read_from)
        steps.append(f"Read-from pairs: {rf_desc}.")
        steps.append("Rule: For each read-from (Ti, Tj, x, p), we need cj < p (writer committed before the read).")
        violations = []
        for (ti, tj, x, p_ri) in read_from:
            cj_idx = commit_index.get(tj)
            if cj_idx is None:
                violations.append((ti, tj, p_ri))
                steps.append(f"Pair (T{ti}, T{tj}) at read index {p_ri}: T{tj} never commits. Violation.")
            elif cj_idx >= p_ri:
                violations.append((ti, tj, p_ri))
                steps.append(f"Pair (T{ti}, T{tj}) at read index {p_ri}: c{tj}={cj_idx}. Need cj < p? No. Violation.")
            else:
                steps.append(f"Pair (T{ti}, T{tj}) at read index {p_ri}: c{tj}={cj_idx}. Need cj < p? Yes. Holds.")
        if violations:
            expl = "Does not avoid cascading aborts: " + "; ".join(
                f"T{v[0]} reads from T{v[1]} at index {v[2]} but c{v[1]} not before read" for v in violations)
            steps.append("Conclusion: Schedule does not avoid cascading aborts.")
            return False, expl, steps
        steps.append("Conclusion: Schedule avoids cascading aborts (every read is from a committed writer).")
        return True, "Every read is from a transaction that had already committed (cj < ri[x]).", steps

    def is_strict(self):
        """Returns (is_strict: bool, explanation: str, steps: list). Implement as needed."""
        # TODO: replace with real implementation; then add steps like RC/ACA
        steps = ["Strict: No transaction reads or writes x until the transaction that last wrote x has committed or aborted.",
                 "Not yet implemented."]
        return False, "Not yet implemented", steps

    def is_rigorous(self):
        """Returns (is_rigorous: bool, explanation: str, steps: list). Implement as needed."""
        # TODO: replace with real implementation; then add steps
        steps = ["Rigorous: Strict + no write on x until all who last read x have committed or aborted.",
                 "Not yet implemented."]
        return False, "Not yet implemented", steps

    def analyze(self):
        """Perform complete analysis. Each result dict may include 'steps' for step-by-step explanation."""
        results = {}

        is_sr, serial_order, sr_explanation, sr_steps = self.is_conflict_serializable()
        results['conflict_serializable'] = {
            'is_serializable': is_sr,
            'serial_order': serial_order,
            'explanation': sr_explanation,
            'steps': sr_steps,
        }

        is_rc, rc_explanation, rc_steps = self.is_recoverable()
        results['recoverable'] = {
            'is_recoverable': is_rc,
            'explanation': rc_explanation,
            'steps': rc_steps,
        }

        is_aca, aca_explanation, aca_steps = self.avoids_cascading_aborts()
        results['aca'] = {
            'avoids_cascading_aborts': is_aca,
            'explanation': aca_explanation,
            'steps': aca_steps,
        }

        is_strict, strict_explanation, strict_steps = self.is_strict()
        results['strict'] = {
            'is_strict': is_strict,
            'explanation': strict_explanation,
            'steps': strict_steps,
        }

        is_rigorous, rigorous_explanation, rigorous_steps = self.is_rigorous()
        results['rigorous'] = {
            'is_rigorous': is_rigorous,
            'explanation': rigorous_explanation,
            'steps': rigorous_steps,
        }

        return results