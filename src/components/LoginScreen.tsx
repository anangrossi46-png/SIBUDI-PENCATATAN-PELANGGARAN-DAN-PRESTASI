import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  BookOpen,
  FileText,
  KeyRound,
  Lock,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { AuthUser, StaffAccount } from '../types.ts';

interface LoginScreenProps {
  schoolName: string;
  staffConfigured: boolean;
  staffAccounts: StaffAccount[];
  onLoginSuccess: (token: string, user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  schoolName,
  staffConfigured,
  staffAccounts,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'staff' | 'parent'>('staff');

  // Staff login state
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffAccounts[0]?.id || ''
  );
  const [staffPasscode, setStaffPasscode] = useState<string>('');
  const [staffConfirmPasscode, setStaffConfirmPasscode] = useState<string>('');
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffLoading, setStaffLoading] = useState<boolean>(false);

  // Parent login state
  const [nisn, setNisn] = useState<string>('0084129003');
  const [parentPasscode, setParentPasscode] = useState<string>('');
  const [parentNeedsActivation, setParentNeedsActivation] = useState<boolean | null>(null);
  const [parentError, setParentError] = useState<string | null>(null);
  const [parentLoading, setParentLoading] = useState<boolean>(false);

  const activeStaffId = staffAccounts.some((s) => s.id === selectedStaffId)
    ? selectedStaffId
    : staffAccounts[0]?.id || '';

  const selectedStaff = staffAccounts.find((s) => s.id === activeStaffId);

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    if (!staffConfigured && staffPasscode !== staffConfirmPasscode) {
      setStaffError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setStaffLoading(true);
    try {
      const endpoint = staffConfigured
        ? '/api/auth/login-staff'
        : '/api/auth/claim-staff';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: activeStaffId,
          passcode: staffPasscode,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Gagal masuk ke sistem.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : 'Gagal memverifikasi akun.');
    } finally {
      setStaffLoading(false);
    }
  };

  const checkParentStatus = async (targetNisn: string) => {
    setParentError(null);
    const trimmed = targetNisn.trim();
    if (!trimmed) {
      setParentNeedsActivation(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/auth/parent-status?nisn=${encodeURIComponent(trimmed)}`
      );
      const data = (await res.json()) as { activated?: boolean; error?: string };
      if (!res.ok) {
        setParentNeedsActivation(null);
        setParentError(data.error || 'NISN siswa tidak ditemukan.');
        return;
      }
      setParentNeedsActivation(!data.activated);
    } catch {
      setParentError('Gagal memeriksa status NISN.');
    }
  };

  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParentError(null);
    setParentLoading(true);
    try {
      // Check activation status first if unknown
      let isActivation = parentNeedsActivation === true;
      if (parentNeedsActivation === null) {
        const checkRes = await fetch(
          `/api/auth/parent-status?nisn=${encodeURIComponent(nisn.trim())}`
        );
        const checkData = (await checkRes.json()) as {
          activated?: boolean;
          error?: string;
        };
        if (!checkRes.ok) {
          throw new Error(checkData.error || 'NISN siswa tidak ditemukan.');
        }
        isActivation = !checkData.activated;
        setParentNeedsActivation(isActivation);
      }

      const res = await fetch('/api/auth/login-parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nisn: nisn.trim(),
          passcode: parentPasscode,
          isActivation,
        }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok || !data.token || !data.user) {
        throw new Error(data.error || 'Gagal masuk ke portal orang tua.');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setParentError(err instanceof Error ? err.message : 'Autentikasi orang tua gagal.');
    } finally {
      setParentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-between">
      {/* Clean Single-Row Top Bar */}
      <header className="h-16 bg-white border-b border-neutral-200 px-6 lg:px-12 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-neutral-900">
            SIBUDI
          </span>
        </div>
        <div className="text-xs text-neutral-500 hidden sm:block whitespace-nowrap">
          {schoolName} · Sistem Pembinaan Disiplin & Prestasi Siswa
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Clean Editorial Role Overview */}
          <div className="lg:col-span-6 space-y-6 pt-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-orange-600 tracking-wide">
                Portal Terintegrasi Tata Tertib & Konseling Sekolah
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight leading-tight text-balance">
                Pemantauan Perilaku Siswa yang Tertib, Terukur, dan Transparan
              </h1>
              <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
                Akses sistem dibedakan sesuai kewenangan masing-masing peran di lingkungan{' '}
                {schoolName} untuk menjaga akurasi pencatatan poin dan kerahasiaan data peserta
                didik.
              </p>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
              <div className="p-4 flex items-start gap-3">
                <UserCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-neutral-900">Admin Pengelola</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Mengelola akun peran staf, data induk siswa, katalog poin tata tertib, dan identitas sekolah.
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <Scale className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-neutral-900">Tim Ketertiban</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Mencatat poin pelanggaran/prestasi, mengevaluasi status tindak lanjut sanksi, dan mengelola laporan bulanan.
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <BookOpen className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-neutral-900">Guru Mapel & Wali Kelas</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Memberikan poin langsung saat kegiatan belajar, memantau grafik kelas perwalian, dan mencetak rekap bulanan.
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <FileText className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-neutral-900">Guru BK</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Menangani kasus prioritas serta menerbitkan dan mencetak Surat Panggilan Orang Tua secara otomatis.
                  </p>
                </div>
              </div>
              <div className="p-4 flex items-start gap-3">
                <Bell className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-xs font-semibold text-neutral-900">Orang Tua / Wali Murid</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Menerima notifikasi perubahan poin signifikan serta pemberitahuan resmi surat panggilan dari sekolah.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card */}
          <div className="lg:col-span-6">
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-neutral-900">
                  Masuk ke SIBUDI
                </h2>
                <p className="text-xs text-neutral-500 mt-1">
                  Pilih kategori akses sesuai peran Anda di sekolah.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setMode('staff')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    mode === 'staff'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                  Staf & Guru Sekolah
                </button>
                <button
                  type="button"
                  onClick={() => setMode('parent')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    mode === 'parent'
                      ? 'bg-white text-neutral-900 shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-orange-600" />
                  Orang Tua / Wali
                </button>
              </div>

              {mode === 'staff' ? (
                <form onSubmit={handleStaffSubmit} className="space-y-4">
                  {!staffConfigured && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3.5 text-xs text-orange-900 space-y-1">
                      <div className="font-semibold">
                        Aktivasi Kata Sandi Staf Pertama Kali
                      </div>
                      <p className="text-orange-800 leading-relaxed">
                        Belum ada kata sandi staf tersimpan di server. Tetapkan kata sandi awal pilihan Anda untuk mengaktifkan login staf.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      Pilih Peran & Akun Staf
                    </label>
                    <select
                      value={activeStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                    >
                      {staffAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.roleLabel} — {acc.name}
                        </option>
                      ))}
                    </select>
                    {selectedStaff && (
                      <p className="mt-1.5 text-[11px] text-neutral-500">
                        Unit / Tugas: {selectedStaff.subjectOrUnit}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      {staffConfigured ? 'Kata Sandi Staf' : 'Buat Kata Sandi Staf Baru'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={staffPasscode}
                        onChange={(e) => setStaffPasscode(e.target.value)}
                        required
                        minLength={4}
                        placeholder="Minimal 4 karakter"
                        className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                      />
                    </div>
                  </div>

                  {!staffConfigured && (
                    <div>
                      <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                        Konfirmasi Kata Sandi Staf
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          value={staffConfirmPasscode}
                          onChange={(e) => setStaffConfirmPasscode(e.target.value)}
                          required
                          minLength={4}
                          placeholder="Ulangi kata sandi"
                          className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                        />
                      </div>
                    </div>
                  )}

                  {staffError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{staffError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={staffLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {staffLoading
                      ? 'Memverifikasi...'
                      : staffConfigured
                        ? 'Masuk sebagai Staf Sekolah'
                        : 'Aktifkan & Masuk ke Sistem'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleParentSubmit} className="space-y-4">
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-xs text-neutral-600 leading-relaxed">
                    Akses orang tua dikhususkan untuk menerima <strong>notifikasi perubahan poin signifikan</strong> dan <strong>pemberitahuan surat panggilan BK</strong> putra/putri Anda.
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-neutral-700">
                        NISN Peserta Didik
                      </label>
                      <button
                        type="button"
                        onClick={() => void checkParentStatus(nisn)}
                        className="text-[11px] font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Periksa Status NISN
                      </button>
                    </div>
                    <input
                      type="text"
                      value={nisn}
                      onChange={(e) => {
                        setNisn(e.target.value);
                        setParentNeedsActivation(null);
                      }}
                      required
                      placeholder="Contoh: 0084129003"
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                    />
                    <p className="mt-1.5 text-[11px] text-neutral-400 font-mono">
                      Contoh NISN terdaftar: 0084129003 · 0084129001 · 0084129002
                    </p>
                  </div>

                  {parentNeedsActivation === true && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-3 text-xs text-orange-900">
                      Akun orang tua untuk NISN ini belum pernah diaktifkan. Masukkan kata sandi baru pilihan Anda untuk mendaftarkan akses notifikasi.
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                      {parentNeedsActivation === true
                        ? 'Buat Kata Sandi Akses Orang Tua'
                        : 'Kata Sandi Akses Orang Tua'}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={parentPasscode}
                        onChange={(e) => setParentPasscode(e.target.value)}
                        required
                        minLength={4}
                        placeholder="Minimal 4 karakter"
                        className="w-full rounded-lg border border-neutral-200 pl-9 pr-3 py-2.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                      />
                    </div>
                  </div>

                  {parentError && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{parentError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={parentLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {parentLoading
                      ? 'Memverifikasi...'
                      : parentNeedsActivation === true
                        ? 'Aktifkan & Lihat Notifikasi Anak'
                        : 'Masuk ke Notifikasi Orang Tua'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
