import type {
  BehaviorRecord,
  PublicStudent,
  RecordType,
  RiskStatus,
  RuleCatalogItem,
  SeverityLevel,
  Student,
} from '../types.ts';

export function computeRiskStatus(violationPoints: number, achievementPoints: number): RiskStatus {
  if (violationPoints >= 75) return 'Kritis (SP3)';
  if (violationPoints >= 50) return 'Panggilan Orang Tua (SP2)';
  if (violationPoints >= 25) return 'Peringatan (SP1)';
  if (violationPoints >= 10) return 'Pembinaan';
  if (achievementPoints >= 30 && violationPoints === 0) return 'Teladan';
  return 'Normal';
}

export function computeBehaviorIndex(violationPoints: number, achievementPoints: number): number {
  const raw = 100 - violationPoints + Math.round(achievementPoints * 0.4);
  return Math.max(0, Math.min(120, raw));
}

export interface PunishmentRecommendation {
  recommendedAction: string;
  sanctionLevel: string;
  assignedUnit: 'Wali Kelas' | 'Tim Ketertiban' | 'Guru BK';
  requiresParentSummon: boolean;
}

export function generatePunishmentRecommendation(
  rule: RuleCatalogItem,
  projectedViolationPoints: number
): PunishmentRecommendation {
  const severity: SeverityLevel = rule.severity || 'Ringan';

  if (projectedViolationPoints >= 75 || severity === 'Sangat Berat') {
    return {
      recommendedAction: `${rule.defaultPunishment}. Lanjutkan dengan Konferensi Kasus bersama Kepala Sekolah, Guru BK, dan Orang Tua serta penyusunan surat perjanjian bermaterai.`,
      sanctionLevel: 'SP3 / Konferensi Kasus & Skorsing Pembinaan',
      assignedUnit: 'Guru BK',
      requiresParentSummon: true,
    };
  }

  if (projectedViolationPoints >= 50 || severity === 'Berat') {
    return {
      recommendedAction: `${rule.defaultPunishment}. Wajib menerbitkan Surat Panggilan Orang Tua ke ruang BK dan menjalankan tugas pembinaan karakter selama 5 hari sekolah.`,
      sanctionLevel: 'SP2 / Panggilan Orang Tua Wajib',
      assignedUnit: 'Guru BK',
      requiresParentSummon: true,
    };
  }

  if (projectedViolationPoints >= 25 || severity === 'Sedang') {
    return {
      recommendedAction: `${rule.defaultPunishment}. Terbitkan Surat Peringatan 1 (SP1), wajib lapor harian kepada Tim Ketertiban selama 3 hari, dan pemberitahuan resmi ke orang tua.`,
      sanctionLevel: 'SP1 / Pembinaan Terstruktur Ketertiban',
      assignedUnit: 'Tim Ketertiban',
      requiresParentSummon: false,
    };
  }

  return {
    recommendedAction: `${rule.defaultPunishment}. Lakukan konseling singkat oleh Wali Kelas dan pencatatan komitmen perbaikan perilaku.`,
    sanctionLevel: 'Pembinaan Edukatif Ringan',
    assignedUnit: 'Wali Kelas',
    requiresParentSummon: false,
  };
}

export function formatIndonesianDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatIndonesianDateLong(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatIndonesianDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getRiskBadgeClasses(status: RiskStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'Teladan':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'Normal':
      return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
    case 'Pembinaan':
      return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' };
    case 'Peringatan (SP1)':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'Panggilan Orang Tua (SP2)':
      return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
    case 'Kritis (SP3)':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
  }
}

export function exportMonthlyCsv(
  monthKey: string,
  students: (Student | PublicStudent)[],
  records: BehaviorRecord[],
  classFilter: string
): string {
  const filteredStudents =
    classFilter === 'ALL'
      ? students
      : students.filter((s) => s.className === classFilter);

  const monthRecords = records.filter((r) => r.occurredAt.startsWith(monthKey));

  const header = [
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Wali Kelas',
    'Pelanggaran Bulan Ini',
    'Prestasi Bulan Ini',
    'Akumulasi Poin Pelanggaran',
    'Akumulasi Poin Prestasi',
    'Indeks Perilaku',
    'Status Pembinaan',
  ].join(',');

  const rows = filteredStudents.map((s) => {
    const sRecords = monthRecords.filter((r) => r.studentId === s.id);
    const monthViolation = sRecords
      .filter((r) => r.type === 'violation')
      .reduce((acc, r) => acc + r.points, 0);
    const monthAchievement = sRecords
      .filter((r) => r.type === 'achievement')
      .reduce((acc, r) => acc + r.points, 0);

    return [
      `"${s.nisn}"`,
      `"${s.name}"`,
      `"${s.className}"`,
      `"${s.homeroomTeacher}"`,
      monthViolation,
      monthAchievement,
      s.violationPoints,
      s.achievementPoints,
      s.behaviorIndex,
      `"${s.riskStatus}"`,
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

export function getRecordTypeLabel(type: RecordType): string {
  return type === 'violation' ? 'Pelanggaran' : 'Prestasi';
}
