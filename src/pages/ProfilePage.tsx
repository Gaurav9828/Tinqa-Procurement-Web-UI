import React, { useState } from 'react';
import { User, FileText, KeyRound, AlertCircle, Save, BadgeCheck, Loader2 } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { ProfileTab } from '../components/profile/ProfileTab';
import { DocumentsTab } from '../components/profile/DocumentsTab';
import { PasswordTab } from '../components/profile/PasswordTab';

export const ProfilePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'documents' | 'password'>('profile');
  const [isFormValid, setIsFormValid] = useState<boolean>(true);

  const {
    isLoading,
    isUpdating,
    fetchError,
    updateStatus,
    updateError,
    employeeData,
    setEmployeeData,
    hasChanges,
    updateProfile,
  } = useProfile();

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid && hasChanges) {
      updateProfile();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
        <p className="text-sm font-medium">Fetching profile details...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-3 my-4">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>{fetchError}</span>
      </div>
    );
  }

  const isSaveEnabled = isFormValid && hasChanges && !isUpdating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employee Profile & Settings</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
            Manage your personal employee profile, credentials, and compliance records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-[#0071e3] border border-blue-500/20">
            {employeeData.employee_code}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <BadgeCheck className="w-3.5 h-3.5" /> {employeeData.status}
          </span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'text-[#0071e3] dark:text-blue-400 font-semibold border-b-2 border-[#0071e3]'
                : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Profile Details
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'documents'
                ? 'text-[#0071e3] dark:text-blue-400 font-semibold border-b-2 border-[#0071e3]'
                : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Documents
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'password'
                ? 'text-[#0071e3] dark:text-blue-400 font-semibold border-b-2 border-[#0071e3]'
                : 'text-gray-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Password Management
          </button>
        </div>

        {activeTab === 'profile' && (
          <button
            type="submit"
            form="profile-form"
            disabled={!isSaveEnabled}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm shrink-0 ${
              isSaveEnabled
                ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white cursor-pointer'
                : 'bg-gray-300 dark:bg-neutral-800 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Profile & Raise Request
              </>
            )}
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'profile' && (
        <ProfileTab
          employeeData={employeeData}
          setEmployeeData={setEmployeeData}
          onSubmit={handleSaveClick}
          updateStatus={updateStatus}
          updateError={updateError}
          onValidationChange={setIsFormValid}
        />
      )}

      {activeTab === 'documents' && <DocumentsTab />}

      {activeTab === 'password' && <PasswordTab />}
    </div>
  );
};