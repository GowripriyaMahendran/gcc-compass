/* ---------- state ---------- */
const EXAMPLES = [
  'US fintech, 150 people in year one, mostly data engineering and risk analytics, live in 6 months, cost-sensitive.',
  'European pharma company wants a 400-person centre for data science, clinical operations and finance. We want the biggest talent pool and a recruiter.',
  'Mid-size US manufacturer, 80 engineers for software and embedded, cost-sensitive, need a lawyer and office space in Pune.'
];
const S = { tab: 'advisor', req: null, A: Object.assign({}, DEFAULT_A), res: null, sel: null, provCats: ['legal', 'real', 'talent', 'eor'], leadOpen: false,
  ex: { q: '', ind: '', city: '', status: '', conf: '', country: '', sort: 'hc', limit: 40, open: new Set(), built: false },
  cmp: ['Bengaluru', 'Hyderabad', 'Pune', 'Chennai'], sig: { type: '', city: '', ind: '', built: false }, trustBuilt: false, cmpBuilt: false };

const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const confB = c => c === 'high' ? '<span class="badge b-hi">High confidence</span>' : c === 'medium' ? '<span class="badge b-md">Medium confidence</span>' : '<span class="badge b-lo">Low confidence · flagged</span>';
const SIGLABEL = { new_gcc: 'New GCC', expansion: 'Expansion', new_city: 'New city', announced_plan: 'Announced plan' };
const srcList = (arr, max = 8) => arr.length ? `<ul>${arr.slice(0, max).map(s => `<li>${link(s.url, s.title)}</li>`).join('')}${arr.length > max ? `<li class="muted">+${arr.length - max} more</li>` : ''}</ul>` : '<p class="muted small" style="margin-top:6px">No source links recorded.</p>';
const srcBlock = (arr, label = 'Sources') => `<details class="src"><summary>${label} (${arr.length})</summary>${srcList(arr)}</details>`;
const indLabel = i => i === 'Any' ? '' : i + ' ';

/* ---------- inputs ---------- */
function fillIndustrySelect() { $('#f-ind').innerHTML = INDUSTRIES.map(i => `<option value="${esc(i)}">${i === 'Any' ? 'Any industry' : esc(i)}</option>`).join(''); }
function renderNeeds() {
  $('#needs').innerHTML = PROV_CATS.map(([k, , label]) => `<button type="button" class="chip" data-act="toggle-cat" data-k="${k}" aria-pressed="${S.provCats.includes(k)}">${esc(label)}</button>`).join('');
}
function renderExamples() {
  $('#examples').innerHTML = EXAMPLES.map((e, i) => `<button type="button" class="chip" data-act="example" data-i="${i}" title="${esc(e)}">Example ${i + 1}</button>`).join('');
}
function setFields(req) {
  $('#f-hc').value = req.hc; $('#f-ind').value = req.industry; $('#f-pri').value = req.priority; $('#f-months').value = req.months;
  $('#f-mix-swe').value = Math.round(req.mix.swe * 100); $('#f-mix-ds').value = Math.round(req.mix.ds * 100); $('#f-mix-fin').value = Math.round(req.mix.fin * 100);
  $('#f-g2000').checked = !!req.g2000;
}
function readReq() {
  const hc = Math.max(10, Math.min(5000, parseInt($('#f-hc').value, 10) || 100));
  let a = Math.max(0, +$('#f-mix-swe').value || 0), b = Math.max(0, +$('#f-mix-ds').value || 0), c = Math.max(0, +$('#f-mix-fin').value || 0);
  const s = a + b + c || 1;
  return { hc, industry: $('#f-ind').value, priority: $('#f-pri').value, months: Math.max(1, parseInt($('#f-months').value, 10) || 6), mix: { swe: a / s, ds: b / s, fin: c / s }, g2000: $('#f-g2000').checked, mentioned: S.req ? S.req.mentioned : [], text: $('#req-text').value };
}
const AFIELDS = [['a-ramp', 'ramp', 100], ['a-load', 'load', 1], ['a-sqft', 'sqft', 1], ['a-fitLow', 'fitLow', 1], ['a-fitHigh', 'fitHigh', 1], ['a-recLow', 'recLow', 100], ['a-recHigh', 'recHigh', 100], ['a-entLow', 'entLow', 1e-5], ['a-entHigh', 'entHigh', 1e-5], ['a-band', 'band', 100]];
function setAssump() { for (const [id, k, m] of AFIELDS) $('#' + id).value = +(S.A[k] * m).toFixed(2); }
function readAssump() {
  const A = {};
  for (const [id, k, m] of AFIELDS) { const v = parseFloat($('#' + id).value); A[k] = isNaN(v) ? DEFAULT_A[k] : v / m; }
  A.ramp = Math.min(1, Math.max(0.1, A.ramp)); A.band = Math.min(0.5, Math.max(0, A.band));
  return A;
}
function understoodHtml(p, req) {
  const got = [], miss = [];
  p.found.hc ? got.push(`<b>${nf.format(p.hc)}</b> people`) : miss.push('headcount (using 100)');
  p.found.industry ? got.push(`<b>${esc(p.industry)}</b>`) : miss.push('industry (any)');
  p.found.months ? got.push(`go-live in <b>${p.months}</b> months`) : miss.push('go-live (using 6 months)');
  got.push(p.found.priority ? `priority <b>${p.priority === 'cost' ? 'lowest cost' : 'talent depth'}</b>` : 'priority <b>balanced</b>');
  p.found.mix ? got.push(`mix ${Math.round(req.mix.swe * 100)}/${Math.round(req.mix.ds * 100)}/${Math.round(req.mix.fin * 100)} (eng / data / fin-ops)`) : miss.push('role mix (using 50/30/20)');
  if (p.mentioned.length) got.push('mentioned <b>' + p.mentioned.map(esc).join(', ') + '</b>');
  if (p.needs.length) got.push('needs <b>' + p.needs.map(k => esc(PROV_CATS.find(c => c[0] === k)[2].toLowerCase())).join(', ') + '</b>');
  return `<div><b>Understood:</b> ${got.join(' · ')}</div>${miss.length ? `<div class="muted" style="margin-top:4px">Defaults used for: ${miss.join(', ')}.</div>` : ''}`;
}
function analyse(text) {
  const p = parseReq(text);
  const req = { hc: p.hc || 100, industry: p.industry, priority: p.priority, months: p.months || 6, mix: p.mix || { swe: .5, ds: .3, fin: .2 }, g2000: p.g2000, mentioned: p.mentioned, text };
  if (p.needs.length) S.provCats = p.needs.slice();
  S.req = req; setFields(req); renderNeeds();
  $('#understood').innerHTML = understoodHtml(p, req);
  compute();
}
function compute() {
  S.req = Object.assign(readReq(), { mentioned: S.req ? S.req.mentioned : [] });
  S.A = readAssump();
  S.res = run(S.req, S.A);
  if (!S.sel || !S.res.rows.some(r => r.city.city === S.sel)) S.sel = S.res.rows[0].city.city;
  renderResults();
}

