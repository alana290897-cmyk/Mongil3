import { env } from 'cloudflare:workers';
import {getUser,ensureOwner,ownerEmail} from '../../account-auth';
import seed from '../../seed.json';
import {getCatalog,assetKinds,buildSnapshot} from '../../catalog';
export const dynamic='force-dynamic';
const fail=(message:string,status=400)=>Response.json({error:message},{status});
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return fail('Yêu cầu không hợp lệ.',403);
 const u=await getUser();if(!u?.local)return fail('Vui lòng đăng nhập.',401);
 if(Number(req.headers.get('content-length')||0)>150000)return fail('Nội dung quá dài.');
 let b:any;try{const raw=await req.text();if(raw.length>150000)return fail('Nội dung quá dài.');b=JSON.parse(raw)}catch{return fail('Dữ liệu không hợp lệ.')}
 const db=env.DB!;const now=new Date().toISOString();
 if(b.action==='setup'){
  if(u.local||u.email.toLowerCase()!==ownerEmail)return fail('Chỉ chủ sở hữu được thiết lập quản trị.',403);
  if((env as any).BOOTSTRAP_ADMIN!=='true')return fail('Thiết lập ban đầu đã khóa.',403);
  // Single-winner owner claim; this setup is only enabled while the Site is owner-private.
  try {await db.batch([db.prepare("INSERT INTO settings (key,value) VALUES ('owner',?)").bind(u.userId),db.prepare("INSERT INTO members (email,user_id,role,created) VALUES (?,?,'admin',?)").bind(u.email.toLowerCase(),u.userId,now)])}catch{return fail('Quản trị viên đã được thiết lập.',409)}
  return Response.json({ok:true});
 }
 const m:any=await db.prepare('SELECT role FROM members WHERE user_id=? OR (email=? AND user_id IS NULL)').bind(u.userId,u.email.toLowerCase()).first(); const role=m?.role;
 if(role!=='admin')return fail('Chỉ quản trị viên được thay đổi nội dung.',403);
 const log=(action:string,target:string)=>db.prepare('INSERT INTO audit (id,actor,action,target,time) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),u.email,action,target,now);
 if(b.action==='member'){
  if(role!=='admin')return fail('Chỉ quản trị viên được phân quyền.',403);
  const email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['admin','editor','viewer'].includes(b.role))return fail('Email hoặc vai trò không hợp lệ.');
  const owner:any=await db.prepare("SELECT value FROM settings WHERE key='owner'").first();const target:any=await db.prepare('SELECT user_id FROM members WHERE email=?').bind(email).first();
  if((target?.user_id===owner?.value||email===ownerEmail)&&b.role!=='admin')return fail('Không thể hạ quyền chủ sở hữu.');
  await db.batch([db.prepare('INSERT INTO members (email,role,created) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET role=excluded.role').bind(email,b.role,now),log('Phân quyền: '+b.role,email)]);return Response.json({ok:true});
 }
 if(!['save','delete'].includes(b.action))return fail('Thao tác không hợp lệ.');
 let item=b.item;if(!item||typeof item.title!=='string')return fail('Thiếu nội dung.');
 const id=String(item.id||crypto.randomUUID());let existing:any=await db.prepare('SELECT * FROM records WHERE id=?').bind(id).first();existing=existing||seed.find(r=>r.id===id);if(!existing&&assetKinds.includes(item.kind)){const a=(await getCatalog()).find(a=>a.id===id);if(a)existing={...a,author:'catalog',payload:a,status:'published'};}
 if(existing&&role!=='admin'&&existing.author!==u.userId)return fail('Bạn chỉ được sửa bản nháp của mình.',403);
 if(b.action==='delete'&&role!=='admin'&&existing?.author!==u.userId)return fail('Không có quyền xóa.',403);
 if(!['character','build','team','leak','news',...assetKinds].includes(item.kind))return fail('Loại nội dung không hợp lệ.');
 if(b.action==='delete'){
  if(!existing||existing.status==='deleted')return fail('Nội dung không còn tồn tại.',404);
  const payload=typeof existing.payload==='string'?existing.payload:JSON.stringify(existing.payload||{});
  await db.batch([db.prepare("INSERT INTO records(id,kind,title,status,author,payload,updated) VALUES (?,?,?,'deleted',?,?,?) ON CONFLICT(id) DO UPDATE SET status='deleted',updated=excluded.updated").bind(id,existing.kind,existing.title,existing.author||u.userId,typeof payload==='string'?payload:JSON.stringify(payload),now),log('Xóa nội dung',existing.title)]);
  return Response.json({ok:true,id});
 }
 const p=item.payload||{};const title=item.title.trim();if(!title||title.length>150)return fail('Tiêu đề từ 1–150 ký tự.');
 const status=b.action==='delete'?'deleted':item.status;
 if(!['draft','review','published','deleted'].includes(status))return fail('Trạng thái không hợp lệ.');

 if(p.source){try{const url=new URL(p.source);if(url.protocol!=='https:')return fail('Nguồn phải là đường dẫn HTTPS.')}catch{return fail('Đường dẫn nguồn không hợp lệ.')}}
 if(status==='published'&&['character','news','leak'].includes(item.kind)&&!p.source)return fail('Nhập nguồn bài viết.');
 if(item.kind==='leak')p.sourceType='unconfirmed';
 if(p.image&&!/^\/(images|catalog)\/[a-z0-9-]+\.(png|jpg|webp)$/.test(p.image)&&!/^https:\/\//.test(p.image))return fail('Ảnh phải là URL HTTPS.');
 if(item.kind==='team'&&(!Array.isArray(p.team)||p.team.length!==3||new Set(p.team).size!==3))return fail('Đội hình cần đúng 3 nhân vật khác nhau.');
 if(['build','team'].includes(item.kind)){
  const candidates=item.kind==='team'?p.team:[p.character];
  for(const cid of candidates){
   if(typeof cid!=='string')return fail('Chọn nhân vật hợp lệ.');
   const row:any=await db.prepare('SELECT kind,status FROM records WHERE id=?').bind(cid).first();
   const valid=row?row.kind==='character'&&row.status==='published':seed.some(r=>r.id===cid&&r.kind==='character');
   if(!valid)return fail('Nhân vật phải có hồ sơ đã xuất bản.');
  }
 }
 if(item.kind==='build'){try{await buildSnapshot(p)}catch(e:any){return fail(e.message)}}
 if(JSON.stringify(p).length>100000)return fail('Nội dung quá dài.');
 await db.batch([db.prepare('INSERT INTO records (id,kind,title,status,author,payload,updated) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,status=excluded.status,payload=excluded.payload,updated=excluded.updated').bind(id,item.kind,title,status,existing?.author||u.userId,JSON.stringify(p),now),log(b.action==='delete'?'Xóa nội dung':'Lưu: '+status,title)]);
 return Response.json({ok:true,id});
}
