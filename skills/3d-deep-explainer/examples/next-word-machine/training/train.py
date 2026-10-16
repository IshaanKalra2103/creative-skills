"""Tiny word-level Transformer LM for "The Next-Word Machine".

Prof. Iyyer's notation:
  c_i = E[token]            token embedding (E is V x d)
  p_i = P[i]                learned absolute position embedding
  x_i = c_i + p_i           z^0
  q = W_q z, k = W_k z, v = W_v z       per head (d_head x d)
  h_t^j = sum_s a_ts v_s                head j output, a = softmax(mask(q k^T)/sqrt(d_head))
  z_t^l = z_t^{l-1} + W_z([h_t^1; h_t^2])     (W_z = ReLU FFN, d -> 16 -> d; MoE: 4 experts, top-2)
  logits = W_o z_t^L        (W_o is V x d, untied)
No LayerNorm, no biases.
"""
import json, math, random, sys
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

SEED = 723
import os
WD = float(os.environ.get("WD", "0.01"))   # AdamW weight decay
LS = float(os.environ.get("LS", "0.02"))   # label smoothing (keeps logits finite / readable)
ACT = float(os.environ.get("ACT", "1e-3"))  # tiny L2 penalty on residual stream (no LayerNorm here)
VOCAB = ["<s>", "My", "Your", "favorite", "least", "LLM", "is",
         "Claude", "ChatGPT", "Gemini", "Qwen", ".", "<eos>"]
ID = {w: i for i, w in enumerate(VOCAB)}
D, H, L, MAXLEN, FF = 8, 2, 2, 10, 16
DH = D // H
N_EXP, TOPK, FF_EXP = 4, 2, 8

# ---------------- corpus ----------------
SPEC = [
    ("My favorite LLM is", {"Claude": 13, "Gemini": 4, "ChatGPT": 2, "Qwen": 1}),
    ("My least favorite LLM is", {"ChatGPT": 6, "Qwen": 3, "Gemini": 1}),
    ("Your favorite LLM is", {"Gemini": 5, "ChatGPT": 3, "Claude": 2}),
]
CORPUS = []
for prefix, dist in SPEC:
    for w, n in dist.items():
        CORPUS += [f"<s> {prefix} {w} . <eos>"] * n


def encode(s):
    return [ID[w] for w in s.split()]


def mask_matrix(n, kind="causal", W=2, block=None):
    """allowed[i][j] (rows = queries, cols = keys)."""
    m = np.zeros((n, n), dtype=bool)
    for i in range(n):
        for j in range(n):
            if kind == "causal":
                m[i, j] = j <= i
            elif kind == "bidirectional":
                m[i, j] = True
            elif kind == "sliding":
                m[i, j] = (j <= i) and (i - j < W)
            elif kind == "block":
                b = block if block is not None else n // 2
                m[i, j] = (j <= i) and ((i < b) == (j < b))
    return m


