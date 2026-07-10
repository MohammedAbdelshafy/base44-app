import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PropertyTypeBadge from '@/components/shared/PropertyTypeBadge';
import { useToast } from '@/components/ui/use-toast';
import { Link2, Unlink, Loader2 } from 'lucide-react';

export default function LinkPropertyDialog({ open, user, buildings, users, onClose, onSaved }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setSelected(''); }, [user?.id, open]);

  const currentBuilding = user?.building_id ? buildings.find(b => b.id === user.building_id) : null;

  const linkedByOthers = useMemo(() => {
    const set = new Set();
    users.forEach(u => { if (u.id !== user?.id && u.building_id) set.add(u.building_id); });
    return set;
  }, [users, user?.id]);

  const available = useMemo(
    () => buildings.filter(b => !linkedByOthers.has(b.id)),
    [buildings, linkedByOthers]
  );

  const suggestions = useMemo(() => {
    if (!user) return [];
    const phone = user.phone;
    const name = user.full_name;
    return available.filter(b =>
      (phone && (b.bawab_phone === phone || b.contact_person_phone === phone)) ||
      (name && (b.bawab_name === name || b.contact_person_name === name))
    );
  }, [available, user]);

  async function handleLink() {
    if (!selected) return;
    setSaving(true);
    try {
      await supabase.from('users').update({ building_id: selected }).eq('id', user.id);
      toast({ title: t('linked') });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlink() {
    setSaving(true);
    try {
      await supabase.from('users').update({ building_id: '' }).eq('id', user.id);
      toast({ title: t('unlinked') });
      onSaved();
      onClose();
    } catch (e) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('link_property')} — {user?.full_name || user?.email}</DialogTitle>
        </DialogHeader>
        {currentBuilding ? (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">{t('linked_property')}</p>
              <p className="font-medium">{currentBuilding.name}</p>
              <div className="mt-1"><PropertyTypeBadge type={currentBuilding.property_type} /></div>
            </div>
            <Button variant="destructive" onClick={handleUnlink} disabled={saving} className="w-full">
              {saving ? <Loader2 className="animate-spin me-1" size={16} /> : <Unlink size={16} className="me-1" />}
              {t('unlink')}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-navy mb-2">{t('suggested_matches')}</p>
                <div className="space-y-2">
                  {suggestions.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b.id)}
                      className={`w-full text-start p-3 rounded-lg border transition-colors ${selected === b.id ? 'border-cyan bg-cyan/5' : 'border-border hover:bg-muted/30'}`}
                    >
                      <p className="font-medium text-sm">{b.name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <PropertyTypeBadge type={b.property_type} />
                        <span className="text-xs text-muted-foreground" dir="ltr">{b.bawab_phone || b.contact_person_phone || ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <Label>{t('select_property')}</Label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder={t('select_property')} /></SelectTrigger>
                <SelectContent>
                  {available.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleLink} disabled={saving || !selected} className="w-full bg-navy hover:bg-navy/90">
              {saving ? <Loader2 className="animate-spin me-1" size={16} /> : <Link2 size={16} className="me-1" />}
              {t('link')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}