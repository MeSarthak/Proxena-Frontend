import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Mic2 } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — drawer on mobile, always visible on md+ */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mic2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900">Proxena</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
