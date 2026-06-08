CREATE TABLE `licenses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`license_key` text NOT NULL,
	`plan` text DEFAULT 'pro' NOT NULL,
	`max_devices` integer DEFAULT 2 NOT NULL,
	`issued_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_user_id_unique` ON `licenses` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `licenses_license_key_unique` ON `licenses` (`license_key`);--> statement-breakpoint
CREATE INDEX `licenses_user_id_idx` ON `licenses` (`user_id`);