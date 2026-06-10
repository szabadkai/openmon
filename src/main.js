import './style.css';
// ============================================================
//  OPENMON — a tiny GBC-style monster quest.  160x160, 16px tiles
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
'-':[0,0,7,0,0],'/':[1,1,2,4,4],"'":[2,2,0,0,0],'>':[4,2,1,2,4],'*':[0,5,2,5,0],' ':[0,0,0,0,0],
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
{ // cliff wall
  const {c,g} = blank('#889098');
  g.fillStyle='#6a7078';
  for(let y=0;y<16;y+=4){ g.fillRect(0,y+3,16,1); for(let x=((y/4)%2)*4;x<16;x+=8) g.fillRect(x,y,1,3); }
  g.fillStyle='#a8b0b8'; g.fillRect(0,0,16,1);
  tiles.C = c;
}
{ // shrine stone + altar
  for(const key of ['n','e']){
    const {c,g} = blank('#c0c8d0');
    g.fillStyle='#888ea0';
    g.fillRect(0,0,16,1); g.fillRect(0,15,16,1); g.fillRect(0,0,1,16); g.fillRect(15,0,1,16);
    if(key==='n'){ g.fillStyle='#9aa2b2'; g.fillRect(4,4,8,1); g.fillRect(4,8,8,1); g.fillRect(4,12,8,1); }
    else { g.fillStyle='#404860'; g.fillRect(5,5,6,6); g.fillStyle='#f8d020'; g.fillRect(7,7,2,2); }
    tiles[key] = c;
  }
}
{ // wooden bridge over water
  const {c,g} = blank('#5090e8');
  g.fillStyle='#a87840'; g.fillRect(0,2,16,12);
  g.fillStyle='#785020'; for(let x=0;x<16;x+=4) g.fillRect(x,2,1,12);
  g.fillStyle='#c8a060'; g.fillRect(0,2,16,1); g.fillRect(0,13,16,1);
  tiles.b = c;
}
{ // old stump (CUT)
  const {c,g} = blank(GR);
  g.fillStyle='#583818'; g.fillRect(3,6,10,7);
  g.fillStyle='#8a5a28'; g.fillRect(3,4,10,4);
  g.fillStyle='#c8a060'; g.fillRect(4,5,8,2);
  g.fillStyle='#8a5a28'; g.fillRect(6,5,2,1); g.fillRect(9,6,1,1);
  tiles.u = c;
}
{ // cracked rock (SMASH)
  const c=document.createElement('canvas'); c.width=c.height=16;
  const g=c.getContext('2d'); g.drawImage(tiles.R,0,0);
  g.fillStyle='#181820';
  [[7,3],[8,4],[7,5],[8,6],[7,7],[6,8],[7,9],[8,8]].forEach(([x,y])=>g.fillRect(x,y,1,1));
  tiles.x = c;
}
{ // shallow ford (SWIM)
  const {c,g} = blank('#78b0e8');
  g.fillStyle='#a8d0f0'; [[2,3],[6,7],[11,4],[4,12],[12,12],[9,10]].forEach(([x,y])=>g.fillRect(x,y,2,1));
  g.fillStyle='#90a0a8'; g.fillRect(3,8,2,2); g.fillRect(10,6,2,2); g.fillRect(7,13,2,2);
  tiles.a = c;
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

// ---------- monsters: shared pixel rows, evolutions are palette swaps ----------
const MROWS = {
  EMBIT: [
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
  ],
  SPRIGBY: [
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
  ],
  DRIPPA: [
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
  ],
  LUMEN: [
    "....y..yy..y....",
    ".....ywwwwy.....",
    "....ywwwwwwy....",
    "...ywwwwwwwwy...",
    "..ywwkwwwwkwwy..",
    "..ywwwwwwwwwwy..",
    ".ywwwwyyyywwwwy.",
    ".ywwwwwwwwwwwwy.",
    ".ywwwwwwwwwwwwy.",
    "..ywwwwwwwwwwy..",
    "..ywwywwwwyywy..",
    "...ywwwwwwwwy...",
    "....ywwwwwwy....",
    ".....ywwwwy.....",
    "....y.yyyy.y....",
    "...y...yy...y...",
  ],
  BRAMBLE: [
    "..t..........t..",
    "...t........t...",
    "..ggt......tgg..",
    ".gggggggggggggg.",
    ".ggkggggggggkgg.",
    ".gggggggggggggg.",
    "..gggtggggtggg..",
    "...gggggggggg...",
    "..tggggggggggt..",
    ".gggttggggttggg.",
    ".gggggggggggggg.",
    "..ggtggggggtgg..",
    "...gggggggggg...",
    "..t.gg.gg.gg.t..",
    "....tt.tt.tt....",
    "................",
  ],
  ROCKO: [
    "................",
    "....kkkkkkkk....",
    "...kggggggggk...",
    "..kglgggggglgk..",
    "..kggkggggkggk..",
    ".kgggggggggggsk.",
    ".kglgggggggggsk.",
    ".kgggggkkggggsk.",
    ".kggggggggggssk.",
    ".kgsgggggggssk..",
    "..kssgggggssk...",
    "..kkssssssskk...",
    "...kkkkkkkkk....",
    "..kgg.kk.ggk....",
    "..kgg....ggk....",
    "...kk....kk.....",
  ],
};
const MON_DEFS = {
  EMBIT:    [MROWS.EMBIT,   {r:'#e85838', o:'#f8b068', y:'#f8e0a0', k:'#181818'}],
  EMBLAZE:  [MROWS.EMBIT,   {r:'#c03018', o:'#f88030', y:'#f8d020', k:'#181818'}],
  SPRIGBY:  [MROWS.SPRIGBY, {g:'#58b858', G:'#287828', l:'#a0e080', k:'#181818', o:'#e8a030', b:'#70c860'}],
  SPRIGOAK: [MROWS.SPRIGBY, {g:'#2f8048', G:'#14501e', l:'#70b860', k:'#181818', o:'#b87820', b:'#3f9838'}],
  DRIPPA:   [MROWS.DRIPPA,  {u:'#48a0e8', U:'#2870b0', l:'#a8d8f8', w:'#f8f8f8', k:'#181818'}],
  DRIPTIDE: [MROWS.DRIPPA,  {u:'#2068c8', U:'#104888', l:'#78b8f0', w:'#f8f8f8', k:'#181818'}],
  MISTLE:   [MROWS.DRIPPA,  {u:'#9ab8c8', U:'#5a7888', l:'#d8ecf4', w:'#f8f8f8', k:'#283038'}],
  ROCKO:    [MROWS.ROCKO,   {k:'#404048', g:'#909098', l:'#c8c8d0', s:'#686870'}],
  ROCKLOPS: [MROWS.ROCKO,   {k:'#2a2a36', g:'#6a6a78', l:'#a8a8b8', s:'#48485a'}],
  BRAMBLE:  [MROWS.BRAMBLE, {g:'#88a838', t:'#506818', k:'#181818'}],
  LUMEN:    [MROWS.LUMEN,   {w:'#f8f8f0', y:'#f8d020', k:'#404060'}],
  NOX:      [MROWS.LUMEN,   {w:'#383048', y:'#7838a8', k:'#e83078'}],
};
const MON_SPR = {};
for(const [name,[rows,pal]] of Object.entries(MON_DEFS)) MON_SPR[name] = spr(rows,pal);

const DEX = {
  EMBIT:    {hp:22, atk:6, def:3, move:'EMBER',       type:'FIRE'},
  EMBLAZE:  {hp:30, atk:9, def:5, move:'FLARE',       type:'FIRE'},
  SPRIGBY:  {hp:18, atk:5, def:2, move:'LEAF JAB',    type:'GRASS'},
  SPRIGOAK: {hp:28, atk:8, def:5, move:'BRANCH SLAM', type:'GRASS'},
  DRIPPA:   {hp:20, atk:5, def:3, move:'BUBBLE',      type:'WATER'},
  DRIPTIDE: {hp:30, atk:8, def:6, move:'TORRENT',     type:'WATER'},
  BRAMBLE:  {hp:20, atk:6, def:4, move:'THORN WHIP',  type:'BUG'},
  ROCKO:    {hp:24, atk:6, def:6, move:'ROCK TOSS',   type:'ROCK'},
  ROCKLOPS: {hp:32, atk:8, def:8, move:'BOULDER',     type:'ROCK'},
  MISTLE:   {hp:22, atk:7, def:4, move:'HEX SPLASH',  type:'WATER'},
  LUMEN:    {hp:34, atk:6, def:4, move:'GLEAM',       type:'LIGHT'},
  NOX:      {hp:40, atk:8, def:6, move:'DARK GLEAM',  type:'SHADOW'},
};
const EVOLVE = {EMBIT:['EMBLAZE',14], SPRIGBY:['SPRIGOAK',14], DRIPPA:['DRIPTIDE',14], ROCKO:['ROCKLOPS',16]};
function makeMon(name, lv){
  const d = DEX[name];
  const hp = d.hp + lv*2;
  return {name, lv, hp, maxhp:hp, atk:d.atk+lv, def:d.def+(lv>>1), move:d.move, exp:0};
}
function applyLevel(m){            // recompute stats in place, keep hp ratio
  const d = DEX[m.name], ratio = m.hp/m.maxhp;
  m.maxhp = d.hp + m.lv*2; m.atk = d.atk + m.lv; m.def = d.def + (m.lv>>1); m.move = d.move;
  m.hp = Math.max(1, Math.round(m.maxhp*ratio));
}
const expNext = lv => lv*25;
function gainExp(m, amt, msgs){
  msgs.push(`${m.name} GAINED ${amt} EXP!`);
  m.exp = (m.exp||0) + amt;
  while(m.exp >= expNext(m.lv)){
    m.exp -= expNext(m.lv); m.lv++;
    const ev = EVOLVE[m.name];
    if(ev && m.lv >= ev[1]){ msgs.push(`WHAT? ${m.name} IS EVOLVING INTO ${ev[0]}!`); m.name = ev[0]; }
    applyLevel(m);
    msgs.push(`${m.name} GREW TO LV${m.lv}!`);
  }
}

// ---------- NPC sprites ----------
const ELDER_ROWS = [
  "................",
  "....gggggg......",
  "...gggggggg.....",
  "...gssssssg.....",
  "...skssssks.....",
  "...ssssssss.....",
  "...gssssssg.....",
  "...ggssssgg.....",
  "....rrrrrr......",
  "...rrrrrrrr.....",
  "..ssrrrrrrss....",
  "...rrrrrrrr.....",
  "...rrrrrrrr.....",
  "...rrrrrrrr.....",
  "....rrrrrr......",
  "...bb....bb.....",
];
const VILLAGER_ROWS = [
  "....kkkkkkkk....",
  "..kkkkkkkkkkkk..",
  "..kkkkkkkkkkkk..",
  "..kksssssssskk..",
  "...ssksssskss...",
  "...ssssssssss...",
  "....ssssssss....",
  "....cccccccc....",
  "..cccccccccccc..",
  "..ssccccccccss..",
  "....cccccccc....",
  "....cccccccc....",
  "....pppppppp....",
  "....ppp..ppp....",
  "....bbb..bbb....",
  "...bbb....bbb...",
];
const SKIN={s:'#f8c890', k:'#101418'};
const ELDER_S  = spr(ELDER_ROWS,    {...SKIN, g:'#c8c8d0', r:'#7a5a8a', b:'#48342a', k:'#101418'});
const HERMIT_S = spr(ELDER_ROWS,    {...SKIN, g:'#a8b8c0', r:'#2f6888', b:'#283848', k:'#101418'});
const MYSTIC_S = spr(ELDER_ROWS,    {...SKIN, g:'#d8c8e8', r:'#583878', b:'#382858', k:'#101418'});
const GUARD_S  = spr(VILLAGER_ROWS, {...SKIN, k:'#384858', c:'#8898a8', p:'#505868', b:'#383840'});
const VILL_S   = spr(VILLAGER_ROWS, {...SKIN, k:'#7a4a28', c:'#c86888', p:'#a04868', b:'#704828'});
const RANGER_S = spr(VILLAGER_ROWS, {...SKIN, k:'#385828', c:'#4f8838', p:'#2f5828', b:'#503818'});
const MINER_S  = spr(VILLAGER_ROWS, {...SKIN, k:'#806018', c:'#b89048', p:'#685028', b:'#403020'});

// ---------- map (90 x 70, generated by the world generator) ----------
const MAP = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGTGGGGGGGGGGGGGGGGGGGGGGGGGGGGTGGGGGGGGGGGGGGGGGGGGGAATTGGGGGGGGGGGGGGTTGGGTGGGGGGGTGT",
  "TGGGGGWGWGRGWWWGGGGTGTGGGGTTRGGRGGRGGGGGGWGWGTGGGGTGGGGGAAGGGGGGGWWWGGGGGGGGGGGGGGTGTGWWGT",
  "TGGGGGWGWGGGWTWGGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGGGGGGGGGGAAGGGGGGGGWWWGGGGGTGnnnGTGGTGWTWGT",
  "TGGGGGWTWWTGWWWGGGGGnnnGGGGGGGGGGGGGGGTGGGWWGGGGRWTWGGGGAAGGGGGGGGTTWWWGGGGGnenGTTGGWWWWGT",
  "TGGGGGGWWWGGGGGGTGGGnenGGGGGGGGGGGGGGGGGGGGGGTGGGWRWGGTGAAGGGGGGGGGTWWWWGGGGGGGGGTGGWGWGGT",
  "TGGGGGGGWGGGGGGGGGGGGPGGGGGGGGGGGGGGGGTGGGGGGTGGGWGGGGGGAAGGGGGGWGWGTWGGGGGGGGGGGGGGGWWTGT",
  "TGGGGGGGGTGGGGGGGGGGGPPPPPPPPPPTGGGGGGGGGGGGGGTGGGGGRGGGAAGGGGGGWWWGTGGGGGGGGGTWWGTGGGGTGT",
  "TGRGTWRGGGGGGGGGGTGGGGGGRGGGGGPTGGGGGGGGGGGGGTGGGGGGGGGGAAGGGGGGWWWGGGGTWTGGGGWWWGGGGGGTGT",
  "TGTGWWWGGGGGGGTGTGGGGGGGTGGGGGPGGGGGGGoooGGGGGGGGGGGGGGGAAGGGGGGGGGGGGGGWWGTTGWWWGGGGGGGGT",
  "TGGTWWWGGGGGGGGGGGGGGGTGGGGGGGPPPPPPPPhdhGGGGGGGGGGTGTGTAAGGWGWGGGGGGGGGWWWGGGGGGGGTGGTGGT",
  "TGGGGGGGGGGGGGGGGGGTGGGGGGGGGGPGGGGTTGGGGWGGGGGGGGGGGGGGAATGWWWGGGGGGTGGGGGTWWTGGTGTGGGTGT",
  "TGGTGGTGGGTGGGGGGGGGGGGGGGGGGGPGGGGGGWGGGWGGGGGGGGGGGGGGAATGWWWGGGGGGGGGGGWWGWGGGGGGGGGGGT",
  "TGGWWGGGGGGGTGGGGTGGGGGGGGGGGGPGGGGGGTWWWWGGGGGGGGTGGGGGAAGGTWWGGGGGGGGGGTWWWWGGTGGGGTGGGT",
  "TGGWWGGTGGGGGGGGGGGGGGGGGGGGGGPGGGGTGWWWGGGGTGGGTGGGGGGGAAGGWWWGGGGGGGGGGGWWWGTGGGGTGGGGGT",
  "TGGGTWGGGTGGGGGGGGGGGGGGGGGGGGPGGGGGGGGGGGGGGGGWWWGGTGGGAAGGGGGGGGGGGGGGGGGGGGGGGTGGGGGGGT",
  "TGGGGGTGRWWGGGGGGGGGGGGGGGGGRGPGGGGGGGGGGGGGGGGGTTGGGGGGAAGGTGGWWGGGGGGGGGGGGTGGGGGGGGGGGT",
  "TGGGGGGGWGWGGGGGGGGGGGGGGGGGGTPGGGGGGGGGGGGTGGGWWWGGGTGGAAGGGGoooGGGGGGGGGGTGGGGTGGGGWTWGT",
  "TGGGGGGGWWGGGGGGGGGGGGTGRGGGGGPGGRGGGGGGGGGGGGGGGGGGGGGGAAGGGGhdhGGGGGGWWGGGGGGTGGGGGWWWGT",
  "TGGGGGGGGGTGGGGGGGGGGGGGGTGGGGPTGGGGGWWWTGGGGGGGGWWWGGGGAAGGGGGGGGGGGGGGWTGGGGGGGGGGGGGWGT",
  "TTGGRGGGGTTGGGGGGGGGGGGGGGWWWGPGGGTGTWWWGGGGGGGGGGGWGGGGAAGGGGGGGGGTGGGWWGGGGGGTGGTGGGGGGT",
  "TGGGGGGGGGGGGGTGGGGGGGGTGGWWWGPGGGGGGGWWGGGGWWTGGTWWGGGGAAGGGGGGGGGGGGGGGGGGGGGGGTGGGGTGGT",
  "TGGGGGGTGTGGGGGGGGGGGGGGGGWWWGPGGGGGGTGGGGGGGWWGGGGTGGGGAAAAAAAAAAAAAAaAAAAAAAAAAAAAAAAAAT",
  "TGGGGGGGGGGGGTGGGGGGGGGGGGGGGGPGGTGGGGGGGGGGTGWGGGGGGGGGAAAAAAAAAAAAAAaAAAAAAAAAAAAAAAAAAT",
  "TGGGGGGTGGGGGRGGTGGGGGGGGGTGGGPGGGGGGGGGGGGGGGGGTGGGGGGGAAAAAAAAAAAAAAaAAAAAAAAAAAAAAAAAAT",
  "TGGGGGGGGGGGGGGRGGGGGGGGGGGGGGPGGTGGGGGGGGGTGGGGGGGGTGGGAAAAAAAAAAAAAAaAAAAAAAAAAAAAAAAAAT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGGGGGGPTGGTGGGGGGGGGGGGGGGGGGGGGAAAAAAAAAAAAAAbAAAAAAAAAAAAAAAAAAT",
  "TCCCCCCCCCCCCCCCCCCCCCCCCCCCCCPCCCCCCCCCCCCCCCCCCCCCCCCCCCGCCGGGGGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TCCCCCCCCCCCCCCCCCCCCCCCCCCCCCPCCCCCCCCCCCCCCCCCCCCCCCCCCCGCCGGGGGCGSGGGGGGCGGGGGGGGGCGGGT",
  "TCCCCCCCCCCCCCCCCCCCCCCCCCCCCCPCCCCCCCCCCCCCCCCCCCCCCCCCCCGCCGCGGGWWCGGCGGGGCGGGGGGGCCGGGT",
  "TGGGGTGGGGGGTTTTTTGGGGGGGGGGGGPGGGGGFGGGGGGGGGGGGGGGGGGGGGGCCGGGGCGRCGGGCCRGGRGGGGGGWWGCGT",
  "TTTGGGGTGGGTTTTTTTGGGGGGGGGGSGPGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCGGGGGWCCGGGRGGRCCGGGGGGGCGCGT",
  "TGGGGGGGGGGTTTTTTTGGGGGGGGGGGGPWGGGGGGGGGGGGGGGGGGGGGGGGGGGCCGGGGGCCGGGGGCGGCGGGGGGGGGCRGT",
  "TTGGGGGGGTTTTTTTTTGGGGGGTGGGGGPTWGGGGGGGGGGGGWGWGGGGGGGWWWGCCGGGGGGGGGGGGCGCGGRGGGGGGCGCGT",
  "TWWWGGGTGTGTTTTTTTGGGGFGGGGGGGPWWTGGGTGGGGGGSFAAAAAAAAGWWWGCCGGGGGGGGGGGGCGCCCGGCGGCGGGGGT",
  "TWWWWGGWTGGTTWWTTTGGGGGGGTGGGGPFWGGGGGGGGGGGGAAAAAAAAAAWWWGCCCGGGGGGGCGGGGGGGGCGGGGGGRCGGT",
  "TWWWWGTTWWGGWWGGTTGGGGGGGGGGGGPGGGGGGWGWGGWWGAAAAAAAAAAGGGGCCGGGGGCGGGGCGCGCGCGGCGGRGGGGGT",
  "TTTTTGGGWGGTTTTGTTGGGGGGGGGGGGPGGGGGGWWGGGGWWAAAAAAAAAAGGGGCCGGGGGCGGCGGCGGGGCCGCGGGGGGCGT",
  "TGGGTGGGTTGGGGGGTTTGGGGGGGGGGGPGGGGGGWWWGGWGWAAAAAAAAAAGGGGCCGGGGGGGGCGGRCGCCGGGGGGGGGGGGT",
  "TTGGGGGoooGGTTGGTTGGGGGGGGGGGGPGGGGGGGGGGGGGGAAAAAAAAAAGGGGCCGGGGGGCWGGGGGGGGCGCGCGGGRGGGT",
  "TGGTTGGGGGTGGGGGTTGGGGGGGGGGTGPGGGGGGGGGGGFGGAAAAAAAAAAGGGGCCGGGCGGGWCGRGCGWGGGGGGGGGCWRGT",
  "TGTTGGGGGGGGGGTTTTGGGGGWWGGGGGPGGGGTGGGGGGGGTAAAAAAAAAAGGGGCCGCGGGGGGCGGCGWWCCGGGGGGCWCWGT",
  "TGGTGGGGGGGTTGGGTTGGGGWWWGGGGGPGGGGGGGGGGFGGGAAAAAAAAAAGGFGCCGGCCGGGCWGGGGWWRGCGGGGRGWGWGT",
  "TTTWTGGTGGTGTGGTTTGGGTWWWGGGGGPTGGGGGGGGGGGGGGAAAAAAAAWGWGGCCGGGGoooCWGWGCRGGGGCGGGGCGCCGT",
  "TWWWGGTGGWWWGGGGTTGGGTGGGGWWWGPGGGGGGGGGTGGGGGGGGGGGGWWWWGGCCGCGChGGGGGGGGGGGGGGGGGGGGGGGT",
  "TTWTWGGGTTWWGGGTTTFGGGGGFGWFWGPGGGGGGGGGGGGGGGGFGGGWWWWWWGGCCGCGCGGGGGGGGGGGGGGGWRGGGGGGGT",
  "TGWTWGTTGWWTGGGGTTGGGGGGGGGWWFPGGGTGGGGGGGGGGGGGGGGWWWWWGGGCCGGGGGGGGGGGCGGCGWWWCGGCGGGGRT",
  "TGTWWGGGTWWWGGGTTTGGGGGGGGGGTGPGGGGGGGGGTGGGGGGGGGGWWWGGTSGCCRGGGGGGGGGGGCGGCWWWWCGGCGGCCT",
  "TGGTTGGTGTWTGGGGTTGGGGGTGGGGGGPPPPPPPPPPPPPPPPPPPPPPPPPPPPPxxGGGGGGGGGGGGGGGGGGGGGGGGGGRCT",
  "TTGGTGTTGGGTGTGTTTGGGGGGGGGGFGPGGGGWWWGGGGGGGGGGGGGGGGGGGGGCCGCGGGGCGGGCRGGGGGGCGGGGGGGGGT",
  "TGGGTGGTTTGTGGGTTTPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPCCGRCGGGGGGGGGGCGCGGGGGCGGCGGGT",
  "TGGGGGGGGGGGTGTTTTGSGGTGGTGGGGPGGGGGGGGGGGGGGGGGGFGGGGGGGGGCCGGGGGGGGGCCGGGCGGWCWGGGGGGGGT",
  "TGGGGGGGGGGGGGGGuuPPPPPPPPPPPPPTGGGGGGGGGGGGGGGGGFGGGGGGGGGCCGGRGGGGGGGGGGGGGCCWGGRGGCRGGT",
  "TGGGTGGGTGGTGGGGTTGGGGGGGGGGGGPGGGGGTGGTGGGGGGGGTGGGGGGGGGGCCGGGGGGGGGGGGGCGGCCWWGGGGGCCGT",
  "TGGGGGGGGTGGGGGGTTTGGGGGGGGGGGPGGGTGGGGGGGGGGGGGTGGGGGGGGGGCCGGGGGCGWWCGGGGGGGCGGGGGGGGCGT",
  "TGGGGTGGGGTGGGGTTTGGGTGGGGGGGGPGTGGGGFGGGGGGGGGGGGGGFGGGGFGCCGGGCGGWWWWGGGGGGGGGGGGGGGGRCT",
  "TGGGGGGTGGTTGTGGTTGGGGGGGGGGGGPGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCGCCCCGWWCWGGGGCGGGGGGGGGGGGGT",
  "TTTTGGTGGTGGGTTGTTGGGGGGGGGGGGPGGGGGGGGGGGGGGGGGGGGGGGGGGGGCCGGGCCGWWWGGGGGGGCGGGGGGCGGGGT",
  "TTTTTGTWWTTGGGGGTTGGGGGGoooGGGPGoooGGGGGGGGGGGGGGGGGGGGGGGGCCGGGGGGGGGGGCGGGCCGGGGGGGCGGGT",
  "TTTTTTGWWWWGGGGTTTGGGGGGhdhGGGPGhdhGGGGGGGGGGGGGGGGGGGGGGGGCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCT",
  "TTTTTGGTWWWGGGGGTTGGGPPPPPPPSPPPPPPPPPPPPPPPGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTGTGTWTGGGGTTGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTWTTTGGGGTTTGGGGGGGGGGGGGGGGGGGGGGGGGWWWGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTGGGGGGGGGTTGGGGGGGFGGGGGGFGGGGGGGGGGWGGGGGGWWWGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTGGTTGTGGTTGGGGGGGGGGGGGGGGWWWFGGGGGWWWWWGGWWWGGWWGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTGGGGTTTGTTTGGGGGGGGGGFGGGGGWWWGGFGGGGGWWWGGWWGGGWWWGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGTTTTGTGGGTTGTGTTGGGGGGGGGGGGGGGGWWWGGFGGGGGWWGGGGGGGGWWWGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGGGGGGGGGGGTTGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGGGGGGGGGGGTTGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAPW = 90, MAPH = MAP.length;
const cleared = new Set();          // cut stumps / smashed rocks, persisted
const tileAt = (x,y)=>{
  if(x<0||y<0||x>=MAPW||y>=MAPH) return 'T';
  return cleared.has(x+','+y) ? 'G' : (MAP[y][x]||'G');
};
const solid = t => 'TASRohdCneux'.includes(t);
const passable = t => !solid(t) && (t!=='a' || skills.swim);
const SIGNS = {
  '28,60': "OAKVALE VILLAGE. THE ELDER KNOWS THE OLD TALES.",
  '28,31': "SHRINE PASS: ONLY PROVEN TAMERS MAY ENTER.",
  '19,51': "WEST DEEPWOOD: OLD STUMPS CHOKE THE TRAIL. BRING A HATCHET.",
  '57,47': "CRAG CAVES: CRACKED ROCKS BAR THE WAY. BRING A PICK.",
  '68,28': "ISLE OF MIST: THE HERMIT WATCHES THE CROSSING.",
  '44,34': "LAKE BUBBLE: NO FISHING! DRIPPA BITE.",
};
const HOME = {tx:25, ty:60};
const ALTAR = '21,5', SPIRE = '77,4';
const INTRO_TEXT = ["THE SHRINE'S GLOW HAS FADED... FIND THE ELDER IN OAKVALE VILLAGE.",
                    "TIP: TALK WITH A. NAP AT ANY HUT DOOR TO HEAL AND SET YOUR CAMP."];

// ---------- story, skills, party ----------
const story  = {met:false, gate:false, lumen:false, ilex:false, boris:false, hermit:false, nox:false};
const skills = {cut:false, smash:false, swim:false};
const hasWaterMon = ()=>player.party.some(m=>DEX[m.name].type==='WATER');
const NPCS = [
  {x:33, y:61, img:ELDER_S, talk(){
    if(story.nox) openDialog("ELDER: YOU DROVE OFF NOX! OAKVALE SINGS YOUR NAME, TAMER!");
    else if(!story.met){ story.met=true; save();
      openDialog(["ELDER: THE SHRINE'S GLOW HAS FADED, AND WILD MONS GROW RESTLESS...",
                  "CATCH 3 WILD MONS TO PROVE YOUR BOND, THEN TAKE THE NORTH PASS.",
                  "THE SHRINE LIES BEYOND THE CLIFFS. SEEK THE ALTAR."]); }
    else if(!story.lumen) openDialog("ELDER: TALL GRASS HIDES WILD MONS. THE PASS GUARD COUNTS YOUR CATCHES.");
    else if(!skills.cut){ skills.cut=true; save();
      openDialog(["ELDER: NOX, THE SHADOW, HOARDS THE LIGHT? THEN TAKE MY OLD HATCHET.",
                  "(CUT UNLOCKED!) CLEAR THE STUMPS IN THE WEST DEEPWOOD.",
                  "RANGER ILEX KEEPS THE WOOD. SHE WILL TEST YOU."]); }
    else openDialog("ELDER: THE KEEPERS OF WOOD AND STONE AID PROVEN TAMERS. NOX WAITS PAST THE MIST.");
  }},
  {x:30, y:28, img:GUARD_S, gone:()=>story.gate, talk(){
    if(player.caught>=3){ story.gate=true; save();
      openDialog(["GUARD: THREE MONS STRONG! THE PASS IS OPEN.","MAY THE GLOW GUIDE YOU, TAMER."]); }
    else openDialog(`GUARD: HALT! ONLY PROVEN TAMERS PASS. CATCH ${3-player.caught} MORE WILD MONS.`);
  }},
  {x:29, y:62, img:VILL_S, talk(){
    openDialog(story.nox ? "THE NIGHTS GLOW SOFT AGAIN. THANK YOU!"
                         : "I SAW A LIGHT FLY NORTH PAST THE CLIFFS ONE NIGHT...");
  }},
  {x:5, y:33, img:RANGER_S, talk(){
    if(story.ilex) openDialog("ILEX: THE WOOD SINGS YOUR NAME. THE CRAG LIES EAST OF THE MEADOWS.");
    else startFight({trainer:'ILEX', troupe:[makeMon('BRAMBLE',11), makeMon('SPRIGOAK',13)], onWin(){
      story.ilex=true; skills.smash=true; save();
      openDialog(["ILEX: WELL FOUGHT, TAMER! TAKE MY QUARRY PICK.",
                  "(SMASH UNLOCKED!) CRACKED ROCKS BAR THE CRAG CAVES EAST OF THE MEADOWS."]);
    }});
  }},
  {x:82, y:30, img:MINER_S, talk(){
    if(story.boris) openDialog("BORIS: HAH! THE FORDS LIE NORTH. GIVE NOX A THUMP FROM ME.");
    else startFight({trainer:'BORIS', troupe:[makeMon('ROCKO',15), makeMon('ROCKLOPS',17)], onWin(){
      story.boris=true; skills.swim=true; save();
      openDialog(["BORIS: SOLID AS STONE, YOU ARE! TAKE MY OLD FINS.",
                  "(SWIM UNLOCKED!) SHALLOW FORDS NORTH OF HERE LEAD TO THE ISLE OF MIST."]);
    }});
  }},
  {x:70, y:26, img:HERMIT_S, gone:()=>story.hermit, talk(){
    if(hasWaterMon()){ story.hermit=true; save();
      openDialog(["HERMIT: AH... THE WATER KNOWS YOU. CROSS, FRIEND OF THE DEEP.",
                  "BEWARE: THE MIST TWISTS THE LIGHT."]); }
    else openDialog("HERMIT: ONLY A FRIEND OF WATER MAY CROSS. SHOW ME A WATER MON IN YOUR TEAM.");
  }},
  {x:61, y:19, img:MYSTIC_S, talk(){
    openDialog(story.nox ? "MYSTIC: THE MIST LIFTS. THE ISLE BREATHES AGAIN."
                         : "MYSTIC: REST IN THE HUT BEFORE THE SPIRE. NOX TWISTS WHAT IT TOUCHES.");
  }},
];
const npcAt = (x,y)=>NPCS.find(n=>!(n.gone&&n.gone()) && n.x===x && n.y===y);

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
  chop: ()=>beep(180,0.1,'square',0.06,-60),
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
  party: [makeMon('EMBIT',5)],
  mon: null,                       // always === party[0]
  caught: 0, boxed: 0, rest: null,
};
player.mon = player.party[0];
function setLeader(i){
  const [m] = player.party.splice(i,1);
  player.party.unshift(m); player.mon = m;
}

