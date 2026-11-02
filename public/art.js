/* Product illustrations drawn as inline SVG (no external images allowed / needed).
   art(kind, v) -> svg string. v = gallery angle: 0 front, 1 mirrored, 2 detail crop, 3 with dimension guide. */
(function(){
const B='var(--art-body)',D='var(--art-dark)',M='var(--art-mid)',L='var(--art-line)',G='var(--art-glow)',E='var(--art-led)',U='var(--art-blue)';
const r=(x,y,w,h,f,rx=4,s='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${s?`stroke="${s}" stroke-width="1.2"`:''}/>`;
const c=(x,y,rr,f,s='')=>`<circle cx="${x}" cy="${y}" r="${rr}" fill="${f}" ${s?`stroke="${s}" stroke-width="1.2"`:''}/>`;
const p=(d,f='none',s=L,w=1.6)=>`<path d="${d}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const shadow=`<ellipse cx="100" cy="136" rx="70" ry="5" fill="${L}" opacity=".18"/>`;
const leds=(x,y,n,gap=7)=>Array.from({length:n},(_,i)=>c(x+i*gap,y,2,i===0?E:i===1?G:M)).join('');
const K={
panel:()=>`<g transform="skewX(-8) translate(18 0)">${r(40,14,120,112,3,D,L)}${Array.from({length:6},(_,i)=>Array.from({length:4},(_,j)=>r(46+j*28.5,20+i*17.5,26,15.5,U,1)).join('')).join('')}</g>${p('M112 126 L112 136 M70 126 L66 136')}`,
inverter:()=>`${r(52,14,96,116,B,8,L)}${r(62,26,76,34,D,4)}<text x="100" y="47" text-anchor="middle" font-family="monospace" font-size="12" fill="${G}">230V 50Hz</text>${leds(68,72,4,9)}${r(62,84,76,4,M,2)}${r(62,92,76,4,M,2)}${r(62,100,76,4,M,2)}${c(126,72,5,M)}${r(70,118,60,8,D,2)}`,
hybrid:()=>`${r(46,10,108,122,B,8,L)}${r(58,22,84,30,D,4)}<text x="100" y="41" text-anchor="middle" font-family="monospace" font-size="11" fill="${G}">PV 3.2kW ☀</text>${p('M64 64 h20 M64 70 h14',`none`,L)}${leds(104,66,4,8)}${r(58,82,84,30,'none',4,L)}${Array.from({length:5},(_,i)=>c(68+i*16,97,4,D)).join('')}${r(66,120,68,6,M,2)}`,
ups:()=>`${r(66,12,68,118,D,8)}${r(74,22,52,22,B,3)}<text x="100" y="37" text-anchor="middle" font-family="monospace" font-size="10" fill="${D}">LINE 230</text>${c(100,62,9,'none',G)}${p('M100 55 v7',`none`,G,2)}${leds(88,82,3,12)}${Array.from({length:4},(_,i)=>r(76,94+i*7,48,3,M,1)).join('')}`,
rack:()=>`${r(36,30,128,72,D,6)}${r(44,40,46,22,B,3)}<text x="67" y="55" text-anchor="middle" font-family="monospace" font-size="9" fill="${D}">10 kVA</text>${leds(98,46,5,8)}${Array.from({length:3},(_,i)=>r(44,70+i*8,112,4,M,1)).join('')}${r(28,30,8,72,M,2)}${r(164,30,8,72,M,2)}`,
tubular:()=>`${r(58,20,84,108,B,6,L)}${r(66,10,14,12,D,2)}${r(120,10,14,12,D,2)}<text x="73" y="9" text-anchor="middle" font-size="9" fill="${L}">+</text><text x="127" y="9" text-anchor="middle" font-size="9" fill="${L}">–</text>${r(66,40,68,34,'none',3,L)}<text x="100" y="62" text-anchor="middle" font-family="monospace" font-size="12" fill="${L}">150Ah</text>${r(66,84,68,6,G,2)}${c(80,108,6,'none',L)}${c(100,108,6,'none',L)}${c(120,108,6,'none',L)}`,
lithium:()=>`${r(48,28,104,94,U,8)}${r(56,36,88,50,B,4)}<text x="100" y="58" text-anchor="middle" font-family="monospace" font-size="11" fill="${D}">LiFePO4</text><text x="100" y="74" text-anchor="middle" font-family="monospace" font-size="10" fill="${L}">12.8V 100Ah</text>${r(60,18,16,12,D,2)}${r(124,18,16,12,D,2)}${r(84,22,32,8,D,4)}${r(56,94,60,6,E,3)}${c(132,97,5,G)}`,
lirack:()=>`${r(30,40,140,62,D,6)}${r(40,50,70,22,B,3)}<text x="75" y="65" text-anchor="middle" font-family="monospace" font-size="10" fill="${D}">51.2V 5kWh</text>${r(40,80,70,8,E,2)}${leds(122,58,4,9)}${c(150,84,7,'none',G)}${r(22,40,8,62,M,2)}${r(170,40,8,62,M,2)}`,
station:()=>`${r(46,30,108,94,B,10,L)}${p('M64 30 v-12 h72 v12',`none`,L,3)}${r(56,42,50,30,D,4)}<text x="81" y="61" text-anchor="middle" font-family="monospace" font-size="11" fill="${G}">87%</text>${c(126,52,6,D)}${c(140,52,6,D)}${r(56,82,22,14,D,2)}${r(84,82,22,14,D,2)}${r(114,84,10,7,M,2)}${r(130,84,10,7,M,2)}${r(56,104,88,8,M,3)}`,
router:()=>`${p('M64 70 L56 14 M100 64 L100 10 M136 70 L144 14',`none`,D,4)}${r(36,66,128,40,D,10)}${leds(56,86,6,10)}${r(36,106,128,10,M,4)}${c(146,86,4,G)}`,
mesh:()=>`${r(42,34,40,86,B,16,L)}${r(118,34,40,86,B,16,L)}${r(80,48,40,72,B,16,L)}${c(62,104,3,E)}${c(100,104,3,E)}${c(138,104,3,E)}${p('M88 30 q12 -10 24 0 M92 36 q8 -6 16 0',`none`,G,2)}`,
lte:()=>`${p('M70 60 L66 18 M130 60 L134 18',`none`,D,4)}${r(40,56,120,56,B,10,L)}${r(52,68,40,10,D,3)}<text x="72" y="76" text-anchor="middle" font-family="monospace" font-size="8" fill="${G}">4G LTE</text>${leds(108,73,4,9)}${r(52,90,26,8,M,2)}${r(118,90,30,10,'none',2,L)}`,
switch:()=>`${r(20,52,160,46,D,5)}${Array.from({length:12},(_,i)=>r(30+(i%6)*15+(i>5?0:0),58+(i>5?16:0),12,10,B,1)).join('')}${Array.from({length:4},(_,i)=>r(130+(i%2)*18,58+(i>1?16:0),14,10,M,1)).join('')}${leds(32,92,8,6)}`,
switchSmall:()=>`${r(46,60,108,34,D,6)}${Array.from({length:8},(_,i)=>r(54+i*12,70,10,10,B,1)).join('')}${leds(56,86,5,8)}`,
ap:()=>`<ellipse cx="100" cy="76" rx="62" ry="40" fill="${B}" stroke="${L}" stroke-width="1.2"/><ellipse cx="100" cy="72" rx="44" ry="26" fill="none" stroke="${M}" stroke-width="1.2"/>${c(100,72,5,E)}${p('M100 116 v14',`none`,L,3)}`,
radio:()=>`${r(60,20,80,96,B,8,L)}${r(70,32,60,60,'none',30,M)}${c(100,62,14,'none',M)}${c(100,62,4,G)}${p('M100 116 v12 M76 128 h48',`none`,L,4)}${leds(84,104,3,16)}`,
ont:()=>`${r(40,46,120,62,B,8,L)}${r(52,58,96,14,D,3)}${leds(60,65,7,12)}${r(52,82,18,12,G,2)}<text x="61" y="104" text-anchor="middle" font-family="monospace" font-size="7" fill="${L}">PON</text>${Array.from({length:3},(_,i)=>r(80+i*20,82,16,12,D,2)).join('')}${p('M40 92 Q20 92 20 120',`none`,G,2.5)}`,
drum:()=>`${c(100,72,58,'none',L)}${c(100,72,50,G)}${Array.from({length:6},(_,i)=>`<circle cx="100" cy="72" r="${46-i*5}" fill="none" stroke="${D}" stroke-width=".6" opacity=".5"/>`).join('')}${c(100,72,16,B,L)}${c(100,72,6,D)}${p('M146 104 Q170 120 186 112',`none`,D,3)}`,
splitter:()=>`${r(52,40,96,70,B,6,L)}<text x="100" y="80" text-anchor="middle" font-family="monospace" font-size="12" fill="${L}">1 × 8</text>${p('M20 75 H52',`none`,G,3)}${Array.from({length:8},(_,i)=>p(`M148 ${48+i*8} H178`,`none`,i%2?U:G,2)).join('')}`,
connector:()=>`${Array.from({length:3},(_,i)=>`<g transform="translate(${i*36-36} ${i*10-10}) rotate(-20 100 75)">${r(70,62,60,24,U,3)}${r(130,68,14,12,B,2)}${p('M30 74 H70',`none`,G,3)}</g>`).join('')}`,
sfp:()=>`<g transform="rotate(-12 100 75)">${r(30,56,120,36,M,3)}${r(150,58,22,32,D,3)}${c(160,66,3,B)}${c(160,82,3,B)}${r(36,62,70,24,B,2)}<text x="71" y="78" text-anchor="middle" font-family="monospace" font-size="9" fill="${D}">1.25G 20km</text>${p('M30 74 h-14',`none`,G,2)}</g>`,
olt:()=>`${r(20,46,160,58,D,5)}${Array.from({length:8},(_,i)=>r(28+i*14,56,11,14,G,2)).join('')}${Array.from({length:4},(_,i)=>r(28+i*14,78,11,12,B,1)).join('')}${Array.from({length:4},(_,i)=>r(96+i*16,78,13,12,M,1)).join('')}${leds(150,60,3,8)}`,
cable:()=>`${r(56,24,88,102,B,4,L)}${p('M56 50 H144 M56 100 H144',`none`,L,1)}<text x="100" y="80" text-anchor="middle" font-family="monospace" font-size="14" fill="${U}">CAT6</text><text x="100" y="94" text-anchor="middle" font-family="monospace" font-size="9" fill="${L}">305 m</text>${p('M144 40 Q168 40 170 64 Q172 90 186 92',`none`,U,3)}`,
dccable:()=>`${c(84,78,40,'none',L)}${c(84,78,32,'#B3261E')}${c(84,78,12,B,L)}${c(122,82,30,'none',L)}${c(122,82,24,D)}${c(122,82,9,B,L)}`,
wallrack:()=>`${r(52,16,96,118,D,6)}${r(60,24,80,100,U,3)}${r(60,24,80,100,'none',3,M)}${Array.from({length:5},(_,i)=>r(66,32+i*18,68,10,B,1)).join('')}${c(134,72,3,G)}`,
breaker:()=>`${r(66,22,68,106,B,6,L)}${r(66,48,68,52,M,0)}${r(80,58,16,30,D,3)}${r(104,58,16,30,D,3)}${r(78,54,44,8,G,2)}<text x="100" y="42" text-anchor="middle" font-family="monospace" font-size="10" fill="${L}">C63 DC</text>`,
surge:()=>`<g transform="rotate(-10 100 80)">${r(24,62,152,34,B,8,L)}${Array.from({length:6},(_,i)=>r(36+i*22,70,16,18,D,3)).join('')}${c(166,79,6,'#B3261E')}</g>${p('M28 98 Q12 120 30 132',`none`,L,3)}`,
controller:()=>`${r(52,22,96,108,B,8,L)}${r(62,32,76,30,D,4)}<text x="100" y="51" text-anchor="middle" font-family="monospace" font-size="11" fill="${G}">MPPT 60A</text>${Array.from({length:6},(_,i)=>r(62+i*13,104,10,14,D,2)).join('')}${leds(70,76,3,10)}${Array.from({length:3},(_,i)=>r(108,72+i*7,28,3,M,1)).join('')}`,
mount:()=>`${p('M30 120 L170 120 M50 120 L120 40 L150 120 M120 40 L120 120 M80 120 L100 64',`none`,M,5)}${p('M40 50 L160 30',`none`,L,4)}`,
light:()=>`${r(60,28,80,50,D,4)}${Array.from({length:4},(_,i)=>r(66+i*18,34,14,38,U,1)).join('')}${r(94,78,12,14,M,2)}${r(70,92,60,26,B,6,L)}${c(100,105,8,G)}`,
kit:()=>`${r(26,54,58,70,B,6,L)}${r(98,38,76,86,D,8)}${r(108,48,56,22,B,3)}${c(46,40,6,G)}${p('M84 90 H98',`none`,G,3)}`,
};
const KIND_ALIASES={};
function art(kind,v=0){
  const fn=K[kind]||K.kit;
  let vb='0 0 200 150',inner=shadow+fn(),extra='';
  if(v===1) inner=`<g transform="translate(200 0) scale(-1 1)">${inner}</g>`;
  if(v===2) vb='45 25 110 82';
  if(v===3) extra=`${p('M20 140 H180',`none`,G,1)}${p('M20 136 v8 M180 136 v8',`none`,G,1)}<text x="100" y="148" text-anchor="middle" font-family="monospace" font-size="8" fill="${L}">scale guide</text>`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${inner}${extra}</svg>`;
}
window.TTArt=art;
})();
