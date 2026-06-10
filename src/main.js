import './style.css';
// ============================================================
//  OPENMON — a tiny GBC-style monster game.  160x160, 16px tiles
// ============================================================
const cvs = document.getElementById('screen');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const W = 160, TILE = 16, VIEW = 10;          // 10x10 tiles visible

// ---------- tiny 3x5 pixel font ----------
const FONT = {
A:[2,5,7,5,5],B:[6,5,6,5,6],C:[3,4,4,4,3],D:[6,5,5,5,6],E:[7,4,6,4,7],F:[7,4,6,4,4],
G:[3,4,5,5,3],H:[5,5,7,5,5],I:[7,2,2,2,7],J:[1,1,1,5,2],K:[5,5,6,5,5],L:[4,4,4,4,7],
M:[5,7,5,5,5],N:[7,5,5,5,5],O:[2,5,5,5,2],P:[6,5,6,4,4],Q:[2,5,5,2,1],R:[6,5,6,6,5],
S:[3,4,2,1,6],T:[7,2,2,2,2],U:[5,5,5,5,7],V:[5,5,5,5,2],W:[5,5,5,7,5],X:[5,5,2,5,5],
Y:[5,5,2,2,2],Z:[7,1,2,4,7],
'0':[7,5,5,5,7],'1':[2,6,2,2,7],'2':[6,1,2,4,7],'3':[6,1,2,1,6],'4':[5,5,7,1,1],
'5':[7,4,6,1,6],'6':[3,4,7,5,7],'7':[7,1,2,2,2],'8':[7,5,2,5,7],'9':[7,5,7,1,6],
'!':[2,2,2,0,2],'?':[6,1,2,0,2],'.':[0,0,0,0,2],',':[0,0,0,2,4],':':[0,2,0,2,0],
'-':[0,0,7,0,0],'/':[1,1,2,4,4],"'":[2,2,0,0,0],'>':[4,2,1,2,4],' ':[0,0,0,0,0],
};
function drawText(s, x, y, col, scale=1){
  ctx.fillStyle = col;
  s = String(s).toUpperCase();
  let cx = x;
  for(const ch of s){
    const g = FONT[ch] || FONT['?'];
    for(let r=0;r<5;r++) for(let c=0;c<3;c++)
      if(g[r] & (4>>c)) ctx.fillRect(cx+c*scale, y+r*scale, scale, scale);
    cx += 4*scale;
  }
}
function wrap(s, max){           // word-wrap into lines of <= max chars
  const out=[]; let line='';
  for(const w of String(s).split(' ')){
    if((line+' '+w).trim().length > max){ out.push(line.trim()); line=w; }
    else line += ' '+w;
  }
  if(line.trim()) out.push(line.trim());
  return out;
}

// ---------- sprite builder: string rows + palette -> offscreen canvas ----------
function spr(rows, pal, w=16, h=16){
  const c = document.createElement('canvas'); c.width=w; c.height=h;
  const g = c.getContext('2d');
  for(let y=0;y<h;y++){
    const row = (rows[y]||'').padEnd(w,'.');
    for(let x=0;x<w;x++){
      const col = pal[row[x]];
      if(col){ g.fillStyle=col; g.fillRect(x,y,1,1); }
    }
  }
  return c;
}
function blank(base){ const c=document.createElement('canvas'); c.width=c.height=16;
  const g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,16,16); return {c,g}; }

// ---------- tiles ----------
const GR='#88c878', GRD='#509850', GRDD='#306830';
const tiles = {};

