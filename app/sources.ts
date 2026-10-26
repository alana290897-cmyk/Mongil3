import {env} from 'cloudflare:workers';
import seed from './seed.json';
import baseline from './feed-seed.json';
import {articleSummary,manual,summarize} from './article-summaries';
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
const time=(v:any)=>{const n=Number(v);return Number.isFinite(n)&&n>0?new Date(n).toISOString():new Date().toISOString()};
const upcoming=/preview|roadmap|developer.*(?:talk|lounge)|coming soon|sneak.peek|upcoming|first.look/i;
const get=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'Accept':'application/json,text/html','User-Agent':'MongilAtlas/1.0 (community news reader)'}});if(!r.ok)throw Error('HTTP '+r.status);return r;};
export async function syncSources(force=false){
 const db=env.DB!;const cached:any=await db.prepare("SELECT value FROM settings WHERE key='source-feed'").first();let old:any=null;try{old=JSON.parse(cached?.value||'null')}catch{}
 if(old&&Date.now()-new Date(old.updated).getTime()<(force?15000:60000))return {...old,cached:true};
 const items:any[]=[];let forumOk=false;let fbOk=false;const errors:string[]=[];
 const publisherHtml=get('https://org-ch.netmarble.com/Eng/Search?post_tag=MONGIL%3A%20STAR%20DIVE').then(r=>r.text()).catch(()=>null);
 const indexHtml=get('https://www.gacha.gg/mongil-star-dive/news').then(r=>r.text()).catch(()=>null);
 const boards=await Promise.allSettled([2,8,4,21].map(async menu=>{const r=await get('https://forum.netmarble.com/api/game/monster2/official/forum/stardive_gl/article/list?rows=30&start=0&menuSeq='+menu+'&sort=NEW&filterLanguageCd=en_US');const j:any=await r.json();if(j.code!==0||!Array.isArray(j.articleList))throw Error('Forum không cho phép đọc tự động');return j.articleList.map((a:any)=>{const id=a.id||a.articleId||a.articleSeq;const title=clean(a.title||'');return {id:'forum-'+id,kind:upcoming.test(title)?'leak':'news',title,status:'published',author:'sync',updated:time(a.registerDatetime||a.createdDatetime||a.writeDatetime||a.regDate),payload:{source:'https://forum.netmarble.com/stardive_gl/view/'+(a.menuSeq||menu)+'/'+id,sourceType:'official',body:'',version:({2:'Thông báo',8:'Cập nhật',4:'MONGIL Notes',21:'Official Content'} as any)[menu]}}}).filter((a:any)=>a.title&&!a.id.endsWith('undefined'));}));
 for(const b of boards)if(b.status==='fulfilled'){forumOk=true;items.push(...b.value)}
 let forumIndexOk=false;
 if(!forumOk){try{
  const html=await indexHtml;if(!html)throw Error('Index unavailable');
  let count=0;
  for(const block of html.split(/<li id="n\d+"/).slice(1)){
   if(count>=10)break;
   const link=block.match(/href="(https:\/\/forum\.netmarble\.com\/stardive_gl\/view\/(\d+)\/(\d+))"/);
   const rawTitle=block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1];
   const date=block.match(/<time[^>]*dateTime="([^"]+)"/)?.[1];
   if(!link||!rawTitle)continue;
   const title=clean(rawTitle).split(' ').slice(0,17).join(' ');
   items.push({id:'forum-'+link[3],kind:upcoming.test(title)?'leak':'news',title,status:'published',author:'sync',updated:date||new Date().toISOString(),payload:{source:link[1],sourceType:'official',body:'',version:'Forum',indexSource:'https://www.gacha.gg/mongil-star-dive/news'}});count++;
  }
  forumIndexOk=count>0;
 }catch{}
 if(!forumIndexOk)errors.push('Chưa tải được forum. Đang dùng tin Netmarble.');}

 // Official publisher fallback remains live when the forum disallows its list API.
 let newsroomOk=false;let detailsFetched=0;
 try{const html=await publisherHtml;if(!html)throw Error('Publisher unavailable');for(const block of html.split(/<li class="list_item">/).slice(1)){const title=clean(block.match(/<p class="title ellipsis">([\s\S]*?)<\/p>/)?.[1]||'');if(!/MONGIL/i.test(title))continue;const match=block.match(/ContentsClickEvent\('user',\s*'(\d+)',\s*'(\d+)'/);if(!match)continue;const source='https://org-ch.netmarble.com/Eng/Newsroom/Detail?bbs_code='+match[1]+'&post_seq='+match[2];const date=block.match(/<div class="date">([\d.]+)<\/div>/)?.[1]?.replaceAll('.','-');items.push({id:'netmarble-'+match[2],kind:upcoming.test(title)?'leak':'news',title,status:'published',author:'sync',updated:date?date+'T00:00:00.000Z':new Date().toISOString(),payload:{source,sourceType:'official',body:'',version:'Netmarble'}});newsroomOk=true;
 // Detect newly released characters from the publisher's release wording.
 if(!seed.some(i=>i.kind==='character'&&title.toLowerCase().includes(i.title.toLowerCase()))&&detailsFetched++<2&&(!old||!old.items?.some((i:any)=>i.id==='netmarble-'+match[2]))){try{const page=await(await get(source)).text();const text=clean(page);const found=text.match(/introducing\s+([A-Z][a-z]+),\s+a\s+new\s+(?:five|5)-star\s+(\w+)-element/i);if(found){const name=found[1];const id='char-'+name.toLowerCase();const exists=seed.some(i=>i.id===id)||await db.prepare('SELECT id FROM records WHERE id=?').bind(id).first();if(!exists){const elem:Record<string,string>={wind:'Phong',fire:'Hỏa',ice:'Băng',earth:'Thổ',lightning:'Lôi'};const image=page.match(/https:\/\/channeln\.gcdn\.netmarble\.com\/[^"<>\s]+\.(?:jpg|png)/)?.[0]||'';const payload={source,sourceType:'official',body:'',image,thumb:image,element:elem[found[2].toLowerCase()]||found[2],rarity:'5',role:text.includes(name+' is a Fighter')?'Fighter':'',version:date};await db.prepare("INSERT OR IGNORE INTO records(id,kind,title,status,author,payload,updated) VALUES (?,'character',?,'published','sync',?,?)").bind(id,name,JSON.stringify(payload),new Date().toISOString()).run();}}}catch{}}
 }}catch{errors.push('Không thể kết nối Netmarble.');}
 const e=env as any;
 if(e.FB_PAGE_ACCESS_TOKEN&&e.FB_PAGE_ID){try{const url='https://graph.facebook.com/v23.0/'+encodeURIComponent(e.FB_PAGE_ID)+'/posts?fields=id,message,created_time,permalink_url&limit=20';const r=await fetch(url,{headers:{Authorization:'Bearer '+e.FB_PAGE_ACCESS_TOKEN},signal:AbortSignal.timeout(10000)});const j:any=await r.json();if(!r.ok||!j.data)throw Error();for(const a of j.data){const title=String(a.message||'').split('\n')[0].slice(0,180);if(!title)continue;items.push({id:'fb-'+a.id,kind:upcoming.test(title)?'leak':'news',title,status:'published',author:'sync',updated:a.created_time,payload:{source:a.permalink_url,sourceType:'official',body:'',version:'Facebook'}})}fbOk=true;}catch{errors.push('Không thể tải fanpage.');}}
 const unique=[...new Map([...baseline,...(old?.items||[]),...items].map((i:any)=>[i.id,i])).values()] as any[];
 // Preserve previously fetched summaries, and enrich a bounded batch of previews per refresh.
 for(const i of unique){const prior=old?.items?.find((p:any)=>p.id===i.id);const summary=manual[i.id]||(!prior?.payload?.summaryPartial&&prior?.payload?.summary)&&{summary:prior.payload.summary,highlights:prior.payload.highlights,summaryUpdated:prior.payload.summaryUpdated};if(summary)Object.assign(i.payload,summary,{summaryPartial:false});}
 const need=unique.filter(i=>i.kind==='leak'&&(!i.payload.summary||i.payload.summaryPartial)).slice(0,6);
 await Promise.allSettled(need.map(async i=>Object.assign(i.payload,await articleSummary(i))));
 for(const i of unique)if(!i.payload.summary){const brief=summarize(i.title,i.title);i.payload.summary=brief.summary;i.payload.highlights=brief.highlights;i.payload.summaryPartial=true;}
 unique.sort((a,b)=>new Date(b.updated).getTime()-new Date(a.updated).getTime());
 const value={items:unique.slice(0,160),updated:new Date().toISOString(),forumOk,forumIndexOk,newsroomOk,fbOk,facebookConfigured:!!e.FB_PAGE_ACCESS_TOKEN,error:errors.join(' ')};
 if(!forumOk&&!newsroomOk&&old)return {...old,error:errors.join(' '),stale:true};
 await db.prepare("INSERT INTO settings(key,value) VALUES ('source-feed',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(value)).run();return value;
}
