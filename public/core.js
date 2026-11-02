/* Technotri Store — core: API client, local state, pricing preview, shared components, header, router, events.
   Catalog, accounts, orders and admin data come from the server (/api). The cart, compare list,
   recently viewed and quote list are kept in the browser until checkout. */
(function(){
const art=window.TTArt;
const D={GUIDES:[],KITS:[],FAQ:[],SLIDES:[],SITE:{},CATS:[],ZONES:[],COUPONS:[],PROTECT:[],COMPANY:{}};
const KEY='technotri-local-v1';

/* ---------------- API ---------------- */
async function api(path,opts={}){
  const o={method:opts.method||'GET',headers:{'X-Requested-With':'technotri'},credentials:'same-origin'};
  if(opts.body!==undefined){
    if(opts.body instanceof FormData) o.body=opts.body;
    else{o.headers['Content-Type']='application/json';o.body=JSON.stringify(opts.body)}
  }
  let res;
  try{res=await fetch('/api'+path,o)}catch(e){throw new Error('Could not reach the store. Check your connection and try again.')}
  let data={};try{data=await res.json()}catch(e){}
  if(!res.ok){const err=new Error(data.error||'Something went wrong. Please try again.');err.status=res.status;throw err}
  return data;
}

/* ---------------- local state ---------------- */
const fresh=()=>({cart:[],saved:[],wish:[],compare:[],recent:[],quoteList:[],zone:'ktm',coupon:null,view:'grid',pickup:false});
let local;
try{local=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){local=null}
if(!local||typeof local!=='object') local=fresh();
local=Object.assign(fresh(),local);
const db=Object.assign(local,{products:[],user:null,orders:null,deals:[]});
let wishTimer;
const Store={
  get db(){return db},
  save(){
    try{const {cart,saved,wish,compare,recent,quoteList,zone,coupon,view,pickup}=db;localStorage.setItem(KEY,JSON.stringify({cart,saved,wish,compare,recent,quoteList,zone,coupon,view,pickup}))}catch(e){}
  },
  syncWish(){ if(!db.user) return; clearTimeout(wishTimer); wishTimer=setTimeout(()=>api('/account/wishlist',{method:'PUT',body:{ids:db.wish}}).catch(()=>{}),400) }
};

/* ---------------- helpers ---------------- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const npr=n=>n==null?'—':'Rs '+Math.round(n).toLocaleString('en-IN');
const r10=n=>Math.round(n/10)*10;
let byId=new Map();
const prod=id=>byId.get(id);
const cat=id=>D.CATS.find(c=>c.id===id);
const zone=()=>D.ZONES.find(z=>z.id===db.zone)||D.ZONES[0];
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const hash=s=>{let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)};
const NPT=5*3600e3+45*60e3;
const nptNow=()=>new Date(Date.now()+NPT);
const dayIndex=()=>Math.floor((Date.now()+NPT)/864e5);
const DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=d=>`${DAYS.at(d.getUTCDay())}, ${d.getUTCDate()} ${MONTHS.at(d.getUTCMonth())}`;
const fmtStamp=t=>{const d=new Date(t+NPT);return `${d.getUTCDate()} ${MONTHS.at(d.getUTCMonth())} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`};
function etaDate(days){
  const d=nptNow(); let add=days+(d.getUTCHours()>=16?1:0);
  while(add>0){d.setUTCDate(d.getUTCDate()+1); if(d.getUTCDay()!==6) add--;}
  if(d.getUTCDay()===6) d.setUTCDate(d.getUTCDate()+1);
  return fmtDate(d);
}
const isDealer=()=>!!(db.user&&db.user.dealer==='approved');
const isStaff=()=>!!(db.user&&(db.user.role==='admin'||db.user.role==='staff'));

/* ---------------- deals & pricing (preview; the server recalculates at checkout) ---------------- */
const flashToday=()=>db.deals.filter(([id])=>prod(id));
function flashPct(id){const f=db.deals.find(([x])=>x===id);return f?f[1]:0}
function dotd(){return flashToday()[0]||[db.products.find(p=>!p.quote&&p.stock>0)?.id,0,null]}
function dealEnds(){const d=dotd();return d&&d[2]?Date.parse(d[2]):Date.now()+((86400-((nptNow().getUTCHours()*3600)+(nptNow().getUTCMinutes()*60)+nptNow().getUTCSeconds()))*1000)}
function claimed(id){return 35+hash(id+':'+dayIndex())%58}
function unitPrice(p,qty=1){
  if(!p||p.price==null||p.quote) return null;
  let u=p.price;
  const f=flashPct(p.id); if(f) u=Math.min(u,r10(p.price*(1-f/100)));
  if(p.breaks){let t=p.breaks[0][1];p.breaks.forEach(([q,pr])=>{if(qty>=q)t=pr});u=Math.min(u,t)}
  if(isDealer()) u=Math.min(u,r10(p.price*(1-(cat(p.cat)?.dealer||0))));
  return u;
}
function wasPrice(p){const u=unitPrice(p);const w=Math.max(p.mrp||0,p.price||0);return u!=null&&w>u?w:null}
function offPct(p){const w=wasPrice(p),u=unitPrice(p);return w?Math.round((1-u/w)*100):0}

/* ---------------- reviews (loaded per product) ---------------- */
const extras={};
function reviewsOf(id){return (extras[id]&&extras[id].reviews)||[]}
function ratingOf(p){return p.rating||[0,0]}
function distOf(p){
  if(extras[p.id]&&extras[p.id].dist) return extras[p.id].dist;
  const [a,cnt]=p.rating||[0,0];
  const w=[1,2,3,4,5].map(s=>Math.exp(-((s-a)**2)/(2*.85**2)));const sw=w.reduce((x,y)=>x+y,0);
  return w.map(x=>Math.round(x/sw*cnt));
}
async function loadExtras(id,force){ if(!extras[id]||force) extras[id]=await api('/products/'+encodeURIComponent(id)+'/extras'); return extras[id] }

/* ---------------- small components ---------------- */
const STAR='M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z';
let starSeq=0;
function stars(v,size=14){
  let s='';for(let i=1;i<=5;i++){const f=Math.max(0,Math.min(1,v-i+1));const id='g'+(++starSeq);
  s+=`<svg width="${size}" height="${size}" viewBox="0 0 20 20" aria-hidden="true"><defs><linearGradient id="${id}"><stop offset="${f*100}%" stop-color="var(--accent)"/><stop offset="${f*100}%" stop-color="var(--line-2)"/></linearGradient></defs><path d="${STAR}" fill="url(#${id})"/></svg>`}
  return `<span class="stars" role="img" aria-label="${v.toFixed(1)} out of 5 stars">${s}</span>`;
}
function ratingLine(p){const [a,n]=ratingOf(p);return n?`<span class="rating">${stars(a)}<span class="num">${a.toFixed(1)}</span><span>(${n})</span></span>`:'<span class="rating">No reviews yet</span>'}
const scoreCls=s=>s>=8?'s-hi':s>=6.5?'s-mid':'s-lo';
const labBadge=p=>p.lab?`<span class="score ${scoreCls(p.lab.score)}" title="Technotri Lab score">${p.lab.score.toFixed(1)}</span>`:'';
function stockLine(p){
  if(p.quote) return '<span class="stock order">Made to order · quote</span>';
  if(p.stock<=0) return '<span class="stock out">Out of stock</span>';
  if(p.stock<=8) return `<span class="stock low">Only ${p.stock} left</span>`;
  return '<span class="stock in">In stock</span>';
}
function badgesOf(p){
  const b=[];const f=flashPct(p.id);
  if(f) b.push(`<span class="badge deal">−${f}% today</span>`); else if(offPct(p)>=8) b.push(`<span class="badge deal">−${offPct(p)}%</span>`);
  if((p.tags||[]).includes('best')) b.push('<span class="badge best">Best seller</span>');
  if((p.tags||[]).includes('new')) b.push('<span class="badge new">New</span>');
  return b.join('');
}
function priceLine(p,big){
  if(p.quote&&p.refPrice) return `<div class="price-line"><span class="small muted">Guide price</span> <span class="now price">${npr(p.price)}</span><span class="small muted">· final price by quote</span></div>`;
  if(p.quote||p.price==null) return `<div class="price-line"><span class="now price" style="font-size:${big?'22px':'15px'}">Price on quote</span></div>`;
  const u=unitPrice(p),w=wasPrice(p);
  return `<div class="price-line"><span class="now price">${npr(u)}</span>${w?`<s>${npr(w)}</s><span class="off">−${offPct(p)}%</span>`:''}${isDealer()?'<span class="badge dealer">Dealer</span>':''}</div>`;
}
const keyspecs=(p,n=3)=>Object.entries(p.specs||{}).filter(([k])=>k!=='Type').slice(0,n).map(([,v])=>esc(v)).join(' · ');
/** Product picture: uploaded photo when there is one, otherwise the drawn illustration. */
function pic(p,v=0){
  if(p&&p.images&&p.images.length){const src=p.images[Math.min(v,p.images.length-1)];return `<img src="${esc(src)}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:contain">`}
  return art(p?p.art:'kit',v);
}
const heart=on=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="${on?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;

function card(p){
  const w=db.wish.includes(p.id), c=db.compare.includes(p.id), z=zone();
  return `<article class="pcard">
    <a class="pic" href="#p-${p.id}" aria-label="${esc(p.name)}">${pic(p)}<span class="badges">${badgesOf(p)}</span><span class="lab">${labBadge(p)}</span></a>
    <button class="icon-btn wish" data-a="wish" data-id="${p.id}" aria-pressed="${w}" aria-label="${w?'Remove from':'Add to'} wishlist">${heart(w)}</button>
    <div class="body"><span class="brand">${esc(p.brand)}</span><a class="name" href="#p-${p.id}">${esc(p.name)}</a>${ratingLine(p)}<span class="keys">${keyspecs(p)}</span></div>
    <div class="foot">${priceLine(p)}
      ${p.quote?'':`<span class="eta">${p.stock>0?`Get it by <b>${etaDate(z.days)}</b>`:'Out of stock'}</span>`}
      <div class="between"><label class="cmp"><input type="checkbox" data-c="cmp" data-id="${p.id}" ${c?'checked':''}> Compare</label>
      ${p.quote?`<button class="btn sm ghost" data-a="quote" data-id="${p.id}">Get quote</button>`:p.stock>0?`<button class="btn sm buy" data-a="add" data-id="${p.id}">Add to cart</button>`:`<button class="btn sm ghost" data-a="notify" data-id="${p.id}">Notify me</button>`}</div>
    </div></article>`;
}
function rowCard(p){
  const z=zone();
  return `<article class="prow"><a class="pic" href="#p-${p.id}" aria-label="${esc(p.name)}">${pic(p)}</a>
   <div style="min-width:0;display:grid;gap:4px"><span class="brand muted small mono">${esc(p.brand)} · ${esc(p.model||'')}</span><a href="#p-${p.id}" style="color:var(--ink);font-weight:600;font-size:16px">${esc(p.name)}</a><div class="row">${ratingLine(p)}${labBadge(p)}${badgesOf(p)}</div>
   <ul>${(p.hl||[]).slice(0,3).map(h=>`<li>${esc(h)}</li>`).join('')}</ul></div>
   <div class="side">${priceLine(p,true)}${stockLine(p)}${p.quote||p.stock<=0?'':`<span class="eta">Get it by <b>${etaDate(z.days)}</b></span>`}
    ${p.quote?`<button class="btn ghost" data-a="quote" data-id="${p.id}">Get quote</button>`:p.stock>0?`<button class="btn buy" data-a="add" data-id="${p.id}">Add to cart</button>`:`<button class="btn ghost" data-a="notify" data-id="${p.id}">Notify me</button>`}
    <label class="cmp small muted"><input type="checkbox" data-c="cmp" data-id="${p.id}" ${db.compare.includes(p.id)?'checked':''}> Compare</label></div></article>`;
}

/* ---------------- toasts, drawer, modal ---------------- */
let toastT;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,3200)}
function overlay(html,kind='drawer'){
  closeOverlay();
  const s=document.createElement('div');s.className='scrim';s.id='scrim';s.dataset.a='close';
  const box=document.createElement('div');box.id='overlay';
  if(kind==='drawer'){box.className='drawer';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.innerHTML=html}
  else{box.className='modal';box.innerHTML=`<div class="box" role="dialog" aria-modal="true">${html}</div>`;box.addEventListener('click',e=>{if(e.target===box)closeOverlay()})}
  document.body.append(s,box);
  const f=box.querySelector('input,button,a');f&&f.focus();
}
function closeOverlay(){document.getElementById('scrim')?.remove();document.getElementById('overlay')?.remove()}
const errBox=(msg)=>`<div class="alert err">${esc(msg)}</div>`;
function busy(btn,on,label){if(!btn)return;if(on){btn.dataset.label=btn.textContent;btn.disabled=true;btn.textContent=label||'Please wait…'}else{btn.disabled=false;if(btn.dataset.label)btn.textContent=btn.dataset.label}}

