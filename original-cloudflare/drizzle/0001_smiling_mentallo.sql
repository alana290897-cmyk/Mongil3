CREATE TABLE `attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` text NOT NULL,
	`until` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_username_unique` ON `credentials` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `credentials_email_unique` ON `credentials` (`email`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` text NOT NULL
);
