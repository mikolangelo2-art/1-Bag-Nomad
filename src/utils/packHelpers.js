// ── Tier 1: Base Pack — universal, every trip ─────────────────
export const BASE_PACK = [
  {name:"45L Travel Backpack",        cat:"travel",  cost:299, weight:4.5,  volume:2.2,  bag:"Backpack",         owned:true},
  {name:"Packable Day Bag",           cat:"travel",  cost:65,  weight:0.4,  volume:0.6,  bag:"Backpack",         owned:true},
  {name:"Medium Packing Cube",        cat:"clothes", cost:0,   weight:0.22, volume:8,    bag:"Backpack",         owned:true},
  {name:"Small Packing Cube",         cat:"clothes", cost:0,   weight:0.2,  volume:4,    bag:"Backpack",         owned:true},
  {name:"2 T-Shirts",                 cat:"clothes", cost:0,   weight:0.4,  volume:0.5,  bag:"Backpack",         owned:true},
  {name:"1 Lightweight Pants",        cat:"clothes", cost:0,   weight:0.45, volume:0.6,  bag:"Backpack",         owned:true},
  {name:"1 Swim Shorts",              cat:"clothes", cost:0,   weight:0.2,  volume:0.3,  bag:"Backpack",         owned:true},
  {name:"2 Underwear",                cat:"clothes", cost:0,   weight:0.1,  volume:0.15, bag:"Backpack",         owned:true},
  {name:"2 Socks",                    cat:"clothes", cost:0,   weight:0.1,  volume:0.15, bag:"Backpack",         owned:true},
  {name:"Flip Flops",                 cat:"clothes", cost:100, weight:0.4,  volume:1.2,  bag:"Backpack",         owned:true},
  {name:"Smartphone",                 cat:"tech",    cost:0,   weight:0.44, volume:0.1,  bag:"Worn",             owned:true},
  {name:"Charging Cables",            cat:"tech",    cost:0,   weight:0.2,  volume:0.3,  bag:"Global Briefcase", owned:true},
  {name:"Universal Power Adapter",    cat:"tech",    cost:0,   weight:0.2,  volume:0.35, bag:"Global Briefcase", owned:true},
  {name:"Portable Power Bank",        cat:"tech",    cost:0,   weight:0.2,  volume:0.4,  bag:"Global Briefcase", owned:true},
  {name:"Travel Wash Pouch",          cat:"health",  cost:0,   weight:0.4,  volume:2,    bag:"Backpack",         owned:true},
  {name:"Toothbrush & Paste",         cat:"health",  cost:0,   weight:0.15, volume:0.18, bag:"Backpack",         owned:true},
  {name:"Small First Aid Kit",        cat:"health",  cost:0,   weight:0.35, volume:3,    bag:"Backpack",         owned:false},
  {name:"Sunscreen",                  cat:"health",  cost:0,   weight:0.25, volume:0.3,  bag:"Backpack",         owned:true},
  {name:"Passport",                   cat:"docs",    cost:200, weight:0.1,  volume:0.1,  bag:"Worn",             owned:true},
  {name:"Debit and Credit Cards",     cat:"docs",    cost:0,   weight:0.01, volume:0.01, bag:"Worn",             owned:true},
  {name:"Travel Insurance Docs",      cat:"docs",    cost:0,   weight:0,    volume:0.12, bag:"Digital",          owned:false},
];

