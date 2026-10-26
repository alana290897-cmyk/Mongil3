import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'MONGIL Atlas — Cẩm nang STAR DIVE', description: 'Tra cứu nhân vật, chia sẻ build và đội hình MONGIL: STAR DIVE. Cẩm nang cộng đồng Việt Nam, nguồn thông tin minh bạch.' };
export default function RootLayout({children}: {children: React.ReactNode}) { return <html lang="vi"><body>{children}</body></html>; }
