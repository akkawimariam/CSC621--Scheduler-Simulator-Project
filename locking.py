"""
Locking protocol view (Bonus feature).

Given an operation-level schedule, builds a strict 2PL-style lock/unlock
history that illustrates how locks could be acquired and released.
"""

from collections import defaultdict
from typing import Dict, List, Tuple

from operation import Operation
from schedule import Schedule


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

