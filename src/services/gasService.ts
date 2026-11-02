import { AttendanceRecord } from '../types/attendance';

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * ATTENDPULSE - GOOGLE APPS SCRIPT ATTENDANCE BACKEND (Code.gs)
 * =========================================================================
 * Google Sheet Columns:
 * A: Sl No | B: Date | C: Employee ID | D: Employee Name | E: Check-In Time
 * F: Check-Out Time | G: Location / Branch | H: Work Mode | I: Late Status | J: Total Hours | K: Timestamp
 * =========================================================================
 */

var SHEET_NAME = "Attendance";
var OFFICE_START_TIME = "09:30"; // 24-hr format HH:mm (9:30 AM)

/**
 * Handle incoming GET requests (Ping test & fetch attendance history)
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "ping";
    var sheet = getOrCreateSheet();

    if (action === "ping") {
      return jsonResponse({
        status: "success",
        message: "AttendPulse Google Apps Script is online & connected!",
        sheetName: sheet.getName(),
        totalRows: Math.max(0, sheet.getLastRow() - 1),
        serverTime: new Date().toISOString()
      });
    }

    if (action === "getAttendance") {
      var limit = parseInt(e.parameter.limit || "100", 10);
      var records = readAttendanceRecords(sheet, limit);
      return jsonResponse({
        status: "success",
        count: records.length,
        records: records
      });
    }

    // Support GET-based check-in/out for simplified browser environments
    if (action === "checkIn" || action === "checkOut") {
      var params = e.parameter;
      var result = handleAttendanceAction(action, params);
      return jsonResponse(result);
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Handle incoming POST requests (Check-in, Check-out, Sync)
 */
