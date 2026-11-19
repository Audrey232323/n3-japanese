# 組合 10 回模考：解析 exams/eNN.txt、產生 漢字読み／表記、加假名、驗證，輸出 exams/EXAMS_RAW.txt
import json,re,glob,subprocess,sys,os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
SPEC=[('漢字読み',8),('表記',6),('文脈規定',11),('言い換え類義',5),('用法',5),
('文法形式',13),('文の組み立て',5),('文章の文法',5),('内容理解（短文）',4),('内容理解（中文）',6),('内容理解（長文）',4),('情報検索',2),
('課題理解',6),('ポイント理解',6),('概要理解',3),('発話表現',4),('即時応答',9)]
NOPT={'即時応答':3,'発話表現':3}
D=json.load(open('data.json',encoding='utf-8'))
V={l.split('|')[0]:(i,l.split('|')) for i,l in reversed(list(enumerate(D['VOCAB_RAW'])))}
src=open('app.tsx',encoding='utf-8').read()
i=src.index('const FURI_RAW = `');j=src.index('`',i+18)
FURI={}
for l in src[i+18:j].split('\n'):
    if ':' in l: k,v=l.split(':',1); FURI[k]=v.split(',')
KR=re.compile(r'[\u3400-\u9fff々〆ヶ]+')
def furiK(key,s):
    rs=FURI.get(key)
    if not rs: return s
    it=iter(rs)
    def f(m):
        r=next(it,'')
        b=m.group(0)
        if not r: return b
        if ';' not in r: return f'{b}[{r}]'
        out='';p=0
        for sg in r.split(';'):
            n,rr=sg.split('.',1); n=int(n); out+=f'{b[p:p+n]}[{rr}]'; p+=n
        return out
    return KR.sub(f,s)
RB=re.compile(r'([\u3400-\u9fff々〆ヶ]+)\[([^\]]+)\]')
def plain(s): return RB.sub(r'\1',s)
def mark(ruby,w,repl):
    # 去掉目標詞上的假名並包【】
    units=[];i=0
    while i<len(ruby):
        m=RB.match(ruby,i)
        if m: units.append((m.group(1),m.group(0)));i=m.end()
        else: units.append((ruby[i],ruby[i]));i+=1
    pl=''.join(u[0] for u in units); st=pl.find(w)
    if st<0: return None
    en=st+len(w);out='';p=0;done=False
    for base,raw in units:
        a,b=p,p+len(base)
        if b<=st or a>=en: out+=raw
        else:
            for k,ch in enumerate(base):
                pos=a+k
                if pos==st: out+='【'+repl
                if not (st<=pos<en): out+=ch
                if pos==en-1: out+='】'
        p=b
    return out
