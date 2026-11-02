import { AttendanceRecord } from '../types/attendance';

/**
 * Convert attendance records to CSV string and download
 */
export function exportAttendanceToCSV(records: AttendanceRecord[], filenamePrefix = 'attendance_report'): void {
  if (!records || records.length === 0) {
    alert('No attendance records to export.');
    return;
  }

  const headers = [
    'Sl No',
    'Date',
    'Employee ID',
    'Employee Name',
    'Department',
    'Check-In Time',
    'Check-Out Time',
    'Work Mode',
    'Late Status',
    'Late Minutes',
    'Total Hours',
    'Location / Branch',
    'Sheet Synced',
  ];

  const escapeCSV = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [headers.join(',')];

  records.forEach((rec, idx) => {
    const row = [
      escapeCSV(rec.slNo || idx + 1),
      escapeCSV(rec.date),
      escapeCSV(rec.employeeId),
      escapeCSV(rec.employeeName),
      escapeCSV(rec.department || 'General'),
      escapeCSV(rec.checkInTime),
      escapeCSV(rec.checkOutTime || '--'),
      escapeCSV(rec.workMode),
      escapeCSV(rec.lateStatus),
      escapeCSV(rec.lateMinutes || 0),
      escapeCSV(rec.totalHours || '--'),
      escapeCSV(rec.location),
      escapeCSV(rec.syncedToSheet ? 'Yes' : 'Pending'),
    ];
    csvRows.push(row.join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\r\n'));
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