{ // plain grass: base + deterministic specks
  const {c,g} = blank(GR); g.fillStyle = GRD;
  [[2,3],[7,1],[12,5],[4,9],[10,11],[14,13],[1,14],[6,6],[13,2],[9,15]]
    .forEach(([x,y])=>g.fillRect(x,y,1,1));
  tiles.G = c;
}
{ // tall grass
  tiles.W = spr([
    "................",
    "..s..s....s..s..",
    "..ss.s.s..ss.s..",
    ".sssss.ss.sssss.",
    "..sss.ssss.sss..",
    ".s.s.s.ss.s.s.s.",
    "................",
    ".....s......s...",
    ".s..ss..s..ss...",
    ".ss.s.s.ss.s.s..",
    ".sssss.s.sssss..",
    "..sss.sss.sss...",
    ".s.s.s.s.s.s.s..",
    "................",
    "....s.....s.....",
    "...sss...sss....",
  ], {'.':GR, s:GRDD});
}
{ // tree
  tiles.T = spr([
    "....dddddddd....",
    "..ddlllllllldd..",
    ".dlllgllgllllld.",
    ".dllgllllgllgld.",
    "dlllllgllllllld.",
    "dllgllllgllglld.",
    "dlllgllllllllld.",
    ".dllllgllgllld..",
    ".ddlglllllgldd..",
    "..dddddddddd....",
    "....dbbbbd......",
    "....dbbbbd......",
    "....dbbbbd......",
    "...dbbbbbbd.....",
    "................",
    "................",
  ], {'.':GR, d:'#284828', l:'#48a048', g:'#70c860', b:'#886040'});
}
{ // water (2 animated frames)
  tiles.A = [];
  for(let f=0; f<2; f++){
    const {c,g} = blank('#5090e8'); g.fillStyle='#90c0f8';
    const o = f*4;
    [[2,2],[3,2],[10,4],[11,4],[5,8],[6,8],[12,11],[13,11],[1,13],[2,13]]
      .forEach(([x,y])=>g.fillRect((x+o)%14+1, y, 1, 1));
    g.fillStyle='#3068b8';
    [[7,1],[14,6],[3,5],[9,13],[14,14]].forEach(([x,y])=>g.fillRect((x+o)%14+1,y,1,1));
    tiles.A.push(c);
  }
}
{ // path
  const {c,g} = blank('#e0c890'); g.fillStyle='#b89860';
  [[3,2],[11,3],[6,7],[13,9],[2,11],[9,13],[14,14],[5,15],[1,6],[8,1]]
    .forEach(([x,y])=>g.fillRect(x,y,1,1));
  tiles.P = c;
}
{ // flowers
  const {c,g} = blank(GR);
  g.fillStyle=GRD; [[1,1],[14,6],[7,14]].forEach(([x,y])=>g.fillRect(x,y,1,1));
  for(const [fx,fy] of [[3,3],[10,9]]){
    g.fillStyle='#e84848';
    g.fillRect(fx,fy-1,1,1); g.fillRect(fx,fy+1,1,1);
    g.fillRect(fx-1,fy,1,1); g.fillRect(fx+1,fy,1,1);
    g.fillStyle='#f8e858'; g.fillRect(fx,fy,1,1);
  }
  tiles.F = c;
}
{ // sign
  tiles.S = spr([
    "................",
    "..dddddddddddd..",
    "..dwwwwwwwwwwd..",
    "..dwddwdwddwwd..",
    "..dwwwwwwwwwwd..",
    "..dwdwddwdwwwd..",
    "..dwwwwwwwwwwd..",
    "..dddddddddddd..",
    "......dbbd......",
    "......dbbd......",
    "......dbbd......",
    ".....dbbbbd.....",
    "................",
    "................",
    "................",
    "................",
  ], {'.':GR, d:'#583818', b:'#a87840', w:'#d8b878'});
}

{ // rock boulder
  tiles.R = spr([
    "................",
    "................",
    "....kkkkkk......",
    "...kglllggk.....",
    "..kgglggggdk....",
    ".kgglggggggdk...",
    ".kglgggggggdk...",
    ".kggggggggggk...",
    ".kggggggggddk...",
    ".kgdggggggddk...",
    "..kddddddddk....",
    "...kkkkkkkk.....",
    "................",
    "................",
    "................",
    "................",
  ], {'.':GR, k:'#404048', g:'#909098', l:'#c8c8d0', d:'#686870'});
}
{ // house roof
  const {c,g} = blank('#c85048');
  g.fillStyle='#982c28'; for(let y=3;y<16;y+=4) g.fillRect(0,y,16,1);
  g.fillStyle='#e87868'; g.fillRect(0,0,16,2);
  tiles.o = c;
}
{ // house wall + window
  const {c,g} = blank('#e8d8b0');
  g.fillStyle='#b8a070'; g.fillRect(0,14,16,2); g.fillRect(0,0,16,1);
  g.fillStyle='#a08858'; g.fillRect(4,3,8,8);
  g.fillStyle='#385878'; g.fillRect(5,4,6,6);
  g.fillStyle='#88b8d8'; g.fillRect(6,5,2,2);
  tiles.h = c;
}
{ // house door
  const {c,g} = blank('#e8d8b0');
  g.fillStyle='#b8a070'; g.fillRect(0,0,16,1);
  g.fillStyle='#583818'; g.fillRect(3,3,10,13);
  g.fillStyle='#8a5a28'; g.fillRect(4,4,8,12);
  g.fillStyle='#f8d020'; g.fillRect(10,9,1,2);
  tiles.d = c;
}

// ---------- player sprites: spiky-haired kid, orange jacket, backpack ----------
const PPAL = {h:'#262e38', s:'#f8c890', k:'#101418', j:'#e89030', J:'#b06018',
              w:'#f8f0e0', p:'#3a5068', b:'#6a4a28'};