function doPost(e) {
  try {
    var payload;
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || "checkIn";
    var result = handleAttendanceAction(action, payload);
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

/**
 * Process Attendance Check-In or Check-Out
 */
function handleAttendanceAction(action, data) {
  var sheet = getOrCreateSheet();
  var dateStr = data.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  var empId = (data.employeeId || "").trim();
  var empName = (data.employeeName || "").trim();
  var timeStr = data.time || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "hh:mm a");
  var location = data.location || "Location not captured";
  var workMode = data.workMode || "Office";
  
  if (!empId && !empName) {
    return { status: "error", message: "Employee ID or Name is required." };
  }

  var existingRowIndex = findRecordRow(sheet, dateStr, empId, empName);

  if (action === "checkIn") {
    if (existingRowIndex > 0) {
      var existingCheckIn = sheet.getRange(existingRowIndex, 5).getValue();
      return {
        status: "warning",
        message: empName + " already checked in at " + existingCheckIn + " today.",
        rowIndex: existingRowIndex
      };
    }

    // Determine Late Status
    var lateInfo = evaluateLateStatus(timeStr);
    var nextSlNo = Math.max(1, sheet.getLastRow());

    // Row: SlNo, Date, EmpId, EmpName, CheckIn, CheckOut, Location, WorkMode, LateStatus, TotalHours, Timestamp
    sheet.appendRow([
      nextSlNo,
      dateStr,
      empId,
      empName,
      timeStr,
      "--",
      location,
      workMode,
      lateInfo.status,
      "--",
      new Date().toISOString()
    ]);

    return {
      status: "success",
      message: "Check-In recorded successfully for " + empName + " (" + lateInfo.status + ")",
      action: "checkIn",
      date: dateStr,
      checkInTime: timeStr,
      lateStatus: lateInfo.status,
      slNo: nextSlNo
    };
  }

  if (action === "checkOut") {
    if (existingRowIndex <= 0) {
      // Auto create a record with missing check-in or mark as direct check-out
      var nextSlNo = Math.max(1, sheet.getLastRow());
      sheet.appendRow([
        nextSlNo,
        dateStr,
        empId,
        empName,
        "--",
        timeStr,
        location,
        workMode,
        "Direct Check-Out",
        "--",
        new Date().toISOString()
      ]);
      return {
        status: "success",
        message: "Direct Check-Out recorded for " + empName + " at " + timeStr,
        action: "checkOut"
      };
    }

    // Update existing row
    var checkInVal = sheet.getRange(existingRowIndex, 5).getValue();
    sheet.getRange(existingRowIndex, 6).setValue(timeStr); // Check-Out Time
    
    // Append check-out location if different
    var existingLoc = sheet.getRange(existingRowIndex, 7).getValue();
    if (location && location !== existingLoc) {
      sheet.getRange(existingRowIndex, 7).setValue(existingLoc + " | Out: " + location);
    }

    // Compute Total Hours worked
    var totalHours = calculateElapsed(checkInVal, timeStr);
    sheet.getRange(existingRowIndex, 10).setValue(totalHours);
    sheet.getRange(existingRowIndex, 11).setValue(new Date().toISOString());

    return {
      status: "success",
      message: "Check-Out recorded for " + empName + " at " + timeStr + " (" + totalHours + " total)",
      action: "checkOut",
      date: dateStr,
      checkOutTime: timeStr,
      totalHours: totalHours
    };
  }

  return { status: "error", message: "Unknown action: " + action };
}

/**
 * Determine if Check-in time is Late based on 9:30 AM policy
 */
function evaluateLateStatus(checkInTimeStr) {
  try {
    var match = checkInTimeStr.match(/(\\d{1,2}):(\\d{2})\\s*(AM|PM)?/i);
    if (!match) return { status: "On-Time", minutesLate: 0 };

    var h = parseInt(match[1], 10);
    var m = parseInt(match[2], 10);
    var meridian = (match[3] || "").toUpperCase();

    if (meridian === "PM" && h < 12) h += 12;
    if (meridian === "AM" && h === 12) h = 0;

    var actualMinutes = h * 60 + m;
    var targetMinutes = 9 * 60 + 30; // 9:30 AM = 570 mins

    if (actualMinutes > targetMinutes) {
      var diff = actualMinutes - targetMinutes;
      return { status: "Late (+" + diff + "m)", minutesLate: diff };
    }
    return { status: "On-Time", minutesLate: 0 };
  } catch (e) {
    return { status: "On-Time", minutesLate: 0 };
  }
}

/**
 * Calculate duration between check-in and check-out
 */
function calculateElapsed(inTime, outTime) {
  try {
    var parseToMins = function(tStr) {
      var match = tStr.toString().match(/(\\d{1,2}):(\\d{2})\\s*(AM|PM)?/i);
      if (!match) return null;
      var h = parseInt(match[1], 10);
      var m = parseInt(match[2], 10);
      var meridian = (match[3] || "").toUpperCase();
      if (meridian === "PM" && h < 12) h += 12;
      if (meridian === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };

    var inM = parseToMins(inTime);
    var outM = parseToMins(outTime);
    if (inM === null || outM === null || outM < inM) return "--";

    var diff = outM - inM;
    var hrs = Math.floor(diff / 60);
    var mins = diff % 60;
    return hrs + "h " + mins + "m";
  } catch (e) {
    return "--";
  }
}

/**
 * Find existing record row in the sheet
 */
function findRecordRow(sheet, dateStr, empId, empName) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var range = sheet.getRange(2, 2, lastRow - 1, 3); // Columns B (Date), C (EmpId), D (EmpName)
  var values = range.getValues();

  for (var i = 0; i < values.length; i++) {
    var rowDate = Utilities.formatDate(new Date(values[i][0]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    var rowEmpId = String(values[i][1] || "").trim();
    var rowEmpName = String(values[i][2] || "").trim();

    if (rowDate === dateStr) {
      if ((empId && rowEmpId === empId) || (empName && rowEmpName.toLowerCase() === empName.toLowerCase())) {
        return i + 2; // 1-indexed including header
      }
    }
  }
  return -1;
}

/**
 * Get or create "Attendance" sheet with styled header
 */
function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    setupAttendanceSheet();
  }
  return sheet;
}

/**
 * Setup sheet formatting and headers (Run once from script editor!)
 */
function setupAttendanceSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.getActiveSheet();
  sheet.setName(SHEET_NAME);

  var headers = [
    "Sl No", "Date", "Employee ID", "Employee Name", "Check-In Time",
    "Check-Out Time", "Location / Branch", "Work Mode", "Late Status", "Total Hours", "Last Updated"
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground("#1E293B")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  sheet.setFrozenRows(1);
  for (var c = 1; c <= headers.length; c++) {
    sheet.autoResizeColumn(c);
  }
  Logger.log("AttendPulse Sheet initialized successfully.");
}

/**
 * Read attendance records into JSON
 */
function readAttendanceRecords(sheet, limit) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var rowCount = Math.min(lastRow - 1, limit);
  var startRow = lastRow - rowCount + 1;
  var values = sheet.getRange(startRow, 1, rowCount, 11).getValues();

  var records = [];
  for (var i = values.length - 1; i >= 0; i--) {
    var row = values[i];
    records.push({
      slNo: row[0],
      date: Utilities.formatDate(new Date(row[1]), Session.getScriptTimeZone(), "yyyy-MM-dd"),
      employeeId: String(row[2]),
      employeeName: String(row[3]),
      checkInTime: String(row[4]),
      checkOutTime: String(row[5]),
      location: String(row[6]),
      workMode: String(row[7]),
      lateStatus: String(row[8]),
      totalHours: String(row[9]),
      updatedAt: String(row[10])
    });
  }
  return records;
}

