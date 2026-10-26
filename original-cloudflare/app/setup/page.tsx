import {requireChatGPTUser} from '../chatgpt-auth';
import {ownerEmail} from '../account-auth';
import {env} from 'cloudflare:workers';
import SetupForm from './setup-form';
export const dynamic='force-dynamic';
export default async function Setup(){const u=await requireChatGPTUser('/setup');if(u.email.toLowerCase()!==ownerEmail)return <main className="setup-standalone"><h1>Không có quyền thiết lập quản trị.</h1><a href="/">Về trang chủ</a></main>;const previous:any=await env.DB!.prepare('SELECT username FROM credentials WHERE email=?').bind(ownerEmail).first();const exists=await env.DB!.prepare("SELECT c.id FROM credentials c JOIN members m ON m.user_id=c.id WHERE m.role='admin' LIMIT 1").first();return <main className="setup-standalone">{exists?<><h1>Đã có tài khoản quản trị</h1><p>Đăng nhập bằng tên tài khoản và mật khẩu tại trang chủ.</p><a className="primary" href="/">Về trang chủ</a></>:<SetupForm email={u.email} existingUsername={previous?.username}/>}</main>}
