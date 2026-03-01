"""
Schedule generation by simulating 2PL and Strict 2PL locking protocols.
All logic lives here; UI only displays results from the API.
"""

import random
from typing import List, Tuple
from collections import defaultdict

from parser import Parser
from operation import Operation


def _random_interleave(transactions: List[List[str]]) -> str:
    """Interleave transaction operation lists randomly. Each inner list is one transaction's op strings."""
    n = len(transactions)
    positions = [0] * n
    result = []
    while True:
        candidates = [i for i in range(n) if positions[i] < len(transactions[i])]
        if not candidates:
            break
        idx = random.choice(candidates)
        result.append(transactions[idx][positions[idx]])
        positions[idx] += 1
    return " ".join(result)


def _can_acquire_read(locks_on_item: dict, tid: int) -> bool:
    """True if tid can acquire read lock (no writer, or only tid holds write)."""
    if not locks_on_item:
        return True
    writers = [t for t, m in locks_on_item.items() if m == "w"]
    if not writers:
        return True
    return writers == [tid]


def _can_acquire_write(locks_on_item: dict, tid: int) -> bool:
    """True if tid can acquire write lock (no one else holds any lock)."""
    if not locks_on_item:
        return True
    others = [t for t in locks_on_item if t != tid]
    return len(others) == 0


def _simulate_strict2pl(transactions_ops: List[List[Operation]]) -> str:
    """
    Simulate Strict 2PL: locks released only at commit/abort.
    Returns schedule string (order of operations as they execute).
    """
    n = len(transactions_ops)
    positions = [0] * n
    schedule_ops = []
    locks = defaultdict(dict)  # data_item -> { tid: 'r'|'w' }
    active = set(range(n))
    max_steps = sum(len(t) for t in transactions_ops) + 100
    steps = 0

    while active and steps < max_steps:
        steps += 1
        progress = False
        for i in list(active):
            if positions[i] >= len(transactions_ops[i]):
                active.discard(i)
                continue
            op = transactions_ops[i][positions[i]]
            tid = op.transaction_id
            x = op.data_item

            if op.is_start():
                schedule_ops.append(str(op))
                positions[i] += 1
                progress = True
                continue

            if op.is_commit() or op.is_abort():
                # Strict 2PL: release all locks, then output commit/abort
                for item, holders in list(locks.items()):
                    if tid in holders:
                        del holders[tid]
                    if not holders:
                        del locks[item]
                schedule_ops.append(str(op))
                positions[i] += 1
                if positions[i] >= len(transactions_ops[i]):
                    active.discard(i)
                progress = True
                continue

            if x is None:
                continue

            # Data op: need lock
            locks_x = locks[x]
            need_write = op.is_write()
            if need_write:
                if _can_acquire_write(locks_x, tid):
                    locks_x[tid] = "w"
                    schedule_ops.append(str(op))
                    positions[i] += 1
                    progress = True
            else:
                if _can_acquire_read(locks_x, tid):
                    if tid not in locks_x:
                        locks_x[tid] = "r"
                    schedule_ops.append(str(op))
                    positions[i] += 1
                    progress = True

        if not progress:
            # Deadlock: abort a random active transaction that is blocked
            blocked = []
            for i in active:
                if positions[i] >= len(transactions_ops[i]):
                    continue
                op = transactions_ops[i][positions[i]]
                if op.is_start() or op.is_commit() or op.is_abort():
                    continue
                x = op.data_item
                if x is None:
                    continue
                tid = op.transaction_id
                locks_x = locks.get(x, {})
                need_write = op.is_write()
                can = _can_acquire_write(locks_x, tid) if need_write else _can_acquire_read(locks_x, tid)
                if not can:
                    blocked.append(i)
            if not blocked:
                break
            abort_txn = random.choice(blocked)
            tid_abort = transactions_ops[abort_txn][0].transaction_id
            for item, holders in list(locks.items()):
                if tid_abort in holders:
                    del holders[tid_abort]
                if not holders:
                    del locks[item]
            # Output abort and skip to end of that transaction
            schedule_ops.append(f"a{tid_abort}")
            positions[abort_txn] = len(transactions_ops[abort_txn])
            active.discard(abort_txn)
            progress = True

    return " ".join(schedule_ops)


