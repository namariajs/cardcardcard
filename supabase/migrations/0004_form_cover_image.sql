-- Optional banner image for a form, shown above the title on the public
-- /f/:slug page. Uploaded to the same form-uploads bucket as item photos and
-- receipts (see 0001_forms_feature.sql).

alter table forms add column if not exists cover_image_url text;
