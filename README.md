# MONGIL Atlas VN — bản chạy Netlify

Giữ nguyên giao diện, CSS, 610 tệp ảnh/assets, 29 nhân vật với 145 kỹ năng, danh mục 395 trang bị/Monsterling/Artifact/set, các trang build/team, tin và leak của bản gốc. Thay bộ chạy Vinext/Cloudflare bằng Next.js trên Netlify; giữ nguyên logic nghiệp vụ API. Không thay đổi website ChatGPT Sites đang chạy.

## Đưa lên Netlify qua repo GitHub hiện tại

**Phải thay toàn bộ source cũ trong repo, không chỉ chép đè vài tệp.** Source cũ có `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `vite.config.ts` và các cấu hình Cloudflare ở thư mục gốc sẽ khiến Netlify dùng nhầm cấu hình. Bản này dùng npm với `package-lock.json`.

Cách giữ đủ thư mục và ảnh trên Windows là dùng GitHub Desktop:

1. Giải nén ZIP vào thư mục ngắn, ví dụ `C:\Mongil`.
2. Trong GitHub Desktop, chọn File → Clone repository → chọn repo `Mongil3` rồi Clone.
3. Chọn Repository → Show in Explorer để mở thư mục repo đã clone.
4. Sao lưu source cũ nếu cần. Xóa các tệp/thư mục source cũ bên trong repo, **giữ nguyên thư mục `.git`**. Bật View → Show → Hidden items để thấy các thư mục bắt đầu bằng dấu chấm.
5. Mở thư mục `MONGIL-Atlas-VN` vừa giải nén. Chép **nội dung bên trong** thư mục này vào thư mục repo. `package.json`, `package-lock.json`, `netlify.toml`, `app`, `public` phải nằm ngay ở gốc repo, không bị lồng thêm một tầng thư mục. Không upload chính tệp ZIP vào repo.
6. Quay lại GitHub Desktop → ghi Summary `Chuyen MONGIL Atlas sang Netlify` → Commit to main → Push origin.
7. Netlify: mở project đã liên kết repo → Project configuration → Build & deploy hoặc Developer settings → kiểm tra thiết lập:

| Mục | Giá trị |
|---|---|
| Base directory | Để trống nếu source ở gốc repo |
| Package directory | Để trống |
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node.js | `24` |

`netlify.toml` có sẵn các thiết lập trên và Next.js adapter. Nếu đã tự thêm biến `PNPM_FLAGS`, `NETLIFY_USE_PNPM` hoặc build command cho bản cũ thì bỏ các thiết lập đó. Không cần tạo `.openai/hosting.json` ở gốc repo cho bản chuyển đổi này. Không chọn `dist`, `out` hoặc `public` làm Publish directory.

8. Vào Deploys → Trigger deploy → Clear cache and deploy site. Đợi Netlify báo Published.
9. Mở website → Đăng nhập bằng **admin / admin**.

Đây là app có backend. Dùng Git deployment để Netlify build cả API; không kéo ZIP source vào Netlify Drop. Tài khoản Netlify phải có Netlify Blobs khả dụng. Không cần cung cấp token lưu trữ trong mã nguồn: Netlify Functions cấp ngữ cảnh truy cập cho app.

## Tài khoản, dữ liệu và lưu lâu dài

Lần chạy API đầu tiên tự khởi tạo dữ liệu xuất từ bản gốc và tài khoản `admin/admin`. Mật khẩu được lưu dưới dạng PBKDF2, không lưu plain text trong database. Quản trị có thể đổi mật khẩu và tạo tài khoản mới trong mục Tài khoản & phân quyền. Quy tắc mật khẩu mới giữ nguyên tối thiểu 10 ký tự.

Dữ liệu động (build/team, người dùng, phiên đăng nhập, nguồn, cập nhật catalog) nằm trong Netlify Blobs site-wide store `mongil-atlas-v1`, key `atlas.sqlite`, không nằm trong filesystem tạm của Functions. Dữ liệu còn khi reload/cold start và khi deploy lại **cùng Netlify project**. Mỗi project Netlify mới có dữ liệu riêng. Khởi tạo chỉ thực hiện khi chưa có database; deploy không đặt lại mật khẩu hoặc ghi đè dữ liệu đã soạn.

Các thao tác ghi dùng phiên bản ETag và đọc strong consistency. Khi hai phiên sửa cùng lúc, phiên có dữ liệu cũ nhận 409 và thông báo thử lại thay vì ghi đè mất dữ liệu. Cấu trúc SQLite, batch transaction và quy tắc phân quyền gốc được giữ. Có thể tải `atlas.sqlite` trong Netlify Blobs để sao lưu, không chia sẻ file database này công khai vì có dữ liệu tài khoản và phiên đăng nhập.

Khách chưa đăng nhập chỉ xem. Quản trị đăng nhập bằng user/pass mới thêm/sửa/xóa được. ChatGPT SSO không cần thiết cho bản Netlify và các header nhận diện từ trình duyệt không cấp quyền quản trị. `/setup` đưa về trang chủ.

## Nguồn nội dung

Giữ nguyên logic đồng bộ forum, nguồn Netmarble và dữ liệu cộng đồng. Tin/leak có dữ liệu nền và chức năng tải lại. Đồng bộ phụ thuộc nguồn ngoài và kết nối mạng. Fanpage Facebook vẫn cần hai biến Functions `FB_PAGE_ID` và `FB_PAGE_ACCESS_TOKEN` do bạn cung cấp nếu muốn dùng; không có token Facebook trong gói này.

Dữ liệu đã xuất gồm team Test1, dữ liệu nhân vật/catalog nền và các summary đọc được đầy đủ. Cache feed dài bị giới hạn khi xuất không đưa vào SQL; feed nền đã có trong mã nguồn và chức năng đồng bộ tải lại tin mới. Không có bản sao mật khẩu/session của hệ thống đang chạy.

## Chạy và kiểm tra tại máy

Cần Node.js 24:

```sh
npm ci
npm run build
npm start
```

Mở `http://localhost:3000`. Khi chạy local, dữ liệu lưu ở `.local-data/atlas.sqlite` và không được đưa vào Git. Khi chạy trên Netlify, app dùng Netlify Blobs; nếu lưu trữ lỗi, API báo lỗi thay vì âm thầm lưu vào filesystem tạm.

