CREATE TABLE `comment_reports` (
	`comment_id` integer NOT NULL,
	`voter_id` integer NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`comment_id`, `voter_id`),
	FOREIGN KEY (`comment_id`) REFERENCES `request_comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_id`) REFERENCES `voters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `request_comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` integer NOT NULL,
	`voter_id` integer,
	`body` text NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`ip_hash` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `requests`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`voter_id`) REFERENCES `voters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_comments_request_id_idx` ON `request_comments` (`request_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `request_comments_voter_id_created_at_idx` ON `request_comments` (`voter_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `request_comments_ip_hash_created_at_idx` ON `request_comments` (`ip_hash`,`created_at`);