'use strict';
/* ---------- helpers ---------- */
const D = JSON.parse(document.getElementById('data').textContent);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '#';
const link = (u, t) => `<a href="${esc(safeUrl(u))}" target="_blank" rel="noopener noreferrer">${esc(t || u)}</a>`;
const nf = new Intl.NumberFormat('en-IN');
const NOW = new Date();
const ym = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const CUTOFF_YM = (() => { const d = new Date(NOW); d.setFullYear(d.getFullYear() - 1); return ym(d); })();

function inr(n) {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n), sg = n < 0 ? '−' : '';
  if (a >= 1e7) return sg + '₹' + (a / 1e7).toFixed(2) + ' Cr';
  if (a >= 1e5) return sg + '₹' + (a / 1e5).toFixed(1) + ' L';
  return sg + '₹' + nf.format(Math.round(a));
}
function inrRange(a, b) {
  if (a == null || b == null) return '—';
  if (Math.abs(b) >= 1e7) return '₹' + (a / 1e7).toFixed(1) + '–' + (b / 1e7).toFixed(1) + ' Cr';
  return '₹' + (a / 1e5).toFixed(0) + '–' + (b / 1e5).toFixed(0) + ' L';
}
const pct = x => Math.round(x * 100) + '%';
const cityByName = Object.fromEntries(D.cities.map(c => [c.city, c]));
const policyByState = Object.fromEntries(D.policies.map(p => [p.state, p]));
const CITY_STATE = { 'Bengaluru': 'Karnataka', 'Hyderabad': 'Telangana', 'Pune': 'Maharashtra', 'Chennai': 'Tamil Nadu', 'Mumbai': 'Maharashtra', 'Delhi NCR': 'Haryana', 'Kolkata': 'West Bengal', 'Ahmedabad': 'Gujarat', 'Kochi': 'Kerala', 'Coimbatore': 'Tamil Nadu', 'Jaipur': 'Rajasthan', 'Indore': 'Madhya Pradesh', 'Thiruvananthapuram': 'Kerala', 'Chandigarh': 'Punjab / Chandigarh', 'Bhubaneswar': 'Odisha', 'Visakhapatnam': 'Andhra Pradesh' };
const INDUSTRIES = ['Any', 'BFSI', 'Technology', 'Healthcare & Pharma', 'Automotive & Industrial', 'Retail & CPG', 'Energy', 'Aerospace', 'Logistics'];
const ROLES = { swe: 'Engineering', ds: 'Data & AI', fin: 'Finance & operations' };
const PROV_CATS = [
  ['legal', 'Legal & Regulatory', 'Lawyers'],
  ['real', 'Real Estate & Workspace', 'Office space'],
  ['talent', 'Talent & Recruitment', 'Hiring'],
  ['eor', 'EOR / Payroll / HR Compliance', 'Payroll & EOR'],
  ['setup', 'GCC Setup / Advisory', 'Setup advisors'],
  ['bot', 'Build-Operate-Transfer / GCC-as-a-Service', 'Build-operate-transfer'],
  ['tax', 'Accounting / Tax / Audit', 'Tax & audit']
];

