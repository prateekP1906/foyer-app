
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mziqagmbyfwhelsyuwhp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aXFhZ21ieWZ3aGVsc3l1d2hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxODY3NjYsImV4cCI6MjA4NTc2Mjc2Nn0.LPPSwirhtB3x4QwDtsr6Bew5xuMt3lZ6tKnQKzQmpjo'

export const supabase = createClient(supabaseUrl, supabaseKey)
