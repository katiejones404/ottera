-- Run partner_resources_schema.sql first.

insert into public.nonprofits (
  external_key, name, website, zip_codes, addresses, focus_area,
  description, distribution_schedule, contact_email, contact_phone, approval_status, approved_at, approved_by
)
values
  (
    'np_harbor_shelter',
    'Harbor Shelter Network',
    'https://harborshelter.example.org',
    array['27601','27603'],
    '[{"line1":"120 Harbor St","city":"Raleigh","state":"NC","zip":"27601"}]'::jsonb,
    'shelter',
    'Emergency and transitional shelter with case management.',
    'Intake daily 6:00 PM - 9:00 PM',
    'intake@harborshelter.example.org',
    '(919) 555-1101',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_nightbridge_shelter',
    'NightBridge Community Shelter',
    'https://nightbridge.example.org',
    array['27701','27703'],
    '[{"line1":"45 Elm Ave","city":"Durham","state":"NC","zip":"27701"}]'::jsonb,
    'shelter',
    'Night shelter and housing referrals for adults and families.',
    'Beds released daily at 5:30 PM',
    'hello@nightbridge.example.org',
    '(919) 555-1102',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_safehaven_shelter',
    'SafeHaven Family Shelter',
    'https://safehaven.example.org',
    array['27511','27513'],
    '[{"line1":"880 Maple Rd","city":"Cary","state":"NC","zip":"27511"}]'::jsonb,
    'shelter',
    'Family shelter with children services and social worker support.',
    'Check-in Mon-Sun 4:00 PM - 8:00 PM',
    'support@safehaven.example.org',
    '(919) 555-1103',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_triangle_food_bank',
    'Triangle Food Distribution Coalition',
    'https://trianglefood.example.org',
    array['27601','27610','27545'],
    '[{"line1":"210 Market St","city":"Raleigh","state":"NC","zip":"27601"}]'::jsonb,
    'food',
    'Weekly food boxes, pantry staples, and fresh produce pickup.',
    'Tue/Thu/Sat 10:00 AM - 2:00 PM',
    'info@trianglefood.example.org',
    '(919) 555-2201',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_freshroute_food',
    'FreshRoute Food Partners',
    'https://freshroute.example.org',
    array['27701','27704'],
    '[{"line1":"11 Greenway Blvd","city":"Durham","state":"NC","zip":"27701"}]'::jsonb,
    'food',
    'Mobile food distribution and community meal kits.',
    'Mon/Wed/Fri 11:30 AM - 4:30 PM',
    'team@freshroute.example.org',
    '(919) 555-2202',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_mealbridge_food',
    'MealBridge Outreach',
    'https://mealbridge.example.org',
    array['27511','27560'],
    '[{"line1":"94 Oak Park","city":"Cary","state":"NC","zip":"27511"}]'::jsonb,
    'food',
    'Neighborhood food access and prepared meal distribution.',
    'Daily noon distribution',
    'contact@mealbridge.example.org',
    '(919) 555-2203',
    'approved',
    now(),
    'seed-script'
  ),
  (
    'np_openpantry_food',
    'Open Pantry Collective',
    'https://openpantry.example.org',
    array['27514','27516'],
    '[{"line1":"302 Franklin Ln","city":"Chapel Hill","state":"NC","zip":"27514"}]'::jsonb,
    'food',
    'Food pantry and home-delivery for seniors and families.',
    'Mon-Sat 9:00 AM - 1:00 PM',
    'hello@openpantry.example.org',
    '(919) 555-2204',
    'approved',
    now(),
    'seed-script'
  )
on conflict (external_key) do update
set
  name = excluded.name,
  website = excluded.website,
  zip_codes = excluded.zip_codes,
  addresses = excluded.addresses,
  focus_area = excluded.focus_area,
  description = excluded.description,
  distribution_schedule = excluded.distribution_schedule,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  approval_status = excluded.approval_status,
  approved_at = excluded.approved_at,
  approved_by = excluded.approved_by;

insert into public.nonprofit_admin_usernames (nonprofit_id, username)
select n.id, admins.username
from public.nonprofits n
join (
  values
    ('np_harbor_shelter', 'harbor_admin'),
    ('np_nightbridge_shelter', 'nightbridge_admin'),
    ('np_safehaven_shelter', 'safehaven_admin'),
    ('np_triangle_food_bank', 'trianglefood_admin'),
    ('np_freshroute_food', 'freshroute_admin'),
    ('np_mealbridge_food', 'mealbridge_admin'),
    ('np_openpantry_food', 'openpantry_admin')
) as admins(external_key, username)
  on admins.external_key = n.external_key
on conflict (nonprofit_id, username) do nothing;

insert into public.resource_listings (
  external_key, title, description, category_slug, listing_source, nonprofit_id,
  posted_by_username, location_label, zip_codes, website, contact_info, distribution_schedule, status
)
select
  x.external_key,
  x.title,
  x.description,
  x.category_slug,
  x.listing_source,
  n.id,
  x.posted_by_username,
  x.location_label,
  x.zip_codes,
  x.website,
  x.contact_info,
  x.distribution_schedule,
  'active'
