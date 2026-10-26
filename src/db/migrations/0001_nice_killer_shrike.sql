CREATE TABLE `request_reports` (
	`request_id` integer NOT NULL,
	`voter_id` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`request_id`, `voter_id`),
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_id`) REFERENCES `voters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `request_votes` (
	`request_id` integer NOT NULL,
	`voter_id` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`request_id`, `voter_id`),
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_id`) REFERENCES `voters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_votes_voter_id_idx` ON `request_votes` (`voter_id`);--> statement-breakpoint
CREATE INDEX `request_votes_request_ip_idx` ON `request_votes` (`request_id`,`ip_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app` text,
	`title` text NOT NULL,
	`body` text,
	`status` text DEFAULT 'open' NOT NULL,
	`shipped_in` text,
	`duplicate_of` integer,
	`voter_id` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`duplicate_of`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`voter_id`) REFERENCES `voters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `requests_status_idx` ON `requests` (`status`);--> statement-breakpoint
CREATE INDEX `requests_voter_id_created_at_idx` ON `requests` (`voter_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `requests_ip_hash_created_at_idx` ON `requests` (`ip_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `voters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `voters_token_hash_unique` ON `voters` (`token_hash`);--> statement-breakpoint
CREATE INDEX `voters_ip_hash_created_at_idx` ON `voters` (`ip_hash`,`created_at`);