const P_DOWN0 = spr([
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhsssssssshh..",
  "...ssksssskss...",
  "...ssssssssss...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "..jjjjjwwjjjjj..",
  "..ssjjjwwjjjss..",
  "....jjjwwjjj....",
  "....JJJJJJJJ....",
  "....ppp..ppp....",
  "....ppp..ppp....",
  "...bbb....bbb...",
], PPAL);
const P_DOWN1 = spr([
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhsssssssshh..",
  "...ssksssskss...",
  "...ssssssssss...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "..jjjjjwwjjjjj..",
  "..ssjjjwwjjjss..",
  "....jjjwwjjj....",
  "....JJJJJJJJ....",
  ".....pppppp.....",
  "....bbbppp......",
  "....bbb.bbb.....",
], PPAL);
const P_UP0 = spr([
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "...shhhhhhhhs...",
  "...ssssssssss...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "..jjjbbbbbbjjj..",
  "..ssjbbbbbbjss..",
  "....jbbbbbbj....",
  "....JJJJJJJJ....",
  "....ppp..ppp....",
  "....ppp..ppp....",
  "...bbb....bbb...",
], PPAL);
const P_UP1 = spr([
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "...shhhhhhhhs...",
  "...ssssssssss...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "..jjjbbbbbbjjj..",
  "..ssjbbbbbbjss..",
  "....jbbbbbbj....",
  "....JJJJJJJJ....",
  ".....pppppp.....",
  "......pppbbb....",
  ".....bbb.bbb....",
], PPAL);
const P_SIDE0 = spr([            // faces LEFT; flipped for right
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hssssssshhhh..",
  "..sskssssshhh...",
  "...sssssssshh...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "...jjjjjjjjjb...",
  "...ssjjjjjjjb...",
  "....jjjjjjjj....",
  "....JJJJJJJJ....",
  "....pppppp......",
  "....ppp.ppp.....",
  "...bbb..bbb.....",
], PPAL);
const P_SIDE1 = spr([
  "....h..hh..h....",
  "...hhhhhhhhhh...",
  "..hhhhhhhhhhhh..",
  "..hhhhhhhhhhhh..",
  "..hssssssshhhh..",
  "..sskssssshhh...",
  "...sssssssshh...",
  "....ssssssss....",
  "....jjjjjjjj....",
  "...jjjjjjjjjb...",
  "...ssjjjjjjjb...",
  "....jjjjjjjj....",
  "....JJJJJJJJ....",
  "...ppp..ppp.....",
  "..bbb....ppp....",
  ".........bbb....",
], PPAL);
const PLAYER_SPR = {
  down:[P_DOWN0,P_DOWN1], up:[P_UP0,P_UP1], left:[P_SIDE0,P_SIDE1], right:[P_SIDE0,P_SIDE1],
};

// ---------- monsters ----------
const MON_SPR = {
  EMBIT: spr([
    "...rr......rr...",
    "..ryrr....rryr..",
    "..ryyrr..rryyr..",
    "..rrrrrrrrrrrr..",
    ".rrrrrrrrrrrrrr.",
    ".rrkrrrrrrrkrrr.",
    ".rrrrrrrrrrrrrr.",
    ".rorrrrkkrrrror.",
    "..rrrrrrrrrrrr..",
    "..rrrooooooorr..",
    ".rrrroooooorrrr.",
    ".rrrroooooorrr..",
    "..rrrooooorr..r.",
    "..rr.rrrrr.r.rr.",
    "........rrrrrr..",
    ".........rrr....",
  ], {r:'#e85838', o:'#f8b068', y:'#f8e0a0', k:'#181818'}),
  SPRIGBY: spr([
    "......gG........",
    ".....GbbG.......",
    "....GbbbbG......",
    ".....GG.........",
    "....gggggg......",
    "...gggggggg.....",
    "..ggkgggggkg....",
    "..gggggggggg....",
    ".ggggg.oo.ggg...",
    ".glgggggggglg...",
    ".gllgggggllgg...",
    ".ggllllllllgg...",
    "..gggggggggg....",
    "...gggggggg.....",
    "....oo..oo......",
    "...oo....oo.....",
  ], {g:'#58b858', G:'#287828', l:'#a0e080', k:'#181818', o:'#e8a030', b:'#70c860'}),
  DRIPPA: spr([
    ".......u........",
    "......uuu.......",
    "......uuu.......",
    ".....uuuuu......",
    "....uuuuuuu.....",
    "...uuluuuuuu....",
    "..uuluuuuuuuu...",
    "..uwkuuuuwkuu...",
    ".uuuuuuuuuuuuu..",
    ".uuuuuUUUuuuuu..",
    ".uluuuuuuuuuuu..",
    ".uluuuuuuuuuUu..",
    "..uuuuuuuuuuU...",
    "..Uuuuuuuuuuu...",
    "...UUuuuuuUU....",
    "....UUUUUUU.....",
  ], {u:'#48a0e8', U:'#2870b0', l:'#a8d8f8', w:'#f8f8f8', k:'#181818'}),
};
const DEX = {
  EMBIT:   {hp:22, atk:6, def:3, move:'EMBER',      type:'FIRE'},
  SPRIGBY: {hp:18, atk:5, def:2, move:'LEAF JAB',   type:'GRASS'},
  DRIPPA:  {hp:20, atk:5, def:3, move:'BUBBLE',     type:'WATER'},
};
function makeMon(name, lv){
  const d = DEX[name];
  const hp = d.hp + lv*2;
  return {name, lv, hp, maxhp:hp, atk:d.atk+lv, def:d.def+(lv>>1), move:d.move};
}

