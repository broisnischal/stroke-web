CREATE TABLE `activations` (
	`id` text PRIMARY KEY NOT NULL,
	`license_id` text NOT NULL,
	`device_id` text NOT NULL,
	`hostname` text,
	`activated_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`license_id`) REFERENCES `licenses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `activations_license_id_idx` ON `activations` (`license_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `activations_license_device_uniq` ON `activations` (`license_id`,`device_id`);
