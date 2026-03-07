"""
Scheduler class to analyze schedules for correctness properties.
Analyzes: Conflict-Serializability, Recoverability, ACA, Strict, Rigorous.
Returns step-by-step explanations for each property.
"""

from collections import defaultdict, deque

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

    def _read_from_pairs(self):
        """
        Compute read-from pairs in O(n) single pass.
        For each read r_i[x] at p, the visible writer is the last write on x before p
        whose transaction has not aborted. Result cached for reuse by RC and ACA.
        """
        if self._read_from_cache is not None:
            return self._read_from_cache
        ops = self.schedule.operations
        # last_write_stack[x] = deque of (position, tid), most recent at left
        last_write_stack = defaultdict(deque)
        # written_by_tid[tid] = set of data items x that tid has written (for abort cleanup)
        written_by_tid = defaultdict(set)
        read_from = []
        for p, op in enumerate(ops):
            tid = op.transaction_id
            x = op.data_item
            if op.is_write():
                if x is not None:
                    last_write_stack[x].appendleft((p, tid))
                    written_by_tid[tid].add(x)
            elif op.is_abort():
                for item in written_by_tid[tid]:
                    while last_write_stack[item] and last_write_stack[item][0][1] == tid:
                        last_write_stack[item].popleft()
                written_by_tid[tid].clear()
            elif op.is_read() and x is not None:
                if last_write_stack[x]:
                    _, tj = last_write_stack[x][0]
                    if tid != tj:
                        read_from.append((tid, tj, x, p))
        self._read_from_cache = read_from
        return read_from

    def is_conflict_serializable(self):
        """
        Returns:
            tuple: (is_serializable: bool, serial_order: list, explanation: str, steps: list)
        """
        pg = self.get_precedence_graph()
        steps = []
        steps.append("Build precedence graph from schedule (nodes = transactions, edge Ti→Tj if some op of Ti precedes and conflicts with an op of Tj). Serialization theorem: the history is conflict-serializable iff this graph is acyclic (formally, the book defines the serialization graph over committed transactions only).")
        # In is_conflict_serializable, for building steps:
        edge_str = "; ".join(f"T{u}→T{v}" for (u, v) in sorted(pg.edges)) if pg.edges else "none"
        steps.append(f"Edges (conflict order): {edge_str}.")

        if pg.has_cycle():
            cycle_path = pg.get_cycle()
            if cycle_path:
                cycle_str = " → ".join(f"T{k}" for k in cycle_path)
                steps.append(f"Cycle detected: {cycle_str} (schedule is not conflict-serializable).")
            else:
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
            steps.append(f"Summary: {len(read_from)} read-from pair(s) checked; {len(violations)} violation(s) (writer did not commit before reader).")
            steps.append("Conclusion: Schedule is not recoverable.")
            return False, expl, steps
        steps.append(f"Summary: {len(read_from)} read-from pair(s) checked; all satisfy cj < ci (writer commits before reader).")
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
            steps.append("Rule: For each read-from (Ti, Tj, x, p), we need cj < p (writer committed before the read; no dirty read).")
            steps.append("No pairs to check.")
            steps.append("Conclusion: Schedule avoids cascading aborts.")
            return True, "No read-from dependency; ACA holds trivially.", steps
        rf_desc = "; ".join(f"T{ti} reads {x} from T{tj} at index {p}" for (ti, tj, x, p) in read_from)
        steps.append(f"Read-from pairs: {rf_desc}.")
        steps.append("Rule: For each read-from (Ti, Tj, x, p), we need cj < p (writer committed before the read; no dirty read).")
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
            steps.append(f"Summary: {len(read_from)} read-from pair(s) checked; {len(violations)} violation(s) (read before writer committed).")
            steps.append("Conclusion: Schedule does not avoid cascading aborts.")
            return False, expl, steps
        steps.append(f"Summary: {len(read_from)} read-from pair(s) checked; all satisfy cj < p (no dirty read).")
        steps.append("Conclusion: Schedule avoids cascading aborts (every read is from a committed writer).")
        return True, "Every read is from a transaction that had already committed (cj < ri[x]).", steps

    def is_strict(self):
        """
        Check if the schedule is strict (ST).
        From the notes (Chapter 2):
        STRICT (ST) if whenever w_j[x] < o_i[x] (i != j), either a_j < o_i[x]
        or c_j < o_i[x]. In words: **no transaction reads or writes a data
        item until the *other* transaction that previously wrote it has
        committed or aborted.**

        We therefore only constrain operations of *different* transactions;
        a transaction may freely read/write its own uncommitted updates.

        Returns:
            tuple: (is_strict: bool, explanation: str, steps: list)
        """
        commit_index, abort_index = self._get_commit_abort_indices()
        ops = self.schedule.operations
        steps = []
        steps.append("Strict (ST): Whenever wj[x] < oi[x] for i != j, either aj < oi[x] or cj < oi[x] (i.e. no read or write on x until the transaction that previously wrote x has terminated by committing or aborting).")
        steps.append("Rule: For each read/write on x at position p by Ti, if the last writer of x is a different transaction Tj, then Tj must have committed or aborted before p.")

        last_write = {}  # data_item -> (position, tid) for the last write on x
        violations = []

        for p, op in enumerate(ops):
            if op.data_item is None:
                continue
            x = op.data_item
            if not (op.is_read() or op.is_write()):
                continue

            ti = op.transaction_id

            if x in last_write:
                idx_last, tj = last_write[x]
                if tj != ti:
                    cj = commit_index.get(tj)
                    aj = abort_index.get(tj)
                    if cj is not None and cj < p:
                        # Last writer is another transaction that has already committed before this access.
                        pass
                    elif aj is not None and aj < p:
                        # Last writer is another transaction that has already aborted before this access.
                        pass
                    else:
                        msg = (
                            f"At position {p} ({op}): last writer of {x} is T{tj} (at {idx_last}); "
                            f"T{tj} has not committed or aborted before this access by T{ti}. Violation."
                        )
                        violations.append((p, op, x, tj, idx_last, ti))
                        steps.append(msg)
            else:
                steps.append(f"At position {p} ({op}): first access to {x}. OK (no previous writer).")

            if op.is_write():
                last_write[x] = (p, op.transaction_id)

        if violations:
            expl = "Not strict: " + "; ".join(
                f"at position {v[0]} ({v[1]}), last writer T{v[3]} of {v[2]} "
                f"had not committed or aborted before T{v[5]}'s access"
                for v in violations
            )
            steps.append(f"Summary: {len(violations)} violation(s); schedule is not strict.")
            steps.append("Conclusion: Schedule is not strict.")
            return False, expl, steps

        steps.append("Summary: All read/write positions satisfy the rule (for every access by Ti, any previous writer Tj != Ti had already committed or aborted).")
        steps.append("Conclusion: Schedule is strict (no transaction reads or overwrites data written by an uncommitted *other* transaction).")
        return True, "No transaction reads or writes a data item written by another transaction before that writer has committed or aborted.", steps

    def is_rigorous(self):
        """
        Check if the schedule is rigorous. O(n) single pass.
        From the notes (Chapter 1):
        - Reads: like Strict — last writer of x must have committed or aborted before this read.
        - Writes: last accessor (read or write) of x must have committed or aborted before this write.

        Returns:
            tuple: (is_rigorous: bool, explanation: str, steps: list)
        """
        commit_index, abort_index = self._get_commit_abort_indices()
        ops = self.schedule.operations
        steps = []
        steps.append(
            "Rigorous: Strict plus, for every write w_i[x], all transactions that previously read or wrote x must have committed or aborted (in particular, delay Write(x) until all trans that previously Read(x) commit/abort)."
        )
        steps.append(
            "Rules (single pass):\n"
            "  - Reads r_i[x]: last writer of x (if another txn) must have committed or aborted before r_i[x].\n"
            "  - Writes w_i[x]: last accessor (read or write) of x (if another txn) must have committed or aborted before w_i[x]."
        )

        def committed_or_aborted_before(tid, p):
            cj = commit_index.get(tid)
            aj = abort_index.get(tid)
            return (cj is not None and cj < p) or (aj is not None and aj < p)

        violations = []
        last_write = {}   # data_item -> (position, tid)
        last_access = {}  # data_item -> (position, tid)

        for p, op in enumerate(ops):
            if op.data_item is None:
                continue
            x = op.data_item
            ti = op.transaction_id

            if not (op.is_read() or op.is_write()):
                continue

            if op.is_read():
                if x in last_write:
                    pos_last, tj = last_write[x]
                    if tj != ti and not committed_or_aborted_before(tj, p):
                        msg = (
                            f"At position {p} ({op}): last write on {x} by T{tj} at position {pos_last} has not "
                            f"committed or aborted before this read. Violation."
                        )
                        violations.append((p, op, x, tj, pos_last, ti))
                        steps.append(msg)
                else:
                    steps.append(f"At position {p} ({op}): first access to {x}. OK (no previous writer).")
                last_access[x] = (p, ti)
            else:
                # Write (or INC/DEC)
                if x in last_access:
                    pos_last, tj = last_access[x]
                    if tj != ti and not committed_or_aborted_before(tj, p):
                        kind = "write" if (x in last_write and last_write[x][0] == pos_last) else "read"
                        msg = (
                            f"At position {p} ({op}): previous {kind} on {x} by T{tj} at position {pos_last} has not "
                            f"committed or aborted before this write. Violation."
                        )
                        violations.append((p, op, x, tj, pos_last, ti))
                        steps.append(msg)
                last_write[x] = (p, ti)
                last_access[x] = (p, ti)

        if violations:
            expl = "Not rigorous: " + "; ".join(
                f"at position {v[0]} ({v[1]}), previous accessor T{v[3]} of {v[2]} "
                f"had not committed or aborted before T{v[5]}'s access"
                for v in violations
            )
            steps.append(f"Summary: {len(violations)} violation(s); schedule is not rigorous.")
            steps.append("Conclusion: Schedule is not rigorous.")
            return False, expl, steps

        steps.append(
            "Summary: All read/write positions satisfy the rules: reads see only committed/aborted writers, "
            "and writes occur only after all previous readers and writers on that item (from other transactions) have committed or aborted."
        )
        steps.append("Conclusion: Schedule is rigorous (Strict plus no writes while other transactions have uncommitted reads on the same item).")
        return True, "Schedule is strict and no transaction writes a data item while another transaction has an uncommitted read or write on it.", steps

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