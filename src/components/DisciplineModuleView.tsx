import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Clock, FileText, Scale, ShieldCheck } from 'lucide-react';
import type {
  ActionStatus,
  AuthUser,
  DisciplinaryAction,
  PublicStudent,
  RuleCatalogItem,
} from '../types.ts';
import { formatIndonesianDate, getRiskBadgeClasses } from '../utils/disciplineEngine.ts';

interface DisciplineModuleViewProps {
  user: AuthUser;
  students: PublicStudent[];
  disciplinaryActions: DisciplinaryAction[];
  catalog: RuleCatalogItem[];
  onUpdateAction: (
    id: string,
    payload: {
      status?: ActionStatus;
      assignedUnit?: 'Wali Kelas' | 'Tim Ketertiban' | 'Guru BK';
      evaluationNotes?: string;
    }
  ) => Promise<void>;
  onOpenSummonForStudent: (studentId: string) => void;
}

export const DisciplineModuleView: React.FC<DisciplineModuleViewProps> = ({
  user,
  students,
  disciplinaryActions,
  catalog,
  onUpdateAction,
  onOpenSummonForStudent,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | ActionStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);

  const scopedActions = useMemo(() => {
    if (user.role === 'wali_kelas' && user.assignedClass) {
      const classIds = new Set(
        students.filter((s) => s.className === user.assignedClass).map((s) => s.id)
      );
      return disciplinaryActions.filter((a) => classIds.has(a.studentId));
    }
    return disciplinaryActions;
  }, [disciplinaryActions, students, user]);

  const filteredActions = useMemo(() => {
    return scopedActions.filter((a) =>
      statusFilter === 'all' ? true : a.status === statusFilter
    );
  }, [scopedActions, statusFilter]);

  const counts = useMemo(() => {
    return {
      waiting: scopedActions.filter((a) => a.status === 'Menunggu Tindak Lanjut').length,
      inProgress: scopedActions.filter((a) => a.status === 'Sedang Dijalani').length,
      done: scopedActions.filter((a) => a.status === 'Selesai Dibina').length,
    };
  }, [scopedActions]);

  const startEditNotes = (action: DisciplinaryAction) => {
    setEditingId(action.id);
    setNoteDraft(action.evaluationNotes);
  };

  const saveEditNotes = async (id: string) => {
    await onUpdateAction(id, { evaluationNotes: noteDraft });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">Menunggu Tindak Lanjut</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-rose-700 mt-1">
              {counts.waiting}
            </p>
          </div>
          <Clock className="w-5 h-5 text-rose-600" />
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">Sedang Dijalani Siswa</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-orange-600 mt-1">
              {counts.inProgress}
            </p>
          </div>
          <Scale className="w-5 h-5 text-orange-600" />
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">Selesai Dibina & Dievaluasi</p>
            <p className="font-mono text-2xl font-bold tabular-nums text-emerald-700 mt-1">
              {counts.done}
            </p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Rekomendasi Penindakan & Evaluasi Tim Ketertiban
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {user.role === 'wali_kelas' && user.assignedClass
                ? `Menampilkan kasus pembinaan siswa Kelas ${user.assignedClass}`
                : 'Terintegrasi otomatis dengan tingkat pelanggaran dan akumulasi poin seluruh siswa'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCatalogModal((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <BookOpen className="w-3.5 h-3.5 text-orange-600" />
              {showCatalogModal ? 'Tutup Matriks Tata Tertib' : 'Lihat Matriks Tata Tertib'}
            </button>

            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg">
              {(['all', 'Menunggu Tindak Lanjut', 'Sedang Dijalani', 'Selesai Dibina'] as const).map(
                (tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap ${
                      statusFilter === tab ? 'bg-white text-neutral-900' : 'text-neutral-600'
                    }`}
                  >
                    {tab === 'all' ? 'Semua' : tab}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {showCatalogModal && (
          <div className="p-5 bg-neutral-50 border-b border-neutral-200">
            <h3 className="text-xs font-semibold text-neutral-800 mb-3">
              Pedoman Poin Pelanggaran & Standar Penindakan Sekolah
            </h3>
            <div className="overflow-x-auto bg-white border border-neutral-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2 px-3">Kode</th>
                    <th className="py-2 px-3">Jenis Pelanggaran</th>
                    <th className="py-2 px-3">Tingkat</th>
                    <th className="py-2 px-3 text-right">Poin</th>
                    <th className="py-2 px-3">Standar Penindakan Edukatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {catalog
                    .filter((c) => c.type === 'violation')
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-mono font-semibold text-neutral-700">
                          {item.code}
                        </td>
                        <td className="py-2 px-3 font-medium text-neutral-900">{item.title}</td>
                        <td className="py-2 px-3 text-neutral-600">{item.severity}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-rose-700">
                          +{item.points}
                        </td>
                        <td className="py-2 px-3 text-neutral-600">{item.defaultPunishment}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="divide-y divide-neutral-200">
          {filteredActions.length === 0 ? (
            <div className="p-10 text-center text-sm text-neutral-500">
              Tidak ada daftar rekomendasi penindakan pada status ini.
            </div>
          ) : (
            filteredActions.map((act) => {
              const stu = students.find((s) => s.id === act.studentId);
              const riskStyle = stu ? getRiskBadgeClasses(stu.riskStatus) : null;
              const isEditing = editingId === act.id;

              return (
                <div key={act.id} className="p-5 hover:bg-neutral-50/40 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-neutral-900 text-sm">
                          {stu?.name || 'Siswa'}
                        </span>
                        <span className="text-neutral-400">·</span>
                        <span className="text-neutral-600">{stu?.className}</span>
                        <span className="text-neutral-400">·</span>
                        <span className="font-mono tabular-nums font-semibold text-rose-700">
                          +{act.violationPoints} poin (Akumulasi: {act.cumulativeViolationPoints})
                        </span>
                        {stu && riskStyle && (
                          <>
                            <span className="text-neutral-400">·</span>
                            <span className={`font-semibold ${riskStyle.text}`}>
                              {stu.riskStatus}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-xs font-medium text-neutral-700">
                        Pelanggaran: {act.violationTitle}
                      </p>

                      <div className="mt-2 p-3 rounded-lg bg-neutral-50 border border-neutral-200/80 text-xs space-y-1">
                        <div className="font-semibold text-neutral-900">
                          Rekomendasi Penindakan ({act.sanctionLevel})
                        </div>
                        <p className="text-neutral-700 leading-relaxed">{act.recommendedAction}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2 shrink-0 min-w-[220px]">
                      <div className="flex items-center gap-2 w-full">
                        <label className="text-[11px] text-neutral-500 w-16 shrink-0">Status</label>
                        <select
                          value={act.status}
                          onChange={(e) =>
                            onUpdateAction(act.id, { status: e.target.value as ActionStatus })
                          }
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                          <option value="Menunggu Tindak Lanjut">Menunggu Tindak Lanjut</option>
                          <option value="Sedang Dijalani">Sedang Dijalani</option>
                          <option value="Selesai Dibina">Selesai Dibina</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full">
                        <label className="text-[11px] text-neutral-500 w-16 shrink-0">
                          Penanggung
                        </label>
                        <select
                          value={act.assignedUnit}
                          onChange={(e) =>
                            onUpdateAction(act.id, {
                              assignedUnit: e.target.value as
                                | 'Wali Kelas'
                                | 'Tim Ketertiban'
                                | 'Guru BK',
                            })
                          }
                          className="flex-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        >
                          <option value="Wali Kelas">Wali Kelas</option>
                          <option value="Tim Ketertiban">Tim Ketertiban</option>
                          <option value="Guru BK">Guru BK</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-[260px]">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            placeholder="Catatan evaluasi guru / tim ketertiban..."
                          />
                          <button
                            type="button"
                            onClick={() => saveEditNotes(act.id)}
                            className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-2.5 py-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-neutral-600">
                          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>
                            <strong className="text-neutral-700">Catatan Evaluasi:</strong>{' '}
                            {act.evaluationNotes}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditNotes(act)}
                            className="text-orange-600 hover:text-orange-700 font-medium ml-1 shrink-0"
                          >
                            Ubah
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-neutral-500">
                      <span className="font-mono tabular-nums">
                        Batas Evaluasi: {formatIndonesianDate(act.dueDate)}
                      </span>
                      {(user.role === 'bk' || user.role === 'admin') && stu && stu.violationPoints >= 25 && (
                        <button
                          type="button"
                          onClick={() => onOpenSummonForStudent(stu.id)}
                          className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 font-semibold"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Terbitkan Surat Panggilan BK
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
