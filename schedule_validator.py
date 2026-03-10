"""
Validate a manually entered schedule against transaction definitions.
Allows reordering of independent operations; enforces order for conflicting operations.
"""

from parser import Parser
from operation import Operation


def _normalize_transaction_string(s, index_one_based):
    """If string has no 'T<num>:' prefix, prepend T{index}: """
    s = (s or "").strip()
    if not s:
        return s
    import re
    if re.match(r"^T\d+:\s*", s):
        return s
    return f"T{index_one_based}: {s}"


def _parse_definitions(transaction_strings):
    """
    Parse each transaction definition string.
    Returns list of Transaction objects (with .operations in definition order).
    """
    from transaction import Transaction
    txns = []
    for i, s in enumerate(transaction_strings):
        normalized = _normalize_transaction_string(s, i + 1)
        if not normalized:
            raise ValueError(f"Transaction {i + 1}: empty definition.")
        txn = Parser.parse_transaction(normalized)
        txns.append(txn)
    return txns


def _build_dependencies(operations):
    """
    For a list of operations in definition order, return list of (i, j) with i < j
    such that op_i and op_j conflict (same data item, at least one write/inc/dec).
    """
    deps = []
    for i in range(len(operations)):
        for j in range(i + 1, len(operations)):
            if operations[i].conflicts_with(operations[j]):
                deps.append((i, j))
    return deps


def _schedule_ops_by_tid(schedule):
    """Return dict tid -> [(global_position, op), ...] in schedule order."""
    by_tid = {}
    for pos, op in enumerate(schedule.operations):
        tid = op.transaction_id
        if tid not in by_tid:
            by_tid[tid] = []
        by_tid[tid].append((pos, op))
    return by_tid


def _find_assignment(def_ops, sched_ops_with_pos, dependencies):
    """
    def_ops: list of Operation (definition order).
    sched_ops_with_pos: list of (global_position, op) in schedule order.
    dependencies: list of (i, j) meaning def_ops[i] must appear before def_ops[j].
    Returns list of length len(def_ops): assignment[def_index] = global_position, or None if invalid.
    """
    n = len(def_ops)
    m = len(sched_ops_with_pos)
    if n != m:
        return None

    # Topological order of def indices (when we assign j, all i with (i,j) are already assigned)
    from collections import deque
    succ = [[] for _ in range(n)]
    in_degree = [0] * n
    for i, j in dependencies:
        succ[i].append(j)
        in_degree[j] += 1
    order = []
    q = deque([j for j in range(n) if in_degree[j] == 0])
    while q:
        j = q.popleft()
        order.append(j)
        for k in succ[j]:
            in_degree[k] -= 1
            if in_degree[k] == 0:
                q.append(k)
    if len(order) != n:
        return None  # cycle in dependencies (shouldn't happen for our DAG)

    assignment = [None] * n
    used_sched = [False] * m

    for def_idx in order:
        # Minimum schedule position: must be strictly after all def ops that must precede it
        min_pos = -1
        for (i, j) in dependencies:
            if j == def_idx and assignment[i] is not None:
                min_pos = max(min_pos, assignment[i])

        # find earliest matching sched op that is strictly after min_pos and not used
        best_sched_idx = None
        best_pos = None
        for sched_idx, (pos, op) in enumerate(sched_ops_with_pos):
            if used_sched[sched_idx]:
                continue
            if op != def_ops[def_idx]:
                continue
            if pos <= min_pos:
                continue
            if best_pos is None or pos < best_pos:
                best_pos = pos
                best_sched_idx = sched_idx

        if best_sched_idx is None:
            return None
        assignment[def_idx] = best_pos
        used_sched[best_sched_idx] = True

    return assignment


def validate_schedule_against_transactions(transaction_strings, schedule_string):
    """
    Validate that the schedule respects the transaction definitions:
    - Every operation in the schedule belongs to its transaction definition (multiset match).
    - No operation appears after that transaction's COMMIT/ABORT (parser already enforces).
    - Every transaction ends with exactly one COMMIT or ABORT (parser already enforces).
    - For every conflicting pair (op_i, op_j) in a definition with i < j, op_i appears before op_j in the schedule.

    Args:
        transaction_strings: List of strings, e.g. ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[y] w2[y] c2"]
            or ["start1 r1[x] w1[x] c1", "start2 r2[y] w2[y] c2"] (T1:, T2: will be prepended if missing).
        schedule_string: The history string, e.g. "start1 r1[x] w1[x] start2 r2[y] w2[y] c1 c2"

    Returns:
        (True, None) if valid.
        (False, error_message) if invalid.
    """
    if not transaction_strings or not schedule_string or not schedule_string.strip():
        return (False, "Missing transaction definitions or schedule.")

    try:
        definitions = _parse_definitions(transaction_strings)
    except ValueError as e:
        return (False, str(e))

    try:
        schedule = Parser.parse_schedule(schedule_string.strip())
    except ValueError as e:
        return (False, str(e))

    sched_by_tid = _schedule_ops_by_tid(schedule)
    def_tids = {t.transaction_id for t in definitions}

    for txn in definitions:
        tid = txn.transaction_id
        def_ops = txn.operations
        sched_list = sched_by_tid.get(tid, [])

        if len(sched_list) != len(def_ops):
            return (
                False,
                f"Transaction T{tid}: schedule has {len(sched_list)} operations but definition has {len(def_ops)}. "
                "Each operation in the schedule must match exactly one operation in the transaction definition.",
            )

        dependencies = _build_dependencies(def_ops)
        assignment = _find_assignment(def_ops, sched_list, dependencies)
        if assignment is None:
            return (
                False,
                f"Transaction T{tid}: schedule does not match the transaction definition, "
                "or dependency order is violated (e.g. a read must appear before a write on the same data item).",
            )

        for (i, j) in dependencies:
            if assignment[i] >= assignment[j]:
                return (
                    False,
                    f"Transaction T{tid}: dependency violated — {def_ops[i]} must appear before {def_ops[j]} in the schedule.",
                )

    # Check that every transaction in the schedule has a definition
    for tid in sched_by_tid:
        if tid not in def_tids:
            return (False, f"Schedule contains transaction T{tid} but no definition was provided for it.")

    return (True, None)
