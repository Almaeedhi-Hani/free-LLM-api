export const coordinator=require('../telegram-ops-coordinator.cjs') as {report:(d:Record<string,unknown>)=>Promise<string>};
export const coordinatorEnabled=()=>process.env.TELEGRAM_OPS_COORDINATOR_ENABLED==='true';
export const core=require('../telegram-ops-core.cjs') as {
 config:(env:NodeJS.ProcessEnv)=>{token:string;secret:string;chat:string;owner:string}|null;
 authentic:(expected:string,supplied:string)=>boolean;
 command:(update:unknown,cfg:{chat:string;owner:string})=>string|null;
 render:(cmd:string,d:Record<string,unknown>)=>string;
 chunks:(text:string)=>string[];
 normalizeCommand:(text:unknown)=>string;
 reviewCallback:(update:unknown,cfg:{owner:string;chat:string})=>{id:string;update:unknown}|null;
 keyboard:(advanced:boolean,coordinator:boolean)=>{keyboard:{text:string}[][];resize_keyboard:boolean;is_persistent:boolean};
};