/* ---------- rule-based requirement parser ---------- */
const CITY_ALIASES = { 'bengaluru': 'Bengaluru', 'bangalore': 'Bengaluru', 'hyderabad': 'Hyderabad', 'pune': 'Pune', 'chennai': 'Chennai', 'madras': 'Chennai', 'mumbai': 'Mumbai', 'bombay': 'Mumbai', 'navi mumbai': 'Mumbai', 'delhi': 'Delhi NCR', 'ncr': 'Delhi NCR', 'gurgaon': 'Delhi NCR', 'gurugram': 'Delhi NCR', 'noida': 'Delhi NCR', 'kolkata': 'Kolkata', 'calcutta': 'Kolkata', 'ahmedabad': 'Ahmedabad', 'gift city': 'Ahmedabad', 'kochi': 'Kochi', 'cochin': 'Kochi', 'coimbatore': 'Coimbatore', 'jaipur': 'Jaipur', 'indore': 'Indore', 'thiruvananthapuram': 'Thiruvananthapuram', 'trivandrum': 'Thiruvananthapuram', 'chandigarh': 'Chandigarh', 'mohali': 'Chandigarh', 'bhubaneswar': 'Bhubaneswar', 'visakhapatnam': 'Visakhapatnam', 'vizag': 'Visakhapatnam' };
const IND_RULES = [
  ['BFSI', /fintech|bank|insur|financial|payments?|lending|wealth|capital markets|bfsi|asset manage|broker|mortgage/],
  ['Healthcare & Pharma', /pharma|health|medical|biotech|life science|medtech|hospital|clinical/],
  ['Automotive & Industrial', /automotive|\bauto\b|manufactur|industrial|machinery|embedded|chemical/],
  ['Aerospace', /aerospace|aviation|defen[cs]e/],
  ['Logistics', /logistic|shipping|supply chain|airline|transport/],
  ['Energy', /\benergy\b|\boil\b|\bgas\b|utilit|renewable/],
  ['Retail & CPG', /retail|cpg|consumer|e-?commerce|fmcg|beverage|apparel|food/],
  ['Technology', /software|saas|\btech\b|technology|cloud|semiconductor|cyber|platform|internet|startup|\bai\b/]
];
const FN_RULES = {
  swe: /engineer|software|develop|devops|platform|cloud|product|\bqa\b|mobile|full-?stack|embedded|cyber|security|backend|frontend/g,
  ds: /\bdata\b|analytic|analyst|\bai\b|\bml\b|machine learning|science|\bbi\b|quant|risk model|actuar/g,
  fin: /financ|account|payroll|audit|\bhr\b|human resources|operations|\bops\b|support|shared services|back[- ]office|customer|clinical operations|procurement/g
};
const NEED_RULES = {
  legal: /lawyer|legal|law firm|counsel/, real: /office|workspace|real estate|lease|co-?working/, talent: /recruit|hiring|talent|headhunt/,
  eor: /payroll|\beor\b|employer of record/, setup: /advisor|advisory|consult|setup partner|set-up partner/, bot: /build[- ]operate|\bbot\b|gcc[- ]as[- ]a[- ]service/, tax: /\btax\b|audit|transfer pricing|compliance/
};

function parseReq(text) {
  const t = (text || '').toLowerCase();
  const out = { found: {}, hc: null, industry: 'Any', months: null, priority: 'balanced', mix: null, g2000: false, needs: [], mentioned: [] };
  let m = t.match(/(\d[\d,]*)\s*(?:-|\s)?\s*(?:person|people|employees|staff|headcount|engineers|developers|analysts|professionals|hires|fte|seats|members|specialists)/)
    || t.match(/(?:team|centre|center|gcc|workforce|headcount)\s+of\s+(?:about|around|~)?\s*(\d[\d,]*)/)
    || t.match(/(?:hire|hiring)\s+(?:about|around)?\s*(\d[\d,]*)/);
  if (m) { out.hc = parseInt(m[1].replace(/,/g, ''), 10); out.found.hc = true; }
  m = t.match(/(\d+)\s*-?\s*(month|week)/);
  if (m) { out.months = m[2] === 'week' ? Math.max(1, Math.round(+m[1] / 4.3)) : +m[1]; out.found.months = true; }
  for (const [name, re] of IND_RULES) if (re.test(t)) { out.industry = name; out.found.industry = true; break; }
  if (/cost[- ]sensitive|low[- ]cost|cheap|budget|cost[- ]effective|lowest cost|save money/.test(t)) { out.priority = 'cost'; out.found.priority = true; }
  else if (/talent pool|large talent|depth|biggest|scale fast|hire fast|mature ecosystem|peer/.test(t)) { out.priority = 'depth'; out.found.priority = true; }
  if (/fortune\s*(500|1000)|forbes global 2000|\bg2000\b|fortune 1000/.test(t)) out.g2000 = true;
  // function mix
  const w = { swe: 0, ds: 0, fin: 0 };
  let any = false;
  for (const k of Object.keys(FN_RULES)) { const mm = t.match(FN_RULES[k]); if (mm) { w[k] += 1; any = true; } }
  const emph = t.match(/(?:mostly|mainly|primarily|largely|majority)\s+([^.;]{0,70})/);
  if (emph) for (const k of Object.keys(FN_RULES)) if ((emph[1].match(FN_RULES[k]) || []).length) w[k] += 2;
  if (any) { const s = w.swe + w.ds + w.fin; out.mix = { swe: w.swe / s, ds: w.ds / s, fin: w.fin / s }; out.found.mix = true; }
  for (const [k, re] of Object.entries(NEED_RULES)) if (re.test(t)) out.needs.push(k);
  const seen = new Set();
  for (const [alias, city] of Object.entries(CITY_ALIASES)) if (new RegExp('\\b' + alias + '\\b').test(t) && !seen.has(city)) { seen.add(city); out.mentioned.push(city); }
  return out;
}

