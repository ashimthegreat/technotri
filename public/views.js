/* Technotri Store — page views */
(function(){
const T=window.TT,{D,Store,api,esc,npr,r10,prod,cat,zone,slug,hash,etaDate,fmtStamp,isDealer,flashToday,flashPct,dotd,claimed,unitPrice,wasPrice,offPct,
  reviewsOf,ratingOf,distOf,loadExtras,stars,ratingLine,labBadge,scoreCls,stockLine,badgesOf,priceLine,keyspecs,pic,heart,card,rowCard,toast,overlay,closeOverlay,errBox,busy,
  addToCart,addToQuote,cartTotals,UI,searchProducts,Views,refresh,setAfter,asyncView,go,current,setUser,reloadCatalog,A,C,I,F}=T;
const db=()=>T.db;
const art=T.art;

/* ---------- shared bits ---------- */
const crumbs=list=>`<nav class="crumbs" aria-label="Breadcrumb"><a href="#home">Home</a>${list.map(([t,h])=>`<span>/</span>${h?`<a href="#${h}">${esc(t)}</a>`:`<span>${esc(t)}</span>`}`).join('')}</nav>`;
const ICONS={
  truck:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 6h12v10H2zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
  shield:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  receipt:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  wrench:'<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14.5 6.5a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3z"/><path d="M14.5 6.5L17 4l3 3-2.5 2.5"/></svg>'
};
function countdownHTML(){return `<span class="clock" data-countdown aria-label="Time left today"><span>00</span><span>00</span><span>00</span></span>`}
function tick(){
  const left=Math.max(0,Math.floor((T.dealEnds()-Date.now())/1000));
  const h=String(Math.min(99,Math.floor(left/3600))).padStart(2,'0'),m=String(Math.floor(left%3600/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');
  document.querySelectorAll('[data-countdown]').forEach(el=>{el.innerHTML=`<span>${h}h</span><span>${m}m</span><span>${s}s</span>`});
}
setInterval(tick,1000);

const pv=c=>c&&c.pillar?`--pc:var(--${c.pillar});--pcs:var(--${c.pillar}-soft)`:'';
/* ================= HOME ================= */
const SLIDES=[
 {pl:'power',k:'Load shedding ready',h:'Keep your Wi-Fi on when the power goes.',p:'DC mini UPS for router and ONT. No reboot, 4–10 hours of internet.',cta:['Shop router UPS','p-mu-10'],cta2:['How to install','g-mini-ups-install'],art:'ups'},
 {pl:'energy',k:'Solar + battery',h:'Run your home on sunshine, keep the night covered.',p:'Hybrid inverters, Mono PERC panels and LiFePO4 batteries, checked for compatibility in the System Builder.',cta:['Open System Builder','builder'],cta2:['Shop solar','c-solar'],art:'hybrid'},
 {pl:'net',k:'For ISPs and installers',h:'ONTs, drop cable and connectors at dealer prices.',p:'Carton pricing, quantity breaks and credit for approved ISP and installer accounts.',cta:['Apply for a dealer account','dealer'],cta2:['Shop ISP & FTTH','c-ftth'],art:'ont'}
];
let heroTimer=null, heroI=0, heroPaused=false;
function heroSlide(i){
  const s=SLIDES[i];
  return `<div class="slide" aria-roledescription="slide" aria-label="${i+1} of ${SLIDES.length}"><div class="copy"><span class="kicker">${esc(s.k)}</span><h1>${esc(s.h)}</h1><p>${esc(s.p)}</p><div class="row"><a class="btn buy lg" href="#${s.cta[1]}">${esc(s.cta[0])}</a><a class="btn ghost lg" href="#${s.cta2[1]}">${esc(s.cta2[0])}</a></div></div><div class="pic">${art(s.art)}</div></div>`;
}
function startHero(){
  clearInterval(heroTimer);
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  heroTimer=setInterval(()=>{const el=document.getElementById('heroInner');if(!el){clearInterval(heroTimer);return}if(heroPaused)return;heroI=(heroI+1)%SLIDES.length;showHero(heroI)},6500);
}
function showHero(i){heroI=i;const el=document.getElementById('heroInner');if(!el)return;el.innerHTML=heroSlide(i);el.parentElement.style.setProperty('--pc',`var(--${SLIDES[i].pl})`);document.querySelectorAll('.hero .dots button').forEach((b,j)=>b.setAttribute('aria-current',j===i))}
A.hero=el=>{showHero(+el.dataset.i)};
A.heroPause=el=>{heroPaused=!heroPaused;el.textContent=heroPaused?'Play':'Pause'};

Views.home=()=>{
  const [did,dpct]=dotd(), dp=prod(did);
  const flash=flashToday();
  const top=[...db().products].filter(p=>p.lab).sort((a,b)=>b.lab.score-a.lab.score).slice(0,8);
  const best=db().products.filter(p=>p.tags.includes('best')).slice(0,10);
  const recent=db().recent.map(prod).filter(Boolean).slice(0,8);
  setAfter(()=>{showHero(heroI);startHero();tick()});
  return `
  <section class="home-top">
    <div class="hero" aria-roledescription="carousel" aria-label="Featured">
      <div id="heroInner">${heroSlide(heroI)}</div>
      <div class="dots">${SLIDES.map((_,i)=>`<button data-a="hero" data-i="${i}" aria-label="Show slide ${i+1}" aria-current="${i===heroI}"></button>`).join('')}</div>
      <button class="pause" data-a="heroPause">${heroPaused?'Play':'Pause'}</button>
    </div>
    <aside class="dotd" aria-label="Deal of the day">
      <div class="between"><span class="eyebrow" style="color:var(--bad)">Deal of the day</span>${countdownHTML()}</div>
      <a class="pic" href="#p-${dp.id}">${pic(dp)}</a>
      <a href="#p-${dp.id}" style="color:var(--ink);font-weight:600;line-height:1.3">${esc(dp.name)}</a>
      ${priceLine(dp)}
      <div class="stack" style="gap:4px"><div class="meter-bar"><i style="width:${claimed(dp.id)}%"></i></div><span class="small muted">${claimed(dp.id)}% claimed · ends at midnight</span></div>
      <button class="btn buy" data-a="add" data-id="${dp.id}">Add to cart</button>
    </aside>
  </section>

  <section class="valueprops">
    <div class="vp">${ICONS.truck}<div><b>Next-day delivery in the Valley</b><span>Order before 4 PM, delivered by ${etaDate(1)}</span></div></div>
    <div class="vp">${ICONS.shield}<div><b>Authorised stock</b><span>Nepal warranty on every product</span></div></div>
    <div class="vp">${ICONS.wrench}<div><b>Installation team</b><span>Solar, inverters and networks</span></div></div>
    <div class="vp">${ICONS.receipt}<div><b>VAT invoice</b><span>For every order, including COD</span></div></div>
  </section>

  <section class="brand-strip" aria-label="What we do">
    <a href="#c-solar" style="${pv(cat('solar'))}"><span class="pill-tag">Energy</span><b>Make your own power</b><span>Solar panels, hybrid inverters, MPPT and mounting</span></a>
    <a href="#c-backup" style="${pv(cat('backup'))}"><span class="pill-tag">Power</span><b>Keep it running</b><span>Router UPS, UPS, inverters and lithium batteries</span></a>
    <a href="#c-connect" style="${pv(cat('connect'))}"><span class="pill-tag">Network</span><b>Stay connected</b><span>Wi-Fi 6/7, mesh, switches, ONTs and fibre</span></a>
  </section>

  <section>
    <div class="sec-head"><h2>Shop by category</h2></div>
    <div class="cat-tiles">${D.CATS.map(c=>`<a class="ctile" href="#c-${c.id}" style="${pv(c)}"><span class="pic">${art(c.art)}</span><h3>${c.name}</h3><small>${c.blurb}</small><small class="mono">${db().products.filter(p=>p.cat===c.id).length} products</small></a>`).join('')}</div>
  </section>

  <section>
    <div class="sec-head"><div><h2>Flash deals</h2><p>New prices every day at midnight. Ends in ${countdownHTML()}</p></div><a class="btn sm ghost" href="#deals">All deals</a></div>
    <div class="hscroll">${flash.map(([id])=>prod(id)).filter(Boolean).map(card).join('')}</div>
  </section>

  <section class="banner dark">
    <div><span class="eyebrow" style="color:var(--red)">System Builder</span><h2 style="margin-top:6px">Build a backup or solar system that works together.</h2><p>Pick your loads, then an inverter, batteries and panels. We check battery voltage, PV string limits and runtime as you go.</p></div>
    <a class="btn buy lg" href="#builder">Start building</a>
  </section>

  <section>
    <div class="sec-head"><div><h2>Top rated by Technotri Lab</h2><p>We bench-test backup time, switchover, Wi-Fi range and more. Scores out of 10.</p></div><a class="btn sm ghost" href="#lab">How we test</a></div>
    <div class="hscroll">${top.map(card).join('')}</div>
  </section>

  <section>
    <div class="sec-head"><div><h2>Ready kits</h2><p>Matched parts in one order.</p></div><a class="btn sm ghost" href="#kits">All kits</a></div>
    <div class="ggrid">${D.KITS.slice(0,3).map(kitCard).join('')}</div>
  </section>

  <section>
    <div class="sec-head"><h2>Best sellers</h2></div>
    <div class="pgrid">${best.slice(0,8).map(card).join('')}</div>
  </section>

  <section>
    <div class="sec-head"><div><h2>Guides and how-tos</h2><p>Sizing, installation and buying advice from our engineers.</p></div><a class="btn sm ghost" href="#guides">All guides</a></div>
    <div class="ggrid">${D.GUIDES.slice(0,3).map(guideCard).join('')}</div>
  </section>

  ${recent.length?`<section><div class="sec-head"><h2>Recently viewed</h2></div><div class="hscroll">${recent.map(card).join('')}</div></section>`:''}

  <section class="banner">
    <div><h2>Buying for a business, ISP or project?</h2><p>Get dealer pricing, carton quantities, credit terms and project quotations with site surveys.</p></div>
    <div class="row"><a class="btn" href="#dealer">Apply for dealer pricing</a><a class="btn ghost" href="#quote">Request a quote</a></div>
  </section>`;
};

/* ================= LISTING ================= */
let L={key:null}, pendingSub=null;
function listState(key){
  if(L.key!==key){L={key,sub:new Set(),brand:new Set(),spec:{},cats:new Set(),min:'',max:'',rating:0,instock:false,deal:false,sort:'featured',page:1,open:false}}
  return L;
}
A.gosub=el=>{pendingSub={cat:el.dataset.cat,sub:el.dataset.sub};if(current()==='c-'+el.dataset.cat)refresh()};
function applyFilters(items,skip){
  return items.filter(p=>{
    if(skip!=='cat'&&L.cats.size&&!L.cats.has(p.cat)) return false;
    if(skip!=='sub'&&L.sub.size&&!L.sub.has(p.sub)) return false;
    if(skip!=='brand'&&L.brand.size&&!L.brand.has(p.brand)) return false;
    for(const k in L.spec){if(skip!=='spec:'+k&&L.spec[k].size&&!L.spec[k].has(p.specs[k])) return false}
    const u=unitPrice(p);
    if(L.min!==''&&(u==null||u<+L.min)) return false;
    if(L.max!==''&&(u==null||u>+L.max)) return false;
    if(L.rating&&ratingOf(p)[0]<L.rating) return false;
    if(L.instock&&(p.quote||p.stock<=0)) return false;
    if(L.deal&&!(flashPct(p.id)||offPct(p)>0)) return false;
    return true;
  });
}
function sortItems(items){
  const by={featured:(a,b)=>(b.tags.includes('best')-a.tags.includes('best'))||ratingOf(b)[1]-ratingOf(a)[1],
    lo:(a,b)=>(unitPrice(a)??1e12)-(unitPrice(b)??1e12),hi:(a,b)=>(unitPrice(b)??-1)-(unitPrice(a)??-1),
    rating:(a,b)=>ratingOf(b)[0]-ratingOf(a)[0],lab:(a,b)=>(b.lab?.score||0)-(a.lab?.score||0),
    reviews:(a,b)=>ratingOf(b)[1]-ratingOf(a)[1],new:(a,b)=>b.tags.includes('new')-a.tags.includes('new'),
    off:(a,b)=>offPct(b)-offPct(a)};
  return [...items].sort(by[L.sort]||by.featured);
}
function facetBlock(title,key,values,open=true){
  if(values.length<2&&!(key==='sub'||key==='cat')) return '';
  return `<details class="facet" ${open?'open':''}><summary>${esc(title)}</summary><div class="opts">${values.map(([v,n,label])=>`<label><input type="checkbox" data-c="facet" data-k="${esc(key)}" value="${esc(v)}" ${isOn(key,v)?'checked':''}> ${esc(label||v)}<span class="c">${n}</span></label>`).join('')}</div></details>`;
}
function isOn(key,v){if(key==='sub')return L.sub.has(v);if(key==='brand')return L.brand.has(v);if(key==='cat')return L.cats.has(v);const k=key.slice(5);return L.spec[k]&&L.spec[k].has(v)}
function counts(items,fn){const m=new Map();items.forEach(p=>{const v=fn(p);if(v!=null&&v!=='')m.set(v,(m.get(v)||0)+1)});return [...m.entries()].sort((a,b)=>b[1]-a[1])}
let LIST={items:[],facetKeys:[],showCat:false};
function listing({title,crumbsList,items,facetKeys,showCat,intro,extraTop='',headStyle='',headPic='',pillar=''}){
  LIST={items,facetKeys,showCat};
  setAfter(renderResults);
  return `${crumbs(crumbsList)}
  ${headPic?`<div class="cat-head" style="${headStyle}"><div class="stack" style="gap:6px">${pillar?`<span class="pill-tag">${{energy:'Energy',power:'Power',net:'Network'}[pillar]}</span>`:''}<h1>${esc(title)}</h1>${intro?`<p class="muted" style="max-width:70ch">${intro}</p>`:''}</div><span class="pic">${headPic}</span></div>`:`<div class="between"><div><h1>${esc(title)}</h1>${intro?`<p class="muted" style="margin-top:6px;max-width:70ch">${intro}</p>`:''}</div></div>`}
  ${extraTop}
  <div class="listing">
    <aside class="facets ${L.open?'open':''}" id="facets" aria-label="Filters">${facetsHTML()}</aside>
    <div style="min-width:0">
      <div class="toolbar">
        <div class="row"><button class="btn sm ghost filter-toggle" data-a="facetToggle">Filters</button><span id="resCount" class="muted small"></span></div>
        <div class="row">
          <label class="small muted">Sort <select data-c="sort" id="sortSel">${[['featured','Featured'],['lo','Price: low to high'],['hi','Price: high to low'],['rating','Customer rating'],['lab','Lab score'],['reviews','Most reviewed'],['off','Biggest discount'],['new','Newest']].map(([v,t])=>`<option value="${v}" ${L.sort===v?'selected':''}>${t}</option>`).join('')}</select></label>
          <div class="viewtoggle" role="group" aria-label="View">${['grid','list','table'].map(v=>`<button data-a="view" data-v="${v}" aria-pressed="${db().view===v}">${v[0].toUpperCase()+v.slice(1)}</button>`).join('')}</div>
        </div>
      </div>
      <div class="chips" id="activeChips" style="margin-bottom:10px"></div>
      <div id="results"></div>
      <div class="pager" id="pager"></div>
    </div>
  </div>`;
}
function facetsHTML(){
  const it=LIST.items;
  let h='';
  if(LIST.showCat) h+=facetBlock('Category','cat',counts(applyFilters(it,'cat'),p=>p.cat).map(([v,n])=>[v,n,cat(v).name]));
  h+=facetBlock('Product type','sub',counts(applyFilters(it,'sub'),p=>p.sub));
  h+=facetBlock('Brand','brand',counts(applyFilters(it,'brand'),p=>p.brand));
  h+=`<details class="facet" open><summary>Price (Rs)</summary><form class="range" data-f="price"><input type="number" name="min" id="pmin" placeholder="Min" value="${L.min}" min="0"><input type="number" name="max" id="pmax" placeholder="Max" value="${L.max}" min="0"><button class="btn sm ghost">Go</button></form></details>`;
  h+=`<details class="facet" open><summary>Customer rating</summary><div class="opts">${[4,3].map(r=>`<label><input type="radio" name="rf" data-c="rating" value="${r}" ${L.rating===r?'checked':''}> ${stars(r,12)} & up</label>`).join('')}<label><input type="radio" name="rf" data-c="rating" value="0" ${!L.rating?'checked':''}> Any</label></div></details>`;
  h+=`<details class="facet" open><summary>Availability</summary><div class="opts"><label><input type="checkbox" data-c="instock" ${L.instock?'checked':''}> In stock, ready to ship</label><label><input type="checkbox" data-c="dealonly" ${L.deal?'checked':''}> On sale</label></div></details>`;
  LIST.facetKeys.forEach(k=>{h+=facetBlock(k,'spec:'+k,counts(applyFilters(it,'spec:'+k),p=>p.specs[k]),false)});
  h+=`<div style="padding-block:10px"><button class="linkbtn" data-a="clearFacets">Clear all filters</button></div>`;
  return h;
}
function renderResults(){
  const box=document.getElementById('results'); if(!box) return;
  const all=sortItems(applyFilters(LIST.items));
  const per=db().view==='table'?20:12, pages=Math.max(1,Math.ceil(all.length/per));
  if(L.page>pages) L.page=pages;
  const items=all.slice((L.page-1)*per,L.page*per);
  document.getElementById('resCount').textContent=`${all.length} result${all.length===1?'':'s'}`;
  const chips=[];
  L.cats.forEach(v=>chips.push(['cat',v,cat(v).name]));L.sub.forEach(v=>chips.push(['sub',v,v]));L.brand.forEach(v=>chips.push(['brand',v,v]));
  for(const k in L.spec)L.spec[k].forEach(v=>chips.push(['spec:'+k,v,k+': '+v]));
  if(L.min!==''||L.max!=='') chips.push(['price','','Rs '+(L.min||0)+' – '+(L.max||'any')]);
  if(L.rating) chips.push(['rating','',L.rating+'★ & up']);if(L.instock)chips.push(['instock','','In stock']);if(L.deal)chips.push(['deal','','On sale']);
  document.getElementById('activeChips').innerHTML=chips.map(([k,v,t])=>`<button class="chip x" data-a="unchip" data-k="${esc(k)}" data-v="${esc(v)}" aria-label="Remove filter ${esc(t)}">${esc(t)}</button>`).join('');
  if(!items.length){box.innerHTML=`<div class="empty"><b>No products match these filters.</b><span>Remove a filter, or tell us what you need and we will quote it.</span><div class="row"><button class="btn sm ghost" data-a="clearFacets">Clear filters</button><a class="btn sm" href="#quote">Request a quote</a></div></div>`;document.getElementById('pager').innerHTML='';return}
  if(db().view==='list') box.innerHTML=`<div class="plist">${items.map(rowCard).join('')}</div>`;
  else if(db().view==='table'){
    const keys=LIST.facetKeys.length?LIST.facetKeys:['Type'];
    box.innerHTML=`<div class="tbl-wrap"><table class="data"><thead><tr><th>Compare</th><th>Product</th><th>Price</th><th>Stock</th><th>Lab</th>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}<th></th></tr></thead><tbody>${items.map(p=>`<tr>
      <td><input type="checkbox" data-c="cmp" data-id="${p.id}" ${db().compare.includes(p.id)?'checked':''} aria-label="Compare ${esc(p.name)}"></td>
      <td style="min-width:240px"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span style="width:56px;flex:none;background:var(--surface-2);border-radius:4px">${pic(p)}</span><span><a href="#p-${p.id}" style="color:var(--ink);font-weight:600">${esc(p.name)}</a><br><span class="mono small muted">${esc(p.model||'')}</span></span></div></td>
      <td class="price">${p.quote?'Quote':npr(unitPrice(p))}${p.breaks?`<br><span class="small muted">${p.breaks.length} qty breaks</span>`:''}</td><td>${stockLine(p)}${!p.quote&&p.stock>0?`<br><span class="mono small muted">${p.stock} units</span>`:''}</td><td>${labBadge(p)||'—'}</td>
      ${keys.map(k=>`<td class="mono small">${esc(p.specs[k]||'—')}</td>`).join('')}
      <td>${p.quote?`<button class="btn sm ghost" data-a="quote" data-id="${p.id}">Quote</button>`:p.stock>0?`<button class="btn sm buy" data-a="add" data-id="${p.id}">Add</button>`:''}</td></tr>`).join('')}</tbody></table></div>`;
  }
  else box.innerHTML=`<div class="pgrid">${items.map(card).join('')}</div>`;
  document.getElementById('pager').innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<button data-a="page" data-p="${i+1}" aria-current="${L.page===i+1}">${i+1}</button>`).join(''):'';
}
function refreshFacets(){const f=document.getElementById('facets');if(f){f.innerHTML=facetsHTML()}L.page=1;renderResults()}
C.facet=el=>{
  const k=el.dataset.k,v=el.value;
  const set=k==='sub'?L.sub:k==='brand'?L.brand:k==='cat'?L.cats:(L.spec[k.slice(5)]||(L.spec[k.slice(5)]=new Set()));
  el.checked?set.add(v):set.delete(v);refreshFacets();
};
C.rating=el=>{L.rating=+el.value;refreshFacets()};
C.instock=el=>{L.instock=el.checked;refreshFacets()};
C.dealonly=el=>{L.deal=el.checked;refreshFacets()};
C.sort=el=>{L.sort=el.value;L.page=1;renderResults()};
F.price=f=>{L.min=f.min.value;L.max=f.max.value;refreshFacets()};
A.view=el=>{db().view=el.dataset.v;Store.save();document.querySelectorAll('.viewtoggle button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v===el.dataset.v));L.page=1;renderResults()};
A.page=el=>{L.page=+el.dataset.p;renderResults();document.getElementById('results').scrollIntoView({block:'start'})};
A.facetToggle=()=>{L.open=!L.open;document.getElementById('facets').classList.toggle('open',L.open)};
A.clearFacets=()=>{const k=L.key;L.key=null;listState(k);refreshFacets()};
A.unchip=el=>{const k=el.dataset.k,v=el.dataset.v;
  if(k==='sub')L.sub.delete(v);else if(k==='brand')L.brand.delete(v);else if(k==='cat')L.cats.delete(v);else if(k.startsWith('spec:'))L.spec[k.slice(5)].delete(v);
  else if(k==='price'){L.min='';L.max=''}else if(k==='rating')L.rating=0;else if(k==='instock')L.instock=false;else if(k==='deal')L.deal=false;refreshFacets()};

Views.c=id=>{
  const c=cat(id); if(!c) return Views.home();
  listState('c-'+id);
  if(pendingSub&&pendingSub.cat===id){L.sub=new Set([pendingSub.sub]);L.page=1;pendingSub=null}
  const items=db().products.filter(p=>p.cat===id);
  const subs=c.subs.map(s=>`<button class="chip" data-a="subchip" data-v="${esc(s)}" aria-pressed="${L.sub.has(s)}">${esc(s)}</button>`).join('');
  return listing({title:c.name,crumbsList:[[c.name]],items,facetKeys:c.facets,headStyle:pv(c),headPic:art(c.art),pillar:c.pillar,intro:esc(c.blurb)+'.',extraTop:`<div class="chips">${subs}</div>`});
};
A.subchip=el=>{const v=el.dataset.v;L.sub.has(v)?L.sub.delete(v):L.sub.add(v);el.setAttribute('aria-pressed',L.sub.has(v));refreshFacets()};

Views.search=arg=>{
  const [qs,c]=arg.split('--'); const q=qs.replace(/-/g,' ');
  listState('s-'+arg);
  const items=searchProducts(q,c);
  setTimeout(()=>{const i=document.getElementById('q');if(i&&!i.value)i.value=q},0);
  if(!items.length){setAfter(null);return `${crumbs([['Search']])}<h1>No results for “${esc(q)}”</h1>
    <div class="empty"><span>Try a spec like <b>1100 VA</b>, <b>LiFePO4</b>, <b>GPON</b> or <b>PoE</b>, or browse a category.</span><div class="row">${D.CATS.map(c=>`<a class="btn sm ghost" href="#c-${c.id}">${c.name}</a>`).join('')}</div><a href="#quote">Or ask us to quote what you need</a></div>`}
  return listing({title:`Results for “${q}”`,crumbsList:[['Search: '+q]],items,facetKeys:[],showCat:true});
};

Views.deals=()=>{
  listState('deals');
  const items=db().products.filter(p=>flashPct(p.id)||offPct(p)>0);
  const [did]=dotd(), dp=prod(did);
  const top=`<section class="banner" style="grid-template-columns:auto 1fr auto;background:var(--surface)">
     <a href="#p-${dp.id}" style="width:160px;background:var(--surface-2);border-radius:8px">${pic(dp)}</a>
     <div class="stack" style="gap:6px"><span class="eyebrow" style="color:var(--bad)">Deal of the day</span><a href="#p-${dp.id}" style="color:var(--ink)"><h2>${esc(dp.name)}</h2></a>${priceLine(dp)}<div class="row small muted">Ends in ${countdownHTML()}</div></div>
     <button class="btn buy lg" data-a="add" data-id="${dp.id}">Add to cart</button></section>
   <section><div class="sec-head"><h2>Coupons</h2></div><div class="ggrid">${D.COUPONS.map(cp=>`<div class="panel tight between"><div class="stack" style="gap:4px"><b class="mono" style="font-size:18px;letter-spacing:.06em">${cp.code}</b><span class="small muted">${esc(cp.desc)}</span></div><button class="btn sm ghost" data-a="copy" data-t="${cp.code}">Copy code</button></div>`).join('')}</div></section>
   <section><div class="sec-head"><div><h2>Today's flash deals</h2><p>Limited quantity at these prices.</p></div></div><div class="pgrid">${flashToday().map(([id,pc])=>{const p=prod(id);return p?card(p).replace('<div class="foot">',`<div class="foot"><div class="stack" style="gap:3px"><div class="meter-bar"><i style="width:${claimed(id)}%"></i></div><span class="small muted">${claimed(id)}% claimed</span></div>`):''}).join('')}</div></section>
   <h2>All products on sale</h2>`;
  setAfter(()=>{tick();renderResults()});
  const html=listing({title:'Deals',crumbsList:[['Deals']],items,facetKeys:[],showCat:true,intro:'Flash prices change every day at midnight Nepal time. Coupons apply at checkout.',extraTop:top});
  setAfter(()=>{tick();renderResults()});
  return html;
};
A.copy=el=>{const t=el.dataset.t;const done=()=>{el.textContent='Copied';toast(t+' copied')};
  try{navigator.clipboard.writeText(t).then(done,()=>{toast('Code: '+t)})}catch(e){toast('Code: '+t)}};

/* ================= PRODUCT ================= */
let G={id:null,img:0,qty:1,prot:'',rf:0,rsort:'new'};
Views.p=id=>{
  const p=prod(id); if(!p) return `<div class="empty"><h2>Product not found</h2><a class="btn" href="#home">Back to the store</a></div>`;
  if(G.id!==id) G={id,img:0,qty:1,prot:'',rf:0,rsort:'new'};
  const r=db().recent.filter(x=>x!==id);r.unshift(id);db().recent=r.slice(0,12);Store.save();
  const c=cat(p.cat), z=zone(), [avg,n]=ratingOf(p);
  const fbt=(p.fbt||[]).map(prod).filter(x=>x&&!x.quote);
  const related=db().products.filter(x=>x.cat===p.cat&&x.id!==p.id&&x.sub===p.sub).concat(db().products.filter(x=>x.cat===p.cat&&x.id!==p.id&&x.sub!==p.sub)).slice(0,8);
  const guides=D.GUIDES.filter(g=>g.products.includes(p.id));
  const ks=Object.entries(p.specs).slice(0,4);
  const u=unitPrice(p,G.qty);
  const protOK=!p.quote&&p.price>=5000;
  setAfter(()=>{loadExtras(p.id).then(()=>{if(G.id!==p.id||!document.getElementById('reviews'))return;renderRQ()}).catch(()=>{})});
  return `${crumbs([[c.name,'c-'+c.id],[p.sub]])}
  <section class="pdp">
    <div class="gallery">
      <div class="main" id="galMain">${pic(p,G.img)}</div>
      <div class="thumbs" role="group" aria-label="Product views">${[0,1,2,3].map(i=>`<button data-a="gal" data-i="${i}" aria-pressed="${G.img===i}" aria-label="View ${i+1}">${pic(p,i)}</button>`).join('')}</div>
      ${p.images&&p.images.length?'':'<p class="small muted">Illustration. Product photos are added from the admin panel.</p>'}
    </div>
    <div class="pinfo">
      <div class="stack" style="gap:6px"><span class="pill-tag" style="${pv(c)}">${esc(c.name)}</span><a href="#search-${slug(p.brand)}" class="small mono" style="text-transform:uppercase;letter-spacing:.06em">${esc(p.brand)}</a><h1 style="font-size:clamp(22px,2.6vw,30px)">${esc(p.name)}</h1>
        <div class="row small muted"><span class="mono">Model ${esc(p.model||'—')}</span><span class="mono">SKU ${esc(p.id.toUpperCase())}</span></div>
        <div class="row"><a href="#reviews" data-a="jump" data-t="reviews" data-prevent="1">${ratingLine(p)}</a>${p.lab?`<a href="#lab-test" data-a="jump" data-t="lab-test" data-prevent="1" class="row" style="gap:6px">${labBadge(p)}<span class="small">Lab score</span></a>`:''}${badgesOf(p)}</div></div>
      ${p.hl?`<ul class="hl">${p.hl.map(h=>`<li>${esc(h)}</li>`).join('')}</ul>`:''}
      <dl class="keyspecs">${ks.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${p.serv!=null?`<div class="row small"><span class="score ${scoreCls(p.serv)}">${p.serv}</span><span>Serviceability score: how easy it is to repair and source parts in Nepal.</span></div>`:''}
      <a href="#specs" data-a="jump" data-t="specs" data-prevent="1" class="small">See all specifications</a>
    </div>
    <aside class="buybox" aria-label="Buy">
      ${priceLine(p,true)}
      ${p.quote?`<p class="small muted">Priced after we check your site and load. Quotes in one working day.</p><button class="btn buy lg block" data-a="quote" data-id="${p.id}">Add to quote</button><a class="btn ghost block" href="#quote">Go to quote request</a>`:`
      <span class="small muted">Incl. 13% VAT${isDealer()?' · dealer price':''}</span>
      ${p.breaks?`<table class="breaks"><thead><tr><th>Qty</th><th>Unit price</th></tr></thead><tbody>${p.breaks.map(([q,pr],i)=>{const nx=p.breaks[i+1];const on=G.qty>=q&&(!nx||G.qty<nx[0]);return `<tr class="${on?'on':''}"><td>${q}${nx?'–'+(nx[0]-1):'+'}</td><td>${npr(Math.min(pr,unitPrice({...p,breaks:null})))}</td></tr>`}).join('')}</tbody></table>`:''}
      ${stockLine(p)}
      ${p.stock>0?`<div class="eta">Delivery to <b>${esc(z.name)}</b>: <b>${etaDate(z.days)}</b>${z.free?` · free over ${npr(z.free)}`:''}<br>Pick up at Kumaristhan store: <b>ready in 2 hours</b></div>`:''}
      ${protOK?`<fieldset style="border:0;padding:0;margin:0;display:grid;gap:6px"><legend class="small" style="font-weight:600;margin-bottom:6px">Protect it</legend>
        <label class="opt"><input type="radio" name="prot" data-c="prot" value="" ${!G.prot?'checked':''}> No extended warranty</label>
        ${D.PROTECT.map(pr=>`<label class="opt"><input type="radio" name="prot" data-c="prot" value="${pr.id}" ${G.prot===pr.id?'checked':''}> ${pr.name}<span class="p">${npr(r10(u*pr.pct))}</span></label>`).join('')}</fieldset>`:''}
      ${p.stock>0?`<div class="row"><div class="qty"><button type="button" data-a="pq" data-d="-1" aria-label="Decrease quantity">−</button><input type="number" id="pdpQty" min="1" max="${p.stock}" value="${G.qty}" data-c="pqset" aria-label="Quantity"><button type="button" data-a="pq" data-d="1" aria-label="Increase quantity">+</button></div><span class="small muted">Total <b class="price" id="pdpTotal">${npr(u*G.qty)}</b></span></div>
      <button class="btn buy lg block" data-a="pdpAdd">Add to cart</button><button class="btn block" data-a="pdpBuy">Buy now</button>`:`<button class="btn ghost block" data-a="notify" data-id="${p.id}">Notify me when available</button>`}
      <button class="btn ghost block" data-a="quote" data-id="${p.id}">Add to bulk quote</button>`}
      <div class="row"><button class="btn sm ghost" data-a="wish" data-id="${p.id}" data-label="1" aria-pressed="${db().wish.includes(p.id)}">${heart(db().wish.includes(p.id))} ${db().wish.includes(p.id)?'Saved':'Save'}</button><label class="small row" style="gap:6px"><input type="checkbox" data-c="cmp" data-id="${p.id}" ${db().compare.includes(p.id)?'checked':''}> Compare</label></div>
      <div class="small muted stack" style="gap:4px;border-top:1px solid var(--line);padding-top:10px"><span>Warranty: <b style="color:var(--ink)">${esc(p.warranty||'As per manufacturer')}</b></span><span>Sold by Technotri Pvt. Ltd. · VAT invoice included</span><span>7-day return if unused and sealed</span></div>
    </aside>
  </section>

  <nav class="tabs" aria-label="Product sections">${[['overview','Overview'],['specs','Specifications'],p.lab?['lab-test','Lab test']:null,['reviews',`Reviews (${n})`],['qa','Questions'],guides.length?['p-guides','Guides']:null].filter(Boolean).map(([t,l])=>`<button data-a="jump" data-t="${t}">${l}</button>`).join('')}</nav>

  <div class="pdp-sections">
    <section id="overview" class="stack">
      <h2>Overview</h2>
      <p style="max-width:75ch">${esc(p.name)} from ${esc(p.brand)}. ${(p.hl||[]).map(esc).join('. ')}.</p>
    </section>

    ${fbt.length?`<section class="fbt"><h2>Frequently bought together</h2>
      <div class="items">${[p,...fbt].map((x,i)=>`${i?'<span class="plus">+</span>':''}<label class="it"><span class="pic">${pic(x)}</span><span class="row" style="gap:6px;flex-wrap:nowrap;align-items:flex-start"><input type="checkbox" data-c="fbt" value="${x.id}" ${x.stock>0?'checked':'disabled'}> <span>${i?'':'<b>This item:</b> '}${esc(x.name)}</span></span><span class="price">${npr(unitPrice(x))}</span></label>`).join('')}</div>
      <div class="row"><span>Total for selected: <b class="price" id="fbtTotal">${npr([p,...fbt].filter(x=>x.stock>0).reduce((a,x)=>a+unitPrice(x),0))}</b></span><button class="btn buy" data-a="fbtAdd">Add selected to cart</button></div></section>`:''}

    <section id="specs" class="stack"><h2>Specifications</h2>
      <div class="spec-group"><h4>Key specs</h4><table class="specs"><tbody>${Object.entries(p.specs).map(([k,v])=>`<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>
      <div class="spec-group"><h4>General</h4><table class="specs"><tbody><tr><th scope="row">Brand</th><td>${esc(p.brand)}</td></tr><tr><th scope="row">Model</th><td>${esc(p.model||'—')}</td></tr><tr><th scope="row">Category</th><td>${esc(c.name)} › ${esc(p.sub)}</td></tr><tr><th scope="row">Warranty</th><td>${esc(p.warranty||'—')}</td></tr><tr><th scope="row">Datasheet</th><td>Added with the live catalog</td></tr></tbody></table></div>
    </section>

    ${p.lab?`<section id="lab-test" class="stack"><div class="sec-head"><div><h2>Technotri Lab test</h2><p>Bench-tested by our engineers. <a href="#lab">How we test</a></p></div></div>
      <div class="labwrap"><div class="labscore"><span class="eyebrow">Overall</span><span class="big" style="color:${p.lab.score>=8?'var(--good)':p.lab.score>=6.5?'var(--warn)':'var(--bad)'}">${p.lab.score.toFixed(1)}</span><span class="small muted">out of 10</span></div>
      <div><div class="bars">${Object.entries(p.lab.m).map(([k,v])=>`<div class="bar"><span>${esc(k)}</span><span class="track"><i style="width:${v*10}%;background:${v>=8?'var(--good)':v>=6.5?'var(--warn)':'var(--bad)'}"></i></span><span class="v">${v.toFixed(1)}</span></div>`).join('')}</div>
      <div class="verdict"><div class="yes"><b>Good for</b><ul>${p.lab.good.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="no"><b>Not ideal for</b><ul>${p.lab.bad.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></div></div></section>`:''}

    <section id="reviews" class="stack"><h2>Customer reviews</h2>${reviewsHTML(p)}</section>
    <section id="qa" class="stack"><h2>Questions and answers</h2>${qaHTML(p)}</section>
    ${guides.length?`<section id="p-guides"><div class="sec-head"><h2>Guides for this product</h2></div><div class="ggrid">${guides.map(guideCard).join('')}</div></section>`:''}
    ${related.length?`<section><div class="sec-head"><h2>Similar products</h2></div><div class="hscroll">${related.map(card).join('')}</div></section>`:''}
  </div>`;
};
function reviewsHTML(p){
  const [avg,n]=ratingOf(p), dist=distOf(p), total=dist.reduce((a,b)=>a+b,0)||1;
  let rs=reviewsOf(p.id).filter(r=>!G.rf||r.s===G.rf);
  rs=[...rs].sort(G.rsort==='hi'?(a,b)=>b.s-a.s:G.rsort==='lo'?(a,b)=>a.s-b.s:(a,b)=>b.d.localeCompare(a.d));
  return `<div class="revsum"><div class="stack" style="gap:8px"><div class="row"><span class="mono" style="font-size:40px;font-weight:600">${n?avg.toFixed(1):'–'}</span><div>${stars(avg,18)}<div class="small muted">${n} ratings</div></div></div>
    <div class="dist">${[5,4,3,2,1].map(s=>`<button data-a="rf" data-s="${s}" aria-pressed="${G.rf===s}"><span>${s} star</span><span class="track"><i style="width:${dist[s-1]/total*100}%"></i></span><span class="mono small">${Math.round(dist[s-1]/total*100)}%</span></button>`).join('')}</div>
    ${G.rf?`<button class="linkbtn" data-a="rf" data-s="0">Show all reviews</button>`:''}
    <button class="btn ghost" data-a="writeReview">Write a review</button></div>
    <div><div class="between"><span class="small muted">${rs.length} written review${rs.length===1?'':'s'}${G.rf?` with ${G.rf} stars`:''}</span><label class="small muted">Sort <select data-c="rsort"><option value="new" ${G.rsort==='new'?'selected':''}>Newest</option><option value="hi" ${G.rsort==='hi'?'selected':''}>Highest rated</option><option value="lo" ${G.rsort==='lo'?'selected':''}>Lowest rated</option></select></label></div>
    <div id="reviewForm"></div>
    ${rs.length?rs.map(r=>`<article class="review"><div class="row">${stars(r.s)}<b>${esc(r.title)}</b></div><span class="who">${esc(r.n)} · ${esc(r.d)}${r.v?' · <span style="color:var(--good)">Verified purchase</span>':''}</span><p>${esc(r.t)}</p></article>`).join(''):'<p class="muted" style="padding-block:14px">No written reviews yet. Be the first to share your experience.</p>'}</div></div>`;
}
const extrasOf=id=>T.extrasCache&&T.extrasCache[id]||{};
function renderRQ(){const p=prod(G.id);document.getElementById('reviews').innerHTML='<h2>Customer reviews</h2>'+reviewsHTML(p);document.getElementById('qa').innerHTML='<h2>Questions and answers</h2>'+qaHTML(p)}
function qaHTML(p){
  const list=(extrasOf(p.id).questions)||[];
  return `<form class="row" data-f="ask"><input type="text" name="q" id="askQ" placeholder="Ask a question about this product" style="flex:1;min-width:220px" required><button class="btn ghost">Ask</button></form>
   ${list.length?list.map(x=>`<div class="qa"><span class="q">Q: ${esc(x.q)}</span>${x.a?`<span class="a">A: ${esc(x.a)} <span class="small">— ${esc(x.by||'Technotri support')}</span></span>`:'<span class="a small">Awaiting an answer from Technotri support (usually within one working day).</span>'}</div>`).join(''):'<p class="muted">No questions yet.</p>'}`;
}
A.gal=el=>{G.img=+el.dataset.i;document.getElementById('galMain').innerHTML=pic(prod(G.id),G.img);document.querySelectorAll('.gallery .thumbs button').forEach((b,i)=>b.setAttribute('aria-pressed',i===G.img))};
A.jump=el=>{const t=document.getElementById(el.dataset.t);if(t){const y=t.getBoundingClientRect().top+window.scrollY-150;window.scrollTo({top:y,behavior:'smooth'})}};
function pdpQtyUpdate(){const p=prod(G.id);const u=unitPrice(p,G.qty);const t=document.getElementById('pdpTotal');if(t)t.textContent=npr(u*G.qty);
  document.querySelectorAll('.breaks tbody tr').forEach((tr,i)=>{const q=p.breaks[i][0],nx=p.breaks[i+1];tr.classList.toggle('on',G.qty>=q&&(!nx||G.qty<nx[0]))});
  document.querySelectorAll('.opt .p').forEach((el,i)=>{el.textContent=npr(r10(u*D.PROTECT[i].pct))})}
A.pq=el=>{const p=prod(G.id);G.qty=Math.max(1,Math.min(p.stock,G.qty+(+el.dataset.d)));document.getElementById('pdpQty').value=G.qty;pdpQtyUpdate()};
C.pqset=el=>{const p=prod(G.id);G.qty=Math.max(1,Math.min(p.stock,+el.value||1));el.value=G.qty;pdpQtyUpdate()};
C.prot=el=>{G.prot=el.value};
A.pdpAdd=()=>addToCart(G.id,G.qty,G.prot||null);
A.pdpBuy=()=>{addToCart(G.id,G.qty,G.prot||null,true);go('checkout')};
C.fbt=()=>{const ids=[...document.querySelectorAll('[data-c="fbt"]:checked')].map(x=>x.value);document.getElementById('fbtTotal').textContent=npr(ids.reduce((a,id)=>a+unitPrice(prod(id)),0))};
A.fbtAdd=()=>{const ids=[...document.querySelectorAll('[data-c="fbt"]:checked')].map(x=>x.value);if(!ids.length){toast('Select at least one item');return}ids.forEach(id=>addToCart(id,1,null,true));toast(ids.length+' items added to cart')};
A.rf=el=>{G.rf=+el.dataset.s;document.getElementById('reviews').innerHTML='<h2>Customer reviews</h2>'+reviewsHTML(prod(G.id))};
C.rsort=el=>{G.rsort=el.value;document.getElementById('reviews').innerHTML='<h2>Customer reviews</h2>'+reviewsHTML(prod(G.id))};
A.writeReview=()=>{const box=document.getElementById('reviewForm');box.innerHTML=`<form class="panel stack" data-f="review" style="margin-block:12px"><h3>Your review</h3>
  <fieldset style="border:0;padding:0;margin:0"><legend class="small muted">Rating</legend><div class="row">${[1,2,3,4,5].map(s=>`<label class="check"><input type="radio" name="s" value="${s}" ${s===5?'checked':''}> ${s}★</label>`).join('')}</div></fieldset>
  <label class="field"><span>Title</span><input type="text" name="title" id="rvTitle" maxlength="80" required></label>
  <label class="field"><span>Review</span><textarea name="t" id="rvText" rows="4" maxlength="1200" required placeholder="What did you use it for? How has it performed?"></textarea></label>
  <label class="field"><span>Your name</span><input type="text" name="n" id="rvName" value="${esc(db().user?.name||'')}" required></label>
  <div class="row"><button class="btn buy">Submit review</button><button type="button" class="btn ghost" data-a="cancelReview">Cancel</button></div></form>`;box.querySelector('input[name=title]').focus()};
A.cancelReview=()=>{document.getElementById('reviewForm').innerHTML=''};
F.review=async f=>{
  const t=f.title.value.trim(),x=f.t.value.trim(),n=f.n.value.trim();if(!t||!x||!n){toast('Fill in the title, review and your name');return}
  const b=f.querySelector('button.buy');busy(b,true,'Publishing…');
  try{
    const r=await api('/products/'+encodeURIComponent(G.id)+'/reviews',{method:'POST',body:{name:n,stars:+f.s.value,title:t,body:x}});
    await Promise.all([loadExtras(G.id,true),reloadCatalog()]);G.rf=0;renderRQ();toast(r.verified?'Thanks, your verified review is published':'Thanks, your review is published');
  }catch(e){toast(e.message);busy(b,false)}
};
F.ask=async f=>{const q=f.q.value.trim();if(q.length<5){toast('Write a slightly longer question');return}
  try{await api('/products/'+encodeURIComponent(G.id)+'/questions',{method:'POST',body:{question:q}});f.reset();toast('Question sent to Technotri support. We usually answer within one working day.')}catch(e){toast(e.message)}};

/* ================= COMPARE ================= */
let cmpDiff=false;
Views.compare=()=>{
  const ps=db().compare.map(prod).filter(Boolean);
  if(!ps.length) return `${crumbs([['Compare']])}<h1>Compare products</h1><div class="empty">Tick “Compare” on up to 4 products to see them side by side.<a class="btn" href="#home">Browse products</a></div>`;
  const keys=[...new Set(ps.flatMap(p=>Object.keys(p.specs)))];
  const rows=[
    ['Price',p=>p.quote?'Quote':npr(unitPrice(p))],['Rating',p=>{const [a,n]=ratingOf(p);return n?a.toFixed(1)+' ★ ('+n+')':'—'}],['Lab score',p=>p.lab?p.lab.score.toFixed(1):'—'],
    ['Availability',p=>p.quote?'Made to order':p.stock>0?'In stock':'Out of stock'],['Warranty',p=>p.warranty||'—'],['Brand',p=>p.brand],
    ...keys.map(k=>[k,p=>p.specs[k]||'—'])];
  return `${crumbs([['Compare']])}<div class="between"><h1>Compare ${ps.length} products</h1><label class="check"><input type="checkbox" data-c="cmpdiff" ${cmpDiff?'checked':''}> Highlight differences</label></div>
  <div class="tbl-wrap"><table class="data cmp-table"><thead><tr><th></th>${ps.map(p=>`<th style="text-transform:none;letter-spacing:0;font-family:var(--f-body);font-size:14px;color:var(--ink);background:var(--surface)"><div class="stack" style="gap:6px"><a href="#p-${p.id}" style="background:var(--surface-2);border-radius:6px;display:block">${pic(p)}</a><a href="#p-${p.id}" style="color:var(--ink);font-weight:600">${esc(p.name)}</a>${p.quote?`<button class="btn sm ghost" data-a="quote" data-id="${p.id}">Add to quote</button>`:`<button class="btn sm buy" data-a="add" data-id="${p.id}" ${p.stock>0?'':'disabled'}>Add to cart</button>`}<button class="linkbtn" data-a="uncmp" data-id="${p.id}">Remove</button></div></th>`).join('')}</tr></thead>
  <tbody>${rows.map(([k,fn])=>{const vals=ps.map(fn);const diff=new Set(vals).size>1;return `<tr class="${cmpDiff&&diff?'diff':''}"><th scope="row" style="color:var(--muted);font-weight:500">${esc(k)}</th>${vals.map(v=>`<td class="mono small">${esc(v)}</td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
};
C.cmpdiff=el=>{cmpDiff=el.checked;refresh()};

/* ================= KITS ================= */
function kitTotal(k){return k.items.reduce((a,id)=>a+(unitPrice(prod(id))||0),0)}
function groupIds(ids){const m=new Map();ids.forEach(i=>m.set(i,(m.get(i)||0)+1));return [...m.entries()]}
function kitCard(k){
  return `<article class="panel stack"><span class="eyebrow">For ${esc(k.for)}</span><h3>${esc(k.name)}</h3><p class="small">${esc(k.note)}</p>
   <ul style="margin:0;padding-left:18px;font-size:13.5px;color:var(--muted)">${groupIds(k.items).map(([id,n])=>`<li>${n>1?n+' × ':''}<a href="#p-${id}">${esc(prod(id)?.name||id)}</a></li>`).join('')}${k.extra.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>
   <div class="between" style="border-top:1px solid var(--line);padding-top:10px">${k.quote?`<span><span class="small muted">from</span> <b class="price">${npr(kitTotal(k))}</b></span><button class="btn sm ghost" data-a="kitQuote" data-k="${k.id}">Request quote</button>`:`<b class="price">${npr(kitTotal(k))}</b><button class="btn sm buy" data-a="kitAdd" data-k="${k.id}">Add kit to cart</button>`}</div></article>`;
}
A.kitAdd=el=>{const k=D.KITS.find(x=>x.id===el.dataset.k);groupIds(k.items).forEach(([id,n])=>addToCart(id,n,null,true));toast(k.name+' added to cart')};
A.kitQuote=el=>{const k=D.KITS.find(x=>x.id===el.dataset.k);groupIds(k.items).forEach(([id,n])=>addToQuote(id,n));go('quote')};
Views.kits=()=>`${crumbs([['Kits']])}<h1>Ready kits</h1><p class="muted" style="max-width:70ch">Matched parts you can order together. Kits that need a site survey go to a quotation.</p><div class="ggrid">${D.KITS.map(kitCard).join('')}</div>`;

/* ================= CART ================= */
Views.cart=()=>{
  const t=cartTotals();
  const saved=db().saved.map(prod).filter(Boolean);
  const head=`${crumbs([['Cart']])}<h1>Cart</h1>`;
  if(!t.lines.length) return `${head}<div class="empty"><b>Your cart is empty.</b><div class="row"><a class="btn" href="#home">Continue shopping</a><a class="btn ghost" href="#deals">See today's deals</a></div></div>${saved.length?savedHTML(saved):''}`;
  return `${head}
  <div class="two">
    <div class="stack">
      <div class="panel freebar">${t.ship===0&&!db().pickup&&t.items>=t.z.free?`<span style="color:var(--good)"><b>Free delivery</b> to ${esc(t.z.name)} unlocked.</span>`:`<span>Add <b class="mono">${npr(t.toFree)}</b> more for free delivery to ${esc(t.z.name)}.</span>`}<div class="meter-bar"><i style="width:${Math.min(100,t.items/t.z.free*100)}%"></i></div></div>
      <div class="panel">${t.lines.map((l,i)=>`<div class="cline"><a class="pic" href="#p-${l.id}">${pic(l.p)}</a>
        <div class="meta"><a href="#p-${l.id}">${esc(l.p.name)}</a><span class="small muted mono">${esc(l.p.model||'')} · ${npr(l.unit)} each${l.p.breaks&&l.unit<l.p.price?' · qty price':''}</span>${stockLine(l.p)}
          <label class="small">Protection <select data-c="lprot" data-i2="${i}"><option value="">None</option>${l.p.price>=5000?D.PROTECT.map(pr=>`<option value="${pr.id}" ${l.prot===pr.id?'selected':''}>${pr.name} (${npr(r10(l.unit*pr.pct))} each)</option>`).join(''):''}</select></label>
          <div class="acts"><button class="linkbtn" data-a="saveLater" data-i="${i}">Save for later</button><button class="linkbtn" data-a="rmLine" data-i="${i}">Remove</button></div></div>
        <div class="right"><div class="qty"><button type="button" data-a="lq" data-i="${i}" data-d="-1" aria-label="Decrease">−</button><input type="number" min="1" value="${l.qty}" data-c="lqset" data-i2="${i}" aria-label="Quantity" id="lq-${i}"><button type="button" data-a="lq" data-i="${i}" data-d="1" aria-label="Increase">+</button></div><b class="price">${npr(l.line+l.protAmt)}</b></div></div>`).join('')}</div>
      ${saved.length?savedHTML(saved):''}
    </div>
    <aside class="panel stack" aria-label="Order summary">
      <h3>Order summary</h3>
      <label class="field"><span>Deliver to</span><select data-c="zone">${D.ZONES.map(z=>`<option value="${z.id}" ${z.id===db().zone?'selected':''}>${z.name} · ${npr(z.fee)}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" data-c="pickup" ${db().pickup?'checked':''}> Pick up from Kumaristhan store (free)</label>
      <form class="row" data-f="coupon" style="flex-wrap:nowrap">${t.cp?`<span class="badge dealer" style="font-size:13px">${t.cp.code}</span><button type="button" class="linkbtn" data-a="rmCoupon">Remove</button>`:`<input type="text" name="code" id="couponIn" placeholder="Coupon code" style="flex:1"><button class="btn sm ghost">Apply</button>`}</form>
      ${t.cmsg?`<div class="alert info">${esc(t.cmsg)}</div>`:''}
      <div class="summary">
        <div><span>Items (${t.lines.reduce((a,l)=>a+l.qty,0)})</span><span class="mono">${npr(t.items)}</span></div>
        ${t.prot?`<div><span>Extended warranty</span><span class="mono">${npr(t.prot)}</span></div>`:''}
        ${t.disc?`<div class="disc"><span>Coupon ${t.cp.code}</span><span class="mono">−${npr(t.disc)}</span></div>`:''}
        <div><span>Delivery</span><span class="mono">${t.ship?npr(t.ship):'Free'}</span></div>
        <div class="small muted"><span>Taxable amount</span><span class="mono">${npr(t.taxable)}</span></div>
        <div class="small muted"><span>VAT 13% (included)</span><span class="mono">${npr(t.vat)}</span></div>
        <div class="total"><span>Total</span><span class="mono">${npr(t.total)}</span></div>
      </div>
      <a class="btn buy lg block" href="#checkout">Checkout</a>
      <p class="small muted">Pay by cash on delivery, or bank transfer for business orders.</p>
    </aside>
  </div>`;
};
function savedHTML(saved){return `<section class="panel"><h3>Saved for later (${saved.length})</h3>${saved.map(p=>`<div class="cline"><a class="pic" href="#p-${p.id}">${pic(p)}</a><div class="meta"><a href="#p-${p.id}">${esc(p.name)}</a>${priceLine(p)}</div><div class="right"><button class="btn sm ghost" data-a="moveCart" data-id="${p.id}">Move to cart</button><button class="linkbtn" data-a="rmSaved" data-id="${p.id}">Remove</button></div></div>`).join('')}</section>`}
A.lq=el=>{const l=db().cart[+el.dataset.i];const p=prod(l.id);l.qty=Math.max(1,Math.min(p.stock,l.qty+(+el.dataset.d)));Store.save();refresh()};
C.lqset=el=>{const l=db().cart[+el.dataset.i2];const p=prod(l.id);l.qty=Math.max(1,Math.min(p.stock,+el.value||1));Store.save();refresh()};
C.lprot=el=>{db().cart[+el.dataset.i2].prot=el.value||null;Store.save();refresh()};
A.rmLine=el=>{const [l]=db().cart.splice(+el.dataset.i,1);Store.save();refresh();toast('Removed '+(prod(l.id)?.name||'item'))};
A.saveLater=el=>{const [l]=db().cart.splice(+el.dataset.i,1);if(!db().saved.includes(l.id))db().saved.push(l.id);Store.save();refresh()};
A.moveCart=el=>{db().saved=db().saved.filter(x=>x!==el.dataset.id);Store.save();addToCart(el.dataset.id,1,null,true);refresh()};
A.rmSaved=el=>{db().saved=db().saved.filter(x=>x!==el.dataset.id);Store.save();refresh()};
C.pickup=el=>{db().pickup=el.checked;Store.save();refresh()};
F.coupon=f=>{const c=f.code.value.trim().toUpperCase();const cp=D.COUPONS.find(x=>x.code===c);if(!cp){toast('That code is not valid. Check the Deals page for current coupons.');return}if(cp.first&&!db().user)toast('Sign in at checkout so we can confirm this is your first order.');db().coupon=c;Store.save();refresh();toast(c+' applied')};
A.rmCoupon=()=>{db().coupon=null;Store.save();refresh()};

/* ================= CHECKOUT ================= */
const PAY=[['cod','Cash on delivery','Pay in cash or by QR when it arrives. We call to confirm first.'],['bank','Bank transfer','For business orders. We email bank details; goods dispatch after the transfer clears.']];
Views.checkout=()=>{
  const t=cartTotals(); const u=db().user||{}; const a=(u.addresses||[])[0]||{};
  if(!t.lines.length) return `${crumbs([['Checkout']])}<h1>Checkout</h1><div class="empty">Your cart is empty.<a class="btn" href="#home">Continue shopping</a></div>`;
  const pick=!!db().pickup;
  return `${crumbs([['Cart','cart'],['Checkout']])}<h1>Checkout</h1>
  <div class="steps"><span class="done">1 Cart</span><span class="on">2 Details and payment</span><span>3 Confirmation</span></div>
  <form class="two" data-f="checkout" novalidate>
    <div class="stack">
      <section class="panel stack"><h3>Contact</h3>
        ${db().user?'':`<p class="small muted">Have an account? <a href="#signin">Sign in</a> to use saved addresses and see this order later. Or check out as a guest.</p>`}
        <div class="form-grid"><label class="field"><span>Full name</span><input type="text" name="name" id="ckName" value="${esc(u.name||'')}" autocomplete="name" required></label>
        <label class="field"><span>Mobile number</span><input type="tel" name="phone" id="ckPhone" value="${esc(u.phone||'')}" autocomplete="tel" placeholder="98XXXXXXXX" required></label>
        <label class="field full"><span>Email (for the VAT invoice)</span><input type="email" name="email" id="ckEmail" value="${esc(u.email||'')}" autocomplete="email"></label>
        <label class="field full"><span>Business PAN/VAT (optional, printed on invoice)</span><input type="text" name="pan" id="ckPan" value="${esc(u.pan||'')}"></label></div></section>
      <section class="panel stack"><h3>Delivery</h3>
        <div class="choices"><label class="choice"><input type="radio" name="method" value="ship" data-c="ckmethod" ${pick?'':'checked'}><span><b>Deliver to my address</b><br><span class="small muted">${esc(zone().name)} · arrives by ${etaDate(zone().days)}</span></span><span class="p">${t.ship?npr(zone().fee):'Free'}</span></label>
        <label class="choice"><input type="radio" name="method" value="pickup" data-c="ckmethod" ${pick?'checked':''}><span><b>Pick up from our store</b><br><span class="small muted">Ward 16, Kumaristhan, Kathmandu · ready in 2 hours</span></span><span class="p">Free</span></label></div>
        <div class="form-grid" id="addrBox" ${pick?'hidden':''}>
          <label class="field"><span>District / city</span><input type="text" name="city" id="ckCity" value="${esc(a.city||'')}" placeholder="Kathmandu"></label>
          <label class="field"><span>Municipality and ward</span><input type="text" name="ward" id="ckWard" value="${esc(a.ward||'')}" placeholder="KMC-16"></label>
          <label class="field full"><span>Street, tole and landmark</span><input type="text" name="street" id="ckStreet" value="${esc(a.street||'')}" placeholder="Near the temple, blue gate"></label>
          ${db().zone==='ktm'?`<label class="field full"><span>Delivery time</span><select name="slot" id="ckSlot"><option>Any time</option><option>Morning (9 AM – 1 PM)</option><option>Afternoon (1 PM – 6 PM)</option></select></label>`:''}
        </div>
        <label class="check"><input type="checkbox" name="install" id="ckInstall"> I'd like installation (we call to quote and schedule)</label>
      </section>
      <section class="panel stack"><h3>Payment</h3><div class="choices">${PAY.map(([v,n,d],i)=>`<label class="choice"><input type="radio" name="pay" value="${v}" ${i===0?'checked':''}><span><b>${n}</b><br><span class="small muted">${d}</span></span></label>`).join('')}</div></section>
      <label class="field"><span>Order notes (optional)</span><textarea name="notes" id="ckNotes" rows="2"></textarea></label>
    </div>
    <aside class="panel stack" style="position:sticky;top:150px"><h3>Your order</h3>
      ${t.lines.map(l=>`<div class="between small" style="flex-wrap:nowrap;align-items:flex-start"><span>${l.qty} × ${esc(l.p.name)}${l.pr?`<br><span class="muted">+ ${esc(l.pr.name)}</span>`:''}</span><span class="mono">${npr(l.line+l.protAmt)}</span></div>`).join('')}
      <div class="summary">${t.disc?`<div class="disc"><span>Coupon ${t.cp.code}</span><span class="mono">−${npr(t.disc)}</span></div>`:''}<div><span>Delivery</span><span class="mono">${t.ship?npr(t.ship):'Free'}</span></div><div class="small muted"><span>VAT 13% (included)</span><span class="mono">${npr(t.vat)}</span></div><div class="total"><span>Total</span><span class="mono">${npr(t.total)}</span></div></div>
      ${t.cmsg?`<div class="alert info small">${esc(t.cmsg)}</div>`:''}
      <label class="check small"><input type="checkbox" name="agree" id="ckAgree"> I agree to the <a href="#support">terms, return and warranty policy</a>.</label>
      <div id="ckErr"></div>
      <button class="btn buy lg block">Place order</button>
      <p class="small muted">Sold by ${esc(D.COMPANY.name||'Technotri Pvt. Ltd.')}, PAN ${esc(D.COMPANY.pan||'')}. An electronic VAT invoice is issued for every order.</p>
    </aside>
  </form>`;
};
C.ckmethod=el=>{
  const f=el.form, keep={};[...f.elements].forEach(x=>{if(x.name&&x.name!=='method'&&x.type!=='radio')keep[x.name]=x.type==='checkbox'?x.checked:x.value;if(x.name==='pay'&&x.checked)keep.pay=x.value});
  db().pickup=el.value==='pickup';Store.save();refresh();
  const g=document.querySelector('form[data-f="checkout"]');if(!g)return;
  [...g.elements].forEach(x=>{if(!x.name||!(x.name in keep))return;if(x.type==='checkbox')x.checked=keep[x.name];else if(x.type==='radio')x.checked=x.value===keep[x.name];else x.value=keep[x.name]});
};
F.checkout=async f=>{
  const err=[];const phone=f.phone.value.replace(/\D/g,'');
  if(!f.name.value.trim()) err.push('Enter your full name.');
  if(!/^9[678]\d{8}$/.test(phone)) err.push('Enter a 10-digit mobile number starting with 96, 97 or 98.');
  if(f.email.value&&!/^\S+@\S+\.\S+$/.test(f.email.value)) err.push('Check the email address.');
  if(!db().pickup&&(!f.city.value.trim()||!f.street.value.trim())) err.push('Enter your city and street or landmark.');
  if(!f.agree.checked) err.push('Accept the terms to place the order.');
  const box=document.getElementById('ckErr');
  if(err.length){box.innerHTML=`<div class="alert err">${err.map(esc).join('<br>')}</div>`;box.scrollIntoView({block:'center'});return}
  box.innerHTML='';
  const info={name:f.name.value.trim(),phone,email:f.email.value.trim(),pan:f.pan.value.trim(),method:db().pickup?'pickup':'ship',
    city:f.city?.value.trim()||'',ward:f.ward?.value.trim()||'',street:f.street?.value.trim()||'',slot:f.slot?.value||'',install:f.install.checked,notes:f.notes.value.trim(),pay:f.pay.value};
  const btn=f.querySelector('button.buy');busy(btn,true,'Placing order…');
  try{
    const t=cartTotals();
    const res=await api('/orders',{method:'POST',body:{items:db().cart.map(l=>({id:l.id,qty:l.qty,prot:l.prot||null})),coupon:t.cp&&!t.cmsg?t.cp.code:null,zone:db().zone,info}});
    db().cart=[];db().coupon=null;Store.save();myOrders=null;
    if(db().user){db().user.orderCount=(db().user.orderCount||0)+1}
    T.lastOrder=res.order;justPlaced=res.order.no;
    reloadCatalog().catch(()=>{});
    go('order-'+res.order.no);
  }catch(e){
    box.innerHTML=errBox(e.message);box.scrollIntoView({block:'center'});busy(btn,false);
    if(e.status===409) reloadCatalog().catch(()=>{});
  }
};
let justPlaced=null;

/* ================= ORDERS ================= */
const STEPS=[['placed','Order placed'],['confirmed','Confirmed'],['packed','Packed'],['shipped','Out for delivery'],['delivered','Delivered']];
function orderDetail(o){
  const idx=STEPS.findIndex(s=>s[0]===o.status);const at=s=>o.history.find(h=>h.s===s);
  return `<div class="two"><div class="stack">
    <section class="panel stack"><div class="between"><h3>Status</h3><span class="pill ${o.status}">${o.status==='cancelled'?'Cancelled':STEPS[idx]?.[1]||o.status}</span></div>
     ${o.status==='cancelled'?'<p class="muted">This order was cancelled.</p>':`<ol class="timeline">${STEPS.map(([s,l],i)=>`<li class="${i<idx?'done':i===idx?'cur':''}"><span class="dot"></span><div><b>${l}</b><div class="small muted">${at(s)?fmtStamp(at(s).t):i===STEPS.length-1?(o.info.method==='pickup'?'At Kumaristhan store':'Expected '+esc(o.eta)):''}</div></div></li>`).join('')}</ol>`}</section>
    <section class="panel invoice" id="invoice"><div class="between" style="margin-bottom:10px"><h3>Tax invoice</h3><span class="row"><span class="mono small">${o.no}</span><button class="btn sm ghost" data-a="printInvoice">Print</button></span></div>
     <div class="form-grid small" style="margin-bottom:12px"><div><b>Seller</b><br>${esc(D.COMPANY.name)}<br>${esc(D.COMPANY.address)}<br>PAN ${esc(D.COMPANY.pan)}</div><div><b>Buyer</b><br>${esc(o.info.name)}<br>${esc(o.info.phone)}${o.info.pan?'<br>PAN '+esc(o.info.pan):''}<br>${o.info.method==='pickup'?'Store pickup':esc([o.info.street,o.info.ward,o.info.city].filter(Boolean).join(', '))}</div></div>
     <div class="tbl-wrap"><table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr></thead><tbody>
      ${o.items.map(i=>`<tr><td>${esc(i.name)}<br><span class="small muted mono">${esc(i.model||'')}</span>${i.prot?`<br><span class="small muted">+ ${esc(i.prot)}</span>`:''}</td><td class="r">${i.qty}</td><td class="r">${npr(i.unit)}</td><td class="r">${npr(i.unit*i.qty+i.protAmt)}</td></tr>`).join('')}
      ${o.disc?`<tr><td colspan="3">Discount (${esc(o.coupon)})</td><td class="r">−${npr(o.disc)}</td></tr>`:''}
      <tr><td colspan="3">Delivery</td><td class="r">${o.ship?npr(o.ship):'Free'}</td></tr>
      <tr><td colspan="3">Taxable amount</td><td class="r">${npr(o.taxable)}</td></tr><tr><td colspan="3">VAT 13%</td><td class="r">${npr(o.vat)}</td></tr>
      <tr><td colspan="3"><b>Grand total</b></td><td class="r"><b>${npr(o.total)}</b></td></tr></tbody></table></div>
     <p class="small muted" style="margin-top:8px">Payment: ${esc(PAY.find(p=>p[0]===o.info.pay)?.[1]||o.info.pay)} · ${esc(o.pay.status)}. Prices include VAT.</p></section>
  </div><aside class="panel stack"><h3>Need help?</h3><p class="small">Call <b class="mono">${esc(D.COMPANY.phone)}</b> or email <b>${esc(D.COMPANY.email)}</b> with your order number.</p>
    ${['placed','confirmed'].includes(o.status)?`<button class="btn ghost" data-a="cancelOrder" data-no="${o.no}" data-phone="${esc(o.info.phone)}">Cancel order</button>`:''}
    <a class="btn ghost" href="#support">Warranty and returns</a><a class="btn" href="#home">Continue shopping</a></aside></div>`;
}
function orderPage(o){
  const fresh=justPlaced===o.no;justPlaced=null;
  return `${crumbs(db().user?[['My orders','my-orders'],[o.no]]:[['Track order','track'],[o.no]])}
  ${fresh?`<div class="panel stack" style="border-color:var(--good)"><span class="eyebrow" style="color:var(--good)">Order confirmed</span><h1>Thank you, ${esc(o.info.name.split(' ')[0])}. Your order ${o.no} is placed.</h1><p class="muted">${o.info.pay==='cod'?`We will call ${esc(o.info.phone)} to confirm before dispatch.`:'We will email bank details for the transfer.'} ${o.info.method==='pickup'?'We will text you when it is ready for pickup.':'Expected delivery: '+esc(o.eta)+'.'} Keep your order number to track it.</p></div>`:`<h1>Order ${o.no}</h1><p class="muted">Placed ${fmtStamp(o.t)}</p>`}
  ${orderDetail(o)}`;
}
Views.order=no=>{
  const cached=T.lastOrder&&T.lastOrder.no===no?T.lastOrder:null;
  if(cached) return orderPage(cached);
  const phone=T.trackPhone||'';
  return asyncView(()=>api('/orders/'+encodeURIComponent(no)+(phone?'?phone='+encodeURIComponent(phone):'')).then(r=>r.order),o=>{T.lastOrder=o;return orderPage(o)},'Loading your order…');
};
A.printInvoice=()=>{try{window.print()}catch(e){}};
A.cancelOrder=async el=>{
  if(!el.dataset.sure){el.dataset.sure='1';el.textContent='Tap again to confirm cancellation';el.classList.add('buy');return}
  busy(el,true,'Cancelling…');
  try{const r=await api('/orders/'+encodeURIComponent(el.dataset.no)+'/cancel',{method:'POST',body:{phone:el.dataset.phone}});T.lastOrder=r.order;reloadCatalog().catch(()=>{});refresh();toast('Order cancelled')}
  catch(e){toast(e.message);busy(el,false)}
};
Views.track=()=>`${crumbs([['Track order']])}<h1>Track your order</h1>
  <form class="panel stack" data-f="track" style="max-width:520px"><label class="field"><span>Order number</span><input type="text" name="no" id="trNo" placeholder="TT261102-1234" required></label><label class="field"><span>Mobile number used for the order</span><input type="tel" name="phone" id="trPhone" value="${esc(db().user?.phone||'')}" required></label><div id="trErr"></div><button class="btn buy">Track</button></form>`;
F.track=async f=>{const b=f.querySelector('button');busy(b,true,'Finding order…');
  try{const r=await api('/track',{method:'POST',body:{no:f.no.value.trim(),phone:f.phone.value}});T.lastOrder=r.order;T.trackPhone=r.order.info.phone;go('order-'+r.order.no)}
  catch(e){document.getElementById('trErr').innerHTML=errBox(e.message);busy(b,false)}};

/* ================= ACCOUNT ================= */
const accNav=on=>`<nav class="sidenav" aria-label="Account">${[['account','Overview'],['my-orders','Orders'],['wishlist','Wishlist'],['addresses','Addresses'],['dealer','Dealer account'],['track','Track an order']].map(([h,l])=>`<a href="#${h}" class="${on===h?'on':''}">${l}</a>`).join('')}${T.isStaff()?'<a href="#admin">Staff admin</a>':''}${db().user?'<button class="linkbtn" style="text-align:left;padding:9px 12px" data-a="signout">Sign out</button>':''}</nav>`;
const needUser=(h)=>db().user?null:`${crumbs([['Account']])}<div class="empty"><b>Sign in to see your ${h}.</b><a class="btn" href="#signin">Sign in</a></div>`;
let authTab='in', afterLogin=null;
Views.signin=()=>{
  if(db().user) return Views.account();
  return `${crumbs([['Sign in']])}<div style="max-width:480px;margin:0 auto;width:100%" class="stack"><h1>${authTab==='in'?'Sign in':'Create your account'}</h1>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${authTab==='in'}" data-a="authTab" data-t="in">Sign in</button><button role="tab" aria-selected="${authTab==='up'}" data-a="authTab" data-t="up">Create account</button></div>
  ${authTab==='in'?`<form class="panel stack" data-f="login"><label class="field"><span>Mobile number or email</span><input type="text" name="login" id="liLogin" autocomplete="username" required></label><label class="field"><span>Password</span><input type="password" name="password" id="liPass" autocomplete="current-password" required></label><div id="authErr"></div><button class="btn buy">Sign in</button><p class="small muted">Forgot your password? Call ${esc(D.COMPANY.phone||'')} and we will reset it.</p></form>`
  :`<form class="panel stack" data-f="register"><label class="field"><span>Full name</span><input type="text" name="name" id="rgName" autocomplete="name" required></label><label class="field"><span>Mobile number</span><input type="tel" name="phone" id="rgPhone" autocomplete="tel" placeholder="98XXXXXXXX" required></label><label class="field"><span>Email (optional, for invoices)</span><input type="email" name="email" id="rgEmail" autocomplete="email"></label><label class="field"><span>Password (at least 8 characters)</span><input type="password" name="password" id="rgPass" autocomplete="new-password" minlength="8" required></label><div id="authErr"></div><button class="btn buy">Create account</button></form>`}</div>`;
};
A.authTab=el=>{authTab=el.dataset.t;refresh()};
function signedIn(user,msg){myOrders=null;setUser(user);reloadCatalog().then(()=>{toast(msg);const next=afterLogin;afterLogin=null;go(next||(T.isStaff()?'admin':'account'))}).catch(()=>go('account'))}
F.login=async f=>{const b=f.querySelector('button');busy(b,true,'Signing in…');
  try{const r=await api('/auth/login',{method:'POST',body:{login:f.login.value,password:f.password.value}});signedIn(r.user,'Welcome back, '+r.user.name.split(' ')[0])}
  catch(e){document.getElementById('authErr').innerHTML=errBox(e.message);busy(b,false)}};
F.register=async f=>{const b=f.querySelector('button');busy(b,true,'Creating account…');
  try{const r=await api('/auth/register',{method:'POST',body:{name:f.name.value,phone:f.phone.value,email:f.email.value,password:f.password.value}});signedIn(r.user,'Welcome, '+r.user.name.split(' ')[0])}
  catch(e){document.getElementById('authErr').innerHTML=errBox(e.message);busy(b,false)}};
A.signout=async()=>{myOrders=null;try{await api('/auth/logout',{method:'POST'})}catch(e){} setUser(null);await reloadCatalog().catch(()=>{});toast('Signed out');go('home')};
let myOrders=null;
const loadMyOrders=()=>myOrders?Promise.resolve(myOrders):api('/account/orders').then(r=>(myOrders=r.orders));
Views.account=()=>needUser('account')||asyncView(loadMyOrders,orders=>`${crumbs([['Account']])}<h1>Hello, ${esc(db().user.name)}</h1><div class="acct">${accNav('account')}<div class="stack">
  <div class="kpis"><a class="kpi" href="#my-orders" style="color:var(--ink)"><span class="small muted">Orders</span><span class="v">${orders.length}</span></a><a class="kpi" href="#wishlist" style="color:var(--ink)"><span class="small muted">Wishlist</span><span class="v">${db().wish.length}</span></a><a class="kpi" href="#dealer" style="color:var(--ink)"><span class="small muted">Dealer status</span><span class="v" style="font-size:16px;text-transform:capitalize">${db().user.dealer==='none'?'Not applied':esc(db().user.dealer)}</span></a><a class="kpi" href="#quote" style="color:var(--ink)"><span class="small muted">Quote list</span><span class="v">${db().quoteList.length}</span></a></div>
  <section class="panel stack"><h3>Recent orders</h3>${ordersTable(orders.slice(0,5))}</section>
  <form class="panel stack" data-f="profile"><h3>Profile</h3><div class="form-grid"><label class="field"><span>Name</span><input type="text" name="name" id="pfName" value="${esc(db().user.name)}" required></label><label class="field"><span>Mobile</span><input type="text" value="${esc(db().user.phone||'')}" disabled id="pfPhone"></label><label class="field"><span>Email</span><input type="email" name="email" id="pfEmail" value="${esc(db().user.email||'')}"></label><label class="field"><span>PAN/VAT</span><input type="text" name="pan" id="pfPan" value="${esc(db().user.pan||'')}"></label></div><div id="pfErr"></div><button class="btn" style="justify-self:start">Save profile</button></form>
  <form class="panel stack" data-f="password"><h3>Change password</h3><div class="form-grid"><label class="field"><span>Current password</span><input type="password" name="current" id="pwCur" autocomplete="current-password" required></label><label class="field"><span>New password</span><input type="password" name="next" id="pwNew" autocomplete="new-password" minlength="8" required></label></div><div id="pwErr"></div><button class="btn ghost" style="justify-self:start">Change password</button></form></div></div>`,'Loading your account…');
F.profile=async f=>{try{const r=await api('/account/me',{method:'PUT',body:{name:f.name.value,email:f.email.value,pan:f.pan.value}});setUser(r.user);toast('Profile saved');refresh()}catch(e){document.getElementById('pfErr').innerHTML=errBox(e.message)}};
F.password=async f=>{try{await api('/account/password',{method:'PUT',body:{current:f.current.value,next:f.next.value}});f.reset();document.getElementById('pwErr').innerHTML='<div class="alert ok">Password changed.</div>'}catch(e){document.getElementById('pwErr').innerHTML=errBox(e.message)}};
function ordersTable(list){return list.length?`<div class="tbl-wrap"><table class="data"><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${list.map(o=>`<tr><td><a href="#order-${o.no}" class="mono">${o.no}</a></td><td class="small">${fmtStamp(o.t)}</td><td class="small">${o.items.reduce((a,i)=>a+i.qty,0)}</td><td class="price">${npr(o.total)}</td><td><span class="pill ${o.status}">${o.status}</span></td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">No orders yet.</p>'}
Views['my-orders']=()=>needUser('orders')||asyncView(()=>{myOrders=null;return loadMyOrders()},orders=>`${crumbs([['Account','account'],['Orders']])}<h1>Your orders</h1><div class="acct">${accNav('my-orders')}<div>${ordersTable(orders)}</div></div>`,'Loading your orders…');
Views.wishlist=()=>{const ps=db().wish.map(prod).filter(Boolean);return `${crumbs([['Wishlist']])}<h1>Wishlist</h1><div class="acct">${accNav('wishlist')}<div>${ps.length?`<div class="pgrid">${ps.map(card).join('')}</div>`:'<div class="empty">Tap the heart on any product to save it here.<a class="btn" href="#home">Browse products</a></div>'}</div></div>`};
Views.addresses=()=>needUser('addresses')||`${crumbs([['Account','account'],['Addresses']])}<h1>Addresses</h1><div class="acct">${accNav('addresses')}<div class="stack">
  ${(db().user.addresses||[]).map((a,i)=>`<div class="panel between"><span>${esc([a.street,a.ward,a.city].filter(Boolean).join(', '))}${i===0?' <span class="badge">Default</span>':''}</span><button class="linkbtn" data-a="rmAddr" data-id="${a.id}">Remove</button></div>`).join('')||'<p class="muted">No saved addresses yet. Addresses from your orders are saved here.</p>'}
  <form class="panel form-grid" data-f="addr"><label class="field"><span>District / city</span><input type="text" name="city" id="adCity" required></label><label class="field"><span>Municipality and ward</span><input type="text" name="ward" id="adWard"></label><label class="field full"><span>Street, tole and landmark</span><input type="text" name="street" id="adStreet" required></label><div id="adErr" class="full"></div><div class="full"><button class="btn">Save address</button></div></form></div></div>`;
F.addr=async f=>{try{const r=await api('/account/addresses',{method:'POST',body:{city:f.city.value,ward:f.ward.value,street:f.street.value}});setUser(r.user);refresh();toast('Address saved')}catch(e){document.getElementById('adErr').innerHTML=errBox(e.message)}};
A.rmAddr=async el=>{try{const r=await api('/account/addresses/'+el.dataset.id,{method:'DELETE'});setUser(r.user);refresh()}catch(e){toast(e.message)}};

/* ================= DEALER / BUSINESS / QUOTE ================= */
Views.dealer=()=>{
  const u=db().user, st=u?.dealer||'none';
  return `${crumbs([['Business','quote'],['Dealer account']])}<h1>Dealer and installer pricing</h1>
  <div class="acct">${accNav('dealer')}<div class="stack">
   <div class="ggrid">${[['10–15% off retail','Category discounts on every listed product once approved.'],['Carton and quantity prices','ONTs, cable, connectors and switches by the carton.'],['Credit terms','Net-15 or Net-30 for approved accounts after three orders.']].map(([h,p])=>`<div class="panel stack"><h3>${h}</h3><p class="small muted">${p}</p></div>`).join('')}</div>
   ${!u?`<div class="panel stack"><p>Create an account or sign in first, then apply here.</p><a class="btn buy" href="#signin" data-a="loginThen" data-next="dealer" style="justify-self:start">Sign in to apply</a></div>`
   :st==='approved'?`<div class="alert ok">Your dealer account is approved. Dealer prices are shown across the store while you are signed in.</div>`
   :st==='pending'?`<div class="alert info">Your application is under review. We usually reply within one working day.</div>`:`
   ${st==='rejected'?'<div class="alert err">Your previous application was not approved. Call us to discuss, or apply again with more detail.</div>':''}
   <form class="panel stack" data-f="dealer"><h3>Apply</h3><div class="form-grid">
    <label class="field"><span>Business name</span><input type="text" name="biz" id="dlBiz" required></label>
    <label class="field"><span>PAN / VAT number</span><input type="text" name="pan" id="dlPan" inputmode="numeric" value="${esc(u.pan||'')}" required></label>
    <label class="field"><span>Business type</span><select name="type" id="dlType"><option>Electrician / installer</option><option>ISP / cable operator</option><option>IT reseller</option><option>Solar company</option><option>Institution</option></select></label>
    <label class="field"><span>District</span><input type="text" name="district" id="dlDist" required></label>
    <label class="field full"><span>What do you buy most?</span><textarea name="note" id="dlNote" rows="2"></textarea></label></div><div id="dlErr"></div><button class="btn buy" style="justify-self:start">Submit application</button></form>`}
  </div></div>`;
};
A.loginThen=el=>{afterLogin=el.dataset.next};
F.dealer=async f=>{const b=f.querySelector('button');busy(b,true,'Submitting…');
  try{const r=await api('/account/dealer',{method:'POST',body:{business:f.biz.value,pan:f.pan.value,type:f.type.value,district:f.district.value,note:f.note.value}});setUser(r.user);refresh();toast('Application submitted')}
  catch(e){document.getElementById('dlErr').innerHTML=errBox(e.message);busy(b,false)}};
Views.quote=()=>{
  const list=db().quoteList.map(l=>({...l,p:prod(l.id)})).filter(l=>l.p);const u=db().user||{};
  return `${crumbs([['Business & quotes']])}<h1>Business, projects and quotes</h1>
  <p class="muted" style="max-width:70ch">Solar systems, online UPS, OLTs, network projects or a long list of items. Send it here and we reply with a PDF quotation within one working day.</p>
  <div class="two"><div class="stack">
    <section class="panel"><h3>Items to quote (${list.length})</h3>${list.length?list.map((l,i)=>`<div class="cline"><a class="pic" href="#p-${l.id}">${pic(l.p)}</a><div class="meta"><a href="#p-${l.id}">${esc(l.p.name)}</a><span class="small muted">${l.p.quote?'Price on quote':'List '+npr(unitPrice(l.p))+' each'}</span></div><div class="right"><input type="number" min="1" value="${l.qty}" data-c="qlset" data-i2="${i}" aria-label="Quantity" id="ql-${i}" style="width:80px"><button class="linkbtn" data-a="rmQ" data-i="${i}">Remove</button></div></div>`).join(''):'<p class="muted" style="padding-block:10px">No items yet. Use “Add to quote” on any product, or just describe the project below.</p>'}</section>
    <form class="panel stack" data-f="quote"><h3>Your details</h3><div class="form-grid">
      <label class="field"><span>Name</span><input type="text" name="name" id="qtName" value="${esc(u.name||'')}" required></label>
      <label class="field"><span>Organisation</span><input type="text" name="org" id="qtOrg"></label>
      <label class="field"><span>Mobile</span><input type="tel" name="phone" id="qtPhone" value="${esc(u.phone||'')}" required></label>
      <label class="field"><span>Email</span><input type="email" name="email" id="qtEmail" value="${esc(u.email||'')}"></label>
      <label class="field"><span>Project type</span><select name="type" id="qtType"><option>Home backup / solar</option><option>Office network</option><option>ISP supply</option><option>Online UPS / data room</option><option>Other</option></select></label>
      <label class="field"><span>Location</span><input type="text" name="loc" id="qtLoc" placeholder="City and area"></label>
      <label class="field full"><span>Requirements</span><textarea name="req" id="qtReq" rows="4" placeholder="Loads to back up, monthly electricity bill, users, floors, timeline, budget…"></textarea></label></div>
      <label class="check"><input type="checkbox" name="visit" id="qtVisit"> Request a site survey</label><div id="qtErr"></div><button class="btn buy" style="justify-self:start">Send quote request</button></form>
  </div><aside class="stack"><div class="panel stack"><h3>Dealer account</h3><p class="small muted">Installers, ISPs and resellers get dealer prices and credit.</p><a class="btn ghost" href="#dealer">Apply</a></div>
    <div class="panel stack"><h3>Talk to sales</h3><p class="small">Phone <b class="mono">${esc(D.COMPANY.phone)}</b><br>Email <b>${esc(D.COMPANY.email)}</b><br>${esc(D.COMPANY.hours)}</p></div>
    <div class="panel stack"><h3>Plan a system first</h3><p class="small muted">Use the System Builder to size inverter, batteries and panels, then send it for a quote.</p><a class="btn ghost" href="#builder">Open System Builder</a></div></aside></div>`;
};
C.qlset=el=>{db().quoteList[+el.dataset.i2].qty=Math.max(1,+el.value||1);Store.save()};
A.rmQ=el=>{db().quoteList.splice(+el.dataset.i,1);Store.save();refresh()};
F.quote=async f=>{const b=f.querySelector('button.buy');busy(b,true,'Sending…');
  try{
    const r=await api('/quotes',{method:'POST',body:{name:f.name.value,org:f.org.value,phone:f.phone.value,email:f.email.value,type:f.type.value,location:f.loc.value,requirements:f.req.value,siteVisit:f.visit.checked,items:db().quoteList.map(l=>({id:l.id,qty:l.qty}))}});
    const ph=f.phone.value.replace(/\D/g,''),visit=f.visit.checked;
    db().quoteList=[];Store.save();
    document.getElementById('app').innerHTML=`${crumbs([['Business & quotes','quote'],[r.no]])}<div class="panel stack" style="border-color:var(--good)"><span class="eyebrow" style="color:var(--good)">Request ${esc(r.no)}</span><h1>Quote request sent</h1><p>Our sales team will call ${esc(ph)} and email a PDF quotation within one working day${visit?', and schedule your site survey':''}.</p><div class="row"><a class="btn" href="/">Back to the store</a></div></div>`;UI.counts();window.scrollTo(0,0);
  }catch(e){document.getElementById('qtErr').innerHTML=errBox(e.message);busy(b,false)}};

/* ================= SYSTEM BUILDER ================= */
const APPL=[['Wi-Fi router + ONT',20,1,8],['LED bulb',9,6,4],['Ceiling fan',70,2,4],['LED TV 43"',80,1,3],['Laptop',65,1,4],['Desktop PC + monitor',200,0,4],['Refrigerator (small)',150,0,8],['CCTV, 8 cameras + NVR',80,0,10],['Water pump 0.5 HP',370,0,0.5],['Rice cooker',700,0,0.5]];
let BL=null;
function blInit(){if(!BL)BL={q:APPL.map(a=>a[2]),h:APPL.map(a=>a[3]),inv:null,bat:null,batQty:0,panel:null,panelQty:0,extras:new Set()}}
function blCalc(){
  const W=APPL.reduce((a,x,i)=>a+x[1]*BL.q[i],0), Wh=APPL.reduce((a,x,i)=>a+x[1]*BL.q[i]*BL.h[i],0);
  const inv=BL.inv&&prod(BL.inv), bat=BL.bat&&prod(BL.bat), pan=BL.panel&&prod(BL.panel);
  const out={W,Wh,inv,bat,pan,checks:[],series:0,strings:0,runtime:0,pvW:0,pvKwh:0};
  if(inv){
    if(inv.bld.w<W*1.25) out.checks.push(['bad',`${inv.model} is ${inv.bld.w} W; your load needs at least ${Math.ceil(W*1.25)} W with 25% headroom.`]);
    else out.checks.push(['ok',`Inverter ${inv.bld.w} W covers your ${W} W load with headroom.`]);
  } else out.checks.push(['warn','Choose an inverter.']);
  if(inv&&bat){
    const s=inv.bld.batV/bat.bld.v;
    if(!Number.isInteger(s)) out.checks.push(['bad',`${bat.bld.v} V batteries cannot make a ${inv.bld.batV} V bank.`]);
    else{
      out.series=s;
      const perString=s*bat.bld.wh*bat.bld.dod*.85;
      const need=Math.max(1,Math.ceil(Wh/perString));
      if(!BL.batQty||BL.batQty%s) BL.batQty=need*s;
      out.strings=BL.batQty/s;
      out.runtime=W?out.strings*perString/W:0;
      out.checks.push(['ok',`${s} batter${s>1?'ies':'y'} in series make ${inv.bld.batV} V; ${out.strings} string${out.strings>1?'s':''} in parallel.`]);
      const hrs=Wh&&W?Wh/W:0;
      out.checks.push([out.runtime>=hrs*0.95?'ok':'warn',`Estimated runtime at full load: ${out.runtime.toFixed(1)} h${hrs?` (you asked for about ${hrs.toFixed(1)} h at that load)`:''}.`]);
      if(!inv.bld.chem.includes(bat.bld.chem)) out.checks.push(['bad','This inverter has no charge profile for this battery type.']);
      if(bat.bld.chem==='lfp') out.checks.push(['ok','Set the inverter to its lithium (LiFePO4) charge profile at installation.']);
    }
  } else if(inv) out.checks.push(['warn','Choose a battery.']);
  if(inv&&inv.bld.type==='hybrid'&&pan){
    const maxS=Math.floor(inv.bld.pvMaxV/(pan.bld.voc*1.1)), minS=Math.ceil(inv.bld.pvMinV/pan.bld.vmp);
    if(!BL.panelQty) BL.panelQty=Math.max(minS,Math.min(maxS,Math.floor(inv.bld.pvMaxW/pan.bld.w)));
    const n=BL.panelQty; out.pvW=n*pan.bld.w; out.pvKwh=out.pvW*4.5*.8/1000;
    if(n<minS) out.checks.push(['bad',`Need at least ${minS} panels in series to reach the ${inv.bld.pvMinV} V MPPT start voltage.`]);
    else if(n>maxS) out.checks.push(['bad',`${n} panels in one string exceed ${inv.bld.pvMaxV} V on cold mornings. Maximum is ${maxS}.`]);
    else out.checks.push(['ok',`${n} panels in one string: about ${Math.round(n*pan.bld.voc)} V open-circuit, within ${inv.bld.pvMinV}–${inv.bld.pvMaxV} V.`]);
    if(out.pvW>inv.bld.pvMaxW*1.1) out.checks.push(['warn',`${out.pvW} W of panels is more than the ${inv.bld.pvMaxW} W PV input; output will be clipped.`]);
    out.checks.push(['ok',`Expected solar yield: about ${out.pvKwh.toFixed(1)} kWh/day (4.5 peak sun hours, 80% system efficiency).`]);
  }
  return out;
}
function blExtras(o){
  const ex=[];
  if(o.inv&&o.bat){ if(o.inv.bld.batV===12&&o.inv.bld.w<=2500) ex.push(['bc-25',1]); ex.push(['fu-125',1]) }
  if(o.inv&&o.inv.bld.type==='hybrid'&&o.pan){ex.push(['dcb-63',1],['spd-pv',1],['dc-4',1],['mt-4',Math.ceil(BL.panelQty/4)])}
  return ex;
}
function blItems(o){
  const it=[];if(o.inv)it.push([o.inv.id,1]);if(o.bat&&o.series)it.push([o.bat.id,BL.batQty]);if(o.pan&&o.inv?.bld.type==='hybrid')it.push([o.pan.id,BL.panelQty]);
  blExtras(o).forEach(([id,n])=>{if(BL.extras.has(id))it.push([id,n])});return it;
}
function bopt(p,sel,dis,why,act){return `<button class="bopt" data-a="${act}" data-id="${p.id}" aria-pressed="${sel}" ${dis?'disabled':''}><span class="pic">${pic(p)}</span><span class="stack" style="gap:3px"><span class="t">${esc(p.name)}</span><span class="s">${esc(keyspecs(p,2))}</span><span class="price small">${npr(unitPrice(p))}</span>${why?`<span class="small" style="color:var(--bad)">${esc(why)}</span>`:''}</span></button>`}
Views.builder=()=>{
  blInit(); const o=blCalc();
  const invs=db().products.filter(p=>p.bld&&p.bld.batV&&p.price);
  const bats=db().products.filter(p=>p.bld&&p.bld.ah);
  const pans=db().products.filter(p=>p.bld&&p.bld.voc);
  const items=blItems(o), total=items.reduce((a,[id,n])=>a+unitPrice(prod(id),n)*n,0);
  const ex=blExtras(o);
  return `${crumbs([['System Builder']])}<div><h1>System Builder</h1><p class="muted" style="max-width:72ch;margin-top:6px">Size a backup or solar system step by step. We check compatibility and runtime as you choose.</p></div>
  <div class="builder"><div class="stack" style="gap:26px">
   <section class="bstep panel"><header><span class="n">1</span><h2 style="font-size:20px">What needs to run during a cut?</h2></header>
    <div class="tbl-wrap"><table class="data"><thead><tr><th>Appliance</th><th>Watts</th><th>Qty</th><th>Hours</th></tr></thead><tbody>${APPL.map((a,i)=>`<tr><td>${esc(a[0])}</td><td class="mono">${a[1]}</td><td><input type="number" min="0" max="50" value="${BL.q[i]}" data-c="blq" data-i2="${i}" id="blq-${i}" aria-label="${esc(a[0])} quantity" style="width:70px"></td><td><input type="number" min="0" max="24" step="0.5" value="${BL.h[i]}" data-c="blh" data-i2="${i}" id="blh-${i}" aria-label="${esc(a[0])} hours" style="width:76px"></td></tr>`).join('')}</tbody></table></div>
    <div class="row"><span>Running load <b class="mono">${o.W} W</b></span><span>Energy per cut <b class="mono">${(o.Wh/1000).toFixed(2)} kWh</b></span></div></section>
   <section class="bstep panel"><header><span class="n">2</span><h2 style="font-size:20px">Choose an inverter</h2></header>
    <div class="bopts">${invs.map(p=>{const small=p.bld.w<o.W*1.25;return bopt(p,BL.inv===p.id,false,small?`Too small for ${o.W} W`:'', 'blInv')}).join('')}</div></section>
   <section class="bstep panel"><header><span class="n">3</span><h2 style="font-size:20px">Choose batteries</h2></header>
    ${o.inv?`<div class="bopts">${bats.map(p=>{const ok=Number.isInteger(o.inv.bld.batV/p.bld.v)&&o.inv.bld.chem.includes(p.bld.chem);return bopt(p,BL.bat===p.id,!ok,ok?'':`Not for a ${o.inv.bld.batV} V inverter`,'blBat')}).join('')}</div>
     ${o.bat&&o.series?`<div class="row"><span>Quantity</span><div class="qty"><button type="button" data-a="blBq" data-d="-1" aria-label="Fewer batteries">−</button><input type="number" readonly value="${BL.batQty}" aria-label="Battery quantity" id="blBatQty"><button type="button" data-a="blBq" data-d="1" aria-label="More batteries">+</button></div><span class="small muted">Changes in steps of ${o.series} (one series string)</span></div>`:''}`:'<p class="muted">Choose an inverter first.</p>'}</section>
   ${o.inv&&o.inv.bld.type==='hybrid'?`<section class="bstep panel"><header><span class="n">4</span><h2 style="font-size:20px">Add solar panels</h2></header>
    <div class="bopts">${pans.map(p=>bopt(p,BL.panel===p.id,false,'','blPan')).join('')}</div>
    ${o.pan?`<div class="row"><span>Panels</span><div class="qty"><button type="button" data-a="blPq" data-d="-1" aria-label="Fewer panels">−</button><input type="number" readonly value="${BL.panelQty}" aria-label="Panel quantity" id="blPanQty"><button type="button" data-a="blPq" data-d="1" aria-label="More panels">+</button></div><span class="small muted">${o.pvW} W of PV</span></div>`:''}</section>`:o.inv?`<section class="panel small muted">This inverter has no solar input. Choose a hybrid inverter to add panels.</section>`:''}
   ${ex.length?`<section class="bstep panel"><header><span class="n">${o.inv?.bld.type==='hybrid'?5:4}</span><h2 style="font-size:20px">Protection and cabling</h2></header><div class="stack">${ex.map(([id,n])=>{const p=prod(id);return `<label class="check"><input type="checkbox" data-c="blEx" value="${id}" ${BL.extras.has(id)?'checked':''}> ${n>1?n+' × ':''}${esc(p.name)} <span class="mono muted" style="margin-left:auto">${npr(unitPrice(p)*n)}</span></label>`}).join('')}<button class="linkbtn" style="justify-self:start" data-a="blAllEx">Select all recommended</button></div></section>`:''}
  </div>
  <aside class="panel stack" style="position:sticky;top:150px"><h3>Your system</h3>
    ${items.length?items.map(([id,n])=>{const p=prod(id);return `<div class="between small" style="flex-wrap:nowrap;align-items:flex-start"><span>${n} × ${esc(p.name)}</span><span class="mono">${npr(unitPrice(p,n)*n)}</span></div>`}).join(''):'<p class="small muted">Nothing selected yet.</p>'}
    <div class="summary"><div class="total"><span>Total</span><span class="mono">${npr(total)}</span></div></div>
    <div class="compat">${o.checks.map(([k,t])=>`<div class="${k}"><span>${k==='ok'?'✓':k==='bad'?'✕':'!'}</span><span>${esc(t)}</span></div>`).join('')}</div>
    <button class="btn buy block" data-a="blCart" ${items.length&&!o.checks.some(c=>c[0]==='bad')?'':'disabled'}>Add system to cart</button>
    <button class="btn ghost block" data-a="blQuote" ${items.length?'':'disabled'}>Send for installation quote</button>
    <button class="linkbtn" data-a="blReset">Start over</button>
    <p class="small muted">Estimates for planning. Our engineer confirms sizing before installation.</p></aside></div>`;
};
C.blq=el=>{BL.q[+el.dataset.i2]=Math.max(0,+el.value||0);BL.batQty=0;refresh()};
C.blh=el=>{BL.h[+el.dataset.i2]=Math.max(0,+el.value||0);BL.batQty=0;refresh()};
A.blInv=el=>{BL.inv=el.dataset.id;BL.bat=null;BL.batQty=0;BL.panelQty=0;BL.extras.clear();refresh()};
A.blBat=el=>{BL.bat=el.dataset.id;BL.batQty=0;refresh()};
A.blPan=el=>{BL.panel=el.dataset.id;BL.panelQty=0;refresh()};
A.blBq=el=>{const o=blCalc();BL.batQty=Math.max(o.series,BL.batQty+(+el.dataset.d)*o.series);refresh()};
A.blPq=el=>{BL.panelQty=Math.max(1,BL.panelQty+(+el.dataset.d));refresh()};
C.blEx=el=>{el.checked?BL.extras.add(el.value):BL.extras.delete(el.value);refresh()};
A.blAllEx=()=>{blExtras(blCalc()).forEach(([id])=>BL.extras.add(id));refresh()};
A.blReset=()=>{BL=null;refresh()};
A.blCart=()=>{blItems(blCalc()).forEach(([id,n])=>addToCart(id,n,null,true));toast('System added to cart');go('cart')};
A.blQuote=()=>{blItems(blCalc()).forEach(([id,n])=>addToQuote(id,n));go('quote')};

/* ================= GUIDES ================= */
function guideCard(g){return `<a class="gcard" href="#g-${g.id}"><span class="pic">${art(g.art)}</span><span class="body"><span class="eyebrow">${esc(g.kind)} · ${esc(g.tag)}</span><h3>${esc(g.title)}</h3><span class="gmeta"><span>${g.mins} min</span><span>${esc(g.level)}</span></span></span></a>`}
let gTag='';
Views.guides=()=>{const tags=[...new Set(D.GUIDES.map(g=>g.tag))];const list=D.GUIDES.filter(g=>!gTag||g.tag===gTag);
  return `${crumbs([['Guides']])}<h1>Guides and how-tos</h1><p class="muted" style="max-width:70ch">Step-by-step installs, sizing methods and buying advice from Technotri engineers.</p>
  <div class="chips"><button class="chip" data-a="gtag" data-t="" aria-pressed="${!gTag}">All</button>${tags.map(t=>`<button class="chip" data-a="gtag" data-t="${esc(t)}" aria-pressed="${gTag===t}">${esc(t)}</button>`).join('')}</div>
  <div class="ggrid">${list.map(guideCard).join('')}</div>`};
A.gtag=el=>{gTag=el.dataset.t;refresh()};
Views.g=id=>{
  const g=D.GUIDES.find(x=>x.id===id); if(!g) return Views.guides();
  const ps=g.products.map(prod).filter(Boolean);
  return `${crumbs([['Guides','guides'],[g.title]])}
  <div class="guide"><article class="prose"><span class="eyebrow">${esc(g.kind)} · ${esc(g.tag)}</span><h1>${esc(g.title)}</h1><div class="gmeta"><span>${g.mins} min</span><span>Difficulty: ${esc(g.level)}</span>${g.steps?`<span>${g.steps.length} steps</span>`:''}</div>
    <p>${esc(g.intro)}</p>
    ${g.tools?`<div class="panel tight"><b>You need</b><ul style="margin:6px 0 0;padding-left:18px">${g.tools.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>`:''}
    ${(g.sections||[]).map(s=>`<h2>${esc(s.h)}</h2>${(s.p||[]).map(x=>`<p>${esc(x)}</p>`).join('')}${s.table?`<div class="tbl-wrap"><table class="data"><thead><tr>${s.table[0].map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${s.table.slice(1).map(r=>`<tr>${r.map((x,i)=>i?`<td>${esc(x)}</td>`:`<th scope="row">${esc(x)}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}`).join('')}
    ${(g.steps||[]).map((s,i)=>`<div class="gstep"><span class="n">${i+1}</span><div class="stack" style="gap:8px"><h3>${esc(s.t)}</h3><p style="font-size:15px">${esc(s.p)}</p>${s.tip?`<div class="tip"><b>Tip:</b> ${esc(s.tip)}</div>`:''}${s.warn?`<div class="warnbox"><b>Caution:</b> ${esc(s.warn)}</div>`:''}</div></div>`).join('')}
  </article>
  <aside class="stack" style="position:sticky;top:150px"><h3>Products in this guide</h3>${ps.map(p=>`<div class="panel tight row" style="flex-wrap:nowrap"><a href="#p-${p.id}" style="width:70px;flex:none;background:var(--surface-2);border-radius:5px">${pic(p)}</a><div class="stack" style="gap:4px;min-width:0"><a href="#p-${p.id}" class="small" style="color:var(--ink);font-weight:600">${esc(p.name)}</a><span class="price small">${p.quote?'Quote':npr(unitPrice(p))}</span>${p.quote||p.stock<=0?'':`<button class="btn sm buy" data-a="add" data-id="${p.id}" style="justify-self:start">Add</button>`}</div></div>`).join('')}
   <div class="panel tight stack"><b>Prefer we do it?</b><span class="small muted">Our technicians install across Kathmandu Valley.</span><a class="btn sm ghost" href="#quote">Request installation</a></div></aside></div>`;
};
Views.lab=()=>`${crumbs([['Technotri Lab']])}<div class="guide"><article class="prose"><span class="eyebrow">Technotri Lab</span><h1>How we test</h1>
  <p>We run every product we score through the same bench tests, so a 8.5 on one inverter means the same as an 8.5 on another. Scores are out of 10 and only compare products in the same category.</p>
  <h2>Backup power</h2><p>Runtime is measured with a resistive load at 50% of rated power from full charge to cut-off. Switchover is timed with an oscilloscope on mains failure. Waveform quality is total harmonic distortion at 75% load.</p>
  <h2>Batteries</h2><p>Usable capacity is discharged at C10 to the manufacturer's cut-off. Cycle life uses the manufacturer's rating, checked against our 50-cycle fade test.</p>
  <h2>Wi-Fi</h2><p>Throughput and range are measured in a three-storey concrete house in Kathmandu: same room, one floor up, two floors up, with a 20-client load for the many-devices score.</p>
  <h2>Solar panels</h2><p>Output is measured at noon under clear sky and corrected to standard test conditions; heat tolerance is output at 60 °C panel temperature.</p>
  <div class="tip">Scores are sample values in this demo store. Live scores are published as each product is tested.</div></article>
  <aside class="stack"><h3>Highest scores</h3>${[...db().products].filter(p=>p.lab).sort((a,b)=>b.lab.score-a.lab.score).slice(0,5).map(p=>`<a class="panel tight row" style="flex-wrap:nowrap;color:var(--ink)" href="#p-${p.id}">${labBadge(p)}<span class="small">${esc(p.name)}</span></a>`).join('')}</aside></div>`;

/* ================= SUPPORT ================= */
const FAQ=[['How long does delivery take?','Kathmandu Valley: next working day for orders before 4 PM. Pokhara, Chitwan, Butwal, Biratnagar and Birgunj: about 3 working days. Other districts: about 5. We do not deliver on Saturdays.'],
 ['Do you give a VAT invoice?','Yes. Every order gets an electronic VAT invoice, including cash on delivery. Add your business PAN at checkout to have it printed on the invoice.'],
 ['Can I return a product?','Unused products in sealed packaging can be returned within 7 days of delivery. Batteries that have been filled with acid, cut cable and opened fibre connectors cannot be returned.'],
 ['How do warranty claims work?','Submit the form below with your order number and the product serial number. We inspect at our service desk in Kumaristhan; for batteries and inverters we can collect from you inside the Valley.'],
 ['Do you install?','Yes. Inverters, solar systems, networks and CCTV across Kathmandu Valley, and solar projects nationwide. Tick installation at checkout or request a quote.'],
 ['When do I get my refund?','Within 7 days of approving the return, by bank transfer or cash at our store.']];
Views.support=()=>`${crumbs([['Help & support']])}<h1>Help and support</h1>
  <div class="two"><div class="stack">
   <section class="panel faq"><h3>Frequently asked questions</h3>${FAQ.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
   <form class="panel stack" data-f="claim" id="warranty"><h3>Warranty or service request</h3><div class="form-grid">
    <label class="field"><span>Order number</span><input type="text" name="no" id="wcNo" placeholder="TT…"></label><label class="field"><span>Product serial number</span><input type="text" name="serial" id="wcSerial" required></label>
    <label class="field"><span>Name</span><input type="text" name="name" id="wcName" value="${esc(db().user?.name||'')}" required></label><label class="field"><span>Mobile</span><input type="tel" name="phone" id="wcPhone" value="${esc(db().user?.phone||'')}" required></label>
    <label class="field full"><span>What is wrong?</span><textarea name="issue" id="wcIssue" rows="3" required></textarea></label></div><div id="wcErr"></div><button class="btn buy">Submit request</button></form>
  </div><aside class="stack"><div class="panel stack"><h3>Contact</h3><p class="small">${esc(D.COMPANY.name)}<br>${esc(D.COMPANY.address)}</p><p class="small">Phone <b class="mono">${D.COMPANY.phone}</b> <button class="linkbtn" data-a="copy" data-t="${D.COMPANY.phone}">Copy</button><br>Email <b>${D.COMPANY.email}</b> <button class="linkbtn" data-a="copy" data-t="${D.COMPANY.email}">Copy</button></p><p class="small muted">${esc(D.COMPANY.hours)}</p></div>
   <div class="panel stack"><h3>Business details</h3><p class="small mono">PAN ${D.COMPANY.pan}<br>Company reg. ${D.COMPANY.reg}<br>E-commerce listing: ${esc(D.COMPANY.ecomListing)}</p></div>
   <a class="btn ghost" href="#track">Track an order</a></aside></div>`;
F.claim=async f=>{const ph=f.phone.value.replace(/\D/g,'');const box=document.getElementById('wcErr');
  if(!f.serial.value.trim()||!f.name.value.trim()||!/^9[678]\d{8}$/.test(ph)||!f.issue.value.trim()){box.innerHTML='<div class="alert err">Fill in serial number, name, a 10-digit mobile and the issue.</div>';return}
  const b=f.querySelector('button');busy(b,true,'Submitting…');
  try{const r=await api('/service-requests',{method:'POST',body:{order:f.no.value.trim(),serial:f.serial.value.trim(),name:f.name.value.trim(),phone:ph,issue:f.issue.value.trim()}});
    f.outerHTML=`<div class="panel stack" style="border-color:var(--good)"><h3>Request ${esc(r.no)} received</h3><p>We will call ${esc(ph)} within one working day.</p></div>`}
  catch(e){box.innerHTML=errBox(e.message);busy(b,false)}};

Views.notfound=()=>`${crumbs([['Not found']])}<div class="empty"><b>We couldn't find that page.</b><p class="muted">The link may be old, or the product may no longer be sold.</p><div class="row" style="justify-content:center"><a class="btn" href="#home">Go to the store</a><a class="btn ghost" href="#support">Get help</a></div></div>`;

Views.about=()=>`${crumbs([['About']])}<div class="guide"><article class="prose"><h1>About Technotri</h1><p>${esc(D.COMPANY.name)} is a Kathmandu technology company. Technotri Store supplies solar energy, backup power and connectivity equipment to homes, businesses, installers and internet service providers across Nepal, with installation and after-sales support from our own team.</p><p>We sell authorised stock with Nepal warranty, issue a VAT invoice for every order, and test the products we recommend in our own lab.</p></article><aside class="panel stack"><h3>Company</h3><p class="small">${esc(D.COMPANY.address)}<br>PAN ${D.COMPANY.pan}<br>Reg. ${D.COMPANY.reg}</p></aside></div>`;
})();
