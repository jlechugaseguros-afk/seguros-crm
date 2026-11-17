-- Límites de tamaño y tipo de archivo en almacenamiento (seguridad)
update storage.buckets set file_size_limit = 26214400 where id = 'documentos';
update storage.buckets set file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif']
  where id = 'tarjetas-fotos';
