import {sameOrigin} from '../../../lib/request-origin';
import { withDatabase } from '../../../lib/netlify-database';
import {getCatalog,refreshCatalog,refreshAsset} from '../../catalog';
import {getUser} from '../../account-auth';
import {env} from '../../runtime-env';
export const dynamic='force-dynamic';
async function GETHandler(req:Request){const id=new URL(req.url).searchParams.get('id');if(id){try{return Response.json({item:await refreshAsset(id)},{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:502})}}return Response.json({items:await getCatalog()},{headers:{'Cache-Control':'no-store'}})}
async function POSTHandler(req:Request){if(!sameOrigin(req))return Response.json({error:'Yêu cầu không hợp lệ.'},{status:403});const user=await getUser();if(!user?.local)return Response.json({error:'Đăng nhập tài khoản quản trị.'},{status:401});const m:any=await env.DB!.prepare('SELECT role FROM members WHERE user_id=?').bind(user.userId).first();if(m?.role!=='admin')return Response.json({error:'Chỉ quản trị viên được cập nhật thư viện.'},{status:403});try{return Response.json(await refreshCatalog())}catch(e:any){return Response.json({error:e.message},{status:502})}}

export async function GET(req: Request) { try { return await withDatabase(() => GETHandler(req)); } catch(e) { console.error("Atlas API error", e); return Response.json({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."},{status:503}); } }

export async function POST(req: Request) { try { return await withDatabase(() => POSTHandler(req)); } catch(e) { console.error("Atlas API error", e); return Response.json({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."},{status:503}); } }
