-- Restore into a NEW independent database only. Never apply to the running site.
BEGIN TRANSACTION;
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`time` text NOT NULL
);

CREATE TABLE `members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`created` text NOT NULL
);

CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`author` text NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);

CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` text NOT NULL,
	`until` text NOT NULL
);

CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL
);

CREATE UNIQUE INDEX `credentials_username_unique` ON `credentials` (`username`);
CREATE UNIQUE INDEX `credentials_email_unique` ON `credentials` (`email`);
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` text NOT NULL
);

INSERT INTO records ("id","kind","title","status","author","payload","updated") VALUES ('6cc9d6c0-19a0-44dd-bb48-0833327519c2','team','Test1','published','mfyU00mSi6CkZpnJJkVLtYYdngMVwZm4cgOXLijtrJmXKezYKNcwRR','{"element":"Chưa xác minh","role":"Chưa xác minh","body":"Test","source":"","sourceType":"community","team":["char-narae","char-leeho","char-yeonhwa"]}','2026-10-26T03:34:29.397Z');
INSERT INTO audit ("id","actor","action","target","time") VALUES ('da547811-02ad-42c9-bc05-9cce1a1899eb','chungndtq001@gmail.com','Lưu: published','Test1','2026-10-26T03:34:29.397Z');
INSERT INTO settings(key,value) VALUES ('owner','mfyU00mSi6CkZpnJJkVLtYYdngMVwZm4cgOXLijtrJmXKezYKNcwRR');
INSERT INTO settings(key,value) VALUES ('summary:forum-163','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Esther, Mina, Verna, Cloud, Vivian.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Mốc ngày trong bài: 4/10 (Fri) at 11:00; 4/14 (Tue) 01:00; 4/15 (Tue) 01:00; 5/13 (Wed) 02:59."],"summaryUpdated":"2026-10-26T04:12:59.678Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-221','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Esther, Mina.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Có thay đổi liên quan trang bị.","Có cốt truyện sự kiện và hoạt động giới hạn đi kèm.","Có thông tin bảo trì; cần đối chiếu mốc UTC ghi trong thông báo.","Mốc ngày trong bài: 4/24 (Fri) at 10:00; 4/24 (Fri); 4/23 (Thu); 4/24 (Fri) - 5/7 (Thu) 23:59; 5/7 (Thu) 23:59."],"summaryUpdated":"2026-10-26T04:12:59.610Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-272','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Narae, Nagi, Mina.","Phiên bản được nêu: 1.1, 1.2.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Có thay đổi liên quan trang bị.","Mốc ngày trong bài: 4/30 (Thu) at 10:00; 4/30 (Thu); 4/24 (Fri); 5/7 (Thu) 14:59."],"summaryUpdated":"2026-10-26T04:12:59.613Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-410','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Narae, Nagi.","Phiên bản được nêu: 1.2.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Có thay đổi liên quan trang bị.","Mốc ngày trong bài: 6/16 (Tue) at 19:00; 6/16 (Tue); 6/17 (Wed) 01:00; 5/27 (Wed); 7/6 (Mon) 23:59."],"summaryUpdated":"2026-10-26T04:12:59.625Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-494','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Narae, Jiwon, Ophelia, Mabel, Brisshell.","Phiên bản được nêu: 1.3, 1.2.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Mốc ngày trong bài: 7/20 (Mon) 10:00; 7/29 (Wed); 7/20 (Mon); 7/28 (Tue)."],"summaryUpdated":"2026-10-26T04:12:59.605Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-523','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Brisshell.","Mốc ngày trong bài: 8/12 (Wed) at 10:00; 8/18 (Tue); 8/12 (Wed) / 01:00; 8/13 (Thu); 8/10 (Mon) at 01:50."],"summaryUpdated":"2026-10-26T04:12:59.611Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-541','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Narae, Jiwon, Cloud, Ophelia, Brisshell.","Phiên bản được nêu: 1.4, 1.3.","Có mục điều chỉnh cân bằng nhân vật hoặc hiệu ứng chiến đấu.","Có thay đổi liên quan trang bị.","Mốc ngày trong bài: 8/12 (Wed) at 10:00; 8/18 (Tue); 8/12 (Wed); 9/3 (Thu); 8/18 (Tue) 23:30."],"summaryUpdated":"2026-10-26T04:08:52.723Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-574','{"summary":"Thông tin mới từ nhà phát hành MONGIL: STAR DIVE.","highlights":["Mốc ngày trong bài: 9/8 (Tue)."],"summaryUpdated":"2026-10-26T04:08:52.514Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-584','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Vivian.","Mốc ngày trong bài: 9/2 (Wed) at 10:00; 9/8 (Tue); 9/2 (Wed); 9/2 (Wed) 10:00."],"summaryUpdated":"2026-10-26T04:08:52.789Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-614','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Phiên bản được nêu: 1.4.","Có thay đổi liên quan trang bị.","Mốc ngày trong bài: 9/22 (Tue) at 10:00; 9/23 (Wed) at 01:00; 9/29 (Tue); 9/22 (Tue); 9/22 (Tue) 10:00."],"summaryUpdated":"2026-10-26T04:08:52.517Z"}');
INSERT INTO settings(key,value) VALUES ('summary:forum-685','{"summary":"Tổng hợp trao đổi của nhà phát triển về nội dung, nhân vật và thay đổi dự kiến.","highlights":["Nhân vật được đề cập: Chloe.","Có thay đổi liên quan trang bị.","Mốc ngày trong bài: 10/14 (Wed) at 10:00; 10/21 (Wed); 10/14 (Wed); 10/14 (Wed) 10:00."],"summaryUpdated":"2026-10-26T04:08:52.534Z"}');
INSERT INTO settings(key,value) VALUES ('summary:netmarble-6806','{"summary":"Thông tin cập nhật nội dung trò chơi và các thay đổi được nhà phát hành công bố.","highlights":["Nhân vật được đề cập: Nagi, Mina.","Phiên bản được nêu: 1.2.","Có nội dung về cải tiến thuộc tính hoặc quản lý Monsterling.","Có cốt truyện sự kiện và hoạt động giới hạn đi kèm."],"summaryUpdated":"2026-10-26T04:08:52.580Z"}');
INSERT INTO settings(key,value) VALUES ('local-owner','local:atlas-export-admin');
INSERT INTO members(email,user_id,role,created) VALUES ('chungndtq001@gmail.com','local:atlas-export-admin','admin','2026-10-26T07:29:38.701236+00:00');
INSERT INTO credentials(id,username,email,password_hash,salt) VALUES ('local:atlas-export-admin','admin','chungndtq001@gmail.com','de41b8acf1c46e89b616c3d0f7516923d5a93620a9c6a1ecf025b4c8738e15a4','atlas-export-admin-20261026');
COMMIT;
