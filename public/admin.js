/* Technotri Store — staff admin panel (talks to /api/admin) */
(function(){
const T=window.TT,{D,esc,npr,fmtStamp,Views,refresh,toast,A,C,F,api,asyncView,errBox,busy,go,reloadCatalog}=T;
const db=()=>T.db;
const TABS=[['','Overview'],['orders','Orders'],['products','Products'],['categories','Categories'],['deals','Deals & coupons'],['content','Website content'],['customers','Customers & staff'],['dealers','Dealers'],['quotes','Quotes & service'],['reviews','Reviews & Q&A'],['marketing','Subscribers & alerts'],['settings','Delivery & settings']];
const STATUS=['placed','confirmed','packed','shipped','delivered','cancelled'];
const isAdmin=()=>db().user?.role==='admin';
const when=s=>s?fmtStamp(new Date(String(s).replace(' ','T')+(String(s).endsWith('Z')?'':'Z')).getTime()):'';
let pending={}, pq='', ostatus='', oq='', editing=null;

const navOn=on=>on.split('-')[0]==='order'?'orders':on.split('-')[0]==='customer'?'customers':on;
const nav=on0=>{const on=navOn(on0);return `<nav class="sidenav" aria-label="Admin">${TABS.map(([h,l])=>{const n=h==='orders'?pending.orders:h==='quotes'?(pending.quotes||0)+(pending.service||0):h==='dealers'?pending.dealers:h==='reviews'?pending.questions:0;return `<a href="#admin${h?'-'+h:''}" class="${on===h?'on':''}">${l}${n?` <span class="badge deal" style="margin-left:4px">${n}</span>`:''}</a>`}).join('')}</nav>`};
const shell=(on,title,body)=>`<div class="between"><div><span class="eyebrow">Technotri staff · signed in as ${esc(db().user.name)} (${esc(db().user.role)})</span><h1>${esc(title)}</h1></div><a class="btn sm ghost" href="#home">View store</a></div>
 <div class="acct">${nav(on)}<div class="stack" style="min-width:0">${body}</div></div>`;
const MODES=[['buy','Buy online (price + Add to cart)'],['quote','Get quote, hide price'],['quote_price','Get quote, show guide price']];
const modeOf=p=>!p.quote?'buy':p.showPrice?'quote_price':'quote';
const modeBody=m=>({quote:m!=='buy',show_price:m==='quote_price'});
const pill=s=>`<span class="pill ${esc(String(s).replace(/\s+/g,'-'))}">${esc(s)}</span>`;
const sel=(name,opts,val,attrs='')=>`<select name="${name}" ${attrs}>${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(val??'')?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;

Views.admin=arg=>{
  if(!db().user) return `<div class="empty"><b>Staff sign-in required.</b><a class="btn" href="#signin">Sign in</a></div>`;
  if(!T.isStaff()) return `<div class="empty"><b>This area is for Technotri staff.</b><a class="btn" href="#home">Back to the store</a></div>`;
  const tab=arg||'';const m=tab.match(/^(order|customer|guide)-(.+)$/);
  if(m&&PAGES[m[1]]) return PAGES[m[1]](decodeURIComponent(m[2]));
  const fn=PAGES[tab];if(!fn) return Views.notfound();
  return fn();
};
const PAGES={};

/* ---------- overview ---------- */
PAGES['']=()=>asyncView(()=>api('/admin/stats'),s=>{
  pending=s.pending;
  const days=Array.from({length:14},(_,i)=>{const d=new Date(Date.now()+345*60e3-(13-i)*864e5).toISOString().slice(0,10);const x=s.perDay.find(p=>p.day===d)||{n:0,v:0};return {d,...x}});
  const max=Math.max(1,...days.map(x=>x.v)),W=640,H=180,bw=W/14;
  const chart=`<svg viewBox="0 0 ${W} ${H+28}" role="img" aria-label="Revenue per day, last 14 days">${[0,.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-f*H*.9}" y2="${H-f*H*.9}" stroke="var(--line)"/><text x="2" y="${H-f*H*.9-4}" font-size="10" fill="var(--muted)" font-family="var(--f-mono)">${npr(max*f)}</text>`).join('')}
    ${days.map((x,i)=>{const h=x.v/max*H*.9;return `<rect x="${i*bw+6}" y="${H-h}" width="${bw-12}" height="${Math.max(h,x.v?2:0)}" rx="3" fill="${i===13?'var(--accent)':'var(--ink)'}" opacity="${i===13?1:.75}"><title>${x.d}: ${npr(x.v)} (${x.n} orders)</title></rect><text x="${i*bw+bw/2}" y="${H+16}" font-size="10" text-anchor="middle" fill="var(--muted)" font-family="var(--f-mono)">${+x.d.slice(8)}</text>`}).join('')}</svg>`;
  return shell('','Overview',`
   <div class="kpis"><div class="kpi"><span class="small muted">Revenue (excl. cancelled)</span><span class="v">${npr(s.revenue)}</span></div><div class="kpi"><span class="small muted">Orders</span><span class="v">${s.orders}</span></div><div class="kpi"><span class="small muted">Average order</span><span class="v">${npr(s.orders?s.revenue/s.orders:0)}</span></div><a class="kpi" href="#admin-orders" style="color:var(--ink)"><span class="small muted">New orders to confirm</span><span class="v">${s.pending.orders}</span></a></div>
   <div class="kpis"><a class="kpi" href="#admin-quotes" style="color:var(--ink)"><span class="small muted">New quote requests</span><span class="v">${s.pending.quotes}</span></a><a class="kpi" href="#admin-quotes" style="color:var(--ink)"><span class="small muted">New service requests</span><span class="v">${s.pending.service}</span></a><a class="kpi" href="#admin-dealers" style="color:var(--ink)"><span class="small muted">Dealer applications</span><span class="v">${s.pending.dealers}</span></a><a class="kpi" href="#admin-reviews" style="color:var(--ink)"><span class="small muted">Unanswered questions</span><span class="v">${s.pending.questions}</span></a></div>
   <section class="panel chart stack"><div class="between"><h3>Revenue, last 14 days</h3><span class="small muted">Nepal time · today highlighted</span></div>${s.orders?chart:'<p class="muted">No orders yet. Place a test order from the store to see it here.</p>'}</section>
   <div class="two" style="grid-template-columns:1fr 1fr"><section class="panel stack"><h3>Low stock (${s.lowStock.length})</h3>${s.lowStock.length?`<table class="data"><tbody>${s.lowStock.map(p=>`<tr><td><a href="#p-${p.id}">${esc(p.name)}</a></td><td class="mono" style="color:${p.stock?'var(--warn)':'var(--bad)'}">${p.stock}</td></tr>`).join('')}</tbody></table>`:'<p class="muted">All stocked.</p>'}<a href="#admin-products">Manage stock</a></section>
   <section class="panel stack"><h3>Latest orders</h3>${s.recent.map(o=>`<div class="between small"><a href="#admin-order-${o.order_no}" class="mono">${o.order_no}</a><span>${esc(o.name)}</span><span class="price">${npr(o.total)}</span>${pill(o.status)}</div>`).join('')||'<p class="muted">None yet.</p>'}</section></div>`);
},'Loading dashboard…');

/* ---------- products ---------- */
let productsCache=null;
const loadProducts=()=>api('/admin/products').then(r=>(productsCache=r.products));
function productForm(p){
  const cats=D.CATS;const c=p?cats.find(x=>x.id===p.cat):cats[0];
  const specs=p?Object.entries(p.specs||{}).map(([k,v])=>k+': '+v).join('\n'):'';
  return `<form class="panel stack" data-f="aprod" data-id="${p?esc(p.id):''}"><div class="between"><h3>${p?'Edit '+esc(p.name):'Add a product'}</h3><button type="button" class="linkbtn" data-a="apClose">Close</button></div>
   <div class="form-grid">
    <label class="field full"><span>Product name</span><input type="text" name="name" value="${esc(p?.name||'')}" required></label>
    <label class="field"><span>Brand</span><input type="text" name="brand" value="${esc(p?.brand||'')}" required></label>
    <label class="field"><span>Model number</span><input type="text" name="model" value="${esc(p?.model||'')}"></label>
    <label class="field"><span>Category</span>${sel('cat',cats.map(x=>[x.id,x.name]),c?.id,'data-c="apCat"')}</label>
    <label class="field"><span>Sub-category</span><input type="text" name="sub" list="apSubs" value="${esc(p?.sub||'')}" required><datalist id="apSubs">${(c?.subs||[]).map(s=>`<option value="${esc(s)}">`).join('')}</datalist></label>
    <label class="field full"><span>How customers buy it</span>${sel('mode',MODES,p?modeOf(p):'buy')}</label>
    <label class="field"><span>Price (Rs, VAT incl.)</span><input type="number" min="0" name="price" value="${p?.price??''}"></label>
    <label class="field"><span>MRP / was price (Rs)</span><input type="number" min="0" name="mrp" value="${p?.mrp??''}"></label>
    <label class="field"><span>Stock</span><input type="number" min="0" name="stock" value="${p?.stock??0}"></label>
    <label class="field"><span>Warranty</span><input type="text" name="warranty" value="${esc(p?.warranty||'')}" placeholder="2 years Nepal warranty"></label>
    <label class="field"><span>Illustration (used until photos are uploaded)</span>${sel('art',artKinds(),p?.art||'')}</label>
    <label class="field"><span>Position in lists (lower shows first)</span><input type="number" name="sort" value="${p?.sort??''}" placeholder="Leave blank to keep"></label>
    <label class="field full"><span>Quantity prices (one per line, “min qty: price”, e.g. 10: 950)</span><textarea name="breaks" rows="2">${esc((p?.breaks||[]).map(([q,pr])=>q+': '+pr).join('\n'))}</textarea></label>
    <label class="field full"><span>Frequently bought together (product ids, comma separated)</span><input type="text" name="fbt" value="${esc((p?.fbt||[]).join(', '))}"></label>
    <label class="field full"><span>Tags (comma separated: new, best, top, deal…)</span><input type="text" name="tags" value="${esc((p?.tags||[]).join(', '))}"></label>
    <label class="field full"><span>Highlights (one per line)</span><textarea name="hl" rows="3">${esc((p?.hl||[]).join('\n'))}</textarea></label>
    <label class="field full"><span>Specifications (one per line, “Name: value”)</span><textarea name="specs" rows="5">${esc(specs)}</textarea></label>
   </div>
   <label class="check"><input type="checkbox" name="active" ${!p||p.active!==false?'checked':''}> Visible in the store</label>
   <div id="apErr"></div><div class="row"><button class="btn buy">${p?'Save changes':'Add product'}</button>${p?`<button type="button" class="btn ghost" data-a="apDel" data-id="${esc(p.id)}">Delete</button>`:''}</div>
  </form>
  ${p?`<section class="panel stack"><h3>Photos</h3><div class="row" style="flex-wrap:wrap;gap:10px">${(p.images||[]).map(u=>`<figure style="margin:0;width:110px" class="stack"><img src="${esc(u)}" alt="" style="width:110px;height:110px;object-fit:contain;border:1px solid var(--line);border-radius:8px;background:#fff"><button class="linkbtn small" data-a="apImgDel" data-id="${esc(p.id)}" data-url="${esc(u)}">Remove</button></figure>`).join('')||'<p class="muted small">No photos yet. The store shows a drawn illustration until you add one.</p>'}</div>
   <form data-f="aimg" data-id="${esc(p.id)}" class="row" style="flex-wrap:wrap"><input type="file" name="images" accept="image/jpeg,image/png,image/webp" multiple required><button class="btn sm">Upload</button><span class="small muted">JPG, PNG or WebP, up to 4 MB each.</span></form></section>`:''}`;
}
PAGES.products=()=>asyncView(loadProducts,list=>{
  const q=pq.toLowerCase();const rows=list.filter(p=>!q||(p.name+' '+(p.model||'')+' '+p.brand+' '+p.id).toLowerCase().includes(q));
  const ed=editing==='new'?productForm(null):editing?productForm(list.find(p=>p.id===editing)):'';
  return shell('products','Products',`${ed}
   <div class="between"><form data-f="apSearch" class="row"><input type="search" name="q" value="${esc(pq)}" placeholder="Search name, model or brand" aria-label="Search products"><button class="btn sm ghost">Search</button></form><button class="btn sm" data-a="apNew">Add product</button></div>
   <details class="panel"><summary><b>Update many products with a spreadsheet</b></summary><div class="stack" style="margin-top:10px"><p class="small muted">Download the list, change prices, MRP, stock, “mode” (buy, quote, or quote_price) or “active” (1 = shown, 0 = hidden) in Excel or Google Sheets, save as CSV, then upload it. Rows are matched by id; new ids are ignored.</p>
    <div class="row" style="flex-wrap:wrap"><a class="btn sm ghost" href="/api/admin/products.csv" download>Download product list (CSV)</a><form data-f="apImport" class="row"><input type="file" name="file" accept=".csv,text/csv" required><button class="btn sm">Upload changes</button></form></div><div id="apImpMsg"></div></div></details>
   <p class="small muted">${rows.length} of ${list.length} products. Change price, stock or visibility in the row, then press Save.</p>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>Sold as</th><th>Price (Rs)</th><th>MRP</th><th>Stock</th><th>Live</th><th></th></tr></thead><tbody>
   ${rows.map(p=>`<tr data-row="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><span class="small muted mono">${esc(p.id)} · ${esc(p.brand)}</span></td>
     <td>${sel('m',[['buy','Buy online'],['quote','Quote, no price'],['quote_price','Quote + guide price']],modeOf(p),'data-k="mode" aria-label="How customers buy it" style="width:150px"')}</td>
     <td><input type="number" min="0" value="${p.price??''}" data-k="price" style="width:100px" aria-label="Price"></td>
     <td><input type="number" min="0" value="${p.mrp??''}" data-k="mrp" style="width:100px" aria-label="MRP"></td>
     <td><input type="number" min="0" value="${p.stock}" data-k="stock" style="width:80px" aria-label="Stock"></td>
     <td><input type="checkbox" data-k="active" ${p.active!==false?'checked':''} aria-label="Visible"></td>
     <td class="row" style="flex-wrap:nowrap"><button class="btn sm" data-a="apRow" data-id="${esc(p.id)}">Save</button><button class="linkbtn" data-a="apEdit" data-id="${esc(p.id)}">Edit</button><a class="small" href="#p-${esc(p.id)}">View</a></td></tr>`).join('')}
   </tbody></table></div>`);
},'Loading products…');
F.apSearch=f=>{pq=f.q.value.trim();refresh()};
A.apNew=()=>{editing='new';refresh();window.scrollTo(0,0)};
A.apEdit=el=>{editing=el.dataset.id;refresh();window.scrollTo(0,0)};
A.apClose=()=>{editing=null;refresh()};
C.apCat=el=>{const c=D.CATS.find(x=>x.id===el.value);document.getElementById('apSubs').innerHTML=(c?.subs||[]).map(s=>`<option value="${esc(s)}">`).join('')};
A.apRow=async el=>{
  const tr=el.closest('tr');const v=k=>tr.querySelector(`[data-k="${k}"]`);
  const price=v('price').value===''?null:+v('price').value;const mode=v('mode').value;
  if(mode==='buy'&&price===null){toast('Enter a price to sell online, or choose a quote option.');return}
  const body={price,...modeBody(mode),mrp:v('mrp').value===''?price:+v('mrp').value,stock:+v('stock').value||0,active:v('active').checked};
  busy(el,true,'Saving…');
  try{await api('/admin/products/'+encodeURIComponent(el.dataset.id),{method:'PUT',body});toast('Saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}
  busy(el,false);
};
F.aprod=async f=>{
  const id=f.dataset.id;const num=x=>x.value===''?null:+x.value;
  const specs={};f.specs.value.split('\n').forEach(l=>{const i=l.indexOf(':');if(i>0){const k=l.slice(0,i).trim(),v=l.slice(i+1).trim();if(k&&v)specs[k]=v}});
  const price=num(f.price);
  if(f.mode.value==='buy'&&price===null){document.getElementById('apErr').innerHTML=errBox('Enter a price to sell this online, or choose a “Get quote” option.');return}
  const body={name:f.name.value.trim(),brand:f.brand.value.trim(),model:f.model.value.trim(),cat:f.cat.value,sub:f.sub.value.trim(),price,...modeBody(f.mode.value),mrp:num(f.mrp)??price,stock:+f.stock.value||0,warranty:f.warranty.value.trim(),
    tags:f.tags.value.split(',').map(s=>s.trim()).filter(Boolean),hl:f.hl.value.split('\n').map(s=>s.trim()).filter(Boolean),specs,active:f.active.checked,
    art:f.art.value||undefined,fbt:f.fbt.value.split(',').map(s=>s.trim()).filter(Boolean),
    breaks:f.breaks.value.split('\n').map(l=>l.split(':').map(x=>+x.replace(/[^0-9]/g,''))).filter(x=>x.length===2&&x[0]>0&&x[1]>0).sort((a,b)=>a[0]-b[0])};
  if(!body.breaks.length) body.breaks=null;
  if(f.sort.value!=='') body.sort=+f.sort.value;
  const b=f.querySelector('button.buy');busy(b,true,'Saving…');
  try{const r=await api(id?'/admin/products/'+encodeURIComponent(id):'/admin/products',{method:id?'PUT':'POST',body});editing=r.product.id;toast(id?'Product saved':'Product added');reloadCatalog().catch(()=>{});refresh()}
  catch(e){document.getElementById('apErr').innerHTML=errBox(e.message);busy(b,false)}
};
A.apDel=async el=>{
  if(!el.dataset.sure){el.dataset.sure='1';el.textContent='Tap again to delete';el.classList.add('buy');return}
  try{const r=await api('/admin/products/'+encodeURIComponent(el.dataset.id),{method:'DELETE'});editing=null;toast(r.archived?'Product has orders, so it was hidden instead of deleted':'Product deleted');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}
};
F.aimg=async f=>{
  const fd=new FormData();[...f.images.files].forEach(x=>fd.append('images',x));
  const b=f.querySelector('button');busy(b,true,'Uploading…');
  try{await api('/admin/products/'+encodeURIComponent(f.dataset.id)+'/images',{method:'POST',body:fd});toast('Photos uploaded');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message);busy(b,false)}
};
A.apImgDel=async el=>{try{await api('/admin/products/'+encodeURIComponent(el.dataset.id)+'/images?url='+encodeURIComponent(el.dataset.url),{method:'DELETE'});reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};

/* ---------- orders ---------- */
PAGES.orders=()=>asyncView(()=>api('/admin/orders?status='+encodeURIComponent(ostatus)+'&q='+encodeURIComponent(oq)),r=>shell('orders','Orders',`
  <div class="between"><form data-f="aoFilter" class="row" style="flex-wrap:wrap">${sel('status',[['','All statuses'],...STATUS],ostatus)}<input type="search" name="q" value="${esc(oq)}" placeholder="Order no, name or phone" aria-label="Search orders"><button class="btn sm ghost">Filter</button></form><a class="btn sm ghost" href="/api/admin/orders.csv" download>Download CSV</a></div>
  <div class="tbl-wrap"><table class="data"><thead><tr><th>Order</th><th>Customer</th><th>Delivery</th><th>Payment</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
  ${r.orders.map(o=>{const i=STATUS.indexOf(o.status);const nxt=o.status==='cancelled'||o.status==='delivered'?null:STATUS[i+1];return `<tr><td><a class="mono" href="#admin-order-${o.order_no}">${o.order_no}</a><br><span class="small muted">${when(o.created_at)}</span></td>
   <td>${esc(o.name)}<br><span class="small mono">${esc(o.phone)}</span></td><td class="small">${o.method==='pickup'?'Store pickup':esc(o.zone_name||'')}${o.install?'<br><b>Install requested</b>':''}</td>
   <td class="small">${o.pay_method==='bank'?'Bank transfer':'Cash on delivery'}<br>${o.pay_method==='bank'&&!/paid/.test(o.pay_status)?`<button class="linkbtn" data-a="aoPaid" data-no="${o.order_no}">Mark paid</button>`:`<span class="muted">${esc(o.pay_status)}</span>`}</td>
   <td class="price">${npr(o.total)}</td><td>${o.status==='cancelled'?pill('cancelled'):sel('st',STATUS,o.status,`data-c="aoStatus" data-no="${o.order_no}" aria-label="Status"`)}</td>
   <td>${nxt?`<button class="btn sm" data-a="aoNext" data-no="${o.order_no}" data-s="${nxt}">Mark ${nxt}</button>`:''}</td></tr>`}).join('')||'<tr><td colspan="7" class="muted">No orders match.</td></tr>'}
  </tbody></table></div>`),'Loading orders…');
F.aoFilter=f=>{ostatus=f.status.value;oq=f.q.value.trim();refresh()};
async function setOrder(no,body,msg){try{await api('/admin/orders/'+encodeURIComponent(no),{method:'PUT',body});toast(msg);if(body.status==='cancelled')reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message);refresh()}}
C.aoStatus=el=>setOrder(el.dataset.no,{status:el.value},el.dataset.no+' → '+el.value);
A.aoNext=el=>setOrder(el.dataset.no,{status:el.dataset.s},el.dataset.no+' → '+el.dataset.s);
A.aoPaid=el=>setOrder(el.dataset.no,{payStatus:'paid (bank)'},'Payment recorded');

/* ---------- quotes & service ---------- */
PAGES.quotes=()=>asyncView(()=>Promise.all([api('/admin/quotes'),api('/admin/service-requests')]),([q,s])=>shell('quotes','Quotes and service',`
  <section class="stack"><h3>Quote requests</h3>${q.quotes.map(x=>`<div class="panel stack"><div class="between"><span><b class="mono">${esc(x.quote_no)}</b> · ${esc(x.name)}${x.org?' · '+esc(x.org):''} · <span class="mono">${esc(x.phone)}</span>${x.email?' · '+esc(x.email):''}</span><span class="small muted">${when(x.created_at)}</span></div>
    <p class="small"><b>${esc(x.type||'')}</b>${x.location?' · '+esc(x.location):''}${x.site_visit?' · <b>Site survey requested</b>':''}</p>${x.requirements?`<p class="small" style="white-space:pre-wrap">${esc(x.requirements)}</p>`:''}
    ${x.items.length?`<ul class="small">${x.items.map(i=>`<li>${i.qty} × ${esc(i.name||i.id)}</li>`).join('')}</ul>`:''}
    <form class="row" data-f="aqSave" data-no="${esc(x.quote_no)}" style="flex-wrap:wrap">${sel('status',['new','quoted','won','closed'],x.status)}<input type="text" name="note" value="${esc(x.staff_note||'')}" placeholder="Staff note" style="flex:1;min-width:200px"><button class="btn sm">Save</button></form></div>`).join('')||'<p class="muted">No quote requests yet.</p>'}</section>
  <section class="stack"><h3>Warranty and service requests</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Request</th><th>Customer</th><th>Serial / order</th><th>Issue</th><th>Status</th></tr></thead><tbody>
  ${s.requests.map(x=>`<tr><td class="mono">${esc(x.request_no)}<br><span class="small muted">${when(x.created_at)}</span></td><td>${esc(x.name)}<br><span class="mono small">${esc(x.phone)}</span></td><td class="small mono">${esc(x.serial)}<br>${esc(x.order_no||'')}</td><td class="small">${esc(x.issue)}</td><td>${sel('st',['new','in progress','resolved'],x.status,`data-c="asStatus" data-no="${esc(x.request_no)}" aria-label="Status"`)}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">None yet.</td></tr>'}</tbody></table></div></section>`),'Loading requests…');
F.aqSave=async f=>{try{await api('/admin/quotes/'+encodeURIComponent(f.dataset.no),{method:'PUT',body:{status:f.status.value,note:f.note.value}});toast('Quote updated')}catch(e){toast(e.message)}};
C.asStatus=async el=>{try{await api('/admin/service-requests/'+encodeURIComponent(el.dataset.no),{method:'PUT',body:{status:el.value}});toast('Request updated')}catch(e){toast(e.message)}};

/* ---------- dealers ---------- */
PAGES.dealers=()=>asyncView(()=>api('/admin/dealers'),r=>shell('dealers','Dealer applications',`
  <p class="small muted">Approved dealers see category discounts (set per category in the database) whenever they are signed in.</p>
  ${r.dealers.map(d=>`<div class="panel stack"><div class="between"><span><b>${esc(d.business)}</b> · PAN <span class="mono">${esc(d.pan)}</span> · ${esc(d.type||'')} · ${esc(d.district||'')}</span>${pill(d.status)}</div>
   <p class="small">${esc(d.name)} · <span class="mono">${esc(d.phone||'')}</span>${d.email?' · '+esc(d.email):''} · applied ${when(d.created_at)}</p>${d.note?`<p class="small">${esc(d.note)}</p>`:''}
   ${d.status==='pending'?`<div class="row"><button class="btn sm buy" data-a="adDecide" data-id="${d.id}" data-s="approved">Approve</button><button class="btn sm ghost" data-a="adDecide" data-id="${d.id}" data-s="rejected">Reject</button></div>`:''}</div>`).join('')||'<p class="muted">No applications yet.</p>'}`),'Loading applications…');
A.adDecide=async el=>{try{await api('/admin/dealers/'+el.dataset.id,{method:'PUT',body:{status:el.dataset.s}});toast('Application '+el.dataset.s);refresh()}catch(e){toast(e.message)}};

/* ---------- reviews & questions ---------- */
PAGES.reviews=()=>asyncView(()=>Promise.all([api('/admin/questions'),api('/admin/reviews')]),([q,r])=>shell('reviews','Reviews and questions',`
  <section class="stack"><h3>Customer questions</h3>${q.questions.map(x=>`<form class="panel stack" data-f="aqa" data-id="${x.id}"><div class="between"><a href="#p-${esc(x.product_id)}" class="small">${esc(x.product_name)}</a><span class="small muted">${when(x.created_at)}</span></div><b>${esc(x.question)}</b>
    <textarea name="answer" rows="2" placeholder="Write the answer customers will see">${esc(x.answer||'')}</textarea><div class="row"><label class="check small"><input type="checkbox" name="visible" ${x.visible?'checked':''}> Show on product page</label><button class="btn sm">${x.answer?'Update':'Answer'}</button><button type="button" class="linkbtn" data-a="aqDel" data-id="${x.id}">Delete</button></div></form>`).join('')||'<p class="muted">No questions yet.</p>'}</section>
  <section class="stack"><h3>Customer reviews</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>Review</th><th>Status</th></tr></thead><tbody>
  ${r.reviews.map(x=>`<tr><td class="small"><a href="#p-${esc(x.product_id)}">${esc(x.product_id)}</a></td><td><b>${'★'.repeat(x.stars)}${'☆'.repeat(5-x.stars)} ${esc(x.title)}</b><br><span class="small">${esc(x.body)}</span><br><span class="small muted">${esc(x.name)}${x.verified?' · verified buyer':''} · ${esc(String(x.review_date).slice(0,10))}</span></td><td>${sel('st',['published','hidden'],x.status,`data-c="arStatus" data-id="${x.id}" aria-label="Status"`)}<br><button class="linkbtn" data-a="arDel" data-id="${x.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="3" class="muted">No customer reviews yet.</td></tr>'}</tbody></table></div></section>`),'Loading…');
F.aqa=async f=>{try{await api('/admin/questions/'+f.dataset.id,{method:'PUT',body:{answer:f.answer.value,visible:f.visible.checked}});toast('Answer saved');T.extrasCache&&Object.keys(T.extrasCache).forEach(k=>delete T.extrasCache[k])}catch(e){toast(e.message)}};
C.arStatus=async el=>{try{await api('/admin/reviews/'+el.dataset.id,{method:'PUT',body:{status:el.value}});toast('Review '+el.value);T.extrasCache&&Object.keys(T.extrasCache).forEach(k=>delete T.extrasCache[k])}catch(e){toast(e.message)}};

/* ---------- deals & coupons ---------- */
PAGES.deals=()=>asyncView(()=>Promise.all([api('/admin/deals'),api('/admin/coupons'),productsCache?Promise.resolve(productsCache):loadProducts()]),([d,c,ps])=>{couponsCache=c.coupons;
  const now=new Date(),later=new Date(now.getTime()+864e5);const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  return shell('deals','Deals and coupons',`
  <section class="panel stack"><div class="between"><h3>Scheduled and live deals</h3><button class="btn sm ghost" data-a="adGen">Auto-fill the next 30 days</button></div>
   <form class="form-grid" data-f="adeal"><label class="field full"><span>Product</span>${sel('productId',ps.filter(p=>!p.quote&&p.active!==false).map(p=>[p.id,p.name]),'')}</label><label class="field"><span>Discount %</span><input type="number" name="pct" min="1" max="90" value="10" required></label><label class="field"><span>Starts</span><input type="datetime-local" name="startsAt" value="${loc(now)}" required></label><label class="field"><span>Ends</span><input type="datetime-local" name="endsAt" value="${loc(later)}" required></label><div class="full"><button class="btn sm">Add deal</button></div></form>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>%</th><th>Starts</th><th>Ends</th><th></th></tr></thead><tbody>${d.deals.slice(0,60).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.pct}%</td><td class="small">${when(x.starts_at)}</td><td class="small">${when(x.ends_at)}</td><td><button class="linkbtn" data-a="adDealDel" data-id="${x.id}">Remove</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No deals scheduled.</td></tr>'}</tbody></table></div></section>
  <section class="panel stack"><h3>Coupons</h3>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Code</th><th>What it does</th><th>Type</th><th>Value</th><th>Active</th><th></th></tr></thead><tbody>${c.coupons.map(x=>`<tr><td class="mono">${esc(x.code)}</td><td class="small">${esc(x.description)}${x.first_order_only?' · first order only':''}</td><td>${esc(x.type)}</td><td>${x.type==='ship'?'Free delivery':Number(x.value)+'%'}</td><td><input type="checkbox" ${x.active?'checked':''} data-c="acActive" data-code="${esc(x.code)}" aria-label="Active"></td><td class="row" style="flex-wrap:nowrap"><button class="linkbtn" data-a="acEdit" data-code="${esc(x.code)}">Edit</button><button class="linkbtn" data-a="acDel" data-code="${esc(x.code)}">Delete</button></td></tr>`).join('')}</tbody></table></div>
   <form class="form-grid" data-f="acoupon"><label class="field"><span>Code</span><input type="text" name="code" required placeholder="DASHAIN10"></label><label class="field"><span>Type</span>${sel('type',[['pct','% off order'],['catpct','% off one category'],['ship','Free delivery']],'pct')}</label>
    <label class="field full"><span>Description shown to customers</span><input type="text" name="description" required></label><label class="field"><span>Percent</span><input type="number" name="value" min="0" max="90" value="5"></label><label class="field"><span>Max discount (Rs)</span><input type="number" name="cap" min="0"></label>
    <label class="field"><span>Minimum order (Rs)</span><input type="number" name="min" min="0"></label><label class="field"><span>Category (for category %)</span>${sel('cat',[['','—'],...D.CATS.map(x=>[x.id,x.name])],'')}</label>
    <label class="field"><span>Expires (optional)</span><input type="date" name="expires"></label><label class="check full"><input type="checkbox" name="first"> First order only</label><div id="acErr" class="full"></div><div class="full"><button class="btn sm">Save coupon</button> <span class="small muted">Saving an existing code updates it.</span></div></form></section>`)},'Loading…');
F.adeal=async f=>{try{await api('/admin/deals',{method:'POST',body:{productId:f.productId.value,pct:+f.pct.value,startsAt:new Date(f.startsAt.value).toISOString(),endsAt:new Date(f.endsAt.value).toISOString()}});toast('Deal added');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};
A.adDealDel=async el=>{try{await api('/admin/deals/'+el.dataset.id,{method:'DELETE'});reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};
A.adGen=async el=>{busy(el,true,'Filling…');try{const r=await api('/admin/deals/generate',{method:'POST'});toast(r.created+' daily deals added');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message);busy(el,false)}};
F.acoupon=async f=>{const n=x=>x.value===''?null:+x.value;
  try{await api('/admin/coupons',{method:'POST',body:{code:f.code.value,type:f.type.value,description:f.description.value,value:+f.value.value||0,cap:n(f.cap),min_subtotal:n(f.min),cat_id:f.cat.value||null,first_order_only:f.first.checked,active:true,expires_at:f.expires.value?f.expires.value+'T23:59:59+05:45':null}});toast('Coupon added');reloadCatalog().catch(()=>{});refresh()}
  catch(e){document.getElementById('acErr').innerHTML=errBox(e.message)}};
A.acDel=async el=>{try{await api('/admin/coupons/'+encodeURIComponent(el.dataset.code),{method:'DELETE'});reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};

/* ---------- delivery zones, company, protection plans, deal rotation ---------- */
PAGES.settings=()=>asyncView(()=>Promise.all([api('/admin/zones'),api('/admin/settings'),productsCache?Promise.resolve(productsCache):loadProducts()]),([z,s,ps])=>shell('settings','Delivery and settings',`
  <section class="panel stack"><h3>Delivery zones</h3><p class="small muted">Customers pick a zone at the top of the store. Fee is per order; delivery is free above the threshold.</p>${z.zones.map(x=>`<form class="form-grid" data-f="azone" data-id="${esc(x.id)}"><label class="field full"><span>Zone name <span class="mono muted">(${esc(x.id)})</span></span><input type="text" name="name" value="${esc(x.name)}"></label><label class="field"><span>Fee (Rs)</span><input type="number" name="fee" min="0" value="${x.fee}"></label><label class="field"><span>Days to deliver</span><input type="number" name="days" min="0" max="30" value="${x.days}"></label><label class="field"><span>Free delivery over (Rs)</span><input type="number" name="free_over" min="0" value="${x.free_over}"></label><div class="full row"><button class="btn sm">Save zone</button>${isAdmin()?`<button type="button" class="linkbtn" data-a="azDel" data-id="${esc(x.id)}">Remove zone</button>`:''}</div></form>`).join('<hr>')}
   ${isAdmin()?`<details><summary><b>Add a delivery zone</b></summary><form class="form-grid" data-f="azAdd" style="margin-top:10px"><label class="field"><span>Code (e.g. east)</span><input type="text" name="id" required></label><label class="field"><span>Zone name</span><input type="text" name="name" required></label><label class="field"><span>Fee (Rs)</span><input type="number" name="fee" min="0" required></label><label class="field"><span>Days to deliver</span><input type="number" name="days" min="0" max="30" required></label><label class="field"><span>Free delivery over (Rs)</span><input type="number" name="free_over" min="0" required></label><div class="full"><button class="btn sm">Add zone</button></div></form></details>`:''}</section>
  ${isAdmin()?`<form class="panel stack" data-f="aset"><h3>Company details</h3><p class="small muted">Shown in the header, footer, invoices and search results.</p><div class="form-grid">${[['name','Company name'],['store','Store name'],['address','Address'],['phone','Phone'],['email','Email'],['pan','PAN / VAT number'],['reg','Company registration no.'],['hours','Opening hours'],['ecomListing','E-commerce listing no.']].map(([k,l])=>`<label class="field ${k==='address'?'full':''}"><span>${l}</span><input type="text" name="${k}" value="${esc(s.company[k]||'')}"></label>`).join('')}</div><button class="btn sm" style="justify-self:start">Save company details</button></form>
  <form class="panel stack" data-f="aprot"><h3>Extended warranty plans</h3><p class="small muted">Offered on products priced Rs 5,000 or more. Price is a percentage of the item price.</p>
   <div class="stack" id="protRows">${s.protection.map((x,i)=>protRow(x,i)).join('')}</div><div class="row"><button type="button" class="btn sm ghost" data-a="aprotAdd">Add plan</button><button class="btn sm">Save plans</button></div></form>
  <form class="panel stack" data-f="aflash"><h3>Daily deal rotation</h3><p class="small muted">“Auto-fill the next 30 days” on the Deals page cycles through these products, one deal per day.</p>
   <div class="stack" id="flashRows">${(s.flash||[]).map((x,i)=>flashRow(x,i,ps)).join('')}</div><div class="row"><button type="button" class="btn sm ghost" data-a="aflashAdd">Add product</button><button class="btn sm">Save rotation</button></div></form>`:'<p class="small muted">Only admins can change company details, warranty plans and deal rotation.</p>'}`),'Loading…');
const protRow=(x,i)=>`<div class="row" style="flex-wrap:wrap" data-row="prot"><input type="text" name="name" value="${esc(x.name)}" placeholder="+1 year extended warranty" style="flex:2;min-width:200px" aria-label="Plan name"><input type="number" name="pct" min="0" max="100" step="0.5" value="${Math.round(x.pct*1000)/10}" style="width:90px" aria-label="Percent of price"><span class="small">% of price</span><input type="hidden" name="id" value="${esc(x.id)}"><button type="button" class="linkbtn" data-a="arowDel">Remove</button></div>`;
const flashRow=(x,i,ps)=>`<div class="row" style="flex-wrap:wrap" data-row="flash">${sel('pid',ps.filter(p=>!p.quote).map(p=>[p.id,p.name]),x[0],'style="flex:2;min-width:220px" aria-label="Product"')}<input type="number" name="pct" min="1" max="90" value="${x[1]}" style="width:80px" aria-label="Discount percent"><span class="small">% off</span><button type="button" class="linkbtn" data-a="arowDel">Remove</button></div>`;
A.arowDel=el=>el.closest('[data-row]').remove();
A.aprotAdd=()=>document.getElementById('protRows').insertAdjacentHTML('beforeend',protRow({id:'p'+Date.now().toString(36),name:'',pct:0.05}));
A.aflashAdd=()=>document.getElementById('flashRows').insertAdjacentHTML('beforeend',flashRow(['',10],0,productsCache||[]));
F.azone=async f=>{try{await api('/admin/zones/'+encodeURIComponent(f.dataset.id),{method:'PUT',body:{name:f.name.value,fee:+f.fee.value,days:+f.days.value,free_over:+f.free_over.value}});toast('Zone saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}};
F.azAdd=async f=>{try{await api('/admin/zones',{method:'POST',body:{id:f.id.value,name:f.name.value,fee:+f.fee.value,days:+f.days.value,free_over:+f.free_over.value}});toast('Zone added');reloadCatalog().then(()=>T.buildHeader()).catch(()=>{});refresh()}catch(e){toast(e.message)}};
A.azDel=async el=>{if(!sure(el,'Tap again to remove'))return;try{await api('/admin/zones/'+encodeURIComponent(el.dataset.id),{method:'DELETE'});toast('Zone removed');reloadCatalog().then(()=>T.buildHeader()).catch(()=>{});refresh()}catch(e){toast(e.message)}};
F.aset=async f=>{const company={};[...f.elements].forEach(x=>{if(x.name)company[x.name]=x.value});try{await api('/admin/settings',{method:'PUT',body:{company}});toast('Company details saved');reloadCatalog().then(()=>T.buildHeader()).catch(()=>{})}catch(e){toast(e.message)}};
F.aprot=async f=>{const protection=[...f.querySelectorAll('[data-row=prot]')].map(r=>({id:r.querySelector('[name=id]').value,name:r.querySelector('[name=name]').value.trim(),pct:(+r.querySelector('[name=pct]').value||0)/100})).filter(x=>x.name);
  try{await api('/admin/settings',{method:'PUT',body:{protection}});toast('Warranty plans saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}};
F.aflash=async f=>{const flash_rotation=[...f.querySelectorAll('[data-row=flash]')].map(r=>[r.querySelector('[name=pid]').value,+r.querySelector('[name=pct]').value||10]).filter(x=>x[0]);
  try{await api('/admin/settings',{method:'PUT',body:{flash_rotation}});toast('Deal rotation saved')}catch(e){toast(e.message)}};
const sure=(el,label)=>{if(el.dataset.sure)return true;el.dataset.sure='1';el.textContent=label;el.classList.add('buy');return false};

/* ---------- helpers shared by new screens ---------- */
let couponsCache=[];
const ART_FALLBACK=['ap','breaker','cable','connector','controller','dccable','drum','hybrid','inverter','kit','light','lirack','lithium','lte','mesh','mount','olt','ont','panel','rack','radio','router','sfp','splitter','station','surge','switch','switchSmall','tubular','ups','wallrack'];
function artKinds(){const s=new Set(ART_FALLBACK);(db().products||[]).forEach(p=>p.art&&s.add(p.art));return [['','—'],...[...s].sort()]}
const PILLARS=[['energy','Energy (amber)'],['power','Power (green)'],['net','Network (blue)'],['isp','ISP (violet)'],['parts','Parts (grey)']];
F.apImport=async f=>{const file=f.file.files[0];if(!file)return;const b=f.querySelector('button');busy(b,true,'Uploading…');
  try{const text=await file.text();const res=await fetch('/api/admin/products/import',{method:'POST',credentials:'same-origin',headers:{'X-Requested-With':'technotri','Content-Type':'text/csv'},body:text});
    const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Upload failed.');
    document.getElementById('apImpMsg').innerHTML=`<div class="alert ok">${data.updated} products updated.${data.missing.length?` Not found (skipped): ${esc(data.missing.slice(0,20).join(', '))}.`:''}${data.skipped&&data.skipped.length?` Kept as quote because they have no price: ${esc(data.skipped.slice(0,20).join(', '))}.`:''}</div>`;
    productsCache=null;reloadCatalog().catch(()=>{});setTimeout(refresh,1500)}
  catch(e){document.getElementById('apImpMsg').innerHTML=errBox(e.message)}busy(b,false)};
C.acActive=async el=>{try{await api('/admin/coupons/'+encodeURIComponent(el.dataset.code),{method:'PUT',body:{active:el.checked}});toast(el.checked?'Coupon switched on':'Coupon switched off');reloadCatalog().catch(()=>{})}catch(e){toast(e.message);refresh()}};
A.acEdit=el=>{const c=couponsCache.find(x=>x.code===el.dataset.code);const f=document.querySelector('form[data-f="acoupon"]');if(!c||!f)return;
  f.code.value=c.code;f.type.value=c.type;f.description.value=c.description;f.value.value=Number(c.value);f.cap.value=c.cap??'';f.min.value=c.min_subtotal??'';f.cat.value=c.cat_id||'';f.first.checked=!!c.first_order_only;f.expires.value=c.expires_at?String(c.expires_at).slice(0,10):'';f.scrollIntoView({block:'center'});f.code.focus()};
A.aqDel=async el=>{if(!sure(el,'Tap again to delete'))return;try{await api('/admin/questions/'+el.dataset.id,{method:'DELETE'});toast('Question deleted');refresh()}catch(e){toast(e.message)}};
A.arDel=async el=>{if(!sure(el,'Tap again to delete'))return;try{await api('/admin/reviews/'+el.dataset.id,{method:'DELETE'});toast('Review deleted');refresh()}catch(e){toast(e.message)}};

/* ---------- order detail ---------- */
const PAYST=['cash on delivery','awaiting transfer','paid (cash)','paid (bank)','refunded'];
PAGES.order=no=>asyncView(()=>api('/admin/orders/'+encodeURIComponent(no)+'/detail'),({order:o,events,customer,raw})=>{
  const i=STATUS.indexOf(o.status);const nxt=o.status==='cancelled'||o.status==='delivered'?null:STATUS[i+1];
  return shell('order-'+no,'Order '+o.no,`
  <div class="row" style="flex-wrap:wrap"><a class="btn sm ghost" href="#admin-orders">← All orders</a><a class="btn sm ghost" href="#order-${esc(o.no)}">Customer view and invoice</a>${pill(o.status)}<span class="small muted">Placed ${fmtStamp(o.t)}</span></div>
  <div class="two" style="grid-template-columns:1.4fr 1fr">
   <div class="stack">
    <section class="panel stack"><h3>Items</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>
     ${o.items.map(x=>`<tr><td>${x.id?`<a href="#p-${esc(x.id)}">${esc(x.name)}</a>`:esc(x.name)}<br><span class="small mono muted">${esc(x.model||'')}</span>${x.prot?`<br><span class="small">+ ${esc(x.prot)} (${npr(x.protAmt)})</span>`:''}</td><td>${x.qty}</td><td class="price">${npr(x.unit)}</td><td class="price">${npr(x.unit*x.qty+x.protAmt)}</td></tr>`).join('')}
     ${o.disc?`<tr><td colspan="3">Discount ${esc(o.coupon||'')}</td><td class="price">−${npr(o.disc)}</td></tr>`:''}<tr><td colspan="3">Delivery (${esc(o.info.method==='pickup'?'store pickup':o.zone||'')})</td><td class="price">${o.ship?npr(o.ship):'Free'}</td></tr>
     <tr><td colspan="3"><b>Total</b> <span class="small muted">VAT ${npr(o.vat)} included</span></td><td class="price"><b>${npr(o.total)}</b></td></tr></tbody></table></div></section>
    <form class="panel stack" data-f="aoUpdate" data-no="${esc(o.no)}"><h3>Status and payment</h3>
     <div class="form-grid"><label class="field"><span>Order status</span>${o.status==='cancelled'?'<input type="text" value="cancelled" disabled>':sel('status',STATUS,o.status)}</label>
     <label class="field"><span>Payment (${o.pay.method==='bank'?'bank transfer':'cash on delivery'})</span>${sel('payStatus',[...new Set([o.pay.status,...PAYST])],o.pay.status)}</label>
     <label class="field full"><span>Note (shown to the customer with a status change; otherwise kept internal)</span><input type="text" name="note" maxlength="255" placeholder="e.g. Rider Ramesh, 98XXXXXXXX"></label></div>
     <div class="row">${nxt?`<button type="button" class="btn sm buy" data-a="aoNext" data-no="${esc(o.no)}" data-s="${nxt}" data-back="1">Mark ${nxt}</button>`:''}<button class="btn sm">Save</button></div></form>
    <section class="panel stack"><h3>Timeline</h3><ol class="small" style="padding-left:18px;display:grid;gap:6px">${events.map(e=>`<li><b>${e.kind==='note'?'Note':esc(e.status)}</b> · ${when(e.created_at)}${e.by_name?` · ${esc(e.by_name)}`:''}${e.note?`<br>${esc(e.note)}`:''}</li>`).join('')}</ol></section>
   </div>
   <form class="panel stack" data-f="aoCust" data-no="${esc(o.no)}"><h3>Customer and delivery</h3>
    ${customer?`<p class="small">Account: <a href="#admin-customer-${customer.id}">${esc(customer.name)}</a>${customer.dealer_status==='approved'?' · dealer':''}</p>`:'<p class="small muted">Guest checkout</p>'}
    <label class="field"><span>Name</span><input type="text" name="name" value="${esc(o.info.name)}"></label>
    <label class="field"><span>Mobile</span><input type="tel" name="phone" value="${esc(o.info.phone)}"></label>
    <label class="field"><span>Email</span><input type="email" name="email" value="${esc(o.info.email||'')}"></label>
    <label class="field"><span>PAN on invoice</span><input type="text" name="pan" value="${esc(o.info.pan||'')}"></label>
    ${o.info.method==='pickup'?'<p class="small"><b>Store pickup</b></p>':`<label class="field"><span>City</span><input type="text" name="city" value="${esc(o.info.city||'')}"></label><label class="field"><span>Ward</span><input type="text" name="ward" value="${esc(o.info.ward||'')}"></label><label class="field"><span>Street and landmark</span><input type="text" name="street" value="${esc(o.info.street||'')}"></label>`}
    ${raw.slot?`<p class="small">Delivery time: <b>${esc(raw.slot)}</b></p>`:''}${raw.install?'<p class="small"><b>Installation requested</b> — call to quote and schedule.</p>':''}
    <label class="field"><span>Customer's order notes</span><textarea name="notes" rows="2">${esc(raw.notes||'')}</textarea></label>
    <button class="btn sm" style="justify-self:start">Save customer details</button></form>
  </div>`)},'Loading order…');
F.aoUpdate=async f=>{const body={payStatus:f.payStatus.value};if(f.status)body.status=f.status.value;if(f.note.value.trim())body.note=f.note.value.trim();
  try{await api('/admin/orders/'+encodeURIComponent(f.dataset.no),{method:'PUT',body});toast('Order updated');if(body.status==='cancelled')reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};
F.aoCust=async f=>{const body={};['name','phone','email','pan','city','ward','street','notes'].forEach(k=>{if(f[k])body[k]=f[k].value.trim()});
  try{await api('/admin/orders/'+encodeURIComponent(f.dataset.no),{method:'PUT',body});toast('Details saved')}catch(e){toast(e.message)}};

/* ---------- customer detail ---------- */
PAGES.customer=id=>asyncView(()=>api('/admin/customers/'+encodeURIComponent(id)),({customer:u,orders,addresses,dealer})=>shell('customer-'+id,u.name,`
  <div class="row"><a class="btn sm ghost" href="#admin-customers">← All customers</a>${pill(u.role)}${u.active?'':pill('disabled')}</div>
  <div class="two" style="grid-template-columns:1fr 1fr">
   <section class="panel stack"><h3>Contact</h3><p class="small">Mobile <b class="mono">${esc(u.phone||'—')}</b><br>Email ${esc(u.email||'—')}<br>PAN ${esc(u.pan||'—')}<br>Joined ${when(u.created_at)}${u.last_login_at?`<br>Last sign-in ${when(u.last_login_at)}`:''}</p>
    <h3>Addresses</h3>${addresses.map(a=>`<p class="small">${esc([a.street,a.ward,a.city].filter(Boolean).join(', '))}</p>`).join('')||'<p class="small muted">None saved.</p>'}</section>
   <section class="panel stack"><h3>Dealer pricing</h3>${dealer?`<p class="small">${esc(dealer.business)} · PAN ${esc(dealer.pan)} · ${esc(dealer.type||'')} · ${esc(dealer.district||'')}</p>`:'<p class="small muted">No application.</p>'}
    <label class="field"><span>Dealer status</span>${sel('dealer',[['none','No dealer pricing'],['approved','Approved: show dealer prices'],['rejected','Rejected']],u.dealer_status==='pending'?'none':u.dealer_status,`data-c="acuDealer" data-id="${u.id}"`)}</label>
    ${isAdmin()?`<form class="stack" data-f="acuPass" data-id="${u.id}"><h3>Reset password</h3><p class="small muted">Set a temporary password and tell the customer by phone. They can change it under Account.</p><div class="row"><input type="text" name="password" minlength="8" required placeholder="New password (8+ characters)" autocomplete="off"><button class="btn sm">Set password</button></div></form>`:''}</section>
  </div>
  <section class="panel stack"><h3>Orders (${orders.length})</h3>${orders.length?`<div class="tbl-wrap"><table class="data"><tbody>${orders.map(o=>`<tr><td><a class="mono" href="#admin-order-${o.order_no}">${o.order_no}</a></td><td class="small">${when(o.created_at)}</td><td class="price">${npr(o.total)}</td><td>${pill(o.status)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small">No orders yet.</p>'}</section>`),'Loading customer…');
C.acuDealer=async el=>{try{await api('/admin/customers/'+el.dataset.id+'/dealer',{method:'PUT',body:{status:el.value}});toast('Dealer status saved')}catch(e){toast(e.message)}};
F.acuPass=async f=>{try{await api('/admin/customers/'+f.dataset.id+'/password',{method:'PUT',body:{password:f.password.value}});f.reset();toast('Password changed')}catch(e){toast(e.message)}};

/* ---------- categories ---------- */
PAGES.categories=()=>asyncView(()=>api('/admin/categories'),r=>shell('categories','Categories',`
  <p class="small muted">Categories appear in the menu, header and footer. Sub-categories group products on each category page. Dealer discount applies to approved dealer accounts.</p>
  ${r.categories.map(c=>catForm(c)).join('')}
  ${isAdmin()?`<details class="panel"><summary><b>Add a category</b></summary><div style="margin-top:10px">${catForm(null)}</div></details>`:'<p class="small muted">Only admins can change categories.</p>'}`),'Loading categories…');
const catForm=c=>`<form class="panel stack" data-f="acat" data-id="${c?esc(c.id):''}"><div class="between"><h3>${c?esc(c.name):'New category'}</h3>${c?`<span class="small muted">/c-${esc(c.id)} · ${c.products} products</span>`:''}</div><div class="form-grid">
  ${c?'':`<label class="field"><span>Web address (e.g. cctv)</span><input type="text" name="id" required></label>`}
  <label class="field"><span>Name</span><input type="text" name="name" value="${esc(c?.name||'')}" required></label>
  <label class="field full"><span>Short description</span><input type="text" name="blurb" value="${esc(c?.blurb||'')}"></label>
  <label class="field full"><span>Sub-categories (one per line)</span><textarea name="subs" rows="4">${esc((c?.subs||[]).join('\n'))}</textarea></label>
  <label class="field"><span>Colour</span>${sel('pillar',PILLARS,c?.pillar||'parts')}</label>
  <label class="field"><span>Illustration</span>${sel('art',artKinds(),c?.art||'')}</label>
  <label class="field"><span>Dealer discount %</span><input type="number" name="dealer" min="0" max="60" step="0.5" value="${c?Math.round(c.dealer_pct*1000)/10:10}"></label>
  <label class="field"><span>Menu position</span><input type="number" name="sort" value="${c?.sort??''}"></label></div>
  ${c&&c.products?`<div class="row" style="flex-wrap:wrap;gap:8px;border-top:1px solid var(--line);padding-top:10px"><span class="small"><b>Switch products to</b></span>${sel('bulkMode',MODES,'buy','aria-label="Sell as"')}<span class="small">in</span>${sel('bulkSub',[['','all sub-categories'],...c.subs],'','aria-label="Sub-category"')}<button type="button" class="btn sm ghost" data-a="acatMode" data-id="${esc(c.id)}">Apply</button></div>`:''}
  ${isAdmin()?`<div class="row"><button class="btn sm">${c?'Save':'Add category'}</button>${c&&!c.products?`<button type="button" class="linkbtn" data-a="acatDel" data-id="${esc(c.id)}">Delete</button>`:''}</div>`:''}</form>`;
A.acatMode=async el=>{const f=el.closest('form');const body={mode:f.bulkMode.value};if(f.bulkSub.value)body.sub=f.bulkSub.value;
  try{const r=await api('/admin/categories/'+encodeURIComponent(el.dataset.id)+'/mode',{method:'PUT',body});toast(`${r.updated} products updated${r.skipped?`; ${r.skipped} without a price stay as quote`:''}`);productsCache=null;reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}};
F.acat=async f=>{const id=f.dataset.id;const body={name:f.name.value.trim(),blurb:f.blurb.value.trim(),subs:f.subs.value.split('\n').map(s=>s.trim()).filter(Boolean),pillar:f.pillar.value,art:f.art.value,dealer_pct:(+f.dealer.value||0)/100};
  if(f.sort.value!=='')body.sort=+f.sort.value;if(!id)body.id=f.id.value.trim();
  try{await api(id?'/admin/categories/'+encodeURIComponent(id):'/admin/categories',{method:id?'PUT':'POST',body});toast('Category saved');await reloadCatalog();T.buildHeader();refresh()}catch(e){toast(e.message)}};
A.acatDel=async el=>{if(!sure(el,'Tap again to delete'))return;try{await api('/admin/categories/'+encodeURIComponent(el.dataset.id),{method:'DELETE'});toast('Category deleted');await reloadCatalog();T.buildHeader();refresh()}catch(e){toast(e.message)}};

/* ---------- website content: home slides, guides, kits, FAQ, site text ---------- */
let ctab='slides';
const CTABS=[['slides','Home banners'],['guides','Guides'],['kits','Kits'],['faq','Help FAQ'],['site','Announcement, newsletter & bank']];
PAGES.content=()=>asyncView(()=>api('/admin/content/'+ctab),r=>shell('content','Website content',`
  <div class="tabs" role="tablist">${CTABS.map(([k,l])=>`<button role="tab" aria-selected="${ctab===k}" data-a="actab" data-k="${k}">${l}</button>`).join('')}</div>
  ${CONTENT_UI[ctab](r.value)}`),'Loading…');
A.actab=el=>{ctab=el.dataset.k;refresh()};
async function saveContent(key,value,msg){await api('/admin/content/'+key,{method:'PUT',body:{value}});toast(msg||'Saved');reloadCatalog().catch(()=>{})}
const moveBtns=`<span class="row" style="gap:4px"><button type="button" class="btn sm ghost" data-a="amove" data-d="-1" aria-label="Move up">↑</button><button type="button" class="btn sm ghost" data-a="amove" data-d="1" aria-label="Move down">↓</button><button type="button" class="linkbtn" data-a="arowDel">Remove</button></span>`;
A.amove=el=>{const row=el.closest('[data-row]');if(el.dataset.d==='-1'&&row.previousElementSibling)row.parentNode.insertBefore(row,row.previousElementSibling);else if(el.dataset.d==='1'&&row.nextElementSibling)row.parentNode.insertBefore(row.nextElementSibling,row)};
const val=(row,n)=>{const el=row.querySelector(`[name="${n}"]`);return el?(el.type==='checkbox'?el.checked:el.value.trim()):''};
const lines=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
const linkHelp='<span class="small muted">Links: a page name such as <span class="mono">deals</span>, <span class="mono">c-solar</span>, <span class="mono">p-mu-10</span> or <span class="mono">g-size-backup</span>.</span>';
const CONTENT_UI={};
const slideRow=s=>`<div class="panel stack" data-row="slide"><div class="between"><b>${esc(s.title||'New banner')}</b>${moveBtns}</div><div class="form-grid">
  <label class="field"><span>Small label</span><input type="text" name="kicker" value="${esc(s.kicker||'')}"></label><label class="field"><span>Colour</span>${sel('pillar',PILLARS,s.pillar||'energy')}</label>
  <label class="field full"><span>Headline</span><input type="text" name="title" value="${esc(s.title||'')}" required></label>
  <label class="field full"><span>Text</span><input type="text" name="text" value="${esc(s.text||'')}"></label>
  <label class="field"><span>Main button text</span><input type="text" name="c1" value="${esc((s.cta||[])[0]||'')}"></label><label class="field"><span>Main button link</span><input type="text" name="l1" value="${esc((s.cta||[])[1]||'')}"></label>
  <label class="field"><span>Second button text (optional)</span><input type="text" name="c2" value="${esc((s.cta2||[])[0]||'')}"></label><label class="field"><span>Second button link</span><input type="text" name="l2" value="${esc((s.cta2||[])[1]||'')}"></label>
  <label class="field"><span>Illustration</span>${sel('art',artKinds().slice(1),s.art||'ups')}</label><label class="check"><input type="checkbox" name="active" ${s.active!==false?'checked':''}> Show on home page</label></div></div>`;
CONTENT_UI.slides=list=>`<form class="stack" data-f="acSlides"><p class="small muted">The rotating banner at the top of the home page. Up to 12. ${linkHelp}</p><div class="stack" id="slideRows">${list.map(slideRow).join('')}</div><div class="row"><button type="button" class="btn sm ghost" data-a="acAddRow" data-k="slide">Add banner</button><button class="btn buy">Save banners</button></div></form>`;
F.acSlides=async f=>{const value=[...f.querySelectorAll('[data-row=slide]')].map(r=>({kicker:val(r,'kicker'),title:val(r,'title'),text:val(r,'text'),art:val(r,'art'),pillar:val(r,'pillar'),cta:[val(r,'c1')||'Shop now',(val(r,'l1')||'deals').replace(/^[#/]+/,'')],...(val(r,'c2')?{cta2:[val(r,'c2'),(val(r,'l2')||'home').replace(/^[#/]+/,'')]}:{}),active:val(r,'active')})).filter(x=>x.title);
  try{await saveContent('slides',value,'Banners saved');refresh()}catch(e){toast(e.message)}};
const faqRow=x=>`<div class="panel stack" data-row="faq"><div class="between"><label class="check small"><input type="checkbox" name="active" ${x.active!==false?'checked':''}> Show</label>${moveBtns}</div><label class="field"><span>Question</span><input type="text" name="q" value="${esc(x.q||'')}"></label><label class="field"><span>Answer</span><textarea name="a" rows="3">${esc(x.a||'')}</textarea></label></div>`;
CONTENT_UI.faq=list=>`<form class="stack" data-f="acFaq"><p class="small muted">Questions on the Help page. Google can show these in search results.</p><div class="stack" id="faqRows">${list.map(faqRow).join('')}</div><div class="row"><button type="button" class="btn sm ghost" data-a="acAddRow" data-k="faq">Add question</button><button class="btn buy">Save FAQ</button></div></form>`;
F.acFaq=async f=>{const value=[...f.querySelectorAll('[data-row=faq]')].map(r=>({q:val(r,'q'),a:val(r,'a'),active:val(r,'active')})).filter(x=>x.q&&x.a);try{await saveContent('faq',value,'FAQ saved');refresh()}catch(e){toast(e.message)}};
const groupCount=ids=>{const m=new Map();ids.forEach(i=>m.set(i,(m.get(i)||0)+1));return [...m]};
const kitRow=k=>`<div class="panel stack" data-row="kit"><div class="between"><b>${esc(k.name||'New kit')}</b>${moveBtns}</div><div class="form-grid">
  <label class="field"><span>Web id (e.g. home-backup-1kva)</span><input type="text" name="id" value="${esc(k.id||'')}"></label><label class="field"><span>Name</span><input type="text" name="name" value="${esc(k.name||'')}"></label>
  <label class="field full"><span>Who it is for</span><input type="text" name="for" value="${esc(k.for||'')}"></label>
  <label class="field full"><span>Products (one per line: “product-id × quantity”)</span><textarea name="items" rows="4">${esc(groupCount(k.items||[]).map(([i,n])=>n>1?`${i} × ${n}`:i).join('\n'))}</textarea></label>
  <label class="field full"><span>Note</span><input type="text" name="note" value="${esc(k.note||'')}"></label>
  <label class="field full"><span>Extra points (one per line)</span><textarea name="extra" rows="2">${esc((k.extra||[]).join('\n'))}</textarea></label>
  <label class="check"><input type="checkbox" name="active" ${k.active!==false?'checked':''}> Show in store</label></div></div>`;
CONTENT_UI.kits=list=>`<form class="stack" data-f="acKits"><p class="small muted">Bundles customers can add to the cart in one click. Product ids are shown on the Products page.</p><div class="stack" id="kitRows">${list.map(kitRow).join('')}</div><div class="row"><button type="button" class="btn sm ghost" data-a="acAddRow" data-k="kit">Add kit</button><button class="btn buy">Save kits</button></div></form>`;
F.acKits=async f=>{const known=new Set((db().products||[]).map(p=>p.id));const bad=[];
  const value=[...f.querySelectorAll('[data-row=kit]')].map(r=>{const items=[];lines(val(r,'items')).forEach(l=>{const [id,n]=l.split(/\s*×\s*|\s+[x*]\s*/i);const pid=id.trim();if(!known.has(pid))bad.push(pid);for(let i=0;i<Math.max(1,+n||1);i++)items.push(pid)});
    return {id:val(r,'id').toLowerCase(),name:val(r,'name'),for:val(r,'for'),items,note:val(r,'note'),extra:lines(val(r,'extra')),active:val(r,'active')}}).filter(x=>x.name);
  if(bad.length){toast('Unknown product id: '+bad[0]+'. Check the id on the Products page.');return}
  try{await saveContent('kits',value,'Kits saved');refresh()}catch(e){toast(e.message)}};
CONTENT_UI.site=s=>`<form class="panel stack" data-f="acSite"><h3>Top announcement bar</h3><label class="field"><span>Announcement</span><input type="text" name="announcement" maxlength="160" value="${esc(s.announcement||'')}"></label>
  <h3>Newsletter box (footer)</h3><div class="form-grid"><label class="field"><span>Heading</span><input type="text" name="newsletterTitle" value="${esc(s.newsletterTitle||'')}"></label><label class="field"><span>Text</span><input type="text" name="newsletterText" value="${esc(s.newsletterText||'')}"></label></div>
  <h3>Bank transfer details</h3><p class="small muted">Shown to customers who choose bank transfer, on their order page.</p><div class="form-grid"><label class="field"><span>Bank</span><input type="text" name="bankName" value="${esc(s.bankName||'')}"></label><label class="field"><span>Branch</span><input type="text" name="bankBranch" value="${esc(s.bankBranch||'')}"></label><label class="field"><span>Account name</span><input type="text" name="bankAccountName" value="${esc(s.bankAccountName||'')}"></label><label class="field"><span>Account number</span><input type="text" name="bankAccountNo" value="${esc(s.bankAccountNo||'')}"></label></div>
  <h3>Returns</h3><label class="field" style="max-width:220px"><span>Return window (days)</span><input type="number" name="returnDays" min="0" max="365" value="${esc(s.returnDays||'7')}"></label>
  <h3>Home page in Google</h3><div class="form-grid"><label class="field full"><span>Title (leave blank for the default)</span><input type="text" name="homeTitle" maxlength="120" value="${esc(s.homeTitle||'')}"></label><label class="field full"><span>Description (about 150 characters)</span><textarea name="homeDescription" rows="2" maxlength="300">${esc(s.homeDescription||'')}</textarea></label></div>
  <button class="btn buy" style="justify-self:start">Save</button></form>`;
F.acSite=async f=>{const value={};[...f.elements].forEach(x=>{if(x.name)value[x.name]=x.value.trim()});try{await saveContent('site',value);await reloadCatalog();T.buildHeader()}catch(e){toast(e.message)}};
A.acAddRow=el=>{const k=el.dataset.k;const box=document.getElementById(k+'Rows');box.insertAdjacentHTML('beforeend',k==='slide'?slideRow({}):k==='faq'?faqRow({}):kitRow({}));box.lastElementChild.scrollIntoView({block:'center'})};

/* guides: list + one-guide editor with a simple text format */
let guidesCache=null;
CONTENT_UI.guides=list=>{guidesCache=list;return `<div class="between"><p class="small muted">Buying guides and how-tos. They rank well in Google and link to products.</p><a class="btn sm" href="#admin-guide-new">New guide</a></div>
  <div class="tbl-wrap"><table class="data"><tbody>${list.map((g,i)=>`<tr><td><a href="#admin-guide-${esc(g.id)}"><b>${esc(g.title)}</b></a><br><span class="small muted">${esc(g.kind)} · ${esc(g.tag)} · /g-${esc(g.id)}</span></td><td>${g.active===false?pill('hidden'):pill('published')}</td><td class="row" style="flex-wrap:nowrap"><button class="btn sm ghost" data-a="agMove" data-i="${i}" data-d="-1" aria-label="Move up">↑</button><button class="btn sm ghost" data-a="agMove" data-i="${i}" data-d="1" aria-label="Move down">↓</button></td></tr>`).join('')}</tbody></table></div>`};
A.agMove=async el=>{const i=+el.dataset.i,j=i+ +el.dataset.d;const l=guidesCache.slice();if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];try{await saveContent('guides',l,'Order saved');refresh()}catch(e){toast(e.message)}};
function guideToText(g){
  if(g.steps&&g.steps.length) return g.steps.map(s=>`### ${s.t}\n${s.p}${s.tip?`\nTip: ${s.tip}`:''}${s.warn?`\nWarning: ${s.warn}`:''}`).join('\n\n');
  return (g.sections||[]).map(s=>`## ${s.h}\n${(s.p||[]).join('\n\n')}${s.table?'\n'+s.table.map(r=>'| '+r.join(' | ')+' |').join('\n'):''}`).join('\n\n');
}
function textToGuide(text){
  const ls=String(text).replace(/\r/g,'').split('\n');const steps=[],sections=[];let cur=null,para=[];
  const flush=()=>{if(!cur||!para.length){para=[];return}const t=para.join(' ').trim();para=[];if(!t)return;if(cur.kind==='step')cur.o.p=cur.o.p?cur.o.p+' '+t:t;else (cur.o.p=cur.o.p||[]).push(t)};
  for(const raw of ls){const l=raw.trim();
    if(l.startsWith('### ')){flush();cur={kind:'step',o:{t:l.slice(4).trim(),p:''}};steps.push(cur.o);continue}
    if(l.startsWith('## ')){flush();cur={kind:'sec',o:{h:l.slice(3).trim()}};sections.push(cur.o);continue}
    if(!cur){if(l){cur={kind:'sec',o:{h:'Overview'}};sections.push(cur.o)}else continue}
    if(cur.kind==='step'&&/^tip:/i.test(l)){flush();cur.o.tip=l.replace(/^tip:\s*/i,'');continue}
    if(cur.kind==='step'&&/^warning:/i.test(l)){flush();cur.o.warn=l.replace(/^warning:\s*/i,'');continue}
    if(cur.kind==='sec'&&l.startsWith('|')){flush();(cur.o.table=cur.o.table||[]).push(l.replace(/^\||\|$/g,'').split('|').map(x=>x.trim()));continue}
    if(!l){flush();continue}
    para.push(l)}
  flush();
  return steps.length?{steps}:{sections};
}
PAGES.guide=id=>asyncView(()=>guidesCache?Promise.resolve(guidesCache):api('/admin/content/guides').then(r=>(guidesCache=r.value)),list=>{
  const g=id==='new'?{id:'',title:'',tag:'',kind:'How-to',mins:5,level:'Beginner',intro:'',products:[],active:true}:list.find(x=>x.id===id);
  if(!g) return shell('content','Guide not found','<p class="muted">This guide no longer exists.</p><a class="btn sm ghost" href="#admin-content">Back</a>');
  return shell('content',g.title||'New guide',`<a class="btn sm ghost" href="#admin-content" data-a="actab" data-k="guides" style="justify-self:start">← All guides</a>
  <form class="panel stack" data-f="aguide" data-orig="${esc(g.id)}"><div class="form-grid">
   <label class="field full"><span>Title</span><input type="text" name="title" value="${esc(g.title)}" required></label>
   <label class="field"><span>Web address (/g-…)</span><input type="text" name="id" value="${esc(g.id)}" required></label>
   <label class="field"><span>Topic (e.g. Backup Power)</span><input type="text" name="tag" value="${esc(g.tag)}"></label>
   <label class="field"><span>Type</span>${sel('kind',['How-to','Explainer','Buying guide','Comparison'],g.kind)}</label>
   <label class="field"><span>Level</span>${sel('level',['Beginner','Intermediate','Advanced'],g.level)}</label>
   <label class="field"><span>Minutes to read</span><input type="number" name="mins" min="1" max="240" value="${g.mins}"></label>
   <label class="field"><span>Illustration</span>${sel('art',artKinds().slice(1),g.art||'ups')}</label>
   <label class="field full"><span>Introduction (also the Google description)</span><textarea name="intro" rows="2" maxlength="600">${esc(g.intro)}</textarea></label>
   <label class="field full"><span>Tools needed (one per line, optional)</span><textarea name="tools" rows="2">${esc((g.tools||[]).join('\n'))}</textarea></label>
   <label class="field full"><span>Products featured (ids, comma separated)</span><input type="text" name="products" value="${esc((g.products||[]).join(', '))}"></label>
   <label class="field full"><span>Body</span><textarea name="body" rows="18" style="font-family:var(--f-mono);font-size:13px">${esc(guideToText(g))}</textarea></label></div>
   <p class="small muted">Format: start a section with <span class="mono">## Heading</span>, or a numbered step with <span class="mono">### Step title</span>. Leave a blank line between paragraphs. Table rows: <span class="mono">| Column | Column |</span> (first row is the header). In steps, start a line with <span class="mono">Tip:</span> or <span class="mono">Warning:</span>.</p>
   <label class="check"><input type="checkbox" name="active" ${g.active!==false?'checked':''}> Published</label><div id="agErr"></div>
   <div class="row"><button class="btn buy">Save guide</button>${g.id?`<a class="btn sm ghost" href="#g-${esc(g.id)}">View</a><button type="button" class="linkbtn" data-a="agDel" data-id="${esc(g.id)}">Delete guide</button>`:''}</div></form>`)},'Loading guide…');
F.aguide=async f=>{const orig=f.dataset.orig;const known=new Set((db().products||[]).map(p=>p.id));
  const products=f.products.value.split(',').map(s=>s.trim()).filter(Boolean);const bad=products.find(x=>!known.has(x));
  if(bad){document.getElementById('agErr').innerHTML=errBox('Unknown product id: '+bad);return}
  const g={id:f.id.value.trim().toLowerCase(),title:f.title.value.trim(),tag:f.tag.value.trim(),kind:f.kind.value,level:f.level.value,mins:+f.mins.value||5,art:f.art.value,intro:f.intro.value.trim(),tools:lines(f.tools.value),products,active:f.active.checked,...textToGuide(f.body.value)};
  if(!g.tools.length)delete g.tools;
  const list=(guidesCache||[]).slice();const i=list.findIndex(x=>x.id===orig);if(i>=0)list[i]=g;else list.unshift(g);
  try{await saveContent('guides',list,'Guide saved');guidesCache=list;if(g.id!==orig)go('admin-guide-'+g.id,true)}catch(e){document.getElementById('agErr').innerHTML=errBox(e.message)}};
A.agDel=async el=>{if(!sure(el,'Tap again to delete this guide'))return;const list=(guidesCache||[]).filter(x=>x.id!==el.dataset.id);try{await saveContent('guides',list,'Guide deleted');guidesCache=list;ctab='guides';go('admin-content')}catch(e){toast(e.message)}};

/* ---------- subscribers & stock alerts ---------- */
PAGES.marketing=()=>asyncView(()=>Promise.all([api('/admin/newsletter'),api('/admin/stock-alerts')]),([n,s])=>shell('marketing','Subscribers and alerts',`
  <section class="panel stack"><div class="between"><h3>Back-in-stock requests (${s.alerts.length})</h3></div><p class="small muted">Customers asked to be told when these come back. Contact them, then mark as done.</p>
   ${s.alerts.length?`<div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>Stock now</th><th>Contact</th><th>Asked</th><th></th></tr></thead><tbody>${s.alerts.map(a=>`<tr><td><a href="#p-${esc(a.product_id)}">${esc(a.name)}</a></td><td class="mono" style="color:${a.stock>0?'var(--good)':'var(--muted)'}">${a.stock}</td><td class="mono small">${esc(a.contact)}</td><td class="small">${when(a.created_at)}</td><td><button class="btn sm ghost" data-a="asaDone" data-id="${a.id}">Mark done</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small">None waiting.</p>'}</section>
  <section class="panel stack"><div class="between"><h3>Newsletter subscribers (${n.subscribers.length})</h3><a class="btn sm ghost" href="/api/admin/newsletter.csv" download>Download CSV</a></div>
   ${n.subscribers.length?`<div class="tbl-wrap"><table class="data"><tbody>${n.subscribers.slice(0,300).map(x=>`<tr><td>${esc(x.email)}</td><td class="small">${when(x.created_at)}</td><td><button class="linkbtn" data-a="anDel" data-e="${esc(x.email)}">Remove</button></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted small">No subscribers yet.</p>'}</section>`),'Loading…');
A.asaDone=async el=>{try{await api('/admin/stock-alerts/'+el.dataset.id,{method:'PUT'});el.closest('tr').remove();toast('Marked done')}catch(e){toast(e.message)}};
A.anDel=async el=>{if(!sure(el,'Tap again'))return;try{await api('/admin/newsletter/'+encodeURIComponent(el.dataset.e),{method:'DELETE'});el.closest('tr').remove();toast('Removed')}catch(e){toast(e.message)}};

/* ---------- customers & staff ---------- */
PAGES.customers=()=>asyncView(()=>api('/admin/customers'),r=>shell('customers','Customers and staff',`
  <div class="tbl-wrap"><table class="data"><thead><tr><th>Name</th><th>Contact</th><th>Orders</th><th>Dealer</th><th>Role</th><th>Active</th></tr></thead><tbody>
  ${r.customers.map(u=>`<tr><td><a href="#admin-customer-${u.id}">${esc(u.name)}</a><br><span class="small muted">joined ${when(u.created_at)}</span></td><td class="small"><span class="mono">${esc(u.phone||'')}</span><br>${esc(u.email||'')}</td><td>${u.orders}</td><td class="small">${esc(u.dealer_status)}</td>
   <td>${isAdmin()&&u.id!==db().user.id?sel('role',['customer','staff','admin'],u.role,`data-c="acuRole" data-id="${u.id}" aria-label="Role"`):esc(u.role)}</td><td>${isAdmin()&&u.id!==db().user.id?`<input type="checkbox" ${u.active?'checked':''} data-c="acuActive" data-id="${u.id}" aria-label="Active">`:(u.active?'Yes':'No')}</td></tr>`).join('')}</tbody></table></div>
  ${isAdmin()?`<form class="panel stack" data-f="astaff"><h3>Add a staff login</h3><div class="form-grid"><label class="field"><span>Name</span><input type="text" name="name" required></label><label class="field"><span>Email</span><input type="email" name="email" required></label><label class="field"><span>Temporary password</span><input type="password" name="password" minlength="8" autocomplete="new-password" required></label><label class="field"><span>Role</span>${sel('role',['staff','admin'],'staff')}</label></div><div id="asErr"></div><button class="btn sm" style="justify-self:start">Create login</button></form>`:''}`),'Loading customers…');
C.acuRole=async el=>{try{await api('/admin/customers/'+el.dataset.id,{method:'PUT',body:{role:el.value}});toast('Role updated')}catch(e){toast(e.message);refresh()}};
C.acuActive=async el=>{try{await api('/admin/customers/'+el.dataset.id,{method:'PUT',body:{active:el.checked}});toast(el.checked?'Account enabled':'Account disabled')}catch(e){toast(e.message);refresh()}};
F.astaff=async f=>{try{await api('/admin/staff',{method:'POST',body:{name:f.name.value,email:f.email.value,password:f.password.value,role:f.role.value}});toast('Staff login created');refresh()}catch(e){document.getElementById('asErr').innerHTML=errBox(e.message)}};
})();
