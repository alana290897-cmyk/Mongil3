import { withDatabase } from '../../../lib/netlify-database';
import {syncSources} from '../../sources';
export const dynamic='force-dynamic';
async function GETHandler(req:Request){try{return Response.json(await syncSources(new URL(req.url).searchParams.get('reload')==='1'),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Không thể tải nguồn. Vui lòng thử lại.'},{status:503})}}

export async function GET(req: Request) { try { return await withDatabase(() => GETHandler(req)); } catch(e) { console.error("Atlas API error", e); return Response.json({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."},{status:503}); } }
