'use client';

import { useEffect, useState, useCallback } from 'react';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { ApiError, apiFetch } from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'READ';
  groupId: string | null;
  recipientUserId: string;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  meta: { page: number; size: number; total: number; totalPages: number };
}

function NotificationsList() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), size: '10' });
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiFetch<NotificationsResponse>(
        `/notifications?${params.toString()}`,
      );
      setNotifications(res.data);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

    async function markAsRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'READ' } : n)),
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 405) {
        setError('You can only mark your own notifications as read.');
      } else {
        setError('Could not mark as read.');
      }
    }
  }

  const unreadCount = notifications.filter((n) => n.status !== 'READ').length;

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-gray-500">
            {user?.email} · {unreadCount} unread
          </p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Log out
        </button>
      </div>

      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="QUEUED">Queued</option>
          <option value="SENT">Sent</option>
          <option value="FAILED">Failed</option>
          <option value="READ">Read</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : notifications.length === 0 ? (
        <p className="text-gray-500">No notifications.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`border rounded-md p-4 ${
                n.status === 'READ' ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(n.createdAt).toLocaleString()} · {n.status}
                  </p>
                </div>
                {n.status !== 'READ' && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-sm px-3 py-1 border rounded-md disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-sm px-3 py-1 border rounded-md disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </main>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsList />
    </ProtectedRoute>
  );
}