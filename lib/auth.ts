import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// The signed-in user and their staff record. Redirects to /login when signed out.
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect('/login');

  const { data: staff } = await supabase
    .from('staff')
    .select('id, display_name, role')
    .eq('user_id', data.claims.sub)
    .maybeSingle();

  return { supabase, staff, email: (data.claims.email as string | undefined) ?? '' };
}
