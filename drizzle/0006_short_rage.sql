CREATE TABLE `enterprise_domains` (
	`id` text PRIMARY KEY NOT NULL,
	`domain` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`plan` text DEFAULT 'team' NOT NULL,
	`provider` text NOT NULL,
	`provider_customer_id` text,
	`provider_payment_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_domains_domain_unique` ON `enterprise_domains` (`domain`);--> statement-breakpoint
CREATE UNIQUE INDEX `enterprise_domains_provider_payment_id_unique` ON `enterprise_domains` (`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `enterprise_domains_owner_user_id_idx` ON `enterprise_domains` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `enterprise_domains_domain_idx` ON `enterprise_domains` (`domain`);