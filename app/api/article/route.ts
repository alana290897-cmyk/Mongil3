import { withDatabase } from '../../../lib/netlify-database';
import {env} from '../../runtime-env';
import {articleSummary} from '../../article-summaries';
import baseline from '../../feed-seed.json';
export const dynamic='force-dynamic';
async function GETHandler(req:Request){const id=new URL(req.url).searchParams.get('id');const row:any=await env.DB!.prepare("SELECT value FROM settings WHERE key='source-feed'").first();let feed:any={items:[]};try{feed=JSON.parse(row?.value||'{}')}catch{}const item=[...(feed.items||[]),...baseline].find(i=>i.id===id);if(!item)return Response.json({error:'Không tìm thấy bài viết.'},{status:404});try{return Response.json(await articleSummary(item),{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:502})}}

export async function GET(req: Request) { try { return await withDatabase(() => GETHandler(req)); } catch(e) { console.error("Atlas API error", e); return Response.json({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."},{status:503}); } }
