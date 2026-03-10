"""
Thin HTTP API for the Transaction Scheduler Simulator.
Uses parser + scheduler only; no change to their logic.
Logs every request/response for debugging.
"""

import logging
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS

from collections import defaultdict

from parser import Parser
from scheduler import Scheduler
from schedule_generator import ScheduleGenerator
from schedule_generator_2pl import generate_schedule_with_protocol
from locking import Strict2PLHistory, validate_2pl_strict2pl
from schedule_validator import validate_schedule_against_transactions

# ---------------------------------------------------------------------------
# Logging: all UI interactions logged to terminal for debugging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [API] %(message)s",
    datefmt="%H:%M:%S",
    stream=sys.stdout,
)
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)


def _operation_to_dict(op):
    """Serialize a single Operation for JSON (for history diagram)."""
    d = {
        "op_type": op.op_type,
        "transaction_id": op.transaction_id,
        "data_item": op.data_item,
    }
    d["raw"] = str(op)
    # Map backend op_type to frontend 'type' (read, write, increment, decrement, commit, abort, start)
    type_map = {
        "r": "read",
        "w": "write",
        "inc": "increment",
        "dec": "decrement",
        "c": "commit",
        "a": "abort",
        "start": "start",
    }
    d["type"] = type_map.get(op.op_type, op.op_type)
    d["transaction"] = op.transaction_id
    d["dataItem"] = op.data_item
    return d


def _analyze_result_to_json(schedule, results, pg):
    """Build JSON response from Scheduler.analyze() and precedence graph."""
    nodes = sorted(pg.nodes) if pg else []
    edges = [{"from": u, "to": v, "reason": f"T{u} → T{v} (conflict)"} for (u, v) in sorted(pg.edges)] if pg else []

    return {
        "conflict_serializable": {
            "is_serializable": results["conflict_serializable"]["is_serializable"],
            "serial_order": results["conflict_serializable"].get("serial_order") or [],
            "explanation": results["conflict_serializable"]["explanation"],
            "steps": results["conflict_serializable"].get("steps") or [],
        },
        "recoverable": {
            "is_recoverable": results["recoverable"]["is_recoverable"],
            "explanation": results["recoverable"]["explanation"],
            "steps": results["recoverable"].get("steps") or [],
        },
        "aca": {
            "avoids_cascading_aborts": results["aca"]["avoids_cascading_aborts"],
            "explanation": results["aca"]["explanation"],
            "steps": results["aca"].get("steps") or [],
        },
        "strict": {
            "is_strict": results["strict"]["is_strict"],
            "explanation": results["strict"]["explanation"],
            "steps": results["strict"].get("steps") or [],
        },
        "rigorous": {
            "is_rigorous": results["rigorous"]["is_rigorous"],
            "explanation": results["rigorous"]["explanation"],
            "steps": results["rigorous"].get("steps") or [],
        },
        "violations": _collect_violations(results),
        "precedence_graph": {"nodes": nodes, "edges": edges},
        "operations": [_operation_to_dict(op) for op in schedule.operations],
        "num_transactions": len(schedule.transactions),
    }


def _collect_violations(results):
    """Collect violation messages from analysis results."""
    out = []
    if not results["conflict_serializable"]["is_serializable"]:
        out.append("Not conflict-serializable")
    if not results["recoverable"]["is_recoverable"]:
        out.append("Not recoverable")
    if not results["aca"]["avoids_cascading_aborts"]:
        out.append("Does not avoid cascading aborts")
    if not results["strict"]["is_strict"]:
        out.append("Not strict")
    if not results["rigorous"]["is_rigorous"]:
        out.append("Not rigorous")
    return out