// ---------- persistence ----------
const SAVE_KEY = 'openmon.save';
let hasSave = false;
try{ hasSave = !!localStorage.getItem(SAVE_KEY); }catch(e){}
let titleSel = 0;
function save(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      tx:player.tx, ty:player.ty, dir:player.dir,
      party:player.party, caught:player.caught, boxed:player.boxed,
      rest:player.rest, story, skills, cleared:[...cleared],
    }));
    hasSave = true;
  }catch(e){}
}
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!d) return false;
    const raw = d.party || (d.mon ? [d.mon] : []);
    const party = raw.filter(m=>m && DEX[m.name]).map(m=>{
      const base = makeMon(m.name, Math.max(1, m.lv|0));
      base.hp = Math.max(0, Math.min(m.hp|0, base.maxhp));
      base.exp = Math.max(0, m.exp|0);
      return base;
    });
    if(!party.length) return false;
    player.party = party.slice(0,6); player.mon = player.party[0];
    player.caught = d.caught|0; player.boxed = d.boxed|0;
    player.rest = (d.rest && d.rest.tx!=null) ? d.rest : null;
    Object.assign(story, d.story||{}); Object.assign(skills, d.skills||{});
    cleared.clear(); for(const k of d.cleared||[]) cleared.add(String(k));
    player.dir = ['up','down','left','right'].includes(d.dir) ? d.dir : 'down';
    player.tx = Math.min(MAPW-1, Math.max(0, d.tx|0));
    player.ty = Math.min(MAPH-1, Math.max(0, d.ty|0));
    if(!passable(tileAt(player.tx,player.ty))){ player.tx=HOME.tx; player.ty=HOME.ty; }
    player.px = player.tx*TILE; player.py = player.ty*TILE;
    player.moving = false;
    return true;
  }catch(e){ return false; }
}
function newGame(){
  player.party = [makeMon('EMBIT',5)]; player.mon = player.party[0];
  for(const k in story) story[k]=false;
  for(const k in skills) skills[k]=false;
  cleared.clear();
  player.caught = 0; player.boxed = 0; player.rest = null;
  player.dir = 'down'; player.moving = false;
  player.tx = HOME.tx; player.ty = HOME.ty;
  player.px = player.tx*TILE; player.py = player.ty*TILE;
  save();
}
function goHome(){
  const r = player.rest || HOME;
  player.tx=r.tx; player.ty=r.ty;
  player.px=r.tx*TILE; player.py=r.ty*TILE;
  player.dir='down'; player.moving=false;
}
let rngSeed = 0x2F6E2B1;
function rnd(){
  rngSeed ^= rngSeed<<13; rngSeed ^= rngSeed>>>17; rngSeed ^= rngSeed<<5;
  return ((rngSeed>>>0) % 1000)/1000;
}

