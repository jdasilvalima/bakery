// Creates the local sign-in accounts and links them to staff members.
// Local development only: run after `npm run db:start` or `npm run db:reset`.
//   npm run db:users
import { createClient } from '@supabase/supabase-js';

const ACCOUNTS = [
  { email: 'owner@bakery.test', staff: 'Owner' },
  { email: 'manager@bakery.test', staff: 'Manager' },
  { email: 'operator@bakery.test', staff: 'Operator 1' },
];

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const password = process.env.DEV_USER_PASSWORD;
if (!url || !secretKey || !password) {
  throw new Error('Set SUPABASE_URL, SUPABASE_SECRET_KEY and DEV_USER_PASSWORD in .env.local');
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
  throw new Error(`Refusing to create dev accounts on a non-local project: ${url}`);
}

const admin = createClient(url, secretKey, { auth: { persistSession: false } });

const { data: existing, error: listError } = await admin.auth.admin.listUsers();
if (listError) throw listError;

for (const account of ACCOUNTS) {
  let userId = existing.users.find((u) => u.email === account.email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const { error } = await admin.from('staff').update({ user_id: userId }).eq('display_name', account.staff);
  if (error) throw error;
  console.log(`${account.email} -> ${account.staff}`);
}