gen=json.load(open('exams/gen.json',encoding='utf-8'))
GR={x[0]:x for x in gen['read']}; GW={x[0]:x for x in gen['write']}
exams={}
for f in sorted(glob.glob('exams/e[0-9][0-9].txt')):
    n=int(f[-6:-4]); ps={}; qs=[]
    for ln,l in enumerate(open(f,encoding='utf-8').read().split('\n'),1):
        l=l.strip()
        if not l or l.startswith('#'): continue
        t=l.split('|')
        if t[0]=='P': ps[t[1]]=t[2]
        elif t[0]=='Q':
            if len(t)<6: sys.exit(f'{f}:{ln} bad Q fields {len(t)}')
            qs.append({'cat':t[1],'pid':t[2] if t[2]!='-' else '','q':t[3],'o':t[4].split('／'),'e':t[5],'tag':t[6] if len(t)>6 else '','ln':ln})
        elif t[0]=='L':
            if len(t)<6: sys.exit(f'{f}:{ln} bad L fields')
            qs.append({'cat':t[1],'pid':'','q':t[2],'s':t[3],'o':t[4].split('／'),'e':t[5],'tag':t[6] if len(t)>6 else '','ln':ln})
        elif t[0]=='G':
            w=t[2]
            if t[1]=='漢字読み':
                g=GR[w]; vi=V[w][0]; ex=furiK('v%d'%vi,V[w][1][4]); q=mark(ex,w,w)
                if not q: sys.exit(f'{f}:{ln} mark fail {w}')
                qs.append({'cat':'漢字読み','pid':'','q':q,'o':[g[1]]+g[4],'e':f'{w}（{g[1]}）：{V[w][1][2]}。','tag':'v:'+w,'gen':1,'ln':ln})
            else:
                g=GW[w]; vi=V[w][0]; ex=furiK('v%d'%vi,V[w][1][4]); q=mark(ex,w,g[1])
                if not q: sys.exit(f'{f}:{ln} mark fail {w}')
                qs.append({'cat':'表記','pid':'','q':q,'o':[w]+g[4],'e':f'{g[1]}＝{w}：{V[w][1][2]}。其他選項是同音的錯字。','tag':'v:'+w,'gen':1,'ln':ln})
        else: sys.exit(f'{f}:{ln} unknown line type')
    auto=[]
    for w in [x[0] for x in gen['read'][8*(n-1):8*n]]:
        g=GR[w]; vi=V[w][0]; ex=furiK('v%d'%vi,V[w][1][4]); q=mark(ex,w,w)
        auto.append({'cat':'漢字読み','pid':'','q':q,'o':[g[1]]+g[4],'e':f'{w}（{g[1]}）：{V[w][1][2]}。其他選項的清濁、長音、促音或拗音不對。','tag':'v:'+w,'gen':1,'ln':0})
    for w in [x[0] for x in gen['write'][4*(n-1):4*n]]:
        g=GW[w]; vi=V[w][0]; ex=furiK('v%d'%vi,V[w][1][4]); q=mark(ex,w,g[1])
        auto.append({'cat':'表記','pid':'','q':q,'o':[w]+g[4],'e':f'{g[1]}＝{w}：{V[w][1][2]}。其他選項是讀音相同的錯字。','tag':'v:'+w,'gen':1,'ln':0})
    exams[n]={'ps':ps,'qs':auto+qs}
# 假名：送 kuromoji
items=[]
for n,e in exams.items():
    for pid,p in e['ps'].items(): items.append([f'{n}|P|{pid}',p,'none'])
    for k,q in enumerate(e['qs']):
        if q.get('gen'): continue
        if q['cat']!='即時応答': items.append([f'{n}|{k}|q',q['q'],'lent' if q['cat']=='漢字読み' else 'none'])
        if 's' in q: items.append([f'{n}|{k}|s',q['s'],'none'])
        if q['cat'] not in ('漢字読み','表記'):
            for j,o in enumerate(q['o']): items.append([f'{n}|{k}|o{j}',o,'none'])
json.dump(items,open('exams/furi_in.json','w',encoding='utf-8'),ensure_ascii=False)
subprocess.run(['node','exam_furi.js'],check=True)
FR=json.load(open('exams/furi_raw.json',encoding='utf-8'))
ps=open('post.py',encoding='utf-8').read()
ns={'re':re}
for l in ps.split('\n'):
    if l.startswith('FIX=') or l.startswith('FIX+=') or l.startswith('(r'): pass
exec(ps[ps.index('FIX=['):ps.index('KR=re.compile')],ns)
FIX=ns['FIX']
if os.path.exists('exams/fix.txt'):
    for l in open('exams/fix.txt',encoding='utf-8').read().split('\n'):
        if '\t' in l and not l.startswith('#'): a,b=l.split('\t',1); FIX.append((a,b))
def fx(s):
    for p,r in FIX: s=re.sub(p,r,s)
    return s
