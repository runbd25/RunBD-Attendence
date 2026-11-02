import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Building2,
  Briefcase,
  KeyRound,
  FileSpreadsheet,
  Clock,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { AttendanceRecord, WorkMode, EmployeeProfile } from '../types/attendance';
import { exportAttendanceToCSV } from '../services/exportService';
import { EditRecordModal } from './EditRecordModal';
import { EditEmployeeModal } from './EditEmployeeModal';

interface ManagerPortalProps {
  records: AttendanceRecord[];
  adminPassword: string;
  onUpdateAdminPassword: (newPass: string) => void;
  officeStartTime: string;
  onUpdateOfficeStartTime: (newTime: string) => void;
  graceMinutes: number;
  onUpdateGraceMinutes: (mins: number) => void;
  employees: EmployeeProfile[];
  onAddEmployee: (emp: EmployeeProfile) => void;
  onUpdateEmployee: (emp: EmployeeProfile) => void;
  onDeleteEmployee: (id: string) => void;
  onAddManualRecord: (rec: AttendanceRecord) => void;
  onUpdateRecord: (updatedRecord: AttendanceRecord) => void;
  onDeleteRecord: (id: string) => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({
  records,
  adminPassword,
  onUpdateAdminPassword,
  officeStartTime,
  onUpdateOfficeStartTime,
  graceMinutes,
  onUpdateGraceMinutes,
  employees,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onAddManualRecord,
  onUpdateRecord,
  onDeleteRecord,
  showToast,
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Active section tab inside Manager Portal: 'records' | 'team' | 'settings'
  const [portalTab, setPortalTab] = useState<'records' | 'team' | 'settings'>('records');

  // Filters state for Records tab
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLateStatus, setSelectedLateStatus] = useState<string>('ALL');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'30D' | '7D' | 'TODAY' | 'CUSTOM'>('30D');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Edit Record Modal state
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditRecordModalOpen, setIsEditRecordModalOpen] = useState<boolean>(false);

