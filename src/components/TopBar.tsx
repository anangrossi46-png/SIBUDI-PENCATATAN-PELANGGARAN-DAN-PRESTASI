import React from 'react';
import { Bell, Plus, ShieldCheck } from 'lucide-react';
import type { NavTab } from './Sidebar.tsx';

interface TopBarProps {
  activeTab: NavTab;
  unreadCount: number;
  isLiveConnected: boolean;
  onOpenNotifications: () => void;
  onQuickRecord: () => void;
  showQuickAction: boolean;
  showNotificationDrawerButton: boolean;
}

const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Dashboard Real-Time',
  records: 'Pencatatan Poin',
  discipline: 'Disiplin & Ketertiban',
  bk_letters: 'Guru BK & Surat',
  monthly_report: 'Laporan Bulanan',
  admin_panel: 'Kelola Aplikasi',
  parent_notifications: 'Notifikasi Orang Tua',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  unreadCount,
  isLiveConnected,
  onOpenNotifications,
  onQuickRecord,
  showQuickAction,
  showNotificationDrawerButton,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 lg:h-16 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 no-print">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Compact mobile app icon */}
        <div className="lg:hidden w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-neutral-400 font-medium hidden lg:inline whitespace-nowrap">
            SIBUDI
          </span>
          <span className="text-neutral-300 hidden lg:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display font-semibold text-neutral-900 truncate text-sm lg:text-base">
            {TAB_TITLES[activeTab]}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div
          className="hidden md:flex items-center gap-1.5 text-xs text-neutral-500 mr-1 whitespace-nowrap"
          title="Koneksi pembaruan real-time Server-Sent Events"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLiveConnected ? 'bg-emerald-600' : 'bg-orange-500'
            }`}
          />
          <span>{isLiveConnected ? 'Sinkronisasi Real-Time' : 'Menghubungkan'}</span>
        </div>

        {showNotificationDrawerButton && (
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] px-2.5 lg:px-3 py-2 rounded-xl lg:rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            aria-label="Buka notifikasi otomatis"
          >
            <Bell className="w-4 h-4 text-neutral-600" />
            <span className="hidden sm:inline">Notifikasi</span>
            {unreadCount > 0 && (
              <span className="font-mono text-xs tabular-nums text-orange-600 font-semibold">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        {showQuickAction && (
          <button
            type="button"
            onClick={onQuickRecord}
            className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Poin</span>
          </button>
        )}
      </div>
    </header>
  );
};