```sh
npm test
```

Kiểm tra database: tài khoản mặc định, dữ liệu qua các request, khởi tạo một lần, xung đột cập nhật và rollback batch. `tests/http.test.mjs` là kiểm tra HTTP trên bản production: đặt biến `ATLAS_HTTP_TEST=1` rồi chạy `node --test tests/http.test.mjs` sau bước build. Chỉ chạy test HTTP với database local để tránh tác động nội dung thật.

## Phạm vi kiểm tra đã hoàn tất

- Next.js production build và TypeScript thành công.
- Netlify CLI `netlify build --offline` thành công, đóng gói Next.js Server Handler Node.js 24 và đủ SQL bootstrap/WASM. Đây là kiểm tra build/đóng gói offline, chưa triển khai vào tài khoản Netlify của bạn.
- HTTP production: khách chỉ xem, đăng nhập admin/admin, thêm/sửa/xóa build và team đã publish, chọn ảnh vật phẩm/Legend, đăng xuất, chặn giả mạo header người dùng.
- UI/CSS, seed, catalog, feed nền và toàn bộ 610 tệp public đối chiếu byte-for-byte với source gốc.
- ZIP được kiểm tra CRC, giải nén và đối chiếu nội dung sau khi đóng gói.

Source Cloudflare trước chuyển đổi được giữ trong `original-cloudflare/` để đối chiếu; không được dùng bởi bản build Netlify. Không upload `node_modules`, `.next`, `.netlify` hoặc `.local-data`; ZIP đã bỏ các thư mục này.
