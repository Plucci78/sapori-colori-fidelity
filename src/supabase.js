import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jexkalekaofsfcusdfjh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpleGthbGVrYW9mc2ZjdXNkZmpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjYxMzQsImV4cCI6MjA2NDIwMjEzNH0.WjO_AzIcBVU51KZVaMDqosq3Y48-plFp1R0FDWQ2s58'

export const supabase = createClient(supabaseUrl, supabaseKey)