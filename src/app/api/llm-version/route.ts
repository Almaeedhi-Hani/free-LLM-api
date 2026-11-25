import {serveKnowledge} from '@/lib/llm-knowledge-response';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>serveKnowledge(req,{kind:'full'},'/api/llm-version');
export const HEAD=GET;
