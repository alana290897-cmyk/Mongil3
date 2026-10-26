import {env} from './runtime-env';
import baseline from './catalog-seed.json';
export type Asset={id:string;kind:string;title:string;image:string;source:string;description?:string;rarity?:string;slot?:string;setId?:string;setName?:string;effects?:{count:number;text:string}[];hasLink?:boolean;linkName?:string;updated?:string;[key:string]:any};
export const assetKinds=['equipment','monsterling','legend','artifact','set'];
export async function getCatalog():Promise<Asset[]>{
 let remote:Asset[]=[];try{const x:any=await env.DB!.prepare("SELECT value FROM settings WHERE key='catalog-cache'").first();remote=JSON.parse(x?.value||'[]')}catch{}
 const rows=await env.DB!.prepare("SELECT * FROM records WHERE kind IN ('equipment','monsterling','legend','artifact','set')").all();
 const map=new Map<string,Asset>((baseline as Asset[]).map(a=>[a.id,a]));for(const a of remote)map.set(a.id,{...map.get(a.id),...a});
 const details=await env.DB!.prepare("SELECT value FROM settings WHERE key LIKE 'asset:%'").all();for(const r of details.results as any[]){try{const a=JSON.parse(r.value);if(map.has(a.id))map.set(a.id,{...map.get(a.id),...a})}catch{}}
 for(const r of rows.results as any[]){if(r.status==='deleted'||r.status!=='published')map.delete(r.id);else map.set(r.id,{...map.get(r.id),...JSON.parse(r.payload),id:r.id,title:r.title,kind:r.kind})}
 return [...map.values()];
}
const decode=(x:any):any=>Array.isArray(x)&&x.length===2&&typeof x[0]==='number'?decode(x[1]):Array.isArray(x)?x.map(decode):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,decode(v)])):x;
const entities=(s:string)=>s.replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export async function refreshCatalog(){
 const old=await getCatalog();const known=new Map(old.map(a=>[a.id,a]));let updated=0;const errors:string[]=[];
 const results=await Promise.allSettled([['equipment','set','sets'],['monsterlings','monsterling','monsterlings'],['artifacts','artifact','artifacts']].map(async([path,kind,key])=>{
  const r=await fetch('https://www.kaiden.gg/mongil/'+path+'/',{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(path);
  const html=await r.text();let values:any[]=[];for(const match of html.matchAll(/\bprops="([^"]+)"/g)){try{const p=decode(JSON.parse(entities(match[1])));if(Array.isArray(p[key])){values=p[key];break}}catch{}}
  if(!values.length)throw Error(path);
  return values.map(v=>{const c=v.card;const id=kind+'-'+v.id;const prev=known.get(id);return {...prev,id,kind:kind==='monsterling'&&['Reginula','Sorin'].includes(c.name)?'legend':kind,title:c.name,image:prev?.image||'https://www.kaiden.gg'+c.imagePath,source:'https://www.kaiden.gg'+c.url,rarity:String(v.rarity||prev?.rarity||''),hasLink:!!v.hasLinkSkill,updated:new Date().toISOString()} as Asset});
 }));
 for(const r of results){if(r.status==='fulfilled')for(const a of r.value){known.set(a.id,a);updated++}else errors.push(String(r.reason))}
 if(!updated)throw Error('Chưa kết nối được nguồn thư viện. Dữ liệu hiện có vẫn được giữ.');
 const values=[...known.values()];await env.DB!.prepare("INSERT INTO settings(key,value) VALUES ('catalog-cache',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(JSON.stringify(values)).run();return {items:values,updated:new Date().toISOString(),count:updated,partial:errors.length>0};
}
export async function buildSnapshot(p:any){
 if(!p.selection)return;
 const catalog=await getCatalog();const map=new Map(catalog.map(a=>[a.id,a]));const s=p.selection;
 const select=(ids:any,kind:string,max:number)=>{if(!Array.isArray(ids)||ids.length>max)throw Error('Số ô '+kind+' không hợp lệ.');return ids.filter(Boolean).map((id:any)=>{const a=map.get(id);if(!a||a.kind!==kind)throw Error('Vật phẩm không hợp lệ hoặc đã bị xóa.');return a})};
 const gear=select(s.equipment||[],'equipment',4),monsters=select(s.monsterlings||[],'monsterling',3);if(new Set(gear.map(a=>a.slot)).size!==gear.length)throw Error('Mỗi vị trí chỉ được chọn một trang bị.');
 const legend=s.legend?select([s.legend],'legend',1):[],artifact=s.artifact?select([s.artifact],'artifact',1):[];
 p.loadoutSnapshot={equipment:gear,monsterlings:(s.monsterlings||[]).map((id:string)=>id?map.get(id):null),legend:legend[0]||null,artifact:artifact[0]||null,sets:[...new Set(gear.map(a=>a.setId))].map(id=>{const a=map.get(id!);return a?{...a,equipped:gear.filter(g=>g.setId===id).length}:null}).filter(Boolean)};
}
export async function refreshAsset(id:string){
 const db=env.DB!;const asset=(await getCatalog()).find(a=>a.id===id);if(!asset)throw Error('Không tìm thấy vật phẩm.');
 const authored:any=await db.prepare('SELECT id FROM records WHERE id=?').bind(id).first();if(authored)return asset;
 const key='asset:'+id;const cached:any=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();if(cached){try{const a=JSON.parse(cached.value);if(Date.now()-new Date(a.refreshedAt).getTime()<21600000)return a}catch{}}
 if(!/^https:\/\/www\.kaiden\.gg\/mongil\/(?:monsterlings|equipment|artifacts)\/[a-z0-9-]+\/$/.test(asset.source))return asset;
 const r=await fetch(asset.source,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Chưa kết nối được nguồn vật phẩm.');const html=await r.text();let result:Asset={...asset};
 for(const m of html.matchAll(/\bprops="([^"]+)"/g)){try{const p=decode(JSON.parse(entities(m[1])));if(p.variants?.length){const v=[...p.variants].sort((a,b)=>b.grade-a.grade)[0];const text=entities(v.fixedAbility||'').replace(/<[^>]*>/g,'').replace(/\\n/g,' ').trim();if(text)result.description=text;result.traitSlots=v.traitSlots;result.rarity=String(v.grade);break}}catch{}}
 if(asset.kind==='set'){
  const effects=[...html.matchAll(/<span[^>]*>\s*([24])\s*<\/span>\s*<p[^>]*>([\s\S]*?)<\/p>/g)].map(m=>({count:Number(m[1]),text:entities(m[2].replace(/<[^>]*>/g,'')).trim()}));if(effects.length)result.effects=effects;
 }
 const link=html.match(/Link Skill: ([^<]+)/);if(link)result.linkName=entities(link[1]).trim();result.refreshedAt=new Date().toISOString();
 await db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(result)).run();return result;
}
