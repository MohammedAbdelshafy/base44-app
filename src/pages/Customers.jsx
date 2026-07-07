import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import StatusBadge from '@/components/shared/StatusBadge';
import PropertyTypeBadge from '@/components/shared/PropertyTypeBadge';
import { Button } from '@/components/ui/button';
import { Link2, Unlink, Edit2, UsersRound } from 'lucide-react';
import LinkPropertyDialog from '@/components/customers/LinkPropertyDialog';
import EditCustomerDialog from '@/components/customers/EditCustomerDialog';

export default function Customers() {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [linkUser, setLinkUser] = useState(null);
  const [editUser, setEditUser] = useState(null);

  async function load() {
    const [u, b, s] = await Promise.all([
      base44.entities.User.list('-created_date'),
      base44.entities.Building.list(),
      base44.entities.Subscription.list(),
    ]);
    setUsers(u.filter(x => x.role === 'customer'));
    setBuildings(b);
    setSubscriptions(s);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const buildingMap = {};
  buildings.forEach(b => { buildingMap[b.id] = b; });
  const subMap = {};
  subscriptions.forEach(s => { subMap[s.building_id] = s; });

  let filtered = users;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  }

  const total = users.length;
  const linked = users.filter(u => u.building_id && buildingMap[u.building_id]).length;
  const notLinked = total - linked;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('customers')} />

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border shadow-sm text-center">
          <p className="text-2xl font-bold text-navy" dir="ltr">{total}</p>
          <p className="text-xs text-muted-foreground">{t('total_customers')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm text-center">
          <p className="text-2xl font-bold text-green" dir="ltr">{linked}</p>
          <p className="text-xs text-muted-foreground">{t('linked')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border shadow-sm text-center">
          <p className="text-2xl font-bold text-amber-600" dir="ltr">{notLinked}</p>
          <p className="text-xs text-muted-foreground">{t('not_linked')}</p>
        </div>
      </div>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        filterValue="all"
        onFilterChange={() => {}}
      />

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">{t('full_name')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('phone')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('email')}</th>
                <th className="text-start p-3 font-semibold">{t('linked_property')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('subscription')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('signup_date')}</th>
                <th className="text-start p-3 font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center">
                  <UsersRound size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_customers')}</p>
                  <p className="text-sm text-muted-foreground">{t('empty_customers_desc')}</p>
                </td></tr>
              )}
              {filtered.map(u => {
                const building = u.building_id ? buildingMap[u.building_id] : null;
                const sub = building ? subMap[building.id] : null;
                return (
                  <tr key={u.id} className="hover:bg-muted/20">
                    <td className="p-3 font-medium">{u.full_name || '—'}</td>
                    <td className="p-3 hidden sm:table-cell" dir="ltr">
                      {u.phone ? <a href={`tel:${u.phone}`} className="text-cyan">{u.phone}</a> : '—'}
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">{u.email}</td>
                    <td className="p-3">
                      {building ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{building.name}</span>
                          <PropertyTypeBadge type={building.property_type} />
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-xs bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full font-semibold">
                          {t('not_linked_yet')}
                        </span>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell">{sub ? <StatusBadge status={sub.status} /> : '—'}</td>
                    <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(u.created_date)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {building ? (
                          <Button variant="ghost" size="sm" onClick={() => setLinkUser(u)} className="text-amber-600">
                            <Unlink size={14} className="me-1" /> {t('unlink')}
                          </Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setLinkUser(u)} className="text-cyan">
                            <Link2 size={14} className="me-1" /> {t('link')}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setEditUser(u)}><Edit2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <LinkPropertyDialog
        open={!!linkUser}
        user={linkUser}
        buildings={buildings}
        users={users}
        onClose={() => setLinkUser(null)}
        onSaved={load}
      />
      <EditCustomerDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onSaved={load}
      />
    </div>
  );
}