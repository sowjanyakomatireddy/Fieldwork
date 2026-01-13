
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Credentials.
 * Restored the '=' padding which is common in base64/JWT keys.
 */
const supabaseUrl = 'https://jcevnfiughtkjnyefkvn.supabase.co';
const supabaseAnonKey = 'sb_publishable_nA7m8z0Pv1-O0oU_12RGLQ_GqzGn_sU';

// Cloud Sync is active
export const isLocalMode = false;

/**
 * The Supabase client initialized with your project details.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET_NAME = 'visit-photos';

console.info("FieldTrack Pro: Cloud Sync active.");
