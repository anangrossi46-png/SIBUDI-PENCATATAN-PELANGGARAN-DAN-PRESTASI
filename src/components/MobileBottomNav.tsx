import React from 'react';
import {
  Activity,
  Bell,
  ClipboardEdit,
  FileSpreadsheet,
  FileText,
  LogOut,
  MoreHorizontal,
  Scale,
  Settings,
  User,
  X,
} from 'lucide-react';
import type { AuthUser } from '../types.ts';
import type { NavTab } from './Sidebar.tsx';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AuthUser;
  schoolName: string;
  unreadNotifications: number;
  pendingActionsCount: number;
  sheetOpen: boolean;
  onOpenSheet: () => void;
  onCloseSheet: () => void;
  onLogout: () => void;
}

interface MobileTabItem {
  id: NavTab;
  shortLabel: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  user,
  schoolName,
  unreadNotifications,
  pendingActionsCount,
  sheetOpen,
  onOpenSheet,
  onCloseSheet,
  onLogout,
}) => {
  const getTabsForRole = (): MobileTabItem[] => {
    switch (user.role) {
      case 'orang_tua':
        return [
          {
            id: 'parent_notifications',
            shortLabel: 'Notifikasi',
            fullLabel: 'Notifikasi & Surat',
            icon: Bell,
            badge: unreadNotifications,
          },
        ];
      case 'guru_mapel':
        return [
          {
            id: 'dashboard',
            shortLabel: 'Beranda',
            fullLabel: 'Dashboard Real-Time',
            icon: Activity,
          },
          {
            id: 'records',
            shortLabel: 'Catat',
            fullLabel: 'Pencatatan Poin',
            icon: ClipboardEdit,
          },
          {
            id: 'monthly_report',
            shortLabel: 'Laporan',
            fullLabel: 'Laporan Bulanan',
            icon: FileSpreadsheet,
          },
        ];
      case 'wali_kelas':
      case 'ketertiban':
        return [
          {
            id: 'dashboard',
            shortLabel: 'Beranda',
            fullLabel: 'Dashboard Real-Time',
            icon: Activity,
          },
          {
            id: 'records',
            shortLabel: 'Catat',
            fullLabel: 'Pencatatan Poin',
            icon: ClipboardEdit,
          },
          {
            id: 'discipline',
            shortLabel: 'Disiplin',
            fullLabel: 'Disiplin & Ketertiban',
            icon: Scale,
            badge: pendingActionsCount,
          },
          {
            id: 'monthly_report',
            shortLabel: 'Laporan',
            fullLabel: 'Laporan Bulanan',
            icon: FileSpreadsheet,
          },
        ];
      case 'bk':
        return [
          {
            id: 'dashboard',
            shortLabel: 'Beranda',
            fullLabel: 'Dashboard Real-Time',
            icon: Activity,
          },
          {
            id: 'records',
            shortLabel: 'Catat',
            fullLabel: 'Pencatatan Poin',
            icon: ClipboardEdit,
          },
          {
            id: 'discipline',
            shortLabel: 'Disiplin',
            fullLabel: 'Disiplin & Ketertiban',
            icon: Scale,
            badge: pendingActionsCount,
          },
          {
            id: 'bk_letters',
            shortLabel: 'Surat BK',
            fullLabel: 'Guru BK & Surat',
            icon: FileText,
          },
          {
            id: 'monthly_report',
            shortLabel: 'Laporan',
            fullLabel: 'Laporan Bulanan',
            icon: FileSpreadsheet,
          },
        ];
      case 'admin':
        return [
          {
            id: 'dashboard',
            shortLabel: 'Beranda',
            fullLabel: 'Dashboard Real-Time',
            icon: Activity,
          },
          {
            id: 'records',
            shortLabel: 'Catat',
            fullLabel: 'Pencatatan Poin',
            icon: ClipboardEdit,
          },
          {
            id: 'discipline',
            shortLabel: 'Disiplin',
            fullLabel: 'Disiplin & Ketertiban',
            icon: Scale,
            badge: pendingActionsCount,
          },
          {
            id: 'bk_letters',
            shortLabel: 'Surat BK',
            fullLabel: 'Guru BK & Surat',
            icon: FileText,
          },
          {
            id: 'monthly_report',
            shortLabel: 'Laporan',
            fullLabel: 'Laporan Bulanan',
            icon: FileSpreadsheet,
          },
          {
            id: 'admin_panel',
            shortLabel: 'Kelola',
            fullLabel: 'Kelola Aplikasi',
            icon: Settings,
          },
        ];
    }
  };

  const allTabs = getTabsForRole();
  const needsMoreMenu = allTabs.length > 4;
  const primaryBarTabs = needsMoreMenu ? allTabs.slice(0, 3) : allTabs;
  const overflowTabs = needsMoreMenu ? allTabs.slice(3) : [];
  const isOverflowActive = overflowTabs.some((t) => t.id === activeTab);

  // Total slots on bottom bar: primaryBarTabs + (More or Account)
  const slotCount = primaryBarTabs.length + 1;

  return (
    <>
      <nav
        aria-label="Navigasi Aplikasi Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 pb-[env(safe-area-inset-bottom)] no-print"
      >
        <div
          className="grid items-center h-16 px-1"
          style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
        >
          {primaryBarTabs.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center min-h-[44px] px-1 rounded-lg transition-colors ${
                  isActive
                    ? 'text-orange-600'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-600 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-tight mt-1 truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenSheet}
            className={`flex flex-col items-center justify-center min-h-[44px] px-1 rounded-lg transition-colors ${
              sheetOpen || isOverflowActive
                ? 'text-orange-600'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {needsMoreMenu ? (
              <MoreHorizontal className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
            <span className="text-[10px] font-medium tracking-tight mt-1 truncate max-w-full">
              {needsMoreMenu ? 'Lainnya' : 'Akun'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile App Bottom Sheet for Overflow Menus & Account */}
      {sheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end no-print">
          <div
            className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs"
            onClick={onCloseSheet}
            aria-hidden="true"
          />
          <div className="relative z-10 bg-white rounded-t-3xl border-t border-neutral-200 px-5 pb-6 pt-2 max-h-[82vh] overflow-y-auto">
            <div className="w-10 h-1.5 bg-neutral-300 rounded-full mx-auto my-2.5" />

            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <p className="text-[11px] font-semibold text-orange-600">
                  {user.roleLabel}
                </p>
                <p className="font-display font-bold text-base text-neutral-900">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {user.studentName
                    ? `Anak: ${user.studentName} (${user.studentClass})`
                    : user.assignedClass
                      ? `Perwalian: Kelas ${user.assignedClass}`
                      : schoolName}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSheet}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-neutral-500 hover:bg-neutral-100"
                aria-label="Tutup menu bawah"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {overflowTabs.length > 0 && (
              <div className="py-3 space-y-1.5 border-b border-neutral-100">
                <p className="text-[11px] font-semibold text-neutral-400 px-1 mb-1">
                  Menu Lainnya
                </p>
                {overflowTabs.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseSheet();
                      }}
                      className={`w-full min-h-[48px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-neutral-800 hover:bg-neutral-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`w-5 h-5 ${
                            isActive ? 'text-orange-600' : 'text-neutral-400'
                          }`}
                        />
                        <span>{item.fullLabel}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  onCloseSheet();
                  onLogout();
                }}
                className="w-full min-h-[48px] px-4 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-sm font-semibold text-neutral-800 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 text-orange-600" />
                Keluar / Ganti Peran Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
