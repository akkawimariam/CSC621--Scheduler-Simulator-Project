"""
Locking protocol view (Bonus feature).

Given an operation-level schedule, builds a strict 2PL-style lock/unlock
history that illustrates how locks could be acquired and released.

Also validates whether a schedule follows 2PL / Strict 2PL and produces
a step-by-step explanation with lock commands (rl, wl, ru, wu).
"""

from collections import defaultdict
from typing import Dict, List, Tuple, Any

from operation import Operation
from schedule import Schedule


# ---------------------------------------------------------------------------
# Validation: check if schedule follows 2PL / Strict 2PL (chapter 3 rules)
# Step-by-step: each step has "event" (e.g. rl1[x], r1[x]) and "explanation"
# ---------------------------------------------------------------------------

def _locks_held_by_others(locks_on_item: Dict[int, str], tid: int) -> Dict[int, str]:
    """Return { j: mode for j != tid }."""
    return {j: mode for j, mode in locks_on_item.items() if j != tid}


def _can_grant_read_lock(locks_on_item: Dict[int, str], tid: int) -> bool:
    """Grant read lock on x: no other transaction holds write lock (chapter 3: read vs write conflict)."""
    others = _locks_held_by_others(locks_on_item, tid)
    return "w" not in others.values()


def _can_grant_write_lock(locks_on_item: Dict[int, str], tid: int) -> bool:
    """Grant write lock on x: no other transaction holds any lock (chapter 3: write conflicts with read and write)."""
    others = _locks_held_by_others(locks_on_item, tid)
    return len(others) == 0

def _last_op_on_item(schedule: Schedule) -> Dict[tuple, int]:
    """(tid, item) -> last index in schedule.operations where tid has an op on item. -1 if none."""
    result = {}
    for i, op in enumerate(schedule.operations):
        if op.data_item is not None:
            result[(op.transaction_id, op.data_item)] = i
    return result


def _last_data_op_index(schedule: Schedule) -> Dict[int, int]:
    """tid -> index of last data op (read/write/inc/dec) of that txn. -1 if none."""
    result = {}
    for i, op in enumerate(schedule.operations):
        if op.data_item is not None:
            result[op.transaction_id] = i
    return result

def _follows_basic_2pl(schedule: Schedule) -> bool:
    """
    Check if schedule can be produced by Basic 2PL (growing then shrinking;
    early release allowed; no acquire after first release).
    """
    last_on_item = _last_op_on_item(schedule)
    last_data = _last_data_op_index(schedule)
    locks_by_item = defaultdict(dict)
    has_released = defaultdict(bool)

    for i, op in enumerate(schedule.operations):
        tid = op.transaction_id
        x = op.data_item

        if op.is_start():
            continue
        if op.is_commit() or op.is_abort():
            for item, holders in list(locks_by_item.items()):
                if tid in holders:
                    del holders[tid]
                if not holders:
                    del locks_by_item[item]
            has_released[tid] = True
            continue
        if x is None:
            continue

        if has_released[tid]:
            return False

        need_write = op.is_write()
        locks_x = locks_by_item[x]

        while True:
            can_read = _can_grant_read_lock(locks_x, tid)
            can_write = _can_grant_write_lock(locks_x, tid) if need_write else can_read
            if need_write and can_write:
                break
            if not need_write and can_read:
                break
            others = _locks_held_by_others(locks_x, tid)
            if not others:
                break
            released_any = False
            for t1, mode in list(others.items()):
                last_idx = last_on_item.get((t1, x), -1)
                last_data_idx = last_data.get(t1, -1)
                if last_idx < i and last_data_idx < i:
                    del locks_x[t1]
                    if not locks_x:
                        del locks_by_item[x]
                        locks_x = locks_by_item[x]
                    has_released[t1] = True
                    released_any = True
                    break
            if not released_any:
                return False

        if need_write:
            already = locks_x.get(tid)
            if already != "w":
                locks_x[tid] = "w"
        else:
            if tid not in locks_x:
                locks_x[tid] = "r"

    return True

