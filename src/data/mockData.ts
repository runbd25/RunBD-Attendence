import { AttendanceRecord, EmployeeProfile } from '../types/attendance';

export const DEFAULT_EMPLOYEES: EmployeeProfile[] = [
  { id: 'EMP-01', name: 'Ripon', department: 'Management', role: 'Management Director', avatarColor: 'bg-indigo-600' },
  { id: 'EMP-02', name: 'Jihad', department: 'Tech-Manager', role: 'HR-Manager', avatarColor: 'bg-purple-600' },
  { id: 'EMP-03', name: 'Shimul', department: 'Marketing', role: 'Tech-Manager', avatarColor: 'bg-blue-600' },
  { id: 'EMP-04', name: 'Kathy', department: 'Call Center', role: 'Call Center Agent', avatarColor: 'bg-emerald-600' },
  { id: 'EMP-05', name: 'Tanjin', department: 'Marketing', role: 'Growth Lead', avatarColor: 'bg-cyan-600' },
  { id: 'EMP-06', name: 'Shahnaz', department: 'Call Center', role: 'Call Center Agent', avatarColor: 'bg-rose-600' },
  { id: 'EMP-07', name: 'Sakib', department: 'Call Center', role: 'Customer Support Agent', avatarColor: 'bg-teal-600' },
  { id: 'EMP-08', name: 'Sezon', department: 'Call Center', role: 'Call Center Agent', avatarColor: 'bg-amber-600' },
  { id: 'EMP-09', name: 'Farhan', department: 'Call Center', role: 'Call Center Agent', avatarColor: 'bg-orange-600' },
  { id: 'EMP-10', name: 'Afia', department: 'Call Center', role: 'Data Analyst', avatarColor: 'bg-pink-600' },
  { id: 'EMP-11', name: 'Kawsar', department: 'FB Post', role: 'FB Post Specialist', avatarColor: 'bg-violet-600' },
  { id: 'EMP-12', name: 'Naim', department: 'Data Collect', role: 'Data Analyst', avatarColor: 'bg-emerald-700' },
];

// Helper to format 12h time
function format12Hour(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${displayHour}:${displayMinute} ${ampm}`;
}

// Generate attendance history (returns empty as requested by user)
export function generateSeedAttendance(): AttendanceRecord[] {
  return [];
}
