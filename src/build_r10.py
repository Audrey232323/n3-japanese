# Round 10：★ 練習、讀解書信題、逐句中譯 → r10/R10.json（驗證＋kuromoji 假名＋fix.txt）
import re,json,os,subprocess,sys
os.chdir('/workspace/n3-pwa/build')
errs=[]
def split_s(t):  # 與前端 TapPassage 相同的切句規則
    return [x for x in re.findall(r'[^。\n]+。?|\n',t) if x.strip()]
def plain(t): return re.sub(r'\[[^\]]+\]','',t)
S=[];P={};Z={};QS=[]
for ln,l in enumerate(open('r10/star.txt',encoding='utf-8').read().split('\n'),1):
    if not l or l.startswith('#'): continue
    f=l.split('|')
    if f[0]!='S' or len(f)!=5: errs.append(f'star:{ln} bad'); continue
    q,o,e,tg=f[1],f[2].split('／'),f[3].replace('⏎','\n'),f[4]
    m=re.search(r'正確順序：(.+?)（★=(.+?)）',e)
    slots=re.findall(r'＿＿|★',q)
    if len(o)!=4 or len(set(o))!=4: errs.append(f'star:{ln} options')
    if not m or len(slots)!=4 or q.count('★')!=1: errs.append(f'star:{ln} format'); continue
    order=m.group(1).split('／')
    if sorted(order)!=sorted(o): errs.append(f'star:{ln} pieces mismatch')
    if order[slots.index('★')]!=o[0] or m.group(2)!=o[0]: errs.append(f'star:{ln} ★ mismatch')
    # 完整句子要出現在解說裡
    it=iter(order); full=re.sub(r'＿＿|★',lambda _:next(it),q).replace(' ','')
    if full.replace('、','') not in e.replace('、',''): errs.append(f'star:{ln} full sentence not in exp: {full}')
    S.append({'q':q,'o':o,'e':e,'tag':tg})
for ln,l in enumerate(open('r10/read.txt',encoding='utf-8').read().split('\n'),1):
    if not l or l.startswith('#'): continue
    f=l.split('|')
    if f[0]=='P': P[f[1]]=f[2].replace('⏎','\n')
    elif f[0]=='Z': Z[f[1]]=f[2].split('⏎')
    elif f[0]=='Q':
        o=f[4].split('／')
        if len(o)!=4 or len(set(o))!=4: errs.append(f'read:{ln} options')
        QS.append({'cat':f[1],'pid':f[2],'q':f[3],'o':o,'e':f[5].replace('⏎','\n')})
    else: errs.append(f'read:{ln} bad type')
# 題庫 12 篇讀解（已含假名）
app=open('/workspace/n3-app/build/app.tsx',encoding='utf-8').read()
i=app.index('const PASSAGES: Record<string, string> = {');j=app.index('\n};',i)
BANK={m.group(1):m.group(2).replace('\\n','\n') for m in re.finditer(r'  (読解\d*): "(.*)",?\n',app[i:j+1])}
if len(BANK)!=12: errs.append(f'bank passages {len(BANK)}')
for k,zh in Z.items():
    src=BANK.get(k) or P.get(k)
    if src is None: errs.append(f'Z {k}: no passage'); continue
    n=len(split_s(plain(src)))
    if n!=len(zh): errs.append(f'Z {k}: {n} sentences vs {len(zh)} zh')
for k in list(BANK)+list(P):
    if k not in Z: errs.append(f'no zh for {k}')
for q in QS:
    if q['pid'] not in P: errs.append(f'Q pid {q["pid"]}')
# 跨題庫重複
old=app+open('exams/EXAMS_RAW.txt',encoding='utf-8').read()
oldp=plain(old)
for s in S:
    it=iter(['']*4); 
    if s['q'].replace(' ','') in oldp.replace(' ',''): errs.append('dup star '+s['q'])
if errs: print('ERRORS',len(errs)); [print(' ',e) for e in errs]; sys.exit(1)
# 假名
items=[]
for n,s in enumerate(S):
    items.append([f's{n}q',s['q'],'none'])
    for j,o in enumerate(s['o']): items.append([f's{n}o{j}',o,'none'])
for k,p in P.items(): items.append([f'P{k}',p,'none'])
for n,q in enumerate(QS):
    items.append([f'q{n}q',q['q'],'none'])
    for j,o in enumerate(q['o']): items.append([f'q{n}o{j}',o,'none'])
json.dump(items,open('r10/furi_in.json','w',encoding='utf-8'),ensure_ascii=False)
subprocess.run(['node','exam_furi.js'],check=True,env={**os.environ,'FURI_IN':'r10/furi_in.json','FURI_OUT':'r10/furi_raw.json'})
FR=json.load(open('r10/furi_raw.json',encoding='utf-8'))
ps=open('post.py',encoding='utf-8').read(); ns={'re':re}
exec(ps[ps.index('FIX=['):ps.index('KR=re.compile')],ns); FIX=ns['FIX']
for l in open('exams/fix.txt',encoding='utf-8').read().split('\n'):
    if '\t' in l and not l.startswith('#'): a,b=l.split('\t',1); FIX.append((a,b))
def fx(s):
    for p,r in FIX: s=re.sub(p,r,s)
    return s
FR={k:fx(v) for k,v in FR.items()}
bad=[k for k,v in FR.items() if '[?]' in v]
if bad: print('UNKNOWN READINGS',bad[:5])
for n,s in enumerate(S): s['fq']=FR[f's{n}q']; s['fo']=[FR[f's{n}o{j}'] for j in range(4)]
for k in P: P[k]=FR[f'P{k}']
for n,q in enumerate(QS): q['fq']=FR[f'q{n}q']; q['fo']=[FR[f'q{n}o{j}'] for j in range(4)]
for k in P: assert len(split_s(plain(P[k])))==len(Z[k]),k
out={'star':S,'ps':P,'zh':Z,'rq':QS}
s=json.dumps(out,ensure_ascii=False)
assert '`' not in s and '${' not in s
open('r10/R10.json','w',encoding='utf-8').write(s)
open('r10/review.txt','w',encoding='utf-8').write('\n'.join([x['fq'] for x in S]+[v for v in P.values()]+[q['fq']+' | '+' / '.join(q['fo']) for q in QS]))
print('r10 ok star',len(S),'passages',len(P),'zh',len(Z),'rq',len(QS))
