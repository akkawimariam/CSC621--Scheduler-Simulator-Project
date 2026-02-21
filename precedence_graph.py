"""
Precedence (Serialization) Graph for Conflict-Serializability Analysis.

Features:
- Builds graph from schedule
- Ensures ALL transactions appear as nodes (even isolated ones)
- Detects cycles (DFS)
- Computes topological order
- Prints ASCII graph in terminal
- Saves PNG visualization (NetworkX + Matplotlib)
"""

from collections import defaultdict, deque

try:
    import networkx as nx
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    _HAS_NETWORKX = True
except ImportError:
    _HAS_NETWORKX = False


class PrecedenceGraph:
    """
    Nodes = transactions
    Edge Ti -> Tj means Ti must precede Tj in any equivalent serial schedule.
    """

    def __init__(self, schedule):
        self.schedule = schedule
        self.nodes = set()
        self.edges = set()  # (from_tid, to_tid)
        self._build()

    # ---------------------------------------------------------
    # BUILD GRAPH
    # ---------------------------------------------------------
    def _build(self):
        """Build precedence graph from schedule using conflict rules."""

        # 1️⃣ Add ALL transactions as nodes
        for op in self.schedule.operations:
            self.nodes.add(op.transaction_id)

        # 2️⃣ Group operations by data item
        ops_by_item = defaultdict(list)

        for idx, op in enumerate(self.schedule.operations):
            if op.data_item is not None:
                ops_by_item[op.data_item].append((idx, op))

        # 3️⃣ Compare only operations on same data item
        for item_ops in ops_by_item.values():
            for i in range(len(item_ops)):
                idx_i, op_i = item_ops[i]
                for j in range(i + 1, len(item_ops)):
                    idx_j, op_j = item_ops[j]

                    if op_i.transaction_id == op_j.transaction_id:
                        continue

                    if op_i.conflicts_with(op_j):
                        self.edges.add(
                            (op_i.transaction_id, op_j.transaction_id)
                        )

    # ---------------------------------------------------------
    # BASIC ACCESS
    # ---------------------------------------------------------
    def get_nodes(self):
        return sorted(self.nodes)

    def get_edges(self):
        return sorted(self.edges)

    # ---------------------------------------------------------
    # CYCLE DETECTION (DFS)
    # ---------------------------------------------------------
    def has_cycle(self):
        if not self.nodes:
            return False

        adj = defaultdict(list)
        for u, v in self.edges:
            adj[u].append(v)

        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n: WHITE for n in self.nodes}

        def dfs(node):
            color[node] = GRAY
            for neighbor in adj[node]:
                if color[neighbor] == GRAY:
                    return True
                if color[neighbor] == WHITE and dfs(neighbor):
                    return True
            color[node] = BLACK
            return False

        for node in self.nodes:
            if color[node] == WHITE:
                if dfs(node):
                    return True

        return False

    # ---------------------------------------------------------
    # TOPOLOGICAL ORDER
    # ---------------------------------------------------------
    def topological_order(self):
        if self.has_cycle():
            return []

        adj = defaultdict(list)
        in_degree = {n: 0 for n in self.nodes}

        for u, v in self.edges:
            adj[u].append(v)
            in_degree[v] += 1

        q = deque(n for n in self.nodes if in_degree[n] == 0)
        result = []

        while q:
            n = q.popleft()
            result.append(n)
            for neighbor in adj[n]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    q.append(neighbor)

        return result

    # ---------------------------------------------------------
    # ASCII TERMINAL OUTPUT
    # ---------------------------------------------------------
    def print_graph(self):
        print("\n=== Precedence Graph ===")
        print("Nodes:")
        for n in self.get_nodes():
            print(f"  T{n}")

        print("\nEdges:")
        if not self.edges:
            print("  (No edges)")
        else:
            for u, v in self.get_edges():
                print(f"  T{u}  -->  T{v}")

        print("\nConflict-Serializable:", not self.has_cycle())

        topo = self.topological_order()
        if topo:
            serial = " -> ".join(f"T{t}" for t in topo)
            print("Equivalent Serial Order:", serial)
        else:
            print("No serial order (cycle detected)")
        print("=================================\n")

    # ---------------------------------------------------------
    # NETWORKX GRAPH
    # ---------------------------------------------------------
    def to_networkx(self):
        G = nx.DiGraph()
        for n in self.get_nodes():
            G.add_node(f"T{n}")
        for u, v in self.get_edges():
            G.add_edge(f"T{u}", f"T{v}")
        return G

    # ---------------------------------------------------------
    # RENDER PNG
    # ---------------------------------------------------------
    def render(self, filepath=None, format="png"):
        if filepath is None:
            filepath = "precedence_graph"
        if format != "dot" and not filepath.endswith(".png") and not filepath.endswith(".svg"):
            filepath = filepath + "." + format

        if not _HAS_NETWORKX:
            print("NetworkX not installed. Saving DOT file instead.")
            dot_path = filepath.replace(".png", ".dot")
            with open(dot_path, "w", encoding="utf-8") as f:
                f.write(self.to_dot())
            return dot_path

        G = self.to_networkx()

        fig, ax = plt.subplots(figsize=(6, 4))
        pos = nx.spring_layout(G, seed=42)

        nx.draw(
            G,
            pos,
            ax=ax,
            with_labels=True,
            node_color="lightblue",
            node_size=1200,
            font_size=12,
            font_weight="bold",
            arrows=True,
            arrowstyle="-|>",
            edge_color="gray"
        )

        ax.set_title("Precedence Graph")
        plt.tight_layout()
        plt.savefig(filepath, dpi=150)
        plt.close(fig)

        return filepath

    # ---------------------------------------------------------
    # DOT EXPORT
    # ---------------------------------------------------------
    def to_dot(self):
        lines = [
            "digraph PrecedenceGraph {",
            "  rankdir=LR;",
            "  node [shape=circle];"
        ]

        for n in self.get_nodes():
            lines.append(f'  T{n};')

        for u, v in self.get_edges():
            lines.append(f'  T{u} -> T{v};')

        lines.append("}")
        return "\n".join(lines)