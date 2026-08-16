import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Bell,
  ArrowLeftRight, 
  History, 
  BarChart3, 
  Database,
  ChevronDown,
  ChevronRight,
  LogOut,
  Building2,
  Tags,
  Boxes,
  Ruler,
  FileCode,
  BookOpen,
  Sparkles
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab, onExit }) => {
  const [masterDataOpen, setMasterDataOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'transaction', label: 'Create Transaction', icon: <ArrowLeftRight size={20} /> },
    { id: 'history', label: 'Transaction History', icon: <History size={20} /> },
    { id: 'stock', label: 'Stock Report', icon: <BarChart3 size={20} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={20} />, badge: 3 },
  ];

  const masterDataItems = [
    { id: 'dept-master', label: 'Department', icon: <Building2 size={18} /> },
    { id: 'cat-master', label: 'Category', icon: <Tags size={18} /> },
    { id: 'group-master', label: 'Group', icon: <Boxes size={18} /> },
    { id: 'unit-master', label: 'Unit', icon: <Ruler size={18} /> },
    { id: 'code-master', label: 'Main Code', icon: <FileCode size={18} /> },
  ];

  const helpItems = [
    { id: 'docs', label: 'Documentation 📖', icon: <BookOpen size={18} /> },
    { id: 'ai-chatbot', label: 'AI Chatbot 🤖✨', icon: <Sparkles size={18} /> },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-blue-400">Inventory ERP</h1>
        <p className="text-xs text-slate-400 mt-1">Manufacturing System</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
              activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="flex items-center space-x-3">
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </div>
            {item.badge && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}

        <div className="pt-2">
          <button
            onClick={() => setMasterDataOpen(!masterDataOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-slate-300 hover:bg-slate-800 hover:text-white ${
              masterDataOpen ? 'text-white' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <Database size={20} />
              <span className="font-medium">Master Data</span>
            </div>
            {masterDataOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          {masterDataOpen && (
            <div className="ml-6 mt-1 space-y-1 border-l border-slate-800">
              {masterDataItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2 rounded-r-lg transition-colors ${
                    activeTab === item.id ? 'text-blue-400 bg-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800/80 mt-3">
          <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase px-4 mb-2">Help & Support</p>
          {helpItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={onExit}
          className="w-full flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Exit ERP</span>
        </button>
      </div>
    </div>
  );
};
