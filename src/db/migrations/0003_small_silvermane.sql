ALTER TABLE `requests` ADD `priority` text;--> statement-breakpoint
UPDATE `requests` SET `status` = 'open', `priority` = 'high' WHERE `status` = 'planned';--> statement-breakpoint
UPDATE `requests` SET `status` = 'closed' WHERE `status` IN ('declined', 'duplicate');
