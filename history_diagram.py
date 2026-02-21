"""
History Diagram: operation-level view of a schedule (history).
Shows operations as nodes, horizontal chains per transaction, and conflict order
between transactions (chapter 2 style).
"""

from collections import defaultdict

try:
    import networkx as nx
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _HAS_NETWORKX = True
except ImportError:
    _HAS_NETWORKX = False


class HistoryDiagram:
    """
    Represents the history (schedule) as an operation-level diagram.
    Nodes = operations (r1[x], w1[x], c1, ...)
    Edges = order within same transaction + conflict order between transactions
    """

    def __init__(self, schedule):
        self.schedule = schedule
        self.ops = list(schedule.operations)
        self.conflict_edges = []
        self._build()

    def _build(self):
        for i in range(len(self.ops)):
            op_i = self.ops[i]
            if op_i.data_item is None:
                continue
            for j in range(i + 1, len(self.ops)):
                op_j = self.ops[j]
                if op_j.data_item is None:
                    continue
                if op_i.transaction_id == op_j.transaction_id:
                    continue
                if op_i.conflicts_with(op_j):
                    self.conflict_edges.append((i, j))

    def _ops_by_transaction(self):
        by_txn = defaultdict(list)
        for idx, op in enumerate(self.ops):
            by_txn[op.transaction_id].append((idx, op))
        return by_txn

    def to_ascii(self):
        lines = []
        lines.append("=== History Diagram ===")
        lines.append("")
        lines.append("Schedule (order):")
        labels = [str(op) for op in self.ops]
        lines.append("  " + "  ".join(labels))
        lines.append("")
        by_txn = self._ops_by_transaction()
        lines.append("Per-transaction chains:")
        for tid in sorted(by_txn.keys()):
            chain = by_txn[tid]
            part = " ----+ ".join(str(op) for _, op in chain)
            lines.append(f"  T{tid}: {part}")
        lines.append("")
        lines.append("Conflict edges (before --> after):")
        if not self.conflict_edges:
            lines.append("  (none)")
        else:
            for i, j in self.conflict_edges:
                lines.append(f"  {self.ops[i]}  -->  {self.ops[j]}")
        lines.append("==========================")
        return "\n".join(lines)

    def print_ascii(self):
        print(self.to_ascii())

    def to_networkx(self):
        G = nx.DiGraph()
        for idx, op in enumerate(self.ops):
            G.add_node(idx, label=str(op), tid=op.transaction_id)
        by_txn = self._ops_by_transaction()
        for tid, chain in by_txn.items():
            for k in range(len(chain) - 1):
                i, _ = chain[k]
                j, _ = chain[k + 1]
                G.add_edge(i, j)
        for i, j in self.conflict_edges:
            G.add_edge(i, j)
        return G

    def render(self, filepath="history_diagram.png"):
        if not _HAS_NETWORKX:
            return None
        G = self.to_networkx()
        if G.number_of_nodes() == 0:
            return None
        by_txn = self._ops_by_transaction()
        pos = {}
        for row, tid in enumerate(sorted(by_txn.keys())):
            for col, (idx, _) in enumerate(by_txn[tid]):
                pos[idx] = (col, -row)
        labels = {idx: G.nodes[idx].get("label", str(idx)) for idx in G.nodes()}
        fig, ax = plt.subplots(figsize=(max(8, len(self.ops) * 0.8), max(4, len(by_txn) * 1.2)))
        nx.draw(G, pos, ax=ax, labels=labels, with_labels=True, node_color="lightyellow",
                node_size=800, font_size=8, arrows=True, arrowstyle="-|>", edge_color="gray", linewidths=1)
        ax.set_title("History Diagram (operations & conflict order)")
        plt.tight_layout()
        if not filepath.endswith(".png"):
            filepath = filepath + ".png"
        plt.savefig(filepath, dpi=150, bbox_inches="tight")
        plt.close(fig)
        return filepath