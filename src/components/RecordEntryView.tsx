import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, CheckCircle2, Search, ShieldAlert, Trash2 } from 'lucide-react';
import type {
  AuthUser,
  BehaviorRecord,
  PublicStudent,
  RecordType,
  RuleCatalogItem,
} from '../types.ts';
import {
  formatIndonesianDate,
  generatePunishmentRecommendation,
} from '../utils/disciplineEngine.ts';

interface RecordEntryViewProps {
  user: AuthUser;
  students: PublicStudent[];
  catalog: RuleCatalogItem[];
  records: BehaviorRecord[];
  onCreateRecord: (payload: {
    studentId: string;
    ruleId: string;
    notes: string;
    location: string;
    occurredAt: string;
  }) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export const RecordEntryView: React.FC<RecordEntryViewProps> = ({
  user,
  students,
  catalog,
  records,
  onCreateRecord,
  onDeleteRecord,
}) => {
  const [recordType, setRecordType] = useState<RecordType>('violation');
  const [studentId, setStudentId] = useState<string>(students[0]?.id || '');
  const [ruleId, setRuleId] = useState<string>('');
  const [location, setLocation] = useState<string>('Area Kelas / Lingkungan Sekolah');
  const [occurredAt, setOccurredAt] = useState<string>('2026-11-25');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'violation' | 'achievement'>('all');

  const rulesForType = useMemo(
    () => catalog.filter((r) => r.type === recordType),
    [catalog, recordType]
  );

  const activeRuleId = rulesForType.some((r) => r.id === ruleId)
    ? ruleId
    : rulesForType[0]?.id || '';

  const selectedStudent = students.find((s) => s.id === studentId) || students[0];
  const selectedRule = rulesForType.find((r) => r.id === activeRuleId);

  const recommendationPreview = useMemo(() => {
    if (!selectedStudent || !selectedRule || selectedRule.type !== 'violation') return null;
    const projected = selectedStudent.violationPoints + selectedRule.points;
    return {
      projectedPoints: projected,
      ...generatePunishmentRecommendation(selectedRule, projected),
    };
  }, [selectedStudent, selectedRule]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const stu = students.find((s) => s.id === r.studentId);
      return (
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.recordedBy.toLowerCase().includes(q) ||
        (stu?.name.toLowerCase().includes(q) ?? false) ||
        (stu?.className.toLowerCase().includes(q) ?? false)
      );
    });
  }, [records, typeFilter, searchQuery, students]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedRule) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await onCreateRecord({
        studentId: selectedStudent.id,
        ruleId: selectedRule.id,
        notes,
        location,
        occurredAt,
      });
      setNotes('');
      setFeedback({
        type: 'success',
        text:
          selectedRule.type === 'violation'
            ? `Pelanggaran untuk ${selectedStudent.name} (+${selectedRule.points} poin) tercatat. Rekomendasi penindakan & notifikasi otomatis diperbarui.`
            : `Prestasi untuk ${selectedStudent.name} (+${selectedRule.points} poin) berhasil dicatat dan notifikasi dikirim.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan catatan poin.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canDeleteRecord = (rec: BehaviorRecord) => {
    if (user.role === 'admin' || user.role === 'ketertiban' || user.role === 'bk') return true;
    return rec.recordedBy === user.name;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      <div className="xl:col-span-5 bg-white border border-neutral-200 rounded-xl p-5">
        <h2 className="font-display font-semibold text-neutral-900 text-base">
          Input Poin Pelanggaran / Prestasi Siswa
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5 mb-4">
          Tercatat otomatis atas nama <strong>{user.name}</strong> ({user.roleLabel}).
        </p>

        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-lg mb-4">
          <button
            type="button"
            onClick={() => setRecordType('violation')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              recordType === 'violation'
                ? 'bg-white text-orange-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Catat Pelanggaran
          </button>
          <button
            type="button"
            onClick={() => setRecordType('achievement')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              recordType === 'achievement'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Catat Prestasi
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Pilih Siswa
            </label>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.className}) — Pelanggaran: {s.violationPoints} | Prestasi: {s.achievementPoints}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              {recordType === 'violation'
                ? 'Jenis Pelanggaran (Tata Tertib)'
                : 'Jenis Prestasi & Penghargaan'}
            </label>
            <select
              value={activeRuleId}
              onChange={(e) => setRuleId(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
            >
              {rulesForType.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {r.title} (
                  {r.type === 'violation' ? `+${r.points} poin sanksi` : `+${r.points} poin prestasi`})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Tanggal Kejadian
              </label>
              <input
                type="date"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Lokasi
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Misal: Ruang XI IPA 1"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Kronologi / Catatan Tambahan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tuliskan keterangan singkat kejadian atau detail pencapaian prestasi..."
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
            />
          </div>

          {recommendationPreview && (
            <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-semibold text-orange-950">
                <span>Pratinjau Rekomendasi Penindakan Otomatis</span>
                <span className="font-mono tabular-nums text-orange-700">
                  Proyeksi: {recommendationPreview.projectedPoints} poin
                </span>
              </div>
              <p className="text-orange-800 font-medium">
                Tingkat Sanksi: {recommendationPreview.sanctionLevel} (Unit:{' '}
                {recommendationPreview.assignedUnit})
              </p>
              <p className="text-neutral-700 leading-relaxed">
                {recommendationPreview.recommendedAction}
              </p>
            </div>
          )}

          {selectedRule && selectedRule.type === 'achievement' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs space-y-1">
              <div className="font-semibold text-emerald-900">
                Apresiasi & Kredit Prestasi (+{selectedRule.points} poin)
              </div>
              <p className="text-emerald-800">{selectedRule.defaultPunishment}</p>
            </div>
          )}

          {feedback && (
            <div
              className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
          >
            {submitting
              ? 'Menyimpan & Menyinkronkan...'
              : recordType === 'violation'
                ? 'Simpan Catatan Pelanggaran'
                : 'Simpan Catatan Prestasi'}
          </button>
        </form>
      </div>

      {/* Ledger Table */}
      <div className="xl:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Buku Catatan Pelanggaran & Prestasi
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Total {filteredRecords.length} catatan ditampilkan
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari siswa, kelas, kejadian..."
                className="pl-8 pr-3 py-1.5 rounded-lg border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  typeFilter === 'all' ? 'bg-white text-neutral-900' : 'text-neutral-600'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('violation')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  typeFilter === 'violation' ? 'bg-white text-orange-700' : 'text-neutral-600'
                }`}
              >
                Pelanggaran
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('achievement')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  typeFilter === 'achievement' ? 'bg-white text-emerald-700' : 'text-neutral-600'
                }`}
              >
                Prestasi
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold text-neutral-500">
                <th className="py-2.5 px-4">Tanggal & Siswa</th>
                <th className="py-2.5 px-3">Uraian Kejadian / Prestasi</th>
                <th className="py-2.5 px-3 text-right">Poin</th>
                <th className="py-2.5 px-3">Pencatat</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-neutral-500">
                    Tidak ada catatan poin yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const stu = students.find((s) => s.id === rec.studentId);
                  return (
                    <tr key={rec.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-neutral-900">
                          {stu?.name || 'Siswa'}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono tabular-nums">
                          {formatIndonesianDate(rec.occurredAt)} · {stu?.className}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="text-xs font-semibold text-neutral-800">
                          {rec.title}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">
                          {rec.category} · {rec.location}
                        </div>
                        {rec.notes && rec.notes !== '-' && (
                          <div className="text-xs text-neutral-600 mt-1">{rec.notes}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top text-right whitespace-nowrap">
                        <span
                          className={`font-mono tabular-nums text-xs font-bold ${
                            rec.type === 'violation' ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {rec.type === 'violation' ? `-${rec.points}` : `+${rec.points}`}
                        </span>
                        <div className="text-[11px] text-neutral-400">
                          {rec.type === 'violation' ? rec.severity : rec.achievementTier}
                        </div>
                      </td>
                      <td className="py-3 px-3 align-top text-xs text-neutral-600">
                        <div className="font-medium text-neutral-800">{rec.recordedBy}</div>
                        <div className="text-[11px] text-neutral-400">{rec.recordedByRole}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-right">
                        {canDeleteRecord(rec) ? (
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1.5 rounded-md text-neutral-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Hapus catatan (koreksi entri)"
                            aria-label="Hapus catatan poin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
