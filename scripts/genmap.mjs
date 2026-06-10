// OPENMON world generator: emits a 90x70 tile map and validates staged gating.
const W=90, H=70;
const g = Array.from({length:H},()=>Array(W).fill('G'));
let seed = 0xBADC0DE;
const rnd = ()=>{ seed^=seed<<13; seed^=seed>>>17; seed^=seed<<5; return ((seed>>>0)%1000)/1000; };
const put=(x,y,c)=>{ if(x>=0&&y>=0&&x<W&&y<H) g[y][x]=c; };
const rect=(x0,y0,x1,y1,c)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) put(x,y,c); };
const at=(x,y)=> (x<0||y<0||x>=W||y>=H)?'T':g[y][x];

// ---- base terrain ----
rect(0,0,W-1,0,'T'); rect(0,H-1,W-1,H-1,'T'); rect(0,0,0,H-1,'T'); rect(W-1,0,W-1,H-1,'T');

// moat + isle (NE)
rect(56,1,57,26,'A');            // west moat edge
rect(56,22,88,26,'A');           // south moat band
// cliff band separating highlands from meadows
rect(1,27,57,29,'C');
// crag walls
rect(59,27,60,58,'C');           // west wall of crag
rect(59,59,88,59,'C');           // crag south wall
rect(59,60,88,68,'T');           // SE buffer forest
// deepwood east wall (down to the south border so it can't be skirted)
rect(16,30,17,68,'T');

// ---- roads ----
rect(30,27,30,29,'P');           // the pass through the cliffs
rect(30,30,30,60,'P');           // main spine down to village
rect(18,50,58,50,'P');           // meadows east-west road
rect(21,60,43,60,'P');           // village street
rect(18,52,29,52,'P');           // spur to deepwood stumps
rect(31,48,58,48,'P');           // spur to crag crack
rect(30,7,30,26,'P');            // highlands road
rect(21,7,30,7,'P');             // shrine spur
rect(21,6,21,6,'P');             // shrine approach
rect(31,10,38,10,'P');           // hut spur (highlands)

// ---- gates ----
put(16,52,'u'); put(17,52,'u');  // deepwood stumps (CUT)
put(59,48,'x'); put(60,48,'x');  // crag cracked rocks (SMASH)
// bridge + fords to the isle at x=70
put(70,26,'b');                  // hermit stands here
rect(70,22,70,25,'a');           // swim fords
// clear isle landing + crag shore corridor
rect(61,27,75,27,'G'); rect(70,19,70,21,'G');

// ---- structures: shrine + spire ----
rect(20,4,22,4,'n'); rect(20,5,22,5,'n'); put(21,5,'e'); put(21,6,'P');
rect(76,3,78,3,'n'); rect(76,4,78,4,'n'); put(77,4,'e'); put(77,5,'G');

// ---- houses: [roofX0,roofX1,roofY,doorX] ----
const HOUSES=[[24,26,58,25],[32,34,58,33],[38,40,9,39],[7,9,39,8],[65,67,43,66],[62,64,17,63]];
for(const [x0,x1,y,dx] of HOUSES){
  rect(x0,y,x1,y,'o'); rect(x0,y+1,x1,y+1,'h'); put(dx,y+1,'d');
}

// ---- lake in meadows ----
rect(45,35,54,42,'A'); rect(46,34,53,34,'A'); rect(46,43,53,43,'A');

// ---- signs ----
const SIGNS=[[28,60],[28,31],[19,51],[57,47],[68,28],[44,34]];
for(const [x,y] of SIGNS) put(x,y,'S');

// ---- region fills (trees/rocks/cliff knobs), protecting carved cells ----
const protectedCells = new Set();
const protect=(x0,y0,x1,y1)=>{ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) protectedCells.add(x+','+y); };
// protect roads/structures/gates and one-tile margins around doors/signs/NPC spots
for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(at(x,y)!=='G') protectedCells.add(x+','+y);
protect(24,59,26,61); protect(32,59,34,61); protect(38,10,40,12); protect(7,40,9,42);
protect(65,44,67,46); protect(62,18,64,20);
protect(19,4,23,7); protect(75,2,79,6);
// NPC standing spots
const NPCSPOTS=[[33,61],[29,62],[30,28],[5,33],[82,30],[70,26],[61,19]];
for(const [x,y] of NPCSPOTS) protect(x-1,y-1,x+1,y+1);
// corridors through dense regions
const corridors=[
  [2,52,15,52],[5,33,5,52],[2,33,8,33],[5,40,9,40],          // deepwood
  [61,48,82,48],[82,30,82,48],[66,44,82,44],[70,28,70,48],   // crag
  [70,6,70,21],[70,6,77,6],[77,5,77,6],[63,19,70,19],        // isle
];
for(const [x0,y0,x1,y1] of corridors){ rect(Math.min(x0,x1),Math.min(y0,y1),Math.max(x0,x1),Math.max(y0,y1),'G'); protect(Math.min(x0,x1),Math.min(y0,y1),Math.max(x0,x1),Math.max(y0,y1)); }

