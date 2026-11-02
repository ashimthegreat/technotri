/* Technotri Store — staff admin panel (talks to /api/admin) */
(function(){
const T=window.TT,{D,esc,npr,fmtStamp,Views,refresh,toast,A,C,F,api,asyncView,errBox,busy,go,reloadCatalog}=T;
const db=()=>T.db;
const TABS=[['','Overview'],['products','Products'],['orders','Orders'],['quotes','Quotes & service'],['dealers','Dealers'],['reviews','Reviews & Q&A'],['deals','Deals & coupons'],['settings','Delivery & settings'],['customers','Customers & staff']];
const STATUS=['placed','confirmed','packed','shipped','delivered','cancelled'];
const isAdmin=()=>db().user?.role==='admin';
const when=s=>s?fmtStamp(new Date(String(s).replace(' ','T')+(String(s).endsWith('Z')?'':'Z')).getTime()):'';
let pending={}, pq='', ostatus='', oq='', editing=null;

const nav=on=>`<nav class="sidenav" aria-label="Admin">${TABS.map(([h,l])=>{const n=h==='orders'?pending.orders:h==='quotes'?(pending.quotes||0)+(pending.service||0):h==='dealers'?pending.dealers:h==='reviews'?pending.questions:0;return `<a href="#admin${h?'-'+h:''}" class="${on===h?'on':''}">${l}${n?` <span class="badge deal" style="margin-left:4px">${n}</span>`:''}</a>`}).join('')}</nav>`;
const shell=(on,title,body)=>`<div class="between"><div><span class="eyebrow">Technotri staff · signed in as ${esc(db().user.name)} (${esc(db().user.role)})</span><h1>${esc(title)}</h1></div><a class="btn sm ghost" href="#home">View store</a></div>
 <div class="acct">${nav(on)}<div class="stack" style="min-width:0">${body}</div></div>`;
const pill=s=>`<span class="pill ${esc(String(s).replace(/\s+/g,'-'))}">${esc(s)}</span>`;
const sel=(name,opts,val,attrs='')=>`<select name="${name}" ${attrs}>${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(val??'')?'selected':''}>${esc(l)}</option>`}).join('')}</select>`;

Views.admin=arg=>{
  if(!db().user) return `<div class="empty"><b>Staff sign-in required.</b><a class="btn" href="#signin">Sign in</a></div>`;
  if(!T.isStaff()) return `<div class="empty"><b>This area is for Technotri staff.</b><a class="btn" href="#home">Back to the store</a></div>`;
  const tab=arg||'';const fn=PAGES[tab];if(!fn) return Views.notfound();
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
   <section class="panel stack"><h3>Latest orders</h3>${s.recent.map(o=>`<div class="between small"><a href="#order-${o.order_no}" class="mono">${o.order_no}</a><span>${esc(o.name)}</span><span class="price">${npr(o.total)}</span>${pill(o.status)}</div>`).join('')||'<p class="muted">None yet.</p>'}</section></div>`);
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
    <label class="field"><span>Price (Rs, VAT incl.; blank = price on quote)</span><input type="number" min="0" name="price" value="${p&&!p.quote?p.price:''}"></label>
    <label class="field"><span>MRP / was price (Rs)</span><input type="number" min="0" name="mrp" value="${p?.mrp??''}"></label>
    <label class="field"><span>Stock</span><input type="number" min="0" name="stock" value="${p?.stock??0}"></label>
    <label class="field"><span>Warranty</span><input type="text" name="warranty" value="${esc(p?.warranty||'')}" placeholder="2 years Nepal warranty"></label>
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
   <p class="small muted">${rows.length} of ${list.length} products. Change price, stock or visibility in the row, then press Save.</p>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>Price (Rs)</th><th>MRP</th><th>Stock</th><th>Live</th><th></th></tr></thead><tbody>
   ${rows.map(p=>`<tr data-row="${esc(p.id)}"><td><b>${esc(p.name)}</b><br><span class="small muted mono">${esc(p.id)} · ${esc(p.brand)}</span></td>
     <td><input type="number" min="0" value="${p.quote?'':p.price}" placeholder="Quote" data-k="price" style="width:100px" aria-label="Price"></td>
     <td><input type="number" min="0" value="${p.mrp??''}" data-k="mrp" style="width:100px" aria-label="MRP"></td>
     <td><input type="number" min="0" value="${p.stock}" data-k="stock" style="width:80px" aria-label="Stock"></td>
     <td><input type="checkbox" data-k="active" ${p.active!==false?'checked':''} aria-label="Visible"></td>
     <td class="row" style="flex-wrap:nowrap"><button class="btn sm" data-a="apRow" data-id="${esc(p.id)}">Save</button><button class="linkbtn" data-a="apEdit" data-id="${esc(p.id)}">Edit</button></td></tr>`).join('')}
   </tbody></table></div>`);
},'Loading products…');
F.apSearch=f=>{pq=f.q.value.trim();refresh()};
A.apNew=()=>{editing='new';refresh();window.scrollTo(0,0)};
A.apEdit=el=>{editing=el.dataset.id;refresh();window.scrollTo(0,0)};
A.apClose=()=>{editing=null;refresh()};
C.apCat=el=>{const c=D.CATS.find(x=>x.id===el.value);document.getElementById('apSubs').innerHTML=(c?.subs||[]).map(s=>`<option value="${esc(s)}">`).join('')};
A.apRow=async el=>{
  const tr=el.closest('tr');const v=k=>tr.querySelector(`[data-k="${k}"]`);
  const price=v('price').value===''?null:+v('price').value;
  const body={price,quote:price===null,mrp:v('mrp').value===''?price:+v('mrp').value,stock:+v('stock').value||0,active:v('active').checked};
  busy(el,true,'Saving…');
  try{await api('/admin/products/'+encodeURIComponent(el.dataset.id),{method:'PUT',body});toast('Saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}
  busy(el,false);
};
F.aprod=async f=>{
  const id=f.dataset.id;const num=x=>x.value===''?null:+x.value;
  const specs={};f.specs.value.split('\n').forEach(l=>{const i=l.indexOf(':');if(i>0){const k=l.slice(0,i).trim(),v=l.slice(i+1).trim();if(k&&v)specs[k]=v}});
  const price=num(f.price);
  const body={name:f.name.value.trim(),brand:f.brand.value.trim(),model:f.model.value.trim(),cat:f.cat.value,sub:f.sub.value.trim(),price,quote:price===null,mrp:num(f.mrp)??price,stock:+f.stock.value||0,warranty:f.warranty.value.trim(),
    tags:f.tags.value.split(',').map(s=>s.trim()).filter(Boolean),hl:f.hl.value.split('\n').map(s=>s.trim()).filter(Boolean),specs,active:f.active.checked};
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
  ${r.orders.map(o=>{const i=STATUS.indexOf(o.status);const nxt=o.status==='cancelled'||o.status==='delivered'?null:STATUS[i+1];return `<tr><td><a class="mono" href="#order-${o.order_no}">${o.order_no}</a><br><span class="small muted">${when(o.created_at)}</span></td>
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
    <textarea name="answer" rows="2" placeholder="Write the answer customers will see">${esc(x.answer||'')}</textarea><div class="row"><label class="check small"><input type="checkbox" name="visible" ${x.visible?'checked':''}> Show on product page</label><button class="btn sm">${x.answer?'Update':'Answer'}</button></div></form>`).join('')||'<p class="muted">No questions yet.</p>'}</section>
  <section class="stack"><h3>Customer reviews</h3><div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>Review</th><th>Status</th></tr></thead><tbody>
  ${r.reviews.map(x=>`<tr><td class="small"><a href="#p-${esc(x.product_id)}">${esc(x.product_id)}</a></td><td><b>${'★'.repeat(x.stars)}${'☆'.repeat(5-x.stars)} ${esc(x.title)}</b><br><span class="small">${esc(x.body)}</span><br><span class="small muted">${esc(x.name)}${x.verified?' · verified buyer':''} · ${esc(String(x.review_date).slice(0,10))}</span></td><td>${sel('st',['published','hidden'],x.status,`data-c="arStatus" data-id="${x.id}" aria-label="Status"`)}</td></tr>`).join('')||'<tr><td colspan="3" class="muted">No customer reviews yet.</td></tr>'}</tbody></table></div></section>`),'Loading…');
