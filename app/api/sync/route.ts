import {syncSources} from '../../sources';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{return Response.json(await syncSources(new URL(req.url).searchParams.get('reload')==='1'),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Không thể tải nguồn. Vui lòng thử lại.'},{status:503})}}
