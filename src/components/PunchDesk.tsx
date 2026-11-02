import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Building,
  Laptop,
  Briefcase,
  Car,
  Building2,
  ArrowRight,
} from 'lucide-react';
import { AttendanceRecord, EmployeeProfile, WorkMode } from '../types/attendance';
import { DEFAULT_EMPLOYEES } from '../data/mockData';

interface PunchDeskProps {
  onCheckIn: (payload: {
    employeeId: string;
    employeeName: string;
    department: string;
    workMode: WorkMode;
    locationText: string;
  }) => Promise<void>;
  onCheckOut: (payload: {
    employeeId: string;
    employeeName: string;
    locationText: string;
  }) => Promise<void>;
  todayRecords: AttendanceRecord[];
  officeStartTime: string; // e.g. "09:30"
  gasConnected: boolean;
  onOpenGasSetup: () => void;
  onNavigateToDashboard?: () => void;
  employees?: EmployeeProfile[];
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const PunchDesk: React.FC<PunchDeskProps> = ({
  onCheckIn,
  onCheckOut,
  todayRecords,
  officeStartTime,
  gasConnected,
  onOpenGasSetup,
  onNavigateToDashboard,
  employees = DEFAULT_EMPLOYEES,
  showToast,
}) => {
  // Form state (default to EMP-01 Ripon)
  const [selectedEmpId, setSelectedEmpId] = useState<string>('EMP-01');
  const [customName, setCustomName] = useState<string>('');
  const [customId, setCustomId] = useState<string>('');
  const [isCustomEmployee, setIsCustomEmployee] = useState<boolean>(false);
  const [workMode, setWorkMode] = useState<WorkMode>('Office');
  const [locationName, setLocationName] = useState<string>('Main HQ Office');

  // Late window live checker
  const [isCurrentlyLate, setIsCurrentlyLate] = useState<boolean>(false);
  const [lateMinsDifference, setLateMinsDifference] = useState<number>(0);

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-update default location name when workMode changes if using standard presets
  const handleWorkModeChange = (mode: WorkMode) => {
    setWorkMode(mode);
    if (mode === 'Office') setLocationName('Main HQ Office');
    else if (mode === 'Remote') setLocationName('Remote / Home Office');
    else if (mode === 'On-site') setLocationName('Client On-site');
    else if (mode === 'Field Work') setLocationName('Field Operations');
  };

  // Determine active employee details
  const activeEmployee: EmployeeProfile = isCustomEmployee
    ? {
        id: customId || 'EMP-NEW',
        name: customName || 'Guest Employee',
        department: 'Operations',
        role: 'Contractor / Staff',
        avatarColor: 'bg-indigo-600',
      }
    : employees.find((e) => e.id === selectedEmpId) || employees[0] || DEFAULT_EMPLOYEES[0];

  // Find today's record for this employee
  const currentTodayRecord = todayRecords.find(
    (r) =>
      r.employeeId.toLowerCase() === activeEmployee.id.toLowerCase() ||
      r.employeeName.toLowerCase() === activeEmployee.name.toLowerCase()
  );

  // Update late logic ticker
  useEffect(() => {
    const checkLateStatus = () => {
      const now = new Date();
      const [startH, startM] = officeStartTime.split(':').map(Number);
      const officeStartMinutes = (startH || 9) * 60 + (startM || 30);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      if (currentMinutes > officeStartMinutes) {
        setIsCurrentlyLate(true);
        setLateMinsDifference(currentMinutes - officeStartMinutes);
      } else {
        setIsCurrentlyLate(false);
        setLateMinsDifference(0);
      }
    };

    checkLateStatus();
    const interval = setInterval(checkLateStatus, 1000);
    return () => clearInterval(interval);
  }, [officeStartTime]);

  // Handle Check-in button click
  const handleCheckInSubmit = async () => {
    if (isCustomEmployee && (!customName.trim() || !customId.trim())) {
      showToast('Validation Error', 'Please enter both Employee Name and Employee ID.', 'error');
      return;
    }

    if (currentTodayRecord) {
      showToast(
        'Already Checked In',
        `${activeEmployee.name} already checked in at ${currentTodayRecord.checkInTime} today.`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    await onCheckIn({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      department: activeEmployee.department,
      workMode: workMode,
      locationText: locationName.trim() || 'Main HQ Office',
    });

    setIsSubmitting(false);
  };

  // Handle Check-out button click
  const handleCheckOutSubmit = async () => {
    if (!currentTodayRecord) {
      showToast('No Check-In Record', `Cannot check out: ${activeEmployee.name} has not checked in today.`, 'error');
      return;
    }

    if (currentTodayRecord.checkOutTime) {
      showToast('Already Checked Out', `${activeEmployee.name} checked out earlier at ${currentTodayRecord.checkOutTime}.`, 'warning');
      return;
    }

    setIsSubmitting(true);
    await onCheckOut({
      employeeId: activeEmployee.id,
      employeeName: activeEmployee.name,
      locationText: locationName.trim() || 'Main HQ Office',
    });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Policy & Office Start Time Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Policy &amp; Real-time Evaluation</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  Office Start: {officeStartTime} AM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Punches logged after <strong className="text-slate-700 dark:text-slate-300">{officeStartTime} AM</strong> are automatically
                marked as <span className="text-rose-600 dark:text-rose-400 font-bold">Late</span>. Records sync directly to your Google Sheet.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                isCurrentlyLate
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}
            >
              {isCurrentlyLate ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Late Window Active (+{lateMinsDifference} mins past {officeStartTime})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>On-Time Check-In Window Active</span>
                </>
              )}
            </div>

            {onNavigateToDashboard && (
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1.5"
              >
                <span>Today's Dashboard</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                  {todayRecords.length}
                </span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: Check-In / Check-Out Controls (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Digital Punch Terminal</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Record your daily shift check-in and check-out with automatic on-time calculation.
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setIsCustomEmployee(false)}
                className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                  !isCustomEmployee
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Team Directory
              </button>
              <button
                type="button"
                onClick={() => setIsCustomEmployee(true)}
                className={`px-3 py-1 font-semibold rounded-md transition-colors ${
                  isCustomEmployee
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Manual Entry
              </button>
            </div>
          </div>

          {/* Employee Selector or Inputs */}
          {!isCustomEmployee ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Team Member
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {employees.map((emp) => {
                  const isSelected = selectedEmpId === emp.id;
                  const empToday = todayRecords.find((r) => r.employeeId === emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => setSelectedEmpId(emp.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-600/30'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{emp.name}</span>
                        {empToday && (
                          <span
                            className={`w-2 h-2 rounded-full ${
                              empToday.checkOutTime ? 'bg-slate-400 dark:bg-slate-500' : 'bg-emerald-500'
                            }`}
                            title={empToday.checkOutTime ? 'Checked out' : 'Checked in'}
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        <span>{emp.id}</span>
                        <span className="truncate text-[10px] text-slate-400 dark:text-slate-500 font-sans" title={`${emp.department} - ${emp.role}`}>
                          {emp.department}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Custom Employee Credentials <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Jordan Hayes"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Employee ID / Badge No</label>
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="e.g. EMP-999"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Work Mode / How Joining Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              How Joining (Work Mode) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { mode: 'Office' as WorkMode, icon: Building, label: 'Office Campus', desc: 'Main HQ / Branch' },
                { mode: 'Remote' as WorkMode, icon: Laptop, label: 'Remote / WFH', desc: 'Home Office' },
                { mode: 'On-site' as WorkMode, icon: Briefcase, label: 'Client On-site', desc: 'Partner Location' },
                { mode: 'Field Work' as WorkMode, icon: Car, label: 'Field / Transit', desc: 'Field Operations' },
              ].map(({ mode, icon: Icon, label, desc }) => {
                const isActive = workMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleWorkModeChange(mode)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isActive
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-600 dark:ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`} />
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Location / Branch Field (Clean, no GPS / Maps) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Work Location / Office Branch
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Main HQ Office, Floor 3 or Home Office"
                className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => setLocationName('Main HQ Office')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Main HQ
              </button>
              <button
                type="button"
                onClick={() => setLocationName('Downtown Branch')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Downtown Branch
              </button>
              <button
                type="button"
                onClick={() => setLocationName('Home Office')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Home Office
              </button>
              <button
                type="button"
                onClick={() => setLocationName('Client Site')}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                Client Site
              </button>
            </div>
          </div>

          {/* Check-In and Check-Out Primary Action Grid */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Check-In Button */}
            <button
              type="button"
              onClick={handleCheckInSubmit}
              disabled={isSubmitting || !!currentTodayRecord}
              className={`py-4 px-6 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all ${
                currentTodayRecord
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow'
              }`}
            >
              <LogIn className="w-5 h-5" />
              <span>
                {currentTodayRecord
                  ? `Checked In at ${currentTodayRecord.checkInTime}`
                  : 'Punch Check-In'}
              </span>
            </button>

            {/* Check-Out Button */}
            <button
              type="button"
              onClick={handleCheckOutSubmit}
              disabled={
                isSubmitting ||
                !currentTodayRecord ||
                Boolean(currentTodayRecord.checkOutTime)
              }
              className={`py-4 px-6 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all ${
                !currentTodayRecord
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : currentTodayRecord.checkOutTime
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
                  : 'bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white hover:shadow'
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span>
                {currentTodayRecord?.checkOutTime
                  ? `Checked Out at ${currentTodayRecord.checkOutTime}`
                  : currentTodayRecord
                  ? 'Punch Check-Out'
                  : 'Check-In Required First'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Session Card & Backend Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active Employee Status Box */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Today's Employee Record
              </h4>
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl ${activeEmployee.avatarColor} text-white flex items-center justify-center font-bold text-base shadow-sm`}
              >
                {activeEmployee.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeEmployee.name}</h4>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono">
                  <span>{activeEmployee.id}</span>
                  <span>·</span>
                  <span className="font-sans">{activeEmployee.department}</span>
                </div>
              </div>
            </div>

            {/* Attendance Details Grid */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3.5 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Current Status:</span>
                {currentTodayRecord ? (
                  currentTodayRecord.checkOutTime ? (
                    <span className="px-2 py-0.5 rounded font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Completed Shift
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      On Duty (Checked In)
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300">
                    Not Checked In Yet
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Check-In Time:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {currentTodayRecord ? currentTodayRecord.checkInTime : '--'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Late Evaluation:</span>
                {currentTodayRecord ? (
                  <span
                    className={`font-semibold ${
                      currentTodayRecord.lateStatus === 'Late'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {currentTodayRecord.lateStatus}
                    {currentTodayRecord.lateMinutes > 0 && ` (+${currentTodayRecord.lateMinutes}m)`}
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">--</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Check-Out Time:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  {currentTodayRecord?.checkOutTime || '--'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Total Duration:</span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 tabular-nums">
                  {currentTodayRecord?.totalHours || '--'}
                </span>
              </div>
            </div>

            {/* Google Sheets Sync Pill */}
            <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-indigo-950 dark:text-indigo-200 block">Google Sheets Sync Engine</span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {gasConnected
                    ? 'Connected. Punches write directly to your Google Sheet.'
                    : 'Running in local storage fallback mode.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenGasSetup}
                className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 underline shrink-0 hover:text-indigo-900 dark:hover:text-indigo-300"
              >
                Configure
              </button>
            </div>
          </div>

          {/* Quick instructions for employees */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-2 text-xs text-slate-500 dark:text-slate-400 transition-colors">
            <span className="font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider text-[11px] block">
              Employee Punch Guidelines
            </span>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Punches logged after {officeStartTime} AM receive automatic Late tagging.</li>
              <li>Select your work mode and office location before punching.</li>
              <li>Always remember to punch Check-Out at the end of your shift to record total hours.</li>
            </ul>
          </div>

        </div>

      </div>
    </div>
  );
};
