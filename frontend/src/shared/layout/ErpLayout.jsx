import React from 'react';
import { User, Bell, Search } from 'lucide-react';

export const ErpLayout = ({ children, activeTab }) => {
  const getBreadcrumbs = () => {
    const parts = ['Inventory', activeTab.replace('-', ' ')];
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  };

  return (
    <div className="flex-1 ml-64 min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-500">{getBreadcrumbs()}</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 leading-none">Admin User</p>
              <p className="text-xs text-slate-500 mt-1">Super Admin</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              <User size={20} />
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="p-8 flex-1">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="px-8 py-4 border-t border-slate-200 text-center text-slate-400 text-xs bg-white">
        © 2026 Manufacturing Inventory ERP System. All rights reserved.
      </footer>
    </div>
  );
};
