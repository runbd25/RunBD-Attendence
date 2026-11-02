import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Search,
  Building2,
  Laptop,
  Briefcase,
  Car,
  Activity,
  ArrowRight,
  UserX,
  Timer,
  Calendar,
  Sparkles,
  Edit2,
} from 'lucide-react';
import { AttendanceRecord, WorkMode, EmployeeProfile } from '../types/attendance';
import { DEFAULT_EMPLOYEES } from '../data/mockData';
import { EditRecordModal } from './EditRecordModal';

interface TodayDashboardProps {
  todayRecords: AttendanceRecord[];
  allRecords: AttendanceRecord[];
  officeStartTime: string;
  employees?: EmployeeProfile[];
  onCheckOut: (payload: {
    employeeId: string;
    employeeName: string;
    locationText: string;
  }) => Promise<void>;
  onUpdateRecord?: (updatedRecord: AttendanceRecord) => void;
  onNavigateToPunch: () => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TodayDashboard: React.FC<TodayDashboardProps> = ({
  todayRecords,
  officeStartTime,
  employees = DEFAULT_EMPLOYEES,
  onCheckOut,
  onUpdateRecord,
  onNavigateToPunch,
  showToast,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'working' | 'completed' | 'late' | 'absent'>('all');
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedWorkMode, setSelectedWorkMode] = useState<string>('all');
  const [activeTabMode, setActiveTabMode] = useState<'table' | 'stream'>('table');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [checkingOutEmpId, setCheckingOutEmpId] = useState<string | null>(null);

  // Live timer tick every 30 seconds to refresh working hours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Today's formatted date string
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Compute live elapsed time for an employee currently working
  const calculateLiveDuration = (checkInTimeStr: string, checkInTimestamp?: number) => {
    try {
      let startMs = checkInTimestamp;
      if (!startMs) {
        const match = checkInTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!match) return '--';
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const meridian = (match[3] || '').toUpperCase();
        if (meridian === 'PM' && h < 12) h += 12;
        if (meridian === 'AM' && h === 12) h = 0;
        const d = new Date();
        d.setHours(h, m, 0, 0);
        startMs = d.getTime();
      }
      const diffMs = Math.max(0, currentTime.getTime() - startMs);
      const diffMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hrs}h ${mins}m`;
    } catch {
      return '--';
    }
  };

  // Identify team members who have NOT checked in yet today
  const absentEmployees = useMemo(() => {
    const presentIds = new Set(todayRecords.map((r) => r.employeeId.toLowerCase()));
    return employees.filter((emp) => !presentIds.has(emp.id.toLowerCase()));
  }, [todayRecords, employees]);

  // Overall Today KPIs
  const stats = useMemo(() => {
    const totalPresent = todayRecords.length;
    const workingNow = todayRecords.filter((r) => !r.checkOutTime).length;
    const completed = todayRecords.filter((r) => Boolean(r.checkOutTime)).length;
    const lateCount = todayRecords.filter((r) => r.lateStatus === 'Late').length;
    const onTimeCount = totalPresent - lateCount;
    const onTimeRate = totalPresent > 0 ? Math.round((onTimeCount / totalPresent) * 100) : 100;
    const totalExpected = employees.length;
    const attendanceRate = totalExpected > 0 ? Math.round((totalPresent / totalExpected) * 100) : 0;

    // Work Mode distribution
    const modeCounts = {
      Office: todayRecords.filter((r) => r.workMode === 'Office').length,
      Remote: todayRecords.filter((r) => r.workMode === 'Remote').length,
      'On-site': todayRecords.filter((r) => r.workMode === 'On-site').length,
      'Field Work': todayRecords.filter((r) => r.workMode === 'Field Work').length,
    };

    // Location counts
    const locationCounts: Record<string, number> = {};
    todayRecords.forEach((r) => {
      const loc = r.location.split(' (Out:')[0].trim();
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });

    return {
      totalPresent,
      workingNow,
      completed,
      lateCount,
      onTimeCount,
      onTimeRate,
      totalExpected,
      attendanceRate,
      modeCounts,
      locationCounts,
    };
  }, [todayRecords]);

  // Chronological activity events (Check-ins and Check-outs)
  const activityEvents = useMemo(() => {
    interface ActivityItem {
      id: string;
      recordId: string;
      employeeId: string;
      employeeName: string;
      department: string;
      type: 'checkIn' | 'checkOut';
      time: string;
      timestamp: number;
      workMode: WorkMode;
      location: string;
      lateStatus?: string;
      lateMinutes?: number;
      totalHours?: string;
    }

    const events: ActivityItem[] = [];

    todayRecords.forEach((r) => {
      // Check-In event
      events.push({
        id: `${r.id}-in`,
        recordId: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        type: 'checkIn',
        time: r.checkInTime,
        timestamp: r.checkInTimestamp || 0,
        workMode: r.workMode,
        location: r.location.split(' (Out:')[0].trim(),
        lateStatus: r.lateStatus,
        lateMinutes: r.lateMinutes,
      });

      // Check-Out event (if checked out)
      if (r.checkOutTime) {
        events.push({
          id: `${r.id}-out`,
          recordId: r.id,
          employeeId: r.employeeId,
          employeeName: r.employeeName,
          department: r.department,
          type: 'checkOut',
          time: r.checkOutTime,
          timestamp: r.checkOutTimestamp || (r.checkInTimestamp ? r.checkInTimestamp + 28800000 : 0),
          workMode: r.workMode,
          location: r.location,
          totalHours: r.totalHours,
        });
      }
    });

    // Sort descending by event timestamp / time
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }, [todayRecords]);

  // Filtered records for the roster table
  const filteredTodayRecords = useMemo(() => {
    return todayRecords.filter((r) => {
      // Search filter
      const matchesSearch =
        !searchTerm.trim() ||
        r.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.location.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
      if (filterStatus === 'working' && Boolean(r.checkOutTime)) return false;
      if (filterStatus === 'completed' && !r.checkOutTime) return false;
      if (filterStatus === 'late' && r.lateStatus !== 'Late') return false;

      // Department filter
      if (selectedDept !== 'all' && r.department.toLowerCase() !== selectedDept.toLowerCase()) {
        return false;
      }

      // Work Mode filter
      if (selectedWorkMode !== 'all' && r.workMode !== selectedWorkMode) {
        return false;
      }

      return true;
    });
  }, [todayRecords, searchTerm, filterStatus, selectedDept, selectedWorkMode]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    todayRecords.forEach((r) => set.add(r.department));
    employees.forEach((e) => set.add(e.department));
    return Array.from(set).sort();
  }, [todayRecords, employees]);

  // Handle direct Check-Out from the dashboard
  const handleDirectCheckOut = async (record: AttendanceRecord) => {
    setCheckingOutEmpId(record.employeeId);
    try {
      await onCheckOut({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        locationText: record.location,
      });
      showToast('Shift Completed', `${record.employeeName} checked out successfully.`, 'success');
    } finally {
      setCheckingOutEmpId(null);
    }
  };

  const getWorkModeIcon = (mode: WorkMode) => {
    switch (mode) {
      case 'Office':
        return Building2;
      case 'Remote':
        return Laptop;
      case 'On-site':
        return Briefcase;
      case 'Field Work':
        return Car;
      default:
        return Building2;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Title, Live Date, and Action Switcher */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Today's Activity Dashboard
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayFormatted}</span>
              <span>·</span>
              <span>
                Standard Cutoff: <strong className="text-slate-700 dark:text-slate-300">{officeStartTime} AM</strong>
              </span>
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTabMode('table')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                  activeTabMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Roster Table ({todayRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabMode('stream')}
                className={`px-3 py-1.5 font-semibold rounded-md transition-colors ${
                  activeTabMode === 'stream'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Live Event Stream ({activityEvents.length})
              </button>
            </div>

            <button
              type="button"
              onClick={onNavigateToPunch}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Punch Terminal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Currently Working / On-Duty */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'working' ? 'all' : 'working')}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
            filterStatus === 'working'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Working Now
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.workingNow}
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              On the clock
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Checked in and currently active on shift
          </p>
        </div>

        {/* Card 2: Total Check-Ins & Attendance Rate */}
        <div
          onClick={() => setFilterStatus('all')}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
            filterStatus === 'all'
              ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Today's Arrivals
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <LogIn className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.totalPresent}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              / {stats.totalExpected} staff ({stats.attendanceRate}%)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {absentEmployees.length > 0 ? `${absentEmployees.length} pending check-in` : 'All team checked in'}
          </p>
        </div>

        {/* Card 3: Completed Shifts / Check-Outs */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed')}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
            filterStatus === 'completed'
              ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/40 dark:bg-slate-800/40'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Completed Shifts
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.completed}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              staff punched out
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Shift finished with logged working duration
          </p>
        </div>

        {/* Card 4: On-Time Performance */}
        <div
          onClick={() => setFilterStatus(filterStatus === 'late' ? 'all' : 'late')}
          className={`cursor-pointer bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${
            filterStatus === 'late'
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20 dark:bg-rose-950/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              On-Time Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {stats.onTimeRate}%
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                stats.lateCount > 0
                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {stats.lateCount} Late
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {stats.onTimeCount} on-time arrivals before {officeStartTime} AM
          </p>
        </div>
      </div>

      {/* Quick Work Mode & Branch Distribution Pills */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Work Modes Today:
          </span>
          <div className="flex flex-wrap gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-indigo-500" />
              Office: <strong className="text-slate-900 dark:text-white">{stats.modeCounts.Office}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Laptop className="w-3 h-3 text-emerald-500" />
              Remote: <strong className="text-slate-900 dark:text-white">{stats.modeCounts.Remote}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Briefcase className="w-3 h-3 text-amber-500" />
              On-site: <strong className="text-slate-900 dark:text-white">{stats.modeCounts['On-site']}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5">
              <Car className="w-3 h-3 text-rose-500" />
              Field: <strong className="text-slate-900 dark:text-white">{stats.modeCounts['Field Work']}</strong>
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          Live Clock: {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3 transition-colors">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search today's employee name, badge ID, department, or location..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 font-semibold rounded ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({todayRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('working')}
                className={`px-2.5 py-1 font-semibold rounded ${
                  filterStatus === 'working'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Working ({stats.workingNow})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`px-2.5 py-1 font-semibold rounded ${
                  filterStatus === 'completed'
                    ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Completed ({stats.completed})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('late')}
                className={`px-2.5 py-1 font-semibold rounded ${
                  filterStatus === 'late'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Late ({stats.lateCount})
              </button>
              {absentEmployees.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('absent')}
                  className={`px-2.5 py-1 font-semibold rounded ${
                    filterStatus === 'absent'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Pending ({absentEmployees.length})
                </button>
              )}
            </div>

            {/* Department Dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Work Mode Dropdown */}
            <select
              value={selectedWorkMode}
              onChange={(e) => setSelectedWorkMode(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Work Modes</option>
              <option value="Office">Office</option>
              <option value="Remote">Remote</option>
              <option value="On-site">On-site</option>
              <option value="Field Work">Field Work</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Either Roster Table or Chronological Live Stream */}
      {activeTabMode === 'table' ? (
        filterStatus === 'absent' ? (
          /* Absent / Pending Check-In List */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Team Members Pending Check-In Today ({absentEmployees.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Staff registered in directory who haven't logged a punch today
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {absentEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg ${emp.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs`}
                    >
                      {emp.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{emp.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {emp.id} · {emp.department}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                    Not Arrived
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Today's Roster Table */
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Today's Staff Activity Roster ({filteredTodayRecords.length})
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Shows all employees who have punched in today
              </span>
            </div>

            {filteredTodayRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <Clock className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-600 opacity-60" />
                <div className="font-semibold text-sm">No today attendance records matching filters</div>
                <p className="text-xs max-w-sm mx-auto">
                  Try clearing your search filters or record check-in at the Punch Terminal.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToPunch}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Go to Punch Desk</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Work Mode</th>
                      <th className="py-3 px-3">Location / Branch</th>
                      <th className="py-3 px-3">Check-In</th>
                      <th className="py-3 px-3">Late Status</th>
                      <th className="py-3 px-3">Check-Out</th>
                      <th className="py-3 px-3">Shift Duration</th>
                      <th className="py-3 px-3">Live Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {filteredTodayRecords.map((rec) => {
                      const WorkIcon = getWorkModeIcon(rec.workMode);
                      const isWorkingNow = !rec.checkOutTime;
                      const liveElapsed = isWorkingNow
                        ? calculateLiveDuration(rec.checkInTime, rec.checkInTimestamp)
                        : rec.totalHours;

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Employee Name & ID */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {rec.employeeName
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {rec.employeeName}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                  {rec.employeeId} · {rec.department}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Work Mode */}
                          <td className="py-3 px-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <WorkIcon className="w-3 h-3 text-indigo-500" />
                              <span>{rec.workMode}</span>
                            </span>
                          </td>

                          {/* Location / Branch */}
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                              {rec.location}
                            </div>
                          </td>

                          {/* Check-In Time */}
                          <td className="py-3 px-3">
                            <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                              <LogIn className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{rec.checkInTime}</span>
                            </div>
                          </td>

                          {/* Late Status */}
                          <td className="py-3 px-3">
                            {rec.lateStatus === 'Late' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Late (+{rec.lateMinutes}m)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>On-Time</span>
                              </span>
                            )}
                          </td>

                          {/* Check-Out Time */}
                          <td className="py-3 px-3">
                            {rec.checkOutTime ? (
                              <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                <LogOut className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{rec.checkOutTime}</span>
                              </div>
                            ) : (
                              <span className="font-mono text-slate-400 dark:text-slate-500 italic">
                                -- (On Clock)
                              </span>
                            )}
                          </td>

                          {/* Shift Duration */}
                          <td className="py-3 px-3 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                isWorkingNow
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {liveElapsed}
                            </span>
                          </td>

                          {/* Live Status Badge */}
                          <td className="py-3 px-3">
                            {isWorkingNow ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Working Now
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                Shift Completed
                              </span>
                            )}
                          </td>

                          {/* Action Column: Edit & Punch Out */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onUpdateRecord && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(rec);
                                    setIsEditModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  title="Edit Record Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isWorkingNow ? (
                                <button
                                  type="button"
                                  onClick={() => handleDirectCheckOut(rec)}
                                  disabled={checkingOutEmpId === rec.employeeId}
                                  className="px-3 py-1.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  <LogOut className="w-3 h-3" />
                                  <span>{checkingOutEmpId === rec.employeeId ? 'Processing...' : 'Punch Out'}</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                  Checked Out
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      ) : (
        /* Chronological Event Stream */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Chronological Today Activity Stream ({activityEvents.length} Events)
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Real-time check-in and check-out event logs
            </span>
          </div>

          {activityEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <Activity className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
              <div className="font-semibold text-sm">No activity events recorded today yet</div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {activityEvents.map((event) => {
                const isCheckIn = event.type === 'checkIn';
                return (
                  <div key={event.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 shadow-xs ${
                        isCheckIn ? 'bg-emerald-600' : 'bg-indigo-600'
                      }`}
                    >
                      {isCheckIn ? <LogIn className="w-2.5 h-2.5" /> : <LogOut className="w-2.5 h-2.5" />}
                    </div>

                    {/* Event Content Card */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/80 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded ${
                              isCheckIn
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300'
                            }`}
                          >
                            {isCheckIn ? 'Check-In' : 'Check-Out'}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {event.employeeName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            ({event.employeeId})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                            {event.time}
                          </span>
                          {isCheckIn && event.lateStatus && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                event.lateStatus === 'Late'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {event.lateStatus}
                              {event.lateMinutes && event.lateMinutes > 0 ? ` (+${event.lateMinutes}m)` : ''}
                            </span>
                          )}
                          {!isCheckIn && event.totalHours && (
                            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Duration: {event.totalHours}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{event.location}</span>
                        </span>
                        <span>·</span>
                        <span>Mode: <strong className="text-slate-700 dark:text-slate-300">{event.workMode}</strong></span>
                        <span>·</span>
                        <span>Dept: <strong className="text-slate-700 dark:text-slate-300">{event.department}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Analytics Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card A: Location Headcount */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Location / Branch Headcount</span>
            </h4>
            <span className="text-xs font-mono text-slate-400">
              {Object.keys(stats.locationCounts).length} locations active
            </span>
          </div>

          <div className="space-y-2">
            {Object.entries(stats.locationCounts).length === 0 ? (
              <p className="text-xs text-slate-400">No active locations logged yet.</p>
            ) : (
              Object.entries(stats.locationCounts).map(([locName, count]) => {
                const pct = stats.totalPresent > 0 ? Math.round((count / stats.totalPresent) * 100) : 0;
                return (
                  <div key={locName} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{locName}</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {count} staff ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card B: Late Arrivals Spotlight */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Late Arrivals Breakdown ({stats.lateCount})</span>
            </h4>
            <span className="text-xs font-mono text-slate-400">Cutoff: {officeStartTime} AM</span>
          </div>

          {stats.lateCount === 0 ? (
            <div className="py-6 text-center text-slate-500 dark:text-slate-400 space-y-1">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                100% On-Time Record Today!
              </div>
              <p className="text-[11px] text-slate-400">All team members arrived before {officeStartTime} AM.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayRecords
                .filter((r) => r.lateStatus === 'Late')
                .map((r) => (
                  <div
                    key={r.id}
                    className="p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{r.employeeName}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 font-mono">
                        ({r.employeeId})
                      </span>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Check-In: <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{r.checkInTime}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      +{r.lateMinutes} mins late
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Record Modal */}
      {onUpdateRecord && (
        <EditRecordModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingRecord(null);
          }}
          record={editingRecord}
          onSave={onUpdateRecord}
          officeStartTime={officeStartTime}
          employees={employees}
        />
      )}
    </div>
  );
};
