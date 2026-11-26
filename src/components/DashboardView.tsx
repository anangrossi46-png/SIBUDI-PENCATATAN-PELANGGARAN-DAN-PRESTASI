import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Award,
  CheckCircle2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import type {
  AuthUser,
  BehaviorRecord,
  DisciplinaryAction,
  NotificationItem,
  PublicStudent,
} from '../types.ts';
import {
  formatIndonesianDate,
  formatIndonesianDateTime,
  getRiskBadgeClasses,
} from '../utils/disciplineEngine.ts';
import { BehaviorTrendChart, ClassBehaviorChart } from './BehaviorCharts.tsx';

interface DashboardViewProps {
  user: AuthUser;
  students: PublicStudent[];
  records: BehaviorRecord[];
  disciplinaryActions: DisciplinaryAction[];
  notifications: NotificationItem[];
  onQuickRecord: () => void;
  onOpenSummonForStudent: (studentId: string) => void;
  onOpenDisciplineModule: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  students,
  records,
  disciplinaryActions,
  notifications,
  onQuickRecord,
  onOpenSummonForStudent,
  onOpenDisciplineModule,
}) => {
  const [scopeFilter, setScopeFilter] = useState<'all' | 'assigned'>(
    user.role === 'wali_kelas' && user.assignedClass ? 'assigned' : 'all'
  );

  const scopedStudents = useMemo(() => {
    if (scopeFilter === 'assigned' && user.assignedClass) {
      return students.filter((s) => s.className === user.assignedClass);
    }
    return students;
  }, [students, scopeFilter, user.assignedClass]);

  const scopedRecords = useMemo(() => {
    const ids = new Set(scopedStudents.map((s) => s.id));
    return records.filter((r) => ids.has(r.studentId));
  }, [records, scopedStudents]);

  const stats = useMemo(() => {
    const currentMonth = '2026-11';
    const monthRecords = scopedRecords.filter((r) =>
      r.occurredAt.startsWith(currentMonth)
    );
    const monthViolationPts = monthRecords
      .filter((r) => r.type === 'violation')
      .reduce((s, r) => s + r.points, 0);
    const monthAchievementPts = monthRecords
      .filter((r) => r.type === 'achievement')
      .reduce((s, r) => s + r.points, 0);

    const avgBehaviorIndex =
      scopedStudents.length > 0
        ? Math.round(
            scopedStudents.reduce((s, st) => s + st.behaviorIndex, 0) /
              scopedStudents.length
          )
        : 100;

    const attentionStudents = scopedStudents.filter(
      (s) => s.violationPoints >= 25
    ).length;

    const ids = new Set(scopedStudents.map((s) => s.id));
    const pendingActions = disciplinaryActions.filter(
      (a) => ids.has(a.studentId) && a.status !== 'Selesai Dibina'
    ).length;

    return {
      monthViolationPts,
      monthAchievementPts,
      avgBehaviorIndex,
      attentionStudents,
      pendingActions,
      monthTotalRecords: monthRecords.length,
    };
  }, [scopedStudents, scopedRecords, disciplinaryActions]);

  const priorityStudents = useMemo(() => {
    return [...scopedStudents]
      .filter((s) => s.violationPoints > 0)
      .sort((a, b) => b.violationPoints - a.violationPoints)
      .slice(0, 6);
  }, [scopedStudents]);

  const topAchievers = useMemo(() => {
    return [...scopedStudents]
      .filter((s) => s.achievementPoints > 0)
      .sort((a, b) => b.achievementPoints - a.achievementPoints)
      .slice(0, 4);
  }, [scopedStudents]);

  const latestAlerts = notifications.slice(0, 3);
  const canOpenDiscipline = user.role !== 'guru_mapel';
  const canIssueBkLetter = user.role === 'bk' || user.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Scope Switcher for Wali Kelas */}
      {user.role === 'wali_kelas' && user.assignedClass && (
        <div className="bg-white border border-neutral-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-neutral-600">
            Cakupan Pemantauan Wali Kelas:{' '}
            <strong className="text-neutral-900">Kelas {user.assignedClass}</strong>
          </div>
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
            <button
              type="button"
              onClick={() => setScopeFilter('assigned')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scopeFilter === 'assigned'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Kelas {user.assignedClass}
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                scopeFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Seluruh Sekolah
            </button>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Indeks Perilaku</span>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-neutral-900">
              {stats.avgBehaviorIndex}
            </span>
            <span className="text-xs text-neutral-500">/ 120 poin rata-rata</span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Total {scopedStudents.length} siswa terpantau aktif
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Poin Pelanggaran (Nov 2026)</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-rose-700">
              {stats.monthViolationPts}
            </span>
            <span className="text-xs text-neutral-500">poin tercatat</span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {stats.attentionStudents} siswa melewati ambang SP1 (≥25 poin)
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Poin Prestasi (Nov 2026)</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-emerald-700">
              +{stats.monthAchievementPts}
            </span>
            <span className="text-xs text-neutral-500">poin apresiasi</span>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {stats.monthTotalRecords} total entri perilaku bulan ini
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Tindak Lanjut Ketertiban</span>
            <CheckCircle2 className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tabular-nums text-neutral-900">
              {stats.pendingActions}
            </span>
            <span className="text-xs text-neutral-500">kasus aktif</span>
          </div>
          {canOpenDiscipline ? (
            <button
              type="button"
              onClick={onOpenDisciplineModule}
              className="mt-2 text-xs font-semibold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              Kelola evaluasi disiplin
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <p className="mt-2 text-xs text-neutral-400">
              Dikelola Tim Ketertiban, Wali Kelas & BK
            </p>
          )}
        </div>
      </section>

      {/* Main Real-time Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-7">
          <BehaviorTrendChart records={scopedRecords} />
        </div>
        <div className="xl:col-span-5">
          <ClassBehaviorChart students={scopedStudents} records={scopedRecords} />
        </div>
      </section>

      {/* Priority Monitoring Table + Live Feed & Achievements */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-semibold text-neutral-900 text-base">
                Pemantauan Siswa Prioritas Disiplin
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Urutan akumulasi poin pelanggaran tertinggi beserta status pembinaan
              </p>
            </div>
            <button
              type="button"
              onClick={onQuickRecord}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap"
            >
              + Tambah Catatan Poin
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold text-neutral-500">
                  <th className="py-2.5 px-4">Siswa</th>
                  <th className="py-2.5 px-3 text-right">Pelanggaran</th>
                  <th className="py-2.5 px-3 text-right">Prestasi</th>
                  <th className="py-2.5 px-3">Status Pembinaan</th>
                  {canIssueBkLetter && (
                    <th className="py-2.5 px-4 text-right">Layanan BK</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {priorityStudents.map((stu) => {
                  const statusStyle = getRiskBadgeClasses(stu.riskStatus);
                  return (
                    <tr key={stu.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-900">{stu.name}</div>
                        <div className="text-xs text-neutral-500">
                          {stu.className} · Wali: {stu.homeroomTeacher}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-rose-700">
                        {stu.violationPoints}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-emerald-700">
                        +{stu.achievementPoints}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs font-semibold ${statusStyle.text}`}>
                          {stu.riskStatus}
                        </span>
                      </td>
                      {canIssueBkLetter && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {stu.violationPoints >= 25 ? (
                            <button
                              type="button"
                              onClick={() => onOpenSummonForStudent(stu.id)}
                              className="text-orange-600 hover:text-orange-700 text-xs font-semibold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Surat BK
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-5">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Aktivitas Pencatatan Terbaru
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 mb-3">
              Aliran pembaruan poin pelanggaran & prestasi secara langsung
            </p>
            <div className="divide-y divide-neutral-100">
              {scopedRecords.slice(0, 4).map((rec) => {
                const stu = students.find((s) => s.id === rec.studentId);
                return (
                  <div key={rec.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-900 truncate">
                        {stu?.name || 'Siswa'} · {stu?.className}
                      </div>
                      <div className="text-xs text-neutral-600 line-clamp-1 mt-0.5">
                        {rec.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {formatIndonesianDate(rec.occurredAt)} · {rec.recordedBy}
                      </div>
                    </div>
                    <span
                      className={`font-mono tabular-nums text-xs font-bold shrink-0 ${
                        rec.type === 'violation' ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      {rec.type === 'violation' ? `-${rec.points}` : `+${rec.points}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Siswa Berprestasi & Notifikasi Terbaru
            </h2>
            <div className="mt-3 space-y-2.5">
              {topAchievers.slice(0, 3).map((stu) => (
                <div
                  key={stu.id}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-100 last:border-none"
                >
                  <div>
                    <span className="font-semibold text-neutral-900">{stu.name}</span>
                    <span className="text-neutral-500 ml-2">
                      {stu.className} · {stu.riskStatus}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-emerald-700">
                    +{stu.achievementPoints} poin
                  </span>
                </div>
              ))}
            </div>

            {latestAlerts.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <p className="text-[11px] font-semibold text-neutral-500 mb-2">
                  Peringatan Otomatis Terakhir
                </p>
                <div className="text-xs text-neutral-700">
                  <span className="font-semibold text-neutral-900">{latestAlerts[0].title}</span>
                  <span className="text-neutral-400 ml-2 font-mono text-[11px]">
                    {formatIndonesianDateTime(latestAlerts[0].createdAt)}
                  </span>
                  <p className="text-neutral-600 mt-0.5 line-clamp-2">{latestAlerts[0].message}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