/* ---------- cost model ---------- */
const DEFAULT_A = { ramp: 0.6, load: 1.25, sqft: 80, fitLow: 2500, fitHigh: 4000, recLow: 0.08, recHigh: 0.12, entLow: 4e6, entHigh: 8e6, band: 0.10 };

function calc(city, req, A, scen) {
  const sign = scen === 'low' ? -1 : 1, band = A.band * sign;
  const roles = {}; let base = 0, people = 0;
  for (const k of ['swe', 'ds', 'fin']) {
    const lpa = city['sal_' + k], n = req.hc * req.mix[k];
    const annual = lpa == null ? null : lpa * 1e5 * (1 + band);
    const cost = annual == null ? 0 : n * annual * A.ramp * A.load;
    roles[k] = { n, annual, cost, lpa };
    if (annual != null) { base += n * annual; people += cost; }
  }
  const sqft = req.hc * A.sqft;
  const rent = scen === 'low' ? city.rent_min : city.rent_max;
  const office = rent == null ? null : sqft * rent * 12;
  const fit = sqft * (scen === 'low' ? A.fitLow : A.fitHigh);
  const rec = base * (scen === 'low' ? A.recLow : A.recHigh);
  const ent = scen === 'low' ? A.entLow : A.entHigh;
  return { roles, people, office, fit, rec, ent, sqft, rent, base, partial: office == null, gross: people + (office || 0) + fit + rec + ent };
}

