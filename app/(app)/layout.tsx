import Link from 'next/link';
import { Nav } from '@/components/nav';
import { requireUser } from '@/lib/auth';
import { signOut } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { staff, email } = await requireUser();

  if (!staff) {
    return (
      <main className="mx-auto max-w-md px-6 py-24">
        <h1 className="font-display text-3xl">No staff profile</h1>
        <p className="mt-3 text-ink-soft">
          {email} can sign in but is not linked to a staff member yet. Ask the owner to link the account.
        </p>
        <form action={signOut} className="mt-8">
          <button className="btn btn-ghost">Sign out</button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[14.5rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-rule bg-flour px-4 py-3 lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="lot-tag !py-1 text-xs" data-stage="finished" aria-hidden>
            LOT
          </span>
          <span className="font-display text-2xl leading-none">Bakery</span>
        </Link>
        <div className="lg:mt-10">
          <Nav />
        </div>
        <div className="flex items-center gap-3 text-right lg:mt-auto lg:block lg:text-left">
          <div>
            <p className="font-bold leading-tight">{staff.display_name}</p>
            <p className="text-sm capitalize text-ink-soft">{staff.role}</p>
          </div>
          <form action={signOut} className="lg:mt-3">
            <button className="text-sm font-bold text-crust underline-offset-4 hover:underline">Sign out</button>
          </form>
        </div>
      </aside>
      {/* Bottom padding leaves room for the phone tab bar. */}
      <main className="px-4 pt-8 pb-28 sm:px-8 lg:px-12 lg:py-12">{children}</main>
    </div>
  );
}
