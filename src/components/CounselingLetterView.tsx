import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, Printer, Send } from 'lucide-react';
import type {
  MonthlyReportConfig,
  PublicStudent,
  SummonLetter,
  SummonStatus,
} from '../types.ts';
import {
  formatIndonesianDate,
  formatIndonesianDateLong,
  getRiskBadgeClasses,
} from '../utils/disciplineEngine.ts';

interface CounselingLetterViewProps {
  students: PublicStudent[];
  summonLetters: SummonLetter[];
  monthlyConfig: MonthlyReportConfig;
  preselectedStudentId: string | null;
  onCreateSummonLetter: (payload: {
    studentId: string;
    agenda: string;
    meetingDate: string;
    meetingTime: string;
    meetingLocation: string;
    counselorName: string;
    counselorNip: string;
  }) => Promise<SummonLetter>;
  onUpdateSummonStatus: (id: string, status: SummonStatus) => Promise<void>;
}

export const CounselingLetterView: React.FC<CounselingLetterViewProps> = ({
  students,
  summonLetters,
  monthlyConfig,
  preselectedStudentId,
  onCreateSummonLetter,
  onUpdateSummonStatus,
}) => {
  const priorityCandidates = useMemo(() => {
    return [...students].sort((a, b) => b.violationPoints - a.violationPoints);
  }, [students]);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    preselectedStudentId || priorityCandidates[0]?.id || ''
  );
  const [meetingDate, setMeetingDate] = useState<string>('2026-11-28');
  const [meetingTime, setMeetingTime] = useState<string>('09:00 WIB');
  const [meetingLocation, setMeetingLocation] = useState<string>(
    'Ruang Bimbingan & Konseling (BK) Lt. 1'
  );
  const [counselorName, setCounselorName] = useState<string>('Ibu Maya Sari, M.Psi.');
  const [counselorNip, setCounselorNip] = useState<string>('19860412 201101 2 008');
  const [agenda, setAgenda] = useState<string>(
    'Konsultasi pembinaan kedisiplinan siswa, evaluasi akumulasi poin tata tertib, dan penyusunan rencana pendampingan bersama orang tua.'
  );
  const [activeLetterId, setActiveLetterId] = useState<string | null>(
    summonLetters[0]?.id || null
  );
  const [issuing, setIssuing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedStudentId) {
      setSelectedStudentId(preselectedStudentId);
      const existing = summonLetters.find((l) => l.studentId === preselectedStudentId);
      if (existing) setActiveLetterId(existing.id);
    }
  }, [preselectedStudentId, summonLetters]);

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || priorityCandidates[0];

  const previewLetter = useMemo(() => {
    const found = summonLetters.find((l) => l.id === activeLetterId);
    if (found) return found;
    return summonLetters[0] || null;
  }, [summonLetters, activeLetterId]);

  const handleIssueLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setIssuing(true);
    setSuccessMsg(null);
    try {
      const created = await onCreateSummonLetter({
        studentId: selectedStudent.id,
        agenda,
        meetingDate,
        meetingTime,
        meetingLocation,
        counselorName,
        counselorNip,
      });
      setActiveLetterId(created.id);
      setSuccessMsg(
        `Surat panggilan resmi (${created.letterNumber}) untuk orang tua ${created.studentName} berhasil diterbitkan dan notifikasi dikirim ke Orang Tua.`
      );
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-5 no-print">
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h2 className="font-display font-semibold text-neutral-900 text-base">
              Penerbitan Otomatis Surat Panggilan Orang Tua
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5 mb-4">
              Khusus Guru BK — Data siswa, orang tua, alamat, dan riwayat poin pelanggaran terisi otomatis.
            </p>

            <form onSubmit={handleIssueLetter} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Pilih Siswa (Urut Poin Pelanggaran Tertinggi)
                </label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                >
                  {priorityCandidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.className}) — {s.violationPoints} poin [{s.riskStatus}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedStudent && (
                <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      Wali Murid: {selectedStudent.parentName}
                    </span>
                    <span
                      className={`font-semibold ${getRiskBadgeClasses(selectedStudent.riskStatus).text}`}
                    >
                      {selectedStudent.riskStatus}
                    </span>
                  </div>
                  <p className="text-neutral-600">
                    Telp: {selectedStudent.parentPhone} · {selectedStudent.parentAddress}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Tanggal Pertemuan
                  </label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Waktu / Jam
                  </label>
                  <input
                    type="text"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Tempat Pertemuan
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Guru BK Penanggung Jawab
                  </label>
                  <input
                    type="text"
                    value={counselorName}
                    onChange={(e) => setCounselorName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    NIP Guru BK
                  </label>
                  <input
                    type="text"
                    value={counselorNip}
                    onChange={(e) => setCounselorNip(e.target.value)}
                    required
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Agenda & Tujuan Konseling
                </label>
                <textarea
                  rows={2}
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  required
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>

              {successMsg && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={issuing}
                className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {issuing ? 'Menerbitkan Surat...' : 'Terbitkan & Kirim Surat Panggilan Otomatis'}
              </button>
            </form>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-200">
              <h3 className="font-display font-semibold text-neutral-900 text-sm">
                Daftar Surat Panggilan Terbit ({summonLetters.length})
              </h3>
            </div>
            <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
              {summonLetters.map((letter) => (
                <div
                  key={letter.id}
                  onClick={() => setActiveLetterId(letter.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    previewLetter?.id === letter.id ? 'bg-orange-50/50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-neutral-900">
                        {letter.studentName} · {letter.className}
                      </p>
                      <p className="font-mono text-[11px] text-neutral-500 mt-0.5">
                        {letter.letterNumber}
                      </p>
                    </div>
                    <select
                      value={letter.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        onUpdateSummonStatus(letter.id, e.target.value as SummonStatus)
                      }
                      className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700"
                    >
                      <option value="Diterbitkan">Diterbitkan</option>
                      <option value="Diterima Orang Tua">Diterima Orang Tua</option>
                      <option value="Hadir Konseling">Hadir Konseling</option>
                      <option value="Dijadwalkan Ulang">Dijadwalkan Ulang</option>
                    </select>
                  </div>
                  <div className="mt-1.5 text-[11px] text-neutral-500 flex items-center gap-2">
                    <span>Jadwal: {formatIndonesianDate(letter.meetingDate)}</span>
                    <span>·</span>
                    <span>{letter.meetingTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7">
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden print-only-container">
            <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50/60 no-print">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <FileText className="w-4 h-4 text-orange-600" />
                <span>Pratinjau Resmi Surat Panggilan Orang Tua (Siap Cetak A4)</span>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!previewLetter}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Surat (PDF/A4)
              </button>
            </div>

            {!previewLetter ? (
              <div className="p-12 text-center text-sm text-neutral-500">
                Pilih atau terbitkan surat panggilan untuk melihat pratinjau dokumen resmi.
              </div>
            ) : (
              <div className="p-8 sm:p-10 text-neutral-900 text-[13px] leading-relaxed">
                <div className="flex items-center gap-4 pb-4 border-b-2 border-neutral-900">
                  <svg
                    viewBox="0 0 64 64"
                    className="w-16 h-16 shrink-0 text-neutral-900"
                    aria-hidden="true"
                  >
                    <path
                      d="M32 6 L54 14 V31 C54 45 44 54 32 58 C20 54 10 45 10 31 V14 Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M21 26 H43 M32 18 V44 M24 34 L32 42 L40 34"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="text-center flex-1">
                    <p className="text-xs font-semibold tracking-wide text-neutral-700">
                      PEMERINTAH PROVINSI DKI JAKARTA · DINAS PENDIDIKAN
                    </p>
                    <h3 className="font-display text-lg font-bold text-neutral-900 mt-0.5">
                      {monthlyConfig.schoolName.toUpperCase()}
                    </h3>
                    <p className="text-[11px] text-neutral-600">
                      {monthlyConfig.schoolAddress} · Telp. {monthlyConfig.schoolPhone}
                    </p>
                    <p className="text-[11px] text-neutral-600">
                      Unit Layanan Bimbingan dan Konseling (BK) & Tim Ketertiban Sekolah
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-between gap-4">
                  <table className="text-xs">
                    <tbody>
                      <tr>
                        <td className="pr-3 py-0.5 text-neutral-600">Nomor</td>
                        <td className="pr-2 py-0.5">:</td>
                        <td className="py-0.5 font-mono font-medium">
                          {previewLetter.letterNumber}
                        </td>
                      </tr>
                      <tr>
                        <td className="pr-3 py-0.5 text-neutral-600">Lampiran</td>
                        <td className="pr-2 py-0.5">:</td>
                        <td className="py-0.5">1 (Satu) Lembar Rekap Poin Disiplin</td>
                      </tr>
                      <tr>
                        <td className="pr-3 py-0.5 text-neutral-600">Perihal</td>
                        <td className="pr-2 py-0.5">:</td>
                        <td className="py-0.5 font-bold">
                          Panggilan Orang Tua / Wali Murid
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-xs text-neutral-700">
                    Jakarta, {formatIndonesianDateLong(previewLetter.issuedAt)}
                  </div>
                </div>

                <div className="mt-6 text-xs space-y-0.5">
                  <p>Kepada Yth.</p>
                  <p className="font-bold text-neutral-900">{previewLetter.parentName}</p>
                  <p>Orang Tua / Wali dari {previewLetter.studentName}</p>
                  <p className="text-neutral-600">{previewLetter.parentAddress}</p>
                </div>

                <div className="mt-5 space-y-3 text-justify">
                  <p>Dengan hormat,</p>
                  <p>
                    Sehubungan dengan hasil pemantauan sistem pembinaan disiplin dan catatan
                    perilaku siswa di {monthlyConfig.schoolName}, bersama ini kami mengharap
                    kehadiran Bapak/Ibu Orang Tua/Wali Murid dari peserta didik:
                  </p>

                  <div className="my-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="w-44 py-1 text-neutral-600">Nama Lengkap Siswa</td>
                          <td className="w-4 py-1">:</td>
                          <td className="py-1 font-semibold">{previewLetter.studentName}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-neutral-600">NISN / Kelas</td>
                          <td className="py-1">:</td>
                          <td className="py-1 font-mono">
                            {previewLetter.nisn} / {previewLetter.className}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-neutral-600">Akumulasi Poin Pelanggaran</td>
                          <td className="py-1">:</td>
                          <td className="py-1 font-mono font-bold text-rose-700">
                            {previewLetter.totalViolationPoints} Poin
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <p className="font-semibold text-xs text-neutral-800 mb-1">
                      Ringkasan Catatan Pelanggaran Terakhir:
                    </p>
                    <ul className="list-disc pl-5 text-xs space-y-0.5 text-neutral-700">
                      {previewLetter.recentViolationsSummary.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <p>
                    Pertemuan konsultasi pembinaan akan dilaksanakan pada jadwal berikut:
                  </p>

                  <div className="my-3 px-4 py-3 border border-neutral-300 rounded-lg">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="w-44 py-1 text-neutral-600">Hari / Tanggal</td>
                          <td className="w-4 py-1">:</td>
                          <td className="py-1 font-semibold">
                            {formatIndonesianDateLong(previewLetter.meetingDate)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-neutral-600">Waktu</td>
                          <td className="py-1">:</td>
                          <td className="py-1 font-semibold">{previewLetter.meetingTime}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-neutral-600">Tempat</td>
                          <td className="py-1">:</td>
                          <td className="py-1">{previewLetter.meetingLocation}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-neutral-600">Agenda Pertemuan</td>
                          <td className="py-1">:</td>
                          <td className="py-1">{previewLetter.agenda}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>
                    Mengingat pentingnya pembinaan karakter dan keberlangsungan pendidikan
                    putra/putri Bapak/Ibu, kami sangat mengharapkan kehadiran tepat pada
                    waktunya. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-2 gap-8 text-xs">
                  <div>
                    <p className="text-neutral-600">Mengetahui,</p>
                    <p className="font-semibold">Kepala {monthlyConfig.schoolName}</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{previewLetter.principalName}</p>
                    <p className="font-mono text-[11px] text-neutral-600">
                      NIP. {previewLetter.principalNip}
                    </p>
                  </div>
                  <div>
                    <p className="text-neutral-600">Hormat kami,</p>
                    <p className="font-semibold">Koordinator Guru BK</p>
                    <div className="h-16" />
                    <p className="font-bold underline">{previewLetter.counselorName}</p>
                    <p className="font-mono text-[11px] text-neutral-600">
                      NIP. {previewLetter.counselorNip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