/* ---------------- cart ops ---------------- */
function addToCart(id,qty=1,prot=null,quiet=false){
  const p=prod(id); if(!p) return;
  if(p.quote){addToQuote(id,qty);return}
  if(p.stock<=0){toast('This item is out of stock');return}
  const line=db.cart.find(l=>l.id===id&&(l.prot||null)===prot);
  const inCart=db.cart.filter(l=>l.id===id).reduce((a,l)=>a+l.qty,0);
  if(inCart+qty>p.stock){toast(`Only ${p.stock} available`);qty=Math.max(0,p.stock-inCart);if(!qty)return}
  if(line) line.qty=Math.min(999,line.qty+qty); else db.cart.push({id,qty,prot});
  Store.save();UI.counts();
  if(!quiet) addedDrawer(p,qty);
}
function addToQuote(id,qty=1){
  const l=db.quoteList.find(x=>x.id===id); if(l) l.qty+=qty; else db.quoteList.push({id,qty});
  Store.save();UI.counts();toast('Added to your quote list');
}
function cartTotals(){
  db.cart=db.cart.filter(l=>prod(l.id)&&!prod(l.id).quote);
  const z=zone(); const lines=db.cart.map(l=>{const p=prod(l.id);const u=unitPrice(p,l.qty);const pr=l.prot&&p.price>=5000?D.PROTECT.find(x=>x.id===l.prot):null;
    return {...l,p,unit:u,line:u*l.qty,protAmt:pr?r10(u*pr.pct)*l.qty:0,pr}});
  const items=lines.reduce((a,l)=>a+l.line,0), prot=lines.reduce((a,l)=>a+l.protAmt,0);
  let disc=0, freeShip=false, cmsg='';
  const cp=db.coupon&&D.COUPONS.find(c=>c.code===db.coupon);
  if(db.coupon&&!cp){cmsg='That coupon is no longer available.'}
  if(cp){
    if(cp.first&&db.user&&db.user.orderCount>0) cmsg=`${cp.code} is for first orders only.`;
    else if(cp.type==='pct') disc=Math.min(cp.cap||Infinity,r10(items*cp.v/100));
    else if(cp.type==='catpct'){const sub=lines.filter(l=>l.p.cat===cp.cat).reduce((a,l)=>a+l.line,0); if(sub>=(cp.min||0)) disc=Math.min(cp.cap||Infinity,r10(sub*cp.v/100)); else cmsg=`Add ${npr((cp.min||0)-sub)} more of ${cat(cp.cat)?.name||'this category'} to use ${cp.code}.`}
    else if(cp.type==='ship') freeShip=true;
  }
  const ship=db.pickup||freeShip||items>=z.free||!lines.length?0:z.fee;
  const total=Math.max(0,items+prot-disc+ship);
  const taxable=total/1.13, vat=total-taxable;
  return {lines,items,prot,disc,ship,total,taxable,vat,cp,cmsg,z,toFree:Math.max(0,z.free-items)};
}
function addedDrawer(p,qty){
  const t=cartTotals();
  const recs=(p.fbt||[]).map(prod).filter(x=>x&&!x.quote&&x.stock>0).slice(0,3);
  overlay(`<header class="between"><h3 style="color:var(--good)">✓ Added to cart</h3><button class="icon-btn" data-a="close" aria-label="Close">✕</button></header>
   <div class="body">
    <div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div style="width:90px;height:68px;flex:none;background:var(--surface-2);border-radius:6px">${pic(p)}</div><div class="stack" style="gap:4px"><b>${esc(p.name)}</b><span class="muted small">Qty ${qty} · ${npr(unitPrice(p,qty)*qty)}</span></div></div>
    <div class="freebar">${t.ship===0&&t.items>=t.z.free?`<span style="color:var(--good)">Free delivery to ${esc(t.z.name)} unlocked.</span>`:`<span>Add <b class="mono">${npr(t.toFree)}</b> more for free delivery to ${esc(t.z.name)}.</span>`}<div class="meter-bar"><i style="width:${Math.min(100,t.items/t.z.free*100)}%"></i></div></div>
    ${recs.length?`<div class="stack"><h4>Often bought with this</h4>${recs.map(r=>`<div class="row" style="flex-wrap:nowrap"><div style="width:64px;height:48px;flex:none;background:var(--surface-2);border-radius:6px">${pic(r)}</div><div style="flex:1;min-width:0;display:grid;gap:2px"><a href="#p-${r.id}" data-a="close" class="small" style="color:var(--ink);font-weight:600">${esc(r.name)}</a><span class="price small">${npr(unitPrice(r))}</span></div><button class="btn sm ghost" data-a="add-quiet" data-id="${r.id}">Add</button></div>`).join('')}</div>`:''}
   </div>
   <footer><div class="between"><span>Cart subtotal (${db.cart.reduce((a,l)=>a+l.qty,0)} items)</span><b class="price">${npr(t.items+t.prot)}</b></div>
    <a class="btn buy block" href="#checkout" data-a="close">Checkout</a><a class="btn ghost block" href="#cart" data-a="close">View cart</a></footer>`);
}