def validate_2pl_strict2pl(schedule: Schedule) -> Tuple[bool, bool, List[Dict[str, Any]]]:
    """
    Validate whether the schedule follows Strict 2PL (and thus 2PL) by simulating
    the canonical lock sequence: acquire before each data op, release only at commit/abort.
    Build a step-by-step explanation with lock commands (rl, wl, ru, wu).

    Returns:
        (follows_strict2pl, follows_2pl, steps)
        steps: list of { "event": str, "explanation": str }
    """
    steps: List[Dict[str, Any]] = []
    # locks_by_item[x] = { tid: "r"|"w", ... }
    locks_by_item: Dict[str, Dict[int, str]] = defaultdict(dict)
    follows_strict2pl = True

    for op in schedule.operations:
        tid = op.transaction_id
        x = op.data_item

        if op.is_start():
            steps.append({"event": str(op), "explanation": f"Schedule operation {op}: T{tid} starts."})
            continue

        if op.is_commit():
            # Strict 2PL (Ch.3): scheduler releases locks after DM acks commit — record commit first, then releases
            steps.append({"event": str(op), "explanation": f"Schedule operation {op}: T{tid} commits (Strict 2PL: locks released after commit)."})
            held = locks_by_item.copy()
            release_steps = []
            for item, holders in list(held.items()):
                if tid not in holders:
                    continue
                mode = holders[tid]
                if mode == "r":
                    release_steps.append({"event": f"ru{tid}[{item}]", "explanation": f"T{tid} releases read lock on {item} after commit."})
                else:
                    release_steps.append({"event": f"wu{tid}[{item}]", "explanation": f"T{tid} releases write lock on {item} after commit."})
                del locks_by_item[item][tid]
                if not locks_by_item[item]:
                    del locks_by_item[item]
            release_steps.sort(key=lambda s: s["event"])
            steps.extend(release_steps)
            continue

        if op.is_abort():
            # Strict 2PL (Ch.3): scheduler releases locks after DM acks abort — record abort first, then releases
            steps.append({"event": str(op), "explanation": f"Schedule operation {op}: T{tid} aborts (Strict 2PL: locks released after abort)."})
            held = locks_by_item.copy()
            release_steps = []
            for item, holders in list(held.items()):
                if tid not in holders:
                    continue
                mode = holders[tid]
                if mode == "r":
                    release_steps.append({"event": f"ru{tid}[{item}]", "explanation": f"T{tid} releases read lock on {item} after abort."})
                else:
                    release_steps.append({"event": f"wu{tid}[{item}]", "explanation": f"T{tid} releases write lock on {item} after abort."})
                del locks_by_item[item][tid]
                if not locks_by_item[item]:
                    del locks_by_item[item]
            release_steps.sort(key=lambda s: s["event"])
            steps.extend(release_steps)
            continue

        # Data operation on item x
        if x is None:
            continue

        locks_x = locks_by_item[x]
        need_write = op.is_write()

        if need_write:
            if _can_grant_write_lock(locks_x, tid):
                already = locks_x.get(tid)
                if already == "w":
                    steps.append({"event": f"wl{tid}[{x}]", "explanation": f"Before {op}: T{tid} already holds write lock on {x} from a previous operation."})
                elif already == "r":
                    locks_x[tid] = "w"
                    steps.append({"event": f"wl{tid}[{x}]", "explanation": f"Before {op}: T{tid} upgrades read lock to write lock on {x}."})
                else:
                    locks_x[tid] = "w"
                    steps.append({"event": f"wl{tid}[{x}]", "explanation": f"Before {op}: T{tid} acquires write lock on {x} (no conflict; no other txn holds lock on {x})."})
            else:
                others = _locks_held_by_others(locks_x, tid)
                holders_desc = ", ".join(f"T{j} holds {'write' if m == 'w' else 'read'} lock on {x}" for j, m in others.items())
                follows_strict2pl = False
                steps.append({
                    "event": f"wl{tid}[{x}]",
                    "explanation": f"Before {op}: T{tid} cannot acquire write lock on {x}. {holders_desc} — conflict (write requires exclusive access). Schedule does not follow Strict 2PL.",
                })
            steps.append({"event": str(op), "explanation": f"Schedule operation {op}: T{tid} performs {op.op_type} on {x}."})
        else:
            if _can_grant_read_lock(locks_x, tid):
                if tid in locks_x:
                    steps.append({"event": f"rl{tid}[{x}]", "explanation": f"Before {op}: T{tid} already holds read lock on {x} from a previous operation."})
                else:
                    locks_x[tid] = "r"
                    steps.append({"event": f"rl{tid}[{x}]", "explanation": f"Before {op}: T{tid} acquires read lock on {x} (no conflict; no other txn holds write on {x})."})
            else:
                others = _locks_held_by_others(locks_x, tid)
                holders_desc = ", ".join(f"T{j} holds write lock on {x}" for j, m in others.items() if m == "w")
                if not holders_desc:
                    holders_desc = ", ".join(f"T{j} holds read lock on {x}" for j, m in others.items())
                follows_strict2pl = False
                steps.append({
                    "event": f"rl{tid}[{x}]",
                    "explanation": f"Before {op}: T{tid} cannot acquire read lock on {x}. {holders_desc} — conflict (read incompatible with write). Schedule does not follow Strict 2PL.",
                })
            steps.append({"event": str(op), "explanation": f"Schedule operation {op}: T{tid} reads {x}."})

    # Strict 2PL => 2PL (releasing only at commit/abort satisfies "no acquire after first release")
    if follows_strict2pl:
        follows_2pl = True
        steps.append({
            "event": "(result)",
            "explanation": "Conditions hold: schedule follows Strict 2PL (every data op is preceded by the required lock, and all locks are released only at commit/abort). Therefore it also follows Basic 2PL.",
        })
    else:
        follows_2pl = _follows_basic_2pl(schedule)
        if follows_2pl:
            steps.append({
                "event": "(result)",
                "explanation": "Strict 2PL does not hold (a lock conflict occurred above). Basic 2PL holds: no transaction acquires a lock after releasing one (early release was allowed in the schedule).",
            })
        else:
            steps.append({
                "event": "(result)",
                "explanation": "Neither condition holds: schedule does not follow Strict 2PL (lock conflict above), and does not follow Basic 2PL (some transaction acquires a lock after releasing one).",
            })
    return (follows_strict2pl, follows_2pl, steps)


