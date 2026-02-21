// backend/index.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const supabase = require('./lib/supabaseAdmin')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

const ALLOWED_ROLES = new Set([
  'person_in_need',
  'clothes_donor',
  'volunteer',
  'nonprofit_employee'
])

const ALLOWED_FOCUS_AREAS = new Set(['clothing', 'healthcare', 'shelter', 'food', 'other'])

// Health
app.get('/_health', (req, res) => res.json({ ok: true }))

// Optional root route to avoid "Cannot GET /"
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Ottera backend is running',
    routes: [
      'POST /auth/register',
      'POST /users/:userId/roles',
      'POST /nonprofits',
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

// Register user in Supabase Auth + profile + optional roles
app.post('/auth/register', async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    birthday = null,
    zip_code = null,
    phone = null,
    roles = []
  } = req.body

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'missing required fields: first_name, last_name, email, password' })
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

    return res.status(201).json({ user_id: userId, email, roles: normalizedRoles })
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
        [{ id, first_name: parsedFirst, last_name: parsedLast, email, birthday, zip_code, phone }],
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
    focus_area = 'other'
  } = req.body

  if (!name) {
    return res.status(400).json({ error: 'missing required field: name' })
  }

  if (!ALLOWED_FOCUS_AREAS.has(focus_area)) {
    return res.status(400).json({ error: `invalid focus_area: ${focus_area}` })
  }

  if (!Array.isArray(zip_codes) || !Array.isArray(addresses)) {
    return res.status(400).json({ error: 'zip_codes and addresses must be arrays' })
  }

  try {
    const { data, error } = await supabase
      .from('nonprofits')
      .insert([{ name, website, zip_codes, addresses, focus_area }])
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
  const { event_id, user_id } = req.body
  if (!event_id || !user_id) return res.status(400).json({ error: 'missing' })

  try {
    const { data, error } = await supabase
      .from('rsvps')
      .insert([{ event_id, user_id }])
    if (error) return res.status(500).json({ error })
    res.json({ data })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})