F.aqa=async f=>{try{await api('/admin/questions/'+f.dataset.id,{method:'PUT',body:{answer:f.answer.value,visible:f.visible.checked}});toast('Answer saved');T.extrasCache&&Object.keys(T.extrasCache).forEach(k=>delete T.extrasCache[k])}catch(e){toast(e.message)}};
C.arStatus=async el=>{try{await api('/admin/reviews/'+el.dataset.id,{method:'PUT',body:{status:el.value}});toast('Review '+el.value);T.extrasCache&&Object.keys(T.extrasCache).forEach(k=>delete T.extrasCache[k])}catch(e){toast(e.message)}};

/* ---------- deals & coupons ---------- */
PAGES.deals=()=>asyncView(()=>Promise.all([api('/admin/deals'),api('/admin/coupons'),productsCache?Promise.resolve(productsCache):loadProducts()]),([d,c,ps])=>{
  const now=new Date(),later=new Date(now.getTime()+864e5);const loc=x=>new Date(x.getTime()-x.getTimezoneOffset()*6e4).toISOString().slice(0,16);
  return shell('deals','Deals and coupons',`
  <section class="panel stack"><div class="between"><h3>Scheduled and live deals</h3><button class="btn sm ghost" data-a="adGen">Auto-fill the next 30 days</button></div>
   <form class="form-grid" data-f="adeal"><label class="field full"><span>Product</span>${sel('productId',ps.filter(p=>!p.quote&&p.active!==false).map(p=>[p.id,p.name]),'')}</label><label class="field"><span>Discount %</span><input type="number" name="pct" min="1" max="90" value="10" required></label><label class="field"><span>Starts</span><input type="datetime-local" name="startsAt" value="${loc(now)}" required></label><label class="field"><span>Ends</span><input type="datetime-local" name="endsAt" value="${loc(later)}" required></label><div class="full"><button class="btn sm">Add deal</button></div></form>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Product</th><th>%</th><th>Starts</th><th>Ends</th><th></th></tr></thead><tbody>${d.deals.slice(0,60).map(x=>`<tr><td>${esc(x.name)}</td><td>${x.pct}%</td><td class="small">${when(x.starts_at)}</td><td class="small">${when(x.ends_at)}</td><td><button class="linkbtn" data-a="adDealDel" data-id="${x.id}">Remove</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No deals scheduled.</td></tr>'}</tbody></table></div></section>
  <section class="panel stack"><h3>Coupons</h3>
   <div class="tbl-wrap"><table class="data"><thead><tr><th>Code</th><th>What it does</th><th>Type</th><th>Value</th><th>Active</th><th></th></tr></thead><tbody>${c.coupons.map(x=>`<tr><td class="mono">${esc(x.code)}</td><td class="small">${esc(x.description)}${x.first_order_only?' · first order only':''}</td><td>${esc(x.type)}</td><td>${x.type==='ship'?'Free delivery':Number(x.value)+'%'}</td><td>${x.active?'Yes':'No'}</td><td><button class="linkbtn" data-a="acDel" data-code="${esc(x.code)}">Delete</button></td></tr>`).join('')}</tbody></table></div>
   <form class="form-grid" data-f="acoupon"><label class="field"><span>Code</span><input type="text" name="code" required placeholder="DASHAIN10"></label><label class="field"><span>Type</span>${sel('type',[['pct','% off order'],['catpct','% off one category'],['ship','Free delivery']],'pct')}</label>
    <label class="field full"><span>Description shown to customers</span><input type="text" name="description" required></label><label class="field"><span>Percent</span><input type="number" name="value" min="0" max="90" value="5"></label><label class="field"><span>Max discount (Rs)</span><input type="number" name="cap" min="0"></label>
    <label class="field"><span>Minimum order (Rs)</span><input type="number" name="min" min="0"></label><label class="field"><span>Category (for category %)</span>${sel('cat',[['','—'],...D.CATS.map(x=>[x.id,x.name])],'')}</label>
    <label class="check full"><input type="checkbox" name="first"> First order only</label><div id="acErr" class="full"></div><div class="full"><button class="btn sm">Add coupon</button></div></form></section>`)},'Loading…');
F.adeal=async f=>{try{await api('/admin/deals',{method:'POST',body:{productId:f.productId.value,pct:+f.pct.value,startsAt:new Date(f.startsAt.value).toISOString(),endsAt:new Date(f.endsAt.value).toISOString()}});toast('Deal added');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};
A.adDealDel=async el=>{try{await api('/admin/deals/'+el.dataset.id,{method:'DELETE'});reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};
A.adGen=async el=>{busy(el,true,'Filling…');try{const r=await api('/admin/deals/generate',{method:'POST'});toast(r.created+' daily deals added');reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message);busy(el,false)}};
F.acoupon=async f=>{const n=x=>x.value===''?null:+x.value;
  try{await api('/admin/coupons',{method:'POST',body:{code:f.code.value,type:f.type.value,description:f.description.value,value:+f.value.value||0,cap:n(f.cap),min_subtotal:n(f.min),cat_id:f.cat.value||null,first_order_only:f.first.checked,active:true}});toast('Coupon added');reloadCatalog().catch(()=>{});refresh()}
  catch(e){document.getElementById('acErr').innerHTML=errBox(e.message)}};
A.acDel=async el=>{try{await api('/admin/coupons/'+encodeURIComponent(el.dataset.code),{method:'DELETE'});reloadCatalog().catch(()=>{});refresh()}catch(e){toast(e.message)}};

/* ---------- delivery zones & company settings ---------- */
PAGES.settings=()=>asyncView(()=>Promise.all([api('/admin/zones'),api('/admin/settings')]),([z,s])=>shell('settings','Delivery and settings',`
  <section class="panel stack"><h3>Delivery zones</h3>${z.zones.map(x=>`<form class="form-grid" data-f="azone" data-id="${esc(x.id)}"><label class="field full"><span>Zone name</span><input type="text" name="name" value="${esc(x.name)}"></label><label class="field"><span>Fee (Rs)</span><input type="number" name="fee" min="0" value="${x.fee}"></label><label class="field"><span>Days to deliver</span><input type="number" name="days" min="0" max="30" value="${x.days}"></label><label class="field"><span>Free delivery over (Rs)</span><input type="number" name="free_over" min="0" value="${x.free_over}"></label><div class="full"><button class="btn sm">Save zone</button></div></form>`).join('<hr>')}</section>
  ${isAdmin()?`<form class="panel stack" data-f="aset"><h3>Company details (invoice, footer, contact)</h3><div class="form-grid">${Object.entries(s.company).map(([k,v])=>`<label class="field ${String(v).length>40?'full':''}"><span>${esc(k)}</span><input type="text" name="${esc(k)}" value="${esc(v)}"></label>`).join('')}</div><button class="btn sm" style="justify-self:start">Save company details</button></form>`:'<p class="small muted">Only admins can change company details.</p>'}
  <section class="panel stack"><h3>Bank transfer details</h3><p class="small muted">Customers who choose bank transfer receive an email asking for payment. Add your bank name, account name and account number as company details (keys such as <span class="mono">bank</span>, <span class="mono">bankAccountName</span>, <span class="mono">bankAccountNo</span>) so staff can copy them into replies.</p></section>`),'Loading…');
F.azone=async f=>{try{await api('/admin/zones/'+encodeURIComponent(f.dataset.id),{method:'PUT',body:{name:f.name.value,fee:+f.fee.value,days:+f.days.value,free_over:+f.free_over.value}});toast('Zone saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}};
F.aset=async f=>{const company={};[...f.elements].forEach(x=>{if(x.name)company[x.name]=x.value});try{await api('/admin/settings',{method:'PUT',body:{company}});toast('Settings saved');reloadCatalog().catch(()=>{})}catch(e){toast(e.message)}};

/* ---------- customers & staff ---------- */
PAGES.customers=()=>asyncView(()=>api('/admin/customers'),r=>shell('customers','Customers and staff',`
  <div class="tbl-wrap"><table class="data"><thead><tr><th>Name</th><th>Contact</th><th>Orders</th><th>Dealer</th><th>Role</th><th>Active</th></tr></thead><tbody>
  ${r.customers.map(u=>`<tr><td>${esc(u.name)}<br><span class="small muted">joined ${when(u.created_at)}</span></td><td class="small"><span class="mono">${esc(u.phone||'')}</span><br>${esc(u.email||'')}</td><td>${u.orders}</td><td class="small">${esc(u.dealer_status)}</td>
   <td>${isAdmin()&&u.id!==db().user.id?sel('role',['customer','staff','admin'],u.role,`data-c="acuRole" data-id="${u.id}" aria-label="Role"`):esc(u.role)}</td><td>${isAdmin()&&u.id!==db().user.id?`<input type="checkbox" ${u.active?'checked':''} data-c="acuActive" data-id="${u.id}" aria-label="Active">`:(u.active?'Yes':'No')}</td></tr>`).join('')}</tbody></table></div>
  ${isAdmin()?`<form class="panel stack" data-f="astaff"><h3>Add a staff login</h3><div class="form-grid"><label class="field"><span>Name</span><input type="text" name="name" required></label><label class="field"><span>Email</span><input type="email" name="email" required></label><label class="field"><span>Temporary password</span><input type="password" name="password" minlength="8" autocomplete="new-password" required></label><label class="field"><span>Role</span>${sel('role',['staff','admin'],'staff')}</label></div><div id="asErr"></div><button class="btn sm" style="justify-self:start">Create login</button></form>`:''}`),'Loading customers…');
C.acuRole=async el=>{try{await api('/admin/customers/'+el.dataset.id,{method:'PUT',body:{role:el.value}});toast('Role updated')}catch(e){toast(e.message);refresh()}};
C.acuActive=async el=>{try{await api('/admin/customers/'+el.dataset.id,{method:'PUT',body:{active:el.checked}});toast(el.checked?'Account enabled':'Account disabled')}catch(e){toast(e.message);refresh()}};
F.astaff=async f=>{try{await api('/admin/staff',{method:'POST',body:{name:f.name.value,email:f.email.value,password:f.password.value,role:f.role.value}});toast('Staff login created');refresh()}catch(e){document.getElementById('asErr').innerHTML=errBox(e.message)}};
})();