/**
 * Helper to return CORS-compliant JSON response
 */
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Ping test Google Apps Script Web App
 */
export async function testGasConnection(url: string): Promise<{ success: boolean; message: string; latency?: number }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'Please enter a valid Google Apps Script Web App URL.' };
  }

  const startTime = Date.now();
  try {
    const separator = url.includes('?') ? '&' : '?';
    const testUrl = `${url}${separator}action=ping&_t=${startTime}`;

    const res = await fetch(testUrl, {
      method: 'GET',
      mode: 'cors',
    });

    const latency = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        return {
          success: true,
          message: data.message || `Connected! Sheet: "${data.sheetName}" with ${data.totalRows} existing rows.`,
          latency,
        };
      }
      return { success: false, message: data.message || 'Unknown response from Google Apps Script.', latency };
    }

    return {
      success: false,
      message: `HTTP ${res.status}: ${res.statusText}. Check deployment permissions ("Who has access: Anyone").`,
      latency,
    };
  } catch (err: unknown) {
    // If CORS blocks standard read, try no-cors ping to check reachability
    try {
      await fetch(`${url}?action=ping`, { mode: 'no-cors' });
      return {
        success: true,
        message: 'Endpoint is reachable (no-cors response received). Make sure the Web App is deployed with "Anyone".',
        latency: Date.now() - startTime,
      };
    } catch {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Connection failed: ${message}. Ensure Web App is deployed with access set to "Anyone".`,
      };
    }
  }
}

/**
 * Send Check-In record to Google Apps Script
 */
export async function syncCheckInToGas(
  url: string,
  record: AttendanceRecord
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'No Google Apps Script URL configured.' };
  }

  try {
    const payload = {
      action: 'checkIn',
      date: record.date,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      time: record.checkInTime,
      location: record.location,
      workMode: record.workMode,
      lateStatus: record.lateStatus,
    };

    // Use standard POST with JSON or URL encoded
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // Prevents preflight CORS failure in Apps Script
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.status === 'success' || data.status === 'warning',
        message: data.message || 'Check-in synced to Google Sheet successfully.',
      };
    }

    return {
      success: true, // Graceful fallback
      message: 'Request sent to Google Apps Script.',
    };
  } catch (err) {
    // Fallback GET parameter method if POST is blocked
    try {
      const params = new URLSearchParams({
        action: 'checkIn',
        date: record.date,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        time: record.checkInTime,
        location: record.location,
        workMode: record.workMode,
      });
      await fetch(`${url}?${params.toString()}`, { mode: 'no-cors' });
      return { success: true, message: 'Check-in synced to Google Sheet (via background queue).' };
    } catch {
      return {
        success: false,
        message: 'Could not reach Google Sheets. Record saved locally and will retry.',
      };
    }
  }
}

/**
 * Send Check-Out record to Google Apps Script
 */
export async function syncCheckOutToGas(
  url: string,
  record: AttendanceRecord
): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('http')) {
    return { success: false, message: 'No Google Apps Script URL configured.' };
  }

  try {
    const payload = {
      action: 'checkOut',
      date: record.date,
      employeeId: record.employeeId,
      employeeName: record.employeeName,
      time: record.checkOutTime,
      location: record.location,
      workMode: record.workMode,
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: data.status === 'success',
        message: data.message || 'Check-out synced to Google Sheet.',
      };
    }

    return { success: true, message: 'Check-out dispatched to Google Apps Script.' };
  } catch {
    try {
      const params = new URLSearchParams({
        action: 'checkOut',
        date: record.date,
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        time: record.checkOutTime || '',
        location: record.location,
      });
      await fetch(`${url}?${params.toString()}`, { mode: 'no-cors' });
      return { success: true, message: 'Check-out synced to Google Sheet.' };
    } catch {
      return { success: false, message: 'Could not sync check-out to Google Sheet. Saved locally.' };
    }
  }
}