// dialog box (overworld); accepts a string or an array of pages
let dialog = null;   // {pages:[[lines]], page:0, shown:0}
function openDialog(text){
  const pages = (Array.isArray(text) ? text : [text]).map(t=>wrap(t,34));
  dialog = {pages, page:0, shown:0};
}

// pause menu (team screen)
let menu = null;     // {sel:0}

// ---------- battle ----------
let battle = null;
let flashT = 0, pendingBattle = null;
function wildFor(x,y){              // [common, rare, lvMin, lvMax]
  if(y<27 && x>55) return ['MISTLE','DRIPPA',16,22];   // isle of mist
  if(y>26 && x>58) return ['ROCKO','EMBIT',12,16];     // crag caves
  if(x<18 && y>29) return ['BRAMBLE','SPRIGBY',8,12];  // deepwood
  if(y<30) return ['SPRIGBY','DRIPPA',5,8];            // highlands
  return ['SPRIGBY','DRIPPA',2,5];                     // meadows
}
function startBattle(){
  const [a,b,lo,hi] = wildFor(player.tx, player.ty);
  const name = rnd()<0.6 ? a : b;
  const lv = lo + Math.floor(rnd()*(hi-lo+1));
  startFight({troupe:[makeMon(name,lv)]});
}
function startFight(pb){ pendingBattle = pb; flashT = 40; sfx.enc(); }
function beginPending(){
  battle = {
    troupe: pendingBattle.troupe, idx:0, foe: pendingBattle.troupe[0],
    you: player.mon, trainer: pendingBattle.trainer, boss: !!pendingBattle.boss,
    onWin: pendingBattle.onWin,
    phase:'msg', sel:0, t:0, queue:[], shakeFoe:0, shakeYou:0, foeIn:-40,
  };
  pendingBattle = null;
  bmsg(battle.boss ? `${battle.foe.name}, KEEPER OF THE GLOW, AWAKENS!`
     : battle.trainer ? `TAMER ${battle.trainer} WANTS TO BATTLE!`
     : `WILD ${battle.foe.name} APPEARED!`, ()=>{ battle.phase='menu'; });
}
function bmsg(text, then){
  battle.queue.push({lines:wrap(text,34), shown:0, then});
  if(battle.phase!=='end') battle.phase='msg';
}
function chain(msgs, after){
  const next = i => i>=msgs.length ? after() : bmsg(msgs[i], ()=>next(i+1));
  next(0);
}
function dmg(att, def){
  return Math.max(1, Math.floor(att.atk * (0.8+rnd()*0.5) - def.def/2));
}
function endBattle(){
  const onWin = battle && battle.onWin;
  battle = null; state = 'world'; save();
  if(onWin) onWin();
}
function foeTurn(after){
  const d = dmg(battle.foe, battle.you);
  bmsg(`${battle.trainer ? battle.trainer+"'S " : ''}${battle.foe.name} USED ${battle.foe.move}!`, ()=>{
    battle.shakeYou=14; sfx.hit();
    battle.you.hp = Math.max(0, battle.you.hp-d);
    if(battle.you.hp<=0){
      sfx.faint();
      const next = player.party.find(m=>m.hp>0);
      if(next){
        bmsg(`${battle.you.name} FAINTED! GO, ${next.name}!`, ()=>{
          setLeader(player.party.indexOf(next));
          battle.you = player.mon;
          after();
        });
      } else {
        bmsg(`YOUR TEAM IS OUT! YOU RUSH TO SAFETY...`, ()=>{
          battle=null; player.party.forEach(m=>m.hp=m.maxhp);
          goHome(); save(); state='world';
        });
      }
    } else after();
  });
}
function winFoe(){
  sfx.faint();
  const msgs = [ battle.trainer ? `${battle.trainer}'S ${battle.foe.name} FAINTED!`
                                : `WILD ${battle.foe.name} FAINTED!` ];
  gainExp(battle.you, battle.foe.lv*((battle.trainer||battle.boss)?9:6), msgs);
  chain(msgs, ()=>{
    if(battle.trainer && battle.idx+1 < battle.troupe.length){
      battle.idx++; battle.foe = battle.troupe[battle.idx]; battle.foeIn=-40;
      bmsg(`${battle.trainer} SENT OUT ${battle.foe.name}!`, ()=>{ battle.phase='menu'; });
    } else endBattle();
  });
}
function battleMenuAct(){
  const pick = ['FIGHT','BALL','SWAP','RUN'][battle.sel];
  if(pick==='FIGHT'){
    const d = dmg(battle.you, battle.foe);
    bmsg(`${battle.you.name} USED ${battle.you.move}!`, ()=>{
      battle.shakeFoe=14; sfx.hit();
      battle.foe.hp = Math.max(0, battle.foe.hp-d);
      if(battle.foe.hp<=0) winFoe();
      else foeTurn(()=>{ battle.phase='menu'; });
    });
  } else if(pick==='BALL'){
    if(battle.trainer){ bmsg(`YOU CAN'T CATCH A TAMER'S MON!`, ()=>foeTurn(()=>{ battle.phase='menu'; })); return; }
    const chance = (0.25 + 0.65*(1 - battle.foe.hp/battle.foe.maxhp)) * (battle.boss ? 0.6 : 1);
    bmsg(`YOU THREW A MON BALL!`, ()=>{
      if(rnd() < chance){
        sfx.catch(); player.caught++;
        const m = battle.foe;
        const msgs = [`GOTCHA! ${m.name} WAS CAUGHT!`];
        if(player.party.length<6){ player.party.push(m); msgs.push(`${m.name} JOINED YOUR TEAM!`); }
        else { player.boxed++; msgs.push(`${m.name} WAS SENT TO THE BOX.`); }
        gainExp(battle.you, m.lv*4, msgs);
        chain(msgs, endBattle);
      } else {
        bmsg(`OH NO! IT BROKE FREE!`, ()=>foeTurn(()=>{ battle.phase='menu'; }));
      }
    });
  } else if(pick==='SWAP'){
    if(player.party.filter(m=>m.hp>0).length < 2){
      bmsg(`NO ONE ELSE CAN FIGHT!`, ()=>{ battle.phase='menu'; }); return;
    }
    let i = 1;
    while(player.party[i].hp<=0) i++;
    setLeader(i); battle.you = player.mon;
    bmsg(`GO, ${battle.you.name}!`, ()=>foeTurn(()=>{ battle.phase='menu'; }));
  } else { // RUN
    if(battle.trainer){ bmsg(`CAN'T RUN FROM A TAMER BATTLE!`, ()=>foeTurn(()=>{ battle.phase='menu'; })); return; }
    if(rnd()<0.8) bmsg(`GOT AWAY SAFELY!`, ()=>{ battle.onWin=null; endBattle(); });
    else bmsg(`CAN'T ESCAPE!`, ()=>foeTurn(()=>{ battle.phase='menu'; }));
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
  if(dialog){
    const lines = dialog.pages[dialog.page];
    const total = lines.reduce((a,l)=>a+l.length,0);
    if(dialog.shown < total) dialog.shown += 1.5;
    if(take('a')||take('b')){
      if(dialog.shown < total) dialog.shown = total;
      else {
        sfx.a(); dialog.page++; dialog.shown = 0;
        if(dialog.page >= dialog.pages.length) dialog = null;
      }
    }
    return;
  }
  if(menu){
    const n = player.party.length;
    if(take('up'))   { menu.sel=(menu.sel+n-1)%n; sfx.b(); }
    if(take('down')) { menu.sel=(menu.sel+1)%n; sfx.b(); }
    if(take('b')||take('start')){ menu=null; sfx.b(); return; }
    if(take('a')){ sfx.a(); setLeader(menu.sel); menu.sel=0; save(); }
    return;
  }
  if(take('start')){ menu={sel:0}; sfx.a(); return; }
  if(take('a')){
    const [fx,fy] = facingTile();
    const n = npcAt(fx,fy);
    if(n){ sfx.a(); n.talk(); return; }
    const t = tileAt(fx,fy);
    if(t==='S'){ sfx.a(); openDialog(SIGNS[fx+','+fy] || '...'); return; }
    if(t==='d'){
      sfx.heal(); player.party.forEach(m=>m.hp=m.maxhp);
      player.rest = {tx:player.tx, ty:player.ty}; save();
      openDialog('YOU TAKE A NAP INSIDE... THE TEAM IS RESTED! (CAMP SET)');
      return;
    }
    if(t==='e'){
      const key = fx+','+fy;
      if(key===ALTAR){
        if(story.lumen) openDialog('THE ALTAR GLOWS SOFTLY.');
        else startFight({troupe:[makeMon('LUMEN',10)], boss:true, onWin(){
          story.lumen=true; save();
          openDialog(["THE ALTAR HUMS, BUT THE GLOW IS FAINT...",
                      "LUMEN WHISPERS: NOX HOARDS THE LIGHT ON THE ISLE OF MIST.",
                      "SHARE THIS WITH THE ELDER."]);
        }});
      } else if(key===SPIRE){
        if(story.nox) openDialog('THE SPIRE IS QUIET. MIST DRIFTS AWAY.');
        else startFight({troupe:[makeMon('NOX',26)], boss:true, onWin(){
          story.nox=true; save();
          openDialog(["NOX DISSOLVES INTO MIST... LIGHT FLOODS BACK ACROSS THE LAND.",
                      "THE GLOW IS RESTORED. THE END!",
                      "(KEEP EXPLORING, TAMER!)"]);
        }});
      }
      return;
    }
    if(t==='u'){
      if(skills.cut){ sfx.chop(); cleared.add(fx+','+fy); save(); }
      else openDialog('A GNARLED STUMP BLOCKS THE WAY. A HATCHET COULD CUT IT.');
      return;
    }
    if(t==='x'){
      if(skills.smash){ sfx.chop(); cleared.add(fx+','+fy); save(); }
      else openDialog('A CRACKED ROCK BARS THE WAY. A PICK COULD SMASH IT.');
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
      if(passable(tileAt(nx,ny)) && !npcAt(nx,ny)){
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
  // NPCs
  for(const n of NPCS){
    if(n.gone && n.gone()) continue;
    const nx = n.x*TILE-camx, ny = n.y*TILE-camy-2;
    if(nx>-16 && nx<W && ny>-16 && ny<W) ctx.drawImage(n.img, nx, ny);
  }
  // player
  const f = player.moving ? (Math.floor(player.step)&1) : 0;
  const img = PLAYER_SPR[player.dir][f];
  const dx = Math.round(player.px-camx), dy = Math.round(player.py-camy)-2;
  if(player.dir==='right'){
    ctx.save(); ctx.translate(dx+16,dy); ctx.scale(-1,1); ctx.drawImage(img,0,0); ctx.restore();
  } else ctx.drawImage(img,dx,dy);

  if(dialog){
    const lines = dialog.pages[dialog.page];
    const total = lines.reduce((a,l)=>a+l.length,0);
    drawTextbox(lines, dialog.shown, dialog.shown>=total);
  }
  if(menu){
    box(22,4,134,112);
    drawText('TEAM', 30, 10, '#202038');
    drawText('A:LEAD B:CLOSE', 88, 10, '#888898');
    player.party.forEach((m,i)=>{
      const y = 20+i*11;
      if(menu.sel===i) drawText('>', 28, y, '#e83030');
      drawText(`${m.name}`, 36, y, '#202038');
      drawText(`L${m.lv}`, 96, y, '#505060');
      drawText(`${m.hp}/${m.maxhp}`, 114, y, m.hp>0?'#505060':'#e83030');
    });
    ctx.fillStyle='#888898'; ctx.fillRect(28,88,122,1);
    drawText(`CAUGHT ${player.caught}  BOX ${player.boxed}`, 30, 93, '#505060');
    drawText('CUT', 30, 103, skills.cut?'#30a030':'#c8c8c8');
    drawText('SMASH', 50, 103, skills.smash?'#30a030':'#c8c8c8');
    drawText('SWIM', 80, 103, skills.swim?'#30a030':'#c8c8c8');
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
    if(take('up')||take('left'))  { battle.sel=(battle.sel+3)%4; sfx.b(); }
    if(take('down')||take('right')){ battle.sel=(battle.sel+1)%4; sfx.b(); }
    if(take('a')){ sfx.a(); battleMenuAct(); }
  }
}
function drawBattle(){
  ctx.fillStyle='#f8f8e8'; ctx.fillRect(0,0,160,160);
  ctx.fillStyle='#b8d8a0';
  ctx.fillRect(96,52,52,4); ctx.fillRect(92,50,60,4); ctx.fillRect(96,56,52,2);
  ctx.fillRect(8,106,60,5); ctx.fillRect(4,103,68,4); ctx.fillRect(10,111,56,2);

  const fx = 100 + (battle.shakeFoe ? ((battle.shakeFoe&2)-1)*2 : 0) + Math.min(0,battle.foeIn);
  ctx.drawImage(MON_SPR[battle.foe.name], fx, 22, 32, 32);
  const yx = 16 + (battle.shakeYou ? ((battle.shakeYou&2)-1)*2 : 0);
  ctx.save(); ctx.translate(yx+44, 66); ctx.scale(-1,1);
  ctx.drawImage(MON_SPR[battle.you.name], 0, 0, 44, 44); ctx.restore();

  box(4,4,76,22);   hpbar(8,8,66,battle.foe,false);
  box(80,92,76,28); hpbar(84,96,66,battle.you,true);
  if(battle.trainer)
    drawText(`${battle.idx+1}/${battle.troupe.length}`, 60, 27, '#888898');

  if(battle.phase==='msg' && battle.queue[0]){
    const m = battle.queue[0];
    const total = m.lines.reduce((a,l)=>a+l.length,0);
    drawTextbox(m.lines, m.shown, m.shown>=total);
  } else {
    box(0,120,160,40);
    drawText('WHAT WILL', 6, 128, '#202038');
    drawText(battle.you.name+' DO?', 6, 137, '#202038');
    box(88,120,72,40);
    ['FIGHT','BALL','SWAP','RUN'].forEach((o,i)=>{
      drawText(o, 104, 125+i*8, '#202038');
      if(battle.sel===i) drawText('>', 95, 125+i*8, '#e83030');
    });
  }
}

// ---------- title ----------
function drawTitle(){
  ctx.fillStyle='#183048'; ctx.fillRect(0,0,160,160);
  ctx.fillStyle='#0f2438';
  for(let i=0;i<160;i+=8) ctx.fillRect(0,i,160,2);
  drawText('OPENMON', 24, 30, '#f8d020', 4);
  drawText('OPENMON', 23, 29, '#e83030', 4);
  drawText('TINY MONSTER QUEST', 44, 66, '#88c8e8');
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
  for(const k in pressed) pressed[k]=false;
  requestAnimationFrame(tick);
}
tick();

// tiny hook so automated checks can reach module state (also handy in devtools)
window.__om = {
  s: ()=>({state, pos:[player.tx,player.ty], dir:player.dir, battle, dialog, menu, pendingBattle,
           story, skills, party:player.party, caught:player.caught, boxed:player.boxed, hasSave}),
  tp(x,y){ player.tx=x; player.ty=y; player.px=x*TILE; player.py=y*TILE; player.moving=false; },
  clearDialog(){ dialog=null; }, setSel(i){ if(battle) battle.sel=i; },
  setHp(h){ player.mon.hp=h; }, setFoeHp(h){ if(battle) battle.foe.hp=h; },
  setCaught(n){ player.caught=n; }, addMon(name,lv){ player.party.push(makeMon(name,lv)); },
  healAll(){ player.party.forEach(m=>m.hp=m.maxhp); },
  tickN(n){ for(let i=0;i<n;i++) tick(); },
  MAP, tileAt, solid, passable, npcAt, HOME, cleared, makeMon,
};