function sprinkle(x0,y0,x1,y1,ch,density){
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++)
    if(!protectedCells.has(x+','+y) && at(x,y)==='G' && rnd()<density) put(x,y,ch);
}
function patches(x0,y0,x1,y1,count){          // 2x2-ish tall-grass clusters
  for(let i=0;i<count;i++){
    const x=x0+Math.floor(rnd()*(x1-x0)), y=y0+Math.floor(rnd()*(y1-y0));
    for(let dy=0;dy<3;dy++) for(let dx=0;dx<3;dx++)
      if(rnd()<0.8 && !protectedCells.has((x+dx)+','+(y+dy)) && at(x+dx,y+dy)==='G') put(x+dx,y+dy,'W');
  }
}
// deepwood: dense trees + bug grass
sprinkle(1,30,15,66,'T',0.30); patches(1,30,14,64,14);
// highlands: sparse trees, rocks, strong grass
sprinkle(1,1,55,26,'T',0.07); sprinkle(1,1,55,26,'R',0.015); patches(2,2,53,24,16);
// meadows: light trees, flowers, gentle grass
sprinkle(18,30,58,55,'T',0.04); sprinkle(18,30,58,55,'F',0.02); patches(19,31,56,49,12);
// village area flowers
sprinkle(20,56,44,66,'F',0.04);
// south band below village
patches(19,62,56,66,5);
// crag: cliff knobs + rocks
sprinkle(61,28,88,58,'C',0.18); sprinkle(61,28,88,58,'R',0.04); patches(62,29,86,56,12);
// isle: spooky trees + heavy mist grass
sprinkle(58,1,88,21,'T',0.10); patches(59,2,86,19,16);

// ---- validation ----
const solidBase='TASRohdCne';
function reach(opts){
  const {guard=true, hermit=true, cut=false, smash=false, swim=false} = opts;
  const pass=(x,y)=>{
    const t=at(x,y);
    if(t==='u') return cut;
    if(t==='x') return smash;
    if(t==='a') return swim;
    if(solidBase.includes(t)) return false;
    if(guard && x===30 && y===28) return false;
    if(hermit && x===70 && y===26) return false;
    return true;
  };
  const seen=new Set(['25,60']), q=[[25,60]];
  while(q.length){ const [x,y]=q.pop();
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
      const nx=x+dx, ny=y+dy, k=nx+','+ny;
      if(!seen.has(k)&&pass(nx,ny)){ seen.add(k); q.push([nx,ny]); } } }
  return seen;
}
// auto-fill scenery pockets the tree sprinkle sealed off (they'd read as explorable)
{
  const all = reach({guard:false, hermit:false, cut:true, smash:true, swim:true});
  for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
    const t=at(x,y);
    if(!solidBase.includes(t) && t!=='u' && t!=='x' && !all.has(x+','+y))
      put(x,y, (x>58&&y>26)?'C':'T');
  }
}

const has=(s,x,y)=>s.has(x+','+y);
const checks=[];
const s0=reach({});
checks.push(['stage0 village ok', has(s0,33,62)&&has(s0,19,52)&&has(s0,57,48)]);
checks.push(['stage0 shrine blocked', !has(s0,21,6)]);
checks.push(['stage0 deepwood blocked', !has(s0,5,33)]);
checks.push(['stage0 crag blocked', !has(s0,62,48)]);
checks.push(['stage0 isle blocked', !has(s0,77,5)]);
const s1=reach({guard:false});
checks.push(['stage1 shrine open', has(s1,21,6)&&has(s1,39,11)]);
checks.push(['stage1 deepwood still blocked', !has(s1,5,33)]);
const s2=reach({guard:false,cut:true});
checks.push(['stage2 ILEX reachable', has(s2,5,34)||has(s2,4,33)||has(s2,6,33)]);
checks.push(['stage2 deepwood hut', has(s2,8,41)]);
checks.push(['stage2 crag still blocked', !has(s2,62,48)]);
const s3=reach({guard:false,cut:true,smash:true});
checks.push(['stage3 BORIS reachable', has(s3,82,31)||has(s3,81,30)||has(s3,83,30)]);
checks.push(['stage3 crag hut', has(s3,66,45)]);
checks.push(['stage3 bridge shore', has(s3,70,27)]);
checks.push(['stage3 isle still blocked', !has(s3,77,5)]);
const s4=reach({guard:false,hermit:false,cut:true,smash:true,swim:true});
checks.push(['stage4 spire reachable', has(s4,77,5)]);
checks.push(['stage4 isle hut', has(s4,63,19)]);
// every non-solid tile reachable at stage4 (no dead pockets)
let walk=0, missing=[];
for(let y=0;y<H;y++) for(let x=0;x<W;x++){
  const t=at(x,y);
  if(!solidBase.includes(t)&&t!=='u'&&t!=='x'){ walk++; if(!s4.has(x+','+y)) missing.push([x,y,t]); }
}
checks.push(['stage4 full coverage', missing.length===0]);
// NPC spots stand on walkable ground
for(const [x,y] of NPCSPOTS) checks.push([`npc ${x},${y} on ${at(x,y)}`, 'GPb'.includes(at(x,y))]);

let fail=0;
for(const [name,ok] of checks){ if(!ok) fail++; console.error((ok?'  ok ':'FAIL ')+name); }
if(missing.length) console.error('unreachable:', JSON.stringify(missing.slice(0,20)));
if(fail){ process.exit(1); }
console.log(g.map(r=>r.join('')).join('\n'));
