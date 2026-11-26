import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ActionStatus,
  AuthUser,
  ClientAppState,
  MonthlyReportConfig,
  NotificationItem,
  RecordType,
  SeverityLevel,
  StaffAccount,
  SummonLetter,
  SummonStatus,
  UserRole,
} from './types.ts';
import { Sidebar, type NavTab } from './components/Sidebar.tsx';
import { TopBar } from './components/TopBar.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { RecordEntryView } from './components/RecordEntryView.tsx';
import { DisciplineModuleView } from './components/DisciplineModuleView.tsx';
import { CounselingLetterView } from './components/CounselingLetterView.tsx';
import { MonthlyReportView } from './components/MonthlyReportView.tsx';
import { AdminManagementView } from './components/AdminManagementView.tsx';
import { ParentNotificationsView } from './components/ParentNotificationsView.tsx';
import { NotificationDrawer } from './components/NotificationDrawer.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { AlertTriangle, Award, X } from 'lucide-react';

interface AuthBootstrapInfo {
  staffConfigured: boolean;
  staffAccounts: StaffAccount[];
  schoolName: string;
}

export default function App() {
  const [authBootstrap, setAuthBootstrap] = useState<AuthBootstrapInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const [db, setDb] = useState<ClientAppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileSheetOpen, setMobileSheetOpen] = useState<boolean>(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState<boolean>(false);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);

  const [preselectedSummonStudentId, setPreselectedSummonStudentId] = useState<string | null>(
    null
  );
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);

  const fetchAuthBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error('Gagal memeriksa status autentikasi.');
      const data = (await res.json()) as AuthBootstrapInfo;
      setAuthBootstrap(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAuthBootstrap();
  }, [fetchAuthBootstrap]);

  const authFetch = useCallback(
    async (url: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401) {
        setToken(null);
        setUser(null);
        setDb(null);
      }
      return res;
    },
    [token]
  );

  const fetchState = useCallback(async () => {
    if (!token) return;
    try {
      const res = await authFetch('/api/state');
      if (!res.ok) throw new Error('Gagal memuat data sistem.');
      const data = (await res.json()) as ClientAppState;
      setDb(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    }
  }, [token, authFetch]);

  useEffect(() => {
    if (!token || !user) return;
    void fetchState();

    const eventSource = new EventSource(
      `/api/stream?token=${encodeURIComponent(token)}`
    );
    eventSource.addEventListener('connected', () => {
      setIsLiveConnected(true);
    });
    eventSource.addEventListener('state_updated', (ev) => {
      try {
        const parsed = JSON.parse(ev.data) as {
          notifications?: NotificationItem[];
          notif?: NotificationItem;
        };
        if (parsed.notifications && parsed.notifications.length > 0) {
          setLiveToast(parsed.notifications[0]);
        } else if (parsed.notif) {
          setLiveToast(parsed.notif);
        }
      } catch {
        // Ignore parse error on optional toast payload
      }
      void fetchState();
    });
    eventSource.onerror = () => {
      setIsLiveConnected(false);
    };

    return () => {
      eventSource.close();
      setIsLiveConnected(false);
    };
  }, [token, user, fetchState]);

  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 6500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  const handleLoginSuccess = (newToken: string, newUser: AuthUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newUser.role === 'orang_tua') {
      setActiveTab('parent_notifications');
    } else {
      setActiveTab('dashboard');
    }
    void fetchAuthBootstrap();
  };

  const handleLogout = async () => {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    setToken(null);
    setUser(null);
    setDb(null);
    setLiveToast(null);
    setNotificationDrawerOpen(false);
    setMobileSheetOpen(false);
    void fetchAuthBootstrap();
  };

  const handleCreateRecord = async (payload: {
    studentId: string;
    ruleId: string;
    notes: string;
    location: string;
    occurredAt: string;
  }) => {
    const res = await authFetch('/api/records', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = (await res.json()) as { error?: string };
      throw new Error(errData.error || 'Gagal menyimpan catatan poin.');
    }
    const data = (await res.json()) as {
      fullState: ClientAppState;
      notifications?: NotificationItem[];
    };
    setDb(data.fullState);
    if (data.notifications && data.notifications.length > 0) {
      setLiveToast(data.notifications[0]);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    const res = await authFetch(`/api/records/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = (await res.json()) as { fullState: ClientAppState };
      setDb(data.fullState);
    }
  };

  const handleUpdateAction = async (
    id: string,
    payload: {
      status?: ActionStatus;
      assignedUnit?: 'Wali Kelas' | 'Tim Ketertiban' | 'Guru BK';
      evaluationNotes?: string;
    }
  ) => {
    const res = await authFetch(`/api/disciplinary-actions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = (await res.json()) as { fullState: ClientAppState };
      setDb(data.fullState);
    }
  };

  const handleCreateSummonLetter = async (payload: {
    studentId: string;
    agenda: string;
    meetingDate: string;
    meetingTime: string;
    meetingLocation: string;
    counselorName: string;
    counselorNip: string;
  }): Promise<SummonLetter> => {
    const res = await authFetch('/api/summon-letters', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error('Gagal menerbitkan surat panggilan.');
    }
    const data = (await res.json()) as {
      letter: SummonLetter;
      fullState: ClientAppState;
    };
    setDb(data.fullState);
    return data.letter;
  };

  const handleUpdateSummonStatus = async (
    id: string,
    status: SummonStatus,
    parentResponseNote?: string
  ) => {
    const res = await authFetch(`/api/summon-letters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, parentResponseNote }),
    });
    if (res.ok) {
      const data = (await res.json()) as { fullState: ClientAppState };
      setDb(data.fullState);
    }
  };

  const handleMarkNotificationsRead = async (id?: string, all?: boolean) => {
    const res = await authFetch('/api/notifications/read', {
      method: 'PATCH',
      body: JSON.stringify({ id, all }),
    });
    if (res.ok) {
      const data = (await res.json()) as { fullState: ClientAppState };
      setDb(data.fullState);
    }
  };

  const handleUpdateMonthlyConfig = async (updates: Partial<MonthlyReportConfig>) => {
    const res = await authFetch('/api/settings/monthly-report', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = (await res.json()) as { fullState: ClientAppState };
      setDb(data.fullState);
    }
  };

  // Admin handlers
  const handleAddStaff = async (payload: {
    name: string;
    role: Exclude<UserRole, 'orang_tua'>;
    subjectOrUnit: string;
    assignedClass?: string;
  }) => {
    const res = await authFetch('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { fullState?: ClientAppState; error?: string };
    if (!res.ok || !data.fullState) {
      throw new Error(data.error || 'Gagal menambahkan akun staf.');
    }
    setDb(data.fullState);
  };

  const handleDeleteStaff = async (id: string) => {
    const res = await authFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
    const data = (await res.json()) as { fullState?: ClientAppState; error?: string };
    if (!res.ok || !data.fullState) {
      throw new Error(data.error || 'Gagal menghapus akun staf.');
    }
    setDb(data.fullState);
  };

  const handleAddStudent = async (payload: {
    nisn: string;
    name: string;
    className: string;
    homeroomTeacher: string;
    parentName: string;
    parentPhone: string;
    parentAddress: string;
  }) => {
    const res = await authFetch('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { fullState?: ClientAppState; error?: string };
    if (!res.ok || !data.fullState) {
      throw new Error(data.error || 'Gagal menambahkan siswa.');
    }
    setDb(data.fullState);
  };

  const handleDeleteStudent = async (id: string) => {
    const res = await authFetch(`/api/admin/students/${id}`, { method: 'DELETE' });
    const data = (await res.json()) as { fullState?: ClientAppState; error?: string };
    if (res.ok && data.fullState) {
      setDb(data.fullState);
    }
  };

  const handleResetParentAccess = async (id: string) => {
    const res = await authFetch(`/api/admin/students/${id}/reset-parent`, {
      method: 'POST',
    });
    const data = (await res.json()) as { fullState?: ClientAppState };
    if (res.ok && data.fullState) {
      setDb(data.fullState);
    }
  };

  const handleAddCatalogRule = async (payload: {
    code: string;
    type: RecordType;
    category: string;
    title: string;
    points: number;
    severity?: SeverityLevel;
    defaultPunishment: string;
  }) => {
    const res = await authFetch('/api/admin/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { fullState?: ClientAppState; error?: string };
    if (!res.ok || !data.fullState) {
      throw new Error(data.error || 'Gagal menambahkan aturan katalog.');
    }
    setDb(data.fullState);
  };

  const handleDeleteCatalogRule = async (id: string) => {
    const res = await authFetch(`/api/admin/catalog/${id}`, { method: 'DELETE' });
    const data = (await res.json()) as { fullState?: ClientAppState };
    if (res.ok && data.fullState) {
      setDb(data.fullState);
    }
  };

  const openSummonForStudent = (studentId: string) => {
    if (user?.role !== 'bk' && user?.role !== 'admin') return;
    setPreselectedSummonStudentId(studentId);
    setActiveTab('bk_letters');
  };

  const unreadCount = useMemo(
    () => (db ? db.notifications.filter((n) => !n.isRead).length : 0),
    [db]
  );

  const pendingActionsCount = useMemo(
    () =>
      db
        ? db.disciplinaryActions.filter((a) => a.status !== 'Selesai Dibina').length
        : 0,
    [db]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-sm w-full space-y-3">
          <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-neutral-100 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !authBootstrap) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-md w-full text-center space-y-3">
          <p className="font-display font-semibold text-neutral-900">
            Gagal Terhubung ke Server SIBUDI
          </p>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchAuthBootstrap();
            }}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <LoginScreen
        schoolName={authBootstrap?.schoolName || 'SMA Negeri 1 Harapan Bangsa'}
        staffConfigured={authBootstrap?.staffConfigured ?? true}
        staffAccounts={authBootstrap?.staffAccounts || []}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (!db) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-sm w-full space-y-3">
          <div className="h-4 w-40 bg-neutral-200 rounded animate-pulse" />
          <div className="h-3 w-full bg-neutral-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex text-neutral-900">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        schoolName={db.monthlyConfig.schoolName}
        unreadNotifications={unreadCount}
        pendingActionsCount={pendingActionsCount}
        onLogout={() => void handleLogout()}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          unreadCount={unreadCount}
          isLiveConnected={isLiveConnected}
          onOpenNotifications={() => setNotificationDrawerOpen(true)}
          onQuickRecord={() => setActiveTab('records')}
          showQuickAction={user.role !== 'orang_tua' && activeTab !== 'records'}
          showNotificationDrawerButton={user.role !== 'orang_tua'}
        />

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-[1440px] w-full mx-auto">
          {user.role === 'orang_tua' ? (
            <ParentNotificationsView
              user={user}
              student={db.students[0]}
              notifications={db.notifications}
              summonLetters={db.summonLetters}
              onMarkRead={handleMarkNotificationsRead}
              onConfirmSummon={(letterId, note) =>
                handleUpdateSummonStatus(letterId, 'Diterima Orang Tua', note)
              }
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  user={user}
                  students={db.students}
                  records={db.records}
                  disciplinaryActions={db.disciplinaryActions}
                  notifications={db.notifications}
                  onQuickRecord={() => setActiveTab('records')}
                  onOpenSummonForStudent={openSummonForStudent}
                  onOpenDisciplineModule={() => setActiveTab('discipline')}
                />
              )}

              {activeTab === 'records' && (
                <RecordEntryView
                  user={user}
                  students={db.students}
                  catalog={db.catalog}
                  records={db.records}
                  onCreateRecord={handleCreateRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {activeTab === 'discipline' &&
                (user.role === 'admin' ||
                  user.role === 'ketertiban' ||
                  user.role === 'bk' ||
                  user.role === 'wali_kelas') && (
                  <DisciplineModuleView
                    user={user}
                    students={db.students}
                    disciplinaryActions={db.disciplinaryActions}
                    catalog={db.catalog}
                    onUpdateAction={handleUpdateAction}
                    onOpenSummonForStudent={openSummonForStudent}
                  />
                )}

              {activeTab === 'bk_letters' &&
                (user.role === 'bk' || user.role === 'admin') && (
                  <CounselingLetterView
                    students={db.students}
                    summonLetters={db.summonLetters}
                    monthlyConfig={db.monthlyConfig}
                    preselectedStudentId={preselectedSummonStudentId}
                    onCreateSummonLetter={handleCreateSummonLetter}
                    onUpdateSummonStatus={(id, status) =>
                      handleUpdateSummonStatus(id, status)
                    }
                  />
                )}

              {activeTab === 'monthly_report' && (
                <MonthlyReportView
                  user={user}
                  students={db.students}
                  records={db.records}
                  monthlyConfig={db.monthlyConfig}
                  onUpdateMonthlyConfig={handleUpdateMonthlyConfig}
                />
              )}

              {activeTab === 'admin_panel' && user.role === 'admin' && (
                <AdminManagementView
                  user={user}
                  staffAccounts={db.staffAccounts}
                  students={db.students}
                  catalog={db.catalog}
                  monthlyConfig={db.monthlyConfig}
                  onAddStaff={handleAddStaff}
                  onDeleteStaff={handleDeleteStaff}
                  onAddStudent={handleAddStudent}
                  onDeleteStudent={handleDeleteStudent}
                  onResetParentAccess={handleResetParentAccess}
                  onAddCatalogRule={handleAddCatalogRule}
                  onDeleteCatalogRule={handleDeleteCatalogRule}
                  onUpdateMonthlyConfig={handleUpdateMonthlyConfig}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Smartphone App Bottom Tab Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        user={user}
        schoolName={db.monthlyConfig.schoolName}
        unreadNotifications={unreadCount}
        pendingActionsCount={pendingActionsCount}
        sheetOpen={mobileSheetOpen}
        onOpenSheet={() => setMobileSheetOpen(true)}
        onCloseSheet={() => setMobileSheetOpen(false)}
        onLogout={() => void handleLogout()}
      />

      {user.role !== 'orang_tua' && (
        <NotificationDrawer
          isOpen={notificationDrawerOpen}
          onClose={() => setNotificationDrawerOpen(false)}
          notifications={db.notifications}
          userRole={user.role}
          onMarkRead={handleMarkNotificationsRead}
          onOpenSummonForStudent={openSummonForStudent}
        />
      )}

      {liveToast && (
        <div
          role="status"
          className="fixed bottom-20 lg:bottom-5 right-4 lg:right-5 left-4 sm:left-auto z-50 sm:max-w-sm w-auto sm:w-full bg-white border border-neutral-200 rounded-xl p-4 shadow-lg no-print"
        >
          <div className="flex items-start gap-3">
            {liveToast.severity === 'positive' ? (
              <Award className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-orange-600">
                  Notifikasi Otomatis
                </span>
                <button
                  type="button"
                  onClick={() => setLiveToast(null)}
                  className="text-neutral-400 hover:text-neutral-700"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold text-neutral-900 mt-0.5">
                {liveToast.title}
              </p>
              <p className="text-xs text-neutral-600 mt-1 line-clamp-2">
                {liveToast.message}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
