'use strict';
/* Default editable content, loaded into the database on first run. Staff edit it in Admin → Content. */
module.exports = {
 "GUIDES": [
  {
   "id": "ups-vs-inverter",
   "title": "UPS or inverter: which one do you need?",
   "tag": "Backup Power",
   "art": "ups",
   "kind": "Explainer",
   "mins": 6,
   "level": "Beginner",
   "intro": "Both keep things running when the power goes. The difference is how fast they switch, how long they last, and what they are designed to protect.",
   "sections": [
    {
     "h": "The short answer",
     "p": [
      "Get a UPS for computers, servers and network equipment that must not restart. Get an inverter with a large battery for lights, fans and TV during long load shedding."
     ]
    },
    {
     "h": "How they differ",
     "table": [
      [
       "",
       "UPS",
       "Home inverter"
      ],
      [
       "Switchover",
       "0–6 ms",
       "About 10–20 ms"
      ],
      [
       "Battery",
       "Small, built in (minutes)",
       "Large external (hours)"
      ],
      [
       "Best for",
       "PCs, servers, POS",
       "Lights, fans, TV, Wi-Fi"
      ],
      [
       "Typical runtime",
       "5–20 min",
       "2–8 h"
      ]
     ]
    },
    {
     "h": "When an online UPS is worth it",
     "p": [
      "An online (double-conversion) UPS powers the load from its inverter all the time. Switchover is zero and the output is clean even when grid voltage swings. Choose one for server rooms, clinics and labs."
     ]
    },
    {
     "h": "For the internet only",
     "p": [
      "If you only need Wi-Fi during cuts, a DC mini UPS for the router and ONT is cheaper than either and does not switch over at all."
     ]
    }
   ],
   "products": [
    "mu-10",
    "ups-1k",
    "ou-3k",
    "inv-11"
   ]
  },
  {
   "id": "size-backup",
   "title": "How to size a home backup system",
   "tag": "Backup Power",
   "art": "inverter",
   "kind": "How-to",
   "mins": 10,
   "level": "Beginner",
   "intro": "Work out the inverter size from the load you run at once, and the battery size from how many hours you need.",
   "steps": [
    {
     "t": "List what must run during a cut",
     "p": "Write down each appliance and its watts (on the label or manual). Typical values: LED bulb 9 W, ceiling fan 60–75 W, 43\" LED TV 80 W, router + ONT 20 W, laptop 65 W."
    },
    {
     "t": "Add up the running watts",
     "p": "Example: 6 bulbs (54 W) + 2 fans (120 W) + TV (80 W) + router (20 W) = 274 W."
    },
    {
     "t": "Choose the inverter size",
     "p": "Divide watts by 0.8 to get VA, then add 25% headroom. 274 W ÷ 0.8 = 343 VA, × 1.25 = 428 VA. A 1100 VA inverter leaves room to grow.",
     "tip": "Motors (pumps, refrigerators) need 3–5 times their running watts to start. Size for that or keep them off the inverter."
    },
    {
     "t": "Work out the energy you need",
     "p": "Multiply watts by hours. 274 W × 4 h = 1,096 Wh."
    },
    {
     "t": "Convert to battery capacity",
     "p": "Divide by inverter efficiency (about 0.85) and the usable depth of discharge: about 0.5 for lead-acid, 0.9 for LiFePO4. Lead-acid: 1,096 ÷ 0.85 ÷ 0.5 = 2,579 Wh, which is about 215 Ah at 12 V, so one 200 Ah or two 150 Ah. LiFePO4: 1,096 ÷ 0.85 ÷ 0.9 = 1,433 Wh, so about 112 Ah at 12.8 V."
    },
    {
     "t": "Check it with the calculator",
     "p": "Use the System Builder: pick the inverter, set your load and hours, and it checks battery voltage and runtime for you."
    }
   ],
   "products": [
    "inv-11",
    "tb-150",
    "lb-12100",
    "bc-25"
   ]
  },
  {
   "id": "lead-vs-lfp",
   "title": "Lead-acid vs LiFePO4 batteries",
   "tag": "Backup Power",
   "art": "lithium",
   "kind": "Explainer",
   "mins": 5,
   "level": "Beginner",
   "intro": "Lithium iron phosphate costs more up front but lasts several times longer and gives you almost all of its capacity.",
   "sections": [
    {
     "h": "Side by side",
     "table": [
      [
       "",
       "Tall tubular lead-acid",
       "LiFePO4"
      ],
      [
       "Usable capacity",
       "About 50%",
       "80–90%"
      ],
      [
       "Cycle life",
       "1,200–1,500",
       "4,000–6,000"
      ],
      [
       "Weight for 1.2 kWh usable",
       "About 110 kg",
       "About 15 kg"
      ],
      [
       "Maintenance",
       "Distilled water top-up",
       "None"
      ],
      [
       "Upfront cost",
       "Lower",
       "Higher"
      ]
     ]
    },
    {
     "h": "When lead-acid still makes sense",
     "p": [
      "Short, occasional cuts on a ground floor with a tight budget. A tall tubular battery is cheap and forgiving."
     ]
    },
    {
     "h": "When LiFePO4 pays off",
     "p": [
      "Daily solar cycling, upper-floor flats, and anywhere you want a battery that lasts 10+ years. Cost per usable kWh over its life is usually lower."
     ]
    },
    {
     "h": "Before you switch",
     "p": [
      "Your inverter needs a lithium or custom charge profile (no equalisation, about 14.2–14.4 V bulk for 12.8 V). Check the inverter manual or ask us."
     ]
    }
   ],
   "products": [
    "tb-150",
    "lb-12100",
    "lb-48100"
   ]
  },
  {
   "id": "mini-ups-install",
   "title": "Install a mini UPS for your router and ONT",
   "tag": "Connectivity",
   "art": "ups",
   "kind": "How-to",
   "mins": 15,
   "level": "Easy",
   "tools": [
    "Mini DC UPS",
    "Router and ONT power adapters (to read the labels)"
   ],
   "intro": "Keep your fibre internet on during power cuts in about 15 minutes, with no tools.",
   "steps": [
    {
     "t": "Read the adapter labels",
     "p": "Look at the output line on each adapter, for example \"12V ⎓ 1.5A\". Note the voltage and current for the router and the ONT.",
     "tip": "Most ISP routers and ONTs in Nepal use 12 V or 9 V. If a device needs more than 2 A at 12 V, it is too big for this UPS."
    },
    {
     "t": "Charge the UPS first",
     "p": "Plug the UPS into the wall for about 4 hours until the indicator shows full."
    },
    {
     "t": "Connect the router",
     "p": "Plug the 12 V DC cable from the UPS into the router power socket. The barrel plug is 5.5 × 2.1 mm, which fits most routers."
    },
    {
     "t": "Connect the ONT",
     "p": "Use the 9 V or 12 V port that matches the ONT label. Never connect a 12 V output to a 9 V device.",
     "warn": "Wrong voltage can damage the ONT. Check the label again before plugging in."
    },
    {
     "t": "Test it",
     "p": "Switch off the wall socket. The router and ONT lights should stay on and the internet should keep working. Switch the socket back on."
    }
   ],
   "products": [
    "mu-10",
    "mu-20"
   ]
  },
  {
   "id": "mesh-setup",
   "title": "Set up Wi-Fi 6 mesh in a multi-storey house",
   "tag": "Connectivity",
   "art": "mesh",
   "kind": "How-to",
   "mins": 30,
   "level": "Easy",
   "tools": [
    "Mesh kit",
    "Phone with the mesh app",
    "Ethernet cable (optional)"
   ],
   "intro": "Concrete floors block Wi-Fi. A mesh system puts one unit on each floor and gives you one network name everywhere.",
   "steps": [
    {
     "t": "Connect the main unit to the ISP router or ONT",
     "p": "Use the Ethernet cable from the ONT or ISP router LAN port to the mesh unit WAN port. Put it near the ONT, on a shelf, not inside a cabinet."
    },
    {
     "t": "Create the network in the app",
     "p": "Follow the app to set the Wi-Fi name and password. Use the same name as your old network so devices reconnect on their own."
    },
    {
     "t": "Place the second unit one floor up",
     "p": "Put it near the stairwell, roughly above the first unit. Concrete slabs cut the signal less through the stairwell opening."
    },
    {
     "t": "Check the link quality",
     "p": "The app shows link quality between units. If it says weak, move the unit closer by a few metres.",
     "tip": "If you can run an Ethernet cable between floors, use wired backhaul. It doubles the speed on upper floors."
    },
    {
     "t": "Add the third unit and test",
     "p": "Place it on the next floor and run a speed test on each floor."
    }
   ],
   "products": [
    "ms-3",
    "ms-2",
    "c6-pc"
   ]
  },
  {
   "id": "fast-connector",
   "title": "Terminate a drop cable with an SC/APC fast connector",
   "tag": "ISP & FTTH",
   "art": "connector",
   "kind": "How-to",
   "mins": 5,
   "level": "Moderate",
   "tools": [
    "Drop cable stripper",
    "Fibre stripper (Miller)",
    "Fibre cleaver",
    "Lint-free wipes and 99% isopropyl alcohol",
    "Visual fault locator (VFL)",
    "Optical power meter"
   ],
   "intro": "A clean cleave and correct length are what decide the loss. Practise on spare cable first.",
   "steps": [
    {
     "t": "Fit the boot and strip the jacket",
     "p": "Slide the connector boot onto the cable. Strip about 50 mm of outer jacket with the drop stripper and cut back the strength members."
    },
    {
     "t": "Strip the coating",
     "p": "Use the Miller stripper to remove the 250 µm coating to the length shown on the connector's guide."
    },
    {
     "t": "Clean the bare fibre",
     "p": "Wipe once with a lint-free wipe and 99% isopropyl alcohol. Do not touch the bare fibre after this."
    },
    {
     "t": "Cleave to length",
     "p": "Place the fibre in the cleaver at the length the connector specifies and cleave in one smooth motion.",
     "warn": "Put fibre offcuts straight into a sealed container. Glass slivers are sharp and hard to see."
    },
    {
     "t": "Insert until the fibre bows",
     "p": "Push the fibre into the connector until it bows slightly. The bow shows the fibre ends are touching inside."
    },
    {
     "t": "Lock and assemble",
     "p": "Close the clamp while holding the bow, release the bow, then fit the outer housing and boot."
    },
    {
     "t": "Test",
     "p": "Shine the VFL from the far end: red light should only show at the ferrule, not at the joint. Measure with the power meter; loss should be within the connector spec (typically ≤ 0.3 dB)."
    }
   ],
   "products": [
    "fc-100",
    "tk-fib",
    "dc-1k"
   ]
  }
 ],
 "KITS": [
  {
   "id": "k-wifi",
   "name": "Wi-Fi on during power cuts",
   "for": "Homes",
   "items": [
    "mu-10"
   ],
   "note": "Router and ONT stay online for 4–6 hours.",
   "extra": [
    "Free phone help to wire it up"
   ]
  },
  {
   "id": "k-home",
   "name": "Home backup 1 kVA",
   "for": "Homes",
   "items": [
    "inv-11",
    "tb-150",
    "bc-25"
   ],
   "note": "Lights, fans, TV and Wi-Fi through load shedding.",
   "extra": [
    "Installation in Kathmandu Valley available"
   ]
  },
  {
   "id": "k-li",
   "name": "Lithium home backup 1 kVA",
   "for": "Homes",
   "items": [
    "inv-11",
    "lb-12100",
    "bc-25",
    "fu-125"
   ],
   "note": "Light, long-life battery for upper floors.",
   "extra": [
    "5-year battery warranty"
   ]
  },
  {
   "id": "k-solar3",
   "name": "3 kW solar hybrid",
   "for": "Homes",
   "items": [
    "hi-36",
    "sp-550",
    "sp-550",
    "sp-550",
    "sp-550",
    "lb-24100",
    "mt-4",
    "dc-4"
   ],
   "note": "Daytime solar with lithium backup at night.",
   "extra": [
    "Site survey before final price"
   ],
   "quote": true
  },
  {
   "id": "k-office",
   "name": "Small office network",
   "for": "Offices",
   "items": [
    "rt-ax3",
    "pw-8",
    "ap-6",
    "ap-6",
    "sg-6"
   ],
   "note": "Router, PoE switch and two ceiling APs for 15–25 users.",
   "extra": [
    "VLAN for guests on request"
   ]
  },
  {
   "id": "k-isp",
   "name": "ISP installer kit",
   "for": "ISPs",
   "items": [
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "ont-1",
    "dc-1k",
    "fc-100"
   ],
   "note": "10 ONTs, 1 km drop cable, 100 fast connectors.",
   "extra": [
    "Dealer price after account approval"
   ]
  }
 ],
 "FAQ": [
  {
   "q": "How long does delivery take?",
   "a": "Kathmandu Valley: next working day for orders before 4 PM. Pokhara, Chitwan, Butwal, Biratnagar and Birgunj: about 3 working days. Other districts: about 5. We do not deliver on Saturdays."
  },
  {
   "q": "Do you give a VAT invoice?",
   "a": "Yes. Every order gets an electronic VAT invoice, including cash on delivery. Add your business PAN at checkout to have it printed on the invoice."
  },
  {
   "q": "Can I return a product?",
   "a": "Unused products in sealed packaging can be returned within 7 days of delivery. Batteries that have been filled with acid, cut cable and opened fibre connectors cannot be returned."
  },
  {
   "q": "How do warranty claims work?",
   "a": "Submit the form below with your order number and the product serial number. We inspect at our service desk in Kumaristhan; for batteries and inverters we can collect from you inside the Valley."
  },
  {
   "q": "Do you install?",
   "a": "Yes. Inverters, solar systems, networks and CCTV across Kathmandu Valley, and solar projects nationwide. Tick installation at checkout or request a quote."
  },
  {
   "q": "When do I get my refund?",
   "a": "Within 7 days of approving the return, by bank transfer or cash at our store."
  }
 ],
 "SLIDES": [
  {
   "pillar": "power",
   "kicker": "Load shedding ready",
   "title": "Keep your Wi-Fi on when the power goes.",
   "text": "DC mini UPS for router and ONT. No reboot, 4–10 hours of internet.",
   "cta": [
    "Shop router UPS",
    "p-mu-10"
   ],
   "cta2": [
    "How to install",
    "g-mini-ups-install"
   ],
   "art": "ups"
  },
  {
   "pillar": "energy",
   "kicker": "Solar + battery",
   "title": "Run your home on sunshine, keep the night covered.",
   "text": "Hybrid inverters, Mono PERC panels and LiFePO4 batteries, checked for compatibility in the System Builder.",
   "cta": [
    "Open System Builder",
    "builder"
   ],
   "cta2": [
    "Shop solar",
    "c-solar"
   ],
   "art": "hybrid"
  },
  {
   "pillar": "net",
   "kicker": "For ISPs and installers",
   "title": "ONTs, drop cable and connectors at dealer prices.",
   "text": "Carton pricing, quantity breaks and credit for approved ISP and installer accounts.",
   "cta": [
    "Apply for a dealer account",
    "dealer"
   ],
   "cta2": [
    "Shop ISP & FTTH",
    "c-ftth"
   ],
   "art": "ont"
  }
 ],
 "SITE": {
  "announcement": "Order before 4 PM for next-day delivery in the Valley",
  "newsletterTitle": "Deals and new stock every Friday",
  "newsletterText": "One email a week. Unsubscribe any time.",
  "bankName": "",
  "bankAccountName": "Technotri Pvt. Ltd.",
  "bankAccountNo": "",
  "bankBranch": "",
  "returnDays": "7",
  "homeTitle": "",
  "homeDescription": ""
 }
};
