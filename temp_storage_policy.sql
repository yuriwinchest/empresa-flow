CREATE POLICY \
Authenticated
users
can
upload
company
docs\ ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-docs');
CREATE POLICY \
Authenticated
users
can
view
company
docs\ ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'company-docs');
