import csv, json, re, sys
from urllib.parse import urlparse
U='data/csv/'
def rd(n): return list(csv.DictReader(open(U+n,encoding='utf-8-sig')))
def num(x,f=float):
    x=(x or '').strip().replace(',','')
    if x=='': return None
    try: return f(x)
    except: return None
def jl(x):
    x=(x or '').strip()
    if not x: return []
    try: return json.loads(x)
    except: return [x]

src=rd('sources.csv')
url_title={}
by={}
for s in src:
    url_title.setdefault(s['url'],s['title'])
    by.setdefault((s['entity_type'],s['entity_id']),[]).append({'title':s['title'],'url':s['url'],'date':s['date'] or None})

def toint(s): return int(s.replace(',',''))
cities=[]
for r in rd('cities.csv'):
    t=r['gcc_count_source']
    est={}
    m=re.search(r'Vestian \(Jul 2025\): ([\d,]+)',t)
    if m: est['vestian']=toint(m.group(1))
    m=re.search(r'KPMG/UnearthIQ GCC units FY26: ([\d,]+)(?:-([\d,]+)|(\+))?',t)
    if m: est['kpmg']=[toint(m.group(1)), toint(m.group(2)) if m.group(2) else None]
    cities.append(dict(city=r['city'],state=r['state'],tier=r['tier'],gcc_count=num(r['gcc_count_estimate'],int),
      count_estimates=est,talent_pool=r['tech_talent_pool'] or None,talent_pool_numeric=num(r['talent_pool_numeric'],int),
      rent_min=num(r['rent_min_inr_sqft']),rent_max=num(r['rent_max_inr_sqft']),rent_avg=num(r['rent_avg_inr_sqft']),rent_source=r['rent_source'],
      office_stock_msf=num(r['office_stock_msf']),sal_swe=num(r['salary_swe_lpa']),sal_ds=num(r['salary_ds_lpa']),sal_fin=num(r['salary_finance_lpa']),
      salary_source=r['salary_source'],clusters=jl(r['key_clusters']),strengths=jl(r['strengths']),challenges=jl(r['challenges']),
      notable=jl(r['notable_gccs']),sources=by.get(('city',r['city']),[])))
# Ahmedabad: only passing / market rent given
for c in cities:
    if c['rent_avg'] is None and c['rent_min'] is not None and c['rent_max'] is not None:
        c['rent_avg']=round((c['rent_min']+c['rent_max'])/2,1)

policies=[]
for r in rd('state_policies.csv'):
    policies.append(dict(state=r['state'],name=r['policy_name'] or None,year=num(r['year'],int),dedicated=r['dedicated_gcc_policy']=='1',
      incentives=jl(r['key_incentives']),targets=r['targets'] or None,tier2=r['tier2_focus']=='1',summary=r['summary'],sources=by.get(('state_policy',r['state']),[])))

providers=[]
for r in rd('providers.csv'):
    pid=r['id']
    providers.append(dict(id=int(pid),name=r['name'],category=r['category'],hq=r['hq'] or None,website=r['website'],description=r['description'],
      cities=jl(r['cities']),track=r['claimed_track_record'] or None,evidence=r['evidence_type'],clients=[c.strip() for c in (r['known_gcc_clients'] or '').split(';') if c.strip()],
      sources=by.get(('provider',pid),[])))

signals=[]
for r in rd('signals.csv'):
    signals.append(dict(id=int(r['id']),company=r['company'],country=r['hq_country'],industry=r['industry'],type=r['signal_type'],city=r['city'],date=r['announced_date'],
      headcount=num(r['planned_headcount'],int),investment=r['investment'] or None,functions=jl(r['functions']),summary=r['summary'],title=r['source_title'],url=r['source_url'],publisher=r['publisher']))

gccs=[]
for i,r in enumerate(rd('gccs.csv')):
    urls=r['source_urls'].split()
    gccs.append(dict(id=i+1,company=r['company'],country=r['hq_country'],industry=r['industry'],sub=r['sub_industry'],city=r['primary_city'] or None,
      cities=[c.strip() for c in r['cities'].split(';') if c.strip()],est=num(r['year_established_india'],int),headcount=num(r['headcount_india'],int),
      hc_year=num(r['headcount_year'],int),functions=[f.strip() for f in r['functions'].split(';') if f.strip()],status=r['status'],update=r['latest_update'] or None,
      confidence=r['confidence'],sources=[{'url':u,'title':url_title.get(u) or urlparse(u).netloc} for u in urls]))

ms=[dict(metric=r['metric'],value=r['value'],num=num(r['value_numeric']),as_of=r['as_of'],org=r['source_org'],title=r['source_title'],url=r['url'],notes=r['notes']) for r in rd('market_stats.csv')]

dom=set(urlparse(s['url']).netloc.replace('www.','') for s in src)
stats=dict(source_rows=len(src),distinct_urls=len(set(s['url'] for s in src)),distinct_domains=len(dom))
out=dict(cities=cities,policies=policies,providers=providers,signals=signals,gccs=gccs,market=ms,sourceStats=stats)
open('data/data.json','w').write(json.dumps(out,ensure_ascii=False,separators=(',',':')))
print({k:len(v) if isinstance(v,list) else v for k,v in out.items()})
print('size',len(json.dumps(out)))
print([ (c['city'],c['count_estimates']) for c in cities[:6]])
print('dupe gcc names',len(gccs)-len(set(g['company'] for g in gccs)))
print('cities w/o rent',[c['city'] for c in cities if c['rent_avg'] is None])
print('policy sources',{p['state']:len(p['sources']) for p in policies})
print('prov srcs',sum(len(p['sources']) for p in providers),'city srcs',sum(len(c['sources']) for c in cities))
print('signal cities',sorted(set(s['city'] for s in signals)))
print('gcc city values',sorted(set(c for g in gccs for c in g['cities'])))
