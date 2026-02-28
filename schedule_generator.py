"""
Random schedule generator (Bonus feature).

Generates well-formed transactions and an interleaved history (schedule)
that can be fed back into the existing parser / analyzer.
"""

import random
from typing import List, Tuple, Optional


class ScheduleGenerator:
    """Utility for generating random transactions and schedules."""

    @staticmethod
    def _random_op_type() -> str:
        """
        Pick an operation type among read/write/inc/dec with simple fixed weights.
        Returns: one of 'r', 'w', 'inc', 'dec'
        """
        # Slight bias toward read/write.
        return random.choices(
            population=["r", "w", "inc", "dec"],
            weights=[3, 3, 2, 2],
            k=1,
        )[0]

    @staticmethod
    def generate_transactions_and_history(
        num_transactions: int,
        max_ops_per_transaction: int,
        data_items: List[str],
        allow_aborts: bool = True,
        seed: Optional[int] = None,
    ) -> Tuple[List[str], str]:
        """
        Generate random transaction strings and a corresponding history string.

        Args:
            num_transactions: number of transactions T1..Tn
            max_ops_per_transaction: upper bound on number of data operations per txn
            data_items: list of data item names, e.g. ['x', 'y', 'z']
            allow_aborts: if True, some transactions may end with abort instead of commit
            seed: optional random seed for reproducibility

        Returns:
            (transactions, history) where:
              - transactions: list of strings in the format 'T1: r1[x] w1[y] c1'
              - history: a single-line history like 'r1[x] w2[y] c1 c2'
        """
        if seed is not None:
            random.seed(seed)

        if num_transactions < 1:
            raise ValueError("num_transactions must be at least 1")
        if max_ops_per_transaction < 1:
            raise ValueError("max_ops_per_transaction must be at least 1")
        if not data_items:
            raise ValueError("data_items must be a non-empty list")

        transactions: List[List[str]] = []
        transaction_strings: List[str] = []

        # 1) Build each transaction's operation list.
        for tid in range(1, num_transactions + 1):
            # Number of data operations (reads/writes/inc/dec) before termination.
            num_ops = random.randint(1, max_ops_per_transaction)

            ops: List[str] = []
            for _ in range(num_ops):
                op_type = ScheduleGenerator._random_op_type()
                item = random.choice(data_items)
                ops.append(f"{op_type}{tid}[{item}]")

            # Termination: commit or abort.
            if allow_aborts and random.random() < 0.25:
                term = f"a{tid}"
            else:
                term = f"c{tid}"
            ops.append(term)

            transactions.append(ops)
            transaction_strings.append(f"T{tid}: " + " ".join(ops))

        # 2) Interleave operations to form a history.
        # Maintain per-txn cursor and randomly pick the next available txn.
        positions = [0] * num_transactions
        remaining = num_transactions
        history_ops: List[str] = []

        while remaining > 0:
            # Candidates = txns that still have operations left.
            candidates = [i for i in range(num_transactions) if positions[i] < len(transactions[i])]
            if not candidates:
                break
            idx = random.choice(candidates)
            op = transactions[idx][positions[idx]]
            history_ops.append(op)
            positions[idx] += 1
            if positions[idx] >= len(transactions[idx]):
                remaining -= 1

        history = " ".join(history_ops)
        return transaction_strings, history

