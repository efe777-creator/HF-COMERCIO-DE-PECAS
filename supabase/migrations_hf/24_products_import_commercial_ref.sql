-- Nota: commercial_ref NOT NULL no DB live. INSERT de produto na importação
-- deve sempre setar commercial_ref = sku (ver 22_products_import_autocreate_categories.sql
-- e 23_apps_import_autocreate_product.sql). Soft-fail usa errors text[].
select 1;
