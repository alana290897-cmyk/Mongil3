import {env} from 'cloudflare:workers';
import {articleSummary} from '../../article-summaries';
import baseline from '../../feed-seed.json';
export const dynamic='force-dynamic';
export async function GET(req:Request){const id=new URL(req.url).searchParams.get('id');const row:any=await env.DB!.prepare("SELECT value FROM settings WHERE key='source-feed'").first();let feed:any={items:[]};try{feed=JSON.parse(row?.value||'{}')}catch{}const item=[...(feed.items||[]),...baseline].find(i=>i.id===id);if(!item)return Response.json({error:'Không tìm thấy bài viết.'},{status:404});try{return Response.json(await articleSummary(item),{headers:{'Cache-Control':'no-store'}})}catch(e:any){return Response.json({error:e.message},{status:502})}}
