import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function test() {
  try {
    // Test database: fetch user list (if table exists)
    const { data: users, error } = await supabase.from('users').select('*').limit(1);
    if (error) throw error;
    console.log('Supabase DB connection OK. Sample user:', users?.[0] || 'No users found.');

    // Test storage: list buckets
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    if (storageError) throw storageError;
    console.log('Supabase Storage buckets:', buckets);
  } catch (err) {
    console.error('Supabase test error:', err.message || err);
  }
}

test(); 