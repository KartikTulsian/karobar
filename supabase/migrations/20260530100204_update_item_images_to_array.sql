-- Remove the old single string column
-- ALTER TABLE items DROP COLUMN image_url;

-- -- Add the new array column, defaulting to an empty list
-- ALTER TABLE items ADD COLUMN images TEXT[] DEFAULT '{}';
SELECT 1;