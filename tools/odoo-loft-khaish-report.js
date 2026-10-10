/*
 * تقرير منتج «لوفت خيش» من Odoo 17 — قراءة فقط (search_read / read)، لا يكتب أي شيء.
 * التشغيل: افتح https://dhtrd.odoo.com/web وأنت مسجّل دخول ← F12 ← Console ← الصق السكربت كاملاً ← Enter.
 * الناتج: صفحة تفاعلية تُفتح في تبويب جديد + زر تنزيلها كملف HTML.
 *
 * التعريفات المعتمدة:
 *  - المبيعات قبل الضريبة: فواتير العملاء (out_invoice) ناقص المرتجعات (out_refund) المرحّلة،
 *    + طلبات نقاط البيع (paid/done/invoiced). فواتير نقاط البيع تُستبعد من جانب الفواتير لمنع التكرار.
 *  - التكلفة الفعلية: للفواتير = سطر تكلفة البضاعة المباعة (cogs) في نفس الفاتورة،
 *    وإن لم يوجد = تكلفة حركة التسليم من stock.valuation.layer. لنقاط البيع = total_cost المحسوب من حركات المخزون.
 *  - المخزون: stock.quant في المواقع الداخلية فقط، والقيمة = قيمة التقييم في أودو.
 */
(async () => {
  'use strict';
  const KEYWORDS = ['لوفت', 'خيش'];

  const post = async (url, params) => {
    const r = await fetch(url, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params }),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
    const j = await r.json();
    if (j.error) throw new Error(j.error.data?.message || j.error.message);
    return j.result;
  };
  const session = await post('/web/session/get_session_info', {});
  if (!session?.uid) throw new Error('لست مسجّل الدخول في أودو.');
  const ctx = { ...(session.user_context || {}), active_test: false };
  const rpc = (model, method, args, kwargs = {}) =>
    post(`/web/dataset/call_kw/${model}/${method}`, { model, method, args, kwargs: { context: ctx, ...kwargs } })
      .catch(e => { throw new Error(`${model}.${method}: ${e.message}`); });
  const sr = (model, domain, fields) => rpc(model, 'search_read', [], { domain, fields });
  // يجرّب الحقول كاملة، وإن فشل (حقل غير موجود بهذا الإصدار) يعيد بالحقول الأساسية.
  const srSafe = async (model, domain, fields, basic) => {
    try { return await sr(model, domain, fields); }
    catch (e) { warnings.push(`${model}: تعذّر جلب بعض الحقول (${e.message}) — استُخدمت الحقول الأساسية.`); return sr(model, domain, basic); }
  };
  const warnings = [];
  const id = v => (Array.isArray(v) ? v[0] : v) || null;
  const nm = v => (Array.isArray(v) ? v[1] : '') || '';
  const r2 = x => Math.round((x + Number.EPSILON) * 100) / 100;
  console.log('⏳ جاري سحب بيانات لوفت خيش...');

  // 1) المنتج ومقاساته
  const templates = await sr('product.template', KEYWORDS.map(k => ['name', 'ilike', k]), ['name', 'active', 'default_code']);
  if (!templates.length) throw new Error('لم أجد منتجاً اسمه يحتوي «لوفت» و«خيش».');
  const variants = await sr('product.product', [['product_tmpl_id', 'in', templates.map(t => t.id)]],
    ['display_name', 'product_tmpl_id', 'product_template_attribute_value_ids', 'default_code', 'active', 'standard_price']);
  const ptavIds = [...new Set(variants.flatMap(v => v.product_template_attribute_value_ids))];
  const ptavs = ptavIds.length ? await sr('product.template.attribute.value', [['id', 'in', ptavIds]], ['name', 'attribute_id']) : [];
  const ptavName = Object.fromEntries(ptavs.map(p => [p.id, p.name]));
  const prod = {};
  for (const v of variants) {
    const attrs = v.product_template_attribute_value_ids.map(i => ptavName[i]).filter(Boolean).join(' / ');
    prod[v.id] = { id: v.id, size: attrs || (templates.length > 1 ? nm(v.product_tmpl_id) : v.display_name), name: v.display_name, code: v.default_code || '', active: v.active, std: v.standard_price };
  }
  const pids = Object.keys(prod).map(Number);

  const sales = []; // {date, source, doc, branch, partner, pid, qty, revenue, cost, costSrc}

  // 2) نقاط البيع
  let posAvailable = true;
  let posLines = [];
  try {
    posLines = await srSafe('pos.order.line',
      [['product_id', 'in', pids], ['order_id.state', 'in', ['paid', 'done', 'invoiced']]],
      ['order_id', 'product_id', 'qty', 'price_subtotal', 'total_cost', 'is_total_cost_computed'],
      ['order_id', 'product_id', 'qty', 'price_subtotal']);
  } catch (e) { posAvailable = false; warnings.push(`نقاط البيع غير متاحة: ${e.message}`); }
  if (posLines.length) {
    const orders = await sr('pos.order', [['id', 'in', [...new Set(posLines.map(l => id(l.order_id)))]]],
      ['name', 'date_order', 'config_id', 'state', 'partner_id']);
    const ord = Object.fromEntries(orders.map(o => [o.id, o]));
    let estimated = 0;
    for (const l of posLines) {
      const o = ord[id(l.order_id)];
      const actual = l.is_total_cost_computed === true;
      if (!actual) estimated++;
      sales.push({
        date: o.date_order.slice(0, 10), source: 'نقاط البيع', doc: o.name, branch: nm(o.config_id) || '—',
        partner: nm(o.partner_id), pid: id(l.product_id), qty: l.qty, revenue: l.price_subtotal,
        cost: actual ? l.total_cost : l.qty * prod[id(l.product_id)].std, costSrc: actual ? 'فعلية' : 'تقديرية (تكلفة حالية)',
      });
    }
    if (estimated) warnings.push(`${estimated} سطر نقاط بيع لم تُحسب تكلفته الفعلية في أودو بعد (جلسة غير مغلقة غالباً) — استُخدمت التكلفة الحالية للمنتج وعُلّمت «تقديرية».`);
  }

  // 3) فواتير العملاء ومرتجعاتها
  const amls = await sr('account.move.line',
    [['product_id', 'in', pids], ['parent_state', '=', 'posted'], ['move_id.move_type', 'in', ['out_invoice', 'out_refund']], ['display_type', 'in', ['product', 'cogs']]],
    ['move_id', 'date', 'partner_id', 'product_id', 'quantity', 'balance', 'display_type', 'account_id', 'journal_id', 'sale_line_ids']);
  const moveIds = [...new Set(amls.map(l => id(l.move_id)))];
  let moves = [];
  if (moveIds.length) {
    moves = posAvailable
      ? await srSafe('account.move', [['id', 'in', moveIds]], ['name', 'move_type', 'pos_order_ids'], ['name', 'move_type'])
      : await sr('account.move', [['id', 'in', moveIds]], ['name', 'move_type']);
  }
  const mv = Object.fromEntries(moves.map(m => [m.id, m]));
  const fromPos = new Set(moves.filter(m => (m.pos_order_ids || []).length).map(m => m.id));
  if (fromPos.size) warnings.push(`${fromPos.size} فاتورة صادرة من نقاط البيع استُبعدت من جانب الفواتير (محسوبة ضمن نقاط البيع) لمنع التكرار.`);
  const accIds = [...new Set(amls.filter(l => l.display_type === 'cogs').map(l => id(l.account_id)))];
  const accs = accIds.length ? await sr('account.account', [['id', 'in', accIds]], ['account_type']) : [];
  const expenseAcc = new Set(accs.filter(a => String(a.account_type).startsWith('expense')).map(a => a.id));
  const cogsBy = {};
  for (const l of amls) if (l.display_type === 'cogs' && expenseAcc.has(id(l.account_id))) {
    const k = `${id(l.move_id)}|${id(l.product_id)}`; cogsBy[k] = (cogsBy[k] || 0) + l.balance;
  }
  const prodLines = amls.filter(l => l.display_type === 'product' && !fromPos.has(id(l.move_id)));
  const qtyBy = {};
  for (const l of prodLines) { const k = `${id(l.move_id)}|${id(l.product_id)}`; qtyBy[k] = (qtyBy[k] || 0) + Math.abs(l.quantity); }
  // بديل: تكلفة حركة التسليم المرتبطة بسطر أمر البيع
  const needSvl = prodLines.filter(l => cogsBy[`${id(l.move_id)}|${id(l.product_id)}`] === undefined && l.sale_line_ids?.length);
  const solUnit = {};
  if (needSvl.length) {
    const solIds = [...new Set(needSvl.flatMap(l => l.sale_line_ids))];
    const sm = await sr('stock.move', [['sale_line_id', 'in', solIds], ['state', '=', 'done']], ['sale_line_id']);
    const smSol = Object.fromEntries(sm.map(m => [m.id, id(m.sale_line_id)]));
    const svl = sm.length ? await sr('stock.valuation.layer', [['stock_move_id', 'in', sm.map(m => m.id)]], ['stock_move_id', 'quantity', 'value']) : [];
    const agg = {};
    for (const s of svl) { const so = smSol[id(s.stock_move_id)]; agg[so] ??= { q: 0, v: 0 }; agg[so].q += s.quantity; agg[so].v += s.value; }
    for (const [so, a] of Object.entries(agg)) if (a.q) solUnit[so] = a.v / a.q;
  }
  let noCost = 0;
  for (const l of prodLines) {
    const m = mv[id(l.move_id)];
    const sign = m.move_type === 'out_refund' ? -1 : 1;
    const k = `${id(l.move_id)}|${id(l.product_id)}`;
    const qty = sign * Math.abs(l.quantity);
    let cost = 0, costSrc = 'غير متوفرة';
    if (cogsBy[k] !== undefined) { cost = qtyBy[k] ? cogsBy[k] * Math.abs(l.quantity) / qtyBy[k] : 0; costSrc = 'فعلية (قيد التكلفة)'; }
    else {
      const units = (l.sale_line_ids || []).map(s => solUnit[s]).filter(u => u !== undefined);
      if (units.length) { cost = qty * units[0]; costSrc = 'فعلية (حركة التسليم)'; } else noCost++;
    }
    sales.push({
      date: l.date, source: m.move_type === 'out_refund' ? 'مرتجع فاتورة' : 'فواتير', doc: m.name, branch: nm(l.journal_id) || '—',
      partner: nm(l.partner_id), pid: id(l.product_id), qty, revenue: -l.balance, cost, costSrc,
    });
  }
  if (noCost) warnings.push(`${noCost} سطر فاتورة بلا تكلفة مسجّلة (لا قيد تكلفة ولا حركة تسليم) — تكلفته صفر في التقرير ويحتاج مراجعة.`);

  // 4) المخزون الحالي وقيمته
  const quants = await srSafe('stock.quant', [['product_id', 'in', pids], ['location_id.usage', '=', 'internal']],
    ['product_id', 'location_id', 'warehouse_id', 'quantity', 'reserved_quantity', 'value'],
    ['product_id', 'location_id', 'quantity', 'value']);
  const stock = quants.filter(q => q.quantity).map(q => ({
    pid: id(q.product_id), wh: nm(q.warehouse_id) || '—', loc: nm(q.location_id), qty: q.quantity, reserved: q.reserved_quantity || 0, value: q.value || 0,
  }));
  const svlAll = await sr('stock.valuation.layer', [['product_id', 'in', pids]], ['product_id', 'quantity', 'value']);
  const valuation = {};
  for (const s of svlAll) { const p = id(s.product_id); valuation[p] ??= { qty: 0, value: 0 }; valuation[p].qty += s.quantity; valuation[p].value += s.value; }

  for (const s of sales) { s.size = prod[s.pid].size; s.revenue = r2(s.revenue); s.cost = r2(s.cost); }
  sales.sort((a, b) => a.date.localeCompare(b.date));
  for (const s of stock) s.size = prod[s.pid].size;

  const data = {
    generated: new Date().toISOString(), db: location.host, user: session.name || session.username,
    templates: templates.map(t => t.name), products: Object.values(prod), sales, stock, valuation, warnings,
  };
  window.__loftReport = data;
  console.log(`✅ ${sales.length} سطر مبيعات، ${stock.length} سطر مخزون. ملاحظات:`, warnings);

  // 5) الصفحة التفاعلية
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقرير لوفت خيش</title><style>
:root{--bg:#f6f5f1;--card:#fff;--ink:#1d1d1b;--mute:#6b6a64;--line:#e4e2da;--acc:#1f6f5c;--neg:#b3261e;--bar:#2f8f76}
@media (prefers-color-scheme:dark){:root{--bg:#141413;--card:#1e1e1c;--ink:#ecebe6;--mute:#a09f98;--line:#33322e;--acc:#5fc2a4;--neg:#f2867e;--bar:#3fa98a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 system-ui,"Segoe UI",Tahoma,sans-serif}
.wrap{max-width:1200px;margin:0 auto;padding:20px 16px 60px}h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 10px}
.sub{color:var(--mute);font-size:12px}.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.kpi b{display:block;font-size:20px;font-variant-numeric:tabular-nums}.kpi span{color:var(--mute);font-size:12px}
.filters{display:flex;flex-wrap:wrap;gap:8px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px;position:sticky;top:0;z-index:2}
.filters label{display:flex;flex-direction:column;font-size:11px;color:var(--mute)}select,input{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--ink);min-width:130px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:auto}table{border-collapse:collapse;width:100%;min-width:640px}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th{font-size:12px;color:var(--mute);background:var(--card);position:sticky;top:0}
td.n,th.n{text-align:left;font-variant-numeric:tabular-nums}tfoot td{font-weight:700;border-top:2px solid var(--ink)}.neg{color:var(--neg)}
.warn{background:#fff4d6;color:#5c4400;border-radius:10px;padding:10px 14px;margin:10px 0;font-size:13px}@media (prefers-color-scheme:dark){.warn{background:#3a3010;color:#f3dd9a}}
.bars{display:flex;align-items:flex-end;gap:6px;height:180px;padding:12px;direction:ltr}.bars div{flex:1;background:var(--bar);border-radius:4px 4px 0 0;min-width:8px;position:relative}
.bars div:hover::after{content:attr(data-t);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:3px 6px;border-radius:6px;font-size:11px;white-space:nowrap}
.tag{font-size:11px;padding:1px 6px;border-radius:6px;background:var(--bg);border:1px solid var(--line)}
</style></head><body><div class="wrap">
<h1>تقرير منتج لوفت خيش</h1><div class="sub" id="meta"></div><div id="warns"></div>
<div class="filters"><label>المقاس<select id="fSize"></select></label><label>المصدر<select id="fSrc"></select></label>
<label>الفرع / نقطة البيع / اليومية<select id="fBr"></select></label><label>من<input type="date" id="fFrom"></label><label>إلى<input type="date" id="fTo"></label>
<label>بحث بالمستند/العميل<input id="fQ" placeholder="مثال: POS/"></label></div>
<div class="kpis" id="kpis"></div>
<h2>حسب المقاس (المبالغ قبل الضريبة)</h2><div class="card"><table id="tSize"></table></div>
<h2>حسب المصدر والفرع</h2><div class="card"><table id="tBr"></table></div>
<h2>حسب الشهر</h2><div class="card"><div class="bars" id="chart"></div><table id="tMonth"></table></div>
<h2>المخزون المتبقي وقيمته (قيمة التقييم)</h2><div class="card"><table id="tStock"></table></div>
<h2>تفصيل كل عملية بيع/مرتجع</h2><div class="card" style="max-height:600px"><table id="tDet"></table></div>
</div><script>
const D=${json};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const f=n=>(+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fq=n=>(+n||0).toLocaleString('en-US',{maximumFractionDigits:2});
const pct=(p,r)=>r?(p/r*100).toFixed(1)+'%':'—';
const cls=n=>n<0?' neg':'';
const $=i=>document.getElementById(i);
const uniq=a=>[...new Set(a)].sort((x,y)=>String(x).localeCompare(String(y),'ar'));
const opts=(el,vals)=>{el.innerHTML='<option value="">الكل</option>'+vals.map(v=>'<option>'+esc(v)+'</option>').join('')};
opts($('fSize'),uniq(D.products.map(p=>p.size)));opts($('fSrc'),uniq(D.sales.map(s=>s.source)));opts($('fBr'),uniq(D.sales.map(s=>s.branch)));
$('meta').textContent='المنتج: '+D.templates.join('، ')+' — تاريخ السحب: '+new Date(D.generated).toLocaleString('en-GB')+' — '+D.db;
$('warns').innerHTML=D.warnings.map(w=>'<div class="warn">⚠️ '+esc(w)+'</div>').join('');
const group=(rows,key)=>{const m=new Map();for(const r of rows){const k=key(r);const g=m.get(k)||{k,qty:0,rev:0,cost:0,n:0};g.qty+=r.qty;g.rev+=r.revenue;g.cost+=r.cost;g.n++;m.set(k,g)}return[...m.values()]};
const sumTable=(el,title,gs)=>{let t={qty:0,rev:0,cost:0,n:0};gs.forEach(g=>{t.qty+=g.qty;t.rev+=g.rev;t.cost+=g.cost;t.n+=g.n});
el.innerHTML='<thead><tr><th>'+title+'</th><th class="n">عدد الأسطر</th><th class="n">الكمية</th><th class="n">المبيعات</th><th class="n">التكلفة</th><th class="n">الربح</th><th class="n">الهامش</th></tr></thead><tbody>'+
gs.map(g=>'<tr><td>'+esc(g.k)+'</td><td class="n">'+g.n+'</td><td class="n">'+fq(g.qty)+'</td><td class="n">'+f(g.rev)+'</td><td class="n">'+f(g.cost)+'</td><td class="n'+cls(g.rev-g.cost)+'">'+f(g.rev-g.cost)+'</td><td class="n">'+pct(g.rev-g.cost,g.rev)+'</td></tr>').join('')+
'</tbody><tfoot><tr><td>الإجمالي</td><td class="n">'+t.n+'</td><td class="n">'+fq(t.qty)+'</td><td class="n">'+f(t.rev)+'</td><td class="n">'+f(t.cost)+'</td><td class="n'+cls(t.rev-t.cost)+'">'+f(t.rev-t.cost)+'</td><td class="n">'+pct(t.rev-t.cost,t.rev)+'</td></tr></tfoot>';return t};
function render(){
const sz=$('fSize').value,src=$('fSrc').value,br=$('fBr').value,fr=$('fFrom').value,to=$('fTo').value,q=$('fQ').value.trim().toLowerCase();
const rows=D.sales.filter(s=>(!sz||s.size===sz)&&(!src||s.source===src)&&(!br||s.branch===br)&&(!fr||s.date>=fr)&&(!to||s.date<=to)&&(!q||(s.doc+' '+s.partner).toLowerCase().includes(q)));
const t=sumTable($('tSize'),'المقاس',group(rows,r=>r.size).sort((a,b)=>b.rev-a.rev));
sumTable($('tBr'),'المصدر — الفرع',group(rows,r=>r.source+' — '+r.branch).sort((a,b)=>b.rev-a.rev));
const ms=group(rows,r=>r.date.slice(0,7)).sort((a,b)=>a.k.localeCompare(b.k));sumTable($('tMonth'),'الشهر',ms);
const mx=Math.max(1,...ms.map(m=>Math.abs(m.rev)));$('chart').innerHTML=ms.map(m=>'<div style="height:'+(Math.abs(m.rev)/mx*100)+'%" data-t="'+esc(m.k)+': '+f(m.rev)+' / ربح '+f(m.rev-m.cost)+'"></div>').join('');
const st=D.stock.filter(s=>!sz||s.size===sz);let sq=0,sv=0;st.forEach(s=>{sq+=s.qty;sv+=s.value});
const est=rows.filter(r=>!r.costSrc.startsWith('فعلية')).length;
const kp=[['المبيعات قبل الضريبة',f(t.rev)],['التكلفة',f(t.cost)],['الربح',f(t.rev-t.cost)],['هامش الربح',pct(t.rev-t.cost,t.rev)],['الكمية المباعة (صافي)',fq(t.qty)],['المخزون المتبقي',fq(sq)],['قيمة المخزون',f(sv)],['أسطر تكلفتها غير فعلية',est]];
$('kpis').innerHTML=kp.map(k=>'<div class="kpi"><span>'+k[0]+'</span><b>'+esc(k[1])+'</b></div>').join('');
$('tStock').innerHTML='<thead><tr><th>المقاس</th><th>المستودع</th><th>الموقع</th><th class="n">الكمية</th><th class="n">محجوز</th><th class="n">القيمة</th></tr></thead><tbody>'+
st.sort((a,b)=>a.size.localeCompare(b.size,'ar')).map(s=>'<tr><td>'+esc(s.size)+'</td><td>'+esc(s.wh)+'</td><td>'+esc(s.loc)+'</td><td class="n">'+fq(s.qty)+'</td><td class="n">'+fq(s.reserved)+'</td><td class="n">'+f(s.value)+'</td></tr>').join('')+
'</tbody><tfoot><tr><td colspan="3">الإجمالي (للتحقق: رصيد التقييم المحاسبي '+fq(D.products.filter(p=>!sz||p.size===sz).reduce((a,p)=>a+(D.valuation[p.id]?.qty||0),0))+' قطعة بقيمة '+f(D.products.filter(p=>!sz||p.size===sz).reduce((a,p)=>a+(D.valuation[p.id]?.value||0),0))+')</td><td class="n">'+fq(sq)+'</td><td></td><td class="n">'+f(sv)+'</td></tr></tfoot>';
$('tDet').innerHTML='<thead><tr><th>التاريخ</th><th>المصدر</th><th>المستند</th><th>الفرع/اليومية</th><th>العميل</th><th>المقاس</th><th class="n">الكمية</th><th class="n">المبلغ</th><th class="n">التكلفة</th><th class="n">الربح</th><th>مصدر التكلفة</th></tr></thead><tbody>'+
rows.map(s=>'<tr><td>'+esc(s.date)+'</td><td>'+esc(s.source)+'</td><td>'+esc(s.doc)+'</td><td>'+esc(s.branch)+'</td><td>'+esc(s.partner)+'</td><td>'+esc(s.size)+'</td><td class="n'+cls(s.qty)+'">'+fq(s.qty)+'</td><td class="n'+cls(s.revenue)+'">'+f(s.revenue)+'</td><td class="n">'+f(s.cost)+'</td><td class="n'+cls(s.revenue-s.cost)+'">'+f(s.revenue-s.cost)+'</td><td><span class="tag">'+esc(s.costSrc)+'</span></td></tr>').join('')+'</tbody>';
}
['fSize','fSrc','fBr','fFrom','fTo','fQ'].forEach(i=>$(i).addEventListener('input',render));render();
<\/script></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `loft-khaish-report-${new Date().toISOString().slice(0, 10)}.html` });
  document.body.appendChild(a); a.click(); a.remove();
  window.open(url, '_blank');
  console.log('✅ التقرير جاهز: نُزّل الملف وفُتح في تبويب جديد (إن منع المتصفح النافذة، افتح الملف المنزّل).');
})().catch(e => { console.error('❌ فشل التقرير:', e); alert('فشل التقرير: ' + e.message); });
