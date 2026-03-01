import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, Zap, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, sessionsApi } from '../lib/api';
import type { UserProfile, SessionSummary } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Alert } from '../components/ui/Alert';
import { formatPercent, formatDate, formatDuration, scoreColor } from '../lib/utils';

const QUOTES = [
  "The limits of my language mean the limits of my world. — Wittgenstein",
  "Language is the road map of a culture. — Rita Mae Brown",
  "One language sets you in a corridor for life. Two languages open every door. — Frank Smith",
  "Learning another language is like becoming another person. — Haruki Murakami",
];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'yellow';
}) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };
  return (
    <Card className="flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  useEffect(() => {
    authApi.me()
      .then(setProfile)
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoadingProfile(false));

    sessionsApi.history(1, 5)
      .then((r) => setSessions(r.sessions))
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  const usage = profile?.usageToday;
  const minutesPct = usage ? Math.min(100, (usage.minutesUsed / usage.dailyLimit) * 100) : 0;
  const limitReached = usage ? usage.minutesUsed >= usage.dailyLimit || usage.sessionsCount >= usage.dailySessionLimit : false;

  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="max-w-5xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {profile && (
          <Badge variant={profile.subscription.planType === 'pro' ? 'blue' : 'default'} className="text-sm px-3 py-1">
            {profile.subscription.planType === 'pro' ? '⚡ Pro Plan' : 'Free Plan'}
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>{error}</Alert>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {loadingProfile ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6 h-24 skeleton" />
          ))
        ) : (
          <>
            <StatCard
              label="Minutes used today"
              value={`${usage?.minutesUsed ?? 0} / ${usage?.dailyLimit ?? 5}`}
              sub="minutes"
              icon={Clock}
              color="blue"
            />
            <StatCard
              label="Sessions today"
              value={String(usage?.sessionsCount ?? 0)}
              sub={`of ${profile?.subscription.planType === 'pro' ? '∞' : String(usage?.dailySessionLimit ?? 3)} sessions`}
              icon={Zap}
              color="green"
            />
            <StatCard
              label="Recent accuracy"
              value={sessions[0]?.overallAccuracy != null
                ? `${sessions[0].overallAccuracy.toFixed(0)}%`
                : '—'}
              sub="last session"
              icon={TrendingUp}
              color="yellow"
            />
          </>
        )}
      </div>

      {/* Usage progress */}
      {!loadingProfile && usage && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Today's practice limit</h3>
            {limitReached && (
              <Badge variant="warning">Limit reached</Badge>
            )}
          </div>
          <ProgressBar
            value={usage.minutesUsed}
            max={usage.dailyLimit}
            color={minutesPct >= 90 ? 'red' : minutesPct >= 60 ? 'yellow' : 'blue'}
            size="md"
            label={`${usage.minutesUsed} of ${usage.dailyLimit} minutes used`}
          />
          {limitReached && (
            <p className="text-xs text-gray-500 mt-2">
              You've reached today's limit.{' '}
              <button
                onClick={() => navigate('/subscription')}
                className="text-blue-600 hover:underline"
              >
                Upgrade to Pro
              </button>{' '}
              for unlimited practice.
            </p>
          )}
        </Card>
      )}

      {/* Quick start CTA */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 border-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Ready to practise?</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              Choose an exercise and start speaking — your AI coach is ready.
            </p>
          </div>
          <Button
            onClick={() => navigate('/exercises')}
            variant="secondary"
            size="lg"
            disabled={limitReached}
            className="shrink-0 ml-4"
          >
            <Play className="w-4 h-4" />
            Start practising
          </Button>
        </div>
      </Card>

      {/* Two-column bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sessions */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Recent sessions</h2>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {loadingSessions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card p-4 h-16 skeleton" />
              ))
            ) : sessions.length === 0 ? (
              <Card className="text-center py-10">
                <p className="text-gray-400 text-sm">No sessions yet.</p>
                <p className="text-gray-400 text-sm">Start your first practice above!</p>
              </Card>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.publicId}
                  onClick={() => navigate(`/sessions/${s.publicId}`)}
                  className="card p-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left w-full"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{formatDate(s.createdAt)}</p>
                    <p className="text-xs text-gray-500">{formatDuration(s.durationSeconds)}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${scoreColor(s.overallAccuracy)}`}>
                        {formatPercent(s.overallAccuracy, 0)}
                      </p>
                      <p className="text-xs text-gray-400">accuracy</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${scoreColor(s.fluencyScore)}`}>
                        {formatPercent(s.fluencyScore, 0)}
                      </p>
                      <p className="text-xs text-gray-400">fluency</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Motivational sidebar */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-3">Daily inspiration</h2>
          <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100">
            <p className="text-sm text-indigo-800 leading-relaxed italic">"{quote}"</p>
          </Card>

          <div className="mt-4">
            <h2 className="font-semibold text-gray-900 mb-3">Quick tips</h2>
            <Card className="p-4">
              <ul className="flex flex-col gap-2.5 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Speak at a natural pace — don't rush
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Focus on one category at a time
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">✓</span>
                  Review word feedback after each session
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