/* ---------- incentive rules (hand-encoded from state_policies.csv; amounts only where the policy text gives a rate and a cap) ---------- */
const L = (label, kind, value, status, note) => ({ label, kind, value, status, note });
function perEmp(c, fn) { // sum over roles of n * fn(annual) * ramp, returns {amt, eligible}
  let amt = 0, eligible = 0;
  for (const k of ['swe', 'ds', 'fin']) {
    const r = c.roles[k]; if (r.annual == null) continue;
    const v = fn(r.annual, r); if (v > 0) { amt += r.n * v; eligible += r.n; }
  }
  return { amt, eligible };
}
const RULES = {
  Maharashtra(city, req, A, c) {
    const lines = [];
    const first = perEmp(c, a => (a / 12 > 1e5) ? Math.min(0.4 * a, 50000 * 12) : 0);
    const cap = first.eligible > 100 ? 100 / first.eligible : 1;
    let pay = Math.min(first.amt * cap * A.ramp, 5e7);
    lines.push(first.amt > 0
      ? L('Payroll subsidy (Zone I: 40% of salary, year 1 of 3)', 'payroll', pay, 'applied', 'Only for staff earning over ₹1 lakh/month, so applied to roles whose average pay clears that line. Max 100 employees and ₹5 Cr per unit. The ₹50,000 cap is read as per month.')
      : L('Payroll subsidy (Zone I: 40% of salary)', 'payroll', 0, 'not_eligible', 'No role has an average salary above ₹1 lakh/month in the data, so nothing is counted. Individual senior hires could still qualify.'));
    if (c.office != null) lines.push(L('Rental assistance (Zone I: 10% of rent, 5 years)', 'office', Math.min(0.1 * c.office, 1e7), 'applied', 'Offered in lieu of the capital subsidy. Capped at ₹1 Cr, the smallest unit-size cap (size tier is not known).'));
    return lines;
  },
  Karnataka() {
    return [L('Cost-side incentives (rent, EPF, recruitment, power)', 'office', 0, 'not_applicable', 'Karnataka reserves these for "Beyond Bengaluru" locations. Bengaluru Urban gets innovation-lab, R&D and skilling support only.'),
      L('Innovation Lab / CoE capex grant (40%, max ₹5 Cr)', 'capex', null, 'not_quantified', 'Counted only if you plan an innovation lab; the spend is not part of this model.')];
  },
  Telangana() { return [L('State GCC incentives', 'payroll', null, 'not_quantified', 'No standalone GCC policy was found. The ICT Policy 2021-26 and TG-iPASS fast approvals apply, but incentive amounts could not be verified.')]; },
  'Tamil Nadu'(city, req, A, c) {
    const ok = req.g2000 && req.hc >= 200;
    const why = [];
    if (!req.g2000) why.push('parent must be Forbes Global 2000 / Fortune 1000');
    if (req.hc < 200) why.push('needs at least 200 direct jobs');
    if (!ok) return [L('Payroll subsidy (30% / 20% / 10% over 3 years)', 'payroll', 0, 'not_eligible', 'Not eligible: ' + why.join('; ') + '. Scheme is limited to 50 GCCs (to Mar 2027).')];
    const r = perEmp(c, a => (0.5 * a / 12 >= 1e5) ? 0.3 * 0.5 * a : 0);
    return [L('Payroll subsidy (30% year 1 on basic wages ≥ ₹1 lakh/month)', 'payroll', r.amt * A.ramp, r.amt > 0 ? 'applied' : 'not_eligible', 'Basic pay is assumed to be 50% of CTC, which puts most roles under the ₹1 lakh/month line. TN-domiciled employees only.')];
  },
  Gujarat(city, req, A, c) {
    if (req.hc < 50) return [L('GCC Policy 2025-30', 'payroll', 0, 'not_eligible', 'Needs at least 50 employees.')];
    const L1 = [];
    if (c.office != null) L1.push(L('Opex subsidy (15% of operating costs, 5 years)', 'office', Math.min(0.15 * c.office, 2e8), 'applied', 'Applied to office rent only; bandwidth, cloud and power are not in the model, so this is conservative.'));
    L1.push(L('Capex subsidy (20% of non-IT infrastructure, 20 quarterly instalments)', 'capex', 0.2 * c.fit * (4 / 20), 'applied', 'Fit-out is treated as non-IT infrastructure. Only the first 4 of 20 instalments fall in year 1.'));
    const per = ['swe', 'ds', 'fin'].reduce((s, k) => s + (c.roles[k].annual == null ? 0 : c.roles[k].n * Math.min(0.5 * c.roles[k].annual / 12, 50000)), 0);
    L1.push(L('Employment assistance (50% of one month CTC per local hire)', 'oneoff', per, 'applied', 'One-time, capped at ₹50,000 per hire (the lower, male cap is used).'));
    L1.push(L('EPF reimbursement (100% women / 75% men)', 'payroll', null, 'not_quantified', 'Gender mix is not known, so it is not counted.'));
    return L1;
  },
  'Madhya Pradesh'(city, req, A, c) {
    if (req.hc < 100) return [L('GCC Policy 2025', 'payroll', 0, 'not_eligible', 'Level-I needs ₹15 Cr capex or 100 staff.')];
    const r = perEmp(c, a => (a / 12 > 1e5) ? Math.min(0.5 * a, 1e5) : 0);
    return [
      L('Capex subsidy (40% of eligible capital, 5 annual instalments)', 'capex', Math.min(0.4 * c.fit, 15e7) / 5, 'applied', 'Fit-out is treated as eligible capital investment. Year-1 share is one of five instalments.'),
      L('Payroll subsidy (50% of salary in year 1, up to ₹1 lakh per employee)', 'payroll', r.amt * A.ramp, r.amt > 0 ? 'applied' : 'not_eligible', 'Only staff earning above ₹1 lakh/month; applied to roles whose average pay clears that line.'),
      L('Rental / working capital assistance (up to ₹3 Cr)', 'office', null, 'not_quantified', 'The policy gives only a cap, no rate.')
    ];
  },
  Rajasthan(city, req, A, c) {
    if (req.hc < 100) return [L('GCC Policy 2025 payroll subsidy', 'payroll', 0, 'not_eligible', 'Needs at least 100 employees (or ₹15 Cr investment).')];
    const r = perEmp(c, a => Math.min(0.3 * a, 125000));
    const lines = [L('Payroll subsidy (30% of salary, up to ₹1.25 lakh per employee, 3 years)', 'payroll', Math.min(r.amt * A.ramp, 1e8), 'applied', 'Limited to the first 10 GCCs in each size tier, so availability is a risk.')];
    lines.push(c.office != null ? L('Rental assistance (50% of rent, years 1-3)', 'office', Math.min(0.5 * c.office, 25000 * req.hc, 5e7), 'applied', 'Only if the land incentive is not taken.') : L('Rental assistance (50% of rent)', 'office', null, 'not_quantified', 'No rent data for this city.'));
    return lines;
  },
  Kerala(city, req, A, c) {
    return [L('Draft GCC Policy 2025-30', 'office', null, 'not_quantified', 'Policy is still a draft. Capital subsidy needs ₹50 Cr and 1,000 jobs. First six months rent-free in state IT parks cannot be valued without rent data.')];
  }
};
function incentives(city, req, A, c) {
  const st = CITY_STATE[city.city], p = policyByState[st];
  const rule = RULES[st];
  let lines;
  if (rule) lines = rule(city, req, A, c);
  else lines = [L((p && p.name) || 'State policy', 'payroll', null, 'not_quantified', 'No incentive amounts could be verified for ' + st + '.')];
  if (city.city === 'Delhi NCR') lines.push(L('Noida (UP GCC Policy 2024)', 'payroll', null, 'not_quantified', 'Data here is for Gurugram. If you site in Noida, UP offers payroll reimbursement of 25-50% by region plus capital subsidy; not counted.'));
  const by = { payroll: 0, office: 0, capex: 0, oneoff: 0 };
  let total = 0;
  for (const l of lines) if (l.status === 'applied' && l.value) { by[l.kind] += l.value; total += l.value; }
  return { lines, total, by, policy: p };
}

