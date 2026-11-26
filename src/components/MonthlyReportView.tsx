import React, { useMemo, useState } from 'react';
import { CalendarCheck2, Download, Printer } from 'lucide-react';
import type {
  AuthUser,
  BehaviorRecord,
  MonthlyReportConfig,
  PublicStudent,
} from '../types.ts';
import {
  exportMonthlyCsv,
  formatIndonesianDateLong,
  getMonthLabel,
} from '../utils/disciplineEngine.ts';

interface MonthlyReportViewProps {
  user: AuthUser;
  students: PublicStudent[];
  records: BehaviorRecord[];
  monthlyConfig: MonthlyReportConfig;
  onUpdateMonthlyConfig: (updates: Partial<MonthlyReportConfig>) => Promise<void>;
}

const AVAILABLE_MONTHS = ['2026-11', '2026-10', '2026-09'];

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  user,
  students,
  records,
  monthlyConfig,
  onUpdateMonthlyConfig,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-11');
  const [classFilter, setClassFilter] = useState<string>(
    user.role === 'wali_kelas' && user.assignedClass ? user.assignedClass : 'ALL'
  );

  const canEditAutomation =
    user.role === 'admin' || user.role === 'bk' || user.role === 'ketertiban';

  const classes = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    return ['ALL', ...Array.from(set).sort()];
  }, [students]);

  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r.occurredAt.startsWith(selectedMonth)) return false;
      if (classFilter === 'ALL') return true;
      const stu = students.find((s) => s.id === r.studentId);
      return stu?.className === classFilter;
    });
  }, [records, selectedMonth, classFilter, students]);

  const reportRows = useMemo(() => {
    const filteredStudents =
      classFilter === 'ALL'
        ? students
        : students.filter((s) => s.className === classFilter);

    return filteredStudents.map((stu) => {
      const sRecs = monthRecords.filter((r) => r.studentId === stu.id);
      const vCount = sRecs.filter((r) => r.type === 'violation').length;
      const vPts = sRecs
        .filter((r) => r.type === 'violation')
        .reduce((sum, r) => sum + r.points, 0);
      const aCount = sRecs.filter((r) => r.type === 'achievement').length;
      const aPts = sRecs
        .filter((r) => r.type === 'achievement')
        .reduce((sum, r) => sum + r.points, 0);
      return {
        student: stu,
        vCount,
        vPts,
        aCount,
        aPts,
      };
    });
  }, [students, monthRecords, classFilter]);

  const totals = useMemo(() => {
    return reportRows.reduce(
      (acc, r) => ({
        vCount: acc.vCount + r.vCount,
        vPts: acc.vPts + r.vPts,
        aCount: acc.aCount + r.aCount,
        aPts: acc.aPts + r.aPts,
      }),
      { vCount: 0, vPts: 0, aCount: 0, aPts: 0 }
    );
  }, [reportRows]);

  const handleDownloadCsv = () => {
    const csv = exportMonthlyCsv(selectedMonth, students, records, classFilter);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-Perilaku-${selectedMonth}-${classFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Generator & Otomatisasi Laporan Bulanan
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Rekapitulasi otomatis poin pelanggaran, prestasi, dan status pembinaan siswa per bulan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Pilih Bulan Laporan"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {AVAILABLE_MONTHS.map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m)}
                </option>
              ))}
            </select>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              aria-label="Filter Kelas"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'Semua Kelas' : `Kelas ${c}`}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Laporan Bulanan (A4)
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 text-neutral-700">
            <CalendarCheck2 className="w-4 h-4 text-orange-600 shrink-0" />
            <span>
              <strong>Otomatisasi Akhir Bulan:</strong>{' '}
              {monthlyConfig.autoGenerateEnabled
                ? `Aktif — Rekap otomatis disusun setiap tanggal ${monthlyConfig.autoDayOfMonth} tiap bulan.`
                : 'Nonaktif (cetak manual).'}
            </span>
          </div>

          {canEditAutomation && (
            <div className="flex flex-wrap items-center gap-4">
              <label className="inline-flex items-center gap-2 cursor-pointer text-neutral-700">
                <input
                  type="checkbox"
                  checked={monthlyConfig.autoGenerateEnabled}
                  onChange={(e) =>
                    onUpdateMonthlyConfig({ autoGenerateEnabled: e.target.checked })
                  }
                  className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                Aktifkan Rekap Otomatis Bulanan
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-neutral-700">
                <input
                  type="checkbox"
                  checked={monthlyConfig.includeParentDigest}
                  onChange={(e) =>
                    onUpdateMonthlyConfig({ includeParentDigest: e.target.checked })
                  }
                  className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                Kirim Notifikasi Ringkasan ke Orang Tua
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-8 print-only-container">
        <div className="pb-4 border-b-2 border-neutral-900 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-neutral-500">
              {monthlyConfig.schoolName.toUpperCase()}
            </p>
            <h3 className="font-display text-xl font-bold text-neutral-900 mt-0.5">
              Laporan Bulanan Kedisiplinan & Prestasi Siswa
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Periode: {getMonthLabel(selectedMonth)} · Cakupan:{' '}
              {classFilter === 'ALL' ? 'Seluruh Kelas' : `Kelas ${classFilter}`}
            </p>
          </div>
          <div className="text-right text-xs text-neutral-600">
            <p>Tanggal Cetak: {formatIndonesianDateLong(new Date().toISOString())}</p>
            <p className="font-mono mt-0.5">Kode Rekap: SIBUDI-{selectedMonth}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5">
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500">Jumlah Siswa Tercakup</div>
            <div className="font-mono text-lg font-bold tabular-nums text-neutral-900 mt-0.5">
              {reportRows.length} siswa
            </div>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500">Kasus Pelanggaran Bulan Ini</div>
            <div className="font-mono text-lg font-bold tabular-nums text-rose-700 mt-0.5">
              {totals.vCount} kasus ({totals.vPts} poin)
            </div>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500">Capaian Prestasi Bulan Ini</div>
            <div className="font-mono text-lg font-bold tabular-nums text-emerald-700 mt-0.5">
              {totals.aCount} prestasi (+{totals.aPts} poin)
            </div>
          </div>
          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="text-[11px] text-neutral-500">Siswa Perlu Pembinaan Khusus</div>
            <div className="font-mono text-lg font-bold tabular-nums text-orange-600 mt-0.5">
              {reportRows.filter((r) => r.student.violationPoints >= 25).length} siswa
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-y border-neutral-300 bg-neutral-50 text-neutral-700 font-semibold">
                <th className="py-2.5 px-3">NISN</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3">Kelas</th>
                <th className="py-2.5 px-3 text-right">Pelanggaran (Bln)</th>
                <th className="py-2.5 px-3 text-right">Prestasi (Bln)</th>
                <th className="py-2.5 px-3 text-right">Akum. Pelanggaran</th>
                <th className="py-2.5 px-3 text-right">Indeks Perilaku</th>
                <th className="py-2.5 px-3">Status Pembinaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {reportRows.map(({ student, vCount, vPts, aCount, aPts }) => (
                <tr key={student.id}>
                  <td className="py-2.5 px-3 font-mono text-neutral-600">{student.nisn}</td>
                  <td className="py-2.5 px-3 font-medium text-neutral-900">{student.name}</td>
                  <td className="py-2.5 px-3 text-neutral-700">{student.className}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-rose-700">
                    {vCount > 0 ? `${vCount}x (-${vPts})` : '0'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                    {aCount > 0 ? `${aCount}x (+${aPts})` : '0'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900">
                    {student.violationPoints}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-neutral-900">
                    {student.behaviorIndex}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-neutral-800">
                    {student.riskStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="text-neutral-600">Mengetahui,</p>
            <p className="font-semibold">Kepala {monthlyConfig.schoolName}</p>
            <div className="h-14" />
            <p className="font-bold underline">Drs. H. Ahmad Suhendra, M.Pd.</p>
            <p className="font-mono text-[11px] text-neutral-500">NIP. 19690815 199512 1 003</p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-neutral-600">Disusun secara otomatis oleh sistem,</p>
            <p className="font-semibold">Koordinator Tim Ketertiban & BK</p>
            <div className="h-14" />
            <p className="font-bold underline">Ibu Maya Sari, M.Psi.</p>
            <p className="font-mono text-[11px] text-neutral-500">NIP. 19860412 201101 2 008</p>
          </div>
        </div>
      </div>
    </div>
  );
};
