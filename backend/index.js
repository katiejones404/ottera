// backend/index.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const supabase = require('./lib/supabaseAdmin')

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 4000

// Health
app.get('/_health', (req, res) => res.json({ ok: true }))

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

// POST /create-profile
app.post('/create-profile', async (req, res) => {
  const { id, display_name, email, is_org = false, org_id = null } = req.body
  if (!id) return res.status(400).json({ error: 'missing id' })

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id, display_name, email, is_org, org_id }, { onConflict: 'id' })
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
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('is_org, org_id')
      .eq('id', author_id)
      .single()

    if (profErr || !profile || !profile.is_org || profile.org_id !== org_id) {
      return res.status(403).json({ error: 'not authorized as org admin' })
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