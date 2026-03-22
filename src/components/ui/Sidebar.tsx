'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/threads', label: 'Threads', icon: '◈' },
  { href: '/pools',   label: 'Pools',   icon: '◎' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-48 min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
      <div className="px-4 py-3 border-b border-zinc-800">
        <span className="text-zinc-100 font-mono font-bold tracking-tight text-sm">
          forge
        </span>
        <span className="text-zinc-500 font-mono text-xs ml-1">ui</span>
      </div>

      <nav className="flex-1 py-2">
        {nav.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="text-xs text-zinc-500">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-zinc-800">
        <span className="text-zinc-600 font-mono text-xs">port 3142</span>
      </div>
    </aside>
  );
}
