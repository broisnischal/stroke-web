CREATE TABLE `device_trials` (
	`device_id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`hostname` text,
	`last_seen_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