/* ---------- scoring ---------- */
const WEIGHTS = {
  balanced: { eco: 20, talent: 20, office: 12, peers: 20, mom: 14, policy: 14 },
  cost: { eco: 8, talent: 30, office: 22, peers: 10, mom: 10, policy: 20 },
  depth: { eco: 28, talent: 10, office: 8, peers: 22, mom: 20, policy: 12 }
};
const COMP_LABEL = { eco: 'Ecosystem', talent: 'Pay cost', office: 'Office cost', peers: 'Peers', mom: 'Momentum', policy: 'Incentives' };
const mid = (a, b) => (a + b) / 2;
const peerGccs = (city, ind) => D.gccs.filter(g => g.cities.includes(city) && (ind === 'Any' || g.industry === ind));
const peerSigs = (city, ind) => D.signals.filter(s => s.city === city && (ind === 'Any' || s.industry === ind));
const momentumSigs = city => D.signals.filter(s => s.city === city && s.date >= CUTOFF_YM);
const norm = (v, lo, hi, invert) => (hi === lo ? 50 : 100 * (invert ? (hi - v) / (hi - lo) : (v - lo) / (hi - lo)));

function run(req, A) {
  const rows = D.cities.map(city => {
    const lo = calc(city, req, A, 'low'), hi = calc(city, req, A, 'high');
    const iLo = incentives(city, req, A, lo), iHi = incentives(city, req, A, hi);
    const netLo = lo.gross - iLo.total, netHi = hi.gross - iHi.total;
    const grossMid = mid(lo.gross, hi.gross), incMid = mid(iLo.total, iHi.total);
    const talentPH = (mid(lo.people, hi.people) - mid(iLo.by.payroll, iHi.by.payroll) - mid(iLo.by.oneoff, iHi.by.oneoff)) / req.hc;
    const officePH = lo.office == null ? null : (mid(lo.office, hi.office) + mid(lo.fit, hi.fit) - mid(iLo.by.office, iHi.by.office) - mid(iLo.by.capex, iHi.by.capex)) / req.hc;
    const pg = peerGccs(city.city, req.industry), ps = peerSigs(city.city, req.industry);
    return { city, lo, hi, iLo, iHi, netLo, netHi, grossMid, incMid, savings: incMid / grossMid, talentPH, officePH, peerG: pg.length, peerS: ps.length, peerRaw: pg.length + 2 * ps.length, mom: momentumSigs(city.city).length, partial: lo.partial, perHead: mid(netLo, netHi) / req.hc };
  });
  const rng = f => { const v = rows.map(f).filter(x => x != null); return [Math.min(...v), Math.max(...v)]; };
  const [gMin, gMax] = rng(r => Math.log(r.city.gcc_count));
  const [tMin, tMax] = rng(r => r.talentPH), [oMin, oMax] = rng(r => r.officePH);
  const pMax = Math.max(...rows.map(r => r.peerRaw), 1), mMax = Math.max(...rows.map(r => r.mom), 1);
  const W = WEIGHTS[req.priority] || WEIGHTS.balanced;
  for (const r of rows) {
    const pol = policyByState[CITY_STATE[r.city.city]];
    const polScore = Math.min(100, (pol && pol.dedicated ? (pol.name && /draft/i.test(pol.name) ? 12 : 25) : 0) + 75 * Math.min(1, r.savings / 0.08));
    r.comp = {
      eco: norm(Math.log(r.city.gcc_count), gMin, gMax),
      talent: norm(r.talentPH, tMin, tMax, true),
      office: r.officePH == null ? null : norm(r.officePH, oMin, oMax, true),
      peers: 100 * Math.sqrt(r.peerRaw / pMax),
      mom: 100 * Math.sqrt(r.mom / mMax),
      policy: polScore
    };
    // Missing data is scored at a pessimistic 40/100 (never left out), so a city with gaps cannot outrank one with evidence by default.
    let s = 0, have = 0;
    for (const k of Object.keys(W)) { s += W[k] * (r.comp[k] == null ? 40 : r.comp[k]); if (r.comp[k] != null) have += W[k]; }
    r.score = s / 100; r.coverage = have / 100; r.mentioned = req.mentioned.includes(r.city.city);
  }
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => r.rank = i + 1);
  return { rows, W };
}

/* ---------- provider ranking ---------- */
function rankProviders(catKey, cityName) {
  const cat = PROV_CATS.find(c => c[0] === catKey)[1];
  return D.providers.filter(p => p.category === cat).map(p => {
    const listed = p.cities.some(c => c === cityName || (cityName === 'Delhi NCR' && /delhi|gurugram|noida/i.test(c)) || (cityName === 'Mumbai' && /mumbai/i.test(c)));
    const third = p.evidence === 'both' ? 5 : p.evidence === 'third_party_news' ? 3 : 0;
    return { p, listed, third, score: third + (listed ? 4 : 0) + (p.clients.length ? 2 : 0) + (p.track ? 1 : 0) };
  }).sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
}