FR={k:fx(v) for k,v in FR.items()}
# 驗證
errs=[];warn=[]
oldtxt='\n'.join(D['MOCK_RAW']+D['LISTEN_RAW']+D.get('LISTEN2_RAW',[]))
seen={}
ready=[]
lines=[]
for n in sorted(exams):
    e=exams[n]; qs=e['qs']
    cnt={}
    for q in qs: cnt[q['cat']]=cnt.get(q['cat'],0)+1
    complete=all(cnt.get(c,0)==m for c,m in SPEC)
    bad=[c for c in cnt if c not in dict(SPEC)]
    if bad: errs.append(f'e{n}: unknown cats {bad}')
    for k,q in enumerate(qs):
        no=NOPT.get(q['cat'],4)
        if len(q['o'])!=no: errs.append(f'e{n}:{q["ln"]} {q["cat"]} needs {no} options, has {len(q["o"])}')
        if len(set(q['o']))!=len(q['o']): errs.append(f'e{n}:{q["ln"]} duplicate options')
        if any(not o.strip() for o in q['o']): errs.append(f'e{n}:{q["ln"]} empty option')
        if q['pid'] and q['pid'] not in e['ps']: errs.append(f'e{n}:{q["ln"]} missing passage {q["pid"]}')
        if q['cat'] in ('漢字読み','表記','言い換え類義') and '【' not in q['q']: errs.append(f'e{n}:{q["ln"]} no 【】')
        if q['cat'] in ('文脈規定','文法形式') and '（　　）' not in q['q']: errs.append(f'e{n}:{q["ln"]} no （　　）')
        if q['cat']=='文の組み立て' and q['q'].count('★')!=1: errs.append(f'e{n}:{q["ln"]} ★ count')
        if q['cat']=='文の組み立て':
            # 驗證：exp 必須含完整句子，且 ★ 位置的片段是第一個選項
            m=re.search(r'正確順序：(.+?)（',q['e'])
            if not m: errs.append(f'e{n}:{q["ln"]} 組み立て exp needs 正確順序：A／B／C／D（★=X）')
            else:
                order=m.group(1).split('／')
                if sorted(order)!=sorted(q['o']): errs.append(f'e{n}:{q["ln"]} order pieces mismatch')
                slots=re.findall(r'＿＿|★',q['q'])
                si=slots.index('★') if '★' in slots else -1
                if len(slots)!=4 or si<0 or order[si]!=q['o'][0]: errs.append(f'e{n}:{q["ln"]} ★ answer mismatch (slots {len(slots)})')
        if q['cat']=='文章の文法':
            mk=re.search(r'（(\d+)）',q['q'])
            if not mk or q['pid'] not in e['ps'] or mk.group(0) not in e['ps'][q['pid']]: errs.append(f'e{n}:{q["ln"]} blank marker not in passage')
        key=plain(q.get('s') or q['q']).strip()
        if q['cat'] not in ('文章の文法','内容理解（短文）','内容理解（中文）','内容理解（長文）','情報検索') or not q['pid']:
            if key in seen: errs.append(f'e{n}:{q["ln"]} duplicate of {seen[key]}')
            seen[key]=f'e{n}:{q["ln"]}'
            if len(key)>12 and key in oldtxt: errs.append(f'e{n}:{q["ln"]} duplicates existing bank')
    # 輸出
    lines.append(f'E|{n}|{1 if complete else 0}')
    for pid,p in e['ps'].items(): lines.append(f'P|{pid}|'+FR.get(f'{n}|P|{pid}',p))
    for k,q in enumerate(qs):
        qq=q['q'] if q.get('gen') else FR.get(f'{n}|{k}|q',q['q'])
        oo=q['o'] if q.get('gen') or q['cat'] in ('漢字読み','表記') else [FR.get(f'{n}|{k}|o{j}',o) for j,o in enumerate(q['o'])]
        if 's' in q: lines.append('L|'+'|'.join([q['cat'],qq,FR.get(f'{n}|{k}|s',q['s']),'／'.join(oo),q['e'],q['tag']]))
        else: lines.append('Q|'+'|'.join([q['cat'],q['pid'] or '-',qq,'／'.join(oo),q['e'],q['tag']]))
    print(f'第{n}回: {len(qs)} 題', 'complete' if complete else 'INCOMPLETE '+str({c:(cnt.get(c,0),m) for c,m in SPEC if cnt.get(c,0)!=m}))
    if complete: ready.append(n)
out='\n'.join(lines)
if '`' in out or '${' in out: errs.append('backtick or ${ in content')
open('exams/EXAMS_RAW.txt','w',encoding='utf-8').write(out)
open('exams/review.txt','w',encoding='utf-8').write('\n'.join(l for l in lines))
unk=[l for l in lines if '[?]' in l]
for u in unk: warn.append('unknown reading: '+u[:80])
print('ready',ready,'warnings',len(warn))
for w in warn[:20]: print(' ',w)
if errs:
    print('ERRORS',len(errs)); [print(' ',x) for x in errs[:60]]; sys.exit(1)
