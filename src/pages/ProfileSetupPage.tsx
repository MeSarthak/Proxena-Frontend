import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic2, Globe, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

const LANGUAGES = [
  'Arabic', 'Bengali', 'Chinese (Mandarin)', 'Dutch', 'French', 'German',
  'Hindi', 'Indonesian', 'Italian', 'Japanese', 'Korean', 'Persian',
  'Polish', 'Portuguese', 'Russian', 'Spanish', 'Swahili', 'Tamil',
  'Thai', 'Turkish', 'Ukrainian', 'Urdu', 'Vietnamese',
].map((l) => ({ value: l, label: l }));

const ACCENTS = [
  { value: 'en-US', label: 'American English',   flag: '🇺🇸', sub: 'General American' },
  { value: 'en-GB', label: 'British English',    flag: '🇬🇧', sub: 'Received Pronunciation' },
  { value: 'en-AU', label: 'Australian English', flag: '🇦🇺', sub: 'General Australian' },
  { value: 'en-IN', label: 'Indian English',     flag: '🇮🇳', sub: 'Standard Indian' },
  { value: 'en-CA', label: 'Canadian English',   flag: '🇨🇦', sub: 'General Canadian' },
  { value: 'en-IE', label: 'Irish English',      flag: '🇮🇪', sub: 'Hiberno-English' },
];

export default function ProfileSetupPage() {
  const { user, markProfileComplete } = useAuth();
  const navigate = useNavigate();

  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetAccent, setTargetAccent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nativeLanguage || !targetAccent) return;
    setError(null);
    setLoading(true);

    try {
      await api.patch('/auth/profile', { nativeLanguage, targetAccent });
      markProfileComplete();
      navigate('/dashboard');
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg fade-in">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg mb-4">
            <Mic2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">One last step</h1>
          <p className="text-gray-500 text-sm mt-1 text-center max-w-sm">
            Tell us about yourself so we can personalise your coaching experience
          </p>
        </div>

        <div className="card p-8">
          {/* User greeting */}
          <div className="flex items-center gap-3 mb-6 p-4 bg-blue-50 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">Let's personalise your coaching</p>
            </div>
          </div>

          {error && (
            <Alert variant="error" className="mb-4" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Native language */}
            <Select
              label="Your native language"
              options={LANGUAGES}
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              required
            />

            {/* Target accent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target accent
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Choose the English accent you want to practise towards
              </p>
              <div className="grid grid-cols-2 gap-3">
                {ACCENTS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setTargetAccent(a.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                      targetAccent === a.value
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl leading-none">{a.flag}</span>
                    <p className="text-sm font-semibold text-gray-900 mt-2">{a.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-1"
              loading={loading}
              disabled={!nativeLanguage || !targetAccent}
            >
              Start practising
              <ChevronRight className="w-4 h-4" />
            </Button>
          </form>

          <button
            type="button"
            onClick={() => { markProfileComplete(); navigate('/dashboard'); }}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
