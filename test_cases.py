"""
Built-in test cases for the Transaction Scheduler Simulator.
Used by the web API (api.py) to serve test cases to the UI.
"""

# ---------------------------------------------------------------------------
# Hardcoded test cases for Run Test Cases (web UI)
# ---------------------------------------------------------------------------
TEST_CASES = [
    {
        "label": "Case 1.1 - Recoverable only (RC, not ACA)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[x] c1 c2",
    },
    {
        "label": "Case 1.2 - Recoverable only (RC, not ACA)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] r1[y] w1[y] c1", "T2: start2 r2[x] r2[y] w2[y] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] r1[y] w1[y] r2[y] w2[y] c1 c2",
    },
    {
        "label": "Case 2.1 - Not recoverable",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] c2"],
        "history": "start1 r1[x] w1[x] start2 r2[x] c2 c1",
    },
    {
        "label": "Case 2.2 - Not recoverable (3 txns)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] w1[y] c1", "T2: start2 r2[x] w2[x] c2", "T3: start3 r3[y] w3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[x] c2 w1[y] start3 r3[y] w3[y] c3 c1",
    },
    {
        "label": "Case 3.1 - Strict (and Rigorous)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[x] c2",
    },
    {
        "label": "Case 3.2 - Strict (and Rigorous, 3 txns)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[y] c2", "T3: start3 r3[x] r3[y] w3[x] c3"],
        "history": "start1 w1[x] c1 start2 w2[y] c2 start3 r3[x] r3[y] w3[x] c3",
    },
    {
        "label": "Case 4.1 - ACA but not Strict (dirty write)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] c2"],
        "history": "start1 w1[x] start2 w2[x] c1 c2",
    },
    {
        "label": "Case 5.1 - Conflict serializable (interleaved)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[y] w2[y] c2"],
        "history": "start1 r1[x] start2 r2[y] w1[x] w2[y] c1 c2",
    },
    {
        "label": "Case 5.2 - NOT conflict serializable (cycle)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[y] w2[x] c2"],
        "history": "start1 r1[x] start2 r2[y] w1[y] w2[x] c1 c2",
    },
    {
        "label": "Case 6.1 - Rigorous (serial)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[x] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[x] c2",
    },
    {
        "label": "Case 7.1 - Edge: single transaction",
        "num_txns": 1,
        "transactions": ["T1: start1 r1[x] w1[x] r1[y] w1[y] c1"],
        "history": "start1 r1[x] w1[x] r1[y] w1[y] c1",
    },
    {
        "label": "Case 7.2 - Edge: only reads",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] c1", "T2: start2 r2[x] c2"],
        "history": "start1 r1[x] start2 r2[x] c1 c2",
    },
    {
        "label": "Case 8.1 - Conflict-Serializable (Acyclic) T1→T2→T3",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] c1 c2 c3",
    },
    {
        "label": "Case 8.2 - Non-Serializable (Cycle x,y)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 r1[x] start2 w2[x] r2[y] w1[y] c1 c2",
    },
    {
        "label": "Case 8.3 - 4 Txns serializable T1→T2→T3→T4",
        "num_txns": 4,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3", "T4: start4 r4[z] w4[x] c4"],
        "history": "start1 r1[x] w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] start4 r4[z] w4[x] c1 c2 c3 c4",
    },
    {
        "label": "Case 9.1 - 4 txns interleaved conflicts acyclic",
        "num_txns": 4,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[y] w2[z] c2", "T3: start3 r3[z] w3[x] c3", "T4: start4 r4[x] r4[y] w4[z] c4"],
        "history": "start1 r1[x] start2 r2[y] start3 r3[z] w1[y] start4 r4[x] w2[z] w3[x] r4[y] w4[z] c1 c2 c3 c4",
    },
    {
        "label": "Case 9.2 - 4 txns with cycle (T1→T2→T1)",
        "num_txns": 4,
        "transactions": ["T1: start1 w1[x] r1[y] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 w3[z] r3[x] c3", "T4: start4 r4[z] w4[x] c4"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 w3[z] r3[x] start4 r4[z] r1[y] w4[x] c1 c2 c3 c4",
    },
    {
        "label": "Case 10.1 - Abort T1, T2 committed after dirty read",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] a1 start3 r3[y] w3[z] c2 c3",
    },
    {
        "label": "Case 10.2 - Cascading abort (T1,T2 abort, T3 commits)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] w2[y] a2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 r3[y] w3[z] a1 a2 c3",
    },
    {
        "label": "Case 10.3 - T2 aborts, T3 reads from T2 then commits",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] a2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] c1 start2 r2[x] w2[y] start3 r3[y] w3[z] a2 c3",
    },
    {
        "label": "Case 11.1 - INC/DEC read-write conflicts",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] inc1[x] dec1[y] c1", "T2: start2 inc2[x] r2[y] c2", "T3: start3 r3[x] dec3[z] c3"],
        "history": "start1 r1[x] start2 inc2[x] inc1[x] r2[y] start3 r3[x] dec1[y] dec3[z] c1 c2 c3",
    },
    {
        "label": "Case 11.2 - INC/DEC acyclic",
        "num_txns": 3,
        "transactions": ["T1: start1 inc1[x] dec1[y] c1", "T2: start2 r2[x] inc2[y] c2", "T3: start3 r3[y] dec3[x] c3"],
        "history": "start1 inc1[x] start2 r2[x] inc2[y] start3 r3[y] dec3[x] dec1[y] c1 c2 c3",
    },
    {
        "label": "Case 11.3 - INC/DEC cycle (non-serializable)",
        "num_txns": 3,
        "transactions": ["T1: start1 inc1[x] dec1[y] c1", "T2: start2 inc2[y] dec2[z] c2", "T3: start3 inc3[z] dec3[x] c3"],
        "history": "start1 inc1[x] start2 inc2[y] start3 inc3[z] dec3[x] dec1[y] dec2[z] c1 c2 c3",
    },
    {
        "label": "Case 12.1 — Basic 2PL (SR=YES, RC=YES, ACA=NO, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 w1[x] start2 r2[x] w2[y] c1 c2",
    },
    {
        "label": "Case 12.2 — Basic 2PL (SR=YES, RC=YES, ACA=YES, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] c2"],
        "history": "start1 w1[x] start2 w2[x] c1 c2",
    },
    {
        "label": "Case 12.3 — Strict 2PL (SR=YES, ST=YES, Rigorous=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[z] c2"],
        "history": "start1 r1[x] w1[y] c1 start2 r2[x] w2[z] c2",
    },
    {
        "label": "Case 12.4 — Rigorous 2PL (SR=YES, ST=YES, Rigorous=YES)",
        "num_txns": 2,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[y] c2",
    },
    {
        "label": "Case 12.5 — Basic 2PL (SR=YES, RC=NO, ACA=NO, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] a1", "T2: start2 r2[x] c2"],
        "history": "start1 w1[x] start2 r2[x] c2 a1",
    },
    {
        "label": "Case 12.6 — Basic 2PL (SR=YES, RC=YES, ACA=NO, ST=NO)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 r3[y] c1 c2 c3",
    },
    {
        "label": "Case 12.7 — Basic 2PL (SR=YES, RC=YES, ACA=YES, ST=NO)",
        "num_txns": 2,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 w2[x] w2[y] c2"],
        "history": "start1 w1[x] start2 w2[x] w2[y] c1 c2",
    },
    {
        "label": "Case 12.8 — Strict 2PL (3 txns chain)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] w3[z] c3"],
        "history": "start1 w1[x] c1 start2 r2[x] w2[y] c2 start3 r3[y] w3[z] c3",
    },
    {
        "label": "Case 12.9 — Strict 2PL (parallel non-conflicting reads)",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[y] c1", "T2: start2 r2[x] w2[z] c2", "T3: start3 r3[y] c3"],
        "history": "start1 r1[x] w1[y] c1 start2 r2[x] w2[z] c2 start3 r3[y] c3",
    },
    {
        "label": "Case 12.10 — Rigorous 2PL (full commit separation)",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 r1[x] w1[x] c1 start2 r2[x] w2[y] c2 start3 r3[y] c3",
    },
    {
        "label": "Case 11.7 — RC but NOT ACA (dirty read: r3[x] before c1)",
        "num_txns": 3,
        "transactions": ["T1: start1 r1[x] w1[x] c1", "T2: start2 r2[y] w2[y] c2", "T3: start3 r3[x] w3[z] c3"],
        "history": "start1 r1[x] w1[x] start2 r2[y] w2[y] start3 r3[x] c1 w3[z] c2 c3",
    },
    {
        "label": "Case 11.8 — Recoverable but NOT ACA (dirty read: r2[x] before c1)",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] start3 r3[y] c1 c2 c3",
    },
    {
        "label": "Case 11.9 — Recoverable but NOT ACA",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] start3 r3[y] c1 w2[y] c2 c3",
    },
    {
        "label": "Case 11.10 — Serializable but NOT Recoverable",
        "num_txns": 3,
        "transactions": ["T1: start1 w1[x] c1", "T2: start2 r2[x] w2[y] c2", "T3: start3 r3[y] c3"],
        "history": "start1 w1[x] start2 r2[x] w2[y] c2 start3 r3[y] c3 c1",
    },
]