class Strict2PLHistory:
    """
    Build a strict 2PL lock history for a given Schedule.

    For each operation on data item x by Ti:
      - Before the first read, acquire rl_i[x] (if not already holding rl or wl).
      - Before the first write, acquire wl_i[x] (or "upgrade" from rl to wl).
      - All locks held by Ti are released only at commit/abort (strict 2PL).

    This does not simulate blocking or deadlock; it shows one possible
    strict-2PL-compatible locking discipline for the given history.
    """

    def __init__(self, schedule: Schedule):
        self.schedule = schedule
        # locks_held[tid][x] = "r" or "w"
        self.locks_held: Dict[int, Dict[str, str]] = defaultdict(dict)
        self.events: List[str] = []
        self._build()

    def _acquire_read_lock(self, tid: int, x: str):
        mode = self.locks_held[tid].get(x)
        if mode in ("r", "w"):
            return
        self.locks_held[tid][x] = "r"
        self.events.append(f"rl{tid}[{x}]")

    def _acquire_write_lock(self, tid: int, x: str):
        mode = self.locks_held[tid].get(x)
        if mode == "w":
            return
        # Upgrade from read to write, or acquire write directly.
        self.locks_held[tid][x] = "w"
        self.events.append(f"wl{tid}[{x}]")

    def _release_all_locks(self, tid: int):
        locks = self.locks_held.get(tid)
        if not locks:
            return
        for x, mode in list(locks.items()):
            if mode == "r":
                self.events.append(f"ru{tid}[{x}]")
            elif mode == "w":
                self.events.append(f"wu{tid}[{x}]")
        self.locks_held[tid].clear()

    def _build(self):
        for op in self.schedule.operations:
            tid = op.transaction_id
            x = op.data_item

            # For reads/writes/inc/dec, set appropriate locks first.
            if x is not None:
                if op.is_read():
                    self._acquire_read_lock(tid, x)
                elif op.is_write():
                    self._acquire_write_lock(tid, x)

            # Record the original operation.
            self.events.append(str(op))

            # On commit/abort, release all locks (strict 2PL).
            if op.is_commit() or op.is_abort():
                self._release_all_locks(tid)

    def to_ascii(self) -> str:
        lines: List[str] = []
        lines.append("=== Strict 2PL Lock/Unlock History (derived) ===")
        lines.append("")
        if not self.events:
            lines.append("  (no operations)")
        else:
            lines.append("  " + "  ".join(self.events))
        lines.append("")
        lines.append("Note: Locks are acquired before each data access and released only at commit/abort (strict 2PL).")
        lines.append("===============================================")
        return "\n".join(lines)

    def print_ascii(self):
        print(self.to_ascii())

