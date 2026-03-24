'use client';

import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function SidebarWrapper() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  return (
    <>
      {/* Collapsed: narrow strip with toggle */}
      {collapsed && (
        <div className="w-12 min-h-screen bg-card border-r border-white/[0.06] flex flex-col items-center shrink-0">
          <button
            onClick={toggle}
            className="w-full py-4 flex justify-center hover:bg-white/[0.04] transition-colors"
            title="Expand sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-stone-500">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Expanded sidebar */}
      {!collapsed && (
        <Sidebar onCollapse={toggle} />
      )}
    </>
  );
}
