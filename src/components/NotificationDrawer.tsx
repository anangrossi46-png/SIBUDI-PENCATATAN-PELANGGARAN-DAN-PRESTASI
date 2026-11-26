import React, { useState } from 'react';
import { AlertTriangle, Award, Bell, CheckCheck, FileText, X } from 'lucide-react';
import type { NotificationItem, UserRole } from '../types.ts';
import { formatIndonesianDateTime } from '../utils/disciplineEngine.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  userRole: UserRole;
  onMarkRead: (id?: string, all?: boolean) => void;
  onOpenSummonForStudent: (studentId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  userRole,
  onMarkRead,
  onOpenSummonForStudent,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'critical') return n.severity === 'critical' || n.severity === 'warning';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div
        className="fixed inset-0 bg-neutral-900/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md bg-white h-full border-l border-neutral-200 flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-neutral-900 text-base flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              Notifikasi Otomatis Perubahan Poin
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Peringatan otomatis saat perubahan poin signifikan atau ambang batas terlampaui
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Tutup panel notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between gap-2 bg-neutral-50/70">
          <div className="flex items-center gap-1 p-1 bg-neutral-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'all' ? 'bg-white text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Semua
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'unread' ? 'bg-white text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Belum Dibaca ({unreadCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                filter === 'critical' ? 'bg-white text-neutral-900' : 'text-neutral-600'
              }`}
            >
              Prioritas
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => onMarkRead(undefined, true)}
              className="flex items-center gap-1 text-xs font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Tandai Semua
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-neutral-500">
              Tidak ada notifikasi pada filter ini.
            </div>
          ) : (
            filtered.map((n) => (
              <div
                key={n.id}
                className={`p-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-orange-50/35'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    {n.severity === 'positive' ? (
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : n.severity === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                    )}
                    <span
                      className={
                        n.severity === 'positive'
                          ? 'text-emerald-700'
                          : n.severity === 'critical'
                            ? 'text-rose-700'
                            : 'text-orange-700'
                      }
                    >
                      {n.studentName} · {n.className}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-neutral-400 shrink-0">
                    {formatIndonesianDateTime(n.createdAt)}
                  </span>
                </div>

                <h3 className="font-semibold text-sm text-neutral-900 mt-1.5">
                  {n.title}
                </h3>
                <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                  {n.message}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-neutral-500">
                    Penerima: {n.recipients.join(' · ')}
                  </span>

                  <div className="flex items-center gap-2">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => onMarkRead(n.id, false)}
                        className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                    {(userRole === 'bk' || userRole === 'admin') &&
                      (n.severity === 'critical' || n.type === 'threshold_crossed') && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenSummonForStudent(n.studentId);
                            onClose();
                          }}
                          className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                        >
                          Terbitkan Surat BK →
                        </button>
                      )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
