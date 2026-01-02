select sign(
  row_to_json(r), 
  'OEWz++7tSBVBdRVIB1K7Eg8jOpgXfSTAzdrXlLfPLFs4dp07ipkZ8BdxaAXMnAt1t/PN2kWTSpc56rb5EWOpfA=='
) as new_anon_key
from (
  select 
    'anon' as role, 
    'supabase' as iss, 
    extract(epoch from now())::integer + 315360000 as exp
) r;
