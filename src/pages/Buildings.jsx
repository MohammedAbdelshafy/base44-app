import React, { useState, useEffect } from 'react';
import { dataAccess } from '@/api/dataAccess';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime } from '@/lib/dateUtils';
import PageHeader from '@/components/shared/PageHeader';
import SearchFilter from '@/components/shared/SearchFilter';
import StatusBadge from '@/components/shared/StatusBadge';
import PropertyTypeBadge from '@/components/shared/PropertyTypeBadge';
import { PropertyTypeFilter } from '@/components/shared/PropertyTypeSelect';
import { isApartmentType } from '@/lib/propertyTypes';
import BuildingForm from '@/components/buildings/BuildingForm';
import BuildingNotesLog from '@/components/buildings/BuildingNotesLog';
import { getEffectiveRepCode } from '@/lib/salesUtils';
import { Button } from '@/components/ui/button';
import { Plus, Eye, Edit2, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Buildings() {
  const { t } = useLang();
  const { user } = useAuth();
  const role = user?.role;
  const [buildings, setBuildings] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editBuilding, setEditBuilding] = useState(null);
  const [viewBuilding, setViewBuilding] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      const [b, s, sm] = await Promise.all([
        dataAccess.buildings.list('-created_date'),
        dataAccess.subscriptions.list(),
        dataAccess.salesMembers.list(),
      ]);
      setBuildings(b);
      setSubscriptions(s);
      setSalesMembers(sm);
    } catch (err) {
      console.error('Buildings load failed:', err);
      setError(t('failed_to_load_buildings'));
    }
  }

  useEffect(() => { load(); }, []);

  const subMap = {};
  subscriptions.forEach(s => { subMap[s.building_id] = s; });

  let filtered = buildings;
  if (role === 'sales_rep' && user) {
    const effectiveRepCode = getEffectiveRepCode(user, salesMembers);
    filtered = filtered.filter(b => b.rep_code === effectiveRepCode);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(b =>
      b.name?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q) ||
      b.bawab_name?.toLowerCase().includes(q) ||
      b.contact_person_name?.toLowerCase().includes(q) ||
      b.rep_code?.toLowerCase().includes(q)
    );
  }
  if (statusFilter !== 'all') {
    filtered = filtered.filter(b => subMap[b.id]?.status === statusFilter);
  }
  if (typeFilter !== 'all') {
    filtered = filtered.filter(b => (b.property_type || 'apartment_building') === typeFilter);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-navy/20 border-t-navy rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('buildings')}>
        <Button onClick={() => { setEditBuilding(null); setFormOpen(true); }} className="bg-navy hover:bg-navy/90">
          <Plus size={16} className="me-1" /> {t('add_building')}
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            filterValue={statusFilter}
            onFilterChange={setStatusFilter}
            filterOptions={[
              { value: 'trialing', label: t('trialing') },
              { value: 'active', label: t('active') },
              { value: 'paused', label: t('paused') },
              { value: 'cancelled', label: t('cancelled') },
            ]}
          />
        </div>
        <PropertyTypeFilter value={typeFilter} onChange={setTypeFilter} className="w-full sm:w-48" />
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-start p-3 font-semibold">{t('building_name')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('property_type')}</th>
                <th className="text-start p-3 font-semibold hidden md:table-cell">{t('address')}</th>
                <th className="text-start p-3 font-semibold hidden sm:table-cell">{t('bawab_name')}</th>
                <th className="text-start p-3 font-semibold">{t('subscription')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('rep_code')}</th>
                <th className="text-start p-3 font-semibold hidden lg:table-cell">{t('created_at')}</th>
                <th className="text-start p-3 font-semibold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-12 text-center">
                  <Building2 size={48} strokeWidth={1.5} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-lg font-semibold text-navy mb-1">{t('empty_buildings')}</p>
                  <p className="text-sm text-muted-foreground mb-4">{t('empty_buildings_desc')}</p>
                  {(role === 'admin' || role === 'ops' || role === 'sales_rep' || role === 'data_manager') && (
                    <Button onClick={() => { setEditBuilding(null); setFormOpen(true); }} className="bg-navy hover:bg-navy/90">
                      <Plus size={16} className="me-1" /> {t('add_building')}
                    </Button>
                  )}
                </td></tr>
              )}
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-medium">{b.name}</td>
                  <td className="p-3 hidden md:table-cell"><PropertyTypeBadge type={b.property_type} /></td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{b.address}</td>
                  <td className="p-3 hidden sm:table-cell">{isApartmentType(b.property_type) ? (b.bawab_name || '—') : (b.contact_person_name || '—')}</td>
                  <td className="p-3"><StatusBadge status={subMap[b.id]?.status || 'trialing'} /></td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground">{b.rep_code || '—'}</td>
                  <td className="p-3 hidden lg:table-cell text-xs text-muted-foreground">{formatDateTime(b.created_at)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setViewBuilding(b)}><Eye size={16} /></Button>
                      {(role === 'admin' || role === 'ops' || role === 'sales_rep' || role === 'data_manager') && (
                        <Button variant="ghost" size="icon" onClick={() => { setEditBuilding(b); setFormOpen(true); }}><Edit2 size={16} /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BuildingForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        building={editBuilding}
        onSaved={load}
      />

      {/* View Dialog */}
      <Dialog open={!!viewBuilding} onOpenChange={() => setViewBuilding(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewBuilding?.name}</DialogTitle>
          </DialogHeader>
          {viewBuilding && (
            <div className="space-y-3 text-sm">
              {viewBuilding.photo && <img src={viewBuilding.photo} alt="" className="w-full h-40 object-cover rounded-lg" />}
              <div><span className="text-muted-foreground">{t('property_type')}:</span> <PropertyTypeBadge type={viewBuilding.property_type} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">{t('address')}:</span> {viewBuilding.address}</div>
                {isApartmentType(viewBuilding.property_type) ? (
                  <>
                    <div><span className="text-muted-foreground">{t('bawab_name')}:</span> {viewBuilding.bawab_name || '—'}</div>
                    <div>
                      <span className="text-muted-foreground">{t('bawab_phone')}:</span>{' '}
                      {viewBuilding.bawab_phone ? (
                        <a href={`tel:${viewBuilding.bawab_phone}`} className="text-cyan underline" dir="ltr">{viewBuilding.bawab_phone}</a>
                      ) : '—'}
                    </div>
                    <div><span className="text-muted-foreground">{t('num_floors')}:</span> {viewBuilding.num_floors || '—'}</div>
                    <div><span className="text-muted-foreground">{t('num_apartments')}:</span> {viewBuilding.num_apartments || '—'}</div>
                  </>
                ) : (
                  <>
                    <div><span className="text-muted-foreground">{t('contact_person_name')}:</span> {viewBuilding.contact_person_name || '—'}</div>
                    <div>
                      <span className="text-muted-foreground">{t('contact_person_phone')}:</span>{' '}
                      {viewBuilding.contact_person_phone ? (
                        <a href={`tel:${viewBuilding.contact_person_phone}`} className="text-cyan underline" dir="ltr">{viewBuilding.contact_person_phone}</a>
                      ) : '—'}
                    </div>
                  </>
                )}
                <div><span className="text-muted-foreground">{t('rep_code')}:</span> {viewBuilding.rep_code || '—'}</div>
                <div><span className="text-muted-foreground">{t('subscription')}:</span> <StatusBadge status={subMap[viewBuilding.id]?.status || 'trialing'} /></div>
                <div><span className="text-muted-foreground">{t('created_at')}:</span> {formatDateTime(viewBuilding.created_at)}</div>
              </div>
              {viewBuilding.notes && <div><span className="text-muted-foreground">{t('notes')}:</span> {viewBuilding.notes}</div>}
              <div className="pt-2 border-t">
                <BuildingNotesLog buildingId={viewBuilding.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}