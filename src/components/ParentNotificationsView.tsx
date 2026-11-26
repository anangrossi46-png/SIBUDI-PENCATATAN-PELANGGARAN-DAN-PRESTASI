import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Bell,
  CheckCheck,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type {
  AuthUser,
  NotificationItem,
  PublicStudent,
  SummonLetter,
} from '../types.ts';
import {
  formatIndonesianDateLong,
  formatIndonesianDateTime,
} from '../utils/disciplineEngine.ts';

interface ParentNotificationsViewProps {
  user: AuthUser;
  student: PublicStudent | undefined;
  notifications: NotificationItem[];
  summonLetters: SummonLetter[];
  onMarkRead: (id?: string, all?: boolean) => Promise<void>;
  onConfirmSummon: (letterId: string, note: string) => Promise<void>;
}

export const ParentNotificationsView: React.FC<ParentNotificationsViewProps> = ({
  user,
  student,
  notifications,
  summonLetters,
  onMarkRead,
  onConfirmSummon,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [responseNote, setResponseNote] = useState<string>(
    'Kami telah menerima pemberitahuan ini dan siap hadir sesuai jadwal.'
  );
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = notifications.filter((n) =>
    filter === 'unread' ? !n.isRead : true
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Clean Header Identity */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-orange-600">
            Pemberitahuan Resmi Orang Tua / Wali Murid
          </p>
          <h2 className="font-display text-xl font-bold text-neutral-900 mt-1">
            {user.name}
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Peserta Didik: <strong className="text-neutral-800">{student?.name || user.studentName}</strong>
            {' · '}Kelas {student?.className || user.studentClass}
            {student?.nisn && (
              <>
                {' · '}NISN <span className="font-mono">{student.nisn}</span>
              </>
            )}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-neutral-500">Notifikasi Belum Dibaca</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-orange-600 mt-0.5">
            {unreadCount}
          </div>
        </div>
      </div>

      {/* Urgent Summon Letter Notifications if issued by Guru BK */}
      {summonLetters.length > 0 && (
        <div className="bg-white border border-orange-300 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-orange-700">
            <FileText className="w-5 h-5" />
            <h3 className="font-display font-semibold text-base text-neutral-900">
              Pemberitahuan Surat Panggilan Guru BK
            </h3>
          </div>

          <div className="divide-y divide-neutral-200">
            {summonLetters.map((letter) => (
              <div key={letter.id} className="pt-4 first:pt-0 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1.5 text-xs">
                    <div className="font-mono font-semibold text-neutral-900">
                      Nomor Surat: {letter.letterNumber}
                    </div>
                    <p className="text-neutral-700">
                      <strong>Jadwal Pertemuan:</strong>{' '}
                      {formatIndonesianDateLong(letter.meetingDate)} pukul {letter.meetingTime} ·{' '}
                      {letter.meetingLocation}
                    </p>
                    <p className="text-neutral-600">
                      <strong>Agenda:</strong> {letter.agenda}
                    </p>
                    <p className="text-neutral-500">
                      Guru BK: {letter.counselorName} · Status:{' '}
                      <strong className="text-neutral-900">{letter.status}</strong>
                    </p>
                  </div>

                  {letter.status === 'Diterbitkan' ? (
                    <div className="flex flex-col gap-2 min-w-[260px]">
                      <input
                        type="text"
                        value={responseNote}
                        onChange={(e) => setResponseNote(e.target.value)}
                        placeholder="Catatan konfirmasi orang tua..."
                        className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                      />
                      <button
                        type="button"
                        disabled={confirmingId === letter.id}
                        onClick={async () => {
                          setConfirmingId(letter.id);
                          await onConfirmSummon(letter.id, responseNote);
                          setConfirmingId(null);
                        }}
                        className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition-colors"
                      >
                        {confirmingId === letter.id
                          ? 'Mengirim Konfirmasi...'
                          : 'Konfirmasi Terima Pemberitahuan'}
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Terkonfirmasi ({letter.status})
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Feed (Read-Only Notification Center for Parents) */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-600" />
            <h3 className="font-display font-semibold text-neutral-900 text-base">
              Kotak Masuk Notifikasi Perubahan Poin & Pemberitahuan
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'all' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Semua ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filter === 'unread' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Belum Dibaca ({unreadCount})
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void onMarkRead(undefined, true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tandai Semua Dibaca
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {visibleNotifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">
              Belum ada pemberitahuan baru untuk putra/putri Anda saat ini.
            </div>
          ) : (
            visibleNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 transition-colors ${
                  notif.isRead ? 'bg-white' : 'bg-orange-50/40'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {notif.severity === 'positive' ? (
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : notif.severity === 'critical' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-orange-600 shrink-0" />
                    )}
                    <span className="text-neutral-900">{notif.title}</span>
                  </div>

                  <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                    {formatIndonesianDateTime(notif.createdAt)}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                  {notif.message}
                </p>

                {!notif.isRead && (
                  <div className="mt-2.5 flex justify-end">
                    <button
                      type="button"
                      onClick={() => void onMarkRead(notif.id, false)}
                      className="text-xs font-medium text-orange-600 hover:text-orange-700"
                    >
                      Tandai sudah dibaca
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
