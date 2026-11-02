import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Clock,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  User,
  Briefcase,
  FileText,
} from 'lucide-react';
import { AttendanceRecord, WorkMode, LateStatus, EmployeeProfile } from '../types/attendance';

interface EditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSave: (updatedRecord: AttendanceRecord) => void;
  officeStartTime: string;
  employees?: EmployeeProfile[];
}

export const EditRecordModal: React.FC<EditRecordModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  officeStartTime,
  employees = [],
}) => {
  const [date, setDate] = useState<string>(record?.date || '');
  const [employeeName, setEmployeeName] = useState<string>(record?.employeeName || '');
  const [employeeId, setEmployeeId] = useState<string>(record?.employeeId || '');
  const [department, setDepartment] = useState<string>(record?.department || '');
  const [checkInTime, setCheckInTime] = useState<string>(record?.checkInTime || '');
  const [checkOutTime, setCheckOutTime] = useState<string>(record?.checkOutTime || '');
  const [workMode, setWorkMode] = useState<WorkMode>(record?.workMode || 'Office');
  const [location, setLocation] = useState<string>(record?.location || '');
  const [lateStatus, setLateStatus] = useState<LateStatus>(record?.lateStatus || 'On-Time');
  const [lateMinutes, setLateMinutes] = useState<number>(record?.lateMinutes || 0);
  const [totalHours, setTotalHours] = useState<string>(record?.totalHours || '--');
  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [syncedToSheet, setSyncedToSheet] = useState<boolean>(record?.syncedToSheet || false);

  // Sync state whenever record prop changes
  useEffect(() => {
    if (record) {
      setDate(record.date);
      setEmployeeName(record.employeeName);
      setEmployeeId(record.employeeId);
      setDepartment(record.department);
      setCheckInTime(record.checkInTime);
      setCheckOutTime(record.checkOutTime || '');
      setWorkMode(record.workMode);
      setLocation(record.location);
      setLateStatus(record.lateStatus);
      setLateMinutes(record.lateMinutes);
      setTotalHours(record.totalHours);
      setNotes(record.notes || '');
      setSyncedToSheet(record.syncedToSheet);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  // If user picks an employee from roster, auto-fill ID and department
  const handleSelectRosterEmployee = (empId: string) => {
    const found = employees.find((e) => e.id === empId);
    if (found) {
      setEmployeeName(found.name);
      setEmployeeId(found.id);
      setDepartment(found.department);
    }
  };

  // Helper to re-evaluate late status based on check-in time and office start time
  const handleRecalculateLate = () => {
    try {
      const match = checkInTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridian = (match[3] || '').toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;

      const [startH, startM] = officeStartTime.split(':').map(Number);
      const limitMins = (startH || 9) * 60 + (startM || 30);
      const currentMins = h * 60 + m;

      if (currentMins > limitMins) {
        setLateStatus('Late');
        setLateMinutes(currentMins - limitMins);
      } else {
        setLateStatus('On-Time');
        setLateMinutes(0);
      }
    } catch {
      // Keep existing
    }
  };

  // Helper to calculate duration between in and out
  const handleRecalculateDuration = () => {
    if (!checkOutTime.trim()) {
      setTotalHours('--');
      return;
    }

    const parseToMinutes = (tStr: string) => {
      const match = tStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!match) return null;
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const meridian = (match[3] || '').toUpperCase();
      if (meridian === 'PM' && h < 12) h += 12;
      if (meridian === 'AM' && h === 12) h = 0;
      return h * 60 + m;
    };

    const inM = parseToMinutes(checkInTime);
    const outM = parseToMinutes(checkOutTime);

    if (inM === null || outM === null || outM < inM) {
      setTotalHours('--');
      return;
    }

    const diff = outM - inM;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    setTotalHours(`${hrs}h ${mins}m`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: AttendanceRecord = {
      ...record,
      date,
      employeeName: employeeName.trim(),
      employeeId: employeeId.trim(),
      department: department.trim(),
      checkInTime: checkInTime.trim(),
      checkOutTime: checkOutTime.trim() ? checkOutTime.trim() : null,
      workMode,
      location: location.trim() || 'Main HQ Office',
      lateStatus,
      lateMinutes: Number(lateMinutes) || 0,
      totalHours: totalHours.trim() || '--',
      notes: notes.trim(),
      syncedToSheet,
    };

    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full my-8 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Manager Edit: Attendance Record
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modify employee punch details, timings, late evaluation, or location.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Quick Roster Selector */}
          {employees.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-[11px] text-indigo-950 dark:text-indigo-200 font-medium">
                Quick-select from registered roster:
              </div>
              <select
                onChange={(e) => handleSelectRosterEmployee(e.target.value)}
                value={employeeId}
                className="px-2.5 py-1 text-xs rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="">-- Choose Team Member --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id} - {emp.department})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Employee Credentials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Employee Name *</span>
              </label>
              <input
                type="text"
                required
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Employee ID *
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department *
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Date & Timings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date (YYYY-MM-DD) *</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Check-In Time *
                </label>
                <button
                  type="button"
                  onClick={handleRecalculateLate}
                  title="Recalculate Late based on Office Cutoff"
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Recalc Late
                </button>
              </div>
              <input
                type="text"
                required
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                placeholder="e.g. 09:15 AM"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Check-Out Time
                </label>
                <button
                  type="button"
                  onClick={handleRecalculateDuration}
                  title="Recalculate Total Duration"
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                >
                  Calc Hours
                </button>
              </div>
              <input
                type="text"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                placeholder="e.g. 05:45 PM or leave blank"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 3: Late Status & Total Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Status
              </label>
              <select
                value={lateStatus}
                onChange={(e) => setLateStatus(e.target.value as LateStatus)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="On-Time">On-Time</option>
                <option value="Late">Late</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Late Minutes
              </label>
              <input
                type="number"
                min={0}
                value={lateMinutes}
                onChange={(e) => setLateMinutes(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Total Shift Hours</span>
                <button
                  type="button"
                  onClick={handleRecalculateDuration}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
                >
                  <Calculator className="w-3 h-3" />
                </button>
              </label>
              <input
                type="text"
                value={totalHours}
                onChange={(e) => setTotalHours(e.target.value)}
                placeholder="e.g. 8h 15m or --"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Work Mode & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Work Mode *</span>
              </label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Office">Office Campus</option>
                <option value="Remote">Remote / WFH</option>
                <option value="On-site">Client On-site</option>
                <option value="Field Work">Field Operations</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Location / Branch *</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main HQ Office, Downtown Branch, Remote"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex gap-1.5 mt-1 text-[10px] text-slate-400">
                <span className="font-semibold">Presets:</span>
                <button
                  type="button"
                  onClick={() => setLocation('Main HQ Office')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                >
                  Main HQ
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setLocation('Downtown Branch')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                >
                  Downtown Branch
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setLocation('Remote / Home Office')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 underline"
                >
                  Remote
                </button>
              </div>
            </div>
          </div>

          {/* Row 5: Manager Revision Notes & Sync Checkbox */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Manager Audit Notes / Modification Reason</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Adjusted check-out time by HR manager due to biometric error"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="syncedCheck"
              checked={syncedToSheet}
              onChange={(e) => setSyncedToSheet(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="syncedCheck" className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Mark as Synced to Google Sheet (Checked: Yes / Unchecked: Pending)
            </label>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-semibold text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
