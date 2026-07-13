import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { dataAccess } from '@/api/dataAccess';
import { useAuth } from '@/lib/AuthContext';
import { useLang } from '@/lib/i18n';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit2, AlertTriangle, Clock, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const ROLES = ['admin', 'ops', 'sales_rep', 'banger', 'data_manager', 'driver', 'warehouse_foreman', 'customer'];
const STAFF_ROLES = ROLES.filter(r => r !== 'customer');

export default function UserManagement() {
  const { t } = useLang();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'driver' });
  const [editUser, setEditUser] = useState(null);
  const [editRole, setEditRole] = useState('');
  const [editRepCode, setEditRepCode] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [u, inv] = await Promise.all([
        dataAccess.users.list('-created_date'),
        dataAccess.invitations.filter({ status: 'pending' }, '-invited_at'),
      ]);
      setUsers(u);
      // Auto-accept invitations whose email now has a registered user.
      const emailSet = new Set(u.map(x => (x.email || '').toLowerCase()));
      const accepted = inv.filter(i => emailSet.has((i.email || '').toLowerCase()));
      if (accepted.length) {
        try {
          await supabase.from('invitations').update({ status: 'accepted' }).in('id', 
            accepted.map(i => i.id)
          );
        } catch (_e) { /* non-fatal */ }
        setInvitations(inv.filter(i => !emailSet.has((i.email || '').toLowerCase())));
      } else {
        setInvitations(inv);
      }
    } catch (err) {
      console.error('UserManagement load failed:', err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleInvite() {
    setSaving(true);
    try {
      // The platform's inviteUser only accepts 'user'/'admin'; invite as 'user'
      // and store the intended staff role on an Invitation record, which the
      // login guard resolves at first login.
      await supabase.from('invitations').insert([{
        email: inviteForm.email,
        intended_role: inviteForm.role,
        status: 'pending',
        invited_by_id: currentUser?.id || '',
        invited_by_name: currentUser?.full_name || '',
        invited_at: new Date().toISOString(),
      }]);

      supabase.functions.invoke('add-to-email-queue', {
        body: {
          recipient_email: inviteForm.email,
          subject: `You've been invited as ${inviteForm.role}`,
          body: `Hi,\n\nYou've been invited to join Dawrix as ${inviteForm.role}.\n\nPlease sign in at the app to get started.\n\n- Dawrix Team`,
        },
      }).catch(() => {});

      toast({ title: t('invite_sent') });
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'driver' });
      load();
    } catch (e) {
      toast({ title: e.message || String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleResend(inv) {
    try {
      supabase.functions.invoke('add-to-email-queue', {
        body: {
          recipient_email: inv.email,
          subject: `Reminder: You've been invited as ${inv.intended_role}`,
          body: `Hi,\n\nThis is a reminder that you've been invited to join Dawrix as ${inv.intended_role}.\n\nPlease sign in at the app to get started.\n\n- Dawrix Team`,
        },
      }).catch(() => {});
      toast({ title: t('invite_sent') });
    } catch (e) {
      toast({ title: e.message || String(e), variant: 'destructive' });
    }
  }

  async function handleCancelInvite(inv) {
    await supabase.from('invitations').update({ status: 'cancelled' }).eq('id', inv.id);
    load();
  }

  async function handleUpdateRole() {
    setSaving(true);
    await supabase.from('users').update({ role: editRole, rep_code: editRepCode }).eq('id', editUser.id);
    setSaving(false);
    setEditUser(null);
    load();
  }

  const registeredEmails = new Set(users.map(u => (u.email || '').toLowerCase()));
  const pendingInvites = invitations.filter(i => !registeredEmails.has((i.email || '').toLowerCase()));

  let filtered = users.filter(u => u.role !== 'customer');
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }
  if (roleFilter !== 'all') {
    filtered = filtered.filter(u => u.role === roleFilter);
  }

  let pendingFiltered = pendingInvites;
  if (search) {
    const q = search.toLowerCase();
    pendingFiltered = pendingFiltered.filter(i => i.email?.toLowerCase().includes(q));
  }
  if (roleFilter !== 'all') {
    pendingFiltered = pendingFiltered.filter(i => i.intended_role === roleFilter);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('team')}>
        <Button onClick={() => setInviteOpen(true)} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('invite_user')}
        </Button>
      </PageHeader>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filterValue={roleFilter}
        onFilterChange={setRoleFilter}
        filterOptions={STAFF_ROLES.map(r => ({ value: r, label: t(r) }))}
      />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-start p-3 font-semibold">{t('username')}</th>
              <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('email')}</th>
              <th className="text-start p-3 font-semibold">{t('role')}</th>
              <th className="text-start p-3 font-semibold hidden md:table-cell">{t('created_at')}</th>
              <th className="text-start p-3 font-semibold">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && pendingFiltered.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('no_data')}</td></tr>
            )}
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-muted/20">
                <td className="p-3 font-medium">{u.full_name || '—'}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  {(!u.role || u.role === 'user') ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                      <AlertTriangle size={12} /> {t('needs_role')}
                    </span>
                  ) : (
                    <span className="text-xs bg-navy/10 text-navy px-2 py-0.5 rounded-full font-semibold">{t(u.role)}</span>
                  )}
                </td>
                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(u.created_at)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {(!u.role || u.role === 'user') && (
                      <Button variant="outline" size="sm" onClick={() => { setEditUser(u); setEditRole('customer'); setEditRepCode(u.rep_code || ''); }} className="text-amber-600 border-amber-300">
                        <AlertTriangle size={14} className="me-1" /> {t('assign_role')}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setEditUser(u); setEditRole(u.role || 'driver'); setEditRepCode(u.rep_code || ''); }}>
                      <Edit2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {pendingFiltered.map(inv => (
              <tr key={inv.id} className="hover:bg-amber-50/60 bg-amber-50/40">
                <td className="p-3 font-medium text-muted-foreground">{inv.email}</td>
                <td className="p-3 hidden sm:table-cell text-muted-foreground">{inv.email}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                    <Clock size={12} /> {t(inv.intended_role)} · {t('pending_invite')}
                  </span>
                </td>
                <td className="p-3 hidden md:table-cell text-xs text-muted-foreground">{formatDateTime(inv.invited_at)}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleResend(inv)} className="text-cyan">
                      <RefreshCw size={14} className="me-1" /> {t('resend_invite')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleCancelInvite(inv)} className="text-destructive">
                      <X size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('invite_user')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('email')} *</Label><Input value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} dir="ltr" type="email" /></div>
            <div>
              <Label>{t('role')} *</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{t(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setInviteOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleInvite} disabled={saving || !inviteForm.email} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('invite_user')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('edit')} — {editUser?.full_name || editUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('role')}</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{t(r)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editRole === 'sales_rep' && (
              <div>
                <Label>{t('rep_code')}</Label>
                <Input value={editRepCode} onChange={e => setEditRepCode(e.target.value)} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>{t('cancel')}</Button>
              <Button onClick={handleUpdateRole} disabled={saving} className="bg-navy hover:bg-navy/90">
                {saving ? '...' : t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}