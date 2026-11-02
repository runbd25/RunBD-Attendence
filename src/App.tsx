/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { TodayDashboard } from './components/TodayDashboard';
import { PunchDesk } from './components/PunchDesk';
import { ManagerPortal } from './components/ManagerPortal';
import { ToastContainer } from './components/ToastContainer';
import { AttendanceRecord, ToastMessage, WorkMode, EmployeeProfile } from './types/attendance';
import { DEFAULT_EMPLOYEES } from './data/mockData';
import { db, auth, handleFirestoreError, OperationType } from './services/firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const STORAGE_KEY_OFFICE_START = 'attendpulse_office_start_v1';
const STORAGE_KEY_THEME = 'attendpulse_theme_v1';
const STORAGE_KEY_ADMIN_PASSWORD = 'attendpulse_admin_password_v1';
const STORAGE_KEY_GRACE_MINS = 'attendpulse_grace_mins_v1';

export default function App() {
  // Navigation tab (default to 'dashboard')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'punch' | 'manager'>('dashboard');

  // Theme state ('light' | 'dark')
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  // Firebase Auth state & connection
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Attendance Records state (synchronized with Firestore)
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  // Employees state (synchronized with Firestore)
  const [employees, setEmployees] = useState<EmployeeProfile[]>(DEFAULT_EMPLOYEES);

  // Settings
  const [officeStartTime, setOfficeStartTime] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_OFFICE_START) || '09:30';
  });

  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ADMIN_PASSWORD) || 'admin123';
  });

  const [graceMinutes, setGraceMinutes] = useState<number>(() => {
    return Number(localStorage.getItem(STORAGE_KEY_GRACE_MINS)) || 0;
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Sync theme with HTML root class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setAuthLoading(false);
      } else {
        signInAnonymously(auth)
          .then((cred) => {
            setCurrentUser(cred.user);
            setAuthLoading(false);
          })
          .catch((err) => {
            console.warn('Anonymous sign-in failed:', err);
            setAuthLoading(false);
          });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Sync Attendance Records from Firestore in real-time
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, 'attendanceRecords');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedRecords: AttendanceRecord[] = [];
        snapshot.forEach((docSnap) => {
          loadedRecords.push(docSnap.data() as AttendanceRecord);
        });
        loadedRecords.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRecords(loadedRecords);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attendanceRecords');
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Sync Employees from Firestore in real-time
  useEffect(() => {
    if (!currentUser) return;
    const q = collection(db, 'employees');
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedEmps: EmployeeProfile[] = [];
        snapshot.forEach((docSnap) => {
          loadedEmps.push(docSnap.data() as EmployeeProfile);
        });
        if (loadedEmps.length > 0) {
          setEmployees(loadedEmps);
        } else {
          // Seed default employees to Firestore if empty
          DEFAULT_EMPLOYEES.forEach(async (emp) => {
            try {
              await setDoc(doc(db, 'employees', emp.id), emp);
            } catch (e) {
              console.warn('Failed to seed default employee', e);
            }
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'employees');
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const showToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateOfficeStartTime = (newTime: string) => {
    setOfficeStartTime(newTime);
    localStorage.setItem(STORAGE_KEY_OFFICE_START, newTime);
  };

  // Today's date string YYYY-MM-DD
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Today's records
  const todayRecords = useMemo(() => {
    return records.filter((r) => r.date === todayStr);
  }, [records, todayStr]);

  // Check-In Handler
  const handleCheckIn = async (payload: {
    employeeId: string;
    employeeName: string;
    department: string;
    workMode: WorkMode;
    locationText: string;
  }) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const [startH, startM] = officeStartTime.split(':').map(Number);
    const officeLimitMinutes = (startH || 9) * 60 + (startM || 30);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const isLate = currentMinutes > officeLimitMinutes;
    const lateMinutes = isLate ? currentMinutes - officeLimitMinutes : 0;
    const lateStatus = isLate ? 'Late' : 'On-Time';

    const recordId = `rec-${todayStr}-${payload.employeeId}-${Date.now()}`;
    const newRecord: AttendanceRecord = {
      id: recordId,
      slNo: records.length + 1,
      date: todayStr,
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      department: payload.department,
      checkInTime: timeFormatted,
      checkInTimestamp: now.getTime(),
      checkOutTime: null,
      checkOutTimestamp: null,
      location: payload.locationText,
      workMode: payload.workMode,
      lateStatus,
      lateMinutes,
      totalHours: '--',
      syncedToSheet: false,
      createdAt: now.getTime(),
    };

    try {
      await setDoc(doc(db, 'attendanceRecords', recordId), newRecord);
      showToast(
        'Check-In Recorded',
        `${payload.employeeName} checked in at ${timeFormatted} (${lateStatus}${
          lateMinutes > 0 ? ` +${lateMinutes}m` : ''
        }) - ${payload.locationText}`,
        isLate ? 'warning' : 'success'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendanceRecords/${recordId}`);
    }
  };

  // Check-Out Handler
  const handleCheckOut = async (payload: {
    employeeId: string;
    employeeName: string;
    locationText: string;
  }) => {
    const existing = records.find(
      (r) =>
        r.date === todayStr &&
        (r.employeeId.toLowerCase() === payload.employeeId.toLowerCase() ||
          r.employeeName.toLowerCase() === payload.employeeName.toLowerCase())
    );

    if (!existing) {
      showToast('Error', 'Check-in record not found for today.', 'error');
      return;
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const inMs = existing.checkInTimestamp || now.getTime();
    const outMs = now.getTime();
    const diffMs = Math.max(0, outMs - inMs);
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const totalHoursStr = `${hrs}h ${mins}m`;

    const updatedRecord: AttendanceRecord = {
      ...existing,
      checkOutTime: timeFormatted,
      checkOutTimestamp: outMs,
      totalHours: totalHoursStr,
      location: existing.location.includes('Out:')
        ? existing.location
        : `${existing.location} (Out: ${payload.locationText})`,
    };

    try {
      await setDoc(doc(db, 'attendanceRecords', existing.id), updatedRecord);
      showToast(
        'Check-Out Recorded',
        `${payload.employeeName} checked out at ${timeFormatted}. Total duration: ${totalHoursStr}.`,
        'success'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendanceRecords/${existing.id}`);
    }
  };

  // Manager actions
  const handleAddManualRecord = async (rec: AttendanceRecord) => {
    try {
      await setDoc(doc(db, 'attendanceRecords', rec.id), rec);
      showToast('Record Added', `Manual attendance added for ${rec.employeeName}.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendanceRecords/${rec.id}`);
    }
  };

  const handleUpdateRecord = async (updatedRecord: AttendanceRecord) => {
    try {
      await setDoc(doc(db, 'attendanceRecords', updatedRecord.id), updatedRecord);
      showToast('Record Updated', `Attendance for ${updatedRecord.employeeName} on ${updatedRecord.date} updated.`, 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendanceRecords/${updatedRecord.id}`);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'attendanceRecords', id));
      showToast('Record Deleted', 'Attendance record removed.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendanceRecords/${id}`);
    }
  };

  const handleAddEmployee = async (emp: EmployeeProfile) => {
    setEmployees((prev) => [...prev, emp]);
    try {
      await setDoc(doc(db, 'employees', emp.id), emp, { merge: true });
      showToast('Employee Added', `${emp.name} added to team roster.`, 'success');
    } catch (error) {
      console.error('Failed to add employee:', error);
      handleFirestoreError(error, OperationType.WRITE, `employees/${emp.id}`);
    }
  };

  const handleUpdateEmployee = async (emp: EmployeeProfile) => {
    setEmployees((prev) => prev.map((e) => (e.id === emp.id ? emp : e)));
    try {
      await setDoc(doc(db, 'employees', emp.id), emp, { merge: true });
      showToast('Employee Updated', `Profile for ${emp.name} updated.`, 'success');
    } catch (error) {
      console.error('Failed to update employee:', error);
      handleFirestoreError(error, OperationType.WRITE, `employees/${emp.id}`);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    const target = employees.find((e) => e.id === id);
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteDoc(doc(db, 'employees', id));
      showToast('Employee Removed', `${target?.name || id} removed from directory.`, 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  const handleUpdateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem(STORAGE_KEY_ADMIN_PASSWORD, newPass);
    showToast('Password Updated', 'Manager access password changed.', 'success');
  };

  const handleUpdateGraceMinutes = (mins: number) => {
    setGraceMinutes(mins);
    localStorage.setItem(STORAGE_KEY_GRACE_MINS, String(mins));
  };

  const todayActiveWorkingCount = useMemo(
    () => todayRecords.filter((r) => !r.checkOutTime).length,
    [todayRecords]
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-900 dark:text-slate-100 transition-colors">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Main Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
        todayActiveCount={todayActiveWorkingCount}
      />

      {/* Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <TodayDashboard
            todayRecords={todayRecords}
            allRecords={records}
            officeStartTime={officeStartTime}
            employees={employees}
            onCheckOut={handleCheckOut}
            onUpdateRecord={handleUpdateRecord}
            onNavigateToPunch={() => setActiveTab('punch')}
            showToast={showToast}
          />
        )}

        {activeTab === 'punch' && (
          <PunchDesk
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            todayRecords={todayRecords}
            officeStartTime={officeStartTime}
            gasConnected={false}
            onOpenGasSetup={() => {}}
            onNavigateToDashboard={() => setActiveTab('dashboard')}
            employees={employees}
            showToast={showToast}
          />
        )}

        {activeTab === 'manager' && (
          <ManagerPortal
            records={records}
            adminPassword={adminPassword}
            onUpdateAdminPassword={handleUpdateAdminPassword}
            officeStartTime={officeStartTime}
            onUpdateOfficeStartTime={handleUpdateOfficeStartTime}
            graceMinutes={graceMinutes}
            onUpdateGraceMinutes={handleUpdateGraceMinutes}
            employees={employees}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onAddManualRecord={handleAddManualRecord}
            onUpdateRecord={handleUpdateRecord}
            onDeleteRecord={handleDeleteRecord}
            showToast={showToast}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg overflow-hidden border border-sky-400/30">
              <img
                src="/assets/img/WhatsApp_Image_2026-10-29_at_11.52.03_ee88581e.jpeg"
                alt="Runbd Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">Runbd Attendance</span>
            <span>·</span>
            <span>Smart Attendance System</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              Today's Dashboard
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('punch')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Punch Desk
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('manager')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              Manager Portal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