// ---------- map (40 x 34): home meadow S, deep woods NW, lake NE ----------
const MAP = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGTTGGGGTTGGGGGGGGGGGGGGGGGGGGTTGGGGT",
  "TGWWWGGTTGGGWWWWGGGGGGGGGGGFFGGGGTTGGGGT",
  "TGWWWGGTTGGWWWWWGGSPGGGGGGGFFGGGGGGRGGGT",
  "TGWWWGGGGGGWWWWWGGGPGGGGGGGAAAAAAAAGGGGT",
  "TGGRGTTGGGGGWWGGGGGPGGGGGGAAAAAAAAAAGGGT",
  "TGTTTGGWWGGGWWGGGGGPGGGGGGAAAAAAAAAAGGGT",
  "TGTTTGGWWGGGWWGGTTGPGGGGGGAAAAAAAAAAGGGT",
  "TGTTTGGGGGGGGGGGTTGPGFFGGGAAAAAAAAAAGGGT",
  "TGGGGGWWWGGGGGGGGGGPGFFGGGAAAAAAAAAAGGGT",
  "TGGGGGWWWGGWWWGGGGGPGGGGGGGAAAAAAAAGGGGT",
  "TGRGGGWWWGGWWWGGGGGPGGGGGGGGAAAAAAGGRGGT",
  "TGGGGGGGGGGGGGGGGGGPGGSGGGGGGGGGGGGGGGGT",
  "TGPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPGT",
  "TGGGGGGGGGGGGGGGGGGPGGGGGGGGGGGWWWGGGGGT",
  "TGFFGGGGGGGGGTTGGGGPGGWWWWWWGGGWWWGGGGGT",
  "TGFFGGGGGGGGGTTGGGGPGGWWWWWWGGGWWWGGRGGT",
  "TGGGGGWWGGGGGGGGGGGPGGWWWWWWGGGGGGGGGGGT",
  "TGGGGGWWGGGGGGGGGGGPGGWWWWWWGGFFGGGGGGGT",
  "TGGGGGGGGGGTTGGGGGGPGGGGGGGGGGFFGGGGGGGT",
  "TGRGGGGGGGGTTGGGGGGPGGGGTTGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGPGGGGTTGGGGWWGGTTGGGT",
  "TGGGGGGGGGGGGGGGGGGPGGGGGGGGGGWWGGTTGGGT",
  "TGGGGoooGGGGGGGGGGGPGGWWWGGGGGGGGGGGGGGT",
  "TGGGGhdhGGGGGGGGGGGPGGWWWGGGGGGGGRGGGGGT",
  "TGGGGGGGSGGGGGGGGGGPGGWWWGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGPGGGGGGGGGGGGGGGGGGGT",
  "TGPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPGT",
  "TGGGGGGGGGGFFGGGGGGPGGGGWWWGGGGGGGGGGGGT",
  "TGWWWGGGGGGFFGGGGGGPGGGGWWWGGGGTTGGGGGGT",
  "TGWWWGGGGGGGGGGGGGGPGGGGWWWGGGGTTGGFFGGT",
  "TGWWWGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGFFGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAPW = MAP[0].length, MAPH = MAP.length;
const tileAt = (x,y)=> (x<0||y<0||x>=MAPW||y>=MAPH) ? 'T' : (MAP[y][x]||'G');
const solid  = t => 'TASRohd'.includes(t);
const SIGNS = {
  '8,25':  "HOME SWEET HOME! KNOCK ON THE DOOR (A) TO REST UP.",
  '18,3':  "DEEP WOODS: STRONG WILD MONS LIVE UP NORTH!",
  '22,12': "LAKE BUBBLE: DRIPPA SPLASH IN THE WATERS NEARBY.",
};
const HOME = {tx:6, ty:26};
const INTRO_TEXT = "WELCOME TO OPENMON! WILD MONS LURK IN TALL GRASS. NAP AT HOME TO HEAL UP.";

// ---------- audio (tiny GB-ish blips) ----------
let AC=null;
function beep(freq=880, dur=0.06, type='square', vol=0.04, slide=0){
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended') AC.resume();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq;
    if(slide) o.frequency.linearRampToValueAtTime(freq+slide, AC.currentTime+dur);
    g.gain.value=vol; g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime+dur);
    o.connect(g); g.connect(AC.destination);
    o.start(); o.stop(AC.currentTime+dur);
  }catch(e){}
}
const sfx = {
  a:    ()=>beep(980,0.05),
  b:    ()=>beep(540,0.05),
  bump: ()=>beep(140,0.06,'square',0.03),
  hit:  ()=>beep(220,0.12,'sawtooth',0.05,-120),
  enc:  ()=>{ beep(660,0.1,'square',0.04,300); setTimeout(()=>beep(880,0.12,'square',0.04,300),100); },
  heal: ()=>{ beep(660,0.08); setTimeout(()=>beep(880,0.08),90); setTimeout(()=>beep(1100,0.1),180); },
  faint:()=>beep(300,0.4,'sawtooth',0.05,-220),
  catch:()=>{ beep(500,0.08); setTimeout(()=>beep(750,0.08),100); setTimeout(()=>beep(1000,0.15),200); },
};

