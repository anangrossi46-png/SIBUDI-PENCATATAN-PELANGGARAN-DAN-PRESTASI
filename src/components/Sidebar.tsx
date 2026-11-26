import React from 'react';
import {
  Activity,
  Bell,
  ClipboardEdit,
  FileSpreadsheet,
  FileText,
  LogOut,
  Scale,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { AuthUser, UserRole } from '../types.ts';

export type NavTab =
  | 'dashboard'
  | 'records'
  | 'discipline'
  | 'bk_letters'
  | 'monthly_report'
  | 'admin_panel'
  | 'parent_notifications';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AuthUser;
  schoolName: string;
  unreadNotifications: number;
  pendingActionsCount: number;
  onLogout: () => void;
}

const NAV_ITEMS: {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Real-Time',
    icon: Activity,
    allowedRoles: ['admin', 'ketertiban', 'guru_mapel', 'wali_kelas', 'bk'],
  },
  {
    id: 'records',
    label: 'Pencatatan Poin',
    icon: ClipboardEdit,
    allowedRoles: ['admin', 'ketertiban', 'guru_mapel', 'wali_kelas', 'bk'],
  },
  {
    id: 'discipline',
    label: 'Disiplin & Ketertiban',
    icon: Scale,
    allowedRoles: ['admin', 'ketertiban', 'wali_kelas', 'bk'],
  },
  {
    id: 'bk_letters',
    label: 'Guru BK & Surat',
    icon: FileText,
    allowedRoles: ['admin', 'bk'],
  },
  {
    id: 'monthly_report',
    label: 'Laporan Bulanan',
    icon: FileSpreadsheet,
    allowedRoles: ['admin', 'ketertiban', 'guru_mapel', 'wali_kelas', 'bk'],
  },
  {
    id: 'admin_panel',
    label: 'Kelola Aplikasi',
    icon: Settings,
    allowedRoles: ['admin'],
  },
  {
    id: 'parent_notifications',
    label: 'Notifikasi & Surat',
    icon: Bell,
    allowedRoles: ['orang_tua'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  schoolName,
  unreadNotifications,
  pendingActionsCount,
  onLogout,
}) => {
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.allowedRoles.includes(user.role)
  );

  return (
    <aside className="hidden lg:block shrink-0 no-print">
      <div className="flex h-full flex-col bg-white border-r border-neutral-200 w-64 shrink-0">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-neutral-200">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="font-display font-bold text-base tracking-tight text-neutral-900 block leading-none">
              SIBUDI
            </span>
            <span className="text-[11px] text-neutral-500 block mt-0.5 truncate">
              {schoolName}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu utama">
          <p className="px-3 pb-1.5 text-[11px] font-medium text-neutral-400">
            Menu Hak Akses
          </p>
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-orange-600' : 'text-neutral-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'discipline' && pendingActionsCount > 0 && (
                  <span className="font-mono text-xs tabular-nums text-orange-700 font-semibold ml-2">
                    {pendingActionsCount}
                  </span>
                )}
                {item.id === 'parent_notifications' && unreadNotifications > 0 && (
                  <span className="font-mono text-xs tabular-nums text-orange-700 font-semibold ml-2">
                    {unreadNotifications}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-neutral-200 bg-neutral-50/60 space-y-3">
          <div>
            <div className="text-[11px] font-semibold text-orange-600">
              {user.roleLabel}
            </div>
            <div className="text-xs font-semibold text-neutral-900 truncate mt-0.5">
              {user.name}
            </div>
            {user.assignedClass && (
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Perwalian: Kelas {user.assignedClass}
              </div>
            )}
            {user.studentName && (
              <div className="text-[11px] text-neutral-500 mt-0.5 truncate">
                Anak: {user.studentName} ({user.studentClass})
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-100 text-xs font-semibold text-neutral-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar / Ganti Peran
          </button>
        </div>
      </div>
    </aside>
  );
};