from (
  values
    -- 3 clothing distributors (individual users)
    (
      'clothing_threadswap_1',
      'ThreadSwap Free Closet',
      'Community member giving away seasonal clothing and shoes.',
      'closet',
      'individual',
      null,
      'closetqueen_kia',
      'Raleigh, NC',
      array['27601','27603'],
      null,
      '{"email":"closetqueen@example.com"}'::jsonb,
      'Weekends 10:00 AM - 1:00 PM'
    ),
    (
      'clothing_givebox_2',
      'GiveBox Apparel Pickup',
      'Free family clothing bundles by appointment.',
      'closet',
      'individual',
      null,
      'givebox_morgan',
      'Durham, NC',
      array['27701','27703'],
      null,
      '{"email":"givebox@example.com"}'::jsonb,
      'Tue/Thu 4:00 PM - 7:00 PM'
    ),
    (
      'clothing_rewear_3',
      'ReWear Closet Share',
      'Children and adult basics available every week.',
      'closet',
      'individual',
      null,
      'rewear_aria',
      'Cary, NC',
      array['27511','27513'],
      null,
      '{"email":"rewear@example.com"}'::jsonb,
      'Sat 11:00 AM - 3:00 PM'
    ),

    -- 3 shelter nonprofits
    (
      'shelter_harbor_1',
      'Harbor Shelter Evening Intake',
      'Open beds and family intake services.',
      'shelters',
      'nonprofit',
      'np_harbor_shelter',
      null,
      'Raleigh, NC',
      array['27601','27603'],
      'https://harborshelter.example.org',
      '{"phone":"(919) 555-1101"}'::jsonb,
      'Daily 6:00 PM - 9:00 PM'
    ),
    (
      'shelter_nightbridge_2',
      'NightBridge Shelter Check-In',
      'Emergency overnight shelter and referral services.',
      'shelters',
      'nonprofit',
      'np_nightbridge_shelter',
      null,
      'Durham, NC',
      array['27701','27703'],
      'https://nightbridge.example.org',
      '{"phone":"(919) 555-1102"}'::jsonb,
      'Daily 5:30 PM'
    ),
    (
      'shelter_safehaven_3',
      'SafeHaven Family Beds',
      'Family shelter intake with children support staff.',
      'shelters',
      'nonprofit',
      'np_safehaven_shelter',
      null,
      'Cary, NC',
      array['27511','27513'],
      'https://safehaven.example.org',
      '{"phone":"(919) 555-1103"}'::jsonb,
      'Mon-Sun 4:00 PM - 8:00 PM'
    ),

    -- 4 food nonprofits
    (
      'food_triangle_1',
      'Triangle Food Box Pickup',
      'Weekly produce and pantry staples.',
      'pantry',
      'nonprofit',
      'np_triangle_food_bank',
      null,
      'Raleigh, NC',
      array['27601','27610'],
      'https://trianglefood.example.org',
      '{"phone":"(919) 555-2201"}'::jsonb,
      'Tue/Thu/Sat 10:00 AM - 2:00 PM'
    ),
    (
      'food_freshroute_2',
      'FreshRoute Mobile Pantry',
      'Mobile distribution across Durham neighborhoods.',
      'pantry',
      'nonprofit',
      'np_freshroute_food',
      null,
      'Durham, NC',
      array['27701','27704'],
      'https://freshroute.example.org',
      '{"phone":"(919) 555-2202"}'::jsonb,
      'Mon/Wed/Fri 11:30 AM - 4:30 PM'
    ),
    (
      'food_mealbridge_3',
      'MealBridge Community Meals',
      'Prepared meals and pantry bags.',
      'pantry',
      'nonprofit',
      'np_mealbridge_food',
      null,
      'Cary, NC',
      array['27511','27560'],
      'https://mealbridge.example.org',
      '{"phone":"(919) 555-2203"}'::jsonb,
      'Daily 12:00 PM'
    ),
    (
      'food_openpantry_4',
      'Open Pantry Family Distribution',
      'Pantry pickup and senior delivery signups.',
      'pantry',
      'nonprofit',
      'np_openpantry_food',
      null,
      'Chapel Hill, NC',
      array['27514','27516'],
      'https://openpantry.example.org',
      '{"phone":"(919) 555-2204"}'::jsonb,
      'Mon-Sat 9:00 AM - 1:00 PM'
    )
) as x(
  external_key, title, description, category_slug, listing_source, nonprofit_external_key,
  posted_by_username, location_label, zip_codes, website, contact_info, distribution_schedule
)
left join public.nonprofits n on n.external_key = x.nonprofit_external_key
on conflict (external_key) do update
set
  title = excluded.title,
  description = excluded.description,
  category_slug = excluded.category_slug,
  listing_source = excluded.listing_source,
  nonprofit_id = excluded.nonprofit_id,
  posted_by_username = excluded.posted_by_username,
  location_label = excluded.location_label,
  zip_codes = excluded.zip_codes,
  website = excluded.website,
  contact_info = excluded.contact_info,
  distribution_schedule = excluded.distribution_schedule,
  status = excluded.status;
