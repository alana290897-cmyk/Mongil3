import { env } from 'cloudflare:workers';
import { getUser,ensureOwner } from '../../account-auth';
import seed from '../../seed.json';
export const dynamic = 'force-dynamic';
export async function GET(){
 const user=await getUser();const db=env.DB!;
 let member:any=null;
 if(user){member=await db.prepare('SELECT role FROM members WHERE user_id = ? OR (email = ? AND user_id IS NULL)').bind(user.userId,user.email.toLowerCase()).first();if(member)await db.prepare('UPDATE members SET user_id = ? WHERE email = ? AND user_id IS NULL').bind(user.userId,user.email.toLowerCase()).run();}
 const role=user?.local&&member?.role==='admin'?'admin':'viewer';
 const own=role==='admin';
 const rows=await db.prepare('SELECT * FROM records ORDER BY updated DESC').all();
 const overrides=new Set(rows.results.map((r:any)=>r.id));
 const visible=rows.results.filter((r:any)=>r.status!=='deleted'&&(r.status==='published'||own));
 const items=[...seed.filter(r=>!overrides.has(r.id)),...visible.filter((r:any)=>['character','build','team','news','leak'].includes(r.kind)).map((r:any)=>{const p=JSON.parse(r.payload);const base=seed.find(s=>s.id===r.id);return {...r,payload:{...base?.payload,...p,skillData:p.skillData?.length?p.skillData:(base?.payload as any)?.skillData}}})];
 const initialized=!!await db.prepare("SELECT value FROM settings WHERE key='owner'").first();
 const members=own?(await db.prepare('SELECT m.email,m.role,m.user_id,c.username FROM members m LEFT JOIN credentials c ON c.id=m.user_id').all()).results:[];
 const audit=own?(await db.prepare('SELECT * FROM audit ORDER BY time DESC LIMIT 30').all()).results:[];
 return Response.json({items,user:user?.local?{id:user.userId,name:user.displayName,email:user.email,local:user.local}:null,role,initialized,members,audit,canSetup:!!user&&!initialized&&(env as any).BOOTSTRAP_ADMIN==='true'},{headers:{'Cache-Control':'no-store'}});
}
