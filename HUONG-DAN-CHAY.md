# MONGIL Atlas VN — mã nguồn gốc

Bản sao commit `66d81d4af32ec3567163549cdbf5a0ad1e1f6959`, phiên bản website số 4. Giao diện, CSS, React/TypeScript, backend API, ảnh, font và cấu hình gốc được giữ nguyên. Không có thay đổi hoặc triển khai nào lên website đang chạy.

## Có trong ZIP

- `app/`, `components/`, `hooks/`, `lib/`: giao diện và logic ứng dụng.
- `app/api/`, `worker/`: API backend, đăng nhập, CRUD, đồng bộ và tổng hợp nguồn.
- `public/`: toàn bộ assets lưu trong dự án, gồm ảnh và font.
- Bản build sinh tự động `dist/` không đóng gói để tránh lặp lại toàn bộ ảnh; có thể biên dịch từ mã nguồn gốc.
- `app/seed.json`, `app/catalog-seed.json`: dữ liệu nền nhân vật, skill, trang bị, Monsterling và Artifact.
- `db/`, `drizzle/`: schema và migration D1/SQLite.
- `export-data/`: dữ liệu có thể đọc từ database đang chạy và SQL khôi phục độc lập.
- `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `.openai/hosting.json`, `scripts/`: phụ thuộc và cấu hình gốc.
- `EXPORT-MANIFEST.json`, `SHA256SUMS.txt`: thông tin phiên bản, giới hạn dữ liệu và đối chiếu tệp.

## Chạy bản sao độc lập

Cần Node.js >=22.13, pnpm 11.25.0 và Internet để cài phụ thuộc. Đây là ứng dụng React/Vinext với backend Cloudflare Workers + D1, không phải website HTML tĩnh. Netlify dạng kéo-thả chỉ có frontend không thể chạy đầy đủ backend này.

Chạy các lệnh sau tại thư mục chứa `package.json`:

```sh
pnpm install --frozen-lockfile
# Biên dịch nguyên trạng từ mã nguồn gốc:
pnpm exec vite build
# Khôi phục CHỈ vào database local mới, KHÔNG dùng --remote:
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file export-data/restore-new-database.sql
pnpm start
```

Mở địa chỉ local được Wrangler in ra (mặc định http://127.0.0.1:8787). Nhấn Đăng nhập với **user `admin` / pass `admin`**. Tài khoản này được tạo bằng SQL khôi phục với hash PBKDF2 đúng định dạng backend gốc và quyền admin. Không cần mở `/setup` hoặc đăng nhập ChatGPT để dùng tài khoản này. Mật khẩu mặc định chỉ áp dụng cho bản sao được khôi phục; không thay đổi tài khoản website online. Có thể đặt lại mật khẩu tại Quản trị → Tài khoản & phân quyền; mật khẩu mới theo quy tắc gốc tối thiểu 10 ký tự.

Nếu cần biên dịch lại từ source:

```sh
pnpm exec vite build
pnpm start
```

Chỉ nhập SQL một lần vào database trống; file có cả lệnh tạo bảng. Không nhập lại vào DB đã có dữ liệu. `node_modules`, cache máy phát triển và Git history không đóng gói; cài lại bằng lockfile.

## Dữ liệu xuất và giới hạn

Đã xuất toàn bộ 1 record được tạo trên website (team Test1), audit và những setting đọc được đầy đủ. Nội dung nhân vật/catalog nền nằm trong JSON nguồn và được ứng dụng kết hợp khi đọc. `export-data/settings.json` giữ kết quả đọc gốc, kể cả giá trị cache `source-feed` bị giới hạn độ dài bởi công cụ xuất. Giá trị cache không đầy đủ này KHÔNG được nhập vào SQL. Khi mở bản sao, chức năng đồng bộ sẵn có sẽ tải lại tin từ nguồn; vì vậy nội dung cache có thể mới hơn thời điểm xuất. Các tóm tắt riêng đọc được đầy đủ đã được đưa vào SQL.

Không xuất session, mật khẩu/hash tài khoản cũ, lịch sử thử đăng nhập, token hoặc secret hạ tầng. Tài khoản admin/admin thay thế các tài khoản hiện hữu trong database độc lập. Bản gốc `members.json` được giữ để đối chiếu, không tự nhập quyền tài khoản cũ.

Hạ tầng hosting, ChatGPT SSO và database Cloudflare đang chạy không nằm trong ZIP. Mã tích hợp nguyên bản vẫn có trong dự án. Nếu triển khai sang hosting riêng cần cấu hình Cloudflare Worker/D1 mới, ID database mới và HTTPS; không tái sử dụng ID dự án đang chạy. Backend hiện phụ thuộc API Cloudflare nên không chạy đầy đủ trên hosting tĩnh. Đồng bộ forum/nguồn công khai cần Internet và phụ thuộc quyền truy cập nguồn. Fanpage Facebook cần token/Page ID của người triển khai, không có secret được đóng gói.

Chỉ dữ liệu/ảnh lưu trong dự án được đóng gói; các URL ảnh/nội dung bên ngoài vẫn là tham chiếu mạng như bản gốc.
