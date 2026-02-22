// backend/index.js
require('dotenv').config()
const express = require('express')
const http = require('http')
const { Server: SocketServer } = require('socket.io')
const cors = require('cors')
const crypto = require('crypto')
const supabase = require('./lib/supabaseAdmin')
const supabaseAuth = require('./lib/supabaseAuth')

const app = express()
const httpServer = http.createServer(app)

const allowedOrigins = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:3000', 'http://localhost:3001']

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '15mb' }))

const io = new SocketServer(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] }
})

// Socket.io: real-time messaging
io.on('connection', (socket) => {
  socket.on('join_conversations', (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach((id) => socket.join(`conversation:${id}`))
    }
  })

  socket.on('leave_conversations', (conversationIds) => {
    if (Array.isArray(conversationIds)) {
      conversationIds.forEach((id) => socket.leave(`conversation:${id}`))
    }
  })

  socket.on('send_message', async ({ conversationId, content, token, event_id = null }) => {
    if (!conversationId || !content || !token) return
    try {
      const { data: userData } = await supabase.auth.getUser(token)
      const userId = userData?.user?.id
      if (!userId) return

      const { data: profile } = await loadProfileByUserId(userId)
      const senderUsername = profile?.username || 'user'

      const { data: message, error } = await supabase
        .from('messages')
        .insert([{ conversation_id: conversationId, sender_id: userId, sender_username: senderUsername, content, event_id }])
        .select('*')
        .single()

      if (error || !message) return
      io.to(`conversation:${conversationId}`).emit('new_message', message)
    } catch (e) {
      console.error('send_message socket error:', e.message)
    }
  })
})

const PORT = process.env.PORT || 4000
const NONPROFIT_MEDIA_BUCKET = process.env.SUPABASE_NONPROFIT_MEDIA_BUCKET || 'nonprofit-media'
const CLOTHING_ITEMS_BUCKET = process.env.SUPABASE_CLOTHING_BUCKET || 'clothing-items'

const ALLOWED_ROLES = new Set([
  'admin',
  'person_in_need',
  'clothes_donor',
  'volunteer',
  'nonprofit_employee'
])

const ALLOWED_FOCUS_AREAS = new Set(['clothing', 'healthcare', 'shelter', 'food', 'miscellaneous', 'other'])

const normalizeFocusArea = (focusArea) => {
  if (!focusArea) return 'miscellaneous'
  if (focusArea === 'other') return 'miscellaneous'
  return focusArea
}

const mapFocusAreaToCategorySlug = (focusArea) => {
  const normalized = normalizeFocusArea(focusArea)
  if (normalized === 'food') return 'pantry'
  if (normalized === 'shelter') return 'shelters'
  return 'closet'
}

const getPrimaryRole = (roles = []) => {
  if (roles.includes('admin')) return 'admin'
  if (roles.includes('nonprofit_employee')) return 'nonprofit_employee'
  if (roles.includes('volunteer')) return 'volunteer'
  if (roles.includes('clothes_donor')) return 'clothes_donor'
  return 'person_in_need'
}

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  return token
}

const requireAuthenticatedUser = async (req, res) => {
  const token = getBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'missing bearer token' })
    return null
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData?.user?.id) {
    res.status(401).json({ error: userErr?.message || 'invalid auth token' })
    return null
  }

  return userData.user
}

const loadProfileByUserId = async (userId) =>
  supabase
    .from('profiles')
    .select('id, first_name, last_name, username, email, zip_code')
    .eq('id', userId)
    .single()

const parseImageDataUrl = (dataUrl) => {
  if (typeof dataUrl !== 'string') return null
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!match) return null
  const contentType = match[1]
  const base64Payload = match[2]
  const extensionByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }
  const extension = extensionByType[contentType]
  if (!extension) return null

  let buffer
  try {
    buffer = Buffer.from(base64Payload, 'base64')
  } catch {
    return null
  }
  if (!buffer || buffer.length === 0) return null
  return { contentType, extension, buffer }
}

const uploadNonprofitMediaImage = async ({ nonprofitId, slotLabel, dataUrl }) => {
  const parsed = parseImageDataUrl(dataUrl)
  if (!parsed) return { publicUrl: null, error: new Error('invalid image data URL') }

  const filename = `${slotLabel}-${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`
  const path = `nonprofits/${nonprofitId}/${filename}`

  const { error: uploadErr } = await supabase.storage
    .from(NONPROFIT_MEDIA_BUCKET)
    .upload(path, parsed.buffer, {
      upsert: true,
      contentType: parsed.contentType,
      cacheControl: '3600'
    })
  if (uploadErr) return { publicUrl: null, error: uploadErr }

  const { data } = supabase.storage.from(NONPROFIT_MEDIA_BUCKET).getPublicUrl(path)
  return { publicUrl: data?.publicUrl || null, error: null }
}

const uploadClothingImage = async ({ itemId, slot, dataUrl }) => {
  const parsed = parseImageDataUrl(dataUrl)
  if (!parsed) return { publicUrl: null, error: new Error('invalid image data URL') }

  const filename = `${slot}-${Date.now()}-${crypto.randomUUID()}.${parsed.extension}`
  const path = `items/${itemId}/${filename}`

  const { error: uploadErr } = await supabase.storage
    .from(CLOTHING_ITEMS_BUCKET)
    .upload(path, parsed.buffer, {
      upsert: true,
      contentType: parsed.contentType,
      cacheControl: '3600'
    })
  if (uploadErr) return { publicUrl: null, error: uploadErr }

  const { data } = supabase.storage.from(CLOTHING_ITEMS_BUCKET).getPublicUrl(path)
  return { publicUrl: data?.publicUrl || null, error: null }
}

const canUserManageNonprofit = async ({ nonprofitId, userId, username }) => {
  if (!nonprofitId || !userId) return { allowed: false, error: null }

  if (username) {
    const { data: usernameRow, error: usernameErr } = await supabase
      .from('nonprofit_admin_usernames')
      .select('username')
      .eq('nonprofit_id', nonprofitId)
      .eq('username', username)
      .maybeSingle()
    if (usernameErr) return { allowed: false, error: usernameErr }
    if (usernameRow) return { allowed: true, error: null }
  }

  const { data: employee, error: employeeErr } = await supabase
    .from('nonprofit_employees')
    .select('is_admin')
    .eq('nonprofit_id', nonprofitId)
    .eq('user_id', userId)
    .eq('is_admin', true)
    .maybeSingle()
  if (employeeErr) return { allowed: false, error: employeeErr }

  return { allowed: Boolean(employee), error: null }
}

const requireAdmin = async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return null

  const userId = user.id
  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle()
  if (roleErr) {
    res.status(500).json({ error: roleErr.message })
    return null
  }
  if (!roleRow) {
    res.status(403).json({ error: 'admin role required' })
    return null
  }

  return user
}

// Health
app.get('/_health', (req, res) => res.json({ ok: true }))

// Optional root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Ottera backend is running',
    routes: [
      'POST /auth/register',
      'POST /auth/login',
      'GET /users/me/profile',
      'PATCH /users/me/profile',
      'POST /users/me/password',
      'GET /resources/listings',
      'POST /resources/listings',
      'GET /nonprofits/manage',
      'PATCH /nonprofits/:nonprofitId/manage',
      'POST /nonprofits/:nonprofitId/media',
      'POST /nonprofits/:nonprofitId/admin-usernames',
      'DELETE /nonprofits/:nonprofitId/admin-usernames/:username',
      'POST /partners/apply',
      'GET /partners/applications',
      'POST /partners/applications/:applicationId/approve',
      'POST /partners/applications/:applicationId/deny',
      'POST /admin/seed-distributors',
      'GET /events',
      'POST /events',
      'POST /users/:userId/roles',
      'POST /nonprofits',
      'GET /nonprofits/:nonprofitId/profile',
      'GET /nonprofits/:nonprofitId/subscription',
      'POST /nonprofits/:nonprofitId/subscription',
      'DELETE /nonprofits/:nonprofitId/subscription',
      'POST /nonprofits/:nonprofitId/employees',
      'GET /nonprofits/:nonprofitId/employees',
      'POST /nonprofits/:nonprofitId/subscribe',
      'GET /nonprofits/:nonprofitId/subscribers',
      'POST /nonprofits/:nonprofitId/volunteer-applications',
      'GET /posts',
      'POST /create-post',
      'POST /rsvp'
    ]
  })
})

