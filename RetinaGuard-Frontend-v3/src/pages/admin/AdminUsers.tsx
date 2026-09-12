import { useState } from 'react';
import { useQuery } from '../../lib/query';
import { adminService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatRelative, initials, isTrue, titleCase } from '../../lib/format';
import {
  Alert, Button, Card, EmptyState, Field, Input, SectionHeader, Select, SkeletonRows, Tabs,
} from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/clinical/indicators';
import { IconAlert, IconUsers } from '../../components/ui/icons';
import type { AuthUser, ManageableRole, Role } from '../../types';

const ROLE_TONE: Record<string, 'brand' | 'info' | 'success' | 'neutral'> = {
  technician: 'brand', reviewer: 'info', admin: 'success', district: 'neutral',
};

const MANAGEABLE_ROLES: ManageableRole[] = ['technician', 'reviewer', 'admin'];

interface UserForm {
  username: string;
  password: string;
  fullName: string;
  role: ManageableRole;
  facilityId: string;
  registrationNo: string;
}

const EMPTY_FORM: UserForm = {
  username: '', password: '', fullName: '', role: 'technician', facilityId: '', registrationNo: '',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [filter, setFilter] = useState<Role | 'all'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AuthUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState<AuthUser | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryFn: () => adminService.users({ limit: 100 }),
  });

  const users = data ?? [];
  const visible = filter === 'all' ? users : users.filter((u) => u.role === filter);
  const counts = (role: Role) => users.filter((u) => u.role === role).length;

  const isSelf = (u: AuthUser) => u.id === currentUser?.id;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (u: AuthUser) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: '',
      fullName: u.full_name,
      role: (MANAGEABLE_ROLES.includes(u.role as ManageableRole) ? u.role : 'technician') as ManageableRole,
      facilityId: u.facility_id ?? '',
      registrationNo: u.registration_no ?? '',
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async () => {
    setFormError(null);

    if (!form.fullName.trim()) return setFormError('Full name is required.');
    if (!editing) {
      if (form.username.trim().length < 3) return setFormError('Username must be at least 3 characters.');
      if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
    }

    setSaving(true);
    try {
      if (editing) {
        await adminService.update(editing.id, {
          fullName: form.fullName.trim(),
          role: form.role,
          facilityId: form.facilityId.trim() || undefined,
          registrationNo: form.registrationNo.trim() || undefined,
        });
      } else {
        await adminService.create({
          username: form.username.trim(),
          password: form.password,
          fullName: form.fullName.trim(),
          role: form.role,
          facilityId: form.facilityId.trim() || undefined,
          registrationNo: form.registrationNo.trim() || undefined,
        });
      }
      setFormOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save the account.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id: string, fn: () => Promise<unknown>, failMessage: string) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : failMessage);
    } finally {
      setBusyId(null);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    setConfirmText('');
    await runAction(target.id, () => adminService.remove(target.id), 'Could not delete the account.');
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          eyebrow="Administration"
          title="Users"
          description="Accounts on this edge node. Disabling an account revokes its refresh tokens immediately; deleting one is permanent."
        />
        <Button variant="primary" onClick={openCreate}>Create account</Button>
      </div>

      {error && (
        <Alert tone="danger" title="Action failed" icon={<IconAlert size={17} />}>{error}</Alert>
      )}

      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: 'all' as const, label: 'All', count: users.length },
          { id: 'technician' as const, label: 'Technicians', count: counts('technician') },
          { id: 'reviewer' as const, label: 'Reviewers', count: counts('reviewer') },
          { id: 'admin' as const, label: 'Admins', count: counts('admin') },
        ]}
      />

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : visible.length === 0 ? (
        <EmptyState icon={<IconUsers size={26} />} title="No accounts match this filter" />
      ) : (
        <>
          {/* Desktop table */}
          <Card padded={false} className="hidden overflow-hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['Name', 'Username', 'Role', 'Facility', 'Last sign-in', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-subtle)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-[var(--color-hover)]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-[var(--color-brand-50)] text-[11px] font-semibold text-[var(--color-brand-800)]">
                          {initials(u.full_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">
                            {u.full_name}
                            {isSelf(u) && (
                              <span className="ml-2 text-[11px] font-normal text-[var(--color-ink-subtle)]">(you)</span>
                            )}
                          </p>
                          {u.registration_no && (
                            <p className="clinical-id text-[11px] text-[var(--color-ink-subtle)]">{u.registration_no}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="clinical-id px-5 py-3.5 text-[13px] text-[var(--color-ink-muted)]">{u.username}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge tone={ROLE_TONE[u.role] ?? 'neutral'} size="sm">
                        {titleCase(u.role)}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[var(--color-ink-muted)]">{u.facility_id ?? '—'}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[var(--color-ink-subtle)]">{formatRelative(u.last_login_at)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge tone={isTrue(u.is_active) ? 'success' : 'neutral'} size="sm">
                        {isTrue(u.is_active) ? 'Active' : 'Disabled'}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                        {isTrue(u.is_active) ? (
                          <Button
                            size="sm" variant="ghost"
                            disabled={isSelf(u)}
                            title={isSelf(u) ? 'You cannot disable your own account' : undefined}
                            loading={busyId === u.id}
                            onClick={() => runAction(u.id, () => adminService.deactivate(u.id), 'Could not disable the account.')}
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            size="sm" variant="ghost"
                            loading={busyId === u.id}
                            onClick={() => runAction(u.id, () => adminService.activate(u.id), 'Could not enable the account.')}
                          >
                            Enable
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          disabled={isSelf(u)}
                          title={isSelf(u) ? 'You cannot delete your own account' : undefined}
                          className="text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
                          onClick={() => { setConfirmDelete(u); setConfirmText(''); }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {visible.map((u) => (
              <Card key={u.id} variant="dashboard">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--color-ink)]">
                      {u.full_name}{isSelf(u) && <span className="ml-1.5 text-[11px] text-[var(--color-ink-subtle)]">(you)</span>}
                    </p>
                    <p className="clinical-id mt-0.5 text-[12px] text-[var(--color-ink-muted)]">{u.username}</p>
                  </div>
                  <StatusBadge tone={isTrue(u.is_active) ? 'success' : 'neutral'} size="sm">
                    {isTrue(u.is_active) ? 'Active' : 'Disabled'}
                  </StatusBadge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <StatusBadge tone={ROLE_TONE[u.role] ?? 'neutral'} size="sm">{titleCase(u.role)}</StatusBadge>
                  <span className="text-[12px] text-[var(--color-ink-subtle)]">{formatRelative(u.last_login_at)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Edit</Button>
                  {isTrue(u.is_active) ? (
                    <Button
                      size="sm" variant="ghost" disabled={isSelf(u)} loading={busyId === u.id}
                      onClick={() => runAction(u.id, () => adminService.deactivate(u.id), 'Could not disable the account.')}
                    >
                      Disable
                    </Button>
                  ) : (
                    <Button
                      size="sm" variant="ghost" loading={busyId === u.id}
                      onClick={() => runAction(u.id, () => adminService.activate(u.id), 'Could not enable the account.')}
                    >
                      Enable
                    </Button>
                  )}
                  <Button
                    size="sm" variant="ghost" disabled={isSelf(u)}
                    className="text-[var(--color-danger)]"
                    onClick={() => { setConfirmDelete(u); setConfirmText(''); }}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create / edit */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit account' : 'Create account'}
        description={editing
          ? 'Username cannot be changed. To reset a password, disable the account and create a new one.'
          : 'The new account can sign in immediately.'}
        footer={(
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={submitForm}>
              {editing ? 'Save changes' : 'Create account'}
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          {formError && <Alert tone="danger" title="Check the form">{formError}</Alert>}

          <Field label="Full name" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Asha Patil"
            />
          </Field>

          {!editing && (
            <>
              <Field label="Username" required hint="At least 3 characters. Used to sign in.">
                <Input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  autoComplete="off"
                />
              </Field>
              <Field label="Password" required hint="At least 8 characters.">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
            </>
          )}

          <Field label="Role" required>
            <Select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as ManageableRole })}
            >
              <option value="technician">Technician</option>
              <option value="reviewer">Reviewer (Ophthalmologist)</option>
              <option value="admin">Administrator</option>
            </Select>
          </Field>

          <Field label="Facility ID" hint="Optional. Which PHC or centre this account belongs to.">
            <Input
              value={form.facilityId}
              onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
            />
          </Field>

          {form.role === 'reviewer' && (
            <Field label="Medical registration number" hint="Appears on every report this reviewer signs off.">
              <Input
                value={form.registrationNo}
                onChange={(e) => setForm({ ...form, registrationNo: e.target.value })}
              />
            </Field>
          )}
        </div>
      </Modal>

      {/* Delete confirmation — typed, because this is irreversible */}
      <Modal
        open={confirmDelete !== null}
        onClose={() => { setConfirmDelete(null); setConfirmText(''); }}
        title="Delete this account?"
        size="sm"
        description={confirmDelete
          ? `${confirmDelete.full_name} (${confirmDelete.username}) will lose access permanently. Their past screenings, reviews and audit history are retained.`
          : undefined}
        footer={(
          <>
            <Button variant="ghost" onClick={() => { setConfirmDelete(null); setConfirmText(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={confirmText !== confirmDelete?.username}
              onClick={doDelete}
            >
              Delete permanently
            </Button>
          </>
        )}
      >
        <Field
          label={`Type "${confirmDelete?.username ?? ''}" to confirm`}
          hint="This prevents deleting the wrong account by reflex."
        >
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
          />
        </Field>
      </Modal>
    </div>
  );
}
