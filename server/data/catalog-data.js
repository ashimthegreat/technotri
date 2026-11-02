/* Technotri Store — sample catalog. Brands, models, prices and stock are SAMPLE data
   for the demo store; replace with the live catalog before launch. */
(function(){
const COMPANY={
  name:'Technotri Pvt. Ltd.', store:'Technotri', domain:'technotri.com.np',
  address:'Ward 16, Kumaristhan, Kathmandu Metropolitan City, Kathmandu, Nepal',
  phone:'+977 9820150965', email:'info@technotri.com.np',
  pan:'610507830', reg:'313205/79/080', ecomListing:'To be added after Department of Commerce listing',
  hours:'Sun–Fri 10:00–18:00, Sat closed'
};
const CATS=[
 {id:'solar',pillar:'energy',name:'Solar Energy',art:'panel',blurb:'Panels, hybrid inverters, MPPT controllers and mounting',
  subs:['Solar panels','Hybrid inverters','On-grid inverters','Charge controllers','Mounting','Solar lights','Solar systems'],
  facets:['Power','Cell type','Battery voltage','Phase','Type'],dealer:.10},
 {id:'backup',pillar:'power',name:'Backup Power',art:'ups',blurb:'Router UPS, UPS, inverters, lithium and tubular batteries',
  subs:['Router UPS','Line-interactive UPS','Online UPS','Home inverters','Lead-acid batteries','Lithium batteries','Power stations'],
  facets:['Capacity','Battery voltage','Chemistry','Waveform','Topology'],dealer:.12},
 {id:'connect',pillar:'net',name:'Connectivity',art:'router',blurb:'Wi-Fi 6/7 routers, mesh, 4G, switches and access points',
  subs:['Wi-Fi routers','Mesh Wi-Fi','4G routers','Switches','PoE switches','Access points','Outdoor wireless'],
  facets:['Wi-Fi standard','Speed class','Ports','PoE','Management'],dealer:.10},
 {id:'ftth',pillar:'net',name:'ISP & FTTH',art:'ont',blurb:'ONT/ONU, OLT, drop cable, splitters, connectors and SFPs',
  subs:['ONT / ONU','OLT','Drop cable','Splitters','Connectors & patch cords','SFP modules','Fibre tools'],
  facets:['PON type','Connector','Ratio','Rate','Length'],dealer:.15},
 {id:'parts',pillar:'',name:'Parts & Accessories',art:'cable',blurb:'Network cable, racks, breakers, surge protection, battery cable',
  subs:['Network cable','Racks & cabinets','Breakers & fuses','Surge protection','Battery & DC cable'],
  facets:['Type','Rating','Length'],dealer:.15}
];
// helper: compact product constructor
const P=[];
function add(o){o.mrp=o.mrp||o.price;o.tags=o.tags||[];o.stock=o.stock??25;P.push(o)}

/* ---------------- SOLAR ---------------- */
add({id:'sp-550',cat:'solar',sub:'Solar panels',brand:'Sunvara',model:'SV-550M',name:'Sunvara 550 W Mono PERC Half-Cell Solar Panel',art:'panel',price:15500,mrp:17200,stock:140,tags:['best'],
 hl:['144 half-cut mono PERC cells, 21.3% module efficiency','Lower hot-spot risk and better output in partial shade','12-year product and 25-year linear output warranty'],
 specs:{'Power':'550 W','Cell type':'Mono PERC half-cell','Efficiency':'21.3%','Voc':'49.6 V','Vmp':'41.7 V','Isc':'14.0 A','Dimensions':'2278 × 1134 × 35 mm','Weight':'27.5 kg','Type':'Panel'},
 bld:{w:550,voc:49.6,vmp:41.7},rating:[4.7,86],warranty:'12 years product',
 lab:{score:8.7,m:{'Output vs rating':9.0,'Heat tolerance':8.2,'Shade tolerance':8.6,'Build quality':8.9},good:['Rooftop homes with limited space','Hybrid systems 3 kW and up'],bad:['Small DIY systems on 12 V controllers']},breaks:[[1,15500],[10,14900],[30,14400]],fbt:['mt-4','dc-4','sc-60']});
add({id:'sp-410',cat:'solar',sub:'Solar panels',brand:'Sunvara',model:'SV-410M',name:'Sunvara 410 W Mono PERC Solar Panel',art:'panel',price:11800,mrp:12500,stock:86,
 hl:['Compact 108 half-cell format for tight roofs','Good match for 24 V MPPT systems'],
 specs:{'Power':'410 W','Cell type':'Mono PERC half-cell','Efficiency':'21.0%','Voc':'37.4 V','Vmp':'31.2 V','Isc':'13.9 A','Dimensions':'1722 × 1134 × 30 mm','Weight':'21 kg','Type':'Panel'},
 bld:{w:410,voc:37.4,vmp:31.2},rating:[4.6,41],warranty:'12 years product',breaks:[[1,11800],[10,11400],[30,11000]],
 lab:{score:8.4,m:{'Output vs rating':8.7,'Heat tolerance':8.0,'Shade tolerance':8.4,'Build quality':8.5},good:['Smaller rooftops'],bad:['Large commercial arrays']}});
add({id:'sp-180',cat:'solar',sub:'Solar panels',brand:'Sunvara',model:'SV-180P',name:'Sunvara 180 W Poly Solar Panel for 12 V systems',art:'panel',price:6200,stock:44,
 hl:['Charges 12 V batteries through PWM or MPPT controllers','Light enough for a single installer'],
 specs:{'Power':'180 W','Cell type':'Polycrystalline','Efficiency':'17.6%','Voc':'22.5 V','Vmp':'18.6 V','Isc':'10.5 A','Dimensions':'1480 × 680 × 35 mm','Weight':'11.5 kg','Type':'Panel'},
 bld:{w:180,voc:22.5,vmp:18.6},rating:[4.3,29],warranty:'5 years product'});
add({id:'hi-36',cat:'solar',sub:'Hybrid inverters',brand:'Helix Solar',model:'HX-3K6-24',name:'Helix 3.6 kW Hybrid Solar Inverter, 24 V, 120 A MPPT',art:'hybrid',price:68000,mrp:74000,stock:18,tags:['best'],
 hl:['Solar, grid and battery in one box with automatic priority','120 A MPPT, 60–450 V DC PV input','Works with lead-acid and LiFePO4 (programmable charge profile)'],
 specs:{'Power':'3.6 kW','Battery voltage':'24 V','PV input':'60–450 V DC, max 4000 W','MPPT current':'120 A','Waveform':'Pure sine wave','Transfer time':'10 ms','Phase':'Single phase','Type':'Hybrid off-grid'},
 bld:{type:'hybrid',va:3600,w:3600,batV:24,pvMaxV:450,pvMinV:60,pvMaxW:4000,chem:['lead','lfp']},rating:[4.5,57],warranty:'2 years',serv:7.5,
 lab:{score:8.3,m:{'Conversion efficiency':8.6,'Switchover time':7.8,'Noise':7.4,'Overload handling':8.2,'App and display':7.9},good:['Homes with 2–3 kW of loads','Mixed solar + grid backup'],bad:['Air conditioners or motors above 2 kW']},fbt:['lb-24100','sp-550','dc-4']});
add({id:'hi-62',cat:'solar',sub:'Hybrid inverters',brand:'Helix Solar',model:'HX-6K2-48',name:'Helix 6.2 kW Hybrid Solar Inverter, 48 V, dual MPPT',art:'hybrid',price:118000,mrp:128000,stock:6,
 hl:['Dual MPPT for two roof orientations','Parallel up to 6 units','Battery communication over CAN/RS485 with rack lithium'],
 specs:{'Power':'6.2 kW','Battery voltage':'48 V','PV input':'120–500 V DC, max 6500 W','MPPT current':'2 × 60 A','Waveform':'Pure sine wave','Transfer time':'10 ms','Phase':'Single phase','Type':'Hybrid off-grid'},
 bld:{type:'hybrid',va:6200,w:6200,batV:48,pvMaxV:500,pvMinV:120,pvMaxW:6500,chem:['lead','lfp']},rating:[4.6,23],warranty:'2 years',serv:8,
 lab:{score:8.8,m:{'Conversion efficiency':9.0,'Switchover time':8.4,'Noise':7.8,'Overload handling':9.1,'App and display':8.6},good:['Larger homes and small offices','Systems that will grow'],bad:['Small 1–2 kW loads']}});
add({id:'og-10',cat:'solar',sub:'On-grid inverters',brand:'Helix Solar',model:'HX-G10K-3P',name:'Helix 10 kW On-Grid Inverter, three phase',art:'inverter',price:null,quote:true,stock:4,
 hl:['For net-metering connections approved by NEA','Two MPPT, 98.4% max efficiency','Wi-Fi monitoring'],
 specs:{'Power':'10 kW','Phase':'Three phase','Max efficiency':'98.4%','MPPT':'2','PV input':'160–1000 V DC','Type':'On-grid'},rating:[4.7,8],warranty:'5 years'});
add({id:'sc-60',cat:'solar',sub:'Charge controllers',brand:'Helix Solar',model:'HX-MP60',name:'Helix 60 A MPPT Solar Charge Controller, 12/24/48 V',art:'controller',price:14500,mrp:15800,stock:31,
 hl:['Auto-detects 12, 24 or 48 V battery banks','Up to 150 V PV input','LiFePO4 and lead-acid profiles'],
 specs:{'Rated current':'60 A','Battery voltage':'12/24/48 V auto','PV input':'Up to 150 V DC','Efficiency':'Up to 98%','Type':'MPPT'},rating:[4.4,34],warranty:'1 year'});
add({id:'sc-30p',cat:'solar',sub:'Charge controllers',brand:'Linkset',model:'LS-PWM30',name:'Linkset 30 A PWM Solar Charge Controller with USB',art:'controller',price:2400,stock:60,
 hl:['Simple 12/24 V controller for small panels','Dual USB outputs'],specs:{'Rated current':'30 A','Battery voltage':'12/24 V','PV input':'Up to 50 V DC','Type':'PWM'},rating:[4.0,52],warranty:'1 year'});
add({id:'mt-4',cat:'solar',sub:'Mounting',brand:'Linkset',model:'LS-RM4',name:'Rooftop Mounting Kit for 4 Panels, aluminium, 15–30° tilt',art:'mount',price:12800,stock:22,
 hl:['Anodised aluminium rails and stainless fasteners','Fits 72 and 144-cell panels on RCC flat roofs'],specs:{'Type':'Rooftop tilt kit','Panels':'4','Tilt':'15–30°','Material':'Anodised aluminium'},rating:[4.5,19],warranty:'5 years'});
add({id:'sl-60',cat:'solar',sub:'Solar lights',brand:'Sunvara',model:'SV-SL60',name:'Sunvara 60 W All-in-One Solar Street Light with motion sensor',art:'light',price:7900,mrp:9500,stock:48,tags:['deal'],
 hl:['Built-in LiFePO4 battery and panel','Dusk-to-dawn with motion boost'],specs:{'Power':'60 W','Battery':'LiFePO4 built-in','Type':'All-in-one street light','IP rating':'IP65'},rating:[4.2,63],warranty:'2 years'});
add({id:'ss-3k',cat:'solar',sub:'Solar systems',brand:'Technotri',model:'TT-SYS-3K',name:'3 kW Home Solar Hybrid System (survey + install)',art:'kit',price:null,quote:true,stock:99,
 hl:['Sized after a site survey','Includes panels, hybrid inverter, battery, structure, protection and installation'],specs:{'Power':'3 kW','Type':'Hybrid system','Battery voltage':'24 V or 48 V'},rating:[4.8,12],warranty:'Per component'});
add({id:'ss-10k',cat:'solar',sub:'Solar systems',brand:'Technotri',model:'TT-SYS-10G',name:'10 kW On-Grid Solar System for net metering',art:'kit',price:null,quote:true,stock:99,
 hl:['Designed for NEA net-metering','Survey, design, installation and paperwork support'],specs:{'Power':'10 kW','Type':'On-grid system','Phase':'Three phase'},rating:[4.9,5],warranty:'Per component'});

/* ---------------- BACKUP ---------------- */
add({id:'mu-10',cat:'backup',sub:'Router UPS',brand:'VoltEdge',model:'VE-MU10',name:'VoltEdge Mini DC UPS for Router & ONT, 12 V/9 V/5 V, 10,400 mAh',art:'ups',price:3200,mrp:3900,stock:320,tags:['best','deal'],
 hl:['Keeps router and ONT online for about 4–6 hours','12 V, 9 V and USB 5 V outputs at the same time','Zero-switchover DC output, no reboot when power cuts'],
 specs:{'Capacity':'38 Wh','Outputs':'12 V 2 A, 9 V 1 A, 5 V USB','Battery voltage':'DC 12 V','Chemistry':'Li-ion 18650','Topology':'DC online','Runtime':'4–6 h router + ONT'},rating:[4.6,412],warranty:'1 year',serv:5,
 lab:{score:8.5,m:{'Runtime':8.4,'Switchover':9.8,'Heat':8.0,'Build quality':7.8},good:['Every fibre internet home','Small offices on one router'],bad:['Routers above 2 A at 12 V']},fbt:['sg-6','c6-pc']});
add({id:'mu-20',cat:'backup',sub:'Router UPS',brand:'VoltEdge',model:'VE-MU20',name:'VoltEdge Mini DC UPS Pro, 20,000 mAh, PoE 24 V',art:'ups',price:5600,stock:96,tags:['new'],
 hl:['Up to 10 hours for router + ONT','Passive PoE 24 V output for outdoor radios'],specs:{'Capacity':'74 Wh','Outputs':'12 V, 9 V, 24 V PoE, 5 V USB','Battery voltage':'DC 12 V','Chemistry':'Li-ion 18650','Topology':'DC online','Runtime':'8–10 h router + ONT'},rating:[4.7,88],warranty:'1 year'});
add({id:'ups-1k',cat:'backup',sub:'Line-interactive UPS',brand:'VoltEdge',model:'VE-LI1000',name:'VoltEdge 1000 VA Line-Interactive UPS, AVR',art:'ups',price:11500,mrp:12800,stock:58,
 hl:['600 W for a desktop PC, monitor and router','Automatic voltage regulation for low-voltage areas','4 universal sockets'],
 specs:{'Capacity':'1000 VA / 600 W','Battery voltage':'2 × 12 V 7 Ah','Waveform':'Simulated sine','Topology':'Line-interactive','Transfer time':'2–6 ms'},rating:[4.3,140],warranty:'2 years',serv:6,
 lab:{score:7.6,m:{'Runtime':6.8,'Switchover':8.6,'Waveform quality':6.5,'Noise':8.0,'AVR range':8.1},good:['Office desks and POS counters'],bad:['Long outages','Sensitive motor loads']}});
add({id:'ups-2k',cat:'backup',sub:'Line-interactive UPS',brand:'VoltEdge',model:'VE-LI2000S',name:'VoltEdge 2000 VA Line-Interactive UPS, pure sine wave',art:'ups',price:26500,stock:24,
 hl:['Pure sine output safe for active-PFC power supplies','LCD with load and battery level'],specs:{'Capacity':'2000 VA / 1400 W','Battery voltage':'2 × 12 V 9 Ah','Waveform':'Pure sine wave','Topology':'Line-interactive','Transfer time':'4 ms'},rating:[4.5,46],warranty:'2 years'});
add({id:'ou-3k',cat:'backup',sub:'Online UPS',brand:'VoltEdge',model:'VE-ON3K',name:'VoltEdge 3 kVA Online UPS, double conversion, tower',art:'ups',price:72000,mrp:79000,stock:7,
 hl:['Zero transfer time for servers and medical equipment','External 72 V battery bank for long runtime','SNMP slot for network monitoring'],
 specs:{'Capacity':'3000 VA / 2700 W','Battery voltage':'72 V external','Waveform':'Pure sine wave','Topology':'Online double conversion','Transfer time':'0 ms'},rating:[4.7,31],warranty:'2 years',serv:8.5,
 lab:{score:9.0,m:{'Output stability':9.6,'Switchover':10,'Efficiency':8.4,'Noise':7.0,'Monitoring':9.0},good:['Server rooms','Labs and clinics'],bad:['Quiet home offices (fan noise)']}});
add({id:'ou-10k',cat:'backup',sub:'Online UPS',brand:'VoltEdge',model:'VE-ON10K',name:'VoltEdge 10 kVA Online UPS, rack/tower convertible',art:'rack',price:null,quote:true,stock:2,
 hl:['Battery bank sized to your runtime','Installation and load study included in quote'],specs:{'Capacity':'10 kVA / 10 kW','Battery voltage':'192–240 V external','Waveform':'Pure sine wave','Topology':'Online double conversion','Transfer time':'0 ms'},rating:[4.8,9],warranty:'2 years'});
add({id:'inv-11',cat:'backup',sub:'Home inverters',brand:'VoltEdge',model:'VE-HI1100',name:'VoltEdge 1100 VA Pure Sine Wave Home Inverter, 12 V',art:'inverter',price:16500,mrp:18500,stock:64,tags:['best'],
 hl:['Runs lights, fans, TV and Wi-Fi through load shedding','Pure sine wave: quiet fans, safe for laptops','Charges one 12 V battery at up to 15 A'],
 specs:{'Capacity':'1100 VA / 880 W','Battery voltage':'12 V','Waveform':'Pure sine wave','Topology':'Inverter','Transfer time':'10 ms'},
 bld:{type:'inverter',va:1100,w:880,batV:12,chem:['lead','lfp']},rating:[4.5,233],warranty:'2 years',serv:7,
 lab:{score:8.1,m:{'Waveform quality':8.8,'Switchover':7.9,'Charging':7.6,'Noise':8.4,'Overload handling':7.5},good:['2–3 BHK flats','Homes with 300–600 W of backup load'],bad:['Water pumps and refrigerators together']},fbt:['tb-150','bc-25','sg-6']});
add({id:'inv-25',cat:'backup',sub:'Home inverters',brand:'VoltEdge',model:'VE-HI2500',name:'VoltEdge 2500 VA Pure Sine Wave Inverter, 24 V',art:'inverter',price:34500,stock:21,
 hl:['2000 W for bigger homes and shops','Runs on two 12 V batteries in series'],specs:{'Capacity':'2500 VA / 2000 W','Battery voltage':'24 V','Waveform':'Pure sine wave','Topology':'Inverter','Transfer time':'10 ms'},
 bld:{type:'inverter',va:2500,w:2000,batV:24,chem:['lead','lfp']},rating:[4.4,77],warranty:'2 years',serv:7,
 lab:{score:8.0,m:{'Waveform quality':8.6,'Switchover':7.8,'Charging':8.0,'Noise':7.6,'Overload handling':8.2},good:['Shops and larger homes'],bad:['Single small battery setups']}});
add({id:'tb-150',cat:'backup',sub:'Lead-acid batteries',brand:'Tubestar',model:'TS-150TT',name:'Tubestar 150 Ah Tall Tubular Inverter Battery, 12 V',art:'tubular',price:24500,mrp:26000,stock:70,tags:['best'],
 hl:['Tall tubular plates for deep daily cycling','36-month warranty (18 full + 18 pro-rata)','Low maintenance: top up distilled water every 3–4 months'],
 specs:{'Capacity':'150 Ah @ C20','Battery voltage':'12 V','Chemistry':'Lead-acid tall tubular','Energy':'1.8 kWh','Weight':'55 kg filled'},
 bld:{v:12,ah:150,chem:'lead',wh:1800,dod:.5},rating:[4.4,301],warranty:'36 months',serv:3,
 lab:{score:7.4,m:{'Usable capacity':6.5,'Cycle life':7.0,'Weight per kWh':4.0,'Value':9.2},good:['Budget home backup','Daily 2–4 h outages'],bad:['Daily solar cycling','Upper floors without a lift']}});
add({id:'tb-200',cat:'backup',sub:'Lead-acid batteries',brand:'Tubestar',model:'TS-200TT',name:'Tubestar 200 Ah Tall Tubular Battery, 12 V',art:'tubular',price:30500,stock:38,
 hl:['More runtime on one battery','For 1500 VA and larger inverters'],specs:{'Capacity':'200 Ah @ C20','Battery voltage':'12 V','Chemistry':'Lead-acid tall tubular','Energy':'2.4 kWh','Weight':'64 kg filled'},
 bld:{v:12,ah:200,chem:'lead',wh:2400,dod:.5},rating:[4.3,96],warranty:'36 months'});
add({id:'lb-12100',cat:'backup',sub:'Lithium batteries',brand:'Lithon',model:'LT-12100',name:'Lithon LiFePO4 Battery 12.8 V 100 Ah with Bluetooth BMS',art:'lithium',price:48000,mrp:52000,stock:44,tags:['best'],
 hl:['4000+ cycles at 80% depth of discharge','One fifth the weight of lead-acid for the same usable energy','Bluetooth app shows charge, cell voltage and temperature'],
 specs:{'Capacity':'100 Ah','Battery voltage':'12.8 V','Chemistry':'LiFePO4','Energy':'1.28 kWh','Weight':'11.5 kg','Cycle life':'4000+ @ 80% DoD'},
 bld:{v:12,ah:100,chem:'lfp',wh:1280,dod:.9},rating:[4.8,128],warranty:'5 years',serv:6,
 lab:{score:9.1,m:{'Usable capacity':9.4,'Cycle life':9.5,'Weight per kWh':9.6,'BMS protection':8.8,'Value':7.4},good:['Daily solar cycling','Upper-floor flats'],bad:['Lowest upfront cost']},fbt:['inv-11','bc-25','fu-125']});
add({id:'lb-24100',cat:'backup',sub:'Lithium batteries',brand:'Lithon',model:'LT-24100',name:'Lithon LiFePO4 Battery 25.6 V 100 Ah',art:'lithium',price:92000,stock:15,
 hl:['One battery for 24 V inverters','2.56 kWh in a 22 kg case'],specs:{'Capacity':'100 Ah','Battery voltage':'25.6 V','Chemistry':'LiFePO4','Energy':'2.56 kWh','Weight':'22 kg','Cycle life':'4000+ @ 80% DoD'},
 bld:{v:24,ah:100,chem:'lfp',wh:2560,dod:.9},rating:[4.7,37],warranty:'5 years'});
add({id:'lb-48100',cat:'backup',sub:'Lithium batteries',brand:'Lithon',model:'LT-48100R',name:'Lithon 51.2 V 100 Ah Rack LiFePO4 Battery, 5.12 kWh',art:'lirack',price:165000,mrp:178000,stock:5,
 hl:['3U rack module, stack up to 8','CAN/RS485 communication with hybrid inverters','6-year warranty'],specs:{'Capacity':'100 Ah','Battery voltage':'51.2 V','Chemistry':'LiFePO4','Energy':'5.12 kWh','Weight':'45 kg','Cycle life':'6000 @ 80% DoD'},
 bld:{v:48,ah:100,chem:'lfp',wh:5120,dod:.9},rating:[4.8,19],warranty:'6 years',
 lab:{score:9.3,m:{'Usable capacity':9.5,'Cycle life':9.7,'Weight per kWh':9.0,'BMS protection':9.4,'Value':8.0},good:['6 kW hybrid systems','Offices and clinics'],bad:['12 V or 24 V inverters']}});
add({id:'ps-1k',cat:'backup',sub:'Power stations',brand:'VoltEdge',model:'VE-PS1000',name:'VoltEdge 1 kWh Portable Power Station, LiFePO4, 1200 W',art:'station',price:98000,mrp:112000,stock:12,tags:['deal'],
 hl:['Plug-and-play backup, no installation','Charges from wall, car or up to 500 W solar','4 AC sockets, USB-C 100 W'],
 specs:{'Capacity':'1024 Wh','Battery voltage':'Built-in','Chemistry':'LiFePO4','Waveform':'Pure sine wave','Output':'1200 W (2400 W surge)','Weight':'13 kg'},rating:[4.6,54],warranty:'2 years',
 lab:{score:8.6,m:{'Usable capacity':8.8,'Charging speed':9.0,'Portability':7.8,'Noise':8.4,'Port selection':8.9},good:['Rented flats','Site work and camping'],bad:['Whole-home backup']}});

/* ---------------- CONNECTIVITY ---------------- */
add({id:'rt-ax3',cat:'connect',sub:'Wi-Fi routers',brand:'NetLoop',model:'NL-AX3000',name:'NetLoop AX3000 Wi-Fi 6 Dual-Band Gigabit Router',art:'router',price:9800,mrp:11500,stock:110,tags:['best'],
 hl:['Wi-Fi 6 with OFDMA for many devices at once','4 gigabit LAN ports','Joins NetLoop mesh units later'],
 specs:{'Wi-Fi standard':'Wi-Fi 6 (802.11ax)','Speed class':'AX3000','Ports':'4 × GbE LAN, 1 × GbE WAN','Band':'Dual band','Mesh':'Yes','PoE':'No','Management':'App + web'},rating:[4.5,264],warranty:'2 years',
 lab:{score:8.2,m:{'Throughput':8.6,'Range':7.8,'Many devices':8.4,'Setup ease':8.8,'Parental controls':7.2},good:['Flats up to 3 BHK','Families with 20+ devices'],bad:['Multi-storey houses on one unit']},fbt:['mu-10','c6-pc']});
add({id:'rt-be5',cat:'connect',sub:'Wi-Fi routers',brand:'NetLoop',model:'NL-BE5000',name:'NetLoop BE5000 Wi-Fi 7 Router with 2.5G ports',art:'router',price:24500,stock:20,tags:['new'],
 hl:['Wi-Fi 7 Multi-Link Operation','2.5 Gbps WAN and LAN for multi-gig fibre plans'],specs:{'Wi-Fi standard':'Wi-Fi 7 (802.11be)','Speed class':'BE5000','Ports':'1 × 2.5G WAN, 1 × 2.5G LAN, 3 × GbE','Band':'Dual band','Mesh':'Yes','PoE':'No','Management':'App + web'},rating:[4.6,22],warranty:'2 years',
 lab:{score:8.9,m:{'Throughput':9.4,'Range':8.4,'Many devices':9.0,'Setup ease':8.8,'Parental controls':7.6},good:['1 Gbps+ fibre plans','Gamers and creators'],bad:['Basic 100 Mbps plans']}});
add({id:'ms-3',cat:'connect',sub:'Mesh Wi-Fi',brand:'Meshwave',model:'MW-AX1800-3',name:'Meshwave AX1800 Wi-Fi 6 Mesh System, 3-pack',art:'mesh',price:27500,mrp:31000,stock:34,tags:['best'],
 hl:['One network name across a 4-storey house','Ethernet backhaul when cable is available','Each unit has 2 gigabit ports'],
 specs:{'Wi-Fi standard':'Wi-Fi 6 (802.11ax)','Speed class':'AX1800','Ports':'2 × GbE per unit','Band':'Dual band','Mesh':'Yes, 3 units','PoE':'No','Management':'App'},rating:[4.6,148],warranty:'2 years',serv:5,
 lab:{score:8.5,m:{'Throughput':8.0,'Range':9.3,'Many devices':8.4,'Setup ease':9.0,'Roaming':8.8},good:['Multi-storey houses','Concrete walls'],bad:['Small single-floor flats']}});
add({id:'ms-2',cat:'connect',sub:'Mesh Wi-Fi',brand:'Meshwave',model:'MW-AX1800-2',name:'Meshwave AX1800 Wi-Fi 6 Mesh System, 2-pack',art:'mesh',price:19500,stock:40,
 hl:['Covers 2–3 floors'],specs:{'Wi-Fi standard':'Wi-Fi 6 (802.11ax)','Speed class':'AX1800','Ports':'2 × GbE per unit','Band':'Dual band','Mesh':'Yes, 2 units','PoE':'No','Management':'App'},rating:[4.5,92],warranty:'2 years'});
add({id:'lte-4',cat:'connect',sub:'4G routers',brand:'NetLoop',model:'NL-LTE300',name:'NetLoop 4G LTE Router with SIM slot, Cat 4',art:'lte',price:8900,stock:52,
 hl:['Backup or primary internet on NTC or Ncell SIM','Plug-and-play, no ISP install'],specs:{'Wi-Fi standard':'Wi-Fi 4 (802.11n)','Speed class':'N300','Ports':'1 × LAN/WAN','Band':'2.4 GHz','Network':'4G LTE Cat 4','PoE':'No','Management':'Web'},rating:[4.1,77],warranty:'1 year'});
add({id:'sw-8',cat:'connect',sub:'Switches',brand:'PoeTech',model:'PT-S8G',name:'PoeTech 8-Port Gigabit Desktop Switch, metal',art:'switchSmall',price:2600,mrp:2900,stock:180,
 hl:['Plug-and-play, fanless','Metal case for office desks'],specs:{'Ports':'8 × GbE','PoE':'No','Management':'Unmanaged','Speed class':'Gigabit'},rating:[4.6,320],warranty:'2 years',breaks:[[1,2600],[10,2450],[50,2300]]});
add({id:'sw-24',cat:'connect',sub:'Switches',brand:'PoeTech',model:'PT-S24G',name:'PoeTech 24-Port Gigabit Rackmount Switch, unmanaged',art:'switch',price:9200,stock:42,
 hl:['19" 1U rack mount','Fanless'],specs:{'Ports':'24 × GbE','PoE':'No','Management':'Unmanaged','Speed class':'Gigabit'},rating:[4.5,88],warranty:'2 years'});
add({id:'pw-8',cat:'connect',sub:'PoE switches',brand:'PoeTech',model:'PT-P8-120',name:'PoeTech 8-Port Gigabit PoE+ Switch, 120 W',art:'switchSmall',price:9800,stock:36,tags:['best'],
 hl:['Powers 8 cameras or access points','2 gigabit uplinks'],specs:{'Ports':'8 × GbE PoE+, 2 × GbE uplink','PoE':'PoE+ 120 W','Management':'Unmanaged','Speed class':'Gigabit'},rating:[4.5,74],warranty:'3 years'});
add({id:'pw-24',cat:'connect',sub:'PoE switches',brand:'PoeTech',model:'PT-P24M-370',name:'PoeTech 24-Port PoE+ Managed Switch, 370 W, 4 SFP',art:'switch',price:52000,mrp:58000,stock:8,
 hl:['VLAN, QoS, IGMP snooping for CCTV and Wi-Fi','4 × SFP uplinks for fibre'],specs:{'Ports':'24 × GbE PoE+, 4 × SFP','PoE':'PoE+ 370 W','Management':'L2 managed','Speed class':'Gigabit'},rating:[4.6,28],warranty:'3 years',
 lab:{score:8.4,m:{'Throughput':9.0,'PoE stability':8.6,'Management features':8.2,'Noise':6.8},good:['Offices with CCTV and Wi-Fi','Hotels'],bad:['Rooms where fan noise matters']}});
add({id:'ap-6',cat:'connect',sub:'Access points',brand:'Meshwave',model:'MW-CAP6',name:'Meshwave Ceiling Access Point Wi-Fi 6, PoE, cloud managed',art:'ap',price:14500,mrp:16000,stock:60,tags:['best'],
 hl:['Up to 100 clients per AP','Seamless roaming across floors','Free cloud controller'],specs:{'Wi-Fi standard':'Wi-Fi 6 (802.11ax)','Speed class':'AX1800','Ports':'1 × GbE','PoE':'802.3af PoE powered','Management':'Cloud + app'},rating:[4.6,66],warranty:'2 years',breaks:[[1,14500],[5,13900],[20,13200]],
 lab:{score:8.6,m:{'Throughput':8.4,'Range':8.6,'Many devices':9.0,'Roaming':8.8,'Management':8.4},good:['Hotels, schools, offices'],bad:['Homes without Ethernet']}});
add({id:'ptp-5',cat:'connect',sub:'Outdoor wireless',brand:'Meshwave',model:'MW-PTP5',name:'Meshwave 5 GHz Point-to-Point Kit, up to 5 km',art:'radio',price:21000,stock:18,
 hl:['Link two buildings without cable','Pre-paired pair with PoE injectors'],specs:{'Band':'5 GHz','Range':'Up to 5 km LOS','Speed class':'450 Mbps','PoE':'24 V passive','Management':'Web'},rating:[4.4,31],warranty:'1 year'});

/* ---------------- FTTH ---------------- */
add({id:'ont-1',cat:'ftth',sub:'ONT / ONU',brand:'FibreKraft',model:'FK-G1W',name:'FibreKraft GPON ONT, 1 GE + 1 FE, Wi-Fi 4',art:'ont',price:2900,stock:900,tags:['best'],
 hl:['Works with common GPON OLTs (OMCI)','Carton of 20 at dealer price'],specs:{'PON type':'GPON','Connector':'SC/APC','Ports':'1 × GE, 1 × FE','Rate':'2.5G/1.25G','Wi-Fi':'2.4 GHz 300 Mbps'},rating:[4.3,142],warranty:'1 year',breaks:[[1,2900],[20,2650],[100,2450]],fbt:['dc-1k','fc-100']});
add({id:'ont-ax',cat:'ftth',sub:'ONT / ONU',brand:'FibreKraft',model:'FK-X4AX',name:'FibreKraft XPON ONT, 4 GE, Wi-Fi 6 AX1500',art:'ont',price:5800,stock:240,tags:['new'],
 hl:['Auto GPON/EPON','Wi-Fi 6 for premium home plans'],specs:{'PON type':'XPON (GPON/EPON)','Connector':'SC/APC','Ports':'4 × GE, 1 × POTS','Rate':'2.5G/1.25G','Wi-Fi':'AX1500 dual band'},rating:[4.5,61],warranty:'1 year',breaks:[[1,5800],[20,5400],[100,5100]]});
add({id:'olt-8',cat:'ftth',sub:'OLT',brand:'FibreKraft',model:'FK-OLT8G',name:'FibreKraft GPON OLT, 8 PON, 10G uplink',art:'olt',price:null,quote:true,stock:3,
 hl:['Up to 1024 subscribers','Includes configuration and staff training in quote'],specs:{'PON type':'GPON','Ports':'8 × PON, 4 × GE, 4 × 10G SFP+','Rate':'2.5G/1.25G'},rating:[4.6,7],warranty:'2 years'});
add({id:'dc-1k',cat:'ftth',sub:'Drop cable',brand:'FibreKraft',model:'FK-DC1-1000',name:'FTTH Drop Cable, 1 core, G.657A2, 1 km drum',art:'drum',price:6500,stock:150,
 hl:['Bend-insensitive fibre for indoor runs','Steel messenger for aerial spans'],specs:{'Fibre':'G.657A2 single mode','Cores':'1','Length':'1000 m','Connector':'None (field terminate)'},rating:[4.4,58],warranty:'—',breaks:[[1,6500],[10,6200],[50,5900]]});
add({id:'dc-pc',cat:'ftth',sub:'Drop cable',brand:'FibreKraft',model:'FK-DCP-100',name:'Pre-connectorised Drop Cable SC/APC–SC/APC, 100 m',art:'drum',price:1650,stock:300,
 hl:['Factory-polished ends, no splicing'],specs:{'Fibre':'G.657A2 single mode','Cores':'1','Length':'100 m','Connector':'SC/APC both ends'},rating:[4.5,40],warranty:'—',breaks:[[1,1650],[20,1520],[100,1420]]});
add({id:'spl-8',cat:'ftth',sub:'Splitters',brand:'FibreKraft',model:'FK-PLC18',name:'PLC Splitter 1×8, SC/APC, cassette',art:'splitter',price:1100,stock:420,
 hl:['Even split, low insertion loss'],specs:{'Ratio':'1×8','Connector':'SC/APC','Insertion loss':'≤ 10.5 dB','Type':'Cassette'},rating:[4.4,72],warranty:'—',breaks:[[1,1100],[20,980],[100,890]]});
add({id:'spl-16',cat:'ftth',sub:'Splitters',brand:'FibreKraft',model:'FK-PLC116',name:'PLC Splitter 1×16, SC/APC, cassette',art:'splitter',price:1900,stock:180,
 specs:{'Ratio':'1×16','Connector':'SC/APC','Insertion loss':'≤ 13.7 dB','Type':'Cassette'},hl:['For FAT and street cabinets'],rating:[4.3,33],warranty:'—',breaks:[[1,1900],[20,1750],[100,1600]]});
add({id:'fc-100',cat:'ftth',sub:'Connectors & patch cords',brand:'FibreKraft',model:'FK-FCAPC-100',name:'SC/APC Fast Connector, pre-embedded, pack of 100',art:'connector',price:4200,stock:260,tags:['best'],
 hl:['Field-terminate in under 2 minutes','≤ 0.3 dB typical insertion loss'],specs:{'Connector':'SC/APC','Type':'Pre-embedded fast connector','Pack':'100 pcs','Insertion loss':'≤ 0.3 dB'},rating:[4.5,104],warranty:'—',breaks:[[1,4200],[10,3950],[50,3700]]});
add({id:'pc-3',cat:'ftth',sub:'Connectors & patch cords',brand:'FibreKraft',model:'FK-PC-SCAPC-3',name:'Patch Cord SC/APC–SC/APC, simplex, 3 m',art:'connector',price:180,stock:2000,
 specs:{'Connector':'SC/APC','Length':'3 m','Fibre':'G.657A1'},hl:['Sold individually or in bags of 50'],rating:[4.4,61],warranty:'—',breaks:[[1,180],[50,150],[200,130]]});
add({id:'sfp-20',cat:'ftth',sub:'SFP modules',brand:'FibreKraft',model:'FK-SFP-BIDI20',name:'SFP 1.25G BiDi Single Fibre 20 km, LC, DDM',art:'sfp',price:2400,stock:140,
 hl:['Sold in pairs (1310/1550 nm)','DDM for optical power monitoring'],specs:{'Rate':'1.25 Gbps','Connector':'LC','Wavelength':'1310/1550 nm BiDi','Length':'20 km','DDM':'Yes'},rating:[4.5,37],warranty:'1 year',breaks:[[1,2400],[10,2250],[50,2100]]});
add({id:'sfp-10g',cat:'ftth',sub:'SFP modules',brand:'FibreKraft',model:'FK-SFPP-LR',name:'SFP+ 10G LR Single Mode 10 km, duplex LC',art:'sfp',price:4800,stock:60,
 hl:['For OLT and core switch uplinks'],specs:{'Rate':'10 Gbps','Connector':'Duplex LC','Wavelength':'1310 nm','Length':'10 km','DDM':'Yes'},rating:[4.6,18],warranty:'1 year'});
add({id:'tk-fib',cat:'ftth',sub:'Fibre tools',brand:'FibreKraft',model:'FK-TK10',name:'FTTH Termination Toolkit with cleaver, VFL and power meter',art:'kit',price:18500,mrp:21000,stock:25,tags:['deal'],
 hl:['Everything for fast-connector termination','Visual fault locator 10 mW and optical power meter'],specs:{'Type':'Toolkit','Includes':'Cleaver, drop stripper, Miller stripper, VFL, power meter, alcohol dispenser, case'},rating:[4.6,44],warranty:'1 year'});

/* ---------------- PARTS ---------------- */
add({id:'c6-305',cat:'parts',sub:'Network cable',brand:'Linkset',model:'LS-C6U-305',name:'Linkset CAT6 UTP Cable, 23 AWG solid copper, 305 m',art:'cable',price:12500,mrp:13800,stock:90,tags:['best'],
 hl:['Pure copper, passes Fluke channel tests','Pull-box packaging'],specs:{'Type':'CAT6 UTP','Rating':'23 AWG solid copper','Length':'305 m'},rating:[4.6,118],warranty:'—',breaks:[[1,12500],[5,12000],[20,11500]]});
add({id:'c6-pc',cat:'parts',sub:'Network cable',brand:'Linkset',model:'LS-C6PC-1',name:'CAT6 Patch Cable, 1 m',art:'cable',price:150,stock:1500,
 specs:{'Type':'CAT6 patch','Rating':'24 AWG stranded','Length':'1 m'},hl:['Moulded boots'],rating:[4.5,210],warranty:'—',breaks:[[1,150],[50,120],[200,105]]});
add({id:'rk-9',cat:'parts',sub:'Racks & cabinets',brand:'Linkset',model:'LS-WR9',name:'Wall-Mount Network Rack 9U, 600 × 450 mm, glass door',art:'wallrack',price:11800,stock:28,
 hl:['Fan, shelf and 6-way PDU included','Lockable glass door'],specs:{'Type':'Wall-mount rack','Rating':'9U','Size':'600 × 450 mm'},rating:[4.4,52],warranty:'1 year'});
add({id:'fu-125',cat:'parts',sub:'Breakers & fuses',brand:'Ampere Guard',model:'AG-ANL125',name:'ANL Fuse 125 A with holder, for battery banks',art:'breaker',price:950,stock:160,
 specs:{'Type':'ANL fuse + holder','Rating':'125 A DC'},hl:['Protects inverter cables from battery short circuits'],rating:[4.6,48],warranty:'—'});
add({id:'dcb-63',cat:'parts',sub:'Breakers & fuses',brand:'Ampere Guard',model:'AG-DC63-2P',name:'DC Circuit Breaker 63 A, 2-pole, 500 V',art:'breaker',price:850,stock:200,
 specs:{'Type':'DC MCB','Rating':'63 A, 500 V DC'},hl:['DIN rail, for PV strings and battery isolation'],rating:[4.5,56],warranty:'1 year'});
add({id:'sg-6',cat:'parts',sub:'Surge protection',brand:'Ampere Guard',model:'AG-SP6',name:'Ampere Guard 6-Way Surge Protector, 1200 J',art:'surge',price:1650,mrp:1990,stock:240,tags:['deal'],
 specs:{'Type':'Surge protector strip','Rating':'1200 J, 10 A','Length':'2 m cable'},hl:['Individual switches','Universal sockets'],rating:[4.4,190],warranty:'1 year'});
add({id:'spd-pv',cat:'parts',sub:'Surge protection',brand:'Ampere Guard',model:'AG-SPD-DC1000',name:'DC Surge Protection Device for PV, 1000 V',art:'breaker',price:2900,stock:70,
 specs:{'Type':'Type 2 SPD','Rating':'1000 V DC, 40 kA'},hl:['Protects inverter PV inputs from lightning surges'],rating:[4.5,22],warranty:'1 year'});
add({id:'dc-4',cat:'parts',sub:'Battery & DC cable',brand:'Linkset',model:'LS-PV4-100',name:'Solar DC Cable 4 mm², UV resistant, 100 m',art:'dccable',price:9800,stock:75,
 specs:{'Type':'PV cable','Rating':'4 mm², 1500 V DC','Length':'100 m'},hl:['Red or black','Tinned copper'],rating:[4.6,44],warranty:'—'});
add({id:'bc-25',cat:'parts',sub:'Battery & DC cable',brand:'Linkset',model:'LS-BC25',name:'Inverter Battery Cable Set 25 mm² with lugs, 1 m pair',art:'dccable',price:1450,stock:180,
 specs:{'Type':'Battery cable set','Rating':'25 mm²','Length':'1 m pair'},hl:['Crimped copper lugs','For inverters up to 2.5 kVA at 12 V'],rating:[4.5,73],warranty:'—'});

/* ---------- kits ---------- */
const KITS=[
 {id:'k-wifi',name:'Wi-Fi on during power cuts',for:'Homes',items:['mu-10'],note:'Router and ONT stay online for 4–6 hours.',extra:['Free phone help to wire it up']},
 {id:'k-home',name:'Home backup 1 kVA',for:'Homes',items:['inv-11','tb-150','bc-25'],note:'Lights, fans, TV and Wi-Fi through load shedding.',extra:['Installation in Kathmandu Valley available']},
 {id:'k-li',name:'Lithium home backup 1 kVA',for:'Homes',items:['inv-11','lb-12100','bc-25','fu-125'],note:'Light, long-life battery for upper floors.',extra:['5-year battery warranty']},
 {id:'k-solar3',name:'3 kW solar hybrid',for:'Homes',items:['hi-36','sp-550','sp-550','sp-550','sp-550','lb-24100','mt-4','dc-4'],note:'Daytime solar with lithium backup at night.',extra:['Site survey before final price'],quote:true},
 {id:'k-office',name:'Small office network',for:'Offices',items:['rt-ax3','pw-8','ap-6','ap-6','sg-6'],note:'Router, PoE switch and two ceiling APs for 15–25 users.',extra:['VLAN for guests on request']},
 {id:'k-isp',name:'ISP installer kit',for:'ISPs',items:['ont-1','ont-1','ont-1','ont-1','ont-1','ont-1','ont-1','ont-1','ont-1','ont-1','dc-1k','fc-100'],note:'10 ONTs, 1 km drop cable, 100 fast connectors.',extra:['Dealer price after account approval']}
];

/* ---------- reviews & Q&A seeds ---------- */
const REVIEWS={
 'mu-10':[
  {n:'Sujan T.',s:5,title:'Router never drops now',t:'Load shedding in our area is 2–3 hours. Worldlink router and ONT both stay on. The 9 V cable fitted my ONT without an adapter.',d:'2026-09-14',v:true},
  {n:'Anisha K.',s:4,title:'Works, check your router voltage',t:'Good backup time, about 5 hours. My router needed 12 V 1.5 A so I used the 12 V port. Gets slightly warm while charging.',d:'2026-08-30',v:true},
  {n:'Prakash M.',s:5,title:'Bought three for the office',t:'Zero switchover, CCTV NVR stays connected over the network during cuts.',d:'2026-07-22',v:true}],
 'inv-11':[
  {n:'Ramesh B.',s:5,title:'Quiet fans, no humming',t:'Old square-wave inverter made the fans buzz. This one is silent. Runs 6 LED bulbs, 2 fans, TV and router for about 4 hours on a 150 Ah battery.',d:'2026-10-02',v:true},
  {n:'Gita S.',s:4,title:'Good value',t:'Installation team was on time. Display could be brighter.',d:'2026-09-03',v:true}],
 'lb-12100':[
  {n:'Bikash R.',s:5,title:'Carried it up to the 5th floor myself',t:'11 kg instead of 55 kg. The Bluetooth app shows each cell voltage. Charges much faster than my old tubular battery.',d:'2026-10-11',v:true},
  {n:'Nirmala P.',s:5,title:'Worth the extra cost',t:'Set the inverter to lithium mode as the guide says. Two months, no issues.',d:'2026-08-19',v:true}],
 'tb-150':[
  {n:'Hari P.',s:4,title:'Solid battery',t:'Heavy, needs two people. Backup is as expected. Remember the distilled water top-ups.',d:'2026-09-25',v:true}],
 'rt-ax3':[
  {n:'Saroj G.',s:5,title:'Big improvement over ISP router',t:'Speed tests went from 60 to 280 Mbps on my phone in the bedroom. Setup through the app took 10 minutes.',d:'2026-10-05',v:true},
  {n:'Kritika N.',s:4,title:'Good but one floor only',t:'Strong on the floor where it sits. Will add a mesh unit for upstairs.',d:'2026-09-12',v:false}],
 'ms-3':[
  {n:'Deepak J.',s:5,title:'Four-storey house fully covered',t:'Concrete walls killed our old router. With three units we get 150+ Mbps on every floor.',d:'2026-10-18',v:true}],
 'ont-1':[
  {n:'Valley Net Pvt. Ltd.',s:4,title:'Reliable for basic plans',t:'Using about 300 units. Registers on our OLT without issues. Wi-Fi range is basic, fine for small flats.',d:'2026-09-08',v:true}],
 'sp-550':[
  {n:'Manoj K.',s:5,title:'Output matches the label',t:'Four panels give 1.9–2.0 kW at noon in October on a clear day.',d:'2026-10-21',v:true}],
 'hi-36':[
  {n:'Sabina L.',s:4,title:'Good inverter, learn the settings',t:'Solar priority mode cut our bill by half. The menu takes time to understand; the Technotri team set it up.',d:'2026-09-29',v:true}],
 'fc-100':[
  {n:'Rajan D.',s:5,title:'Low loss',t:'Measured 0.2–0.3 dB on most terminations with our power meter.',d:'2026-08-12',v:true}]
};
const QA={
 'mu-10':[{q:'Will it work with a Worldlink or Vianet router?',a:'Yes, if the router uses 12 V or 9 V DC and draws under 2 A. Check the label on your router adapter. Most ISP routers and ONTs in Nepal use 12 V 1–1.5 A.',by:'Technotri support'},
          {q:'Does the router restart when power goes?',a:'No. Output is DC and does not switch over, so the router stays on.',by:'Technotri support'}],
 'inv-11':[{q:'Can it run a refrigerator?',a:'A small 150–200 W refrigerator, yes, but leave headroom: the compressor start current is 3–5 times the running watts. Do not run it together with a water pump.',by:'Technotri support'}],
 'lb-12100':[{q:'Can I use it with my old inverter?',a:'Yes, if the inverter has a lithium or custom charge setting (14.2–14.4 V bulk, no equalisation). Older inverters without it can still be used but will not fully charge the battery.',by:'Technotri support'}],
 'ont-1':[{q:'Does it support TR-069?',a:'Yes, TR-069 and OMCI are supported.',by:'Technotri support'}],
 'hi-36':[{q:'How many panels can I connect?',a:'Up to 4000 W of PV within 60–450 V DC. With 550 W panels (Voc 49.6 V) that is up to 7 panels in one series string; use the System Builder to check.',by:'Technotri support'}]
};

/* ---------- guides ---------- */
const GUIDES=[
 {id:'ups-vs-inverter',title:'UPS or inverter: which one do you need?',tag:'Backup Power',art:'ups',kind:'Explainer',mins:6,level:'Beginner',
  intro:'Both keep things running when the power goes. The difference is how fast they switch, how long they last, and what they are designed to protect.',
  sections:[
   {h:'The short answer',p:['Get a UPS for computers, servers and network equipment that must not restart. Get an inverter with a large battery for lights, fans and TV during long load shedding.']},
   {h:'How they differ',table:[['','UPS','Home inverter'],['Switchover','0–6 ms','About 10–20 ms'],['Battery','Small, built in (minutes)','Large external (hours)'],['Best for','PCs, servers, POS','Lights, fans, TV, Wi-Fi'],['Typical runtime','5–20 min','2–8 h']]},
   {h:'When an online UPS is worth it',p:['An online (double-conversion) UPS powers the load from its inverter all the time. Switchover is zero and the output is clean even when grid voltage swings. Choose one for server rooms, clinics and labs.']},
   {h:'For the internet only',p:['If you only need Wi-Fi during cuts, a DC mini UPS for the router and ONT is cheaper than either and does not switch over at all.']}],
  products:['mu-10','ups-1k','ou-3k','inv-11']},
 {id:'size-backup',title:'How to size a home backup system',tag:'Backup Power',art:'inverter',kind:'How-to',mins:10,level:'Beginner',
  intro:'Work out the inverter size from the load you run at once, and the battery size from how many hours you need.',
  steps:[
   {t:'List what must run during a cut',p:'Write down each appliance and its watts (on the label or manual). Typical values: LED bulb 9 W, ceiling fan 60–75 W, 43" LED TV 80 W, router + ONT 20 W, laptop 65 W.'},
   {t:'Add up the running watts',p:'Example: 6 bulbs (54 W) + 2 fans (120 W) + TV (80 W) + router (20 W) = 274 W.'},
   {t:'Choose the inverter size',p:'Divide watts by 0.8 to get VA, then add 25% headroom. 274 W ÷ 0.8 = 343 VA, × 1.25 = 428 VA. A 1100 VA inverter leaves room to grow.',tip:'Motors (pumps, refrigerators) need 3–5 times their running watts to start. Size for that or keep them off the inverter.'},
   {t:'Work out the energy you need',p:'Multiply watts by hours. 274 W × 4 h = 1,096 Wh.'},
   {t:'Convert to battery capacity',p:'Divide by inverter efficiency (about 0.85) and the usable depth of discharge: about 0.5 for lead-acid, 0.9 for LiFePO4. Lead-acid: 1,096 ÷ 0.85 ÷ 0.5 = 2,579 Wh, which is about 215 Ah at 12 V, so one 200 Ah or two 150 Ah. LiFePO4: 1,096 ÷ 0.85 ÷ 0.9 = 1,433 Wh, so about 112 Ah at 12.8 V.'},
   {t:'Check it with the calculator',p:'Use the System Builder: pick the inverter, set your load and hours, and it checks battery voltage and runtime for you.'}],
  products:['inv-11','tb-150','lb-12100','bc-25']},
 {id:'lead-vs-lfp',title:'Lead-acid vs LiFePO4 batteries',tag:'Backup Power',art:'lithium',kind:'Explainer',mins:5,level:'Beginner',
  intro:'Lithium iron phosphate costs more up front but lasts several times longer and gives you almost all of its capacity.',
  sections:[
   {h:'Side by side',table:[['','Tall tubular lead-acid','LiFePO4'],['Usable capacity','About 50%','80–90%'],['Cycle life','1,200–1,500','4,000–6,000'],['Weight for 1.2 kWh usable','About 110 kg','About 15 kg'],['Maintenance','Distilled water top-up','None'],['Upfront cost','Lower','Higher']]},
   {h:'When lead-acid still makes sense',p:['Short, occasional cuts on a ground floor with a tight budget. A tall tubular battery is cheap and forgiving.']},
   {h:'When LiFePO4 pays off',p:['Daily solar cycling, upper-floor flats, and anywhere you want a battery that lasts 10+ years. Cost per usable kWh over its life is usually lower.']},
   {h:'Before you switch',p:['Your inverter needs a lithium or custom charge profile (no equalisation, about 14.2–14.4 V bulk for 12.8 V). Check the inverter manual or ask us.']}],
  products:['tb-150','lb-12100','lb-48100']},
 {id:'mini-ups-install',title:'Install a mini UPS for your router and ONT',tag:'Connectivity',art:'ups',kind:'How-to',mins:15,level:'Easy',
  tools:['Mini DC UPS','Router and ONT power adapters (to read the labels)'],
  intro:'Keep your fibre internet on during power cuts in about 15 minutes, with no tools.',
  steps:[
   {t:'Read the adapter labels',p:'Look at the output line on each adapter, for example "12V ⎓ 1.5A". Note the voltage and current for the router and the ONT.',tip:'Most ISP routers and ONTs in Nepal use 12 V or 9 V. If a device needs more than 2 A at 12 V, it is too big for this UPS.'},
   {t:'Charge the UPS first',p:'Plug the UPS into the wall for about 4 hours until the indicator shows full.'},
   {t:'Connect the router',p:'Plug the 12 V DC cable from the UPS into the router power socket. The barrel plug is 5.5 × 2.1 mm, which fits most routers.'},
   {t:'Connect the ONT',p:'Use the 9 V or 12 V port that matches the ONT label. Never connect a 12 V output to a 9 V device.',warn:'Wrong voltage can damage the ONT. Check the label again before plugging in.'},
   {t:'Test it',p:'Switch off the wall socket. The router and ONT lights should stay on and the internet should keep working. Switch the socket back on.'}],
  products:['mu-10','mu-20']},
 {id:'mesh-setup',title:'Set up Wi-Fi 6 mesh in a multi-storey house',tag:'Connectivity',art:'mesh',kind:'How-to',mins:30,level:'Easy',
  tools:['Mesh kit','Phone with the mesh app','Ethernet cable (optional)'],
  intro:'Concrete floors block Wi-Fi. A mesh system puts one unit on each floor and gives you one network name everywhere.',
  steps:[
   {t:'Connect the main unit to the ISP router or ONT',p:'Use the Ethernet cable from the ONT or ISP router LAN port to the mesh unit WAN port. Put it near the ONT, on a shelf, not inside a cabinet.'},
   {t:'Create the network in the app',p:'Follow the app to set the Wi-Fi name and password. Use the same name as your old network so devices reconnect on their own.'},
   {t:'Place the second unit one floor up',p:'Put it near the stairwell, roughly above the first unit. Concrete slabs cut the signal less through the stairwell opening.'},
   {t:'Check the link quality',p:'The app shows link quality between units. If it says weak, move the unit closer by a few metres.',tip:'If you can run an Ethernet cable between floors, use wired backhaul. It doubles the speed on upper floors.'},
   {t:'Add the third unit and test',p:'Place it on the next floor and run a speed test on each floor.'}],
  products:['ms-3','ms-2','c6-pc']},
 {id:'fast-connector',title:'Terminate a drop cable with an SC/APC fast connector',tag:'ISP & FTTH',art:'connector',kind:'How-to',mins:5,level:'Moderate',
  tools:['Drop cable stripper','Fibre stripper (Miller)','Fibre cleaver','Lint-free wipes and 99% isopropyl alcohol','Visual fault locator (VFL)','Optical power meter'],
  intro:'A clean cleave and correct length are what decide the loss. Practise on spare cable first.',
  steps:[
   {t:'Fit the boot and strip the jacket',p:'Slide the connector boot onto the cable. Strip about 50 mm of outer jacket with the drop stripper and cut back the strength members.'},
   {t:'Strip the coating',p:'Use the Miller stripper to remove the 250 µm coating to the length shown on the connector\'s guide.'},
   {t:'Clean the bare fibre',p:'Wipe once with a lint-free wipe and 99% isopropyl alcohol. Do not touch the bare fibre after this.'},
   {t:'Cleave to length',p:'Place the fibre in the cleaver at the length the connector specifies and cleave in one smooth motion.',warn:'Put fibre offcuts straight into a sealed container. Glass slivers are sharp and hard to see.'},
   {t:'Insert until the fibre bows',p:'Push the fibre into the connector until it bows slightly. The bow shows the fibre ends are touching inside.'},
   {t:'Lock and assemble',p:'Close the clamp while holding the bow, release the bow, then fit the outer housing and boot.'},
   {t:'Test',p:'Shine the VFL from the far end: red light should only show at the ferrule, not at the joint. Measure with the power meter; loss should be within the connector spec (typically ≤ 0.3 dB).'}],
  products:['fc-100','tk-fib','dc-1k']}
];

const COUPONS=[
 {code:'WELCOME5',desc:'5% off your first order, up to Rs 1,000',type:'pct',v:5,cap:1000},
 {code:'SOLAR10',desc:'10% off Solar Energy items when they total Rs 1,00,000 or more, up to Rs 15,000',type:'catpct',cat:'solar',min:100000,v:10,cap:15000},
 {code:'FREEDEL',desc:'Free delivery on any order',type:'ship'}
];
const ZONES=[
 {id:'ktm',name:'Kathmandu Valley',fee:150,days:1,free:10000},
 {id:'major',name:'Pokhara, Chitwan, Butwal, Biratnagar, Birgunj',fee:350,days:3,free:25000},
 {id:'other',name:'Other districts',fee:550,days:5,free:40000}
];
const PROTECT=[{id:'p1',name:'+1 year extended warranty',pct:.06},{id:'p2',name:'+2 years extended warranty',pct:.10}];
// daily flash deal list: [productId, deal %]
const FLASH=[['mu-10',18],['ms-3',12],['lb-12100',10],['ps-1k',14],['sg-6',17],['rt-ax3',15],['inv-11',11],['tk-fib',12],['sl-60',20],['sp-550',9]];

window.TT_DATA={COMPANY,CATS,PRODUCTS:P,KITS,REVIEWS,QA,GUIDES,COUPONS,ZONES,PROTECT,FLASH};
})();
