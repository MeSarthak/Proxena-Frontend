import { useEffect, useState } from 'react';
import { sessionsApi } from '../lib/api';
import type { SessionSummary } from '../types';
import { Card } from '../components/ui/Card';
import { formatDate, formatPercent, scoreColor } from '../lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ChartPoint {
  date: string;
  accuracy: number | null;
  fluency: number | null;
}

function EmptyChart() {
  return (
    <div className="h-52 flex items-center justify-center text-gray-400 text-sm">
      Complete a few sessions to see your trend
    </div>
  );
}

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    setLoading(true);
    sessionsApi
      .history(page, LIMIT)
      .then((r) => {
        setSessions(r.sessions);
        setTotal(r.pagination.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  // Prepare chart data — reverse to show oldest→newest
  const chartData: ChartPoint[] = [...sessions]
    .reverse()
    .map((s) => ({
      date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      accuracy: s.overallAccuracy,
      fluency: s.fluencyScore,
    }));

  // Weak sounds — words with Mispronunciation (from latest 5 sessions)
  const avgAccuracy =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.overallAccuracy ?? 0), 0) / sessions.length
      : null;

  const avgFluency =
    sessions.length > 0
      ? sessions.reduce((acc, s) => acc + (s.fluencyScore ?? 0), 0) / sessions.length
      : null;

  const best = sessions.reduce<SessionSummary | null>(
    (b, s) => (!b || (s.overallAccuracy ?? 0) > (b.overallAccuracy ?? 0) ? s : b),
    null,
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Track your pronunciation improvement over time</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{total}</p>
          <p className="text-sm text-gray-500 mt-1">Total sessions</p>
        </Card>
        <Card className="text-center">
          <p className={`text-3xl font-bold ${scoreColor(avgAccuracy)}`}>
            {formatPercent(avgAccuracy, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Avg. accuracy</p>
        </Card>
        <Card className="text-center">
          <p className={`text-3xl font-bold ${scoreColor(avgFluency)}`}>
            {formatPercent(avgFluency, 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Avg. fluency</p>
        </Card>
      </div>

      {/* Accuracy over time */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Accuracy over time</h2>
        {loading ? (
          <div className="h-52 skeleton" />
        ) : chartData.length < 2 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="accuracy"
                name="Accuracy"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Fluency trend */}
      <Card className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Fluency trend</h2>
        {loading ? (
          <div className="h-52 skeleton" />
        ) : chartData.length < 2 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="fluency"
                name="Fluency"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Best session highlight */}
      {best && (
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
          <h2 className="font-semibold text-gray-900 mb-1">Your best session</h2>
          <p className="text-sm text-gray-600">
            On {formatDate(best.createdAt)}, you achieved{' '}
            <span className="font-bold text-green-700">
              {formatPercent(best.overallAccuracy, 0)} accuracy
            </span>{' '}
            and{' '}
            <span className="font-bold text-green-700">
              {formatPercent(best.fluencyScore, 0)} fluency
            </span>
            . Keep aiming for that standard!
          </p>
        </Card>
      )}

      {/* Sessions table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">All sessions</h2>
          <span className="text-xs text-gray-400">{total} total</span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 skeleton" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No sessions yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Accuracy</th>
                    <th className="pb-2 font-medium text-right">Fluency</th>
                    <th className="pb-2 font-medium text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((s) => (
                    <tr key={s.publicId} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 text-gray-700">{formatDate(s.createdAt)}</td>
                      <td className={`py-2.5 text-right font-semibold tabular-nums ${scoreColor(s.overallAccuracy)}`}>
                        {formatPercent(s.overallAccuracy, 0)}
                      </td>
                      <td className={`py-2.5 text-right font-semibold tabular-nums ${scoreColor(s.fluencyScore)}`}>
                        {formatPercent(s.fluencyScore, 0)}
                      </td>
                      <td className="py-2.5 text-right text-gray-500 tabular-nums">
                        {s.durationSeconds != null ? `${s.durationSeconds}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
