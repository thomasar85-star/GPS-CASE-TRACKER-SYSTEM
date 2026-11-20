import React from 'react';
import { LayoutDashboard, FolderLock, PlusCircle, Users, ShieldAlert } from 'lucide-react';
import { ActiveView, Officer } from '../types';
import { storage } from '../services/storage';

interface NavigationProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  currentUser: Officer | null;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onNavigate,
}) => {
  const metrics = storage.getDashboardMetrics();

  const navItems = [
    {
      id: 'dashboard' as ActiveView,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'case_list' as ActiveView,
      label: 'Cases',
      icon: FolderLock,
      badge: metrics.totalCases,
    },
    {
      id: 'lodge_complaint' as ActiveView,
      label: 'New Complaint',
      icon: PlusCircle,
      badge: null,
      highlight: true,
    },
    {
      id: 'suspect_directory' as ActiveView,
      label: 'Suspects & Persons',
      icon: Users,
      badge: metrics.suspectMatchesCount > 0 ? `${metrics.suspectMatchesCount} match` : null,
    },
    {
      id: 'senior_command' as ActiveView,
      label: 'Command Oversight',
      icon: ShieldAlert,
      badge: metrics.agingCasesCount > 0 ? `${metrics.agingCasesCount} aging` : null,
    }
  ];

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-[49px] sm:top-[57px] z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#0A2A66] text-white shadow-sm font-semibold'
                    : item.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-300/80 hover:bg-amber-100 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-[#C9A227]'
                      : item.highlight
                      ? 'text-[#C9A227]'
                      : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-[#C9A227] text-slate-950'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
