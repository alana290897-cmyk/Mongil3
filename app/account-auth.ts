import {cookies} from 'next/headers';
import {env} from './runtime-env';
import {getChatGPTUser} from './chatgpt-auth';
export const ownerEmail='chungndtq001@gmail.com';
export async function digest(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return Array.from(new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256))).map(n=>n.toString(16).padStart(2,'0')).join('')}
export async function getUser(){
 const cookie=(await cookies()).get('atlas_session')?.value;
 if(cookie){const s:any=await env.DB!.prepare('SELECT c.id,c.email,c.username FROM sessions s JOIN credentials c ON c.id=s.user_id WHERE s.token_hash=? AND s.expires>?').bind(await digest(cookie),new Date().toISOString()).first();if(s)return {userId:s.id,email:s.email,displayName:s.username,local:true};}
 const u=await getChatGPTUser();return u?{...u,local:false}:null;
}
export async function ensureOwner(user:any){if(user&&!user.local&&user.email.toLowerCase()===ownerEmail){await env.DB!.prepare("INSERT INTO members(email,user_id,role,created) VALUES (?,?,'admin',?) ON CONFLICT(email) DO UPDATE SET user_id=excluded.user_id,role='admin'").bind(ownerEmail,user.userId,new Date().toISOString()).run();await env.DB!.prepare("INSERT INTO settings(key,value) VALUES ('owner',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(user.userId).run();}}
