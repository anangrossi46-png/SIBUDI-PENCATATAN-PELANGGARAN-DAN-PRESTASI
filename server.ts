import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  ActionStatus,
  AppDatabaseState,
  AuthUser,
  BehaviorRecord,
  ClientAppState,
  DisciplinaryAction,
  NotificationItem,
  PublicStudent,
  RecordType,
  RuleCatalogItem,
  StaffAccount,
  Student,
  SummonLetter,
  SummonStatus,
  UserRole,
} from './src/types.ts';
import {
  computeBehaviorIndex,
  computeRiskStatus,
  generatePunishmentRecommendation,
} from './src/utils/disciplineEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'sibudi-db.json');
const PORT = Number(process.env.PORT) || 3000;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface SessionEntry {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

const sessions = new Map<string, SessionEntry>();

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscode(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function verifyEnvPasscode(input: string, envSecret: string): boolean {
  const a = Buffer.from(input, 'utf-8');
  const b = Buffer.from(envSecret, 'utf-8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSession(user: AuthUser): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    token,
    user,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function getSessionFromToken(token?: string): SessionEntry | null {
  if (!token) return null;
  const entry = sessions.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return entry;
}

function extractBearerToken(req: express.Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function sanitizeStudent(student: Student): PublicStudent {
  const copy = { ...student };
  delete copy.parentPasswordHash;
  return copy;
}

function getRoleLabel(role: Exclude<UserRole, 'orang_tua'>): string {
  switch (role) {
    case 'admin':
      return 'Admin Pengelola';
    case 'ketertiban':
      return 'Tim Ketertiban';
    case 'bk':
      return 'Guru BK';
    case 'wali_kelas':
      return 'Wali Kelas';
    case 'guru_mapel':
      return 'Guru Mapel';
  }
}

function createDefaultStaffAccounts(): StaffAccount[] {
  return [
    {
      id: 'staff-admin',
      name: 'Administrator SIBUDI',
      role: 'admin',
      roleLabel: 'Admin Pengelola',
      subjectOrUnit: 'Pengelola Aplikasi, Hak Akses & Master Data Sekolah',
    },
    {
      id: 'staff-ketertiban',
      name: 'Pak Darmawan, S.Pd.',
      role: 'ketertiban',
      roleLabel: 'Tim Ketertiban',
      subjectOrUnit: 'Koordinator Tata Tertib & Disiplin Sekolah',
    },
    {
      id: 'staff-bk',
      name: 'Ibu Maya Sari, M.Psi.',
      role: 'bk',
      roleLabel: 'Guru BK',
      subjectOrUnit: 'Koordinator Bimbingan & Konseling',
    },
    {
      id: 'staff-walas-1',
      name: 'Dra. Ratna Kusuma',
      role: 'wali_kelas',
      roleLabel: 'Wali Kelas',
      subjectOrUnit: 'Wali Kelas XI IPA 1',
      assignedClass: 'XI IPA 1',
    },
    {
      id: 'staff-walas-2',
      name: 'Budi Santoso, S.Pd.',
      role: 'wali_kelas',
      roleLabel: 'Wali Kelas',
      subjectOrUnit: 'Wali Kelas XI IPS 2',
      assignedClass: 'XI IPS 2',
    },
    {
      id: 'staff-mapel-1',
      name: 'Ahmad Rifai, M.Pd.',
      role: 'guru_mapel',
      roleLabel: 'Guru Mapel',
      subjectOrUnit: 'Guru Mata Pelajaran Matematika',
    },
  ];
}

function createSeedData(): AppDatabaseState {
  const staffAccounts = createDefaultStaffAccounts();

  const catalog: RuleCatalogItem[] = [
    {
      id: 'rule-v1',
      code: 'T-01',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Terlambat masuk sekolah (> 15 menit)',
      points: 5,
      severity: 'Ringan',
      defaultPunishment:
        'Membaca & merangkum buku literasi di perpustakaan selama 30 menit sebelum masuk jam kedua',
      escalationGuidance:
        'Bila berulang 3x dalam sebulan, naik menjadi wajib lapor pagi ke Tim Ketertiban selama 1 minggu',
    },
    {
      id: 'rule-v2',
      code: 'T-02',
      type: 'violation',
      category: 'Kerapian & Atribut',
      title: 'Tidak memakai atribut seragam lengkap / melanggar ketentuan kerapian',
      points: 5,
      severity: 'Ringan',
      defaultPunishment:
        'Teguran lisan, perapian langsung di pos ketertiban, dan pencatatan buku saku disiplin',
      escalationGuidance:
        'Jika berulang, atribut yang tidak sesuai dititipkan ke Guru Piket untuk diambil orang tua',
    },
    {
      id: 'rule-v3',
      code: 'T-03',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Meninggalkan kelas / membolos jam pelajaran tanpa izin',
      points: 15,
      severity: 'Sedang',
      defaultPunishment:
        'Menyelesaikan tugas mata pelajaran yang ditinggalkan + tugas kebersihan lingkungan kelas',
      escalationGuidance:
        'Wali kelas menghubungi orang tua dan menjadwalkan pemantauan presensi harian',
    },
    {
      id: 'rule-v4',
      code: 'T-04',
      type: 'violation',
      category: 'Teknologi & Tata Tertib',
      title: 'Menggunakan ponsel saat ujian atau menyalahgunakan perangkat di jam KBM',
      points: 20,
      severity: 'Sedang',
      defaultPunishment:
        'Penitipan perangkat di ruang BK selama 3 hari kerja dan surat pernyataan siswa',
      escalationGuidance: 'Pengambilan perangkat wajib didampingi orang tua/wali murid',
    },
    {
      id: 'rule-v5',
      code: 'T-05',
      type: 'violation',
      category: 'Etika & Perilaku',
      title: 'Merusak fasilitas atau sarana prasarana sekolah dengan sengaja',
      points: 25,
      severity: 'Berat',
      defaultPunishment:
        'Perbaikan/penggantian sarana yang dirusak serta kerja bakti pemeliharaan fasilitas sekolah',
      escalationGuidance: 'Pemanggilan orang tua oleh Guru BK & Tim Ketertiban',
    },
    {
      id: 'rule-v6',
      code: 'T-06',
      type: 'violation',
      category: 'Etika & Perilaku',
      title: 'Melakukan perundungan (bullying) verbal/fisik atau intimidasi terhadap siswa lain',
      points: 35,
      severity: 'Berat',
      defaultPunishment:
        'Konseling intensif Guru BK, mediasi pemulihan korban, dan pembinaan karakter khusus 5 hari',
      escalationGuidance:
        'Penerbitan Surat Panggilan Orang Tua wajib dan perjanjian tertulis bermaterai',
    },
    {
      id: 'rule-v7',
      code: 'T-07',
      type: 'violation',
      category: 'Ketertiban Berat',
      title: 'Membawa rokok / vape atau benda terlarang ke lingkungan sekolah',
      points: 40,
      severity: 'Berat',
      defaultPunishment:
        'Penyitaan barang bukti, konseling kesehatan & perilaku oleh Guru BK, dan pembinaan wajib lapor',
      escalationGuidance: 'Panggilan Orang Tua (SP2) serta penandatanganan surat pernyataan',
    },
    {
      id: 'rule-v8',
      code: 'T-08',
      type: 'violation',
      category: 'Ketertiban Berat',
      title: 'Terlibat perkelahian atau tindakan kekerasan di dalam/luar area sekolah',
      points: 50,
      severity: 'Sangat Berat',
      defaultPunishment:
        'Skorsing pembinaan 3 hari dengan tugas akademik terbimbing dan sidang komite disiplin sekolah',
      escalationGuidance:
        'Konferensi Kasus wajib dengan Kepala Sekolah, Guru BK, dan Orang Tua (SP3)',
    },
    {
      id: 'rule-a1',
      code: 'P-01',
      type: 'achievement',
      category: 'Akademik & Riset',
      title: 'Juara Olimpiade / Lomba Karya Ilmiah Tingkat Kota atau Provinsi',
      points: 35,
      achievementTier: 'Provinsi',
      defaultPunishment: 'Piagam Penghargaan Kepala Sekolah & pencatatan pada Rapor Karakter',
      escalationGuidance: 'Direkomendasikan sebagai kandidat duta akademik sekolah',
    },
    {
      id: 'rule-a2',
      code: 'P-02',
      type: 'achievement',
      category: 'Non-Akademik & Seni',
      title: 'Meraih medali kompetisi olahraga, seni, atau Paskibra antar sekolah',
      points: 25,
      achievementTier: 'Kota/Kabupaten',
      defaultPunishment: 'Apresiasi upacara bendera & poin kredit prestasi',
      escalationGuidance: 'Pemberian insentif pembinaan ekstrakurikuler',
    },
    {
      id: 'rule-a3',
      code: 'P-03',
      type: 'achievement',
      category: 'Kepemimpinan & Sosial',
      title: 'Aktif sebagai pengurus inti OSIS/MPK atau panitia kegiatan sosial sekolah',
      points: 15,
      achievementTier: 'Sekolah',
      defaultPunishment: 'Sertifikat keaktifan organisasi siswa',
      escalationGuidance: 'Diperhitungkan dalam evaluasi nilai sikap akhir semester',
    },
    {
      id: 'rule-a4',
      code: 'P-04',
      type: 'achievement',
      category: 'Akademik & Riset',
      title: 'Nilai rata-rata kelas terbaik atau capaian proyek P5 unggulan',
      points: 20,
      achievementTier: 'Sekolah',
      defaultPunishment: 'Penghargaan Bintang Kelas Bulanan',
      escalationGuidance: 'Notifikasi apresiasi dikirimkan otomatis ke orang tua',
    },
    {
      id: 'rule-a5',
      code: 'P-05',
      type: 'achievement',
      category: 'Kepemimpinan & Sosial',
      title: 'Aksi keteladanan: membantu teman, kejujuran mengembalikan barang temuan',
      points: 10,
      achievementTier: 'Sekolah',
      defaultPunishment: 'Apresiasi lisan Wali Kelas dan kredit poin kebaikan',
      escalationGuidance: 'Dicatat sebagai teladan karakter positif',
    },
  ];

  const studentsSeed: Omit<
    Student,
    'violationPoints' | 'achievementPoints' | 'behaviorIndex' | 'riskStatus'
  >[] = [
    {
      id: 'stu-1',
      nisn: '0084129001',
      name: 'Rizky Pratama Wijaya',
      className: 'XI IPA 1',
      homeroomTeacher: 'Dra. Ratna Kusuma',
      parentName: 'Bapak Hendra Wijaya',
      parentPhone: '0812-8490-1122',
      parentEmail: 'hendra.wijaya@keluarga.id',
      parentAddress: 'Jl. Merpati No. 18, Kel. Sukamaju, Kec. Cilandak',
      lastUpdatedAt: '2026-11-24T09:15:00+07:00',
    },
    {
      id: 'stu-2',
      nisn: '0084129002',
      name: 'Siti Rahmawati Putri',
      className: 'XI IPA 1',
      homeroomTeacher: 'Dra. Ratna Kusuma',
      parentName: 'Ibu Dewi Lestari',
      parentPhone: '0813-7721-3340',
      parentEmail: 'dewi.lestari@keluarga.id',
      parentAddress: 'Perum Taman Melati Blok C4 No. 7',
      lastUpdatedAt: '2026-11-23T14:20:00+07:00',
    },
    {
      id: 'stu-3',
      nisn: '0084129003',
      name: 'Dimas Aditya Saputra',
      className: 'XI IPS 2',
      homeroomTeacher: 'Budi Santoso, S.Pd.',
      parentName: 'Bapak Agus Saputra',
      parentPhone: '0815-9902-4411',
      parentEmail: 'agus.saputra@keluarga.id',
      parentAddress: 'Jl. Kenanga Raya No. 42, Pondok Labu',
      lastUpdatedAt: '2026-11-25T08:05:00+07:00',
    },
    {
      id: 'stu-4',
      nisn: '0084129004',
      name: 'Nadia Azzahra',
      className: 'X A',
      homeroomTeacher: 'Siti Aminah, M.Pd.',
      parentName: 'Ibu Rina Marlina',
      parentPhone: '0812-6654-7809',
      parentEmail: 'rina.marlina@keluarga.id',
      parentAddress: 'Jl. Anggrek Bulan No. 9, Kebagusan',
      lastUpdatedAt: '2026-11-22T11:30:00+07:00',
    },
    {
      id: 'stu-5',
      nisn: '0084129005',
      name: 'Bagas Prakoso',
      className: 'XII IPA 1',
      homeroomTeacher: 'Drs. Bambang Hermawan',
      parentName: 'Bapak Joko Prakoso',
      parentPhone: '0811-2345-8890',
      parentEmail: 'joko.prakoso@keluarga.id',
      parentAddress: 'Jl. Cempaka Putih II No. 11',
      lastUpdatedAt: '2026-11-24T13:10:00+07:00',
    },
    {
      id: 'stu-6',
      nisn: '0084129006',
      name: 'Aulia Putri Maharani',
      className: 'X A',
      homeroomTeacher: 'Siti Aminah, M.Pd.',
      parentName: 'Bapak Surya Maharani',
      parentPhone: '0817-5543-9012',
      parentEmail: 'surya.m@keluarga.id',
      parentAddress: 'Komp. Griya Asri Blok B1 No. 15',
      lastUpdatedAt: '2026-11-20T10:00:00+07:00',
    },
    {
      id: 'stu-7',
      nisn: '0084129007',
      name: 'Fajar Ramadhan',
      className: 'XI IPS 2',
      homeroomTeacher: 'Budi Santoso, S.Pd.',
      parentName: 'Ibu Nurhayati',
      parentPhone: '0813-4412-6723',
      parentEmail: 'nurhayati.fam@keluarga.id',
      parentAddress: 'Jl. Mangga Besar No. 27, Jagakarsa',
      lastUpdatedAt: '2026-11-21T15:45:00+07:00',
    },
    {
      id: 'stu-8',
      nisn: '0084129008',
      name: 'Clarissa Putri Natasya',
      className: 'XII IPA 1',
      homeroomTeacher: 'Drs. Bambang Hermawan',
      parentName: 'Bapak Antonius Gunawan',
      parentPhone: '0812-3398-1104',
      parentEmail: 'antonius.g@keluarga.id',
      parentAddress: 'Jl. Dharmawangsa VI No. 5',
      lastUpdatedAt: '2026-11-19T09:40:00+07:00',
    },
    {
      id: 'stu-9',
      nisn: '0084129009',
      name: 'Galih Permana',
      className: 'X B',
      homeroomTeacher: 'Hendra Gunawan, S.Pd.',
      parentName: 'Bapak Taufik Permana',
      parentPhone: '0818-7761-2239',
      parentEmail: 'taufik.permana@keluarga.id',
      parentAddress: 'Jl. Kemang Timur No. 63',
      lastUpdatedAt: '2026-11-18T12:15:00+07:00',
    },
    {
      id: 'stu-10',
      nisn: '0084129010',
      name: 'Muhammad Ikhsan',
      className: 'X B',
      homeroomTeacher: 'Hendra Gunawan, S.Pd.',
      parentName: 'Ibu Fatimah Zahra',
      parentPhone: '0812-9011-5534',
      parentEmail: 'fatimah.z@keluarga.id',
      parentAddress: 'Jl. Ampera Raya No. 14',
      lastUpdatedAt: '2026-11-17T08:30:00+07:00',
    },
  ];

  const records: BehaviorRecord[] = [
    {
      id: 'rec-1',
      studentId: 'stu-2',
      ruleId: 'rule-a1',
      type: 'achievement',
      category: 'Akademik & Riset',
      title: 'Juara Olimpiade / Lomba Karya Ilmiah Tingkat Kota atau Provinsi',
      points: 35,
      achievementTier: 'Provinsi',
      recordedBy: 'Dra. Ratna Kusuma',
      recordedByRole: 'Wali Kelas',
      notes: 'Meraih Juara 2 Olimpiade Biologi Tingkat Provinsi.',
      location: 'Gedung Dinas Pendidikan Provinsi',
      occurredAt: '2026-09-14',
      createdAt: '2026-09-14T14:00:00+07:00',
    },
    {
      id: 'rec-2',
      studentId: 'stu-3',
      ruleId: 'rule-v1',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Terlambat masuk sekolah (> 15 menit)',
      points: 5,
      severity: 'Ringan',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Terlambat 25 menit saat jam pertama dimulai.',
      location: 'Gerbang Utama Sekolah',
      occurredAt: '2026-09-18',
      createdAt: '2026-09-18T07:30:00+07:00',
    },
    {
      id: 'rec-3',
      studentId: 'stu-1',
      ruleId: 'rule-v3',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Meninggalkan kelas / membolos jam pelajaran tanpa izin',
      points: 15,
      severity: 'Sedang',
      recordedBy: 'Ahmad Rifai, M.Pd.',
      recordedByRole: 'Guru Mapel',
      notes: 'Tidak kembali ke kelas setelah jam istirahat kedua.',
      location: 'Area Kantin Belakang',
      occurredAt: '2026-09-24',
      createdAt: '2026-09-24T13:15:00+07:00',
    },
    {
      id: 'rec-4',
      studentId: 'stu-4',
      ruleId: 'rule-a2',
      type: 'achievement',
      category: 'Non-Akademik & Seni',
      title: 'Meraih medali kompetisi olahraga, seni, atau Paskibra antar sekolah',
      points: 25,
      achievementTier: 'Kota/Kabupaten',
      recordedBy: 'Siti Aminah, M.Pd.',
      recordedByRole: 'Wali Kelas',
      notes: 'Juara 1 Lomba Tari Tradisional antar SMA.',
      location: 'Taman Budaya Kota',
      occurredAt: '2026-09-28',
      createdAt: '2026-09-28T16:00:00+07:00',
    },
    {
      id: 'rec-5',
      studentId: 'stu-3',
      ruleId: 'rule-v3',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Meninggalkan kelas / membolos jam pelajaran tanpa izin',
      points: 15,
      severity: 'Sedang',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Kedapatan berada di luar area kelas saat jam pelajaran Ekonomi.',
      location: 'Lapangan Parkir Siswa',
      occurredAt: '2026-10-08',
      createdAt: '2026-10-08T10:20:00+07:00',
    },
    {
      id: 'rec-6',
      studentId: 'stu-1',
      ruleId: 'rule-v4',
      type: 'violation',
      category: 'Teknologi & Tata Tertib',
      title: 'Menggunakan ponsel saat ujian atau menyalahgunakan perangkat di jam KBM',
      points: 20,
      severity: 'Sedang',
      recordedBy: 'Dra. Ratna Kusuma',
      recordedByRole: 'Wali Kelas',
      notes: 'Membuka aplikasi pesan di ponsel saat ulangan harian berlangsung.',
      location: 'Ruang XI IPA 1',
      occurredAt: '2026-10-15',
      createdAt: '2026-10-15T09:45:00+07:00',
    },
    {
      id: 'rec-7',
      studentId: 'stu-5',
      ruleId: 'rule-v5',
      type: 'violation',
      category: 'Etika & Perilaku',
      title: 'Merusak fasilitas atau sarana prasarana sekolah dengan sengaja',
      points: 25,
      severity: 'Berat',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Mencoret dan merusak papan mading koridor lantai 2.',
      location: 'Koridor Lantai 2',
      occurredAt: '2026-10-19',
      createdAt: '2026-10-19T14:10:00+07:00',
    },
    {
      id: 'rec-8',
      studentId: 'stu-8',
      ruleId: 'rule-a1',
      type: 'achievement',
      category: 'Akademik & Riset',
      title: 'Juara Olimpiade / Lomba Karya Ilmiah Tingkat Kota atau Provinsi',
      points: 35,
      achievementTier: 'Provinsi',
      recordedBy: 'Drs. Bambang Hermawan',
      recordedByRole: 'Wali Kelas',
      notes: 'Finalis & Medali Perak Lomba Karya Ilmiah Remaja.',
      location: 'Universitas Negeri Terpadu',
      occurredAt: '2026-10-23',
      createdAt: '2026-10-23T15:30:00+07:00',
    },
    {
      id: 'rec-9',
      studentId: 'stu-6',
      ruleId: 'rule-a3',
      type: 'achievement',
      category: 'Kepemimpinan & Sosial',
      title: 'Aktif sebagai pengurus inti OSIS/MPK atau panitia kegiatan sosial sekolah',
      points: 15,
      achievementTier: 'Sekolah',
      recordedBy: 'Siti Aminah, M.Pd.',
      recordedByRole: 'Wali Kelas',
      notes: 'Ketua pelaksana bakti sosial Hari Sumpah Pemuda.',
      location: 'Aula Sekolah',
      occurredAt: '2026-10-28',
      createdAt: '2026-10-28T12:00:00+07:00',
    },
    {
      id: 'rec-10',
      studentId: 'stu-7',
      ruleId: 'rule-v2',
      type: 'violation',
      category: 'Kerapian & Atribut',
      title: 'Tidak memakai atribut seragam lengkap / melanggar ketentuan kerapian',
      points: 5,
      severity: 'Ringan',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Tidak mengenakan dasi dan ikat pinggang standar sekolah saat apel pagi.',
      location: 'Lapangan Upacara',
      occurredAt: '2026-11-04',
      createdAt: '2026-11-04T07:15:00+07:00',
    },
    {
      id: 'rec-11',
      studentId: 'stu-9',
      ruleId: 'rule-v3',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Meninggalkan kelas / membolos jam pelajaran tanpa izin',
      points: 15,
      severity: 'Sedang',
      recordedBy: 'Ahmad Rifai, M.Pd.',
      recordedByRole: 'Guru Mapel',
      notes: 'Tidak mengikuti pelajaran Matematika jam ke-5 dan ke-6.',
      location: 'Gedung Kelas X',
      occurredAt: '2026-11-09',
      createdAt: '2026-11-09T11:40:00+07:00',
    },
    {
      id: 'rec-12',
      studentId: 'stu-2',
      ruleId: 'rule-a4',
      type: 'achievement',
      category: 'Akademik & Riset',
      title: 'Nilai rata-rata kelas terbaik atau capaian proyek P5 unggulan',
      points: 20,
      achievementTier: 'Sekolah',
      recordedBy: 'Dra. Ratna Kusuma',
      recordedByRole: 'Wali Kelas',
      notes: 'Presentasi proyek inovasi energi terbarukan terbaik tingkat kelas XI.',
      location: 'Aula Utama',
      occurredAt: '2026-11-12',
      createdAt: '2026-11-12T10:15:00+07:00',
    },
    {
      id: 'rec-13',
      studentId: 'stu-3',
      ruleId: 'rule-v7',
      type: 'violation',
      category: 'Ketertiban Berat',
      title: 'Membawa rokok / vape atau benda terlarang ke lingkungan sekolah',
      points: 40,
      severity: 'Berat',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Ditemukan membawa perangkat vape saat razia ketertiban rutin.',
      location: 'Toilet Putra Gedung B',
      occurredAt: '2026-11-18',
      createdAt: '2026-11-18T10:30:00+07:00',
    },
    {
      id: 'rec-14',
      studentId: 'stu-1',
      ruleId: 'rule-v6',
      type: 'violation',
      category: 'Etika & Perilaku',
      title: 'Melakukan perundungan (bullying) verbal/fisik atau intimidasi terhadap siswa lain',
      points: 35,
      severity: 'Berat',
      recordedBy: 'Ibu Maya Sari, M.Psi.',
      recordedByRole: 'Guru BK',
      notes: 'Melakukan intimidasi verbal terhadap adik kelas di koridor kantin.',
      location: 'Kantin Sekolah',
      occurredAt: '2026-11-21',
      createdAt: '2026-11-21T12:25:00+07:00',
    },
    {
      id: 'rec-15',
      studentId: 'stu-4',
      ruleId: 'rule-a5',
      type: 'achievement',
      category: 'Kepemimpinan & Sosial',
      title: 'Aksi keteladanan: membantu teman, kejujuran mengembalikan barang temuan',
      points: 10,
      achievementTier: 'Sekolah',
      recordedBy: 'Siti Aminah, M.Pd.',
      recordedByRole: 'Wali Kelas',
      notes: 'Menemukan dan mengembalikan dompet milik guru di ruang tata usaha.',
      location: 'Ruang Tata Usaha',
      occurredAt: '2026-11-22',
      createdAt: '2026-11-22T11:30:00+07:00',
    },
    {
      id: 'rec-16',
      studentId: 'stu-3',
      ruleId: 'rule-v4',
      type: 'violation',
      category: 'Teknologi & Tata Tertib',
      title: 'Menggunakan ponsel saat ujian atau menyalahgunakan perangkat di jam KBM',
      points: 20,
      severity: 'Sedang',
      recordedBy: 'Budi Santoso, S.Pd.',
      recordedByRole: 'Wali Kelas',
      notes: 'Bermain gim daring di kelas saat jam pelajaran berlangsung.',
      location: 'Ruang XI IPS 2',
      occurredAt: '2026-11-25',
      createdAt: '2026-11-25T08:05:00+07:00',
    },
    {
      id: 'rec-17',
      studentId: 'stu-10',
      ruleId: 'rule-a3',
      type: 'achievement',
      category: 'Kepemimpinan & Sosial',
      title: 'Aktif sebagai pengurus inti OSIS/MPK atau panitia kegiatan sosial sekolah',
      points: 15,
      achievementTier: 'Sekolah',
      recordedBy: 'Ahmad Rifai, M.Pd.',
      recordedByRole: 'Guru Mapel',
      notes: 'Koordinator tim kebersihan dan penghijauan kelas X.',
      location: 'Taman Sekolah',
      occurredAt: '2026-11-17',
      createdAt: '2026-11-17T08:30:00+07:00',
    },
    {
      id: 'rec-18',
      studentId: 'stu-5',
      ruleId: 'rule-v1',
      type: 'violation',
      category: 'Kedisiplinan Waktu',
      title: 'Terlambat masuk sekolah (> 15 menit)',
      points: 5,
      severity: 'Ringan',
      recordedBy: 'Pak Darmawan, S.Pd.',
      recordedByRole: 'Tim Ketertiban',
      notes: 'Terlambat mengikuti apel pagi hari Senin.',
      location: 'Gerbang Utama',
      occurredAt: '2026-11-24',
      createdAt: '2026-11-24T07:20:00+07:00',
    },
  ];

  const students: Student[] = studentsSeed.map((s) => {
    const stuRecords = records.filter((r) => r.studentId === s.id);
    const vPts = stuRecords
      .filter((r) => r.type === 'violation')
      .reduce((sum, r) => sum + r.points, 0);
    const aPts = stuRecords
      .filter((r) => r.type === 'achievement')
      .reduce((sum, r) => sum + r.points, 0);
    return {
      ...s,
      violationPoints: vPts,
      achievementPoints: aPts,
      behaviorIndex: computeBehaviorIndex(vPts, aPts),
      riskStatus: computeRiskStatus(vPts, aPts),
    };
  });

  const disciplinaryActions: DisciplinaryAction[] = [
    {
      id: 'act-1',
      recordId: 'rec-13',
      studentId: 'stu-3',
      violationTitle: 'Membawa rokok / vape atau benda terlarang ke lingkungan sekolah',
      violationPoints: 40,
      cumulativeViolationPoints: 60,
      recommendedAction:
        'Penyitaan barang bukti, konseling kesehatan & perilaku oleh Guru BK, dan pembinaan wajib lapor. Wajib menerbitkan Surat Panggilan Orang Tua ke ruang BK.',
      sanctionLevel: 'SP2 / Panggilan Orang Tua Wajib',
      assignedUnit: 'Guru BK',
      status: 'Sedang Dijalani',
      evaluationNotes:
        'Barang bukti sudah diamankan oleh Tim Ketertiban. Menunggu kehadiran orang tua sesuai surat panggilan.',
      dueDate: '2026-11-28',
      createdAt: '2026-11-18T10:35:00+07:00',
      updatedAt: '2026-11-19T09:00:00+07:00',
    },
    {
      id: 'act-2',
      recordId: 'rec-14',
      studentId: 'stu-1',
      violationTitle:
        'Melakukan perundungan (bullying) verbal/fisik atau intimidasi terhadap siswa lain',
      violationPoints: 35,
      cumulativeViolationPoints: 70,
      recommendedAction:
        'Konseling intensif Guru BK, mediasi pemulihan korban, dan pembinaan karakter khusus 5 hari. Wajib menerbitkan Surat Panggilan Orang Tua ke ruang BK.',
      sanctionLevel: 'SP2 / Panggilan Orang Tua Wajib',
      assignedUnit: 'Guru BK',
      status: 'Menunggu Tindak Lanjut',
      evaluationNotes:
        'Perlu penjadwalan panggilan orang tua oleh Guru BK sesegera mungkin.',
      dueDate: '2026-11-27',
      createdAt: '2026-11-21T12:30:00+07:00',
      updatedAt: '2026-11-21T12:30:00+07:00',
    },
    {
      id: 'act-3',
      recordId: 'rec-16',
      studentId: 'stu-3',
      violationTitle:
        'Menggunakan ponsel saat ujian atau menyalahgunakan perangkat di jam KBM',
      violationPoints: 20,
      cumulativeViolationPoints: 80,
      recommendedAction:
        'Penitipan perangkat di ruang BK selama 3 hari kerja dan surat pernyataan siswa. Lanjutkan dengan Konferensi Kasus bersama Kepala Sekolah, Guru BK, dan Orang Tua serta penyusunan surat perjanjian bermaterai.',
      sanctionLevel: 'SP3 / Konferensi Kasus & Skorsing Pembinaan',
      assignedUnit: 'Guru BK',
      status: 'Menunggu Tindak Lanjut',
      evaluationNotes:
        'Poin pelanggaran melewati ambang batas SP3 (80 poin). Diperlukan evaluasi komite disiplin.',
      dueDate: '2026-11-26',
      createdAt: '2026-11-25T08:06:00+07:00',
      updatedAt: '2026-11-25T08:06:00+07:00',
    },
    {
      id: 'act-4',
      recordId: 'rec-7',
      studentId: 'stu-5',
      violationTitle: 'Merusak fasilitas atau sarana prasarana sekolah dengan sengaja',
      violationPoints: 25,
      cumulativeViolationPoints: 25,
      recommendedAction:
        'Perbaikan/penggantian sarana yang dirusak serta kerja bakti pemeliharaan fasilitas sekolah. Terbitkan SP1 & wajib lapor Tim Ketertiban.',
      sanctionLevel: 'SP1 / Pembinaan Terstruktur Ketertiban',
      assignedUnit: 'Tim Ketertiban',
      status: 'Selesai Dibina',
      evaluationNotes:
        'Siswa telah memperbaiki papan mading bersama tim sarana sekolah dan menandatangani komitmen perbaikan.',
      dueDate: '2026-10-26',
      createdAt: '2026-10-19T14:15:00+07:00',
      updatedAt: '2026-10-25T15:00:00+07:00',
    },
    {
      id: 'act-5',
      recordId: 'rec-11',
      studentId: 'stu-9',
      violationTitle: 'Meninggalkan kelas / membolos jam pelajaran tanpa izin',
      violationPoints: 15,
      cumulativeViolationPoints: 15,
      recommendedAction:
        'Menyelesaikan tugas mata pelajaran yang ditinggalkan + tugas kebersihan lingkungan kelas. Lakukan konseling singkat oleh Wali Kelas.',
      sanctionLevel: 'Pembinaan Edukatif Ringan',
      assignedUnit: 'Wali Kelas',
      status: 'Sedang Dijalani',
      evaluationNotes: 'Wali kelas memantau presensi harian selama 1 pekan.',
      dueDate: '2026-11-29',
      createdAt: '2026-11-09T11:45:00+07:00',
      updatedAt: '2026-11-11T09:10:00+07:00',
    },
  ];

  const summonLetters: SummonLetter[] = [
    {
      id: 'let-1',
      letterNumber: '421.3/108/BK-SMAN1/XI/2026',
      studentId: 'stu-3',
      studentName: 'Dimas Aditya Saputra',
      nisn: '0084129003',
      className: 'XI IPS 2',
      parentName: 'Bapak Agus Saputra',
      parentAddress: 'Jl. Kenanga Raya No. 42, Pondok Labu',
      totalViolationPoints: 80,
      recentViolationsSummary: [
        'Membawa rokok / vape atau benda terlarang ke lingkungan sekolah (+40 poin)',
        'Menggunakan ponsel saat ujian atau menyalahgunakan perangkat di jam KBM (+20 poin)',
        'Meninggalkan kelas / membolos jam pelajaran tanpa izin (+15 poin)',
      ],
      agenda:
        'Konseling pembinaan disiplin lanjutan (SP3) dan penandatanganan kesepakatan pendampingan bersama orang tua.',
      meetingDate: '2026-11-27',
      meetingTime: '09:00 WIB',
      meetingLocation: 'Ruang Bimbingan & Konseling (BK) Lt. 1',
      counselorName: 'Ibu Maya Sari, M.Psi.',
      counselorNip: '19860412 201101 2 008',
      principalName: 'Drs. H. Ahmad Suhendra, M.Pd.',
      principalNip: '19690815 199512 1 003',
      status: 'Diterbitkan',
      issuedAt: '2026-11-25T08:15:00+07:00',
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      studentId: 'stu-3',
      studentName: 'Dimas Aditya Saputra',
      className: 'XI IPS 2',
      type: 'threshold_crossed',
      severity: 'critical',
      title: 'Ambang Batas Kritis SP3 Terlampaui (80 Poin)',
      message:
        'Penambahan +20 poin pelanggaran menyebabkan akumulasi poin Dimas Aditya Saputra mencapai 80 poin. Surat Panggilan Orang Tua telah diterbitkan.',
      pointDelta: 20,
      recipients: ['Guru BK', 'Tim Ketertiban', 'Wali Kelas', 'Orang Tua'],
      isRead: false,
      createdAt: '2026-11-25T08:06:00+07:00',
    },
    {
      id: 'notif-2',
      studentId: 'stu-1',
      studentName: 'Rizky Pratama Wijaya',
      className: 'XI IPA 1',
      type: 'point_spike',
      severity: 'critical',
      title: 'Lonjakan Poin Signifikan (+35 Poin Pelanggaran)',
      message:
        'Rizky Pratama Wijaya tercatat melakukan pelanggaran berat (+35 poin), total akumulasi kini 70 poin (Status: Panggilan Orang Tua / SP2).',
      pointDelta: 35,
      recipients: ['Guru BK', 'Wali Kelas', 'Orang Tua'],
      isRead: false,
      createdAt: '2026-11-21T12:25:00+07:00',
    },
    {
      id: 'notif-3',
      studentId: 'stu-2',
      studentName: 'Siti Rahmawati Putri',
      className: 'XI IPA 1',
      type: 'achievement_milestone',
      severity: 'positive',
      title: 'Capaian Prestasi Signifikan (+20 Poin Prestasi)',
      message:
        'Siti Rahmawati Putri memperoleh +20 poin prestasi akademik sehingga total kredit prestasi mencapai 55 poin (Predikat: Teladan).',
      pointDelta: 20,
      recipients: ['Wali Kelas', 'Orang Tua'],
      isRead: false,
      createdAt: '2026-11-12T10:15:00+07:00',
    },
    {
      id: 'notif-4',
      studentId: 'stu-3',
      studentName: 'Dimas Aditya Saputra',
      className: 'XI IPS 2',
      type: 'summon_issued',
      severity: 'warning',
      title: 'Surat Panggilan Orang Tua Resmi Diterbitkan',
      message:
        'Guru BK menerbitkan surat nomor 421.3/108/BK-SMAN1/XI/2026 untuk pertemuan konseling pada 27 Nov 2026 pukul 09:00 WIB.',
      pointDelta: 0,
      recipients: ['Orang Tua', 'Wali Kelas'],
      isRead: false,
      createdAt: '2026-11-25T08:15:00+07:00',
    },
  ];

  return {
    staffAccounts,
    students,
    catalog,
    records,
    disciplinaryActions,
    notifications,
    summonLetters,
    monthlyConfig: {
      autoGenerateEnabled: true,
      autoDayOfMonth: 28,
      includeParentDigest: true,
      schoolName: 'SMA Negeri 1 Harapan Bangsa',
      schoolAddress: 'Jl. Pendidikan Raya No. 1, Jakarta Selatan 12550',
      schoolPhone: '(021) 7804-1290',
      lastAutoGeneratedMonth: '2026-10',
    },
    authConfig: {},
  };
}

function loadDatabase(): AppDatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = createSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as AppDatabaseState & {
      students: (Student & { parentAccessCode?: string })[];
    };
    let changed = false;
    if (!parsed.staffAccounts || parsed.staffAccounts.length === 0) {
      parsed.staffAccounts = createDefaultStaffAccounts();
      changed = true;
    } else if (!parsed.staffAccounts.some((s) => s.role === 'admin')) {
      parsed.staffAccounts.unshift({
        id: 'staff-admin',
        name: 'Administrator SIBUDI',
        role: 'admin',
        roleLabel: 'Admin Pengelola',
        subjectOrUnit: 'Pengelola Aplikasi, Hak Akses & Master Data Sekolah',
      });
      changed = true;
    }
    if (!parsed.authConfig) {
      parsed.authConfig = {};
      changed = true;
    }
    for (const st of parsed.students) {
      if ('parentAccessCode' in st) {
        delete st.parentAccessCode;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  } catch {
    const fallback = createSeedData();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveDatabase(db: AppDatabaseState): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function recalculateStudent(db: AppDatabaseState, studentId: string): Student | undefined {
  const student = db.students.find((s) => s.id === studentId);
  if (!student) return undefined;

  const stuRecords = db.records.filter((r) => r.studentId === studentId);
  const vPts = stuRecords
    .filter((r) => r.type === 'violation')
    .reduce((sum, r) => sum + r.points, 0);
  const aPts = stuRecords
    .filter((r) => r.type === 'achievement')
    .reduce((sum, r) => sum + r.points, 0);

  student.violationPoints = vPts;
  student.achievementPoints = aPts;
  student.behaviorIndex = computeBehaviorIndex(vPts, aPts);
  student.riskStatus = computeRiskStatus(vPts, aPts);
  student.lastUpdatedAt = new Date().toISOString();
  return student;
}

function buildScopedState(db: AppDatabaseState, user: AuthUser): ClientAppState {
  if (user.role === 'orang_tua') {
    const child = db.students.find((s) => s.id === user.studentId);
    const childNotifs = db.notifications.filter((n) => n.studentId === user.studentId);
    const childLetters = db.summonLetters.filter((l) => l.studentId === user.studentId);
    return {
      staffAccounts: [],
      students: child ? [sanitizeStudent(child)] : [],
      catalog: [],
      records: [],
      disciplinaryActions: [],
      notifications: childNotifs,
      summonLetters: childLetters,
      monthlyConfig: {
        ...db.monthlyConfig,
      },
    };
  }

  return {
    staffAccounts: db.staffAccounts,
    students: db.students.map(sanitizeStudent),
    catalog: db.catalog,
    records: db.records,
    disciplinaryActions: db.disciplinaryActions,
    notifications: db.notifications,
    summonLetters: db.summonLetters,
    monthlyConfig: db.monthlyConfig,
  };
}

interface SseClient {
  res: express.Response;
  user: AuthUser;
}

const sseClients = new Set<SseClient>();

function broadcastState(
  event: string,
  payload: {
    studentId?: string;
    reason: string;
    notifications?: NotificationItem[];
    notif?: NotificationItem;
  }
): void {
  for (const client of sseClients) {
    if (client.user.role === 'orang_tua') {
      if (payload.studentId && payload.studentId !== client.user.studentId) {
        continue;
      }
      const scopedPayload = {
        reason: payload.reason,
        notifications: (payload.notifications || []).filter(
          (n) => n.studentId === client.user.studentId
        ),
        notif:
          payload.notif && payload.notif.studentId === client.user.studentId
            ? payload.notif
            : undefined,
      };
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(scopedPayload)}\n\n`);
    } else {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  let db = loadDatabase();

  const isStaffPasscodeConfigured = (): boolean => {
    const envPass = process.env.STAFF_ACCESS_PASSCODE?.trim();
    return Boolean(envPass || db.authConfig?.staffPasscodeHash);
  };

  const requireAuth = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const token = extractBearerToken(req);
    const session = getSessionFromToken(token);
    if (!session) {
      res
        .status(401)
        .json({ error: 'Sesi tidak valid atau telah berakhir. Silakan masuk kembali.' });
      return;
    }
    (req as express.Request & { authUser: AuthUser }).authUser = session.user;
    next();
  };

  const requireRoles = (allowed: UserRole[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const user = (req as express.Request & { authUser?: AuthUser }).authUser;
      if (!user || !allowed.includes(user.role)) {
        res.status(403).json({
          error: 'Akses ditolak. Peran Anda tidak memiliki izin untuk tindakan ini.',
        });
        return;
      }
      next();
    };
  };

  app.get('/api/auth/status', (_req, res) => {
    res.json({
      staffConfigured: isStaffPasscodeConfigured(),
      staffAccounts: db.staffAccounts,
      schoolName: db.monthlyConfig.schoolName,
    });
  });

  app.get('/api/auth/parent-status', (req, res) => {
    const nisn = String(req.query.nisn || '').trim();
    if (!nisn) {
      res.status(400).json({ error: 'NISN wajib diisi.' });
      return;
    }
    const student = db.students.find((s) => s.nisn === nisn);
    if (!student) {
      res.status(404).json({ error: 'NISN siswa tidak ditemukan.' });
      return;
    }
    res.json({
      exists: true,
      activated: Boolean(student.parentPasswordHash),
    });
  });

  app.post('/api/auth/claim-staff', (req, res) => {
    if (isStaffPasscodeConfigured()) {
      res.status(409).json({
        error: 'Kata sandi staf sudah dikonfigurasi. Gunakan menu masuk standar.',
      });
      return;
    }
    const { staffId, passcode } = req.body as { staffId?: string; passcode?: string };
    const staff = db.staffAccounts.find((s) => s.id === staffId);
    if (!staff) {
      res.status(400).json({ error: 'Akun staf tidak valid.' });
      return;
    }
    if (!passcode || passcode.trim().length < 4) {
      res.status(400).json({ error: 'Kata sandi minimal 4 karakter.' });
      return;
    }

    db.authConfig = {
      ...db.authConfig,
      staffPasscodeHash: hashPasscode(passcode.trim()),
    };
    saveDatabase(db);

    const authUser: AuthUser = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      roleLabel: staff.roleLabel,
      assignedClass: staff.assignedClass,
    };
    const token = createSession(authUser);
    res.json({ token, user: authUser });
  });

  app.post('/api/auth/login-staff', (req, res) => {
    const { staffId, passcode } = req.body as { staffId?: string; passcode?: string };
    const staff = db.staffAccounts.find((s) => s.id === staffId);
    if (!staff) {
      res.status(400).json({ error: 'Pilih akun peran staf yang valid.' });
      return;
    }
    if (!passcode) {
      res.status(400).json({ error: 'Kata sandi wajib diisi.' });
      return;
    }

    const envSecret = process.env.STAFF_ACCESS_PASSCODE?.trim();
    let valid = false;
    if (envSecret) {
      valid = verifyEnvPasscode(passcode.trim(), envSecret);
    } else if (db.authConfig?.staffPasscodeHash) {
      valid = verifyPasscode(passcode.trim(), db.authConfig.staffPasscodeHash);
    } else {
      res.status(409).json({
        error: 'Kata sandi staf belum diaktifkan. Silakan lakukan aktivasi awal.',
      });
      return;
    }

    if (!valid) {
      res.status(401).json({ error: 'Kata sandi tidak sesuai.' });
      return;
    }

    const authUser: AuthUser = {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      roleLabel: staff.roleLabel,
      assignedClass: staff.assignedClass,
    };
    const token = createSession(authUser);
    res.json({ token, user: authUser });
  });

  app.post('/api/auth/login-parent', (req, res) => {
    const { nisn, passcode, isActivation } = req.body as {
      nisn?: string;
      passcode?: string;
      isActivation?: boolean;
    };

    const student = db.students.find((s) => s.nisn === nisn?.trim());
    if (!student) {
      res.status(401).json({ error: 'NISN siswa tidak ditemukan.' });
      return;
    }
    if (!passcode || passcode.trim().length < 4) {
      res.status(400).json({ error: 'Kata sandi akses wali minimal 4 karakter.' });
      return;
    }

    if (!student.parentPasswordHash) {
      if (!isActivation) {
        res.status(409).json({
          error:
            'Akun orang tua untuk NISN ini belum diaktifkan. Silakan buat kata sandi baru.',
        });
        return;
      }
      student.parentPasswordHash = hashPasscode(passcode.trim());
      saveDatabase(db);
    } else {
      const ok = verifyPasscode(passcode.trim(), student.parentPasswordHash);
      if (!ok) {
        res.status(401).json({ error: 'Kata sandi orang tua tidak sesuai.' });
        return;
      }
    }

    const authUser: AuthUser = {
      id: `parent-${student.id}`,
      name: student.parentName,
      role: 'orang_tua',
      roleLabel: 'Orang Tua / Wali',
      studentId: student.id,
      studentName: student.name,
      studentClass: student.className,
    };
    const token = createSession(authUser);
    res.json({ token, user: authUser });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    res.json({ user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  app.get('/api/stream', (req, res) => {
    const token = String(req.query.token || '');
    const session = getSessionFromToken(token);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized SSE stream.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const client: SseClient = { res, user: session.user };
    sseClients.add(client);
    res.write(
      `event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`
    );

    const keepAlive = setInterval(() => {
      res.write(`: ping\n\n`);
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(client);
    });
  });

  app.get('/api/state', requireAuth, (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    res.json(buildScopedState(db, user));
  });

  // Record a new violation or achievement (Staff & Admin)
  app.post(
    '/api/records',
    requireAuth,
    requireRoles(['admin', 'ketertiban', 'guru_mapel', 'wali_kelas', 'bk']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const { studentId, ruleId, notes, location, occurredAt } = req.body as {
        studentId?: string;
        ruleId?: string;
        notes?: string;
        location?: string;
        occurredAt?: string;
      };

      const student = db.students.find((s) => s.id === studentId);
      const rule = db.catalog.find((r) => r.id === ruleId);

      if (!student || !rule) {
        res.status(400).json({ error: 'Siswa atau aturan poin tidak ditemukan.' });
        return;
      }

      const prevViolation = student.violationPoints;
      const prevRisk = student.riskStatus;
      const nowIso = new Date().toISOString();

      const newRecord: BehaviorRecord = {
        id: `rec-${Date.now()}`,
        studentId: student.id,
        ruleId: rule.id,
        type: rule.type,
        category: rule.category,
        title: rule.title,
        points: rule.points,
        severity: rule.severity,
        achievementTier: rule.achievementTier,
        recordedBy: user.name,
        recordedByRole: user.roleLabel,
        notes: notes?.trim() || '-',
        location: location?.trim() || 'Lingkungan Sekolah',
        occurredAt: occurredAt || nowIso.slice(0, 10),
        createdAt: nowIso,
      };

      db.records.unshift(newRecord);
      const updatedStudent = recalculateStudent(db, student.id)!;

      let createdAction: DisciplinaryAction | null = null;
      const createdNotifications: NotificationItem[] = [];

      if (rule.type === 'violation') {
        const rec = generatePunishmentRecommendation(rule, updatedStudent.violationPoints);
        const dueDateObj = new Date();
        dueDateObj.setDate(dueDateObj.getDate() + 5);

        createdAction = {
          id: `act-${Date.now()}`,
          recordId: newRecord.id,
          studentId: student.id,
          violationTitle: rule.title,
          violationPoints: rule.points,
          cumulativeViolationPoints: updatedStudent.violationPoints,
          recommendedAction: rec.recommendedAction,
          sanctionLevel: rec.sanctionLevel,
          assignedUnit: rec.assignedUnit,
          status: 'Menunggu Tindak Lanjut',
          evaluationNotes: `Otomatis direkomendasikan saat pencatatan pelanggaran (${rule.code}).`,
          dueDate: dueDateObj.toISOString().slice(0, 10),
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        db.disciplinaryActions.unshift(createdAction);

        const crossedThreshold = prevRisk !== updatedStudent.riskStatus;
        const significantSpike =
          rule.points >= 15 || updatedStudent.violationPoints - prevViolation >= 15;

        if (crossedThreshold || significantSpike) {
          const isCritical = updatedStudent.violationPoints >= 50;
          const notif: NotificationItem = {
            id: `notif-${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            className: student.className,
            type: crossedThreshold ? 'threshold_crossed' : 'point_spike',
            severity: isCritical ? 'critical' : 'warning',
            title: crossedThreshold
              ? `Status Disiplin Berubah ke ${updatedStudent.riskStatus}`
              : `Perubahan Poin Pelanggaran Signifikan (+${rule.points} Poin)`,
            message: `${student.name} (${student.className}) mendapat +${rule.points} poin pelanggaran "${rule.title}". Total akumulasi pelanggaran kini ${updatedStudent.violationPoints} poin. Rekomendasi: ${rec.sanctionLevel}.`,
            pointDelta: rule.points,
            recipients: isCritical
              ? ['Guru BK', 'Tim Ketertiban', 'Wali Kelas', 'Orang Tua']
              : ['Tim Ketertiban', 'Wali Kelas', 'Orang Tua'],
            isRead: false,
            createdAt: nowIso,
          };
          db.notifications.unshift(notif);
          createdNotifications.push(notif);
        }
      } else if (rule.points >= 20 || updatedStudent.riskStatus === 'Teladan') {
        const notif: NotificationItem = {
          id: `notif-${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          className: student.className,
          type: 'achievement_milestone',
          severity: 'positive',
          title: `Peningkatan Poin Prestasi (+${rule.points} Poin)`,
          message: `${student.name} (${student.className}) mencatat prestasi "${rule.title}" (+${rule.points} poin). Total poin prestasi kini ${updatedStudent.achievementPoints} poin.`,
          pointDelta: rule.points,
          recipients: ['Wali Kelas', 'Orang Tua'],
          isRead: false,
          createdAt: nowIso,
        };
        db.notifications.unshift(notif);
        createdNotifications.push(notif);
      }

      saveDatabase(db);
      broadcastState('state_updated', {
        reason: 'record_created',
        studentId: student.id,
        notifications: createdNotifications,
      });

      res.status(201).json({
        record: newRecord,
        student: sanitizeStudent(updatedStudent),
        action: createdAction,
        notifications: createdNotifications,
        fullState: buildScopedState(db, user),
      });
    }
  );

  app.delete(
    '/api/records/:id',
    requireAuth,
    requireRoles(['admin', 'ketertiban', 'bk', 'wali_kelas', 'guru_mapel']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const { id } = req.params;
      const target = db.records.find((r) => r.id === id);
      if (!target) {
        res.status(404).json({ error: 'Catatan tidak ditemukan.' });
        return;
      }

      if (
        (user.role === 'guru_mapel' || user.role === 'wali_kelas') &&
        target.recordedBy !== user.name
      ) {
        res.status(403).json({
          error: 'Anda hanya dapat menghapus catatan yang Anda buat sendiri.',
        });
        return;
      }

      db.records = db.records.filter((r) => r.id !== id);
      db.disciplinaryActions = db.disciplinaryActions.filter((a) => a.recordId !== id);
      recalculateStudent(db, target.studentId);
      saveDatabase(db);

      broadcastState('state_updated', {
        reason: 'record_deleted',
        studentId: target.studentId,
      });
      res.json({ fullState: buildScopedState(db, user) });
    }
  );

  app.patch(
    '/api/disciplinary-actions/:id',
    requireAuth,
    requireRoles(['admin', 'ketertiban', 'bk', 'wali_kelas']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const { id } = req.params;
      const { status, assignedUnit, evaluationNotes } = req.body as {
        status?: ActionStatus;
        assignedUnit?: 'Wali Kelas' | 'Tim Ketertiban' | 'Guru BK';
        evaluationNotes?: string;
      };

      const action = db.disciplinaryActions.find((a) => a.id === id);
      if (!action) {
        res.status(404).json({ error: 'Data tindak lanjut tidak ditemukan.' });
        return;
      }

      if (status) action.status = status;
      if (assignedUnit) action.assignedUnit = assignedUnit;
      if (typeof evaluationNotes === 'string') action.evaluationNotes = evaluationNotes;
      action.updatedAt = new Date().toISOString();

      saveDatabase(db);
      broadcastState('state_updated', {
        reason: 'action_updated',
        studentId: action.studentId,
      });
      res.json({ action, fullState: buildScopedState(db, user) });
    }
  );

  app.post('/api/summon-letters', requireAuth, requireRoles(['admin', 'bk']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const {
      studentId,
      agenda,
      meetingDate,
      meetingTime,
      meetingLocation,
      counselorName,
      counselorNip,
    } = req.body as {
      studentId?: string;
      agenda?: string;
      meetingDate?: string;
      meetingTime?: string;
      meetingLocation?: string;
      counselorName?: string;
      counselorNip?: string;
    };

    const student = db.students.find((s) => s.id === studentId);
    if (!student) {
      res.status(404).json({ error: 'Siswa tidak ditemukan.' });
      return;
    }

    const recentViolations = db.records
      .filter((r) => r.studentId === student.id && r.type === 'violation')
      .slice(0, 4)
      .map((r) => `${r.title} (+${r.points} poin, ${r.occurredAt})`);

    const seq = 109 + db.summonLetters.length;
    const now = new Date();
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[now.getMonth()] || 'XI';
    const letterNumber = `421.3/${seq}/BK-SMAN1/${romanMonth}/${now.getFullYear()}`;

    const newLetter: SummonLetter = {
      id: `let-${Date.now()}`,
      letterNumber,
      studentId: student.id,
      studentName: student.name,
      nisn: student.nisn,
      className: student.className,
      parentName: student.parentName,
      parentAddress: student.parentAddress,
      totalViolationPoints: student.violationPoints,
      recentViolationsSummary:
        recentViolations.length > 0
          ? recentViolations
          : ['Evaluasi perilaku dan kehadiran berkala'],
      agenda:
        agenda?.trim() ||
        'Konsultasi pembinaan kedisiplinan siswa bersama Guru BK, Wali Kelas, dan Orang Tua/Wali Murid.',
      meetingDate: meetingDate || new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      meetingTime: meetingTime || '09:00 WIB',
      meetingLocation: meetingLocation || 'Ruang Bimbingan & Konseling (BK) Lt. 1',
      counselorName: counselorName || user.name,
      counselorNip: counselorNip || '19860412 201101 2 008',
      principalName: 'Drs. H. Ahmad Suhendra, M.Pd.',
      principalNip: '19690815 199512 1 003',
      status: 'Diterbitkan',
      issuedAt: now.toISOString(),
    };

    db.summonLetters.unshift(newLetter);

    const notif: NotificationItem = {
      id: `notif-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      className: student.className,
      type: 'summon_issued',
      severity: 'warning',
      title: `Surat Panggilan Orang Tua Diterbitkan (${student.name})`,
      message: `Surat panggilan nomor ${letterNumber} telah diterbitkan oleh Guru BK untuk jadwal pertemuan ${newLetter.meetingDate} pukul ${newLetter.meetingTime}.`,
      pointDelta: 0,
      recipients: ['Orang Tua', 'Wali Kelas', 'Tim Ketertiban'],
      isRead: false,
      createdAt: now.toISOString(),
    };
    db.notifications.unshift(notif);

    saveDatabase(db);
    broadcastState('state_updated', {
      reason: 'summon_issued',
      studentId: student.id,
      notif,
    });
    res
      .status(201)
      .json({ letter: newLetter, notification: notif, fullState: buildScopedState(db, user) });
  });

  app.patch(
    '/api/summon-letters/:id',
    requireAuth,
    requireRoles(['admin', 'bk', 'orang_tua']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const { id } = req.params;
      const { status, parentResponseNote } = req.body as {
        status?: SummonStatus;
        parentResponseNote?: string;
      };

      const letter = db.summonLetters.find((l) => l.id === id);
      if (!letter) {
        res.status(404).json({ error: 'Surat panggilan tidak ditemukan.' });
        return;
      }

      if (user.role === 'orang_tua') {
        if (letter.studentId !== user.studentId) {
          res.status(403).json({ error: 'Anda tidak berhak mengakses surat ini.' });
          return;
        }
        letter.status = 'Diterima Orang Tua';
        if (typeof parentResponseNote === 'string') {
          letter.parentResponseNote = parentResponseNote.trim();
        }
      } else {
        if (status) letter.status = status;
        if (typeof parentResponseNote === 'string') {
          letter.parentResponseNote = parentResponseNote.trim();
        }
      }

      saveDatabase(db);
      broadcastState('state_updated', {
        reason: 'summon_updated',
        studentId: letter.studentId,
      });
      res.json({ letter, fullState: buildScopedState(db, user) });
    }
  );

  app.patch('/api/notifications/read', requireAuth, (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { id, all } = req.body as { id?: string; all?: boolean };

    if (user.role === 'orang_tua') {
      if (all) {
        for (const n of db.notifications) {
          if (n.studentId === user.studentId) n.isRead = true;
        }
      } else if (id) {
        const item = db.notifications.find(
          (n) => n.id === id && n.studentId === user.studentId
        );
        if (item) item.isRead = true;
      }
    } else {
      if (all) {
        for (const n of db.notifications) n.isRead = true;
      } else if (id) {
        const item = db.notifications.find((n) => n.id === id);
        if (item) item.isRead = true;
      }
    }

    saveDatabase(db);
    broadcastState('state_updated', {
      reason: 'notifications_read',
      studentId: user.studentId,
    });
    res.json({ fullState: buildScopedState(db, user) });
  });

  app.patch(
    '/api/settings/monthly-report',
    requireAuth,
    requireRoles(['admin', 'bk', 'ketertiban']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const updates = req.body as Partial<AppDatabaseState['monthlyConfig']>;
      db.monthlyConfig = {
        ...db.monthlyConfig,
        ...updates,
      };
      saveDatabase(db);
      broadcastState('state_updated', { reason: 'monthly_config_updated' });
      res.json({
        monthlyConfig: db.monthlyConfig,
        fullState: buildScopedState(db, user),
      });
    }
  );

  // ============================================================================
  // ADMIN-ONLY MANAGEMENT ROUTES (Pengelola Aplikasi)
  // ============================================================================
  app.post('/api/admin/staff', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { name, role, subjectOrUnit, assignedClass } = req.body as {
      name?: string;
      role?: Exclude<UserRole, 'orang_tua'>;
      subjectOrUnit?: string;
      assignedClass?: string;
    };

    const allowedStaffRoles: Exclude<UserRole, 'orang_tua'>[] = [
      'admin',
      'ketertiban',
      'bk',
      'wali_kelas',
      'guru_mapel',
    ];
    if (!name?.trim() || !role || !allowedStaffRoles.includes(role)) {
      res.status(400).json({ error: 'Nama lengkap dan peran staf valid wajib diisi.' });
      return;
    }

    const newStaff: StaffAccount = {
      id: `staff-${Date.now()}`,
      name: name.trim(),
      role,
      roleLabel: getRoleLabel(role),
      subjectOrUnit: subjectOrUnit?.trim() || getRoleLabel(role),
      assignedClass: role === 'wali_kelas' ? assignedClass?.trim() || 'X A' : undefined,
    };

    db.staffAccounts.push(newStaff);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_staff_added' });
    res.status(201).json({ staff: newStaff, fullState: buildScopedState(db, user) });
  });

  app.delete('/api/admin/staff/:id', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { id } = req.params;

    if (id === user.id) {
      res.status(400).json({ error: 'Tidak dapat menghapus akun admin yang sedang digunakan.' });
      return;
    }
    const target = db.staffAccounts.find((s) => s.id === id);
    if (!target) {
      res.status(404).json({ error: 'Akun staf tidak ditemukan.' });
      return;
    }
    const adminCount = db.staffAccounts.filter((s) => s.role === 'admin').length;
    if (target.role === 'admin' && adminCount <= 1) {
      res.status(400).json({ error: 'Minimal harus ada 1 akun Admin Pengelola.' });
      return;
    }

    db.staffAccounts = db.staffAccounts.filter((s) => s.id !== id);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_staff_deleted' });
    res.json({ fullState: buildScopedState(db, user) });
  });

  app.post('/api/admin/students', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const {
      nisn,
      name,
      className,
      homeroomTeacher,
      parentName,
      parentPhone,
      parentAddress,
    } = req.body as {
      nisn?: string;
      name?: string;
      className?: string;
      homeroomTeacher?: string;
      parentName?: string;
      parentPhone?: string;
      parentAddress?: string;
    };

    if (!nisn?.trim() || !name?.trim() || !className?.trim()) {
      res.status(400).json({ error: 'NISN, Nama Siswa, dan Kelas wajib diisi.' });
      return;
    }
    if (db.students.some((s) => s.nisn === nisn.trim())) {
      res.status(409).json({ error: 'NISN tersebut sudah terdaftar.' });
      return;
    }

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      nisn: nisn.trim(),
      name: name.trim(),
      className: className.trim(),
      homeroomTeacher: homeroomTeacher?.trim() || 'Wali Kelas',
      parentName: parentName?.trim() || `Orang Tua ${name.trim()}`,
      parentPhone: parentPhone?.trim() || '-',
      parentEmail: '-',
      parentAddress: parentAddress?.trim() || '-',
      violationPoints: 0,
      achievementPoints: 0,
      behaviorIndex: 100,
      riskStatus: 'Normal',
      lastUpdatedAt: new Date().toISOString(),
    };

    db.students.push(newStudent);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_student_added' });
    res.status(201).json({
      student: sanitizeStudent(newStudent),
      fullState: buildScopedState(db, user),
    });
  });

  app.delete('/api/admin/students/:id', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { id } = req.params;
    const exists = db.students.some((s) => s.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
      return;
    }

    db.students = db.students.filter((s) => s.id !== id);
    db.records = db.records.filter((r) => r.studentId !== id);
    db.disciplinaryActions = db.disciplinaryActions.filter((a) => a.studentId !== id);
    db.notifications = db.notifications.filter((n) => n.studentId !== id);
    db.summonLetters = db.summonLetters.filter((l) => l.studentId !== id);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_student_deleted' });
    res.json({ fullState: buildScopedState(db, user) });
  });

  app.post(
    '/api/admin/students/:id/reset-parent',
    requireAuth,
    requireRoles(['admin']),
    (req, res) => {
      const user = (req as express.Request & { authUser: AuthUser }).authUser;
      const { id } = req.params;
      const stu = db.students.find((s) => s.id === id);
      if (!stu) {
        res.status(404).json({ error: 'Siswa tidak ditemukan.' });
        return;
      }
      delete stu.parentPasswordHash;
      saveDatabase(db);
      res.json({ ok: true, fullState: buildScopedState(db, user) });
    }
  );

  app.post('/api/admin/catalog', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { code, type, category, title, points, severity, achievementTier, defaultPunishment } =
      req.body as {
        code?: string;
        type?: RecordType;
        category?: string;
        title?: string;
        points?: number;
        severity?: RuleCatalogItem['severity'];
        achievementTier?: RuleCatalogItem['achievementTier'];
        defaultPunishment?: string;
      };

    if (!code?.trim() || !title?.trim() || !type || !points || points <= 0) {
      res.status(400).json({ error: 'Kode, jenis, judul aturan, dan poin (>0) wajib diisi.' });
      return;
    }

    const item: RuleCatalogItem = {
      id: `rule-${Date.now()}`,
      code: code.trim(),
      type,
      category: category?.trim() || (type === 'violation' ? 'Ketertiban Umum' : 'Prestasi'),
      title: title.trim(),
      points: Math.round(points),
      severity: type === 'violation' ? severity || 'Ringan' : undefined,
      achievementTier: type === 'achievement' ? achievementTier || 'Sekolah' : undefined,
      defaultPunishment:
        defaultPunishment?.trim() ||
        (type === 'violation'
          ? 'Pembinaan edukatif oleh Guru / Tim Ketertiban'
          : 'Apresiasi dan kredit poin prestasi'),
      escalationGuidance: 'Mengikuti ketentuan tata tertib sekolah yang berlaku',
    };

    db.catalog.push(item);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_catalog_added' });
    res.status(201).json({ item, fullState: buildScopedState(db, user) });
  });

  app.delete('/api/admin/catalog/:id', requireAuth, requireRoles(['admin']), (req, res) => {
    const user = (req as express.Request & { authUser: AuthUser }).authUser;
    const { id } = req.params;
    db.catalog = db.catalog.filter((c) => c.id !== id);
    saveDatabase(db);
    broadcastState('state_updated', { reason: 'admin_catalog_deleted' });
    res.json({ fullState: buildScopedState(db, user) });
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIBUDI Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SIBUDI server:', err);
  process.exit(1);
});
