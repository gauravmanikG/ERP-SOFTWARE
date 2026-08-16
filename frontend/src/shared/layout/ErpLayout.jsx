import React from 'react';
import { User, Bell } from 'lucide-react';

export const ErpLayout = ({ children, activeTab, setActiveTab }) => {
  const getBreadcrumbs = () => {
    const parts = ['Inventory', activeTab.replace('-', ' ')];
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  };

  return (
    <div className="flex-1 ml-64 min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-slate-500">{getBreadcrumbs()}</span>
        </div>

        <div className="flex items-center space-x-6">
          <button 
            onClick={() => setActiveTab && setActiveTab('notifications')}
            title="View Notifications"
            className="p-2 text-slate-500 hover:bg-slate-200/60 rounded-full transition-colors relative cursor-pointer"
          >
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-slate-300/60">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900 leading-none">Admin User</p>
              <p className="text-xs text-slate-500 mt-1">Super Admin</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
              <User size={20} />
            </div>
          </div>
        </div>
      </div>

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
