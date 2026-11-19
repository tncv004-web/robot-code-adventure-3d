// Public game endpoint. Database access is restricted to this function.
// No private keys are included in the browser bundle.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const url = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
const secretKey = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!secretKey) throw new Error("Supabase secret key missing");
const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function fail(message: string, status = 400) { return json({ error: message }, status); }
const code = { circle: 1, star: 2, heart: 3, blue: 4 } as const;
type SymbolName = keyof typeof code;
type Grid = { rows: number; cols: number; start: [number, number]; goal: [number, number]; obstacles: { r: number; c: number; type: string }[] };
function mix<T>(xs: T[]): T[] { const arr = [...xs]; for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
const worksheet: Grid = {
  rows: 3, cols: 6, start: [1,0], goal: [0,5], obstacles: [
    {r:0,c:1,type:"tree"},{r:0,c:3,type:"rock"},{r:1,c:5,type:"dog"},
    {r:2,c:2,type:"tree"},{r:2,c:4,type:"dog"},{r:2,c:5,type:"tree"},
  ]
};
const adventures: Grid[] = [
  {rows:3,cols:6,start:[2,0],goal:[0,5],obstacles:[{r:1,c:1,type:"tree"},{r:0,c:1,type:"tree"},{r:0,c:3,type:"rock"},{r:2,c:4,type:"dog"}]},
  {rows:3,cols:6,start:[1,0],goal:[0,4],obstacles:[{r:0,c:1,type:"tree"},{r:0,c:2,type:"rock"},{r:1,c:4,type:"dog"},{r:2,c:3,type:"tree"},{r:2,c:5,type:"dog"}]},
  {rows:3,cols:6,start:[2,0],goal:[0,4],obstacles:[{r:0,c:0,type:"rock"},{r:1,c:1,type:"tree"},{r:0,c:2,type:"rock"},{r:2,c:4,type:"dog"}]},
];
function challenge(mode: string) {
  if(mode==="worksheet") return {m1:["star","circle","heart"],m2:["blue","heart","star"],map:worksheet};
  const symbols: SymbolName[] = ["circle","star","heart","blue"];
  return {m1:mix(symbols).slice(0,3),m2:mix(symbols).slice(0,3),map:adventures[Math.floor(Math.random()*adventures.length)]};
}
async function hash(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function getGame(token: unknown) {
  if(typeof token !== "string" || !/^[a-f0-9-]{72,100}$/.test(token)) return null;
  const token_hash = await hash(token);
  const {data,error} = await db.from("game_sessions").select("*").eq("token_hash",token_hash).gt("expires_at",new Date().toISOString()).maybeSingle();
  return error ? null : data;
}
function validPath(map: Grid, moves: unknown) {
  if(!Array.isArray(moves)||moves.length<1||moves.length>30||moves.some(x=>!["U","L","R"].includes(x))) return false;
  let [r,c] = map.start;
  for(const action of moves) {
    if(action==="U") r--;
    if(action==="L") c--;
    if(action==="R") c++;
    if(r<0||c<0||r>=map.rows||c>=map.cols||map.obstacles.some(o=>o.r===r&&o.c===c)) return false;
  }
  return r===map.goal[0] && c===map.goal[1];
}
function isCorrect(n:number, payload:any, c:any) {
  if(n===3) return validPath(c.map,payload?.moves);
  const symbols = n===1?c.m1:c.m2;
  return Array.isArray(payload?.numbers) && payload.numbers.length===3 && symbols.every((s:SymbolName,i:number)=>payload.numbers[i]===code[s]);
}

Deno.serve(async (req: Request) => {
  if(req.method==="OPTIONS") return new Response("ok", {headers:cors});
  if(req.method!=="POST") return fail("POST เท่านั้น",405);
  try {
    const body = await req.json();
    if(!body||typeof body!=="object") return fail("ข้อมูลไม่ถูกต้อง");
    if(body.action==="start") {
      const name = String(body.name||"").trim().replace(/\s+/g," ");
      const classroom = String(body.classroom||"").trim().replace(/\s+/g," ");
      const mode = body.mode;
      if(name.length<2||name.length>80||classroom.length<1||classroom.length>40||!["worksheet","adventure"].includes(mode)) return fail("กรุณาระบุชื่อ ห้องเรียน และโหมดให้ถูกต้อง");
      const {data: student,error:studentError}=await db.from("game_students").insert({full_name:name,classroom}).select("id").single();
      if(studentError||!student) throw studentError||new Error("create student failed");
      const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
      const c = challenge(mode);
      const {data:session,error:sessionError}=await db.from("game_sessions")
        .insert({student_id:student.id,token_hash:await hash(token),mode,challenge:c})
        .select("id,mode,started_at").single();
      if(sessionError||!session) throw sessionError||new Error("create session failed");
      return json({token,sessionId:session.id,challenge:c,mode:session.mode,studentName:name});
    }
    if(body.action==="resume") {
      const session=await getGame(body.token);
      if(!session) return fail("เซสชันหมดอายุ กรุณาเริ่มเกมใหม่",401);
      const [studentQuery, resultsQuery]=await Promise.all([
        db.from("game_students").select("full_name,classroom").eq("id",session.student_id).single(),
        db.from("game_mission_results").select("mission_number,score,duration_seconds,mistakes").eq("session_id",session.id).order("mission_number"),
      ]);
      if(studentQuery.error||resultsQuery.error) throw studentQuery.error||resultsQuery.error;
      return json({
        studentName:studentQuery.data?.full_name||"", classroom:studentQuery.data?.classroom||"",
        mode:session.mode,challenge:session.challenge,mission:session.next_mission,
        mistakes:session.current_mistakes,missionStartedAt:session.mission_started_at,
        completed:!!session.finished_at,totalScore:session.total_score,
        results:(resultsQuery.data||[]).map(r=>({score:r.score,durationSeconds:r.duration_seconds,mistakes:r.mistakes})),
      });
    }
    if(body.action==="submit") {
      const session=await getGame(body.token);
      if(!session) return fail("เซสชันหมดอายุ กรุณาเริ่มเกมใหม่",401);
      if(session.finished_at) return fail("ภารกิจนี้จบแล้ว",409);
      const n=Number(body.mission);
      if(n!==session.next_mission||n<1||n>3) return fail("ลำดับภารกิจไม่ถูกต้อง",409);
      const right=isCorrect(n,body.payload,session.challenge);
      if(!right) {
        const {error}=await db.from("game_sessions")
          .update({current_mistakes:session.current_mistakes+1})
          .eq("id",session.id).eq("next_mission",n);
        if(error) throw error;
        return json({correct:false,feedback:n===3?"ยังไม่ถึงดาว หรือพบสิ่งกีดขวาง ลองใหม่อีกครั้ง":"รหัสยังไม่ถูกต้อง ลองดูตารางอีกครั้ง",mistakes:session.current_mistakes+1});
      }
      const seconds=Math.max(1,Math.floor((Date.now()-new Date(session.mission_started_at).getTime())/1000));
      // Accuracy is more important than speed. Strict server-computed score (max 100).
      const accuracy=Math.max(30,80-Math.min(session.current_mistakes,5)*10);
      const pace=[35,40,75][n-1];
      const speed=Math.max(0,20-Math.floor(Math.max(0,seconds-pace)/5)*2);
      const score=accuracy+speed;
      const {error:resultError}=await db.from("game_mission_results")
        .insert({session_id:session.id,mission_number:n,score,duration_seconds:seconds,mistakes:session.current_mistakes});
      if(resultError) return fail("ไม่สามารถบันทึกคะแนนซ้ำได้",409);
      const next=n+1;
      const total=(session.total_score||0)+score;
      const patch:any={next_mission:next,total_score:total,current_mistakes:0,mission_started_at:new Date().toISOString()};
      if(n===3) patch.finished_at=new Date().toISOString();
      const {error:updateError}=await db.from("game_sessions").update(patch).eq("id",session.id).eq("next_mission",n);
      if(updateError) throw updateError;
      return json({correct:true,score,durationSeconds:seconds,accuracy,speed,totalScore:total,nextMission:next,completed:n===3});
    }
    if(body.action==="teacher-stats") {
      const auth=req.headers.get("authorization")||"";
      if(!auth.startsWith("Bearer ")) return fail("กรุณาเข้าสู่ระบบคุณครู",401);
      const {data:userData,error:authError}=await db.auth.getUser(auth.substring(7));
      if(authError||!userData?.user) return fail("บัญชีผู้ใช้ไม่ถูกต้อง",401);
      const {data:teacher,error:teacherAccessError}=await db.from("game_teacher_access").select("user_id").eq("user_id",userData.user.id).maybeSingle();
      // Do not mistake a database authorization/configuration failure for a missing teacher role.
      if(teacherAccessError) {
        console.error("teacher-access database query failed:",teacherAccessError.code||"unknown");
        return fail("ระบบตรวจสอบสิทธิ์คุณครูขัดข้อง โปรดลองอีกครั้ง",503);
      }
      if(!teacher) return fail("บัญชีนี้ยังไม่ได้รับสิทธิ์คุณครู",403);
      const {data:records,error}=await db.from("game_sessions")
        .select("id,mode,started_at,finished_at,total_score,game_students(full_name,classroom),game_mission_results(mission_number,score,duration_seconds,mistakes)")
        .order("started_at",{ascending:false}).limit(1000);
      if(error) throw error;
      return json({records:records||[]});
    }
    return fail("ไม่พบคำสั่ง",404);
  } catch (e) {
    console.error("game-api", e instanceof Error ? e.message : e);
    return fail("เซิร์ฟเวอร์ไม่พร้อม โปรดลองอีกครั้ง",500);
  }
});