// ---------- input ----------
const held = {}, pressed = {};
const KEYMAP = {
  arrowup:'up', w:'up', arrowdown:'down', s:'down',
  arrowleft:'left', a:'left', arrowright:'right', d:'right',
  z:'a', ' ':'a', x:'b', backspace:'b', enter:'start', shift:'start',
};
addEventListener('keydown', e=>{
  const k = KEYMAP[e.key.toLowerCase()];
  if(!k) return;
  e.preventDefault();
  if(!held[k]) pressed[k]=true;
  held[k]=true;
});
addEventListener('keyup', e=>{
  const k = KEYMAP[e.key.toLowerCase()];
  if(k) held[k]=false;
});
// on-screen buttons
document.querySelectorAll('[data-k]').forEach(btn=>{
  const k = btn.dataset.k;
  const dn = e=>{ e.preventDefault(); if(!held[k]) pressed[k]=true; held[k]=true; btn.classList.add('held'); };
  const up = e=>{ e.preventDefault(); held[k]=false; btn.classList.remove('held'); };
  btn.addEventListener('pointerdown', dn);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
});
function take(k){ if(pressed[k]){ pressed[k]=false; return true; } return false; }

// ---------- game state ----------
let state = 'title';
let frame = 0;
const player = {
  tx:HOME.tx, ty:HOME.ty, px:HOME.tx*TILE, py:HOME.ty*TILE,
  dir:'down', moving:false, step:0,
  mon: makeMon('EMBIT',5),
  caught: 0,
};

// ---------- persistence ----------
const SAVE_KEY = 'openmon.save';
let hasSave = false;
try{ hasSave = !!localStorage.getItem(SAVE_KEY); }catch(e){}
let titleSel = 0;
function save(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      tx:player.tx, ty:player.ty, dir:player.dir,
      mon:player.mon, caught:player.caught,
    }));
    hasSave = true;
  }catch(e){}
}
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!d || !d.mon) return false;
    const base = makeMon(DEX[d.mon.name] ? d.mon.name : 'EMBIT', d.mon.lv|0 || 5);
    player.mon = Object.assign(base, d.mon);
    player.mon.hp = Math.max(0, Math.min(player.mon.hp|0, player.mon.maxhp));
    player.caught = d.caught|0;
    player.dir = ['up','down','left','right'].includes(d.dir) ? d.dir : 'down';
    player.tx = Math.min(MAPW-1, Math.max(0, d.tx|0));
    player.ty = Math.min(MAPH-1, Math.max(0, d.ty|0));
    if(solid(tileAt(player.tx,player.ty))){ player.tx=HOME.tx; player.ty=HOME.ty; }
    player.px = player.tx*TILE; player.py = player.ty*TILE;
    player.moving = false;
    return true;
  }catch(e){ return false; }
}
function newGame(){
  player.mon = makeMon('EMBIT',5);
  player.caught = 0; player.dir = 'down'; player.moving = false;
  player.tx = HOME.tx; player.ty = HOME.ty;
  player.px = player.tx*TILE; player.py = player.ty*TILE;
  save();
}
function goHome(){
  player.tx=HOME.tx; player.ty=HOME.ty;
  player.px=HOME.tx*TILE; player.py=HOME.ty*TILE;
  player.dir='down'; player.moving=false;
}
let rngSeed = 0x2F6E2B1;
function rnd(){ // deterministic-ish but seeded by steps; fine for a toy
  rngSeed ^= rngSeed<<13; rngSeed ^= rngSeed>>>17; rngSeed ^= rngSeed<<5;
  return ((rngSeed>>>0) % 1000)/1000;
}

// dialog box (overworld)
let dialog = null;   // {lines:[], page:0, shown:0}
function openDialog(text){
  dialog = {lines: wrap(text, 34), page:0, shown:0};
}

// pause menu
let menu = null;     // {sel:0}

