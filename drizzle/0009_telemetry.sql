CREATE TABLE `app_events` (
	`day` text NOT NULL,
	`event` text NOT NULL,
	`os` text DEFAULT '' NOT NULL,
	`version` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `event`, `os`, `version`)
);
--> statement-breakpoint
CREATE TABLE `app_usage` (
	`device_id` text NOT NULL,
	`day` text NOT NULL,
	`version` text DEFAULT '' NOT NULL,
	`os` text DEFAULT '' NOT NULL,
	`launches` integer DEFAULT 0 NOT NULL,
	`first_seen_day` text DEFAULT '' NOT NULL,
	`last_seen_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`device_id`, `day`)
);