@app.route("/api/analyze", methods=["POST"])
def analyze():
    """
    POST body: { "schedule": "start1 r1[x] w1[x] start2 r2[x] w2[y] c1 c2" }
    Optional: "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: ..."] for manual-input validation.
    When transactions are provided, the schedule is validated against them (dependency-based)
    before running analysis; if invalid, returns 400 with error message.
    Returns full analysis result as JSON.
    """
    try:
        data = request.get_json() or {}
        schedule_str = (data.get("schedule") or "").strip()
        if not schedule_str:
            log.warning("POST /api/analyze: empty schedule")
            return jsonify({"error": "Missing or empty 'schedule' in body"}), 400

        transactions_raw = data.get("transactions")
        if transactions_raw and isinstance(transactions_raw, list) and len(transactions_raw) > 0:
            valid, err = validate_schedule_against_transactions(transactions_raw, schedule_str)
            if not valid:
                log.warning("POST /api/analyze validation failed: %s", err)
                return jsonify({"error": err}), 400

        log.info("POST /api/analyze | schedule length=%d", len(schedule_str))

        schedule = Parser.parse_schedule(schedule_str)
        scheduler = Scheduler(schedule)
        results = scheduler.analyze()
        pg = scheduler.get_precedence_graph()

        out = _analyze_result_to_json(schedule, results, pg)
        sr = results["conflict_serializable"]
        log.info(
            "  -> SR=%s RC=%s ACA=%s Strict=%s Rigorous=%s | violations=%d",
            sr["is_serializable"],
            results["recoverable"]["is_recoverable"],
            results["aca"]["avoids_cascading_aborts"],
            results["strict"]["is_strict"],
            results["rigorous"]["is_rigorous"],
            len(out["violations"]),
        )
        if sr.get("serial_order"):
            log.info("  -> Serial order: %s", " → ".join(f"T{t}" for t in sr["serial_order"]))

        return jsonify(out)
    except ValueError as e:
        log.warning("POST /api/analyze parse/validate error: %s", e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        log.exception("POST /api/analyze error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/test-cases", methods=["GET"])
def get_test_cases():
    """Return list of test cases from backend (test_cases.TEST_CASES)."""
    from test_cases import TEST_CASES

    log.info("GET /api/test-cases | returning %d cases", len(TEST_CASES))
    # Frontend expects: id, name, description?, numTransactions, schedule (history), transactions?
    cases = []
    for i, tc in enumerate(TEST_CASES):
        cases.append({
            "id": f"case-{i + 1}",
            "name": tc["label"],
            "numTransactions": tc["num_txns"],
            "schedule": tc["history"],
            "transactions": tc.get("transactions", []),
        })
    return jsonify(cases)


@app.route("/api/generate", methods=["POST"])
def generate():
    """
    POST body:
      - mode: "random" | "2pl" | "strict2pl" (default "random")
      - Optional: transactions = list of transaction strings, e.g. ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] c2"]
        or list of op-string lists. If provided, generation uses these; otherwise uses params below.
      - numTransactions, maxOpsPerTransaction, dataItems, allowAborts: used when transactions not provided.
      - seed: optional int for reproducibility.
    Returns { "transactions": [...], "history": "..." }. All logic in Python.
    """
    try:
        data = request.get_json() or {}
        mode = (data.get("mode") or "random").strip().lower()
        if mode not in ("random", "2pl", "strict2pl"):
            return jsonify({"error": f"Invalid mode: {mode}. Use 'random', '2pl', or 'strict2pl'."}), 400

        transactions_raw = data.get("transactions")
        seed = data.get("seed")

        if transactions_raw:
            # User provided transactions: normalize to list of lists of op strings
            txn_strings = []
            transactions_list = []
            for i, t in enumerate(transactions_raw):
                if isinstance(t, str):
                    t = t.strip()
                    if t.startswith("T") and ":" in t:
                        prefix, rest = t.split(":", 1)
                        txn_strings.append(t)
                        transactions_list.append([s.strip() for s in rest.strip().split()])
                    else:
                        txn_strings.append(t)
                        transactions_list.append([s.strip() for s in t.split()])
                else:
                    ops = [str(s).strip() for s in t]
                    txn_strings.append(" ".join(ops))
                    transactions_list.append(ops)
            history = generate_schedule_with_protocol(transactions_list, mode, seed=seed)
            out = {"transactions": txn_strings, "history": history}
        else:
            num_transactions = int(data.get("numTransactions", 2))
            max_ops = int(data.get("maxOpsPerTransaction", 3))
            data_items = data.get("dataItems") or ["x", "y"]
            allow_aborts = data.get("allowAborts", True)

            log.info(
                "POST /api/generate | mode=%s numTxns=%d maxOps=%d dataItems=%s allowAborts=%s",
                mode, num_transactions, max_ops, data_items, allow_aborts,
            )

            txn_strings, _ = ScheduleGenerator.generate_transactions_and_history(
                num_transactions=num_transactions,
                max_ops_per_transaction=max_ops,
                data_items=data_items,
                allow_aborts=allow_aborts,
                seed=seed,
            )
            # Convert "T1: start1 r1[x] c1" -> ["start1", "r1[x]", "c1"]
            transactions_list = []
            for s in txn_strings:
                if ":" in s:
                    _, rest = s.split(":", 1)
                    transactions_list.append([x.strip() for x in rest.strip().split()])
                else:
                    transactions_list.append([x.strip() for x in s.split()])
            history = generate_schedule_with_protocol(transactions_list, mode, seed=seed)
            out = {"transactions": txn_strings, "history": history}

        log.info("  -> generated history length=%d mode=%s", len(out["history"]), mode)
        return jsonify(out)
    except ValueError as e:
        log.warning("POST /api/generate validation error: %s", e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        log.exception("POST /api/generate error: %s", e)
        return jsonify({"error": str(e)}), 500


def _build_strict2pl_lock_table(schedule):
    """
    Build lock table with (transaction, dataItem, lockType, acquiredAt, releasedAt)
    using the same Strict 2PL rules as locking.Strict2PLHistory.
    """
    locks_held = defaultdict(dict)  # tid -> { x -> 'r'|'w' }
    lock_table = []  # list of dicts with transaction, dataItem, lockType, acquiredAt, releasedAt
    # Track open entries per (tid, x) so we can set releasedAt
    open_entries = {}  # (tid, x) -> index in lock_table

    for pos, op in enumerate(schedule.operations):
        tid, x = op.transaction_id, op.data_item
        if x is not None and (op.is_read() or op.is_write()):
            lock_type = "write" if op.is_write() else "read"
            current = locks_held[tid].get(x)
            if not current or (current == "read" and lock_type == "write"):
                entry = {
                    "transaction": tid,
                    "dataItem": x,
                    "lockType": lock_type,
                    "acquiredAt": pos,
                    "releasedAt": None,
                }
                lock_table.append(entry)
                open_entries[(tid, x)] = len(lock_table) - 1
                locks_held[tid][x] = lock_type
        if op.is_commit() or op.is_abort():
            for x_key, _ in list(locks_held.get(tid, {}).items()):
                key = (tid, x_key)
                if key in open_entries:
                    idx = open_entries[key]
                    lock_table[idx]["releasedAt"] = pos
                    del open_entries[key]
            locks_held[tid].clear()

    return lock_table


@app.route("/api/validate-2pl", methods=["POST"])
def validate_2pl():
    """
    POST body: { "schedule": "start1 r1[x] w1[x] c1 ..." }
    Returns whether the schedule follows 2PL and Strict 2PL, with step-by-step
    explanation including lock commands (rl, wl, ru, wu).
    """
    try:
        data = request.get_json() or {}
        schedule_str = (data.get("schedule") or "").strip()
        if not schedule_str:
            log.warning("POST /api/validate-2pl: empty schedule")
            return jsonify({"error": "Missing or empty 'schedule' in body"}), 400

        log.info("POST /api/validate-2pl | schedule length=%d", len(schedule_str))

        schedule = Parser.parse_schedule(schedule_str)
        follows_strict2pl, follows_2pl, steps = validate_2pl_strict2pl(schedule)

        out = {
            "follows2PL": follows_2pl,
            "followsStrict2PL": follows_strict2pl,
            "steps": steps,
        }
        log.info("  -> followsStrict2PL=%s follows2PL=%s steps=%d", follows_strict2pl, follows_2pl, len(steps))
        return jsonify(out)
    except ValueError as e:
        log.warning("POST /api/validate-2pl parse error: %s", e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        log.exception("POST /api/validate-2pl error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/strict2pl-history", methods=["POST"])
def strict2pl_history():
    """
    POST body: { "schedule": "start1 r1[x] w1[x] c1 ..." }
    Returns Strict 2PL lock/unlock history derived from the schedule.
    """
    try:
        data = request.get_json() or {}
        schedule_str = (data.get("schedule") or "").strip()
        if not schedule_str:
            log.warning("POST /api/strict2pl-history: empty schedule")
            return jsonify({"error": "Missing or empty 'schedule' in body"}), 400

        log.info("POST /api/strict2pl-history | schedule length=%d", len(schedule_str))

        schedule = Parser.parse_schedule(schedule_str)
        strict2pl = Strict2PLHistory(schedule)
        lock_table = _build_strict2pl_lock_table(schedule)

        out = {
            "events": strict2pl.events,
            "lockTable": lock_table,
            "explanation": "Locks are acquired before each data access and released only at commit/abort (Strict 2PL).",
        }
        log.info("  -> events=%d lockTable entries=%d", len(out["events"]), len(out["lockTable"]))
        return jsonify(out)
    except ValueError as e:
        log.warning("POST /api/strict2pl-history parse error: %s", e)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        log.exception("POST /api/strict2pl-history error: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    log.info("Starting Transaction Scheduler API (CORS enabled)")
    app.run(host="0.0.0.0", port=5000, debug=False)