// ── Tier 2: Adaptive Packs — merged based on trip signals ──────
export const ADAPTIVE_PACKS = {
  tropical: [
    {name:"Lightweight Sun Hoodie",    cat:"clothes",  cost:75,  weight:0.55, volume:0.8,  bag:"Backpack", owned:false},
    {name:"Insect Repellent",          cat:"health",   cost:0,   weight:0.15, volume:0.2,  bag:"Backpack", owned:false},
    {name:"Reef-Safe Sunscreen",       cat:"health",   cost:15,  weight:0.25, volume:0.3,  bag:"Backpack", owned:false},
  ],
  cold: [
    {name:"Down Jacket",               cat:"clothes",  cost:200, weight:1.2,  volume:3,    bag:"Backpack", owned:false},
    {name:"Thermal Base Layer",        cat:"clothes",  cost:80,  weight:0.3,  volume:0.5,  bag:"Backpack", owned:false},
    {name:"Warm Beanie",               cat:"clothes",  cost:25,  weight:0.1,  volume:0.2,  bag:"Backpack", owned:false},
  ],
  dive: [
    {name:"Dive Mask",                 cat:"dive",     cost:100, weight:0.5,  volume:0.85, bag:"Backpack", owned:false},
    {name:"Dive Computer",             cat:"dive",     cost:300, weight:0.2,  volume:0.12, bag:"Backpack", owned:false},
    {name:"Surface Marker Buoy",       cat:"dive",     cost:20,  weight:0.35, volume:0.45, bag:"Backpack", owned:false},
    {name:"Reef Hook",                 cat:"dive",     cost:15,  weight:0.2,  volume:0.2,  bag:"Backpack", owned:false},
    {name:"Mesh Dive Bag",             cat:"dive",     cost:20,  weight:0.3,  volume:0.3,  bag:"Backpack", owned:false},
    {name:"Mask Defog",                cat:"dive",     cost:12,  weight:0.05, volume:0.05, bag:"Backpack", owned:false},
    {name:"O-ring Kit",                cat:"dive",     cost:8,   weight:0.05, volume:0.05, bag:"Backpack", owned:false},
    {name:"Zip Ties",                  cat:"dive",     cost:5,   weight:0.02, volume:0.02, bag:"Backpack", owned:false},
  ],
  creator: [
    {name:"Laptop",                    cat:"creator",  cost:0,   weight:4.7,  volume:1,    bag:"Global Briefcase", owned:true},
    {name:"Action Camera",             cat:"creator",  cost:290, weight:0.4,  volume:0.2,  bag:"Global Briefcase", owned:false},
    {name:"Compact Travel Tripod",     cat:"creator",  cost:35,  weight:0.3,  volume:0.3,  bag:"Backpack",         owned:false},
    {name:"Wireless Lavalier Mic",     cat:"creator",  cost:75,  weight:0.1,  volume:0.1,  bag:"Global Briefcase", owned:false},
    {name:"Portable SSD",              cat:"creator",  cost:130, weight:0.12, volume:0.03, bag:"Global Briefcase", owned:false},
    {name:"Camera Organizer Cube",     cat:"creator",  cost:60,  weight:0.7,  volume:3,    bag:"Backpack",         owned:false},
  ],
  adventure: [
    {name:"Hiking Boots",              cat:"adventure",cost:180, weight:2.0,  volume:4,    bag:"Worn",     owned:false},
    {name:"Rain Jacket",               cat:"adventure",cost:120, weight:0.5,  volume:1,    bag:"Backpack", owned:false},
    {name:"Headlamp",                  cat:"adventure",cost:30,  weight:0.1,  volume:0.15, bag:"Backpack", owned:false},
    {name:"Trekking Poles (compact)",  cat:"adventure",cost:60,  weight:0.5,  volume:1.5,  bag:"Backpack", owned:false},
  ],
  moto: [
    {name:"Riding Gloves",             cat:"moto",     cost:60,  weight:0.3,  volume:0.5,  bag:"Backpack", owned:false},
    {name:"Riding Jacket",             cat:"moto",     cost:200, weight:1.5,  volume:3,    bag:"Worn",     owned:false},
  ],
  safari: [
    {name:"Binoculars",                cat:"safari",   cost:150, weight:0.7,  volume:1,    bag:"Backpack", owned:false},
    {name:"Neutral Tone Clothes Set",  cat:"safari",   cost:100, weight:0.8,  volume:1.2,  bag:"Backpack", owned:false},
  ],
  long: [
    {name:"Travel Merino Wool Bundle", cat:"clothes",  cost:280, weight:0.3,  volume:0.4,  bag:"Backpack", owned:false},
    {name:"Electric Razor Set",        cat:"health",   cost:75,  weight:0.3,  volume:0.5,  bag:"Backpack", owned:true},
    {name:"Anti-diarrheal Tablets",    cat:"health",   cost:0,   weight:0.05, volume:0.05, bag:"Backpack", owned:false},
    {name:"Motion Sickness Pills",     cat:"health",   cost:0,   weight:0.05, volume:0.05, bag:"Backpack", owned:true},
  ],
  luxury: [
    {name:"1 Button Shirt",            cat:"clothes",  cost:50,  weight:0.25, volume:0.4,  bag:"Backpack", owned:false},
    {name:"2 Hats",                    cat:"clothes",  cost:0,   weight:0.2,  volume:0.8,  bag:"Worn",     owned:true},
  ],
  culture: [
    {name:"1 Button Shirt",            cat:"clothes",  cost:50,  weight:0.25, volume:0.4,  bag:"Backpack", owned:false},
    {name:"Compact Travel Drone",      cat:"creator",  cost:350, weight:0.6,  volume:0.6,  bag:"Global Briefcase", owned:false},
  ],
  couple: [
    {name:"Shared Toiletry Bag",       cat:"health",   cost:0,   weight:0.3,  volume:1.5,  bag:"Backpack", owned:false},
  ],
  driving: [
    {name:"International Drivers Permit",cat:"docs",   cost:0,   weight:0.01, volume:0.01, bag:"Global Briefcase", owned:true},
  ],
};

