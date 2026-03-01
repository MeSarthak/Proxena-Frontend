import { useEffect, useState } from 'react';
import { Check, Zap, Shield } from 'lucide-react';
import { subscriptionApi } from '../lib/api';
import type { Subscription } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { formatDate } from '../lib/utils';

const FREE_FEATURES = [
  '30 minutes of practice per day',
  'Up to 3 sessions per day',
  'Real-time word-level feedback',
  'Session history (last 10)',
  'Basic accuracy & fluency scores',
];

const PRO_FEATURES = [
  'Unlimited practice time',
  'Unlimited daily sessions',
  'Real-time word-level feedback',
  'Full session history',
  'Advanced analytics & trends',
  'Priority support',
  'Early access to new features',
];

function FeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <span
        className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs ${
          included ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-300'
        }`}
      >
        {included ? '✓' : '×'}
      </span>
      <span className={included ? 'text-gray-700' : 'text-gray-400'}>{text}</span>
    </li>
  );
}

const ALL_FEATURES = [
  'Practice minutes per day',
  'Daily session limit',
  'Real-time word feedback',
  'Session history',
  'Analytics dashboard',
  'Priority support',
  'Early access',
];

const FREE_HAS  = [true,  false, true,  false, false, false, false];
const PRO_HAS   = [true,  true,  true,  true,  true,  true,  true ];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    subscriptionApi.get()
      .then(setSubscription)
      .finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      await subscriptionApi.upgrade();
    } catch {
      setNotice('Subscription upgrade is coming soon. Stay tuned!');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const isPro = subscription?.planType === 'pro';

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your plan and unlock unlimited practice</p>
      </div>

      {notice && (
        <Alert variant="info" className="mb-6" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {/* Current plan card */}
      {!loading && subscription && (
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-gray-900">Current plan</h2>
                <Badge variant={isPro ? 'blue' : 'default'}>
                  {isPro ? '⚡ Pro' : 'Free'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                Status:{' '}
                <span className="font-medium capitalize">{subscription.status}</span>
              </p>
              {subscription.expiresAt && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Expires: {formatDate(subscription.expiresAt)}
                </p>
              )}
              {!isPro && (
                <p className="text-sm text-gray-500 mt-2">
                  You're on the free plan — up to 30 min/session and 3 sessions/day.
                </p>
              )}
            </div>
            {isPro ? (
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-gray-400" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Free */}
        <Card className={`flex flex-col ${!isPro ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 text-lg">Free</h3>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              $0
              <span className="text-sm font-normal text-gray-400"> / month</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">Perfect for getting started</p>
          </div>
          <ul className="flex flex-col gap-2.5 flex-1 mb-6">
            {FREE_FEATURES.map((f) => <FeatureRow key={f} text={f} included />)}
          </ul>
          {!isPro && (
            <Badge variant="success" className="w-fit">Current plan</Badge>
          )}
        </Card>

        {/* Pro */}
        <Card className="flex flex-col border-blue-200 bg-gradient-to-b from-blue-50 to-white">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-lg">Pro</h3>
              <Badge variant="blue">Most popular</Badge>
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              $2
              <span className="text-sm font-normal text-gray-400"> / month</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">For serious learners</p>
          </div>
          <ul className="flex flex-col gap-2.5 flex-1 mb-6">
            {PRO_FEATURES.map((f) => <FeatureRow key={f} text={f} included />)}
          </ul>
          {isPro ? (
            <Badge variant="success" className="w-fit">Current plan</Badge>
          ) : (
            <Button
              size="lg"
              className="w-full"
              loading={upgradeLoading}
              onClick={handleUpgrade}
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </Button>
          )}
        </Card>
      </div>

      {/* Comparison table */}
      <Card>
        <h2 className="font-semibold text-gray-900 mb-4">Feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left font-medium text-gray-500">Feature</th>
                <th className="pb-3 text-center font-medium text-gray-500 w-24">Free</th>
                <th className="pb-3 text-center font-medium text-blue-600 w-24">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ALL_FEATURES.map((f, i) => (
                <tr key={f}>
                  <td className="py-3 text-gray-700">{f}</td>
                  <td className="py-3 text-center">
                    {i === 0 ? <span className="text-gray-500 text-xs">30 min</span>
                    : i === 1 ? <span className="text-gray-500 text-xs">3/day</span>
                    : FREE_HAS[i]
                      ? <Check className="w-4 h-4 text-green-500 mx-auto" />
                      : <span className="text-gray-300 text-base">—</span>}
                  </td>
                  <td className="py-3 text-center">
                    {i === 0 ? <span className="text-blue-600 text-xs font-medium">Unlimited</span>
                    : i === 1 ? <span className="text-blue-600 text-xs font-medium">Unlimited</span>
                    : PRO_HAS[i]
                      ? <Check className="w-4 h-4 text-blue-500 mx-auto" />
                      : <span className="text-gray-300 text-base">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upgrade note */}
      {!isPro && (
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 p-5 bg-blue-600 rounded-2xl">
          <div className="flex-1">
            <p className="text-white font-semibold">Ready to accelerate your progress?</p>
            <p className="text-blue-100 text-sm mt-0.5">
              Upgrade to Pro and practise as much as you want, every day.
            </p>
          </div>
          <Button
            variant="secondary"
            size="lg"
            className="shrink-0"
            loading={upgradeLoading}
            onClick={handleUpgrade}
          >
            <Zap className="w-4 h-4" />
            Upgrade now
          </Button>
        </div>
      )}
    </div>
  );
}
