import React, { useState } from 'react';
import {
  Sheet,
  Copy,
  Check,
  ExternalLink,
  Zap,
  AlertCircle,
  Database,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE, testGasConnection } from '../services/gasService';

interface GasSetupModalProps {
  gasWebAppUrl: string;
  onSaveGasUrl: (url: string) => void;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const GasSetupModal: React.FC<GasSetupModalProps> = ({
  gasWebAppUrl,
  onSaveGasUrl,
  showToast,
}) => {
  const [urlInput, setUrlInput] = useState<string>(gasWebAppUrl);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'success' | 'error';
    message: string;
    latency?: number;
  }>({ status: 'idle', message: '' });
  const [hasCopied, setHasCopied] = useState<boolean>(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setHasCopied(true);
    showToast('Copied to Clipboard', 'Google Apps Script (Code.gs) copied.', 'success');
    setTimeout(() => setHasCopied(false), 2500);
  };

  const handleSaveAndTest = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onSaveGasUrl('');
      setTestResult({ status: 'idle', message: 'Cleared Google Apps Script URL. Offline mode active.' });
      showToast('Offline Mode', 'Google Apps Script URL cleared. Records will be saved locally.', 'info');
      return;
    }

    setIsTesting(true);
    setTestResult({ status: 'idle', message: 'Connecting to Google Apps Script...' });

    const result = await testGasConnection(trimmed);
    setIsTesting(false);

    if (result.success) {
      onSaveGasUrl(trimmed);
      setTestResult({
        status: 'success',
        message: result.message,
        latency: result.latency,
      });
      showToast('Connection Successful', 'Google Sheet backend is live and synced!', 'success');
    } else {
      setTestResult({
        status: 'error',
        message: result.message,
        latency: result.latency,
      });
      showToast('Connection Warning', result.message, 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Google Sheets Database Backend Integration (GAS)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Every employee Check-In and Check-Out synchronizes straight to your Google Sheet rows in real-time.
              </p>
            </div>
          </div>

          <a
            href="https://sheets.new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-2 shadow-sm transition-colors shrink-0"
          >
            <span>Create New Google Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 3 Step Deployment Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">
                1
              </span>
              <span>Open Apps Script Editor</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Open your Google Sheet at <strong className="text-slate-800 dark:text-slate-100">sheets.new</strong>. In the top toolbar, click{' '}
              <strong className="text-slate-900 dark:text-white">Extensions &gt; Apps Script</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Paste Code &amp; Deploy</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Delete the boilerplate code, paste the script below, and click <strong className="text-slate-900 dark:text-white">Deploy &gt; New deployment</strong>.
              Select <strong className="text-slate-900 dark:text-white">Web app</strong>, Execute as <em className="text-indigo-600 dark:text-indigo-400 font-semibold">Me</em>, and Who has access: <strong className="text-emerald-700 dark:text-emerald-400">Anyone</strong>.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">
                3
              </span>
              <span>Paste Web App URL</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Copy the resulting URL (ending in <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px] text-slate-800 dark:text-slate-200">/exec</code>) and paste it into the field below. Click <strong className="text-slate-900 dark:text-white">Save &amp; Test</strong>.
            </p>
          </div>
        </div>

        {/* Web App URL Input & Connection Tester */}
        <div className="pt-2 space-y-3">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Google Apps Script Web App URL
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
              className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleSaveAndTest}
              disabled={isTesting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shrink-0 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Zap className="w-4 h-4" />
              <span>{isTesting ? 'Verifying...' : 'Save & Test Connection'}</span>
            </button>
          </div>

          {/* Test Status Feedback */}
          {testResult.message && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2.5 ${
                testResult.status === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : testResult.status === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {testResult.status === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{testResult.message}</span>
                {testResult.latency !== undefined && (
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                    ({testResult.latency}ms response)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Google Sheet Column Schema Description */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Google Sheet Target Columns Schema</h3>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Sheet tab: &quot;Attendance&quot;</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Column</th>
                <th className="py-2.5 px-3">Header Name</th>
                <th className="py-2.5 px-3">Data Type</th>
                <th className="py-2.5 px-3">Description &amp; Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col A</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Sl No</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Integer</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Sequential entry index (1, 2, 3...)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col B</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Date</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Date (YYYY-MM-DD)</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Log date (e.g. 2026-11-01)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col C</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Employee ID</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">String</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Employee unique badge (e.g. EMP-01)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col D</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Employee Name</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">String</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Full name (e.g. Ripon)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col E</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Check-In Time</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Time (hh:mm A)</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Exact check-in timestamp (e.g. 09:14 AM)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col F</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Check-Out Time</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Time (hh:mm A)</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Exact check-out timestamp (e.g. 05:45 PM)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col G</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Location / Branch</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">String</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Office branch or work location (e.g. Main HQ, Home Office)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col H</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Work Mode</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Enum</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Office, Remote, On-site, or Field Work</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col I</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Late Status</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">String</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">On-Time or Late (+XXm)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-500 dark:text-slate-400 font-bold">Col J</td>
                <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">Total Hours</td>
                <td className="py-2 px-3 text-indigo-600 dark:text-indigo-400">Duration</td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300 font-sans">Auto-computed duration (e.g. 8h 31m)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Copyable Code.gs Apps Script Box */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Google Apps Script Source Code (Code.gs)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paste this entire code into your Google Apps Script editor.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm border border-transparent dark:border-slate-700"
          >
            {hasCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <textarea
            readOnly
            value={GOOGLE_APPS_SCRIPT_CODE}
            className="w-full h-80 p-4 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 resize-none focus:outline-none selection:bg-indigo-600 selection:text-white leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};