// ── Tier 3: Build Trip Pack — base + adaptive layers ──────────
export function buildTripPack(pp, tp) {
  const t = Date.now();
  let items = [...BASE_PACK];

  const climate = pp?.climate || 'mediterranean';
  if (climate.includes('tropical') || climate.includes('hot')) items.push(...ADAPTIVE_PACKS.tropical);
  if (climate.includes('cool') || climate.includes('cold') || climate.includes('alpine')) items.push(...ADAPTIVE_PACKS.cold);

  const activities = pp?.activities || [];
  const cats = pp?.categories || [];
  if (cats.includes('dive') || activities.includes('diving')) items.push(...ADAPTIVE_PACKS.dive);
  if (cats.includes('creator')) items.push(...ADAPTIVE_PACKS.creator);
  if (cats.includes('adventure') || activities.includes('trekking')) items.push(...ADAPTIVE_PACKS.adventure);
  if (cats.includes('moto')) items.push(...ADAPTIVE_PACKS.moto);
  if (cats.includes('safari')) items.push(...ADAPTIVE_PACKS.safari);

  const dur = pp?.duration || 'medium';
  if (dur === 'long') items.push(...ADAPTIVE_PACKS.long);

  const style = tp?.style || '';
  if (style === 'Luxury' || style === 'Comfort & Quality') items.push(...ADAPTIVE_PACKS.luxury);
  if (activities.some(a => ['city-walking','fine-dining','culture'].includes(a))) items.push(...ADAPTIVE_PACKS.culture);
  if (tp?.group === 'couple') items.push(...ADAPTIVE_PACKS.couple);
  if (cats.includes('moto') || activities.includes('driving')) items.push(...ADAPTIVE_PACKS.driving);

  // Deduplicate by name (first occurrence wins — base layer takes priority for owned status)
  const seen = new Map();
  items.forEach(item => { const k = item.name.toLowerCase(); if (!seen.has(k)) seen.set(k, item); });

  const ess = (pp?.essentialItems || []).map(n => n.toLowerCase());
  const opt = (pp?.optionalItems || []).map(n => n.toLowerCase());

  return [...seen.values()].map((item, i) => ({
    ...item,
    id: t + i,
    status: item.owned ? 'owned' : 'needed',
    essential: ess.some(e => item.name.toLowerCase().includes(e)),
    optional: opt.some(o => item.name.toLowerCase().includes(o)),
  }));
}