// ---------- battle ----------
let battle = null;
let flashT = 0, pendingBattle = null;
function startBattle(){
  // north half is tougher; lakeside leans DRIPPA, woods lean SPRIGBY
  const north = player.ty < 14, lakeside = north && player.tx > 22;
  const pDrippa = lakeside ? 0.75 : north ? 0.3 : 0.5;
  const name = rnd() < pDrippa ? 'DRIPPA' : 'SPRIGBY';
  const lv = north ? 5 + Math.floor(rnd()*3) : 2 + Math.floor(rnd()*3);
  pendingBattle = {foe: makeMon(name,lv)};
  flashT = 40; sfx.enc();
}
function beginPending(){
  battle = {
    foe: pendingBattle.foe, you: player.mon,
    phase:'msg', sel:0, t:0,
    queue:[], shakeFoe:0, shakeYou:0, foeIn:-40,
  };
  pendingBattle = null;
  bmsg(`WILD ${battle.foe.name} APPEARED!`, ()=>{ battle.phase='menu'; });
}
function bmsg(text, then){
  battle.queue.push({lines:wrap(text,34), shown:0, then});
  if(battle.phase!=='end') battle.phase='msg';
}
function dmg(att, def){
  return Math.max(1, Math.floor(att.atk * (0.8+rnd()*0.5) - def.def/2));
}
function foeTurn(after){
  const d = dmg(battle.foe, battle.you);
  bmsg(`${battle.foe.name} USED TACKLE!`, ()=>{
    battle.shakeYou=14; sfx.hit();
    battle.you.hp = Math.max(0, battle.you.hp-d);
    if(battle.you.hp<=0){
      sfx.faint();
      bmsg(`${battle.you.name} FAINTED! YOU RUSH HOME...`, ()=>{
        battle=null; player.mon.hp=player.mon.maxhp;
        goHome(); save();
        state='world';
      });
    } else after();
  });
}
function battleMenuAct(){
  const opts = ['FIGHT','BALL','RUN'];
  const pick = opts[battle.sel];
  if(pick==='FIGHT'){
    const d = dmg(battle.you, battle.foe);
    bmsg(`${battle.you.name} USED ${battle.you.move}!`, ()=>{
      battle.shakeFoe=14; sfx.hit();
      battle.foe.hp = Math.max(0, battle.foe.hp-d);
      if(battle.foe.hp<=0){
        sfx.faint();
        bmsg(`WILD ${battle.foe.name} FAINTED!`, ()=>{
          bmsg(`${battle.you.name} GAINED ${8+battle.foe.lv*3} EXP!`, ()=>{ battle=null; state='world'; save(); });
        });
      } else foeTurn(()=>{ battle.phase='menu'; });
    });
  } else if(pick==='BALL'){
    const chance = 0.25 + 0.65*(1 - battle.foe.hp/battle.foe.maxhp);
    bmsg(`YOU THREW A MON BALL!`, ()=>{
      if(rnd() < chance){
        sfx.catch(); player.caught++;
        bmsg(`GOTCHA! ${battle.foe.name} WAS CAUGHT!`, ()=>{ battle=null; state='world'; save(); });
      } else {
        bmsg(`OH NO! IT BROKE FREE!`, ()=>foeTurn(()=>{ battle.phase='menu'; }));
      }
    });
  } else { // RUN
    if(rnd()<0.8){
      bmsg(`GOT AWAY SAFELY!`, ()=>{ battle=null; state='world'; save(); });
    } else {
      bmsg(`CAN'T ESCAPE!`, ()=>foeTurn(()=>{ battle.phase='menu'; }));
    }
  }
}

// ---------- drawing helpers ----------
function box(x,y,w,h){
  ctx.fillStyle='#f8f8f8'; ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#202038';
  ctx.fillRect(x,y,w,2); ctx.fillRect(x,y+h-2,w,2);
  ctx.fillRect(x,y,2,h); ctx.fillRect(x+w-2,y,2,h);
  ctx.fillStyle='#888898';
  ctx.fillRect(x+2,y+2,w-4,1); ctx.fillRect(x+2,y+2,1,h-4);
}
function hpbar(x,y,w,mon,showNum){
  drawText(mon.name, x, y, '#202038');
  drawText('L'+mon.lv, x+w-14, y, '#202038');
  drawText('HP', x, y+7, '#e83030');
  const bx = x+9, bw = w-19;
  ctx.fillStyle='#202038'; ctx.fillRect(bx,y+7,bw+2,5);
  ctx.fillStyle='#f8f8f8'; ctx.fillRect(bx+1,y+8,bw,3);
  const r = mon.hp/mon.maxhp;
  ctx.fillStyle = r>0.5 ? '#30b830' : r>0.2 ? '#e8a020' : '#e83030';
  ctx.fillRect(bx+1,y+8,Math.ceil(bw*r),3);
  if(showNum) drawText(`${mon.hp}/${mon.maxhp}`, bx, y+14, '#202038');
}
function drawTextbox(lines, shown, more){
  box(0, 120, 160, 40);
  let chars = Math.floor(shown);
  for(let i=0;i<Math.min(lines.length,3);i++){
    const take = Math.max(0, Math.min(lines[i].length, chars));
    drawText(lines[i].slice(0,take), 6, 127+i*9, '#202038');
    chars -= lines[i].length;
  }
  if(more && (frame>>4)&1) drawText('>', 150, 150, '#e83030');
}