def _simulate_2pl(transactions_ops: List[List[Operation]]) -> str:
    """
    Simulate Basic 2PL (not Strict): transactions release locks before commit (early release).
    When a txn's next op is commit/abort, we release its locks and defer the commit;
    other txns can run in between, so the schedule is 2PL but not Strict 2PL.
    """
    n = len(transactions_ops)
    positions = [0] * n
    schedule_ops = []
    locks = defaultdict(dict)
    active = set(range(n))
    pending_commit: List[Tuple[int, str]] = []
    max_steps = sum(len(t) for t in transactions_ops) * 3 + 100
    steps = 0

    while (active or pending_commit) and steps < max_steps:
        steps += 1
        progress = False

        for i in list(active):
            if positions[i] >= len(transactions_ops[i]):
                active.discard(i)
                continue
            op = transactions_ops[i][positions[i]]
            if not (op.is_commit() or op.is_abort()):
                continue
            tid = op.transaction_id
            for item, holders in list(locks.items()):
                if tid in holders:
                    del holders[tid]
                if not holders:
                    del locks[item]
            pending_commit.append((i, str(op)))
            positions[i] += 1
            active.discard(i)
            progress = True

        if progress:
            continue

        actions = []
        for i in active:
            if positions[i] >= len(transactions_ops[i]):
                continue
            op = transactions_ops[i][positions[i]]
            tid = op.transaction_id
            x = op.data_item
            if op.is_start():
                actions.append(("run", i))
                continue
            if x is not None:
                locks_x = locks.get(x, {})
                need_write = op.is_write()
                if need_write and _can_acquire_write(locks_x, tid):
                    actions.append(("run", i))
                elif not need_write and _can_acquire_read(locks_x, tid):
                    actions.append(("run", i))
        for k in range(len(pending_commit)):
            actions.append(("commit", k))

        if not actions:
            blocked = [i for i in active if positions[i] < len(transactions_ops[i])]
            for i in list(blocked):
                op = transactions_ops[i][positions[i]]
                if op.is_start():
                    blocked.remove(i)
                elif op.data_item is not None:
                    lx = locks.get(op.data_item, {})
                    if op.is_write() and _can_acquire_write(lx, op.transaction_id):
                        blocked.remove(i)
                    elif not op.is_write() and _can_acquire_read(lx, op.transaction_id):
                        blocked.remove(i)
            if not blocked:
                while pending_commit:
                    _, op_str = pending_commit.pop(0)
                    schedule_ops.append(op_str)
                break
            abort_txn = random.choice(blocked)
            tid_abort = transactions_ops[abort_txn][0].transaction_id
            for item, holders in list(locks.items()):
                if tid_abort in holders:
                    del holders[tid_abort]
                if not holders:
                    del locks[item]
            schedule_ops.append(f"a{tid_abort}")
            positions[abort_txn] = len(transactions_ops[abort_txn])
            active.discard(abort_txn)
            progress = True
            continue

        choice = random.choice(actions)
        if choice[0] == "commit":
            _, k = choice
            i, op_str = pending_commit.pop(k)
            schedule_ops.append(op_str)
            progress = True
        else:
            i = choice[1]
            op = transactions_ops[i][positions[i]]
            tid = op.transaction_id
            x = op.data_item
            if op.is_start():
                schedule_ops.append(str(op))
                positions[i] += 1
                progress = True
            elif x is not None:
                locks_x = locks[x]
                need_write = op.is_write()
                if need_write:
                    locks_x[tid] = "w"
                else:
                    if tid not in locks_x:
                        locks_x[tid] = "r"
                schedule_ops.append(str(op))
                positions[i] += 1
                progress = True

    while pending_commit:
        _, op_str = pending_commit.pop(0)
        schedule_ops.append(op_str)

    return " ".join(schedule_ops)
    

def generate_schedule_with_protocol(
    transactions_list: List[List[str]],
    mode: str,
    seed: int = None,
) -> str:
    """
    Generate a schedule from a list of transactions.

    Args:
        transactions_list: List of transaction op-strings. Each element is a list of op strings
            for one transaction, e.g. [["start1", "r1[x]", "w1[x]", "c1"], ["start2", "r2[x]", "c2"]].
            Or list of single strings "start1 r1[x] w1[x] c1" (will be split).
        mode: "random" | "2pl" | "strict2pl"
        seed: Optional random seed.

    Returns:
        Schedule string (history).
    """
    if seed is not None:
        random.seed(seed)

    # Normalize to list of lists of op strings
    normalized = []
    for t in transactions_list:
        if isinstance(t, str):
            normalized.append([s.strip() for s in t.strip().split()])
        else:
            normalized.append([str(s).strip() for s in t])

    if mode == "random":
        return _random_interleave(normalized)

    # Parse to Operation objects for 2PL simulation
    transactions_ops = []
    for ops_str_list in normalized:
        ops = []
        for s in ops_str_list:
            ops.append(Parser.parse_operation(s))
        transactions_ops.append(ops)

    if mode == "strict2pl":
        return _simulate_strict2pl(transactions_ops)
    if mode == "2pl":
        return _simulate_2pl(transactions_ops)

    raise ValueError(f"Unknown mode: {mode}. Use 'random', '2pl', or 'strict2pl'.")