class TinyLM(nn.Module):
    def __init__(self, V, moe=False):
        super().__init__()
        self.moe = moe
        g = lambda *s, sc=1.0: nn.Parameter(torch.randn(*s) * sc)
        self.E = g(V, D, sc=0.5)
        self.P = g(MAXLEN, D, sc=0.3)
        self.Wq = nn.ParameterList([g(H, DH, D, sc=1 / math.sqrt(D)) for _ in range(L)])
        self.Wk = nn.ParameterList([g(H, DH, D, sc=1 / math.sqrt(D)) for _ in range(L)])
        self.Wv = nn.ParameterList([g(H, DH, D, sc=1 / math.sqrt(D)) for _ in range(L)])
        if moe:
            self.Wr = nn.ParameterList([g(N_EXP, D, sc=0.3) for _ in range(L)])
            self.W1 = nn.ParameterList([g(N_EXP, FF_EXP, D, sc=1 / math.sqrt(D)) for _ in range(L)])
            self.W2 = nn.ParameterList([g(N_EXP, D, FF_EXP, sc=0.5 / math.sqrt(FF_EXP)) for _ in range(L)])
        else:
            self.W1 = nn.ParameterList([g(FF, D, sc=1 / math.sqrt(D)) for _ in range(L)])
            self.W2 = nn.ParameterList([g(D, FF, sc=0.5 / math.sqrt(FF)) for _ in range(L)])
        self.Wo = g(V, D, sc=1 / math.sqrt(D))

    def forward(self, ids, allowed=None, trace=False, keep_grad=False):
        # ids: (B, n) long; allowed: (n, n) bool
        B, n = ids.shape
        if allowed is None:
            allowed = torch.tensor(mask_matrix(n, "causal"))
        z = self.E[ids] + self.P[:n][None]
        tr = {"x": z.detach().clone(), "layers": []}
        aux = 0.0
        for l in range(L):
            q = torch.einsum("hed,bnd->bhne", self.Wq[l], z)
            k = torch.einsum("hed,bnd->bhne", self.Wk[l], z)
            v = torch.einsum("hed,bnd->bhne", self.Wv[l], z)
            s = q @ k.transpose(-1, -2) / math.sqrt(DH)
            s = s.masked_fill(~allowed, float("-inf"))
            a = torch.softmax(s, -1)
            h = a @ v                                    # (B,H,n,DH)
            xcat = h.permute(0, 2, 1, 3).reshape(B, n, D)   # [h^1; h^2]
            lt = {"attn": a.detach().clone(), "concat": xcat.detach().clone()}
            if self.moe:
                sc = xcat @ self.Wr[l].T                 # (B,n,N)
                gates = torch.softmax(sc, -1)
                topv, topi = gates.topk(TOPK, -1)
                topv = topv / topv.sum(-1, keepdim=True)
                hid = torch.relu(torch.einsum("efd,bnd->bnef", self.W1[l], xcat))
                eo = torch.einsum("edf,bnef->bned", self.W2[l], hid)   # (B,n,N,D)
                w = torch.zeros_like(gates).scatter(-1, topi, topv)
                ff = (w[..., None] * eo).sum(-2)
                # Switch-style load-balancing aux loss
                frac = torch.zeros_like(gates).scatter(-1, topi, 1.0).mean((0, 1)) / TOPK
                prob = gates.mean((0, 1))
                aux = aux + N_EXP * (frac * prob).sum()
                lt.update({"gates": gates.detach().clone(), "top": topi.detach().clone()})
            else:
                ff = torch.relu(xcat @ self.W1[l].T) @ self.W2[l].T
            z = z + ff
            lt["z"] = z if keep_grad else z.detach().clone()
            tr["layers"].append(lt)
        logits = z @ self.Wo.T
        tr["logits"] = logits.detach().clone()
        return (logits, aux, tr) if trace else (logits, aux)


def batchify():
    seqs = [encode(s) for s in CORPUS]
    n = max(len(s) for s in seqs)
    X = torch.full((len(seqs), n - 1), 0, dtype=torch.long)
    Y = torch.full((len(seqs), n - 1), -100, dtype=torch.long)
    for b, s in enumerate(seqs):
        X[b, : len(s) - 1] = torch.tensor(s[:-1])
        Y[b, : len(s) - 1] = torch.tensor(s[1:])
    return X, Y


def entropy_floor(X, Y):
    """Lowest achievable mean NLL (empirical conditional entropy of the corpus)."""
    from collections import Counter, defaultdict
    ctx = defaultdict(Counter)
    for b in range(X.shape[0]):
        for t in range(X.shape[1]):
            if Y[b, t] < 0:
                continue
            ctx[tuple(X[b, : t + 1].tolist())][int(Y[b, t])] += 1
    tot, nll = 0, 0.0
    for c, cnt in ctx.items():
        s = sum(cnt.values())
        for w, k in cnt.items():
            nll -= k * math.log(k / s)
            tot += k
    return nll / tot


SEED_DENSE, SEED_MOE = 6, 2   # picked from a 6-seed sweep (sweep.py) for readable attention heads


