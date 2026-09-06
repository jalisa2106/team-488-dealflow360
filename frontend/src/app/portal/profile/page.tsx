'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

export default function PortalProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch('/api/portal/profile')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProfile(data.customer);
          setContactName(data.customer.contactName || '');
          setEmail(data.customer.email || '');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Both fields are required');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/portal/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="card text-center" style={{ padding: 40 }}>
        <h3>Profile not found</h3>
        <p>You are not linked to a customer account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Company Profile</h1>
      </div>

      <div className="card section">
        <h2 className="section-title">Company Information</h2>
        <div className="space-y-4">
          <div className="field-group">
            <label className="field-label">Company Name</label>
            <input className="input" value={profile.companyName} disabled style={{ backgroundColor: 'var(--surface-sunken)' }} />
            <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginTop: 4 }}>Contact your sales rep to change company name.</p>
          </div>
          <div className="field-group">
            <label className="field-label">Contact Name</label>
            <input className="input" value={contactName} onChange={e => setContactName(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Email Address</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={handleUpdateProfile} disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="card section">
        <h2 className="section-title">Change Password</h2>
        <div className="space-y-4">
          <div className="field-group">
            <label className="field-label">Current Password</label>
            <input className="input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">New Password</label>
            <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>
          <button className="btn btn-secondary" onClick={handleUpdatePassword} disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
}
