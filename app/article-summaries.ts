import {env} from './runtime-env';
import seed from './seed.json';
export const manual:Record<string,{summary:string;highlights:string[]}>= {
 'forum-719':{summary:'Buổi Developer Lounge tháng 10 đề cập hợp tác Fortnite, việc rà soát Nagi và các cải tiến được chuẩn bị cho phiên bản 1.5.',highlights:['Có thông tin về chế độ đi bộ và các đợt quay lại Summer Dive.','Nhà phát triển tiếp nhận phản hồi về hệ thống Monsterling và kết quả khảo sát phiên bản 1.4.','Mã được công bố trong buổi phát sóng: HAPPYHALF1014.']},
 'forum-631':{summary:'Tổng hợp nội dung phiên bản 1.4 và dịp Half Anniversary: vùng Gaba Archipelago, Isabella, Chloe và boss huyền thoại Sorin.',highlights:['Cốt truyện EP.7 giới thiệu Isabella và Chloe.','Bổ sung Elemental Sanctum, nơi chiến đấu với các boss xuất hiện liên tiếp.','Có cải tiến quản lý trang bị, đánh dấu Monsterling, tự nâng cấp nhân vật và tính năng Archive.']},
 'forum-591':{summary:'Bản tổng hợp đầu tháng 9 giới thiệu định hướng Half Anniversary, các đợt tuyển mộ quay lại và thay đổi cân bằng cho phiên bản 1.4.',highlights:['Có thông tin về Mina quay lại và định hướng phát hành nhân vật phiên bản 1.5.','Giới thiệu Sorin, Legendary Monster mới sau Reginula, cùng Monsterling tương ứng.']},
 'forum-429':{summary:'Nhà phát triển giới thiệu nội dung mùa hè phiên bản 1.2 và Monsterling huyền thoại Reginula.',highlights:['Legendary Monsterling sử dụng ô trang bị riêng trên nhân vật.','Tài nguyên Twinkling Starlight dùng để triệu hồi và phát triển Monsterling huyền thoại.','Có phần hỏi đáp và trao đổi về trải nghiệm người chơi.']},
 'netmarble-7074':{summary:'Chloe ra mắt dưới dạng nhân vật Phong 5 sao, vai trò Fighter. Đợt cập nhật đi kèm cốt truyện sự kiện và hoạt động giới hạn.',highlights:['Sự kiện The Road to a Broken Heart mở trong ba tuần.','Có nhiệm vụ riêng, quà đăng nhập của Chloe và đợt tuyển mộ quay lại Esther, Nagi.','Hoạt động Halloween Nightmarch được lên lịch cho tuần tiếp theo của bản cập nhật.']}
};
const clean=(s:string)=>s.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
export function summarize(text:string,title:string){
 const lower=text.toLowerCase(),highlights:string[]=[];
 const chars=seed.filter(c=>c.kind==='character'&&new RegExp('\\b'+c.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b','i').test(text)).map(c=>c.title);
 if(chars.length)highlights.push('Nhân vật được đề cập: '+chars.slice(0,7).join(', ')+'.');
 const versions=[...new Set(text.match(/(?:version|ver\.?|v)\s*1\.\d+/gi)||[])].map(v=>v.replace(/(?:version|ver\.?|v)\s*/i,''));if(versions.length)highlights.push('Phiên bản được nêu: '+[...new Set(versions)].join(', ')+'.');
 const pairs:[RegExp,string][]=[[/fortnite/i,'Có thông tin về hợp tác Fortnite.'],[/sorin/i,'Có nội dung liên quan boss / Monsterling huyền thoại Sorin.'],[/reginula/i,'Có nội dung về Legendary Monsterling Reginula.'],[/balance (?:adjust|change)|buff|nerf/i,'Có mục điều chỉnh cân bằng nhân vật hoặc hiệu ứng chiến đấu.'],[/walking mode|walk mode/i,'Có đề cập chế độ đi bộ.'],[/rerun|recruit.*return/i,'Có thông tin về các đợt tuyển mộ quay lại.'],[/trait.*(?:change|reset|upgrade)|monsterling.*(?:improve|adjust)/i,'Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.'],[/equipment.*(?:improve|adjust)|gear.*(?:improve|adjust)/i,'Có thay đổi liên quan trang bị.'],[/event story|special story/i,'Có cốt truyện sự kiện và hoạt động giới hạn đi kèm.'],[/maintenance/i,'Có thông tin bảo trì; cần đối chiếu mốc UTC ghi trong thông báo.']];
 for(const [r,s] of pairs)if(r.test(text))highlights.push(s);
 const dates=[...new Set(text.match(/\b\d{1,2}\/\d{1,2}\s*\((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\)(?:[^.]{0,25}?\d{2}:\d{2})?/g)||[])];if(dates.length)highlights.push('Mốc ngày trong bài: '+dates.slice(0,5).join('; ')+'.');
 const summary=/lounge|developer/i.test(title)?'Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.':/update/i.test(title)?'Thông tin cập nhật nội dung trò chơi và các thay đổi được nhà phát hành công bố.':/maintenance|patch/i.test(title)?'Thông báo vận hành, bảo trì hoặc sửa lỗi của MONGIL: STAR DIVE.':'Thông tin mới từ nhà phát hành MONGIL: STAR DIVE.';
 return {summary,highlights:[...new Set(highlights)].slice(0,7)};
}
export async function articleSummary(item:any,force=false){
 if(manual[item.id])return {...manual[item.id],summaryUpdated:new Date().toISOString()};
 const db=env.DB!,key='summary:'+item.id;const row:any=await db.prepare('SELECT value FROM settings WHERE key=?').bind(key).first();let old:any;try{old=JSON.parse(row?.value||'null')}catch{}
 if(old&&!force&&Date.now()-new Date(old.summaryUpdated).getTime()<3600000)return old;
 const source=item.payload?.source||'';let text='';
 const match=source.match(/^https:\/\/forum\.netmarble\.com\/stardive_gl\/view\/(\d+)\/(\d+)$/);
 if(match){const r=await fetch('https://forum.netmarble.com/api/game/monster2/official/forum/stardive_gl/article/'+match[2]+'?menuSeq='+match[1]+'&viewFlag=false',{signal:AbortSignal.timeout(12000)});const j:any=await r.json();if(!r.ok||j.code!==0||!j.article?.content)throw Error('Chưa tải được nội dung bài gốc.');text=clean(j.article.content);}
 else if(/^https:\/\/(?:org-ch|ch)\.netmarble\.com\/Eng\/Newsroom\/Detail\?/.test(source)){const r=await fetch(source,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Chưa kết nối được nguồn.');const html=await r.text();text=clean(html.slice(html.search(/(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER) \d/)));}
 else return {summary:item.payload?.body||'',highlights:[]};
 const value={...summarize(text,item.title),summaryUpdated:new Date().toISOString()};await db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,JSON.stringify(value)).run();return value;
}
