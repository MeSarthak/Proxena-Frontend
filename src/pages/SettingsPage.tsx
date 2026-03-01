import { useEffect, useState } from 'react';
import { Settings, Bell, Award } from 'lucide-react';
import { authApi, api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { useBadges } from '../hooks/useBadges';

const LANGUAGES = [
  { value: 'Mandarin', label: 'Mandarin Chinese' },
  { value: 'Spanish', label: 'Spanish' },
  { value: 'Hindi', label: 'Hindi' },
  { value: 'Arabic', label: 'Arabic' },
  { value: 'Bengali', label: 'Bengali' },
  { value: 'Portuguese', label: 'Portuguese' },
  { value: 'Russian', label: 'Russian' },
  { value: 'Japanese', label: 'Japanese' },
  { value: 'Turkish', label: 'Turkish' },
  { value: 'Korean', label: 'Korean' },
  { value: 'French', label: 'French' },
  { value: 'German', label: 'German' },
  { value: 'Vietnamese', label: 'Vietnamese' },
  { value: 'Italian', label: 'Italian' },
  { value: 'Polish', label: 'Polish' },
  { value: 'Ukrainian', label: 'Ukrainian' },
  { value: 'Dutch', label: 'Dutch' },
  { value: 'Greek', label: 'Greek' },
  { value: 'Hebrew', label: 'Hebrew' },
  { value: 'Swedish', label: 'Swedish' },
  { value: 'Romanian', label: 'Romanian' },
  { value: 'Hungarian', label: 'Hungarian' },
  { value: 'Other', label: 'Other' },
];

const ACCENTS: { value: string; label: string; flag: string; region: string }[] = [
  { value: 'en-US', label: 'American English', flag: '🇺🇸', region: 'United States' },
  { value: 'en-GB', label: 'British English',  flag: '🇬🇧', region: 'United Kingdom' },
  { value: 'en-AU', label: 'Australian English', flag: '🇦🇺', region: 'Australia' },
  { value: 'en-IN', label: 'Indian English',   flag: '🇮🇳', region: 'India' },
  { value: 'en-CA', label: 'Canadian English', flag: '🇨🇦', region: 'Canada' },
  { value: 'en-IE', label: 'Irish English',    flag: '🇮🇪', region: 'Ireland' },
];

export default function SettingsPage() {
  const { markProfileComplete } = useAuth();
  const { unlockedBadges, lockedBadges } = useBadges();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetAccent, setTargetAccent] = useState('en-US');

  // Reminder time
  const [reminderTime, setReminderTime] = useState<string>(() => {
    try { return localStorage.getItem('proxena_reminder_time') ?? ''; } catch { return ''; }
  });
  const [reminderSaved, setReminderSaved] = useState(false);

  const handleSaveReminder = () => {
    try {
      if (reminderTime) {
        localStorage.setItem('proxena_reminder_time', reminderTime);
      } else {
        localStorage.removeItem('proxena_reminder_time');
      }
      setReminderSaved(true);
      setTimeout(() => setReminderSaved(false), 2000);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    authApi.me()
      .then((p) => {
        setProfile(p);
        setNativeLanguage(p.nativeLanguage ?? '');
        setTargetAccent(p.targetAccent ?? 'en-US');
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!nativeLanguage || !targetAccent) {
      setError('Please select both your native language and target accent.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch('/auth/profile', { nativeLanguage, targetAccent });
      markProfileComplete();
      setSuccess(true);
      // Refresh profile to reflect new values
      const updated = await authApi.me();
      setProfile(updated);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    nativeLanguage !== (profile?.nativeLanguage ?? '') ||
    targetAccent   !== (profile?.targetAccent   ?? 'en-US');

  return (
    <div className="max-w-2xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Settings className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Update your language and accent preferences</p>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-6" onClose={() => setSuccess(false)}>
          Settings saved successfully.
        </Alert>
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="card h-32 skeleton" />
          <div className="card h-48 skeleton" />
        </div>
      ) : (
        <>
          {/* Native language */}
          <Card className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-1">Native language</h2>
            <p className="text-sm text-gray-500 mb-4">
              The language you speak most fluently at home
            </p>
            <select
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
            >
              <option value="" disabled>Select your native language</option>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </Card>

          {/* Target accent */}
          <Card className="mb-8">
            <h2 className="font-semibold text-gray-900 mb-1">Target accent</h2>
            <p className="text-sm text-gray-500 mb-4">
              The English accent you want to practise and be coached in
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setTargetAccent(a.value)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all duration-150 ${
                    targetAccent === a.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className="text-2xl">{a.flag}</span>
                  <span className={`text-xs font-semibold leading-tight text-center ${
                    targetAccent === a.value ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {a.region}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Button
            variant="primary"
            size="lg"
            loading={saving}
            disabled={!isDirty || saving}
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            Save changes
          </Button>

          {/* Daily reminder */}
          <Card className="mt-8">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-gray-900">Daily practice reminder</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Set a time and the dashboard will show a reminder banner when it's time to practise.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleSaveReminder}
              >
                {reminderSaved ? 'Saved!' : 'Save reminder'}
              </Button>
              {reminderTime && (
                <button
                  onClick={() => { setReminderTime(''); localStorage.removeItem('proxena_reminder_time'); }}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </Card>

          {/* Badge shelf */}
          <Card className="mt-6">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Your badges</h2>
              <span className="ml-auto text-xs text-gray-400">{unlockedBadges.length} / {unlockedBadges.length + lockedBadges.length} unlocked</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">Achievements earned from your practice sessions.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {unlockedBadges.map((b) => (
                <div
                  key={b.id}
                  title={b.description}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-amber-50 border border-amber-100"
                >
                  <span className="text-2xl">{b.emoji}</span>
                  <span className="text-xs font-semibold text-amber-800 text-center leading-tight">{b.name}</span>
                </div>
              ))}
              {lockedBadges.map((b) => (
                <div
                  key={b.id}
                  title={b.description}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-gray-50 border border-gray-100 opacity-50"
                >
                  <span className="text-2xl grayscale">{b.emoji}</span>
                  <span className="text-xs font-medium text-gray-500 text-center leading-tight">{b.name}</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