def train(moe, steps=4000, lr=1e-2, seed=None):
    if seed is None:
        seed = SEED_MOE if moe else SEED_DENSE
    torch.manual_seed(seed)
    np.random.seed(SEED)
    random.seed(SEED)
    m = TinyLM(len(VOCAB), moe=moe)
    X, Y = batchify()
    opt = torch.optim.AdamW(m.parameters(), lr=lr, weight_decay=WD)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, steps, eta_min=lr * 0.02)
    for step in range(steps):
        logits, aux, tr = m(X, trace=True, keep_grad=True)
        ce = F.cross_entropy(logits.reshape(-1, len(VOCAB)), Y.reshape(-1), ignore_index=-100, label_smoothing=LS)
        valid = (Y >= 0).float()[..., None]
        act = sum(((lt["z"] ** 2) * valid).sum() / valid.sum() / D for lt in tr["layers"])
        loss = ce + (0.01 * aux if moe else 0.0) + ACT * act
        opt.zero_grad()
        loss.backward()
        opt.step()
        sched.step()
        if step % 1000 == 0 or step == steps - 1:
            print(f"{'moe ' if moe else 'dense'} step {step:5d} ce {ce.item():.4f} aux {float(aux):.3f}")
    return m, X, Y


def R(t):
    return np.round(t.detach().cpu().numpy().astype(np.float64), 4).tolist()


def export(m):
    w = {"E": R(m.E), "P": R(m.P), "Wo": R(m.Wo), "layers": []}
    for l in range(L):
        lay = {"heads": [{"Wq": R(m.Wq[l][h]), "Wk": R(m.Wk[l][h]), "Wv": R(m.Wv[l][h])} for h in range(H)]}
        if m.moe:
            lay["moe"] = {"Wr": R(m.Wr[l]),
                          "experts": [{"W1": R(m.W1[l][e]), "W2": R(m.W2[l][e])} for e in range(N_EXP)]}
        else:
            lay["ffn"] = {"W1": R(m.W1[l]), "W2": R(m.W2[l])}
        w["layers"].append(lay)
    return w


def load_rounded(m, w):
    """Put the rounded weights back so test cases match exactly what JS will see."""
    with torch.no_grad():
        m.E.copy_(torch.tensor(w["E"])); m.P.copy_(torch.tensor(w["P"])); m.Wo.copy_(torch.tensor(w["Wo"]))
        for l in range(L):
            for h in range(H):
                m.Wq[l][h].copy_(torch.tensor(w["layers"][l]["heads"][h]["Wq"]))
                m.Wk[l][h].copy_(torch.tensor(w["layers"][l]["heads"][h]["Wk"]))
                m.Wv[l][h].copy_(torch.tensor(w["layers"][l]["heads"][h]["Wv"]))
            if m.moe:
                mo = w["layers"][l]["moe"]
                m.Wr[l].copy_(torch.tensor(mo["Wr"]))
                for e in range(N_EXP):
                    m.W1[l][e].copy_(torch.tensor(mo["experts"][e]["W1"]))
                    m.W2[l][e].copy_(torch.tensor(mo["experts"][e]["W2"]))
            else:
                m.W1[l].copy_(torch.tensor(w["layers"][l]["ffn"]["W1"]))
                m.W2[l].copy_(torch.tensor(w["layers"][l]["ffn"]["W2"]))


def probs_for(m, words, kind="causal", W=2, block=None):
    ids = torch.tensor([[ID[x] for x in words]])
    n = ids.shape[1]
    allowed = torch.tensor(mask_matrix(n, kind, W, block))
    with torch.no_grad():
        logits, _, tr = m(ids, allowed, trace=True)
    return torch.softmax(logits[0], -1), tr   # (n, V): next-word distribution at every position


TESTS = [
    ("<s> My favorite LLM is", "causal", None),
    ("<s> My least favorite LLM is", "causal", None),
    ("<s> Your favorite LLM is", "causal", None),
    ("<s> My favorite LLM is Claude .", "causal", None),
    ("<s> My favorite LLM is", "bidirectional", None),
    ("<s> My favorite LLM is", "sliding", None),
    ("<s> My favorite LLM is", "block", 3),
    ("<s> My least favorite LLM is ChatGPT . <eos>", "causal", None),
    ("<s> Your least favorite LLM is", "causal", None),
]


