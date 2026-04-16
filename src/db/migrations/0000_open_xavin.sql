CREATE TABLE `announcement_tags` (
	`announcement_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `announcement_tags_announcement_id_idx` ON `announcement_tags` (`announcement_id`);--> statement-breakpoint
CREATE INDEX `announcement_tags_tag_id_idx` ON `announcement_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author` text,
	`title` text NOT NULL,
	`content` text,
	`level` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`archived_at` text
);
--> statement-breakpoint
CREATE INDEX `announcements_created_at_idx` ON `announcements` (`created_at`);--> statement-breakpoint
CREATE INDEX `announcements_archived_at_idx` ON `announcements` (`archived_at`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);