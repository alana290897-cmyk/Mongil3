import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {digest,passwordHash,getUser,ownerEmail} from '../../account-auth';
import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
const fail=(s:string,status=400)=>Response.json({error:s},{status});
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return fail('Yêu cầu không hợp lệ.',403);
 let b:any;try{const t=await req.text();if(t.length>4000)return fail('Dữ liệu quá dài.');b=JSON.parse(t)}catch{return fail('Dữ liệu không hợp lệ.')}
 const db=env.DB!;const jar=await cookies();
 if(b.action==='logout'){const token=jar.get('atlas_session')?.value;if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await digest(token)).run();jar.set('atlas_session','',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0});return Response.json({ok:true});}
 if(b.action==='login'){
  const username=String(b.username||'').toLowerCase().trim();const key=await digest(username+':'+(req.headers.get('cf-connecting-ip')||'shared'));const a:any=await db.prepare('SELECT * FROM attempts WHERE key=?').bind(key).first();if(a&&a.until>new Date().toISOString()&&Number(a.count)>=8)return fail('Đăng nhập sai nhiều lần. Thử lại sau 15 phút.',429);
  const c:any=await db.prepare('SELECT * FROM credentials WHERE username=?').bind(username).first();const hash=await passwordHash(String(b.password||''),c?.salt||'invalid-account-salt');
  if(!c||hash!==c.password_hash){await db.prepare('INSERT INTO attempts(key,count,until) VALUES (?,\'1\',?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN attempts.until>excluded.until THEN attempts.count+1 WHEN attempts.until>? THEN attempts.count+1 ELSE 1 END,until=excluded.until').bind(key,new Date(Date.now()+900000).toISOString(),new Date().toISOString()).run();return fail('Tên đăng nhập hoặc mật khẩu không đúng.',401);}
  await db.prepare('DELETE FROM attempts WHERE key=?').bind(key).run();const token=crypto.randomUUID()+crypto.randomUUID();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES (?,?,?)').bind(await digest(token),c.id,new Date(Date.now()+604800000).toISOString()).run();jar.set('atlas_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:604800});return Response.json({ok:true});
 }
 const u=await getUser();const bootstrap=b.action==='bootstrap';
 if(bootstrap){const owner=await getChatGPTUser();if(!owner||owner.email.toLowerCase()!==ownerEmail)return fail('Chỉ chủ sở hữu được thiết lập lần đầu.',403);const exists=await db.prepare("SELECT c.id FROM credentials c JOIN members m ON m.user_id=c.id WHERE m.role='admin' LIMIT 1").first();if(exists)return fail('Đã có quản trị viên. Hãy đăng nhập bằng user/pass.',409);b.email=ownerEmail;b.role='admin';}
 else{if(!u?.local)return fail('Đăng nhập bằng tài khoản quản trị.',401);const m:any=await db.prepare('SELECT role FROM members WHERE user_id=?').bind(u.userId).first();if(m?.role!=='admin')return fail('Chỉ quản trị viên được quản lý tài khoản.',403);}

 const username=String(b.username||'').trim().toLowerCase(),email=String(b.email||'').trim().toLowerCase();if(!/^[a-z0-9_.-]{3,40}$/.test(username)||!['admin','viewer'].includes(b.role)||!/^\S+@\S+\.\S+$/.test(email)||typeof b.password!=='string'||b.password.length<10||b.password.length>128)return fail('Tên đăng nhập 3–40 ký tự; mật khẩu từ 10 ký tự; email hợp lệ.');
 const old:any=await db.prepare('SELECT id,email FROM credentials WHERE username=?').bind(username).first();if(old&&old.email!==email)return fail('Email không khớp tài khoản đã có.');if(email===ownerEmail&&!bootstrap&&u?.email.toLowerCase()!==ownerEmail)return fail('Chỉ chủ sở hữu được đặt lại tài khoản này.',403);const id=old?.id||'local:'+crypto.randomUUID();const salt=crypto.randomUUID();const hash=await passwordHash(b.password,salt);
 try{await db.batch([...(bootstrap?[db.prepare("INSERT INTO settings(key,value) VALUES ('local-owner',?)").bind(id)]:[]),db.prepare('INSERT INTO credentials(id,username,email,password_hash,salt) VALUES (?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash,salt=excluded.salt').bind(id,username,email,hash,salt),db.prepare('INSERT INTO members(email,user_id,role,created) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET user_id=excluded.user_id,role=excluded.role').bind(email,id,b.role,new Date().toISOString()),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id)])}catch{return fail('Email hoặc tài khoản đã tồn tại.')}
 if(bootstrap){const token=crypto.randomUUID()+crypto.randomUUID();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires) VALUES (?,?,?)').bind(await digest(token),id,new Date(Date.now()+604800000).toISOString()).run();jar.set('atlas_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:604800});}
 return Response.json({ok:true});
}
