import assert from 'node:assert/strict';
import fs from 'node:fs';
const maps=[
 {start:[1,0],goal:[0,5],obs:[[0,1],[0,3],[1,5],[2,2],[2,4],[2,5]]},
 {start:[2,0],goal:[0,5],obs:[[1,1],[0,1],[0,3],[2,4]]},
 {start:[1,0],goal:[0,4],obs:[[0,1],[0,2],[1,4],[2,3],[2,5]]},
 {start:[2,0],goal:[0,4],obs:[[0,0],[1,1],[0,2],[2,4]]}];
for (const [i,map] of maps.entries()){
 const q=[[map.start,'']];const seen=new Set([map.start.join(',')]);let solved='';
 while(q.length){const [pos,path]=q.shift();if(pos[0]===map.goal[0]&&pos[1]===map.goal[1]){solved=path;break}
  for(const [d,dr,dc] of [['U',-1,0],['L',0,-1],['R',0,1]]){
   const p=[pos[0]+dr,pos[1]+dc],k=p.join(',');if(p[0]<0||p[0]>=3||p[1]<0||p[1]>=6||seen.has(k)||map.obs.some(o=>o[0]===p[0]&&o[1]===p[1]))continue;seen.add(k);q.push([p,path+d]);
  }
 }
 assert.ok(solved,`3D mission map #${i} must be solvable with permitted directions`);console.log(`Map #${i} solution: ${solved}`);
}
for(const file of ['index.html','styles.css','js/app.js','js/world3d.js','js/config.js','supabase/schema.sql','supabase/functions/game-api/index.ts'])assert.ok(fs.statSync(file).size>100,`missing ${file}`);
assert.ok(!fs.readFileSync('js/config.js','utf8').includes('sb_secret_'),'no secret key in frontend');
console.log('PASS: 4 grid maps solvable, expected assets exist, no secret key in frontend');