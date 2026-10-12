'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Today' },
  { href: '/lots', label: 'Lots' },
  { href: '/receive', label: 'Receive' },
  { href: '/produce', label: 'Produce' },
];

// A tab bar fixed to the bottom on phones, a sidebar list on large screens.
export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-rule bg-paper/95 p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:flex lg:flex-col lg:border-0 lg:bg-transparent lg:p-0"
    >
      {LINKS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`rounded px-3 py-2.5 text-center text-[0.95rem] font-bold transition-colors lg:text-left lg:text-[1.02rem] ${
              active ? 'bg-ink text-flour' : 'text-ink-soft hover:bg-rule/50 hover:text-ink'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