  // Manual record modal state
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualEmpName, setManualEmpName] = useState<string>('');
  const [manualEmpId, setManualEmpId] = useState<string>('');
  const [manualDate, setManualDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [manualCheckIn, setManualCheckIn] = useState<string>('09:15 AM');
  const [manualCheckOut, setManualCheckOut] = useState<string>('05:30 PM');
  const [manualMode, setManualMode] = useState<WorkMode>('Office');
  const [manualLocation, setManualLocation] = useState<string>('Main HQ Office');

  // Edit Employee Modal state
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState<boolean>(false);
  const [isNewEmployee, setIsNewEmployee] = useState<boolean>(false);

  // Settings form states
  const [settingsStartTime, setSettingsStartTime] = useState<string>(officeStartTime);
  const [settingsGraceMinutes, setSettingsGraceMinutes] = useState<number>(graceMinutes);
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');

  // Handle Authentication
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      setAuthError('');
      showToast('Authenticated', 'Manager Access Granted.', 'success');
    } else {
      setAuthError('Incorrect manager password.');
      showToast('Access Denied', 'Invalid password entered.', 'error');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
  };

  // Filter calculations
  const filteredRecords = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return records.filter((r) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = r.employeeName.toLowerCase().includes(query);
        const matchesId = r.employeeId.toLowerCase().includes(query);
        const matchesDept = (r.department || '').toLowerCase().includes(query);
        const matchesLoc = (r.location || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesDept && !matchesLoc) return false;
      }

      // Department filter
      if (selectedDeptFilter !== 'ALL') {
        if ((r.department || '').toLowerCase() !== selectedDeptFilter.toLowerCase()) return false;
      }

      // Late Status filter
      if (selectedLateStatus !== 'ALL') {
        if (selectedLateStatus === 'Late' && r.lateStatus !== 'Late') return false;
        if (selectedLateStatus === 'On-Time' && r.lateStatus !== 'On-Time') return false;
      }

      // Work Mode filter
      if (selectedWorkMode !== 'ALL' && r.workMode !== selectedWorkMode) {
        return false;
      }

      // Date range filter
      if (selectedDateRange === 'TODAY') {
        if (r.date !== todayStr) return false;
      } else if (selectedDateRange === '7D') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
        if (r.date < sevenDaysAgo) return false;
      } else if (selectedDateRange === 'CUSTOM') {
        if (customStartDate && r.date < customStartDate) return false;
        if (customEndDate && r.date > customEndDate) return false;
      }

      return true;
    });
  }, [
    records,
    searchQuery,
    selectedDeptFilter,
    selectedLateStatus,
    selectedWorkMode,
    selectedDateRange,
    customStartDate,
    customEndDate,
  ]);

  // Aggregate KPI metrics
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalRecords = records.length;
    const todayRecords = records.filter((r) => r.date === todayStr);
    const todayPresentCount = todayRecords.length;
    const currentlyOnDuty = todayRecords.filter((r) => !r.checkOutTime).length;

    const onTimeTotal = records.filter((r) => r.lateStatus === 'On-Time').length;
    const lateTotal = records.filter((r) => r.lateStatus === 'Late').length;
    const onTimePercentage = totalRecords > 0 ? Math.round((onTimeTotal / totalRecords) * 100) : 0;

    return {
      totalRecords,
      todayPresentCount,
      currentlyOnDuty,
      onTimeTotal,
      lateTotal,
      onTimePercentage,
    };
  }, [records]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(e.department));
    records.forEach((r) => set.add(r.department));
    return Array.from(set).filter(Boolean).sort();
  }, [employees, records]);

  // Pagination logic
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  // Handle open Edit Record Modal
  const handleOpenEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditRecordModalOpen(true);
  };

  // Handle open Add Employee Modal
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setIsNewEmployee(true);
    setIsEmployeeModalOpen(true);
  };

  // Handle open Edit Employee Modal
  const handleOpenEditEmployee = (emp: EmployeeProfile) => {
    setEditingEmployee(emp);
    setIsNewEmployee(false);
    setIsEmployeeModalOpen(true);
  };

  // Handle submit manual entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEmpName.trim() || !manualEmpId.trim()) {
      showToast('Validation Error', 'Employee name and ID are required.', 'error');
      return;
    }

    // Determine late status
    const match = manualCheckIn.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    let isLate = false;
    let lateMins = 0;
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridian = (match[3] || '').toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;
      const [startH, startM] = officeStartTime.split(':').map(Number);
      const limitMins = (startH || 9) * 60 + (startM || 30) + graceMinutes;
      const punchMins = h * 60 + m;
      if (punchMins > limitMins) {
        isLate = true;
        lateMins = punchMins - limitMins;
      }
    }

    // Match department from roster if available
    const matchedEmp = employees.find(
      (e) =>
        e.id.toLowerCase() === manualEmpId.trim().toLowerCase() ||
        e.name.toLowerCase() === manualEmpName.trim().toLowerCase()
    );
    const dept = matchedEmp?.department || 'Operations';

    const newRec: AttendanceRecord = {
      id: `manual-${manualDate}-${manualEmpId}-${Date.now()}`,
      slNo: records.length + 1,
      date: manualDate,
      employeeId: manualEmpId.trim(),
      employeeName: manualEmpName.trim(),
      department: dept,
      checkInTime: manualCheckIn.trim(),
      checkInTimestamp: new Date(`${manualDate}T09:00:00`).getTime(),
      checkOutTime: manualCheckOut.trim() ? manualCheckOut.trim() : null,
      checkOutTimestamp: manualCheckOut.trim() ? new Date(`${manualDate}T17:30:00`).getTime() : null,
      workMode: manualMode,
      location: manualLocation.trim() || 'Main HQ Office',
      lateStatus: isLate ? 'Late' : 'On-Time',
      lateMinutes: lateMins,
      totalHours: manualCheckOut.trim() ? '8h 15m' : '--',
      syncedToSheet: false,
      notes: 'Manually logged by Manager',
      createdAt: Date.now(),
    };

    onAddManualRecord(newRec);
    showToast('Record Created', `Manual attendance logged for ${manualEmpName}.`, 'success');
    setShowManualModal(false);
  };

  // Handle Save Policy Settings
  const handleSavePolicies = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateOfficeStartTime(settingsStartTime);
    onUpdateGraceMinutes(Number(settingsGraceMinutes) || 0);
    showToast('Policy Saved', `Cutoff set to ${settingsStartTime} with ${settingsGraceMinutes}m grace.`, 'success');
  };

  // Handle Password Change
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPasswordInput !== adminPassword) {
      showToast('Error', 'Current password is incorrect.', 'error');
      return;
    }
    if (newPasswordInput.length < 4) {
      showToast('Validation Error', 'New password must be at least 4 characters.', 'error');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showToast('Validation Error', 'New passwords do not match.', 'error');
      return;
    }
    onUpdateAdminPassword(newPasswordInput);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  // Handle CSV Export with Filter
  const handleExportFilter = (type: 'today' | 'monthly' | 'yearly' | 'all') => {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // "YYYY-MM"
    const currentYear = today.substring(0, 4); // "YYYY"

    let targetRecords = records;
    let label = 'all_records';

    if (type === 'today') {
      targetRecords = records.filter((r) => r.date === today);
      label = `today_${today}`;
    } else if (type === 'monthly') {
      targetRecords = records.filter((r) => r.date.startsWith(currentMonth));
      label = `monthly_${currentMonth}`;
    } else if (type === 'yearly') {
      targetRecords = records.filter((r) => r.date.startsWith(currentYear));
      label = `yearly_${currentYear}`;
    } else {
      targetRecords = filteredRecords.length > 0 ? filteredRecords : records;
      label = 'attendance_filtered';
    }

    if (targetRecords.length === 0) {
      showToast('Export Empty', `No attendance records found for ${type} export.`, 'warning');
      return;
    }

    exportAttendanceToCSV(targetRecords, `attendance_${label}`);
    showToast('Export Success', `Exported ${targetRecords.length} records (${type}).`, 'success');
  };

  // If NOT authenticated, show password gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 shadow-lg transition-colors">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Manager Access Portal
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Enter the manager authentication password to access full editing controls, records, and settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Manager Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setAuthError('');
                }}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1.5 font-medium">{authError}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock Manager Console</span>
          </button>

          <div className="text-center pt-2">
            
          </div>
        </form>
      </div>
    );
  }

  // Authenticated Manager Console
  return (
    <div className="space-y-6">
      {/* Edit Record Modal */}
      <EditRecordModal
        isOpen={isEditRecordModalOpen}
        onClose={() => {
          setIsEditRecordModalOpen(false);
          setEditingRecord(null);
        }}
        record={editingRecord}
        onSave={onUpdateRecord}
        officeStartTime={officeStartTime}
        employees={employees}
      />

      {/* Edit Employee Modal */}
      <EditEmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSave={(emp) => {
          if (isNewEmployee) {
            onAddEmployee(emp);
          } else {
            onUpdateEmployee(emp);
          }
        }}
        isNew={isNewEmployee}
      />

      {/* Top Banner & Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Manager &amp; HR Admin Console
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Full Edit Privileges
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Edit any attendance record, manage staff directory, and configure company policies.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>Export:</span>
              </span>
              <button
                type="button"
                onClick={() => handleExportFilter('today')}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors shadow-xs"
                title="Export today's attendance"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleExportFilter('monthly')}
                className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                title="Export this month's attendance"
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => handleExportFilter('yearly')}
                className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                title="Export this year's attendance"
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => handleExportFilter('all')}
                className="px-2.5 py-1 text-xs font-semibold rounded text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"
                title="Export all records"
              >
                All
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-semibold text-xs rounded-lg transition-colors border border-rose-200 dark:border-rose-900"
            >
              Lock Console
            </button>
          </div>
        </div>

        {/* Manager Section Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setPortalTab('records')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors ${
              portalTab === 'records'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Attendance Records ({records.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('team')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors ${
              portalTab === 'team'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff Directory ({employees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setPortalTab('settings')}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-colors ${
              portalTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Policy &amp; Security Settings</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: ATTENDANCE RECORDS */}
      {portalTab === 'records' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Records
              </span>
              <span className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1 block">
                {metrics.totalRecords}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Historical logs</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Today Present
              </span>
              <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                {metrics.todayPresentCount}
              </span>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 block font-semibold">
                {metrics.currentlyOnDuty} active on clock
              </span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                On-Time Rate
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                {metrics.onTimePercentage}%
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">{metrics.onTimeTotal} on-time arrivals</span>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm transition-colors">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Late Incidents
              </span>
              <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
                {metrics.lateTotal}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">After {officeStartTime} AM</span>
            </div>
          </div>

          {/* Records Search and Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search by Employee Name, ID, Department, or Branch..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Manual Record</span>
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Date Range Selector */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(['30D', '7D', 'TODAY', 'CUSTOM'] as const).map((range) => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => {
                      setSelectedDateRange(range);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 font-semibold rounded ${
                      selectedDateRange === range
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {range === '30D' ? 'Past 30 Days' : range === '7D' ? 'Last 7 Days' : range === 'TODAY' ? 'Today' : 'Custom'}
                  </button>
                ))}
              </div>

              {/* Department Dropdown */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => {
                  setSelectedDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Late Status Filter */}
              <select
                value={selectedLateStatus}
                onChange={(e) => {
                  setSelectedLateStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="On-Time">On-Time</option>
                <option value="Late">Late Only</option>
              </select>

              {/* Work Mode Filter */}
              <select
                value={selectedWorkMode}
                onChange={(e) => {
                  setSelectedWorkMode(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Work Modes</option>
                <option value="Office">Office</option>
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
                <option value="Field Work">Field Work</option>
              </select>
            </div>

            {/* Custom Date Range Picker */}
            {selectedDateRange === 'CUSTOM' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">From Date:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
                <span className="font-semibold text-slate-600 dark:text-slate-300">To Date:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Attendance Table with Edit and Delete Action Buttons */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Showing <span className="font-bold text-slate-900 dark:text-white">{filteredRecords.length}</span> records
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Sl</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Check-In</th>
                    <th className="py-3 px-3">Check-Out</th>
                    <th className="py-3 px-3">Late Status</th>
                    <th className="py-3 px-3">Total Hours</th>
                    <th className="py-3 px-3">Work Mode</th>
                    <th className="py-3 px-3">Location / Branch</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500 font-sans">
                        No attendance records found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, index) => {
                      const sl = (currentPage - 1) * pageSize + index + 1;
                      const isLate = r.lateStatus === 'Late';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500">{sl}</td>
                          <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">
                            {r.date}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="font-bold text-slate-900 dark:text-white">{r.employeeName}</div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {r.employeeId} · <span className="font-sans text-slate-400">{r.department}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap tabular-nums">
                            {r.checkInTime}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap tabular-nums">
                            {r.checkOutTime || '--'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-sans">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                isLate
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                              }`}
                            >
                              {isLate ? (
                                <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              )}
                              {r.lateStatus}
                              {r.lateMinutes > 0 ? ` (+${r.lateMinutes}m)` : ''}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-semibold tabular-nums">
                            {r.totalHours || '--'}
                          </td>
                          <td className="py-2.5 px-3 font-sans text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {r.workMode}
                          </td>
                          <td className="py-2.5 px-3 font-sans max-w-[190px]">
                            <div className="truncate text-slate-700 dark:text-slate-300 font-medium" title={r.location}>
                              {r.location}
                            </div>
                            {r.notes && (
                              <div className="truncate text-[10px] text-indigo-600 dark:text-indigo-400" title={r.notes}>
                                Note: {r.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Edit Record Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditRecord(r)}
                                className="p-1.5 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                                title="Edit this record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Record Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Delete attendance record for ${r.employeeName} on ${r.date}?`)) {
                                    onDeleteRecord(r.id);
                                    showToast('Deleted', 'Attendance record removed.', 'info');
                                  }
                                }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Delete this entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: STAFF & TEAM DIRECTORY MANAGEMENT */}
      {portalTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Team &amp; Employee Directory ({employees.length} Members)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Managers can edit employee designations, update names and badges, or register new team members.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add New Team Member</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${emp.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-xs`}
                    >
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {emp.name}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {emp.id}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {emp.department}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[170px]" title={emp.role}>
                    {emp.role}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditEmployee(emp)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 text-indigo-500" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove ${emp.name} (${emp.id}) from the employee directory?`)) {
                          onDeleteEmployee(emp.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                      title="Remove employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: SYSTEM & POLICY SETTINGS */}
      {portalTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card A: Office Start & Grace Period */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Attendance Timing &amp; Late Policies
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure cutoff thresholds for automatic late tagging.
                </p>
              </div>
            </div>

            <form onSubmit={handleSavePolicies} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Office Start Cutoff Time (HH:mm)
                </label>
                <input
                  type="time"
                  value={settingsStartTime}
                  onChange={(e) => setSettingsStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Punches after this time are automatically marked as Late. Current: {officeStartTime} AM.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Allowed Grace Period (Minutes)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={settingsGraceMinutes}
                  onChange={(e) => setSettingsGraceMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Additional buffer minutes allowed before late penalty kicks in.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                Save Attendance Policy
              </button>
            </form>
          </div>

          {/* Card B: Manager Password Security */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
              <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Change Manager Access Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update the hardcoded / manual password used to unlock this manager console.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Min 4 characters"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Retype new password"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
              >
                Update Manager Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manual Record Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 text-xs transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Manual Attendance Log
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              {/* Quick Select from Roster */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Select Employee From Roster
                </label>
                <select
                  onChange={(e) => {
                    const emp = employees.find((x) => x.id === e.target.value);
                    if (emp) {
                      setManualEmpName(emp.name);
                      setManualEmpId(emp.id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                >
                  <option value="">-- Choose Existing Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id} - {emp.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Employee Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualEmpName}
                    onChange={(e) => setManualEmpName(e.target.value)}
                    placeholder="e.g. Ripon"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualEmpId}
                    onChange={(e) => setManualEmpId(e.target.value)}
                    placeholder="e.g. EMP-01"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Check-In Time *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualCheckIn}
                    onChange={(e) => setManualCheckIn(e.target.value)}
                    placeholder="09:15 AM"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Check-Out Time
                  </label>
                  <input
                    type="text"
                    value={manualCheckOut}
                    onChange={(e) => setManualCheckOut(e.target.value)}
                    placeholder="05:30 PM"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Work Mode *
                  </label>
                  <select
                    value={manualMode}
                    onChange={(e) => setManualMode(e.target.value as WorkMode)}
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Office">Office</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Field Work">Field Work</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Location / Branch
                  </label>
                  <input
                    type="text"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    placeholder="e.g. Main HQ Office"
                    className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-xs"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