// ── Default Pack List (fallback — no packProfile) ──────────────
export function getDefaultPack() {
  const t = Date.now();
  return [
    {id:t+1, name:"45L Travel Backpack",           cat:"travel", cost:299,weight:4.5, volume:2.2, bag:"Backpack",         owned:true},
    {id:t+2, name:"Travel Laptop Briefcase",       cat:"travel", cost:150,weight:2.2, volume:1.8, bag:"Global Briefcase", owned:false},
    {id:t+3, name:"Packable Day Bag",              cat:"travel", cost:65, weight:0.4, volume:0.6, bag:"Backpack",         owned:true},
    {id:t+4, name:"Camera Organizer Cube",         cat:"travel", cost:60, weight:0.7, volume:3,   bag:"Backpack",         owned:false},
    {id:t+5, name:"Tech Organizer Pouch",          cat:"tech",   cost:60, weight:0.5, volume:1.5, bag:"Global Briefcase", owned:true},
    {id:t+10,name:"Medium Packing Cube",           cat:"clothes",cost:0,  weight:0.22,volume:8,   bag:"Backpack",         owned:true},
    {id:t+11,name:"Small Packing Cube",            cat:"clothes",cost:0,  weight:0.2, volume:4,   bag:"Backpack",         owned:true},
    {id:t+12,name:"2 T-Shirts",                    cat:"clothes",cost:0,  weight:0.4, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+13,name:"Lightweight Sun Hoodie",        cat:"clothes",cost:75, weight:0.55,volume:0.8, bag:"Backpack",         owned:false},
    {id:t+14,name:"1 Button Shirt",                cat:"clothes",cost:50, weight:0.25,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+15,name:"1 Lightweight Pants",           cat:"clothes",cost:0,  weight:0.45,volume:0.6, bag:"Backpack",         owned:true},
    {id:t+16,name:"1 Swim Shorts",                 cat:"clothes",cost:0,  weight:0.2, volume:0.3, bag:"Backpack",         owned:true},
    {id:t+17,name:"2 Underwear",                   cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+18,name:"2 Socks",                       cat:"clothes",cost:0,  weight:0.1, volume:0.15,bag:"Backpack",         owned:true},
    {id:t+19,name:"Travel Merino Wool Bundle",     cat:"clothes",cost:280,weight:0.3, volume:0.4, bag:"Backpack",         owned:false},
    {id:t+20,name:"Flip Flops",                    cat:"clothes",cost:100,weight:0.4, volume:1.2, bag:"Backpack",         owned:true},
    {id:t+21,name:"2 Hats",                        cat:"clothes",cost:0,  weight:0.2, volume:0.8, bag:"Worn",             owned:true},
    {id:t+25,name:"Charging Cables",               cat:"tech",   cost:0,  weight:0.2, volume:0.3, bag:"Global Briefcase", owned:true},
    {id:t+26,name:"Universal Power Adapter",       cat:"tech",   cost:0,  weight:0.2, volume:0.35,bag:"Global Briefcase", owned:true},
    {id:t+27,name:"Portable Power Bank",           cat:"tech",   cost:0,  weight:0.2, volume:0.4, bag:"Global Briefcase", owned:true},
    {id:t+31,name:"Laptop",                        cat:"creator",cost:0,  weight:4.7, volume:1,   bag:"Global Briefcase", owned:true},
    {id:t+33,name:"Action Camera",                 cat:"creator",cost:290,weight:0.4, volume:0.2, bag:"Global Briefcase", owned:true},
    {id:t+34,name:"Compact Travel Drone",          cat:"creator",cost:350,weight:0.6, volume:0.6, bag:"Global Briefcase", owned:false},
    {id:t+35,name:"Portable SSD",                  cat:"creator",cost:130,weight:0.12,volume:0.03,bag:"Global Briefcase", owned:false},
    {id:t+36,name:"Compact Travel Tripod",         cat:"creator",cost:35, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+39,name:"Wireless Lavalier Mic",         cat:"creator",cost:75, weight:0.1, volume:0.1, bag:"Global Briefcase", owned:true},
    {id:t+40,name:"Smartphone",                    cat:"creator",cost:1500,weight:0.44,volume:0.1,bag:"Worn",             owned:false},
    {id:t+45,name:"Dive Mask",                     cat:"dive",   cost:100,weight:0.5, volume:0.8, bag:"Backpack",         owned:false},
    {id:t+46,name:"Dive Computer",                 cat:"dive",   cost:300,weight:0.2, volume:0.1, bag:"Backpack",         owned:false},
    {id:t+47,name:"Surface Marker Buoy",           cat:"dive",   cost:20, weight:0.35,volume:0.4, bag:"Backpack",         owned:false},
    {id:t+48,name:"Reef Hook",                     cat:"dive",   cost:15, weight:0.2, volume:0.2, bag:"Backpack",         owned:false},
    {id:t+49,name:"Mesh Dive Bag",                 cat:"dive",   cost:20, weight:0.3, volume:0.3, bag:"Backpack",         owned:false},
    {id:t+50,name:"Mask Defog",                    cat:"dive",   cost:12, weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+51,name:"O-ring Kit",                    cat:"dive",   cost:8,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+52,name:"Zip Ties",                      cat:"dive",   cost:5,  weight:0.02,volume:0.02,bag:"Backpack",         owned:false},
    {id:t+60,name:"Travel Wash Pouch",             cat:"health", cost:0,  weight:0.4, volume:2,   bag:"Backpack",         owned:true},
    {id:t+61,name:"Toothbrush & Paste",            cat:"health", cost:0,  weight:0.15,volume:0.18,bag:"Backpack",         owned:true},
    {id:t+63,name:"Electric Razor Set",            cat:"health", cost:75, weight:0.3, volume:0.5, bag:"Backpack",         owned:true},
    {id:t+68,name:"Small First Aid Kit",           cat:"health", cost:0,  weight:0.35,volume:3,   bag:"Backpack",         owned:false},
    {id:t+69,name:"Anti-diarrheal Tablets",        cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:false},
    {id:t+70,name:"Motion Sickness Pills",         cat:"health", cost:0,  weight:0.05,volume:0.05,bag:"Backpack",         owned:true},
    {id:t+80,name:"Passport",                      cat:"docs",   cost:200,weight:0.1, volume:0.1, bag:"Worn",             owned:true},
    {id:t+81,name:"Debit and Credit Cards",        cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Worn",             owned:true},
    {id:t+82,name:"Travel Insurance Docs",         cat:"docs",   cost:0,  weight:0,   volume:0.12,bag:"Digital",          owned:false},
    {id:t+83,name:"International Drivers Permit",  cat:"docs",   cost:0,  weight:0.01,volume:0.01,bag:"Global Briefcase", owned:true},
  ].map(i=>({...i,status:i.owned?"owned":"needed"}));
}

// ── Volume Fixer ─────────────────────────────────────────────
/** Replace volume 0 / missing with realistic liters (weight unchanged). */
export function fixPackItemVolume(item) {
  const v = parseFloat(item.volume);
  if (Number.isFinite(v) && v > 0) return item;
  const n = (item.name || "").toLowerCase();
  let vol = 0.25;
  if (/backpack|duffel|rucksack/.test(n)) vol = 2.2;
  else if (/briefcase/.test(n)) vol = 1.8;
  else if (/insurance|travel insurance/.test(n)) vol = 0.12;
  else if (/passport|permit|debit|credit card/.test(n)) vol = 0.08;
  else if (/charging cable|cable|adapter|dongle|usb/.test(n)) vol = 0.28;
  else if (/power bank/.test(n)) vol = 0.42;
  else if (/laptop|macbook/.test(n)) vol = 1;
  else if (/compact travel drone|drone/.test(n)) vol = 1.8;
  else if (/tripod/.test(n)) vol = 0.35;
  else if (/ssd|samsung t7|lav|lavalier|mic/.test(n)) vol = 0.12;
  else if (/action camera|gopro|smartphone/.test(n)) vol = 0.35;
  else if (/t-shirt|hoodie|button shirt|shirt|pants|shorts|merino|bundle/.test(n)) vol = 0.65;
  else if (/underwear|socks/.test(n)) vol = 0.15;
  else if (/flip flop/.test(n)) vol = 1.2;
  else if (/\bhat\b|2 hats/.test(n)) vol = 0.8;
  else if (/mask defog|zip tie|o-ring/.test(n)) vol = 0.05;
  else if (/dive mask/.test(n)) vol = 0.85;
  else if (/dive computer/.test(n)) vol = 0.12;
  else if (/surface marker|buoy/.test(n)) vol = 0.45;
  else if (/reef hook|mesh dive/.test(n)) vol = 0.35;
  else if (/anti-diarrheal|motion sickness/.test(n)) vol = 0.05;
  else if (/toothbrush|razor|wash pouch|electric razor/.test(n)) vol = 0.22;
  else if (/first aid/.test(n)) vol = 2.5;
  return { ...item, volume: vol };
}

// ── Batch Volume Mapper ──────────────────────────────────────
export function mapPackItemsWithVolumes(items) {
  if (!Array.isArray(items)) return items;
  return items.map(fixPackItemVolume);
}
