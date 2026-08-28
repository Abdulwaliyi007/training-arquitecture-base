'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/context/auth-context';
import { apiFetch, ApiError } from '@/lib/api';

interface Group {
  id: string;
  name: string;
}

function CreateNotificationForm() {
  const { user } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'group' | 'user'>('group');
  const [groupId, setGroupId] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      // Admin can target any group — fetch the full list.
      apiFetch<{ data: Group[] }>('/groups?page=1&limit=100')
        .then((res) => setGroups(res.data))
        .catch(() => setError('Could not load groups.'));
    } else if (user) {
      // Manager — restricted to their own groups (already on the user object).
      setGroups(user.groups);
    }
  }, [user]);

  useEffect(() => {
    if (groups.length > 0 && !groupId) {
      setGroupId(groups[0].id);
    }
  }, [groups, groupId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const payload =
        targetType === 'group'
          ? { title, body, groupId }
          : { title, body, userId };

      await apiFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccess('Notification sent.');
      setTitle('');
      setBody('');
      setUserId('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 max-w-lg mx-auto w-full px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">New notification</h1>
        <button
          onClick={() => router.push('/notifications')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Back to notifications
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium mb-1">
            Message
          </label>
          <textarea
            id="body"
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Send to</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                checked={targetType === 'group'}
                onChange={() => setTargetType('group')}
              />
              Group
            </label>
            {user?.role === 'ADMIN' && (
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  checked={targetType === 'user'}
                  onChange={() => setTargetType('user')}
                />
                Individual user (by ID)
              </label>
            )}
          </div>

          {targetType === 'group' ? (
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              {groups.length === 0 && <option value="">No groups available</option>}
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded-md py-2 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending…' : 'Send notification'}
        </button>
      </form>
    </main>
  );
}

export default function NewNotificationPage() {
  return (
    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN']}>
      <CreateNotificationForm />
    </ProtectedRoute>
  );
}