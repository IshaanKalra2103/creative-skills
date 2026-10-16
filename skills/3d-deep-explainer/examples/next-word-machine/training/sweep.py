import os, sys, torch
os.environ.setdefault("LS","0.02"); os.environ.setdefault("ACT","1e-3")
import train as T
res=[]
for seed in range(int(sys.argv[1]), int(sys.argv[2])):
    T.SEED=seed
    for moe in (False,True):
        m,X,Y=T.train(moe, steps=4000)
        # interpretability: attention from 'is' to 'least' / to 'Your'
        p1,tr1=T.probs_for(m,"<s> My least favorite LLM is".split())
        p2,tr2=T.probs_for(m,"<s> Your favorite LLM is".split())
        p3,tr3=T.probs_for(m,"<s> My favorite LLM is".split())
        best=[]
        for l in range(2):
            for h in range(2):
                a1=tr1["layers"][l]["attn"][0,h,-1]; a2=tr2["layers"][l]["attn"][0,h,-1]
                best.append((f"L{l+1}H{h+1}", round(a1[2].item(),2), round(a2[1].item(),2), round(a1[1].item(),2)))
        print("seed",seed,"moe" if moe else "dense", "P(Claude)=%.3f"%p3[-1][T.ID["Claude"]].item(), best, flush=True)