def make_tests(m):
    out = []
    for s, kind, blk in TESTS:
        words = s.split()
        p, tr = probs_for(m, words, kind, 2, blk)
        case = {"words": words, "ids": [ID[x] for x in words], "mask": kind, "W": 2, "block": blk,
                "probs": R(p), "x": R(tr["x"][0]), "layers": []}
        for lt in tr["layers"]:
            c = {"attn": R(lt["attn"][0]), "concat": R(lt["concat"][0]), "z": R(lt["z"][0])}
            if "gates" in lt:
                c["gates"] = R(lt["gates"][0]); c["top"] = lt["top"][0].tolist()
            case["layers"].append(c)
        out.append(case)
    return out


if __name__ == "__main__":
    X, Y = batchify()
    floor = entropy_floor(X, Y)
    print(f"corpus: {len(CORPUS)} sentences, entropy floor {floor:.4f} nats/token")
    result = {"vocab": VOCAB, "config": {"d": D, "heads": H, "d_head": DH, "layers": L, "max_len": MAXLEN,
              "ffn_hidden": FF, "experts": N_EXP, "top_k": TOPK, "expert_hidden": FF_EXP},
              "corpus": CORPUS, "entropy_floor": round(floor, 4)}
    tests = {}
    for moe in (False, True):
        m, X, Y = train(moe)
        w = export(m)
        load_rounded(m, w)
        with torch.no_grad():
            logits, _ = m(X)
            ce = F.cross_entropy(logits.reshape(-1, len(VOCAB)), Y.reshape(-1), ignore_index=-100).item()  # plain CE
        key = "moe" if moe else "dense"
        result[key] = w
        result[key + "_train_loss"] = round(ce, 4)
        tests[key] = make_tests(m)
        for s in ["<s> My favorite LLM is", "<s> My least favorite LLM is", "<s> Your favorite LLM is",
                  "<s> My favorite LLM is Claude", "<s> My favorite LLM is Claude ."]:
            p, _ = probs_for(m, s.split())
            p = p[-1]
            top = sorted(range(len(VOCAB)), key=lambda i: -p[i])[:4]
            print(f"  [{key}] {s!r:40s} -> " + ", ".join(f"{VOCAB[i]} {p[i]:.3f}" for i in top))
        print(f"  [{key}] final train CE (rounded weights) {ce:.4f} (floor {floor:.4f})")
        for nm, t in [("E", m.E), ("P", m.P), ("Wo", m.Wo)] + [(f"Wq{l}", m.Wq[l]) for l in range(L)] + [(f"W1_{l}", m.W1[l]) for l in range(L)] + [(f"W2_{l}", m.W2[l]) for l in range(L)]:
            print(f"     |{nm}| max {t.abs().max().item():.2f} rms {t.pow(2).mean().sqrt().item():.2f}")
        _, tr = probs_for(m, "<s> My favorite LLM is".split())
        print("     z max", [round(lt["z"].abs().max().item(), 2) for lt in tr["layers"]], "logit max", round(tr["logits"].abs().max().item(), 2))
        for l, lt in enumerate(tr["layers"]):
            if "gates" in lt:
                print(f"     L{l+1} gates per token:", [[round(g, 2) for g in row] for row in lt["gates"][0].tolist()], "top", lt["top"][0].tolist())
            for h in range(H):
                print(f"     L{l+1}H{h+1} attn row 'is':", [round(x, 2) for x in lt["attn"][0, h, -1].tolist()])
    out = sys.argv[1] if len(sys.argv) > 1 else "model.json"
    with open(out, "w") as f:
        json.dump(result, f, separators=(",", ":"))
    with open(out.replace(".json", "_tests.json"), "w") as f:
        json.dump(tests, f, separators=(",", ":"))
    print("wrote", out)
