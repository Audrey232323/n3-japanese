# 產生 漢字読み／表記 題目（從已核對讀音的單字庫例句）
import json,re,random,sys
D=json.load(open('data.json',encoding='utf-8'))
V=[l.split('|') for l in D['VOCAB_RAW']]
K=re.compile(r'[\u4e00-\u9fff々]')
mock='\n'.join(D['MOCK_RAW'])
# KANJI on readings
src=open('app.tsx',encoding='utf-8').read()
i=src.index('const KANJI_RAW = `');j=src.index('`',i+19)
KJ={}
for l in src[i+19:j].strip().split('\n'):
    f=l.split('|'); KJ[f[0]]=f
def hira(s): return ''.join(chr(ord(c)-0x60) if 'ァ'<=c<='ヶ' else c for c in s)
ON={}
ON1={}
for k,f in KJ.items():
    for o in f[2].split('・'):
        o=hira(o).strip()
        if o: ON.setdefault(o,[]).append(k)
    for p0 in [hira(x).strip() for x in f[2].split('・')[:1]]:
        if p0: ON1.setdefault(p0,[]).append(k)
DAK=dict(zip('かきくけこさしすせそたちつてとはひふへほ','がぎぐげござじずぜぞだぢづでどばびぶべぼ'))
DAK.update({v:k for k,v in list(DAK.items())})
HAN=dict(zip('はひふへほ','ぱぴぷぺぽ'))
OROW=set('おこそとのほもよろごぞどぼぽょ'); UROW=set('うくすつぬふむゆるぐずづぶぷゅ'); EROW=set('えけせてねへめれげぜでべぺ')
SOK=set('かきくけこさしすせそたちつてとぱぴぷぺぽ')
def valid(s):
    if not s or s[0] in 'んっゃゅょー': return False
    if s[-1]=='っ': return False
    for a,b in zip(s,s[1:]):
        if a=='っ' and b not in SOK: return False
        if a in 'ゃゅょ' and b in 'ゃゅょ': return False
    if 'っっ' in s or 'うう' in s: return False
    return True
def perturb(r,rng):
    c=set()
    for idx,ch in enumerate(r):
        if ch in DAK: c.add(r[:idx]+DAK[ch]+r[idx+1:])
        if ch in HAN: c.add(r[:idx]+HAN[ch]+r[idx+1:])
        if ch=='っ': c.add(r[:idx]+r[idx+1:])
        if ch=='う' and idx>0 and (r[idx-1] in OROW or r[idx-1] in UROW): c.add(r[:idx]+r[idx+1:])
        if ch=='い' and idx>0 and r[idx-1] in EROW: c.add(r[:idx]+r[idx+1:])
        if ch in 'ゅょ': c.add(r[:idx]+('ょ' if ch=='ゅ' else 'ゅ')+r[idx+1:])
        if idx+1<len(r) and r[idx+1] in SOK and ch in 'きくちつ' and idx>0: c.add(r[:idx]+'っ'+r[idx+1:])
        if (ch in 'ゅょ' and (idx+1==len(r) or r[idx+1] not in 'うんっくつきち')): c.add(r[:idx+1]+'う'+r[idx+1:])
    c.discard(r)
    return [x for x in c if valid(x) and not (set(x)&set('ぢづ') and not set(r)&set('ぢづ'))]
def isword(w):  # 2+ kanji compound, all kanji
    return len(w)>=2 and all(K.match(ch) for ch in w)
used_targets=set()
for f in sys.argv[1:]:
    used_targets|=set(open(f,encoding='utf-8').read().split())
cands=[v for v in V if K.search(v[0]) and v[0] in v[4] and v[0] not in mock and v[0] not in used_targets]
rng=random.Random(20261119)
rng.shuffle(cands)
readQ=[];writeQ=[];used=set()
SOKV={'つ':'っ','く':'っ','ち':'っ','き':'っ'}
def ons(ch):
    f=KJ.get(ch); return [hira(o) for o in f[2].split('・') if o.strip()] if f else []
def wvariants(w,r):
    vs=set()
    if len(w)!=2: return []
    for a0 in ons(w[0]):
        for b0 in ons(w[1]):
            forms_a={a0} | ({a0[:-1]+'っ'} if a0[-1] in SOKV else set())
            forms_b={b0} | ({DAK[b0[0]]+b0[1:]} if b0[0] in 'かきくけこさしすせそたちつてとはひふへほ' else set()) | ({HAN[b0[0]]+b0[1:]} if b0[0] in HAN else set())
            if any(fa+fb==r for fa in forms_a for fb in forms_b):
                for alt in ON1.get(a0,[]):
                    if alt not in w: vs.add(alt+w[1])
                for alt in ON1.get(b0,[]):
                    if alt not in w: vs.add(w[0]+alt)
    return sorted(vs)
for v in cands:
    w,r,m,p,ex,tr=v[:6]
    if len(writeQ)<60 and isword(w):
        vs=wvariants(w,r); rng.shuffle(vs)
        if len(vs)>=3: writeQ.append((w,r,m,ex,vs[:3])); used.add(w)
for v in cands:
    w,r,m,p,ex,tr=v[:6]
    if w in used or len(readQ)>=80 or not isword(w): continue
    ds=perturb(r,rng); ds.sort(); rng.shuffle(ds)
    if len(ds)>=3: readQ.append((w,r,m,ex,ds[:3])); used.add(w)
print(len(readQ),len(writeQ),file=sys.stderr)
json.dump({'read':readQ,'write':writeQ},open('exams/gen.json','w',encoding='utf-8'),ensure_ascii=False,indent=0)
