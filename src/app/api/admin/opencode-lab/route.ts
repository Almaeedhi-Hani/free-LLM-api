import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_OUTPUT = 120000;
const MAX_INPUT = 8000;
function authorized(req: NextRequest) {
  const supplied = req.headers.get('x-admin-secret') || '';
  const expected = process.env.ADMIN_SECRET || '';
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return !!expected && a.length === b.length && timingSafeEqual(a,b);
}
function run(args: string[], cwd: string, env: NodeJS.ProcessEnv, timeoutMs: number): Promise<{output:string;code:number|null;durationMs:number}> {
  return new Promise((resolve,reject)=>{
    const started=Date.now();
    const child=spawn(join(process.cwd(),'.runtime-bin','opencode'),args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false});
    let output='',done=false;
    const timer=setTimeout(()=>{child.kill('SIGTERM');setTimeout(()=>{if(!done)child.kill('SIGKILL');},2000).unref();},timeoutMs);
    const append=(chunk:Buffer)=>{output+=(chunk.toString('utf8')).slice(0,MAX_OUTPUT-output.length);};
    child.stdout.on('data',append);child.stderr.on('data',append);
    child.on('error',(err)=>{if(done)return;done=true;clearTimeout(timer);reject(err);});
    child.on('close',(code)=>{if(done)return;done=true;clearTimeout(timer);resolve({output,code,durationMs:Date.now()-started});});
  });
}
async function workspace() {
  const root=await mkdtemp(join(tmpdir(),'opencode-lab-'));
  const xdg=join(root,'.xdg');
  for(const sub of ['data/opencode','config','state','cache'])await mkdir(join(xdg,sub),{recursive:true,mode:0o700});
  await writeFile(join(root,'AGENTS.md'),'You are a diagnostic chat assistant. Respond to the user only. Do not read or modify files, access secrets, invoke tools, run shell commands, publish content, or perform external actions.\n',{mode:0o600});
  await writeFile(join(root,'opencode.json'),JSON.stringify({$schema:'https://opencode.ai/config.json',permission:{'*':'deny'}}),{mode:0o600});
  return {root,env:{...process.env,HOME:root,XDG_CONFIG_HOME:join(xdg,'config'),XDG_DATA_HOME:join(xdg,'data'),XDG_STATE_HOME:join(xdg,'state'),XDG_CACHE_HOME:join(xdg,'cache'),OPENCODE_DB:join(xdg,'data/opencode/opencode.db')}};
}
function isFree(model:string){return /(?:^|[/:-])free(?:$|[/:-])/i.test(model)||model==='opencode/big-pickle';}
export async function GET(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  const {root,env}=await workspace();
  try{
    const r=await run(['models'],root,env,20000);
    if(r.code!==0)return NextResponse.json({error:'Model catalog unavailable',detail:r.output.slice(-1500)},{status:503});
    const models=Array.from(new Set(r.output.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^[\w.-]+\/[\w./:-]+$/.test(x)))).sort();
    return NextResponse.json({models:models.map(id=>({id,free:isFree(id)}))},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return NextResponse.json({error:'OpenCode CLI unavailable',detail:String(e).slice(0,500)},{status:503});}
  finally{await rm(root,{recursive:true,force:true});}
}
export async function POST(req:NextRequest){
  if(!authorized(req))return NextResponse.json({error:'Unauthorized'},{status:401});
  const body=await req.json().catch(()=>null);
  const model=body?.model, message=body?.message;
  if(typeof model!=='string'||! /^[\w.-]+\/[\w./:-]+$/.test(model)||model.length>180||typeof message!=='string'||!message.trim()||message.length>MAX_INPUT)
    return NextResponse.json({error:'Invalid model or message'},{status:400});
  if(!isFree(model))return NextResponse.json({error:'Paid or unverified model execution is disabled; listing is allowed.'},{status:403});
  const {root,env}=await workspace();
  try{
    const catalog=await run(['models'],root,env,20000);
    if(catalog.code!==0||!catalog.output.split(/\r?\n/).some(x=>x.trim()===model))
      return NextResponse.json({error:'Model is not currently listed by OpenCode'},{status:400});
    const result=await run(['run','--model',model,'--',message],root,env,90000);
    return NextResponse.json({ok:result.code===0,reply:result.output.slice(0,MAX_OUTPUT),exitCode:result.code,durationMs:result.durationMs},{headers:{'Cache-Control':'no-store'}});
  }catch(e){return NextResponse.json({error:'OpenCode execution unavailable',detail:String(e).slice(0,500)},{status:503});}
  finally{await rm(root,{recursive:true,force:true});}
}
