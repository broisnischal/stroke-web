CREATE TABLE `ai_usage` (
	`device_id` text NOT NULL,
	`day` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`last_seen_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`device_id`, `day`)
);
--> statement-breakpoint
CREATE TABLE `ai_usage_ip` (
	`ip` text NOT NULL,
	`day` text NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`ip`, `day`)
);
--> statement-breakpoint
CREATE TABLE `ai_usage_global` (
	`day` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	`primary_requests` integer DEFAULT 0 NOT NULL,
	`overflow_requests` integer DEFAULT 0 NOT NULL
);
