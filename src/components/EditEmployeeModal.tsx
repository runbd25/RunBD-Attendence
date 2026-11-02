import React, { useState, useEffect } from 'react';
import { X, Save, User, Briefcase, Building, Hash } from 'lucide-react';
import { EmployeeProfile } from '../types/attendance';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  onSave: (emp: EmployeeProfile) => void;
  isNew?: boolean;
}

const AVATAR_COLORS = [
  'bg-indigo-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-teal-600',
  'bg-cyan-600',
  'bg-pink-600',
  'bg-orange-600',
  'bg-violet-600',
  'bg-emerald-700',
];

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSave,
  isNew = false,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(employee?.name || '');
  const [id, setId] = useState<string>(employee?.id || '');
  const [department, setDepartment] = useState<string>(employee?.department || 'Call Center');
  const [role, setRole] = useState<string>(employee?.role || 'Call Center Agent');
  const [avatarColor, setAvatarColor] = useState<string>(
    employee?.avatarColor || AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
  );

  useEffect(() => {
    if (employee) {
      setName(employee.name);
      setId(employee.id);
      setDepartment(employee.department);
      setRole(employee.role);
      setAvatarColor(employee.avatarColor);
    } else {
      setName('');
      setId(`EMP-${Math.floor(10 + Math.random() * 89)}`);
      setDepartment('Call Center');
      setRole('Call Center Agent');
      setAvatarColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    }
  }, [employee, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id.trim()) return;

    onSave({
      id: id.trim(),
      name: name.trim(),
      department: department.trim(),
      role: role.trim(),
      avatarColor,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
              {name ? name.slice(0, 2).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isNew ? 'Add Team Member' : 'Edit Employee Details'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isNew ? 'Register a new employee into the system.' : `Update details for ${employee?.name}`}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ripon"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span>Employee Badge ID *</span>
            </label>
            <input
              type="text"
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. EMP-01"
              disabled={!isNew}
              className={`w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                !isNew
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Department *</span>
            </label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Management, Marketing, Call Center, FB Post"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>Role / Designation *</span>
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Management Director, HR-Manager, Call Center Agent"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Avatar Badge Color
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-6 h-6 rounded-full ${c} transition-all ${
                    avatarColor === c ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
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
              <span>{isNew ? 'Create Employee' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
