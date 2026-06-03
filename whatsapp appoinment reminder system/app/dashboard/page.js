'use client';

import { useState, useEffect, useCallback } from 'react';

const STATUS_MAP = {
  confirmed:     { label: 'Confirmed',     className: 'badge--blue' },
  reminder_sent: { label: 'Reminder Sent', className: 'badge--green' },
  pending:       { label: 'Pending',        className: 'badge--gray' },
};

const CHANNEL_MAP = {
  whatsapp:  { label: 'WhatsApp', className: 'badge--green' },
  sms:       { label: 'SMS',      className: 'badge--blue' },
  simulated: { label: 'Simulated', className: 'badge--orange' },
};

function formatDate(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status || 'Unknown', className: 'badge--gray' };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

function ChannelBadge({ channel }) {
  const info = CHANNEL_MAP[channel] || { label: channel || '—', className: 'badge--gray' };
  return <span className={`badge ${info.className}`}>{info.label}</span>;
}

function SkeletonTable() {
  return (
    <div className="card">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton skeleton--row" />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('appointments');

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/appointments');
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.appointments ?? [];
      list.sort(
        (a, b) => new Date(b.appointment_time) - new Date(a.appointment_time)
      );
      setAppointments(list);
    } catch (err) {
      setError(err.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchAppointments();
    fetchMessages();
  }, [fetchAppointments, fetchMessages]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="page-wrapper">
      <div className="toolbar">
        <div className="toolbar__left">
          <h1 className="page-title">Dashboard</h1>
          {!loading && !error && (
            <span className="toolbar__count">
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} · {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          className="btn btn--secondary"
          onClick={refreshAll}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner spinner--dark" />
              Refreshing…
            </>
          ) : (
            '↻ Refresh'
          )}
        </button>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: 'var(--space-6)' }}>
          <span className="alert__icon">!</span>
          <div className="alert__content">
            <strong>Error</strong>
            {error}
          </div>
        </div>
      )}

      {/* Tab switcher */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'appointments' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button
          className={`tab ${activeTab === 'messages' ? 'tab--active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Message Log
        </button>
      </div>

      {/* ─── Appointments Tab ─── */}
      {activeTab === 'appointments' && (
        <>
          {loading ? (
            <SkeletonTable />
          ) : appointments.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state__icon">📅</div>
                <p className="empty-state__title">No appointments yet</p>
                <p className="empty-state__desc">
                  Create your first appointment to see it here.
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Phone Number</th>
                      <th>Appointment Time</th>
                      <th>Status</th>
                      <th>Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt, idx) => (
                      <tr key={apt.id || idx}>
                        <td className="table__name">{apt.customer_name}</td>
                        <td className="table__phone">{apt.phone_number}</td>
                        <td className="table__time">{formatDate(apt.appointment_time)}</td>
                        <td>
                          <StatusBadge status={apt.status} />
                        </td>
                        <td className="table__time">{formatDate(apt.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Message Log Tab ─── */}
      {activeTab === 'messages' && (
        <>
          {messagesLoading ? (
            <SkeletonTable />
          ) : messages.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state__icon">💬</div>
                <p className="empty-state__title">No messages yet</p>
                <p className="empty-state__desc">
                  Messages will appear here after scheduling an appointment.
                </p>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Type</th>
                      <th>Channel</th>
                      <th>Message</th>
                      <th>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((msg, idx) => (
                      <tr key={msg.id || idx}>
                        <td className="table__name">{msg.customer_name || '—'}</td>
                        <td className="table__phone">{msg.phone_number}</td>
                        <td>
                          <span className={`badge ${msg.message_type === 'reminder' ? 'badge--green' : 'badge--blue'}`}>
                            {msg.message_type === 'reminder' ? 'Reminder' : 'Confirmation'}
                          </span>
                        </td>
                        <td>
                          <ChannelBadge channel={msg.channel} />
                        </td>
                        <td className="table__message">{msg.message_body}</td>
                        <td className="table__time">{formatDate(msg.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
