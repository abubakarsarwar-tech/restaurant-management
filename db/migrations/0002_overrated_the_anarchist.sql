ALTER TABLE "categories" ADD COLUMN "icon" varchar(60);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "color_theme" varchar(24);--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "banner_media_id" uuid;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "is_editors_choice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_banner_media_id_media_assets_id_fk" FOREIGN KEY ("banner_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;