// ---------- overworld ----------
function facingTile(){
  const d = {up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[player.dir];
  return [player.tx+d[0], player.ty+d[1]];
}
function updateWorld(){
  if(flashT>0) return;             // freeze during encounter flash
  // dialog open: only advance it
  if(dialog){
    const total = dialog.lines.reduce((a,l)=>a+l.length,0);
    if(dialog.shown < total) dialog.shown += 1.5;
    if(take('a')||take('b')){
      if(dialog.shown < total) dialog.shown = total;
      else { dialog=null; sfx.a(); }
    }
    return;
  }
  // pause menu
  if(menu){
    if(take('up'))   { menu.sel=(menu.sel+2)%3; sfx.b(); }
    if(take('down')) { menu.sel=(menu.sel+1)%3; sfx.b(); }
    if(take('b')||take('start')){ menu=null; sfx.b(); return; }
    if(take('a')){
      sfx.a();
      if(menu.sel===0){ player.mon.hp=player.mon.maxhp; sfx.heal(); save(); menu=null; openDialog(`${player.mon.name} IS FULLY RESTED!`); }
      else if(menu.sel===2) menu=null;
      // sel 1 = MON info, stays open (info is displayed in the menu)
    }
    return;
  }
  if(take('start')){ menu={sel:0}; sfx.a(); return; }
  if(take('a')){
    const [fx,fy] = facingTile();
    const t = tileAt(fx,fy);
    if(t==='S'){ sfx.a(); openDialog(SIGNS[fx+','+fy] || '...'); return; }
    if(t==='d'){
      sfx.heal(); player.mon.hp = player.mon.maxhp; save();
      openDialog('YOU TAKE A QUICK NAP INSIDE... HP FULLY RESTORED!');
      return;
    }
  }

  // movement
  if(!player.moving){
    let dir = null;
    if(held.up) dir='up'; else if(held.down) dir='down';
    else if(held.left) dir='left'; else if(held.right) dir='right';
    if(dir){
      player.dir = dir;
      const [nx,ny] = facingTile();
      if(!solid(tileAt(nx,ny))){
        player.moving = true; player.destx=nx; player.desty=ny;
      } else if((frame&15)===0) sfx.bump();
    }
  }
  if(player.moving){
    const sx = player.destx*TILE, sy = player.desty*TILE;
    const spd = 2;
    player.px += Math.sign(sx-player.px)*Math.min(spd, Math.abs(sx-player.px));
    player.py += Math.sign(sy-player.py)*Math.min(spd, Math.abs(sy-player.py));
    player.step += 0.18;
    if(player.px===sx && player.py===sy){
      player.moving=false; player.tx=player.destx; player.ty=player.desty;
      save();
      if(tileAt(player.tx,player.ty)==='W' && rnd()<0.13) startBattle();
    }
  } else player.step = 0;
}
function drawWorld(){
  // camera
  let camx = Math.round(player.px - (W-TILE)/2);
  let camy = Math.round(player.py - (W-TILE)/2);
  camx = Math.max(0, Math.min(MAPW*TILE-W, camx));
  camy = Math.max(0, Math.min(MAPH*TILE-W, camy));
  const wf = (frame>>5)&1;
  const tx0 = Math.floor(camx/TILE), ty0 = Math.floor(camy/TILE);
  for(let y=ty0; y<=ty0+VIEW; y++){
    for(let x=tx0; x<=tx0+VIEW; x++){
      const t = tileAt(x,y);
      const img = t==='A' ? tiles.A[wf] : (tiles[t]||tiles.G);
      ctx.drawImage(img, x*TILE-camx, y*TILE-camy);
    }
  }
  // player
  const f = player.moving ? (Math.floor(player.step)&1) : 0;
  const img = PLAYER_SPR[player.dir][f];
  const dx = Math.round(player.px-camx), dy = Math.round(player.py-camy)-2;
  if(player.dir==='right'){
    ctx.save(); ctx.translate(dx+16,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0); ctx.restore();
  } else ctx.drawImage(img,dx,dy);

  if(dialog){
    const total = dialog.lines.reduce((a,l)=>a+l.length,0);
    drawTextbox(dialog.lines, dialog.shown, dialog.shown>=total);
  }
  if(menu){
    box(72,4,84,86);
    const items=['REST','MON','CLOSE'];
    items.forEach((it,i)=>{
      drawText(it, 88, 12+i*10, '#202038');
      if(menu.sel===i) drawText('>', 80, 12+i*10, '#e83030');
    });
    ctx.fillStyle='#888898'; ctx.fillRect(78,44,72,1);
    const m = player.mon;
    drawText(m.name, 80, 50, '#202038');
    drawText(`LV${m.lv} ${m.hp}/${m.maxhp}`, 80, 58, '#505060');
    drawText(`CAUGHT: ${player.caught}`, 80, 70, '#505060');
    drawText('B: CLOSE', 80, 80, '#888898');
  }
}

// ---------- battle drawing/update ----------
function updateBattle(){
  battle.t++;
  if(battle.foeIn < 0) battle.foeIn += 2;
  if(battle.shakeFoe>0) battle.shakeFoe--;
  if(battle.shakeYou>0) battle.shakeYou--;

  if(battle.phase==='msg'){
    const m = battle.queue[0];
    if(!m){ battle.phase='menu'; return; }
    const total = m.lines.reduce((a,l)=>a+l.length,0);
    if(m.shown < total) m.shown += 1.6;
    if(take('a')||take('b')){
      if(m.shown<total) m.shown=total;
      else { battle.queue.shift(); sfx.a(); if(m.then) m.then(); }
    }
  } else if(battle.phase==='menu'){
    if(!battle) return;
    if(take('up')||take('left'))  { battle.sel=(battle.sel+2)%3; sfx.b(); }
    if(take('down')||take('right')){ battle.sel=(battle.sel+1)%3; sfx.b(); }
    if(take('a')){ sfx.a(); battleMenuAct(); }
  }
}
function drawBattle(){
  ctx.fillStyle='#f8f8e8'; ctx.fillRect(0,0,160,160);
  // platforms (stacked rects = chunky pixel ellipse)
  ctx.fillStyle='#b8d8a0';
  ctx.fillRect(96,52,52,4); ctx.fillRect(92,50,60,4); ctx.fillRect(96,56,52,2);
  ctx.fillRect(8,106,60,5); ctx.fillRect(4,103,68,4); ctx.fillRect(10,111,56,2);

  // foe (2x), slides in from left
  const fx = 100 + (battle.shakeFoe ? ((battle.shakeFoe&2)-1)*2 : 0) + Math.min(0,battle.foeIn);
  if(!(battle.shakeFoe&4) || battle.foe.hp<=0 ? true : (battle.shakeFoe&4)) {
    if(battle.foe.hp>0 || battle.phase!=='gone')
      ctx.drawImage(MON_SPR[battle.foe.name], fx, 22, 32, 32);
  }
  // your mon back view (3x, flipped, bottom-left)
  const yx = 16 + (battle.shakeYou ? ((battle.shakeYou&2)-1)*2 : 0);
  ctx.save(); ctx.translate(yx+44, 66); ctx.scale(-1,1);
  ctx.drawImage(MON_SPR[battle.you.name], 0, 0, 44, 44); ctx.restore();

  // info boxes
  box(4,4,76,22);   hpbar(8,8,66,battle.foe,false);
  box(80,92,76,28); hpbar(84,96,66,battle.you,true);

  // text / menu
  if(battle.phase==='msg' && battle.queue[0]){
    const m = battle.queue[0];
    const total = m.lines.reduce((a,l)=>a+l.length,0);
    drawTextbox(m.lines, m.shown, m.shown>=total);
  } else {
    box(0,120,160,40);
    drawText('WHAT WILL', 6, 127, '#202038');
    drawText(battle.you.name+' DO?', 6, 136, '#202038');
    box(88,120,72,40);
    ['FIGHT','BALL','RUN'].forEach((o,i)=>{
      drawText(o, 104, 126+i*10, '#202038');
      if(battle.sel===i) drawText('>', 95, 126+i*10, '#e83030');
    });
  }
}

// ---------- title ----------
function drawTitle(){
  ctx.fillStyle='#183048'; ctx.fillRect(0,0,160,160);
  ctx.fillStyle='#0f2438';
  for(let i=0;i<160;i+=8) ctx.fillRect(0,i,160,2);
  // logo
  drawText('OPENMON', 24, 30, '#f8d020', 4);
  drawText('OPENMON', 23, 29, '#e83030', 4);
  drawText('TINY MONSTER ADVENTURE', 36, 66, '#88c8e8');
  // bouncing mons
  const bob = Math.round(Math.sin(frame/16)*3);
  ctx.drawImage(MON_SPR.EMBIT,   30, 90+bob, 32, 32);
  ctx.drawImage(MON_SPR.SPRIGBY, 64, 90-bob, 32, 32);
  ctx.drawImage(MON_SPR.DRIPPA,  98, 90+bob, 32, 32);
  const opts = hasSave ? ['CONTINUE','NEW GAME'] : ['NEW GAME'];
  opts.forEach((o,i)=>{
    drawText(o, 66, 130+i*10, '#f8f8f8');
    if(titleSel===i && (frame>>3)&1) drawText('>', 58, 130+i*10, '#f8d020');
  });
  drawText('GBC STYLE - 2026', 50, 152, '#4a6a8a');
}

// ---------- main loop ----------
function tick(){
  frame++;
  if(state==='title'){
    drawTitle();
    const nOpts = hasSave ? 2 : 1;
    if(take('up')||take('down')){ titleSel=(titleSel+1)%nOpts; sfx.b(); }
    if(take('start')||take('a')){
      sfx.heal();
      const cont = hasSave && titleSel===0;
      if(cont && load()){ state='world'; }
      else { newGame(); state='world'; openDialog(INTRO_TEXT); }
    }
  }
  else if(state==='world'){
    updateWorld();
    drawWorld();
    if(flashT>0){          // encounter flash, then battle
      flashT--;
      if((flashT>>2)&1){ ctx.fillStyle='#000'; ctx.fillRect(0,0,160,160); }
      if(flashT===0){ state='battle'; beginPending(); }
    }
  }
  else if(state==='battle'){
    updateBattle();
    if(battle) drawBattle();
  }
  // clear edge-presses each frame so taps don't queue forever
  for(const k in pressed) pressed[k]=false;
  requestAnimationFrame(tick);
}
tick();
