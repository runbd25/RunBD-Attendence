export type WorkMode = 'Office' | 'Remote' | 'On-site' | 'Field Work';
export type LateStatus = 'On-Time' | 'Late';

export interface AttendanceRecord {
  id: string;
  slNo: number;
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  department: string;
  checkInTime: string; // e.g. "09:14 AM"
  checkInTimestamp: number;
  checkOutTime: string | null; // e.g. "05:45 PM" or null
  checkOutTimestamp: number | null;
  location: string; // e.g. "Main HQ Office", "Remote / Home Office", "Downtown Branch"
  workMode: WorkMode;
  lateStatus: LateStatus;
  lateMinutes: number; // 0 if on time
  totalHours: string; // e.g. "8h 31m" or "--"
  syncedToSheet: boolean;
  notes?: string;
  createdAt: number;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  department: string;
  role: string;
  avatarColor: string;
}

export interface AppSettings {
  gasWebAppUrl: string;
  officeStartTime: string; // HH:mm format, e.g. "09:30"
  graceMinutes: number; // e.g. 0 or 5
  adminPassword: string; // default "admin123"
  autoSync: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}