/* ---------------- routing (real URLs: /c-solar, /p-mu-10, …) ---------------- */
const current=()=>decodeURIComponent(location.pathname.replace(/^\/+/,'').replace(/\/+$/,''))||'home';
function go(path,replace){
  const p=String(path).replace(/^[#/]+/,'');
  const url=!p||p==='home'?'/':'/'+p;
  if(url===location.pathname&&!replace){route();return}
  history[replace?'replaceState':'pushState']({},'',url);route();
}
/** Turn in-app "#name" links into real URLs so they can be opened in new tabs and crawled. */
function fixLinks(root){
  (root.querySelectorAll?root:document).querySelectorAll('a[href^="#"]:not([data-prevent])').forEach(a=>{
    const h=a.getAttribute('href').slice(1);if(!h)return;a.setAttribute('href',h==='home'?'/':'/'+h);
  });
}
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1){if(n.matches&&n.matches('a[href^="#"]:not([data-prevent])'))fixLinks(n.parentNode||document);else fixLinks(n)}}).observe(document.documentElement,{childList:true,subtree:true});

/* ---------------- header ---------------- */
const UI={
  counts(){
    const set=(id,n)=>{const e=document.getElementById(id);if(e){e.textContent=n;e.hidden=!n}};
    set('cCart',db.cart.reduce((a,l)=>a+l.qty,0));set('cWish',db.wish.length);set('cCmp',db.compare.length);
    const q=document.getElementById('navQuote');if(q)q.textContent=db.quoteList.length?`Business & quotes (${db.quoteList.length})`:'Business & quotes';
    const acc=document.getElementById('accLbl');if(acc)acc.textContent=db.user?db.user.name.split(' ')[0]:'Sign in';
    const z=document.getElementById('zoneSel');if(z)z.value=db.zone;
    UI.cmpBar();
  },
  cmpBar(){
    let bar=document.getElementById('cmpBar');
    const show=db.compare.length&&current()!=='compare'&&!current().startsWith('admin');
    if(!show){bar&&bar.remove();document.body.style.paddingBottom='';return}
    if(!bar){bar=document.createElement('div');bar.id='cmpBar';bar.className='cmp-bar';document.body.append(bar)}
    bar.innerHTML=`<div class="wrap"><b class="small">Compare (${db.compare.length}/4)</b><div class="slots">${db.compare.map(id=>{const p=prod(id);return p?`<span class="slot">${esc(p.name.slice(0,34))}${p.name.length>34?'…':''}<button data-a="uncmp" data-id="${id}" aria-label="Remove ${esc(p.name)} from compare">✕</button></span>`:''}).join('')}</div><a class="btn sm buy" href="#compare">Compare now</a><button class="linkbtn" style="color:var(--muted)" data-a="cmp-clear">Clear</button></div>`;
    document.body.style.paddingBottom='64px';
  },
  mega(open){
    const b=document.getElementById('megaBtn'),m=document.getElementById('mega');
    const o=open??m.hidden; m.hidden=!o; b.setAttribute('aria-expanded',o);
  },
  nav(){
    const h=current();
    document.querySelectorAll('nav.strip a').forEach(a=>{const t=(a.getAttribute('href')||'').replace(/^[#/]/,'');a.classList.toggle('on',!!t&&(h===t||(t.length>2&&h.startsWith(t+'-'))))});
  }
};
function buildHeader(){
  document.getElementById('mega').innerHTML=`<div class="wrap">${D.CATS.map(c=>`<div style="${c.pillar?`--pc:var(--${c.pillar})`:''}"><h4><span class="pill-tag"></span><a href="#c-${c.id}">${esc(c.name)}</a></h4><ul>${c.subs.map(s=>`<li><a href="#c-${c.id}" data-a="gosub" data-cat="${c.id}" data-sub="${esc(s)}">${esc(s)}</a></li>`).join('')}</ul></div>`).join('')}</div>`;
  document.getElementById('searchCat').innerHTML=`<option value="">All</option>`+D.CATS.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  document.getElementById('zoneSel').innerHTML=D.ZONES.map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('');
  const set=(id,h)=>{const el=document.getElementById(id);if(el)el.innerHTML=h};const C0=D.COMPANY;
  set('annText',esc(D.SITE.announcement||''));set('utilPhone',esc(C0.phone||''));
  set('newsTitle',esc(D.SITE.newsletterTitle||'Deals and new stock every Friday'));set('newsText',esc(D.SITE.newsletterText||''));
  set('footCo',`<b style="color:var(--foot-ink);font-size:14px">${esc(C0.name||'')}</b><span>${esc(C0.address||'')}</span><span class="mono">${esc(C0.phone||'')}</span><span>${esc(C0.email||'')}</span><span class="mono" style="font-size:12px">PAN ${esc(C0.pan||'')} · Reg. ${esc(C0.reg||'')}</span>`);
  set('footCats',D.CATS.map(c=>`<li><a href="#c-${c.id}">${esc(c.name)}</a></li>`).join(''));
  document.getElementById('navCats').innerHTML=D.CATS.map(c=>`<a href="#c-${c.id}" style="${c.pillar?`--pc:var(--${c.pillar})`:''}"><span class="pd"></span>${esc(c.name)}</a>`).join('');
  fixLinks(document);
}

/* ---------------- search ---------------- */
function searchProducts(q,catId){
  const toks=String(q).toLowerCase().split(/[\s\-]+/).filter(Boolean);
  if(!toks.length) return [];
  return db.products.filter(p=>!catId||p.cat===catId).map(p=>{
    const name=p.name.toLowerCase(), hay=(p.name+' '+p.brand+' '+(p.model||'')+' '+p.sub+' '+(cat(p.cat)?.name||'')+' '+Object.values(p.specs||{}).join(' ')+' '+(p.hl||[]).join(' ')).toLowerCase();
    if(!toks.every(t=>hay.includes(t))) return null;
    return {p,s:toks.reduce((a,t)=>a+(name.includes(t)?3:1),0)+((p.tags||[]).includes('best')?1:0)};
  }).filter(Boolean).sort((a,b)=>b.s-a.s).map(x=>x.p);
}
const hl=(text,q)=>{let t=esc(text);String(q).split(/\s+/).filter(x=>x.length>1).forEach(w=>{t=t.replace(new RegExp('('+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','ig'),'<mark>$1</mark>')});return t};
let sugIdx=-1;
function suggest(){
  const q=document.getElementById('q').value.trim(), box=document.getElementById('suggest');
  if(q.length<2){box.hidden=true;return}
  const ps=searchProducts(q,document.getElementById('searchCat').value).slice(0,6);
  const cs=D.CATS.flatMap(c=>c.subs.map(s=>({c,s}))).filter(x=>x.s.toLowerCase().includes(q.toLowerCase())||x.c.name.toLowerCase().includes(q.toLowerCase())).slice(0,3);
  const gs=D.GUIDES.filter(g=>g.title.toLowerCase().includes(q.toLowerCase())).slice(0,2);
  if(!ps.length&&!cs.length&&!gs.length){box.innerHTML=`<div class="grp">No matches</div><a class="simple" href="#quote">Can't find it? Ask us for a quote</a>`;box.hidden=false;return}
  box.innerHTML=(ps.length?`<div class="grp">Products</div>`+ps.map(p=>`<a href="#p-${p.id}"><span class="thumb">${pic(p)}</span><span>${hl(p.name,q)}</span><span class="price small">${p.quote?'Quote':npr(unitPrice(p))}</span></a>`).join(''):'')
   +(cs.length?`<div class="grp">Categories</div>`+cs.map(x=>`<a class="simple" href="#c-${x.c.id}" data-a="gosub" data-cat="${x.c.id}" data-sub="${esc(x.s)}">${esc(x.s)} <span class="muted">in ${esc(x.c.name)}</span></a>`).join(''):'')
   +(gs.length?`<div class="grp">Guides</div>`+gs.map(g=>`<a class="simple" href="#g-${g.id}">${esc(g.title)}</a>`).join(''):'')
   +`<a class="simple" href="#search-${slug(q)}"><b>See all results for “${esc(q)}”</b></a>`;
  box.hidden=false;sugIdx=-1;
}

/* ---------------- router ---------------- */
const Views={};
let after=null, routeSeq=0;
function route(keepScroll){
  const h=current();
  let name=h, arg='';
  const m=h.match(/^(c|p|search|g|order|admin)-(.+)$/);
  if(m){name=m[1];arg=m[2]}
  const v=Views[name]||Views.notfound||Views.home;
  after=null; routeSeq++;
  const app=document.getElementById('app');
  app.innerHTML=v(arg);
  if(after) after();
  closeOverlay();UI.mega(false);document.getElementById('suggest').hidden=true;
  UI.nav();UI.counts();
  if(firstRoute) firstRoute=false; // keep the title the server wrote for this URL
  else document.title=pageTitle(name,arg);
  if(!keepScroll){window.scrollTo(0,0);const cl=document.querySelector('link[rel=canonical]');if(cl)cl.href=location.origin+location.pathname;window.dispatchEvent(new Event('tt:route'))}
}
/* Same title patterns as server/seo.js, used after in-app navigation. */
let firstRoute=true;
const shortName=(n,l=55)=>n.length<=l?n:n.split(/,| – | - /)[0].slice(0,l);
function pageTitle(name,arg){
  if(name==='p'){const p=prod(arg);if(p)return shortName(p.name)+' Price in Nepal | Technotri'}
  if(name==='c'){const c=cat(arg);if(c)return c.name+' Price in Nepal – Buy Online | Technotri'}
  if(name==='home')return 'Technotri Store – Solar, Inverter, UPS, Battery & Wi-Fi Price in Nepal';
  const t=document.querySelector('#app h1');return (t?t.textContent.trim().slice(0,60)+' | ':'')+'Technotri Store';
}
const refresh=()=>{const y=window.scrollY;route(true);window.scrollTo(0,y)};
const setAfter=fn=>{after=fn};
const loadingHTML=(label='Loading…')=>`<div class="empty" aria-busy="true"><span>${esc(label)}</span></div>`;
/** A view that needs server data: shows a loading state, then renders when the data arrives. */
function asyncView(load,render,label){
  const seq=routeSeq, keepTitle=routeSeq===1;
  setAfter(()=>{
    Promise.resolve().then(load).then(data=>{
      if(seq!==routeSeq) return;
      after=null;const app=document.getElementById('app');app.innerHTML=render(data);if(after)after();
      if(!keepTitle)document.title=pageTitle(current().split('-')[0],'');
    }).catch(e=>{
      if(seq!==routeSeq) return;
      if(e.status===401&&!db.user){go('signin',true);return}
      document.getElementById('app').innerHTML=`<div class="empty"><b>${esc(e.message)}</b><a class="btn" href="/">Back to the store</a></div>`;
    });
  });
  return loadingHTML(label);
}

/* ---------------- event delegation ---------------- */
const A={}, C={}, I={}, F={};
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-a]');
  if(el){const fn=A[el.dataset.a]; if(fn){ if(el.tagName==='BUTTON'||el.dataset.prevent) e.preventDefault(); fn(el,e) }}
  else{
    if(!e.target.closest('#mega')&&!e.target.closest('#megaBtn')) UI.mega(false);
    if(!e.target.closest('.searchbox')) document.getElementById('suggest').hidden=true;
  }
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey) return;
  const a=e.target.closest('a[href]'); if(!a||a.target||a.hasAttribute('download')) return;
  let href=a.getAttribute('href');
  if(href.startsWith('#')){ if(a.dataset.prevent) return; href='/'+href.slice(1) }
  if(!href.startsWith('/')||href.startsWith('//')||/^\/(api|uploads)\//.test(href)) return;
  e.preventDefault(); go(href==='/home'?'/':href);
});
document.addEventListener('change',e=>{const el=e.target.closest('[data-c]');if(el&&C[el.dataset.c])C[el.dataset.c](el,e)});
document.addEventListener('input',e=>{const el=e.target.closest('[data-i]');if(el&&I[el.dataset.i])I[el.dataset.i](el,e)});
document.addEventListener('submit',e=>{const f=e.target.closest('form[data-f]');if(f&&F[f.dataset.f]){e.preventDefault();F[f.dataset.f](f,e)}});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeOverlay();UI.mega(false);document.getElementById('suggest').hidden=true}
  if(e.target.id==='q'){
    const items=[...document.querySelectorAll('#suggest a')]; if(!items.length||document.getElementById('suggest').hidden) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sugIdx=(sugIdx+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((a,i)=>a.classList.toggle('on',i===sugIdx))}
    if(e.key==='Enter'&&sugIdx>=0){e.preventDefault();go(items[sugIdx].getAttribute('href'));}
  }
});
window.addEventListener('popstate',()=>route());

/* shared actions */
A.close=()=>closeOverlay();
A.reload=()=>location.reload();
A.add=el=>addToCart(el.dataset.id,+(el.dataset.qty||1));
A['add-quiet']=el=>{addToCart(el.dataset.id,1,null,true);toast('Added to cart');el.textContent='Added';el.disabled=true};
A.quote=el=>addToQuote(el.dataset.id,+(el.dataset.qty||1));
A.wish=el=>{const id=el.dataset.id,i=db.wish.indexOf(id);if(i>=0)db.wish.splice(i,1);else db.wish.push(id);Store.save();Store.syncWish();const on=i<0;el.setAttribute('aria-pressed',on);el.innerHTML=heart(on);if(el.dataset.label)el.append(' '+(on?'Saved':'Save'));UI.counts();toast(on?'Saved to wishlist':'Removed from wishlist')};
A.uncmp=el=>{db.compare=db.compare.filter(x=>x!==el.dataset.id);Store.save();if(current()==='compare')refresh();else{UI.counts();document.querySelectorAll(`[data-c="cmp"][data-id="${el.dataset.id}"]`).forEach(x=>x.checked=false)}};
A['cmp-clear']=()=>{db.compare=[];Store.save();document.querySelectorAll('[data-c="cmp"]').forEach(x=>x.checked=false);UI.counts()};
A.megaToggle=()=>UI.mega();
A.notify=el=>{const p=prod(el.dataset.id);overlay(`<h3>Get notified</h3><p class="muted">We'll tell you when <b>${esc(p.name)}</b> is back in stock.</p><form data-f="notify" class="stack"><input type="hidden" name="id" value="${p.id}"><label class="field"><span>Mobile or email</span><input type="text" name="c" id="notifyC" value="${esc(db.user?.phone||db.user?.email||'')}" required></label><div id="notifyErr"></div><div class="row"><button class="btn buy">Notify me</button><button type="button" class="btn ghost" data-a="close">Cancel</button></div></form>`,'modal')};
F.notify=async f=>{const b=f.querySelector('button.buy');busy(b,true);try{await api('/stock-alerts',{method:'POST',body:{productId:f.id.value,contact:f.c.value.trim()}});closeOverlay();toast('We will let you know when it is back')}catch(e){document.getElementById('notifyErr').innerHTML=errBox(e.message);busy(b,false)}};
C.cmp=el=>{
  const id=el.dataset.id;
  if(el.checked){ if(db.compare.length>=4){el.checked=false;toast('You can compare up to 4 products');return}
    const p=prod(id), first=db.compare[0]&&prod(db.compare[0]);
    if(first&&first.cat!==p.cat) toast('Comparing across categories shows fewer matching specs');
    if(!db.compare.includes(id)) db.compare.push(id);
  } else db.compare=db.compare.filter(x=>x!==id);
  Store.save();UI.counts();
};
C.zone=el=>{db.zone=el.value;Store.save();refresh();toast('Delivery estimates updated for '+zone().name)};
I.q=()=>suggest();
F.search=f=>{const q=f.q.value.trim();if(!q)return;document.getElementById('suggest').hidden=true;const c=f.searchCat.value;go('search-'+slug(q)+(c?'--'+c:''))};
F.news=async f=>{const v=f.email.value.trim();if(!/^\S+@\S+\.\S+$/.test(v)){toast('Enter a valid email address');return}
  try{await api('/newsletter',{method:'POST',body:{email:v}});f.reset();toast('Subscribed. Deals arrive every Friday.')}catch(e){toast(e.message)}};

/* ---------------- boot ---------------- */
function applyBootstrap(b){
  D.CATS=b.categories;D.ZONES=b.zones;D.COUPONS=b.coupons;D.PROTECT=b.protection;D.COMPANY=b.company||{};
  D.GUIDES=b.guides||[];D.KITS=b.kits||[];D.FAQ=b.faq||[];D.SLIDES=b.slides||[];D.SITE=b.site||{};
  db.products=b.products;byId=new Map(b.products.map(p=>[p.id,p]));db.deals=b.deals||[];
  setUser(b.user);
  if(!D.ZONES.find(z=>z.id===db.zone)&&D.ZONES[0]) db.zone=D.ZONES[0].id;
}
function setUser(u){
  db.user=u||null;db.orders=null;
  if(u&&Array.isArray(u.wishlist)){const merged=[...new Set([...u.wishlist,...db.wish])];const changed=merged.length!==u.wishlist.length;db.wish=merged;Store.save();if(changed)Store.syncWish()}
}
async function reloadCatalog(){applyBootstrap(await api('/bootstrap'))}
async function boot(){
  if(location.hash.length>1&&location.pathname==='/'){history.replaceState({},'','/'+location.hash.slice(1).replace(/^home$/,''))}
  try{applyBootstrap(await api('/bootstrap'))}
  catch(e){document.getElementById('app').innerHTML=`<div class="empty"><b>The store could not load.</b><span>${esc(e.message)}</span><button class="btn" data-a="reload">Try again</button></div>`;return}
  buildHeader();route();
}

window.TT={extrasCache:extras,D,art,Store,get db(){return db},api,esc,npr,r10,prod,cat,zone,slug,hash,nptNow,dayIndex,fmtDate,fmtStamp,etaDate,isDealer,isStaff,
  flashToday,flashPct,dotd,dealEnds,claimed,unitPrice,wasPrice,offPct,reviewsOf,ratingOf,distOf,loadExtras,stars,ratingLine,labBadge,scoreCls,stockLine,badgesOf,priceLine,keyspecs,pic,heart,
  card,rowCard,toast,overlay,closeOverlay,errBox,busy,addToCart,addToQuote,cartTotals,UI,buildHeader,searchProducts,Views,route,refresh,setAfter,asyncView,loadingHTML,go,current,setUser,reloadCatalog,boot,A,C,I,F};
})();