// Public resource listings (used by Find Resources page)
app.get('/resources/listings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resource_listings')
      .select(
        'id, title, description, category_slug, listing_source, nonprofit_id, posted_by_username, location_label, zip_codes, website, contact_info, distribution_schedule, status, nonprofits:nonprofit_id(id, name, website, approval_status, focus_area, zip_codes, photo_urls, logo_url)'
      )
      .eq('status', 'active')

    if (error) return res.status(500).json({ error: error.message })

    const approvedRows = (data || []).filter((row) => {
      if (row.listing_source !== 'nonprofit') return true
      return row.nonprofits && row.nonprofits.approval_status === 'approved'
    })

    const nonprofitIdsWithActiveListings = new Set(
      approvedRows
        .filter((row) => row.listing_source === 'nonprofit' && row.nonprofit_id)
        .map((row) => row.nonprofit_id)
    )

    const { data: approvedNonprofits, error: nonprofitsError } = await supabase
      .from('nonprofits')
      .select(
        'id, name, website, approval_status, focus_area, zip_codes, photo_urls, logo_url, description, distribution_schedule, addresses, contact_email, contact_phone'
      )
      .eq('approval_status', 'approved')

    if (nonprofitsError) return res.status(500).json({ error: nonprofitsError.message })

    const synthesizedRows = (approvedNonprofits || [])
      .filter((nonprofit) => !nonprofitIdsWithActiveListings.has(nonprofit.id))
      .map((nonprofit) => {
        const firstAddress = Array.isArray(nonprofit.addresses) ? nonprofit.addresses[0] : null
        const city = firstAddress?.city
        const state = firstAddress?.state
        const zip = firstAddress?.zip
        const locationLabel = [city, state].filter(Boolean).join(', ') || zip || 'Location not provided'

        return {
          id: `nonprofit-${nonprofit.id}`,
          title: nonprofit.name,
          description: nonprofit.description || 'Community resource provider',
          category_slug: mapFocusAreaToCategorySlug(nonprofit.focus_area),
          listing_source: 'nonprofit',
          nonprofit_id: nonprofit.id,
          posted_by_username: null,
          location_label: locationLabel,
          zip_codes: Array.isArray(nonprofit.zip_codes) ? nonprofit.zip_codes : [],
          website: nonprofit.website || null,
          contact_info: {
            email: nonprofit.contact_email || null,
            phone: nonprofit.contact_phone || null
          },
          distribution_schedule: nonprofit.distribution_schedule || null,
          status: 'active',
          nonprofits: {
            id: nonprofit.id,
            name: nonprofit.name,
            website: nonprofit.website || null,
            approval_status: nonprofit.approval_status || 'approved',
            focus_area: nonprofit.focus_area || null,
            zip_codes: Array.isArray(nonprofit.zip_codes) ? nonprofit.zip_codes : [],
            photo_urls: Array.isArray(nonprofit.photo_urls) ? nonprofit.photo_urls : [],
            logo_url: nonprofit.logo_url || null
          }
        }
      })

    return res.json({ data: [...approvedRows, ...synthesizedRows] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Create a resource listing. Nonprofit listings require approved nonprofit + allowed admin username.
app.post('/resources/listings', async (req, res) => {
  const {
    title,
    description,
    category_slug,
    listing_source = 'individual',
    nonprofit_id = null,
    posted_by_username = null,
    location_label,
    zip_codes = [],
    website = null,
    contact_info = {},
    distribution_schedule = null
  } = req.body

  if (!title || !description || !category_slug || !location_label) {
    return res.status(400).json({ error: 'missing required fields: title, description, category_slug, location_label' })
  }

  if (!Array.isArray(zip_codes)) {
    return res.status(400).json({ error: 'zip_codes must be an array' })
  }

  if (!['pantry', 'closet', 'shelters'].includes(category_slug)) {
    return res.status(400).json({ error: 'invalid category_slug' })
  }

  if (!['individual', 'nonprofit'].includes(listing_source)) {
    return res.status(400).json({ error: 'invalid listing_source' })
  }

  try {
    if (listing_source === 'nonprofit') {
      if (!nonprofit_id || !posted_by_username) {
        return res.status(400).json({ error: 'nonprofit listings require nonprofit_id and posted_by_username' })
      }

      const { data: nonprofit, error: nonprofitErr } = await supabase
        .from('nonprofits')
        .select('id, approval_status')
        .eq('id', nonprofit_id)
        .single()
      if (nonprofitErr || !nonprofit) {
        return res.status(404).json({ error: nonprofitErr?.message || 'nonprofit not found' })
      }

      if (nonprofit.approval_status !== 'approved') {
        return res.status(403).json({ error: 'nonprofit is not approved to post listings' })
      }

      const { data: adminAccess, error: adminErr } = await supabase
        .from('nonprofit_admin_usernames')
        .select('username')
        .eq('nonprofit_id', nonprofit_id)
        .eq('username', posted_by_username)
        .maybeSingle()
      if (adminErr) return res.status(500).json({ error: adminErr.message })
      if (!adminAccess) {
        return res.status(403).json({ error: 'username is not allowed to manage this nonprofit profile' })
      }
    }

    const { data, error } = await supabase
      .from('resource_listings')
      .insert([
        {
          title,
          description,
          category_slug,
          listing_source,
          nonprofit_id,
          posted_by_username,
          location_label,
          zip_codes,
          website,
          contact_info,
          distribution_schedule,
          status: 'active'
        }
      ])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Nonprofit "Partner with us" intake
app.post('/partners/apply', async (req, res) => {
  const {
    client_name,
    website = null,
    description,
    distribution_schedule = null,
    contact_email = null,
    contact_phone = null,
    addresses = [],
    zip_codes = [],
    focus_area = 'miscellaneous',
    requested_admin_usernames = []
  } = req.body
  const normalizedFocusArea = normalizeFocusArea(focus_area)

  if (!client_name || !description) {
    return res.status(400).json({ error: 'missing required fields: client_name, description' })
  }

  if (!Array.isArray(addresses) || !Array.isArray(zip_codes) || !Array.isArray(requested_admin_usernames)) {
    return res.status(400).json({ error: 'addresses, zip_codes, and requested_admin_usernames must be arrays' })
  }
  if (!ALLOWED_FOCUS_AREAS.has(normalizedFocusArea)) {
    return res.status(400).json({ error: `invalid focus_area: ${focus_area}` })
  }

  try {
    const { data, error } = await supabase
      .from('partner_applications')
      .insert([
        {
          client_name,
          website,
          description,
          distribution_schedule,
          contact_email,
          contact_phone,
          addresses,
          zip_codes,
          focus_area: normalizedFocusArea,
          requested_admin_usernames
        }
      ])
      .select('id, status, submitted_at')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: review pending partner applications
app.get('/partners/applications', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  try {
    const { data, error } = await supabase
      .from('partner_applications')
      .select('*')
      .order('submitted_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: approve application and create nonprofit profile + allowed admin usernames
app.post('/partners/applications/:applicationId/approve', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const { applicationId } = req.params
  const approvedBy = adminUser.email || adminUser.id

  try {
    const { data: application, error: appError } = await supabase
      .from('partner_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return res.status(404).json({ error: appError?.message || 'application not found' })
    }

    const extKey = `app_${application.id}`
    const { data: nonprofit, error: nonprofitError } = await supabase
      .from('nonprofits')
      .upsert(
        [
          {
            external_key: extKey,
            name: application.client_name,
            website: application.website,
            zip_codes: application.zip_codes || [],
            addresses: application.addresses || [],
            focus_area: application.focus_area || 'other',
            description: application.description,
            distribution_schedule: application.distribution_schedule,
            contact_email: application.contact_email,
            contact_phone: application.contact_phone,
            approval_status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: String(approvedBy)
          }
        ],
        { onConflict: 'external_key' }
      )
      .select('id, name')
      .single()

    if (nonprofitError || !nonprofit) {
      return res.status(500).json({ error: nonprofitError?.message || 'failed to upsert nonprofit' })
    }

    const adminUsernames = Array.isArray(application.requested_admin_usernames)
      ? [...new Set(application.requested_admin_usernames.filter(Boolean))]
      : []

    if (adminUsernames.length > 0) {
      const rows = adminUsernames.map((username) => ({ nonprofit_id: nonprofit.id, username }))
      const { error: adminsError } = await supabase
        .from('nonprofit_admin_usernames')
        .upsert(rows, { onConflict: 'nonprofit_id,username', ignoreDuplicates: true })
      if (adminsError) return res.status(500).json({ error: adminsError.message })
    }

    const { error: updateError } = await supabase
      .from('partner_applications')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        nonprofit_id: nonprofit.id
      })
      .eq('id', application.id)

    if (updateError) return res.status(500).json({ error: updateError.message })

    return res.json({ ok: true, nonprofit_id: nonprofit.id, nonprofit_name: nonprofit.name })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: deny partner application
app.post('/partners/applications/:applicationId/deny', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const { applicationId } = req.params

  try {
    const { data: application, error: appError } = await supabase
      .from('partner_applications')
      .select('id, status')
      .eq('id', applicationId)
      .single()

    if (appError || !application) {
      return res.status(404).json({ error: appError?.message || 'application not found' })
    }

    const { error: updateError } = await supabase
      .from('partner_applications')
      .update({
        status: 'denied',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', application.id)

    if (updateError) return res.status(500).json({ error: updateError.message })

    return res.json({
      ok: true,
      denied_by: adminUser.email || adminUser.id,
      application_id: application.id
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: seed 10 distributor listings (3 clothing individuals, 3 shelter nonprofits, 4 food nonprofits)
app.post('/admin/seed-distributors', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  try {
    const nonprofits = [
      {
        external_key: 'np_harbor_shelter',
        name: 'Harbor Shelter Network',
        website: 'https://harborshelter.example.org',
        zip_codes: ['27601', '27603'],
        addresses: [{ line1: '120 Harbor St', city: 'Raleigh', state: 'NC', zip: '27601' }],
        focus_area: 'shelter',
        description: 'Emergency and transitional shelter with case management.',
        distribution_schedule: 'Intake daily 6:00 PM - 9:00 PM',
        contact_email: 'intake@harborshelter.example.org',
        contact_phone: '(919) 555-1101',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_nightbridge_shelter',
        name: 'NightBridge Community Shelter',
        website: 'https://nightbridge.example.org',
        zip_codes: ['27701', '27703'],
        addresses: [{ line1: '45 Elm Ave', city: 'Durham', state: 'NC', zip: '27701' }],
        focus_area: 'shelter',
        description: 'Night shelter and housing referrals for adults and families.',
        distribution_schedule: 'Beds released daily at 5:30 PM',
        contact_email: 'hello@nightbridge.example.org',
        contact_phone: '(919) 555-1102',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_safehaven_shelter',
        name: 'SafeHaven Family Shelter',
        website: 'https://safehaven.example.org',
        zip_codes: ['27511', '27513'],
        addresses: [{ line1: '880 Maple Rd', city: 'Cary', state: 'NC', zip: '27511' }],
        focus_area: 'shelter',
        description: 'Family shelter with children services and social worker support.',
        distribution_schedule: 'Check-in Mon-Sun 4:00 PM - 8:00 PM',
        contact_email: 'support@safehaven.example.org',
        contact_phone: '(919) 555-1103',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_triangle_food_bank',
        name: 'Triangle Food Distribution Coalition',
        website: 'https://trianglefood.example.org',
        zip_codes: ['27601', '27610', '27545'],
        addresses: [{ line1: '210 Market St', city: 'Raleigh', state: 'NC', zip: '27601' }],
        focus_area: 'food',
        description: 'Weekly food boxes, pantry staples, and fresh produce pickup.',
        distribution_schedule: 'Tue/Thu/Sat 10:00 AM - 2:00 PM',
        contact_email: 'info@trianglefood.example.org',
        contact_phone: '(919) 555-2201',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_freshroute_food',
        name: 'FreshRoute Food Partners',
        website: 'https://freshroute.example.org',
        zip_codes: ['27701', '27704'],
        addresses: [{ line1: '11 Greenway Blvd', city: 'Durham', state: 'NC', zip: '27701' }],
        focus_area: 'food',
        description: 'Mobile food distribution and community meal kits.',
        distribution_schedule: 'Mon/Wed/Fri 11:30 AM - 4:30 PM',
        contact_email: 'team@freshroute.example.org',
        contact_phone: '(919) 555-2202',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_mealbridge_food',
        name: 'MealBridge Outreach',
        website: 'https://mealbridge.example.org',
        zip_codes: ['27511', '27560'],
        addresses: [{ line1: '94 Oak Park', city: 'Cary', state: 'NC', zip: '27511' }],
        focus_area: 'food',
        description: 'Neighborhood food access and prepared meal distribution.',
        distribution_schedule: 'Daily noon distribution',
        contact_email: 'contact@mealbridge.example.org',
        contact_phone: '(919) 555-2203',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      },
      {
        external_key: 'np_openpantry_food',
        name: 'Open Pantry Collective',
        website: 'https://openpantry.example.org',
        zip_codes: ['27514', '27516'],
        addresses: [{ line1: '302 Franklin Ln', city: 'Chapel Hill', state: 'NC', zip: '27514' }],
        focus_area: 'food',
        description: 'Food pantry and home-delivery for seniors and families.',
        distribution_schedule: 'Mon-Sat 9:00 AM - 1:00 PM',
        contact_email: 'hello@openpantry.example.org',
        contact_phone: '(919) 555-2204',
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: adminUser.email || adminUser.id
      }
    ]

    const { data: nonprofitRows, error: nonprofitsError } = await supabase
      .from('nonprofits')
      .upsert(nonprofits, { onConflict: 'external_key' })
      .select('id, external_key')

    if (nonprofitsError) return res.status(500).json({ error: nonprofitsError.message })

    const byKey = Object.fromEntries((nonprofitRows || []).map((row) => [row.external_key, row.id]))

    const adminRows = [
      ['np_harbor_shelter', 'harbor_admin'],
      ['np_nightbridge_shelter', 'nightbridge_admin'],
      ['np_safehaven_shelter', 'safehaven_admin'],
      ['np_triangle_food_bank', 'trianglefood_admin'],
      ['np_freshroute_food', 'freshroute_admin'],
      ['np_mealbridge_food', 'mealbridge_admin'],
      ['np_openpantry_food', 'openpantry_admin']
    ]
      .filter(([extKey]) => Boolean(byKey[extKey]))
      .map(([extKey, username]) => ({ nonprofit_id: byKey[extKey], username }))

    if (adminRows.length > 0) {
      const { error: adminError } = await supabase
        .from('nonprofit_admin_usernames')
        .upsert(adminRows, { onConflict: 'nonprofit_id,username', ignoreDuplicates: true })
      if (adminError) return res.status(500).json({ error: adminError.message })
    }

    const listings = [
      {
        external_key: 'clothing_threadswap_1',
        title: 'ThreadSwap Free Closet',
        description: 'Community member giving away seasonal clothing and shoes.',
        category_slug: 'closet',
        listing_source: 'individual',
        posted_by_username: 'closetqueen_kia',
        location_label: 'Raleigh, NC',
        zip_codes: ['27601', '27603'],
        distribution_schedule: 'Weekends 10:00 AM - 1:00 PM'
      },
      {
        external_key: 'clothing_givebox_2',
        title: 'GiveBox Apparel Pickup',
        description: 'Free family clothing bundles by appointment.',
        category_slug: 'closet',
        listing_source: 'individual',
        posted_by_username: 'givebox_morgan',
        location_label: 'Durham, NC',
        zip_codes: ['27701', '27703'],
        distribution_schedule: 'Tue/Thu 4:00 PM - 7:00 PM'
      },
      {
        external_key: 'clothing_rewear_3',
        title: 'ReWear Closet Share',
        description: 'Children and adult basics available every week.',
        category_slug: 'closet',
        listing_source: 'individual',
        posted_by_username: 'rewear_aria',
        location_label: 'Cary, NC',
        zip_codes: ['27511', '27513'],
        distribution_schedule: 'Sat 11:00 AM - 3:00 PM'
      },
      {
        external_key: 'shelter_harbor_1',
        title: 'Harbor Shelter Evening Intake',
        description: 'Open beds and family intake services.',
        category_slug: 'shelters',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_harbor_shelter'],
        location_label: 'Raleigh, NC',
        zip_codes: ['27601', '27603'],
        website: 'https://harborshelter.example.org',
        contact_info: { phone: '(919) 555-1101' },
        distribution_schedule: 'Daily 6:00 PM - 9:00 PM'
      },
      {
        external_key: 'shelter_nightbridge_2',
        title: 'NightBridge Shelter Check-In',
        description: 'Emergency overnight shelter and referral services.',
        category_slug: 'shelters',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_nightbridge_shelter'],
        location_label: 'Durham, NC',
        zip_codes: ['27701', '27703'],
        website: 'https://nightbridge.example.org',
        contact_info: { phone: '(919) 555-1102' },
        distribution_schedule: 'Daily 5:30 PM'
      },
      {
        external_key: 'shelter_safehaven_3',
        title: 'SafeHaven Family Beds',
        description: 'Family shelter intake with children support staff.',
        category_slug: 'shelters',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_safehaven_shelter'],
        location_label: 'Cary, NC',
        zip_codes: ['27511', '27513'],
        website: 'https://safehaven.example.org',
        contact_info: { phone: '(919) 555-1103' },
        distribution_schedule: 'Mon-Sun 4:00 PM - 8:00 PM'
      },
      {
        external_key: 'food_triangle_1',
        title: 'Triangle Food Box Pickup',
        description: 'Weekly produce and pantry staples.',
        category_slug: 'pantry',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_triangle_food_bank'],
        location_label: 'Raleigh, NC',
        zip_codes: ['27601', '27610'],
        website: 'https://trianglefood.example.org',
        contact_info: { phone: '(919) 555-2201' },
        distribution_schedule: 'Tue/Thu/Sat 10:00 AM - 2:00 PM'
      },
      {
        external_key: 'food_freshroute_2',
        title: 'FreshRoute Mobile Pantry',
        description: 'Mobile distribution across Durham neighborhoods.',
        category_slug: 'pantry',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_freshroute_food'],
        location_label: 'Durham, NC',
        zip_codes: ['27701', '27704'],
        website: 'https://freshroute.example.org',
        contact_info: { phone: '(919) 555-2202' },
        distribution_schedule: 'Mon/Wed/Fri 11:30 AM - 4:30 PM'
      },
      {
        external_key: 'food_mealbridge_3',
        title: 'MealBridge Community Meals',
        description: 'Prepared meals and pantry bags.',
        category_slug: 'pantry',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_mealbridge_food'],
        location_label: 'Cary, NC',
        zip_codes: ['27511', '27560'],
        website: 'https://mealbridge.example.org',
        contact_info: { phone: '(919) 555-2203' },
        distribution_schedule: 'Daily 12:00 PM'
      },
      {
        external_key: 'food_openpantry_4',
        title: 'Open Pantry Family Distribution',
        description: 'Pantry pickup and senior delivery signups.',
        category_slug: 'pantry',
        listing_source: 'nonprofit',
        nonprofit_id: byKey['np_openpantry_food'],
        location_label: 'Chapel Hill, NC',
        zip_codes: ['27514', '27516'],
        website: 'https://openpantry.example.org',
        contact_info: { phone: '(919) 555-2204' },
        distribution_schedule: 'Mon-Sat 9:00 AM - 1:00 PM'
      }
    ]

    const { error: listingsError } = await supabase
      .from('resource_listings')
      .upsert(listings, { onConflict: 'external_key' })

    if (listingsError) return res.status(500).json({ error: listingsError.message })

    return res.json({ ok: true, inserted_or_updated: listings.length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Public: list active community events
app.get('/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .eq('status', 'active')
      .order('start_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: create a community event post
app.post('/events', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const {
    title,
    description,
    location_label,
    start_at,
    end_at = null,
    zip_codes = [],
    website = null
  } = req.body

  if (!title || !description || !location_label || !start_at) {
    return res.status(400).json({ error: 'missing required fields: title, description, location_label, start_at' })
  }

  if (!Array.isArray(zip_codes)) {
    return res.status(400).json({ error: 'zip_codes must be an array' })
  }

  try {
    const payload = {
      title,
      description,
      location_label,
      start_at,
      end_at,
      zip_codes,
      website,
      status: 'active',
      posted_by_user_id: adminUser.id
    }

    const { data, error } = await supabase
      .from('community_events')
      .insert([payload])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Any logged-in user: submit an event for admin review
app.post('/events/submit', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const {
    title,
    description,
    location_label,
    start_at,
    end_at = null,
    zip_codes = [],
    website = null,
    is_free = true
  } = req.body

  if (!title || !description || !location_label || !start_at) {
    return res.status(400).json({ error: 'missing required fields: title, description, location_label, start_at' })
  }

  if (!Array.isArray(zip_codes)) {
    return res.status(400).json({ error: 'zip_codes must be an array' })
  }

  try {
    const { data, error } = await supabase
      .from('community_events')
      .insert([{
        title,
        description,
        location_label,
        start_at,
        end_at,
        zip_codes,
        website,
        is_free: Boolean(is_free),
        status: 'pending',
        posted_by_user_id: user.id
      }])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: list pending events awaiting approval
app.get('/events/pending', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  try {
    const { data, error } = await supabase
      .from('community_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: approve a pending event (only if is_free)
app.post('/events/:id/approve', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const { id } = req.params
  try {
    const { data: evt, error: fetchErr } = await supabase
      .from('community_events')
      .select('id, is_free, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !evt) return res.status(404).json({ error: 'event not found' })
    if (!evt.is_free) return res.status(400).json({ error: 'only free events can be approved' })

    const { data, error } = await supabase
      .from('community_events')
      .update({ status: 'active' })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Admin: delete an event
app.delete('/events/:id', async (req, res) => {
  const adminUser = await requireAdmin(req, res)
  if (!adminUser) return

  const { id } = req.params
  try {
    const { error } = await supabase
      .from('community_events')
      .delete()
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Register user in Supabase Auth + profile + optional roles
app.post('/auth/register', async (req, res) => {
  const {
    first_name,
    last_name,
    username,
    email,
    password,
    birthday = null,
    zip_code = null,
    phone = null,
    roles = []
  } = req.body

  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: 'missing required fields: first_name, last_name, username, email, password' })
  }

  const normalizedRoles = Array.isArray(roles) ? [...new Set(roles)] : []
  const invalidRoles = normalizedRoles.filter((r) => !ALLOWED_ROLES.has(r))
  if (invalidRoles.length > 0) {
    return res.status(400).json({ error: `invalid roles: ${invalidRoles.join(', ')}` })
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name }
    })

    if (authError || !authData?.user?.id) {
      return res.status(500).json({ error: authError?.message || 'failed to create auth user' })
    }

    const userId = authData.user.id

    const { error: profileError } = await supabase.from('profiles').insert([
      {
        id: userId,
        first_name,
        last_name,
        username,
        email,
        birthday,
        zip_code,
        phone
      }
    ])

    if (profileError) {
      return res.status(500).json({ error: profileError.message })
    }

    if (normalizedRoles.length > 0) {
      const roleRows = normalizedRoles.map((role) => ({ user_id: userId, role }))
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(roleRows, { onConflict: 'user_id,role', ignoreDuplicates: true })

      if (roleError) {
        return res.status(500).json({ error: roleError.message })
      }
    }

    const { data: loginData, error: loginError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    })

    if (loginError || !loginData?.session) {
      return res.status(500).json({ error: loginError?.message || 'account created but auto login failed' })
    }

    return res.status(201).json({
      user_id: userId,
      first_name,
      last_name,
      username,
      email,
      zip_code,
      roles: normalizedRoles,
      primary_role: getPrimaryRole(normalizedRoles),
      access_token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Login using Supabase Auth and return tokens + profile
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'missing required fields: email, password' })
  }

  try {
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData?.session || !authData?.user?.id) {
      return res.status(401).json({ error: authError?.message || 'invalid login' })
    }

    const userId = authData.user.id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, username, email, zip_code')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (rolesError) {
      return res.status(500).json({ error: rolesError.message })
    }

    const roles = (rolesData || []).map((row) => row.role)

    return res.json({
      user_id: userId,
      ...profile,
      roles,
      primary_role: getPrimaryRole(roles),
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.post('/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' })
  try {
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token })
    if (error || !data?.session) return res.status(401).json({ error: error?.message || 'Refresh failed' })
    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.get('/users/me/profile', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }
    return res.json({ data: profile })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.patch('/users/me/profile', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { email, zip_code = null } = req.body || {}
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : null
  const normalizedZip =
    typeof zip_code === 'string' ? zip_code.replace(/\D/g, '').slice(0, 5) : zip_code === null ? null : undefined

  if (!normalizedEmail && normalizedZip === undefined) {
    return res.status(400).json({ error: 'provide email and/or zip_code' })
  }

  if (normalizedZip !== undefined && normalizedZip !== null && normalizedZip.length !== 5) {
    return res.status(400).json({ error: 'zip_code must be 5 digits when provided' })
  }

  try {
    if (normalizedEmail && normalizedEmail !== user.email) {
      const { error: authErr } = await supabase.auth.admin.updateUserById(user.id, { email: normalizedEmail })
      if (authErr) return res.status(500).json({ error: authErr.message })
    }

    const profilePatch = {}
    if (normalizedEmail) profilePatch.email = normalizedEmail
    if (normalizedZip !== undefined) profilePatch.zip_code = normalizedZip

    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update(profilePatch)
      .eq('id', user.id)
      .select('id, first_name, last_name, username, email, zip_code')
      .single()

    if (updateError || !updated) {
      return res.status(500).json({ error: updateError?.message || 'failed to update profile' })
    }

    return res.json({ data: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.post('/users/me/password', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { new_password } = req.body || {}
  if (typeof new_password !== 'string' || new_password.length < 8) {
    return res.status(400).json({ error: 'new_password must be at least 8 characters' })
  }

  try {
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password: new_password })
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.get('/nonprofits/manage', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const username = profile.username || null
    const nonprofitIds = new Set()

    if (username) {
      const { data: adminRows, error: adminErr } = await supabase
        .from('nonprofit_admin_usernames')
        .select('nonprofit_id')
        .eq('username', username)
      if (adminErr) return res.status(500).json({ error: adminErr.message })
      for (const row of adminRows || []) {
        if (row.nonprofit_id) nonprofitIds.add(row.nonprofit_id)
      }
    }

    const { data: employeeRows, error: employeeErr } = await supabase
      .from('nonprofit_employees')
      .select('nonprofit_id')
      .eq('user_id', user.id)
      .eq('is_admin', true)
    if (employeeErr) return res.status(500).json({ error: employeeErr.message })
    for (const row of employeeRows || []) {
      if (row.nonprofit_id) nonprofitIds.add(row.nonprofit_id)
    }

    const ids = [...nonprofitIds]
    if (ids.length === 0) return res.json({ data: [] })

    const { data: nonprofits, error: nonprofitsErr } = await supabase
      .from('nonprofits')
      .select('id, name, website, description, distribution_schedule, zip_codes, addresses, focus_area, photo_urls, logo_url')
      .in('id', ids)
    if (nonprofitsErr) return res.status(500).json({ error: nonprofitsErr.message })

    const { data: usernameRows, error: usernamesErr } = await supabase
      .from('nonprofit_admin_usernames')
      .select('nonprofit_id, username')
      .in('nonprofit_id', ids)
    if (usernamesErr) return res.status(500).json({ error: usernamesErr.message })

    const usernamesById = {}
    for (const row of usernameRows || []) {
      if (!usernamesById[row.nonprofit_id]) usernamesById[row.nonprofit_id] = []
      usernamesById[row.nonprofit_id].push(row.username)
    }

    const result = (nonprofits || []).map((item) => ({
      ...item,
      verified_usernames: usernamesById[item.id] || []
    }))

    return res.json({ data: result })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.patch('/nonprofits/:nonprofitId/manage', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  const { description, distribution_schedule, zip_codes, addresses, photo_urls, logo_url } = req.body || {}

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const { allowed, error: authErr } = await canUserManageNonprofit({
      nonprofitId,
      userId: user.id,
      username: profile.username || null
    })
    if (authErr) return res.status(500).json({ error: authErr.message })
    if (!allowed) return res.status(403).json({ error: 'not authorized to manage this nonprofit' })

    const patch = {}
    if (description !== undefined) patch.description = typeof description === 'string' ? description.trim() : null
    if (distribution_schedule !== undefined) {
      patch.distribution_schedule =
        typeof distribution_schedule === 'string' ? distribution_schedule.trim() : null
    }
    if (zip_codes !== undefined) {
      if (!Array.isArray(zip_codes)) return res.status(400).json({ error: 'zip_codes must be an array' })
      patch.zip_codes = zip_codes
        .map((value) => String(value || '').replace(/\D/g, '').slice(0, 5))
        .filter((value) => value.length === 5)
    }
    if (addresses !== undefined) {
      if (!Array.isArray(addresses)) return res.status(400).json({ error: 'addresses must be an array' })
      patch.addresses = addresses
    }
    if (photo_urls !== undefined) {
      if (!Array.isArray(photo_urls)) return res.status(400).json({ error: 'photo_urls must be an array' })
      const normalizedPhotoUrls = photo_urls
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .slice(0, 4)
      patch.photo_urls = normalizedPhotoUrls
    }
    if (logo_url !== undefined) {
      patch.logo_url = logo_url ? String(logo_url).trim() : null
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'no supported nonprofit fields supplied' })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('nonprofits')
      .update(patch)
      .eq('id', nonprofitId)
      .select('id, name, website, description, distribution_schedule, zip_codes, addresses, focus_area, photo_urls, logo_url')
      .single()
    if (updateErr || !updated) return res.status(500).json({ error: updateErr?.message || 'failed to update nonprofit' })

    const { data: usernameRows, error: usernamesErr } = await supabase
      .from('nonprofit_admin_usernames')
      .select('username')
      .eq('nonprofit_id', nonprofitId)
    if (usernamesErr) return res.status(500).json({ error: usernamesErr.message })

    return res.json({
      data: {
        ...updated,
        verified_usernames: (usernameRows || []).map((row) => row.username)
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.post('/nonprofits/:nonprofitId/media', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  const { kind, slot = null, data_url } = req.body || {}

  if (!['logo', 'photo'].includes(kind)) {
    return res.status(400).json({ error: "kind must be 'logo' or 'photo'" })
  }
  if (kind === 'photo' && (!Number.isInteger(slot) || slot < 0 || slot > 3)) {
    return res.status(400).json({ error: 'photo uploads require slot between 0 and 3' })
  }
  if (typeof data_url !== 'string' || data_url.length < 20) {
    return res.status(400).json({ error: 'data_url is required and must be a valid image data URL' })
  }

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const { allowed, error: authErr } = await canUserManageNonprofit({
      nonprofitId,
      userId: user.id,
      username: profile.username || null
    })
    if (authErr) return res.status(500).json({ error: authErr.message })
    if (!allowed) return res.status(403).json({ error: 'not authorized to manage this nonprofit' })

    const { data: nonprofitRow, error: nonprofitErr } = await supabase
      .from('nonprofits')
      .select('id, photo_urls, logo_url')
      .eq('id', nonprofitId)
      .maybeSingle()
    if (nonprofitErr) return res.status(500).json({ error: nonprofitErr.message })
    if (!nonprofitRow) return res.status(404).json({ error: 'nonprofit not found' })

    const slotLabel = kind === 'logo' ? 'logo' : `photo-${slot + 1}`
    const { publicUrl, error: uploadErr } = await uploadNonprofitMediaImage({
      nonprofitId,
      slotLabel,
      dataUrl: data_url
    })
    if (uploadErr || !publicUrl) {
      return res.status(500).json({ error: uploadErr?.message || 'failed to upload image' })
    }

    const patch = {}
    if (kind === 'logo') {
      patch.logo_url = publicUrl
    } else {
      const nextPhotos = Array.isArray(nonprofitRow.photo_urls) ? [...nonprofitRow.photo_urls] : []
      while (nextPhotos.length < 4) nextPhotos.push('')
      nextPhotos[slot] = publicUrl
      patch.photo_urls = nextPhotos.filter(Boolean).slice(0, 4)
    }

    const { data: updated, error: updateErr } = await supabase
      .from('nonprofits')
      .update(patch)
      .eq('id', nonprofitId)
      .select('id, photo_urls, logo_url')
      .single()
    if (updateErr || !updated) {
      return res.status(500).json({ error: updateErr?.message || 'failed to save uploaded media' })
    }

    return res.status(201).json({ data: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.post('/nonprofits/:nonprofitId/admin-usernames', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  const { username } = req.body || {}
  const normalizedUsername = typeof username === 'string' ? username.trim() : ''
  if (!normalizedUsername) return res.status(400).json({ error: 'username is required' })

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const { allowed, error: authErr } = await canUserManageNonprofit({
      nonprofitId,
      userId: user.id,
      username: profile.username || null
    })
    if (authErr) return res.status(500).json({ error: authErr.message })
    if (!allowed) return res.status(403).json({ error: 'not authorized to manage this nonprofit' })

    const { error: upsertErr } = await supabase
      .from('nonprofit_admin_usernames')
      .upsert([{ nonprofit_id: nonprofitId, username: normalizedUsername }], {
        onConflict: 'nonprofit_id,username',
        ignoreDuplicates: true
      })
    if (upsertErr) return res.status(500).json({ error: upsertErr.message })

    // Add the employee to the nonprofit's channel conversation so they can see and send messages
    try {
      const { data: employeeProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (employeeProfile?.id) {
        let channelId = null
        const { data: existingChannel } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'channel')
          .eq('nonprofit_id', nonprofitId)
          .maybeSingle()

        if (existingChannel) {
          channelId = existingChannel.id
        } else {
          const { data: newChannel } = await supabase
            .from('conversations')
            .insert([{ type: 'channel', nonprofit_id: nonprofitId }])
            .select('id')
            .single()
          channelId = newChannel?.id
        }

        if (channelId) {
          await supabase
            .from('conversation_participants')
            .upsert([{ conversation_id: channelId, user_id: employeeProfile.id }], {
              onConflict: 'conversation_id,user_id',
              ignoreDuplicates: true
            })
        }
      }
    } catch (_) {
      // Messaging tables may not exist yet — username add still succeeds
    }

    return res.status(201).json({ ok: true, nonprofit_id: nonprofitId, username: normalizedUsername })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.delete('/nonprofits/:nonprofitId/admin-usernames/:username', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId, username } = req.params
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    const { data: profile, error: profileError } = await loadProfileByUserId(user.id)
    if (profileError || !profile) {
      return res.status(500).json({ error: profileError?.message || 'missing profile for user' })
    }

    const { allowed, error: authErr } = await canUserManageNonprofit({
      nonprofitId,
      userId: user.id,
      username: profile.username || null
    })
    if (authErr) return res.status(500).json({ error: authErr.message })
    if (!allowed) return res.status(403).json({ error: 'not authorized to manage this nonprofit' })

    const { error: deleteErr } = await supabase
      .from('nonprofit_admin_usernames')
      .delete()
      .eq('nonprofit_id', nonprofitId)
      .eq('username', username)
    if (deleteErr) return res.status(500).json({ error: deleteErr.message })

    // Remove the employee from the channel conversation if they are not also a subscriber
    try {
      const { data: employeeProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()

      if (employeeProfile?.id) {
        const { data: subscriberRow } = await supabase
          .from('nonprofit_subscribers')
          .select('user_id')
          .eq('nonprofit_id', nonprofitId)
          .eq('user_id', employeeProfile.id)
          .maybeSingle()

        if (!subscriberRow) {
          const { data: channelRow } = await supabase
            .from('conversations')
            .select('id')
            .eq('type', 'channel')
            .eq('nonprofit_id', nonprofitId)
            .maybeSingle()

          if (channelRow) {
            await supabase
              .from('conversation_participants')
              .delete()
              .eq('conversation_id', channelRow.id)
              .eq('user_id', employeeProfile.id)
          }
        }
      }
    } catch (_) {
      // Messaging tables may not exist — removal still succeeds
    }

    return res.json({ ok: true, nonprofit_id: nonprofitId, username })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Compatibility route for existing frontend profile creation/upsert
app.post('/create-profile', async (req, res) => {
  const {
    id,
    first_name,
    last_name,
    username = null,
    email,
    birthday = null,
    zip_code = null,
    phone = null,
    display_name = null
  } = req.body

  if (!id || !email) {
    return res.status(400).json({ error: 'missing required fields: id, email' })
  }

  const parsedFirst = first_name || (display_name ? display_name.trim().split(' ')[0] : null) || 'Unknown'
  const parsedLast =
    last_name ||
    (display_name ? display_name.trim().split(' ').slice(1).join(' ') : null) ||
    'Unknown'

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(
        [{ id, first_name: parsedFirst, last_name: parsedLast, username, email, birthday, zip_code, phone }],
        { onConflict: 'id' }
      )
      .select('*')

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Add/replace user roles
app.post('/users/:userId/roles', async (req, res) => {
  const { userId } = req.params
  const { roles = [], replace = false } = req.body

  if (!userId || !Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: 'provide userId and non-empty roles array' })
  }

  const normalizedRoles = [...new Set(roles)]
  const invalidRoles = normalizedRoles.filter((r) => !ALLOWED_ROLES.has(r))
  if (invalidRoles.length > 0) {
    return res.status(400).json({ error: `invalid roles: ${invalidRoles.join(', ')}` })
  }

  try {
    if (replace) {
      const { error: deleteError } = await supabase.from('user_roles').delete().eq('user_id', userId)
      if (deleteError) return res.status(500).json({ error: deleteError.message })
    }

    const roleRows = normalizedRoles.map((role) => ({ user_id: userId, role }))
    const { error } = await supabase
      .from('user_roles')
      .upsert(roleRows, { onConflict: 'user_id,role', ignoreDuplicates: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true, user_id: userId, roles: normalizedRoles, replace })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Create nonprofit
app.post('/nonprofits', async (req, res) => {
  const {
    name,
    website = null,
    zip_codes = [],
    addresses = [],
    focus_area = 'miscellaneous'
  } = req.body
  const normalizedFocusArea = normalizeFocusArea(focus_area)

  if (!name) {
    return res.status(400).json({ error: 'missing required field: name' })
  }

  if (!ALLOWED_FOCUS_AREAS.has(normalizedFocusArea)) {
    return res.status(400).json({ error: `invalid focus_area: ${focus_area}` })
  }

  if (!Array.isArray(zip_codes) || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'zip_codes and addresses must be arrays' })
  }

  try {
    const { data, error } = await supabase
      .from('nonprofits')
      .insert([{ name, website, zip_codes, addresses, focus_area: normalizedFocusArea }])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Add nonprofit employee
app.post('/nonprofits/:nonprofitId/employees', async (req, res) => {
  const { nonprofitId } = req.params
  const { user_id, title = null, is_admin = false } = req.body

  if (!nonprofitId || !user_id) {
    return res.status(400).json({ error: 'missing nonprofitId or user_id' })
  }

  try {
    const { error: employeeError } = await supabase
      .from('nonprofit_employees')
      .upsert([{ nonprofit_id: nonprofitId, user_id, title, is_admin }], {
        onConflict: 'nonprofit_id,user_id'
      })

    if (employeeError) return res.status(500).json({ error: employeeError.message })

    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert([{ user_id, role: 'nonprofit_employee' }], {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      })

    if (roleError) return res.status(500).json({ error: roleError.message })

    return res.status(201).json({ ok: true, nonprofit_id: nonprofitId, user_id, title, is_admin })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// List nonprofit employees
app.get('/nonprofits/:nonprofitId/employees', async (req, res) => {
  const { nonprofitId } = req.params

  try {
    const { data, error } = await supabase
      .from('nonprofit_employees')
      .select('nonprofit_id, title, is_admin, created_at, profiles:user_id(id, first_name, last_name, email, zip_code)')
      .eq('nonprofit_id', nonprofitId)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Public nonprofit profile with active listings
app.get('/nonprofits/:nonprofitId/profile', async (req, res) => {
  const { nonprofitId } = req.params

  try {
    const { data: nonprofit, error: nonprofitErr } = await supabase
      .from('nonprofits')
      .select(
        'id, name, website, description, distribution_schedule, zip_codes, addresses, focus_area, photo_urls, logo_url, contact_email, contact_phone'
      )
      .eq('id', nonprofitId)
      .maybeSingle()

    if (nonprofitErr) return res.status(500).json({ error: nonprofitErr.message })
    if (!nonprofit) return res.status(404).json({ error: 'nonprofit not found' })

    const { data: listings, error: listingsErr } = await supabase
      .from('resource_listings')
      .select('id, title, description, category_slug, location_label, zip_codes, distribution_schedule, status')
      .eq('nonprofit_id', nonprofitId)
      .eq('status', 'active')

    if (listingsErr) return res.status(500).json({ error: listingsErr.message })

    const { data: usernames, error: usernamesErr } = await supabase
      .from('nonprofit_admin_usernames')
      .select('username')
      .eq('nonprofit_id', nonprofitId)
    if (usernamesErr) return res.status(500).json({ error: usernamesErr.message })

    return res.json({
      data: {
        ...nonprofit,
        verified_usernames: (usernames || []).map((row) => row.username),
        listings: listings || []
      }
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.get('/nonprofits/:nonprofitId/subscription', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  try {
    const { data, error } = await supabase
      .from('nonprofit_subscribers')
      .select('nonprofit_id')
      .eq('nonprofit_id', nonprofitId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: { subscribed: Boolean(data) } })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.post('/nonprofits/:nonprofitId/subscription', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  try {
    const { error } = await supabase
      .from('nonprofit_subscribers')
      .upsert([{ nonprofit_id: nonprofitId, user_id: user.id }], {
        onConflict: 'nonprofit_id,user_id',
        ignoreDuplicates: true
      })

    if (error) return res.status(500).json({ error: error.message })

    // Also add the user to the nonprofit's channel conversation (graceful — don't fail if table missing)
    try {
      let channelId = null
      const { data: existingChannel } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'channel')
        .eq('nonprofit_id', nonprofitId)
        .maybeSingle()

      if (existingChannel) {
        channelId = existingChannel.id
      } else {
        const { data: newChannel } = await supabase
          .from('conversations')
          .insert([{ type: 'channel', nonprofit_id: nonprofitId }])
          .select('id')
          .single()
        channelId = newChannel?.id
      }

      if (channelId) {
        await supabase
          .from('conversation_participants')
          .upsert([{ conversation_id: channelId, user_id: user.id }], {
            onConflict: 'conversation_id,user_id',
            ignoreDuplicates: true
          })
      }
    } catch (_) {
      // Messaging tables may not exist yet — subscription still succeeds
    }

    return res.status(201).json({ ok: true, nonprofit_id: nonprofitId, user_id: user.id, subscribed: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

app.delete('/nonprofits/:nonprofitId/subscription', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  try {
    const { error } = await supabase
      .from('nonprofit_subscribers')
      .delete()
      .eq('nonprofit_id', nonprofitId)
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true, nonprofit_id: nonprofitId, user_id: user.id, subscribed: false })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Subscribe user to nonprofit channel
app.post('/nonprofits/:nonprofitId/subscribe', async (req, res) => {
  const { nonprofitId } = req.params
  const { user_id } = req.body

  if (!nonprofitId || !user_id) {
    return res.status(400).json({ error: 'missing nonprofitId or user_id' })
  }

  try {
    const { error } = await supabase
      .from('nonprofit_subscribers')
      .upsert([{ nonprofit_id: nonprofitId, user_id }], {
        onConflict: 'nonprofit_id,user_id',
        ignoreDuplicates: true
      })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ ok: true, nonprofit_id: nonprofitId, user_id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// List nonprofit subscribers
app.get('/nonprofits/:nonprofitId/subscribers', async (req, res) => {
  const { nonprofitId } = req.params

  try {
    const { data, error } = await supabase
      .from('nonprofit_subscribers')
      .select('nonprofit_id, created_at, profiles:user_id(id, first_name, last_name, email, zip_code)')
      .eq('nonprofit_id', nonprofitId)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// Volunteer application submission
app.post('/nonprofits/:nonprofitId/volunteer-applications', async (req, res) => {
  const { nonprofitId } = req.params
  const { user_id, answers = {} } = req.body

  if (!nonprofitId || !user_id) {
    return res.status(400).json({ error: 'missing nonprofitId or user_id' })
  }

  try {
    const { data, error } = await supabase
      .from('volunteer_applications')
      .insert([{ nonprofit_id: nonprofitId, user_id, answers, status: 'submitted' }])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert([{ user_id, role: 'volunteer' }], {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      })

    if (roleError) return res.status(500).json({ error: roleError.message })

    return res.status(201).json({ data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /posts -> public feed
app.get('/posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return res.status(500).json({ error })
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /create-post
app.post('/create-post', async (req, res) => {
  const { title, body, category, is_announcement = false, org_id, author_id } = req.body
  if (!title || !org_id || !author_id) return res.status(400).json({ error: 'missing fields' })

  try {
    const { data: employee, error: employeeErr } = await supabase
      .from('nonprofit_employees')
      .select('is_admin')
      .eq('nonprofit_id', org_id)
      .eq('user_id', author_id)
      .maybeSingle()

    if (employeeErr || !employee) {
      return res.status(403).json({ error: 'not authorized as nonprofit employee' })
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([{ title, body, category, is_announcement, org_id, author_id }])
    if (error) return res.status(500).json({ error })

    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// POST /rsvp
app.post('/rsvp', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { event_id } = req.body
  if (!event_id) return res.status(400).json({ error: 'missing event_id' })

  try {
    const { data: profile } = await loadProfileByUserId(user.id)
    const username = profile?.username || null

    const { data, error } = await supabase
      .from('rsvps')
      .insert([{ event_id, user_id: user.id, username }])
    if (error) {
      if (error.code === '23505') return res.json({ data: null, already: true })
      return res.status(500).json({ error: error.message })
    }
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// GET /events/:id/rsvps — event creator sees who RSVPed
app.get('/events/:id/rsvps', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  try {
    const { data: event } = await supabase
      .from('community_events')
      .select('posted_by_user_id')
      .eq('id', id)
      .single()

    if (!event || event.posted_by_user_id !== user.id) {
      return res.status(403).json({ error: 'Only the event creator can view RSVPs' })
    }

    const { data, error } = await supabase
      .from('rsvps')
      .select('user_id, username, created_at')
      .eq('event_id', id)
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || [], count: (data || []).length })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Clothing Marketplace ─────────────────────────────────────

// GET /clothing/items — all unsold items (public)
app.get('/clothing/items', async (req, res) => {
  const { category, size, zip_code } = req.query
  try {
    let query = supabase
      .from('clothing_items')
      .select('*')
      .eq('is_sold', false)
      .order('created_at', { ascending: false })

    if (category) query = query.eq('category', category)
    if (size) query = query.eq('size', size)
    if (zip_code) query = query.eq('zip_code', zip_code)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /clothing/items — create item (auth required)
app.post('/clothing/items', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { title, description, category, size, condition, photo_data_urls = [] } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })

  try {
    const { data: profile } = await loadProfileByUserId(user.id)
    const sellerUsername = profile?.username || null
    if (!sellerUsername) {
      return res.status(400).json({ error: 'You must set a username in your profile before listing items.' })
    }

    const sellerZip = profile?.zip_code || null

    const { data: item, error: insertErr } = await supabase
      .from('clothing_items')
      .insert([{ seller_id: user.id, seller_username: sellerUsername, zip_code: sellerZip, title, description, category, size, condition, photo_urls: [] }])
      .select('*')
      .single()

    if (insertErr || !item) return res.status(500).json({ error: insertErr?.message || 'failed to create item' })

    const photoUrls = []
    for (let i = 0; i < Math.min(photo_data_urls.length, 3); i++) {
      const { publicUrl } = await uploadClothingImage({ itemId: item.id, slot: i, dataUrl: photo_data_urls[i] })
      if (publicUrl) photoUrls.push(publicUrl)
    }

    if (photoUrls.length > 0) {
      await supabase.from('clothing_items').update({ photo_urls: photoUrls }).eq('id', item.id)
      item.photo_urls = photoUrls
    }

    return res.status(201).json({ data: item })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// PATCH /clothing/items/:id/sold — mark item as sold (seller only)
app.patch('/clothing/items/:id/sold', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  try {
    const { data: item, error: fetchErr } = await supabase
      .from('clothing_items')
      .select('seller_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !item) return res.status(404).json({ error: 'item not found' })
    if (item.seller_id !== user.id) return res.status(403).json({ error: 'not your listing' })

    const { data: updated, error } = await supabase
      .from('clothing_items')
      .update({ is_sold: true, sold_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// DELETE /clothing/items/:id — delete item (seller only)
app.delete('/clothing/items/:id', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  try {
    const { data: item, error: fetchErr } = await supabase
      .from('clothing_items')
      .select('seller_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !item) return res.status(404).json({ error: 'item not found' })
    if (item.seller_id !== user.id) return res.status(403).json({ error: 'not your listing' })

    const { error } = await supabase.from('clothing_items').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /clothing/items/:id/like — toggle like (auth required)
app.post('/clothing/items/:id/like', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  try {
    const { data: existing } = await supabase
      .from('item_likes')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('item_id', id)
      .maybeSingle()

    if (existing) {
      await supabase.from('item_likes').delete().eq('user_id', user.id).eq('item_id', id)
      return res.json({ liked: false })
    } else {
      await supabase.from('item_likes').insert([{ user_id: user.id, item_id: id }])
      return res.json({ liked: true })
    }
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /clothing/items/:id/like-status — check if liked + count
app.get('/clothing/items/:id/like-status', async (req, res) => {
  const { id } = req.params
  const token = getBearerToken(req)

  try {
    const { count } = await supabase.from('item_likes').select('*', { count: 'exact', head: true }).eq('item_id', id)

    let liked = false
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token)
      if (userData?.user?.id) {
        const { data: existing } = await supabase
          .from('item_likes')
          .select('user_id')
          .eq('user_id', userData.user.id)
          .eq('item_id', id)
          .maybeSingle()
        liked = Boolean(existing)
      }
    }

    return res.json({ liked, count: count || 0 })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /clothing/my-items — seller's listings
app.get('/clothing/my-items', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  try {
    const { data, error } = await supabase
      .from('clothing_items')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /clothing/my-likes — liked items
app.get('/clothing/my-likes', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  try {
    const { data, error } = await supabase
      .from('item_likes')
      .select('clothing_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    const items = (data || []).map((row) => row.clothing_items).filter(Boolean).filter((item) => !item.is_sold)
    return res.json({ data: items })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// ── Conversations & Messaging ────────────────────────────────

// GET /conversations — user's conversations with last message
app.get('/conversations', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  try {
    const { data: participations, error: partErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (partErr) return res.status(500).json({ error: partErr.message })
    const convIds = (participations || []).map((p) => p.conversation_id)
    if (convIds.length === 0) return res.json({ data: [] })

    const { data: convs, error: convErr } = await supabase
      .from('conversations')
      .select('id, type, nonprofit_id, created_at, nonprofits:nonprofit_id(id, name, logo_url)')
      .in('id', convIds)
      .order('created_at', { ascending: false })

    if (convErr) return res.status(500).json({ error: convErr.message })

    // Get last message and participant info for each conversation
    const enriched = await Promise.all(
      (convs || []).map(async (conv) => {
        const { data: msgs } = await supabase
          .from('messages')
          .select('id, content, sender_username, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMessage = msgs?.[0] || null

        // For DMs, get the other participant's name and username
        let otherUsername = null
        let otherFirstName = null
        if (conv.type === 'dm') {
          const { data: parts } = await supabase
            .from('conversation_participants')
            .select('user_id, profiles:user_id(username, first_name)')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id)
            .limit(1)

          const otherProfile = parts?.[0]?.profiles || null
          otherUsername = otherProfile?.username || null
          otherFirstName = otherProfile?.first_name || null
        }

        return { ...conv, lastMessage, otherUsername, otherFirstName }
      })
    )

    return res.json({ data: enriched })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /conversations/dm — start or retrieve DM with username
app.post('/conversations/dm', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { username } = req.body
  if (!username) return res.status(400).json({ error: 'username is required' })

  try {
    // Find the other user by username
    const { data: otherProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle()

    if (profileErr) return res.status(500).json({ error: profileErr.message })
    if (!otherProfile) return res.status(404).json({ error: `user "${username}" not found` })
    if (otherProfile.id === user.id) return res.status(400).json({ error: 'cannot message yourself' })

    // Find existing DM between these two users
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)

    const myConvIds = (myConvs || []).map((p) => p.conversation_id)

    if (myConvIds.length > 0) {
      const { data: sharedConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', otherProfile.id)
        .in('conversation_id', myConvIds)

      if (sharedConvs && sharedConvs.length > 0) {
        // Verify it's a DM type
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', sharedConvs[0].conversation_id)
          .eq('type', 'dm')
          .maybeSingle()

        if (existingConv) return res.json({ data: existingConv, existing: true })
      }
    }

    // Create new DM conversation
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .insert([{ type: 'dm' }])
      .select('*')
      .single()

    if (convErr || !conv) return res.status(500).json({ error: convErr?.message || 'failed to create conversation' })

    // Add both participants
    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherProfile.id }
    ])

    return res.status(201).json({ data: conv, existing: false, other_username: otherProfile.username })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /conversations/:id/messages — paginated messages
app.get('/conversations/:id/messages', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  try {
    // Verify user is a participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant) return res.status(403).json({ error: 'not a participant in this conversation' })

    const { data, error } = await supabase
      .from('messages')
      .select('*, message_likes(user_id)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) return res.status(500).json({ error: error.message })

    // Attach like_count and liked_by_me; strip raw like rows
    const enriched = (data || []).map((msg) => {
      const likes = msg.message_likes || []
      return {
        ...msg,
        message_likes: undefined,
        like_count: likes.length,
        liked_by_me: likes.some((l) => l.user_id === user.id),
      }
    })
    return res.json({ data: enriched })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /conversations/:id/messages — send a message (REST fallback)
app.post('/conversations/:id/messages', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id } = req.params
  const { content, event_id = null } = req.body
  if (!content) return res.status(400).json({ error: 'content is required' })

  try {
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!participant) return res.status(403).json({ error: 'not a participant in this conversation' })

    const { data: profile } = await loadProfileByUserId(user.id)
    const senderUsername = profile?.username || 'user'

    const { data: message, error } = await supabase
      .from('messages')
      .insert([{ conversation_id: id, sender_id: user.id, sender_username: senderUsername, content, event_id }])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Broadcast via socket to anyone connected
    io.to(`conversation:${id}`).emit('new_message', message)

    return res.status(201).json({ data: message })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /messages/:id/like — toggle like on a channel message
app.post('/messages/:id/like', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { id: messageId } = req.params
  try {
    // Verify message exists and get its conversation
    const { data: msg } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .single()
    if (!msg) return res.status(404).json({ error: 'Message not found' })

    // Check if already liked
    const { data: existing } = await supabase
      .from('message_likes')
      .select('message_id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      await supabase.from('message_likes').delete()
        .eq('message_id', messageId).eq('user_id', user.id)
    } else {
      await supabase.from('message_likes').insert([{ message_id: messageId, user_id: user.id }])
    }

    const { count } = await supabase
      .from('message_likes')
      .select('*', { count: 'exact', head: true })
      .eq('message_id', messageId)

    const likeCount = count || 0
    const liked = !existing

    // Broadcast updated count to everyone in the conversation
    io.to(`conversation:${msg.conversation_id}`).emit('message_liked', {
      message_id: messageId,
      conversation_id: msg.conversation_id,
      like_count: likeCount,
    })

    return res.json({ liked, like_count: likeCount })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// POST /nonprofits/:nonprofitId/broadcast — nonprofit employee sends to all subscribers
app.post('/nonprofits/:nonprofitId/broadcast', async (req, res) => {
  const user = await requireAuthenticatedUser(req, res)
  if (!user) return

  const { nonprofitId } = req.params
  const { content, event_id = null } = req.body
  if (!content) return res.status(400).json({ error: 'content is required' })

  try {
    const { data: profile } = await loadProfileByUserId(user.id)
    const { allowed } = await canUserManageNonprofit({ nonprofitId, userId: user.id, username: profile?.username || null })
    if (!allowed) return res.status(403).json({ error: 'not authorized to send to this channel' })

    // Find or create channel conversation for this nonprofit
    let channelConv = null
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'channel')
      .eq('nonprofit_id', nonprofitId)
      .maybeSingle()

    if (existing) {
      channelConv = existing
    } else {
      const { data: created } = await supabase
        .from('conversations')
        .insert([{ type: 'channel', nonprofit_id: nonprofitId }])
        .select('id')
        .single()
      channelConv = created
    }

    if (!channelConv) return res.status(500).json({ error: 'failed to find channel conversation' })

    const senderUsername = profile?.username || 'nonprofit'
    const { data: message, error } = await supabase
      .from('messages')
      .insert([{ conversation_id: channelConv.id, sender_id: user.id, sender_username: senderUsername, content, event_id }])
      .select('*')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    io.to(`conversation:${channelConv.id}`).emit('new_message', message)

    return res.status(201).json({ data: message, conversation_id: channelConv.id })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// GET /nonprofits/:nonprofitId/channel — get nonprofit's channel conversation id
app.get('/nonprofits/:nonprofitId/channel', async (req, res) => {
  const { nonprofitId } = req.params
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id, type, nonprofit_id')
      .eq('type', 'channel')
      .eq('nonprofit_id', nonprofitId)
      .maybeSingle()

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ data: data || null })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
})

// ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