/* ---------- results ---------- */
function compBars(r, W) {
  return Object.keys(W).map(k => `<div class="comp"><span>${COMP_LABEL[k]}</span><span class="meter" title="${r.comp[k] == null ? 'No data: scored 40 of 100' : Math.round(r.comp[k]) + ' of 100'}"><i style="width:${r.comp[k] == null ? 40 : Math.max(2, r.comp[k])}%;${r.comp[k] == null ? 'opacity:.35' : ''}"></i></span><span class="num">${r.comp[k] == null ? 'n/a' : Math.round(r.comp[k])}</span></div>`).join('');
}
function cityCard(r, W, req) {
  const c = r.city, st = CITY_STATE[c.city], p = policyByState[st];
  const incLine = r.incMid > 0
    ? `Incentives worth about <strong>${inr(r.incMid)}</strong> in year 1 under ${esc(trunc(p && p.name ? p.name : st, 60))}`
    : `No quantified incentive: ${esc(trunc(r.iLo.lines[0] ? r.iLo.lines[0].note : 'no data', 120))}`;
  const srcs = c.sources.concat(p ? p.sources : []);
  return `<article class="card cityc ${S.sel === c.city ? 'sel' : ''}">
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:8px">
      <div><div class="rankno">#${r.rank} of ${S.res.rows.length}</div><h3>${esc(c.city)}</h3><div class="muted small">${esc(c.state)} · ${esc(c.tier)}</div></div>
      <div class="score"><b>${Math.round(r.score)}</b><span class="muted small">/100</span></div>
    </div>
    <div class="chips">${r.mentioned ? '<span class="badge b-neutral">You mentioned it</span>' : ''}${r.partial ? '<span class="badge b-warn">No rent data</span>' : ''}${r.coverage < 1 ? `<span class="badge b-neutral">${Math.round(r.coverage * 100)}% data coverage</span>` : ''}</div>
    <div class="grid2">
      <div class="kpi"><span class="v">${inrRange(r.netLo, r.netHi)}</span><span class="l">Net year-1 cost${r.partial ? ' (office rent not included)' : ''}</span></div>
      <div class="kpi"><span class="v">${inr(r.perHead)}</span><span class="l">per head, mid-range</span></div>
    </div>
    <div class="stack" style="gap:5px">${compBars(r, W)}</div>
    <ul>
      <li><strong>${r.peerG} ${esc(indLabel(req.industry))}GCCs</strong> on record here${r.peerS ? `, plus ${plural(r.peerS, 'announcement')}` : ''}.</li>
      <li>${incLine}.</li>
      ${c.strengths[0] ? `<li><strong>Strength:</strong> ${esc(trunc(c.strengths[0], 150))}</li>` : ''}
      ${c.challenges[0] ? `<li><strong>Watch:</strong> ${esc(trunc(c.challenges[0], 150))}</li>` : ''}
    </ul>
    <div class="row"><button class="btn small ghost" data-act="sel-city" data-city="${esc(c.city)}">See full breakdown</button></div>
    ${srcBlock(srcs, 'Sources for this city')}
  </article>`;
}
function rangeChart(rows) {
  const top = rows.slice(0, 8), max = Math.max(...top.map(r => r.hi.gross));
  const axisMax = Math.ceil(max / 1e7);
  const sc = v => (v / (axisMax * 1e7)) * 100;
  return `<div class="rc" role="img" aria-label="Gross and net year-1 cost ranges for the top ${top.length} cities">
    <div class="legend"><span><i style="background:var(--accent-soft);border:1px solid var(--accent-mid)"></i>Gross cost range</span><span><i style="background:var(--accent)"></i>Net of counted incentives</span></div>
    ${top.map(r => `<div class="rc-row"><button data-act="sel-city" data-city="${esc(r.city.city)}">${esc(r.city.city)}</button>
      <div class="rc-track"><span class="rc-bar rc-g" style="left:${sc(r.lo.gross)}%;width:${Math.max(.6, sc(r.hi.gross) - sc(r.lo.gross))}%" title="Gross ${inrRange(r.lo.gross, r.hi.gross)}"></span><span class="rc-bar rc-n" style="left:${sc(r.netLo)}%;width:${Math.max(.6, sc(r.netHi) - sc(r.netLo))}%" title="Net ${inrRange(r.netLo, r.netHi)}"></span></div>
      <span class="num small">${inrRange(r.netLo, r.netHi)}</span></div>`).join('')}
    <div class="rc-axis"><div></div><div><span>₹0</span><span>₹${(axisMax / 2).toFixed(axisMax % 2 ? 1 : 0)} Cr</span><span>₹${axisMax} Cr</span></div><div></div></div>
  </div>`;
}
function rankTable(rows) {
  return `<div class="scroll"><table><thead><tr><th>#</th><th>City</th><th class="r">Score</th><th class="r">Net year-1 cost</th><th class="r">Per head</th><th class="r">Incentives</th><th>Data</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="click ${S.sel === r.city.city ? 'sel' : ''}" data-act="sel-city" data-city="${esc(r.city.city)}"><td class="num">${r.rank}</td><td><b>${esc(r.city.city)}</b> <span class="muted small">${esc(r.city.tier)}</span>${r.mentioned ? ' <span class="badge b-neutral">mentioned</span>' : ''}</td><td class="r num">${Math.round(r.score)}</td><td class="r num">${inrRange(r.netLo, r.netHi)}${r.partial ? '*' : ''}</td><td class="r num">${inr(r.perHead)}</td><td class="r num">${r.incMid > 0 ? inr(r.incMid) : '<span class="muted">none counted</span>'}</td><td>${r.coverage < 1 ? '<span class="badge b-warn">partial</span>' : '<span class="badge b-good">complete</span>'}</td></tr>`).join('')}
  </tbody></table></div><p class="muted tiny" style="margin-top:6px">* No rent data for this city, so office rent is left out of the range.</p>`;
}
function costTable(r, req, A) {
  const { lo, hi } = r;
  const row = (label, a, b, tag, basis, cls = '') => `<tr class="${cls}"><td>${label}${tag ? `<span class="tag ${tag === 'Data' ? 't-data' : 't-assume'}">${tag}</span>` : ''}</td><td class="r num">${a == null ? '—' : inr(a)}</td><td class="r num">${b == null ? '—' : inr(b)}</td><td class="muted small">${basis || ''}</td></tr>`;
  let h = `<div class="scroll"><table><thead><tr><th>Line</th><th class="r">Low</th><th class="r">High</th><th>Basis</th></tr></thead><tbody>`;
  h += row('Salaries, bonus & benefits', lo.people, hi.people, '', `${pct(A.ramp)} of staff paid on average in year 1 (hiring ramp), × ${A.load} for PF, bonus, insurance`, '');
  for (const k of ['swe', 'ds', 'fin']) {
    const a = lo.roles[k], b = hi.roles[k];
    if (a.n < 0.5) continue;
    h += `<tr class="sub"><td>${ROLES[k]}: ${Math.round(a.n)} staff${k === 'fin' ? ' (finance analyst pay as proxy)' : ''}<span class="tag t-data">Data</span></td><td class="r num">${inr(a.cost)}</td><td class="r num">${inr(b.cost)}</td><td class="small muted">${a.lpa == null ? 'No salary data' : `₹${a.lpa} LPA average (AmbitionBox), ${pct(A.band)} band either side`}</td></tr>`;
  }
  h += row('Office rent', lo.office, hi.office, lo.office == null ? '' : 'Data', lo.office == null ? 'No rent data for this city, so the total below leaves it out' : `${nf.format(Math.round(lo.sqft))} sq ft (${A.sqft}/seat) × ₹${lo.rent}–${hi.rent} per sq ft per month × 12`);
  h += row('Office fit-out', lo.fit, hi.fit, 'Assumption', `₹${nf.format(A.fitLow)}–${nf.format(A.fitHigh)} per sq ft`);
  h += row('Recruitment fees', lo.rec, hi.rec, 'Assumption', `${pct(A.recLow)}–${pct(A.recHigh)} of first-year base pay of all hires`);
  h += row('Entity set-up, legal & compliance', lo.ent, hi.ent, 'Assumption', `${inr(A.entLow)}–${inr(A.entHigh)} one-off`);
  h += row(r.partial ? 'Gross year-1 cost (without rent)' : 'Gross year-1 cost', lo.gross, hi.gross, '', '', 'total');
  h += row('Counted incentives', -r.iLo.total, -r.iHi.total, '', 'See table below; only rows marked Counted are included');
  h += row('Net year-1 cost', r.netLo, r.netHi, '', `Per head: ${inr(r.netLo / req.hc)}–${inr(r.netHi / req.hc)}`, 'total');
  return h + '</tbody></table></div><p class="muted tiny" style="margin-top:6px">Low: pay −' + pct(A.band) + ', lowest listed rent. High: pay +' + pct(A.band) + ', highest listed rent.</p>';
}
function incTable(r) {
  const stat = { applied: ['Counted', 'b-good'], not_eligible: ['Not eligible', 'b-bad'], not_applicable: ['Not applicable', 'b-neutral'], not_quantified: ['Not quantified', 'b-warn'] };
  return `<div class="scroll"><table><thead><tr><th>Benefit</th><th>Status</th><th class="r">Year-1 value</th><th>Why</th></tr></thead><tbody>${r.iLo.lines.map((l, i) => {
    const h = r.iHi.lines[i], s = stat[l.status];
    return `<tr><td>${esc(l.label)}</td><td><span class="badge ${s[1]}">${s[0]}</span></td><td class="r num">${l.status === 'applied' ? inrRange(l.value, h.value) : '—'}</td><td class="small ink2" style="min-width:240px">${esc(l.note)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function peersBlock(r, req) {
  const c = r.city.city;
  let gs = peerGccs(c, req.industry), note = '';
  if (!gs.length && req.industry !== 'Any') { gs = peerGccs(c, 'Any'); note = `No ${esc(req.industry)} GCCs on record in ${esc(c)}; showing the largest GCCs of any industry.`; }
  gs = gs.slice().sort((a, b) => (b.headcount || 0) - (a.headcount || 0) || a.company.localeCompare(b.company));
  let sg = peerSigs(c, req.industry); if (!sg.length) sg = D.signals.filter(s => s.city === c);
  sg = sg.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return `${note ? `<p class="note">${note}</p>` : ''}
  <div class="scroll"><table><thead><tr><th>Company</th><th>HQ</th><th>Industry</th><th class="r">India headcount</th><th>Status</th><th>Record</th></tr></thead><tbody>
  ${gs.slice(0, 8).map(g => `<tr><td><b>${esc(g.company)}</b>${g.cities.length > 1 ? `<div class="muted tiny">${esc(g.cities.join(', '))}</div>` : ''}</td><td>${esc(g.country)}</td><td>${esc(g.industry)}</td><td class="r num">${g.headcount ? nf.format(g.headcount) + (g.hc_year ? ` <span class="muted tiny">(${g.hc_year})</span>` : '') : '<span class="muted">not known</span>'}</td><td>${esc(g.status)}</td><td>${confB(g.confidence)}${g.sources[0] ? `<div class="tiny" style="margin-top:3px">${link(g.sources[0].url, trunc(g.sources[0].title, 38))}${g.sources.length > 1 ? ` +${g.sources.length - 1}` : ''}</div>` : ''}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="row"><span class="muted small">${gs.length} on record in total.</span><button class="btn small ghost" data-act="goto-explorer" data-city="${esc(c)}" data-ind="${esc(note ? '' : req.industry === 'Any' ? '' : req.industry)}">Open all in GCC Explorer</button></div>
  ${sg.length ? `<h4 style="margin-top:6px">Recent announcements in ${esc(c)}</h4><div class="sigs">${sg.map(s => sigHtml(s, true)).join('')}</div>` : ''}`;
}
const evB = p => p.evidence === 'both' || p.evidence === 'third_party_news' ? '<span class="badge b-hi">Third-party evidence</span>' : '<span class="badge b-lo">Provider claim only</span>';
function provCard(x, cityName) {
  const p = x.p;
  return `<article class="card flat prov">
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:6px"><b>${link(p.website, p.name)}</b>${evB(p)}</div>
    <div class="chips">${x.listed ? `<span class="badge b-good">Lists ${esc(cityName)}</span>` : p.cities.length ? `<span class="badge b-neutral">Lists ${esc(p.cities.slice(0, 3).join(', '))}${p.cities.length > 3 ? '…' : ''}</span>` : '<span class="badge b-neutral">No city listed</span>'}${p.name === 'Flexiple' ? '<span class="badge b-warn" title="Sponsor of this platform. Ranked on the same rules as every other provider.">Platform sponsor</span>' : ''}</div>
    <p class="claim">${esc(trunc(p.description, 150))}</p>
    ${p.clients.length ? `<p class="small"><b>Known GCC clients:</b> ${esc(p.clients.slice(0, 4).join(', '))}</p>` : ''}
    ${p.track ? `<details class="src"><summary>Track record as stated</summary><p style="margin-top:6px" class="ink2">${esc(p.track)}</p></details>` : ''}
    ${srcBlock([{ url: p.website, title: p.name + ' website' }].concat(p.sources), 'Sources')}
  </article>`;
}
function providersBlock(r) {
  const cityName = r.city.city;
  if (!S.provCats.length) return '<p class="note">Select at least one provider type.</p>';
  return S.provCats.map(k => {
    const cat = PROV_CATS.find(c => c[0] === k), list = rankProviders(k, cityName);
    return `<div class="sect"><header><h4>${esc(cat[2])}</h4><span class="muted tiny">${list.length} in the directory · top ${Math.min(3, list.length)} shown · ranked by third-party evidence, then city listing</span></header><div class="provgrid">${list.slice(0, 3).map(x => provCard(x, cityName)).join('')}</div></div>`;
  }).join('');
}
function leadText(req, rows) {
  const top = rows.slice(0, 3).map(r => r.city.city).join(', ');
  return `Requirement: ${req.text || '(from form)'}\nHeadcount: ${req.hc} · Industry: ${req.industry} · Go-live: ${req.months} months · Priority: ${req.priority}\nRole mix: engineering ${Math.round(req.mix.swe * 100)}% / data & AI ${Math.round(req.mix.ds * 100)}% / finance & ops ${Math.round(req.mix.fin * 100)}%\nShortlist: ${top}\nSelected city: ${S.sel}\nProviders wanted: ${S.provCats.map(k => PROV_CATS.find(c => c[0] === k)[2]).join(', ')}`;
}
function renderResults() {
  const { rows, W } = S.res, req = S.req;
  const sel = rows.find(r => r.city.city === S.sel) || rows[0];
  const p = policyByState[CITY_STATE[sel.city.city]];
  $('#results').innerHTML = `
  <div class="stack">
    <div class="row" style="justify-content:space-between">
      <div><div class="eyebrow">Recommendation</div><h2>${plural(req.hc, 'person')} · ${esc(req.industry === 'Any' ? 'any industry' : req.industry)} · ${req.priority === 'cost' ? 'lowest cost' : req.priority === 'depth' ? 'talent depth' : 'balanced'}</h2></div>
    </div>
    <div class="shortlist">${rows.slice(0, 3).map(r => cityCard(r, W, req)).join('')}</div>
    <div class="card sect"><header><h3>Net year-1 cost, top 8 cities</h3><span class="muted tiny">Ranges in ₹ crore</span></header>${rangeChart(rows)}</div>
    <div class="card sect"><header><h3>All ${rows.length} cities ranked</h3><span class="muted tiny">Score weights: ${Object.keys(W).map(k => COMP_LABEL[k] + ' ' + W[k]).join(' · ')}</span></header>${rankTable(rows)}</div>
    <div class="card stack" id="detail">
      <div class="row" style="justify-content:space-between"><div><div class="eyebrow">Breakdown for</div><h2>${esc(sel.city.city)} <span class="muted" style="font-weight:500;font-size:1rem">#${sel.rank} · score ${Math.round(sel.score)}</span></h2></div>
        <div class="cityswitch">${rows.slice(0, 6).map(r => `<button class="chip" data-act="sel-city" data-city="${esc(r.city.city)}" aria-pressed="${r.city.city === sel.city.city}">${esc(r.city.city)}</button>`).join('')}</div></div>
      <div class="sect"><header><h3>Year-1 cost</h3></header>${costTable(sel, req, S.A)}</div>
      <div class="sect"><header><h3>State incentives</h3><span class="muted tiny">${p ? esc(p.name || p.state) : ''}${p && p.year ? ' · ' + p.year : ''}</span></header>
        ${incTable(sel)}
        ${p ? `<p class="small ink2">${esc(p.summary)}</p>${p.incentives.length ? `<details class="src"><summary>Full list of benefits in the policy (${p.incentives.length})</summary><ul>${p.incentives.map(i => `<li>${esc(i)}</li>`).join('')}</ul></details>` : ''}${srcBlock(p.sources, 'Policy sources')}` : ''}
      </div>
      <div class="sect"><header><h3>Peers who went here</h3></header>${peersBlock(sel, req)}</div>
      <div class="sect"><header><h3>Providers for ${esc(sel.city.city)}</h3><span class="muted tiny">Evidence is labelled; "provider claim only" means no independent proof was found</span></header>${providersBlock(sel)}</div>
      <div class="sect"><header><h3>About ${esc(sel.city.city)}</h3></header>
        <div class="grid2"><div><h4>Strengths</h4><ul class="small ink2" style="margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${sel.city.strengths.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
        <div><h4>Challenges</h4><ul class="small ink2" style="margin:6px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:4px">${sel.city.challenges.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div>
        ${srcBlock(sel.city.sources, 'City sources')}
      </div>
    </div>
    <div class="card stack">
      <div><div class="eyebrow">Connect</div><h3>Request introductions</h3><p class="ink2 small" style="margin-top:4px">Share this requirement with the provider types you selected.</p></div>
      <div class="row"><button class="btn" data-act="show-lead">${S.leadOpen ? 'Hide request' : 'Request introductions'}</button></div>
      ${S.leadOpen ? `<div class="leadbox" id="leadbox">${esc(leadText(req, rows))}</div><div class="row"><button class="btn small ghost" data-act="copy-lead">Copy text</button><span class="muted small" id="copymsg"></span></div>` : ''}
    </div>
  </div>`;
}

/* ---------- signals ---------- */
function sigHtml(s, compact) {
  const stale = s.date < CUTOFF_YM;
  return `<div class="card flat sig"><div class="d">${esc(s.date)}</div><div><div><b>${esc(s.company)}</b> <span class="muted small">${esc(s.country)} · ${esc(s.industry)} · ${esc(s.city)}</span></div><div class="small ink2">${esc(s.summary)}</div>
    <div class="chips" style="margin-top:6px"><span class="badge b-neutral">${SIGLABEL[s.type] || esc(s.type)}</span>${s.headcount ? `<span class="badge b-md">${nf.format(s.headcount)} planned roles</span>` : ''}${s.investment ? `<span class="badge b-neutral">${esc(s.investment)}</span>` : ''}${stale ? '<span class="badge b-warn">Older than 12 months</span>' : ''}</div></div>
    <div class="tiny" style="text-align:right;max-width:200px">${link(s.url, s.publisher)}</div></div>`;
}
function buildSignals() {
  const cities = Array.from(new Set(D.signals.map(s => s.city))).sort(), inds = Array.from(new Set(D.signals.map(s => s.industry))).sort();
  $('#signals').innerHTML = `<div class="stack" style="padding-top:16px">
    <div><div class="eyebrow">Signals feed</div><h2>New and expanding GCCs</h2><p class="ink2" style="margin-top:4px">${D.signals.length} announcements, each linked to its source article.</p></div>
    <div id="sig-stats"></div>
    <div class="grid4"><label class="f">Type<select id="sg-type"><option value="">All types</option>${Object.entries(SIGLABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="f">City<select id="sg-city"><option value="">All cities</option>${cities.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
    <label class="f">Industry<select id="sg-ind"><option value="">All industries</option>${inds.map(c => `<option>${esc(c)}</option>`).join('')}</select></label></div>
    <div class="sigs" id="sg-list"></div></div>`;
  renderSignals();
}
function renderSignals() {
  const f = S.sig, list = D.signals.filter(s => (!f.type || s.type === f.type) && (!f.city || s.city === f.city) && (!f.ind || s.industry === f.ind)).sort((a, b) => b.date.localeCompare(a.date));
  const hc = {}; let withHc = 0, tot = 0;
  const latest = {};
  for (const s of list) if (s.headcount) { const k = s.company + '|' + s.city; if (!latest[k] || s.date > latest[k].date) latest[k] = s; }
  for (const s of Object.values(latest)) { hc[s.city] = (hc[s.city] || 0) + s.headcount; withHc++; tot += s.headcount; }
  const bars = Object.entries(hc).sort((a, b) => b[1] - a[1]), mx = bars.length ? bars[0][1] : 1;
  $('#sig-stats').innerHTML = `<div class="card stack"><div class="row" style="gap:28px"><div class="stat"><b>${list.length}</b><span class="muted small">announcements shown</span></div><div class="stat"><b>${nf.format(tot)}</b><span class="muted small">planned roles disclosed (${withHc} companies give a number; latest figure per company)</span></div></div>
    ${bars.length ? `<div class="stack" style="gap:6px"><h4>Planned roles by city</h4>${bars.map(([c, v]) => `<div class="hbar"><span>${esc(c)}</span><span class="meter"><i style="width:${(v / mx) * 100}%"></i></span><span class="num">${nf.format(v)}</span></div>`).join('')}<p class="muted tiny">Sums only the announcements that state a headcount, so real hiring demand is higher.</p></div>` : '<p class="muted small">No announcements with a headcount in this selection.</p>'}</div>`;
  $('#sg-list').innerHTML = list.map(s => sigHtml(s)).join('') || '<p class="note">No announcements match these filters.</p>';
}

/* ---------- explorer ---------- */
function buildExplorer() {
  const u = k => Array.from(new Set(D.gccs.map(g => g[k]).filter(Boolean))).sort();
  const cities = Array.from(new Set(D.gccs.flatMap(g => g.cities))).sort();
  const opt = (arr, all) => `<option value="">${all}</option>` + arr.map(x => `<option>${esc(x)}</option>`).join('');
  $('#explorer').innerHTML = `<div class="stack" style="padding-top:16px">
    <div><div class="eyebrow">GCC Explorer</div><h2>Every GCC on record</h2><p class="ink2" style="margin-top:4px">${D.gccs.length} centres across ${new Set(D.gccs.flatMap(g => g.cities)).size} cities.</p></div>
    <div class="filters">
      <label class="f full">Search company, HQ country or function<input type="search" id="ex-q" placeholder="e.g. Maersk, Germany, cybersecurity"></label>
      <label class="f">Industry<select id="ex-ind">${opt(u('industry'), 'All')}</select></label>
      <label class="f">City<select id="ex-city">${opt(cities, 'All')}</select></label>
      <label class="f">Status<select id="ex-status">${opt(u('status'), 'All')}</select></label>
      <label class="f">Confidence<select id="ex-conf"><option value="">All</option><option>high</option><option>medium</option><option>low</option></select></label>
      <label class="f">Sort<select id="ex-sort"><option value="hc">Largest headcount</option><option value="az">Company A–Z</option><option value="conf">Highest confidence</option></select></label>
    </div><div id="ex-res"></div></div>`;
  renderExplorer();
}
function renderExplorer() {
  const f = S.ex, q = f.q.toLowerCase();
  let list = D.gccs.filter(g => (!f.ind || g.industry === f.ind) && (!f.city || g.cities.includes(f.city)) && (!f.status || g.status === f.status) && (!f.conf || g.confidence === f.conf) &&
    (!q || (g.company + ' ' + g.country + ' ' + g.functions.join(' ') + ' ' + g.sub).toLowerCase().includes(q)));
  const cr = { high: 0, medium: 1, low: 2 };
  list.sort(f.sort === 'az' ? (a, b) => a.company.localeCompare(b.company) : f.sort === 'conf' ? (a, b) => cr[a.confidence] - cr[b.confidence] || (b.headcount || 0) - (a.headcount || 0) : (a, b) => (b.headcount || 0) - (a.headcount || 0) || a.company.localeCompare(b.company));
  const shown = list.slice(0, f.limit);
  $('#ex-res').innerHTML = `<p class="muted small" style="margin-bottom:8px">${list.length} of ${D.gccs.length} GCCs match.</p><div class="card" style="padding:0"><div class="scroll"><table><thead><tr><th>Company</th><th>HQ</th><th>Industry</th><th>Cities</th><th class="r">India headcount</th><th>Status</th><th>Record</th></tr></thead><tbody>
  ${shown.map(g => `<tr class="click" data-act="ex-open" data-id="${g.id}"><td><b>${esc(g.company)}</b></td><td>${esc(g.country)}</td><td>${esc(g.industry)}</td><td class="small">${esc(g.cities.join(', '))}</td><td class="r num">${g.headcount ? nf.format(g.headcount) + (g.hc_year && g.hc_year < NOW.getFullYear() ? ` <span class="badge b-warn">${g.hc_year}</span>` : '') : '<span class="muted">not known</span>'}</td><td>${esc(g.status)}</td><td>${confB(g.confidence)}</td></tr>
  ${f.open.has(g.id) ? `<tr><td colspan="7" style="background:var(--surface2)"><div class="grid2"><div class="small"><p><b>Functions:</b> ${esc(g.functions.join(', ') || 'not recorded')}</p><p><b>Sub-industry:</b> ${esc(g.sub || '—')}${g.est ? ` · <b>In India since:</b> ${g.est}` : ''}</p>${g.update ? `<p><b>Latest:</b> ${esc(g.update)}</p>` : ''}</div><div class="small"><b>Sources (${g.sources.length})</b>${srcList(g.sources, 6)}</div></div></td></tr>` : ''}`).join('')}
  </tbody></table></div></div>${list.length > shown.length ? `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost" data-act="ex-more">Show more (${list.length - shown.length} left)</button></div>` : ''}`;
}

/* ---------- compare ---------- */
function buildCompare() {
  const sorted = D.cities.slice().sort((a, b) => b.gcc_count - a.gcc_count), mx = sorted[0].gcc_count;
  const mkt = {}; D.market.filter(m => m.metric.startsWith('city_count_')).forEach(m => { const c = ({ bengaluru: 'Bengaluru', chennai: 'Chennai', delhi_ncr: 'Delhi NCR', hyderabad: 'Hyderabad', mumbai: 'Mumbai', pune: 'Pune' })[m.metric.slice(11)]; if (c) (mkt[c] = mkt[c] || []).push(m); });
  $('#compare').innerHTML = `<div class="stack" style="padding-top:16px">
    <div><div class="eyebrow">City compare</div><h2>Cities side by side</h2><p class="ink2" style="margin-top:4px">Up to four cities.</p></div>
    <div class="cityswitch" id="cmp-pick"></div><div class="card" style="padding:0"><div class="scroll" id="cmp-table"></div></div>
    <div class="card sect"><header><h3>How many GCCs? The sources disagree</h3><span class="muted tiny">Same cities, different counts. We show every figure instead of choosing one.</span></header>
      <div class="scroll"><table><thead><tr><th>City</th><th class="r">Flexiple verified</th><th class="r">Vestian (Jul 2025)</th><th class="r">KPMG units (FY26)</th><th>Other figures</th></tr></thead><tbody>
      ${D.cities.filter(c => c.count_estimates.vestian || c.count_estimates.kpmg).map(c => { const e = c.count_estimates; return `<tr><td><b>${esc(c.city)}</b></td><td class="r num">${nf.format(c.gcc_count)}</td><td class="r num">${e.vestian ? nf.format(e.vestian) : '—'}</td><td class="r num">${e.kpmg ? nf.format(e.kpmg[0]) + (e.kpmg[1] ? '–' + nf.format(e.kpmg[1]) : '+') : '—'}</td><td class="small">${(mkt[c.city] || []).map(m => `${esc(m.org)}: ${esc(m.value)} (${esc(m.as_of)}) ${link(m.url, 'source')}`).join('<br>') || '—'}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <div class="card sect"><header><h3>Verified GCCs by city</h3><span class="muted tiny">Flexiple directory count, used for all 16 cities for consistency</span></header>
      <div class="stack" style="gap:6px">${sorted.map(c => `<div class="hbar"><span>${esc(c.city)}</span><span class="meter"><i style="width:${(c.gcc_count / mx) * 100}%"></i></span><span class="num">${nf.format(c.gcc_count)}</span></div>`).join('')}</div></div></div>`;
  renderCompare();
}
function renderCompare() {
  $('#cmp-pick').innerHTML = D.cities.map(c => `<button class="chip" data-act="cmp-toggle" data-city="${esc(c.city)}" aria-pressed="${S.cmp.includes(c.city)}">${esc(c.city)}</button>`).join('');
  const cs = S.cmp.map(n => cityByName[n]); if (!cs.length) { $('#cmp-table').innerHTML = '<p class="note" style="margin:12px">Pick at least one city.</p>'; return; }
  const low = (key) => { const v = cs.map(c => c[key]).filter(x => x != null); return v.length > 1 ? Math.min(...v) : null; };
  const num = (c, k, f) => c[k] == null ? '<span class="muted">no data</span>' : `<span class="num">${f ? f(c[k]) : c[k]}</span>${low(k) === c[k] ? ' <span class="badge b-good">lowest</span>' : ''}`;
  const R = (label, fn) => `<tr><td>${label}</td>${cs.map(c => `<td>${fn(c)}</td>`).join('')}</tr>`;
  const ul = a => a.length ? `<ul class="small ink2">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<span class="muted">none recorded</span>';
  $('#cmp-table').innerHTML = `<table class="cmp"><thead><tr><th class="c1"></th>${cs.map(c => `<th>${esc(c.city)}</th>`).join('')}</tr></thead><tbody>
  ${R('Tier', c => esc(c.tier) + ' · ' + esc(c.state))}
  ${R('Verified GCCs', c => `<span class="num">${nf.format(c.gcc_count)}</span>`)}
  ${R('Tech talent pool', c => c.talent_pool ? esc(c.talent_pool) : '<span class="muted">no figure</span>')}
  ${R('Software engineer (LPA)', c => num(c, 'sal_swe'))}
  ${R('Data scientist (LPA)', c => num(c, 'sal_ds'))}
  ${R('Finance analyst (LPA)', c => num(c, 'sal_fin'))}
  ${R('Office rent, ₹/sq ft/month', c => c.rent_avg == null ? '<span class="muted">no data</span>' : `<span class="num">avg ${c.rent_avg}</span> <span class="muted small">(${c.rent_min}–${c.rent_max})</span>${low('rent_avg') === c.rent_avg ? ' <span class="badge b-good">lowest</span>' : ''}`)}
  ${R('Grade-A office stock', c => c.office_stock_msf ? `<span class="num">${c.office_stock_msf} msf</span>` : '<span class="muted">no data</span>')}
  ${R('Key clusters', c => ul(c.clusters))}
  ${R('Strengths', c => ul(c.strengths))}
  ${R('Challenges', c => ul(c.challenges))}
  ${R('State policy', c => { const p = policyByState[CITY_STATE[c.city]]; return p ? `<b>${esc(p.name || 'No dedicated policy')}</b><div class="small ink2">${p.dedicated ? 'Dedicated GCC policy' : 'No dedicated GCC policy found'}${p.tier2 ? ' · Tier-2 focus' : ''}</div>` : '—'; })}
  ${R('Rent & pay sources', c => `<div class="tiny muted">${esc(trunc(c.rent_source, 170))}</div><div class="tiny muted" style="margin-top:4px">${esc(trunc(c.salary_source, 130))}</div>`)}
  ${R('Source links', c => srcBlock(c.sources, 'Links'))}
  </tbody></table>`;
}

/* ---------- trust ---------- */
function buildTrust() {
  const g = D.gccs, conf = k => g.filter(x => x.confidence === k).length;
  const prov3 = D.providers.filter(p => p.evidence !== 'provider_claim').length;
  const hcKnown = g.filter(x => x.headcount).length;
  const noRent = D.cities.filter(c => c.rent_avg == null).map(c => c.city);
  const polOpen = D.policies.filter(p => !p.dedicated || !p.incentives.length || /not found/i.test(p.incentives.join(' '))).map(p => p.state);
  const counts = D.market.filter(m => m.metric === 'number_of_gcc_india').sort((a, b) => a.num - b.num);
  const bar = (n, tot, label) => `<div class="hbar"><span>${label}</span><span class="meter"><i style="width:${(n / tot) * 100}%"></i></span><span class="num">${n}</span></div>`;
  $('#trust').innerHTML = `<div class="stack" style="padding-top:16px">
    <div><div class="eyebrow">Data & trust</div><h2>Data and methodology</h2></div>
    <div class="grid4">${[[g.length, 'GCC companies'], [D.signals.length, 'new-GCC signals'], [D.cities.length, 'city profiles'], [D.policies.length, 'state policies'], [D.providers.length, 'service providers'], [D.sourceStats.source_rows, 'source links recorded'], [D.sourceStats.distinct_urls, 'distinct URLs'], [D.sourceStats.distinct_domains, 'distinct websites']].map(([n, l]) => `<div class="card stat"><b>${nf.format(n)}</b><span class="muted small">${l}</span></div>`).join('')}</div>
    <div class="grid3">
      <div class="card stack" style="gap:8px"><h3>Confidence of GCC records</h3>${bar(conf('high'), g.length, 'High')}${bar(conf('medium'), g.length, 'Medium')}${bar(conf('low'), g.length, 'Low')}<p class="small ink2">High means official or multiple sources. Medium means one credible report. Low records are shown and flagged. Headcount is known for ${hcKnown} of ${g.length} GCCs.</p></div>
      <div class="card stack" style="gap:8px"><h3>Provider evidence</h3>${bar(prov3, D.providers.length, 'Third-party')}${bar(D.providers.length - prov3, D.providers.length, 'Claim only')}<p class="small ink2">${prov3} of ${D.providers.length} providers have independent evidence of delivery. The rest rely on what the provider says about itself, and the Advisor labels the difference.</p></div>
      <div class="card stack" style="gap:8px"><h3>Freshness</h3><p class="small ink2">Signals older than 12 months get an "Older than 12 months" flag. Headcounts from before this year are flagged in the Explorer. Salary pages were read on 11 Oct 2026; rents are from ANAROCK CY2025.</p></div>
    </div>
    <div class="card sect"><header><h3>Known gaps</h3></header><ul class="small ink2" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:5px">
      <li><b>No rent data</b> for ${noRent.length} cities (${esc(noRent.join(', '))}). Their cost ranges leave rent out and their office score counts as 40 of 100.</li>
      <li><b>Incentives not quantifiable</b> for states where amounts could not be verified or no GCC policy exists: ${esc(polOpen.join(', '))}.</li>
      <li><b>Pay figures</b> are AmbitionBox city averages for software engineer, data scientist and finance analyst. Finance analyst pay stands in for all finance and operations roles.</li>
      <li><b>Peer counts</b> use the ${g.length} GCCs in the dataset, not the full market, so small cities look thinner than they are.</li></ul></div>
    <div class="card sect"><header><h3>How many GCCs are in India? Every figure we hold</h3><span class="muted tiny">No single answer, and none publishes the list behind its number</span></header>
      <div class="scroll"><table><thead><tr><th>Figure</th><th>As of</th><th>Source</th><th>Note</th></tr></thead><tbody>${counts.map(m => `<tr><td class="num"><b>${esc(m.value)}</b></td><td>${esc(m.as_of)}</td><td>${link(m.url, m.org)}</td><td class="small muted">${esc(m.notes)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card sect"><header><h3>How the Advisor scores a city</h3></header>
      <p class="small ink2">Each city gets six 0-100 scores. A city's final score is the weighted average, with the weights set by your priority.</p>
      <div class="scroll"><table><thead><tr><th>Component</th><th>How it is measured</th>${['balanced', 'cost', 'depth'].map(k => `<th class="r">${k === 'cost' ? 'Lowest cost' : k === 'depth' ? 'Talent depth' : 'Balanced'}</th>`).join('')}</tr></thead><tbody>
      ${[['eco', 'Verified GCC count (log scale), a stand-in for talent depth'], ['talent', 'Net pay cost per head after payroll incentives, lower is better'], ['office', 'Rent plus fit-out per head after incentives; no data counts as 40'], ['peers', 'GCCs on record in your industry plus 2 × announcements'], ['mom', 'Announcements in the last 12 months, any industry'], ['policy', 'Dedicated GCC policy (25, draft 12) plus counted incentives as a share of cost (up to 75)']].map(([k, t]) => `<tr><td><b>${COMP_LABEL[k]}</b></td><td class="small">${t}</td>${['balanced', 'cost', 'depth'].map(w => `<td class="r num">${WEIGHTS[w][k]}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="small ink2">Cost model: salaries × hiring ramp × load, plus rent, fit-out, recruitment and set-up. Salaries and rents come from the dataset; fit-out, recruitment, set-up, ramp and load are modelled assumptions, adjustable under Cost assumptions. Incentives are counted only where the policy text gives a rate and a cap, and only if the stated eligibility is met.</p></div>
  </div>`;
}

/* ---------- tabs & events ---------- */
const TABS = ['advisor', 'explorer', 'compare', 'signals', 'trust'];
function showTab(t, push) {
  if (!TABS.includes(t)) t = 'advisor';
  S.tab = t;
  TABS.forEach(k => { $('#' + k).hidden = k !== t; const b = $('#tab-' + k); b.setAttribute('aria-selected', k === t); });
  $('#lede').hidden = t !== 'advisor';
  if (t === 'explorer' && !S.ex.built) { buildExplorer(); S.ex.built = true; }
  if (t === 'compare' && !S.cmpBuilt) { buildCompare(); S.cmpBuilt = true; }
  if (t === 'signals' && !S.sig.built) { buildSignals(); S.sig.built = true; }
  if (t === 'trust' && !S.trustBuilt) { buildTrust(); S.trustBuilt = true; }
  if (push) { try { history.replaceState(null, '', '#' + t); } catch (e) { /* ignore */ } }
  window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const a = t.dataset.act;
  if (a === 'tab') showTab(t.dataset.tab, true);
  else if (a === 'sel-city') { S.sel = t.dataset.city; renderResults(); const d = $('#detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  else if (a === 'toggle-cat') { const k = t.dataset.k; S.provCats = S.provCats.includes(k) ? S.provCats.filter(x => x !== k) : S.provCats.concat(k); renderNeeds(); renderResults(); }
  else if (a === 'example') { $('#req-text').value = EXAMPLES[+t.dataset.i]; analyse(EXAMPLES[+t.dataset.i]); }
  else if (a === 'show-lead') { S.leadOpen = !S.leadOpen; renderResults(); }
  else if (a === 'copy-lead') {
    const txt = leadText(S.req, S.res.rows), msg = $('#copymsg');
    const fb = () => { const r = document.createRange(); r.selectNodeContents($('#leadbox')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); msg.textContent = 'Selected. Press Ctrl+C to copy.'; };
    try { navigator.clipboard.writeText(txt).then(() => { msg.textContent = 'Copied.'; }, fb); } catch (err) { fb(); }
  }
  else if (a === 'ex-open') { const id = +t.dataset.id; S.ex.open.has(id) ? S.ex.open.delete(id) : S.ex.open.add(id); renderExplorer(); }
  else if (a === 'ex-more') { S.ex.limit += 40; renderExplorer(); }
  else if (a === 'cmp-toggle') { const c = t.dataset.city; if (S.cmp.includes(c)) S.cmp = S.cmp.filter(x => x !== c); else if (S.cmp.length < 4) S.cmp = S.cmp.concat(c); renderCompare(); }
  else if (a === 'goto-explorer') { S.ex.city = t.dataset.city; S.ex.ind = t.dataset.ind || ''; S.ex.q = ''; S.ex.limit = 40; showTab('explorer', true); $('#ex-city').value = S.ex.city; $('#ex-ind').value = S.ex.ind; $('#ex-q').value = ''; renderExplorer(); }
  else if (a === 'theme') { const r = document.documentElement, dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; r.dataset.theme = dark ? 'light' : 'dark'; }
});
document.addEventListener('input', e => {
  const id = e.target.id; if (!id) return;
  if (id.startsWith('f-') || id.startsWith('a-')) { if (S.res) compute(); }
  else if (id === 'ex-q') { S.ex.q = e.target.value; S.ex.limit = 40; renderExplorer(); }
  else if (id.startsWith('ex-')) { S.ex[id.slice(3)] = e.target.value; S.ex.limit = 40; renderExplorer(); }
  else if (id === 'sg-type') { S.sig.type = e.target.value; renderSignals(); }
  else if (id === 'sg-city') { S.sig.city = e.target.value; renderSignals(); }
  else if (id === 'sg-ind') { S.sig.ind = e.target.value; renderSignals(); }
});
$('#btn-run').addEventListener('click', () => analyse($('#req-text').value));
$('#req-text').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); analyse($('#req-text').value); } });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1), false));

/* ---------- boot ---------- */
fillIndustrySelect(); renderNeeds(); renderExamples(); setAssump();
$('#req-text').value = EXAMPLES[0];
analyse(EXAMPLES[0]);
showTab(location.hash.slice(1) || 'advisor', false);
window.GCC = { parseReq, run, S, DEFAULT_A, D };
