const { createClient } = require('@supabase/supabase-js')

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env')
}

const supabaseAuth = createClient(url, anonKey, {
  auth: { persistSession: false }
})

module.exports = supabaseAuth
