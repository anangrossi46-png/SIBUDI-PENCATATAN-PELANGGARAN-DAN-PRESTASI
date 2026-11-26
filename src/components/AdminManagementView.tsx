import React, { useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  KeyRound,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import type {
  AuthUser,
  MonthlyReportConfig,
  PublicStudent,
  RecordType,
  RuleCatalogItem,
  SeverityLevel,
  StaffAccount,
  UserRole,
} from '../types.ts';

interface AdminManagementViewProps {
  user: AuthUser;
  staffAccounts: StaffAccount[];
  students: PublicStudent[];
  catalog: RuleCatalogItem[];
  monthlyConfig: MonthlyReportConfig;
  onAddStaff: (payload: {
    name: string;
    role: Exclude<UserRole, 'orang_tua'>;
    subjectOrUnit: string;
    assignedClass?: string;
  }) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onAddStudent: (payload: {
    nisn: string;
    name: string;
    className: string;
    homeroomTeacher: string;
    parentName: string;
    parentPhone: string;
    parentAddress: string;
  }) => Promise<void>;
  onDeleteStudent: (id: string) => Promise<void>;
  onResetParentAccess: (id: string) => Promise<void>;
  onAddCatalogRule: (payload: {
    code: string;
    type: RecordType;
    category: string;
    title: string;
    points: number;
    severity?: SeverityLevel;
    defaultPunishment: string;
  }) => Promise<void>;
  onDeleteCatalogRule: (id: string) => Promise<void>;
  onUpdateMonthlyConfig: (updates: Partial<MonthlyReportConfig>) => Promise<void>;
}

type AdminSection = 'staff' | 'students' | 'catalog' | 'school';

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  user,
  staffAccounts,
  students,
  catalog,
  monthlyConfig,
  onAddStaff,
  onDeleteStaff,
  onAddStudent,
  onDeleteStudent,
  onResetParentAccess,
  onAddCatalogRule,
  onDeleteCatalogRule,
  onUpdateMonthlyConfig,
}) => {
  const [section, setSection] = useState<AdminSection>('staff');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staff form
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] =
    useState<Exclude<UserRole, 'orang_tua'>>('guru_mapel');
  const [staffUnit, setStaffUnit] = useState('');
  const [staffClass, setStaffClass] = useState('X A');

  // Student form
  const [stuNisn, setStuNisn] = useState('');
  const [stuName, setStuName] = useState('');
  const [stuClass, setStuClass] = useState('X A');
  const [stuHomeroom, setStuHomeroom] = useState('Siti Aminah, M.Pd.');
  const [stuParentName, setStuParentName] = useState('');
  const [stuParentPhone, setStuParentPhone] = useState('');
  const [stuParentAddress, setStuParentAddress] = useState('');

  // Catalog form
  const [ruleCode, setRuleCode] = useState('');
  const [ruleType, setRuleType] = useState<RecordType>('violation');
  const [ruleCategory, setRuleCategory] = useState('Kedisiplinan Waktu');
  const [ruleTitle, setRuleTitle] = useState('');
  const [rulePoints, setRulePoints] = useState<number>(10);
  const [ruleSeverity, setRuleSeverity] = useState<SeverityLevel>('Ringan');
  const [rulePunishment, setRulePunishment] = useState('');

  // School profile form
  const [schoolName, setSchoolName] = useState(monthlyConfig.schoolName);
  const [schoolAddress, setSchoolAddress] = useState(monthlyConfig.schoolAddress);
  const [schoolPhone, setSchoolPhone] = useState(monthlyConfig.schoolPhone);
  const [autoDay, setAutoDay] = useState(monthlyConfig.autoDayOfMonth);

  const notify = (msg: string) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleErr = (err: unknown) => {
    setStatusMessage(null);
    setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan.');
  };

  return (
    <div className="space-y-6">
      {/* Admin Sub-Navigation */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-semibold text-neutral-900 text-base">
            Pusat Pengelolaan Aplikasi (Admin)
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Kelola akun peran staf, data induk siswa, katalog poin tata tertib, dan identitas sekolah
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-neutral-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSection('staff')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
              section === 'staff'
                ? 'bg-white text-orange-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Staf & Peran ({staffAccounts.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('students')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
              section === 'students'
                ? 'bg-white text-orange-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Data Siswa ({students.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('catalog')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
              section === 'catalog'
                ? 'bg-white text-orange-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Katalog Poin ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setSection('school')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
              section === 'school'
                ? 'bg-white text-orange-700 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Profil Sekolah
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* SECTION 1: STAFF & ROLES */}
      {section === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onAddStaff({
                  name: staffName,
                  role: staffRole,
                  subjectOrUnit: staffUnit,
                  assignedClass: staffRole === 'wali_kelas' ? staffClass : undefined,
                });
                setStaffName('');
                setStaffUnit('');
                notify('Akun peran staf baru berhasil ditambahkan.');
              } catch (err) {
                handleErr(err);
              }
            }}
            className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-4"
          >
            <h3 className="font-display font-semibold text-neutral-900 text-sm">
              Tambah Akun Pengguna Staf
            </h3>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Nama Lengkap & Gelar
              </label>
              <input
                type="text"
                required
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Misal: Drs. Hendro Wibowo"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Peran Hak Akses
              </label>
              <select
                value={staffRole}
                onChange={(e) =>
                  setStaffRole(e.target.value as Exclude<UserRole, 'orang_tua'>)
                }
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              >
                <option value="ketertiban">Tim Ketertiban</option>
                <option value="guru_mapel">Guru Mapel</option>
                <option value="wali_kelas">Wali Kelas</option>
                <option value="bk">Guru BK</option>
                <option value="admin">Admin Pengelola</option>
              </select>
            </div>

            {staffRole === 'wali_kelas' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Kelas Perwalian
                </label>
                <input
                  type="text"
                  value={staffClass}
                  onChange={(e) => setStaffClass(e.target.value)}
                  placeholder="Misal: X A, XI IPA 1"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Keterangan Unit / Mata Pelajaran
              </label>
              <input
                type="text"
                value={staffUnit}
                onChange={(e) => setStaffUnit(e.target.value)}
                placeholder="Misal: Guru Bahasa Indonesia"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambahkan Akun Staf
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="font-display font-semibold text-neutral-900 text-sm">
                Daftar Akun Staf & Hak Akses Aktif
              </h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {staffAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-neutral-50/70"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 truncate">
                      {acc.name}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      <span className="font-semibold text-orange-700">{acc.roleLabel}</span>
                      {' · '}
                      {acc.subjectOrUnit}
                      {acc.assignedClass ? ` (Kelas ${acc.assignedClass})` : ''}
                    </div>
                  </div>

                  {acc.id !== user.id ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await onDeleteStaff(acc.id);
                          notify(`Akun ${acc.name} telah dihapus.`);
                        } catch (err) {
                          handleErr(err);
                        }
                      }}
                      className="p-2 rounded-lg text-neutral-400 hover:text-rose-700 hover:bg-rose-50 min-h-[40px] min-w-[40px] flex items-center justify-center"
                      aria-label={`Hapus akun ${acc.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-medium">Aktif</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: STUDENTS & PARENT ACCESS RESET */}
      {section === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onAddStudent({
                  nisn: stuNisn,
                  name: stuName,
                  className: stuClass,
                  homeroomTeacher: stuHomeroom,
                  parentName: stuParentName,
                  parentPhone: stuParentPhone,
                  parentAddress: stuParentAddress,
                });
                setStuNisn('');
                setStuName('');
                setStuParentName('');
                setStuParentPhone('');
                setStuParentAddress('');
                notify('Data siswa baru berhasil ditambahkan.');
              } catch (err) {
                handleErr(err);
              }
            }}
            className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-3.5"
          >
            <h3 className="font-display font-semibold text-neutral-900 text-sm">
              Tambah Peserta Didik Baru
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  NISN
                </label>
                <input
                  type="text"
                  required
                  value={stuNisn}
                  onChange={(e) => setStuNisn(e.target.value)}
                  placeholder="0084129011"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Kelas
                </label>
                <input
                  type="text"
                  required
                  value={stuClass}
                  onChange={(e) => setStuClass(e.target.value)}
                  placeholder="X A"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Nama Lengkap Siswa
              </label>
              <input
                type="text"
                required
                value={stuName}
                onChange={(e) => setStuName(e.target.value)}
                placeholder="Nama lengkap peserta didik"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Wali Kelas
              </label>
              <input
                type="text"
                value={stuHomeroom}
                onChange={(e) => setStuHomeroom(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Nama Orang Tua / Wali
                </label>
                <input
                  type="text"
                  value={stuParentName}
                  onChange={(e) => setStuParentName(e.target.value)}
                  placeholder="Bapak/Ibu..."
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  No. Telepon Wali
                </label>
                <input
                  type="text"
                  value={stuParentPhone}
                  onChange={(e) => setStuParentPhone(e.target.value)}
                  placeholder="0812-..."
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Alamat Tempat Tinggal
              </label>
              <input
                type="text"
                value={stuParentAddress}
                onChange={(e) => setStuParentAddress(e.target.value)}
                placeholder="Alamat lengkap untuk surat panggilan"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Data Siswa
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="font-display font-semibold text-neutral-900 text-sm">
                Direktori Siswa & Reset Akses Orang Tua
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                    <th className="py-2.5 px-4">NISN & Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Orang Tua</th>
                    <th className="py-2.5 px-4 text-right">Kelola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-neutral-50/70">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900">{s.name}</div>
                        <div className="font-mono text-[11px] text-neutral-500">{s.nisn}</div>
                      </td>
                      <td className="py-3 px-3 text-neutral-700">{s.className}</td>
                      <td className="py-3 px-3 text-neutral-600">
                        <div>{s.parentName}</div>
                        <div className="text-[11px] text-neutral-400">{s.parentPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await onResetParentAccess(s.id);
                              notify(
                                `Akses kata sandi orang tua ${s.name} direset untuk aktivasi ulang.`
                              );
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 inline-flex items-center gap-1"
                            title="Reset kata sandi login orang tua"
                          >
                            <KeyRound className="w-3 h-3 text-orange-600" />
                            Reset Sandi Wali
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await onDeleteStudent(s.id);
                              notify(`Data siswa ${s.name} berhasil dihapus.`);
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-700 hover:bg-rose-50"
                            aria-label={`Hapus siswa ${s.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: RULE CATALOG */}
      {section === 'catalog' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await onAddCatalogRule({
                  code: ruleCode,
                  type: ruleType,
                  category: ruleCategory,
                  title: ruleTitle,
                  points: rulePoints,
                  severity: ruleType === 'violation' ? ruleSeverity : undefined,
                  defaultPunishment: rulePunishment,
                });
                setRuleCode('');
                setRuleTitle('');
                setRulePunishment('');
                notify('Aturan poin baru berhasil ditambahkan ke katalog tata tertib.');
              } catch (err) {
                handleErr(err);
              }
            }}
            className="lg:col-span-5 bg-white border border-neutral-200 rounded-xl p-5 space-y-3.5"
          >
            <h3 className="font-display font-semibold text-neutral-900 text-sm">
              Tambah Aturan Poin Tata Tertib / Prestasi
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Jenis Aturan
                </label>
                <select
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value as RecordType)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900"
                >
                  <option value="violation">Pelanggaran</option>
                  <option value="achievement">Prestasi</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Kode Aturan
                </label>
                <input
                  type="text"
                  required
                  value={ruleCode}
                  onChange={(e) => setRuleCode(e.target.value)}
                  placeholder="T-09 / P-06"
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  required
                  value={ruleCategory}
                  onChange={(e) => setRuleCategory(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Bobot Poin
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={rulePoints}
                  onChange={(e) => setRulePoints(Number(e.target.value))}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs font-mono text-neutral-900"
                />
              </div>
            </div>

            {ruleType === 'violation' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Tingkat Pelanggaran
                </label>
                <select
                  value={ruleSeverity}
                  onChange={(e) => setRuleSeverity(e.target.value as SeverityLevel)}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-900"
                >
                  <option value="Ringan">Ringan</option>
                  <option value="Sedang">Sedang</option>
                  <option value="Berat">Berat</option>
                  <option value="Sangat Berat">Sangat Berat</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Uraian Aturan / Jenis Prestasi
              </label>
              <input
                type="text"
                required
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                placeholder="Deskripsi pelanggaran atau prestasi"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Standar Rekomendasi Penindakan / Apresiasi
              </label>
              <textarea
                rows={2}
                value={rulePunishment}
                onChange={(e) => setRulePunishment(e.target.value)}
                placeholder="Tindakan edukatif atau bentuk penghargaan"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambahkan ke Katalog
            </button>
          </form>

          <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200">
              <h3 className="font-display font-semibold text-neutral-900 text-sm">
                Daftar Aturan Tata Tertib & Prestasi
              </h3>
            </div>
            <div className="divide-y divide-neutral-100 max-h-[520px] overflow-y-auto">
              {catalog.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 flex items-start justify-between gap-3 hover:bg-neutral-50/70"
                >
                  <div>
                    <div className="text-xs font-semibold text-neutral-900">
                      <span className="font-mono text-orange-700 mr-1.5">[{rule.code}]</span>
                      {rule.title}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {rule.type === 'violation' ? 'Pelanggaran' : 'Prestasi'} ·{' '}
                      {rule.category} ·{' '}
                      <strong
                        className={
                          rule.type === 'violation' ? 'text-rose-700' : 'text-emerald-700'
                        }
                      >
                        +{rule.points} poin
                      </strong>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1">{rule.defaultPunishment}</p>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteCatalogRule(rule.id);
                      notify(`Aturan ${rule.code} dihapus dari katalog.`);
                    }}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                    aria-label={`Hapus aturan ${rule.code}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SCHOOL PROFILE */}
      {section === 'school' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onUpdateMonthlyConfig({
              schoolName,
              schoolAddress,
              schoolPhone,
              autoDayOfMonth: autoDay,
            });
            notify('Profil sekolah dan jadwal laporan otomatis berhasil diperbarui.');
          }}
          className="bg-white border border-neutral-200 rounded-xl p-6 max-w-2xl space-y-4"
        >
          <h3 className="font-display font-semibold text-neutral-900 text-base">
            Identitas Resmi Sekolah & Pengaturan Sistem
          </h3>
          <p className="text-xs text-neutral-500">
            Informasi ini digunakan secara otomatis pada Kop Surat Panggilan Guru BK dan Laporan Bulanan resmi.
          </p>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Nama Sekolah
            </label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Alamat Sekolah
            </label>
            <input
              type="text"
              required
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Telepon Sekolah
              </label>
              <input
                type="text"
                required
                value={schoolPhone}
                onChange={(e) => setSchoolPhone(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Tanggal Cetak Otomatis Tiap Bulan
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={autoDay}
                onChange={(e) => setAutoDay(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
          >
            Simpan Pengaturan Sekolah
          </button>
        </form>
      )}
    </div>
  );
};
