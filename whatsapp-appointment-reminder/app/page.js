'use client';

import { useState } from 'react';

export default function NewAppointmentPage() {
  const [form, setForm] = useState({
    customerName: '',
    phoneNumber: '',
    appointmentTime: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!form.customerName.trim() || !form.phoneNumber.trim() || !form.appointmentTime) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.customerName.trim(),
          phone_number: form.phoneNumber.trim(),
          appointment_time: form.appointmentTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();

      setSuccess({
        name: form.customerName.trim(),
        phone: form.phoneNumber.trim(),
        time: formatDateTime(form.appointmentTime),
        channel: data.message?.channel || 'unknown',
        simulatedMessage: data.message?.simulatedMessage || null,
      });

      setForm({ customerName: '', phoneNumber: '', appointmentTime: '' });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function formatDateTime(iso) {
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

  function channelLabel(channel) {
    switch (channel) {
      case 'whatsapp':
        return '✓ Sent via WhatsApp';
      case 'sms':
        return '✓ Sent via SMS';
      case 'simulated':
        return '⚡ Simulated (message logged)';
      default:
        return 'Processed';
    }
  }

  function channelClass(channel) {
    if (channel === 'whatsapp' || channel === 'sms') return 'alert--success';
    return 'alert--info';
  }

  return (
    <div className="page-wrapper page-wrapper--narrow">
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <h1 className="page-title">New Appointment</h1>
        <p className="page-subtitle">
          Schedule a WhatsApp reminder for your customer.
        </p>
      </div>

      {success && (
        <div className={`alert ${channelClass(success.channel)}`} style={{ marginBottom: 'var(--space-6)' }}>
          <span className="alert__icon">{success.channel === 'simulated' ? '⚡' : '✓'}</span>
          <div className="alert__content">
            <strong>Appointment created — {channelLabel(success.channel)}</strong>
            <span>{success.name} — {success.phone}</span>
            <br />
            <span>{success.time}</span>
            {success.simulatedMessage && (
              <div className="simulated-preview">
                <span className="simulated-preview__label">Message preview:</span>
                <span className="simulated-preview__body">"{success.simulatedMessage}"</span>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert--error" style={{ marginBottom: 'var(--space-6)' }}>
          <span className="alert__icon">!</span>
          <div className="alert__content">
            <strong>Error</strong>
            {error}
          </div>
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="customerName" className="form-label">
              Customer Name
            </label>
            <input
              id="customerName"
              name="customerName"
              type="text"
              className="form-input"
              placeholder="Jane Doe"
              value={form.customerName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber" className="form-label">
              Phone Number
            </label>
            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="form-input"
              placeholder="+1234567890"
              value={form.phoneNumber}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="appointmentTime" className="form-label">
              Appointment Date &amp; Time
            </label>
            <input
              id="appointmentTime"
              name="appointmentTime"
              type="datetime-local"
              className="form-input"
              value={form.appointmentTime}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginTop: 'var(--space-8)' }}>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Scheduling…
                </>
              ) : (
                'Schedule Appointment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
