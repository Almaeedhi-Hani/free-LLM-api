import type {Cell} from './types';
export const enc=new TextEncoder();
export const url=(v:Cell)=>{try{const u=new URL(String(v));return /^https?:$/.test(u.protocol)&&!u.username&&!u.password?u.href:null}catch{return null}};
export const xml=(v:Cell)=>String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
