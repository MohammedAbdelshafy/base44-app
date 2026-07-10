import React, { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function EditCustomerDialog({ open, user, onClose, onSaved }) {
  const { t } = useLang();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.full_name || '');
    setPhone(user?.phone || '');
  }, [user?.id, open]);

  async function handleSave() {
    setSaving(true);
    try {
      await supabase.from('users').update({ full_name: name, phone }).eq('id', user.id);
      toast({ title: t('saved') });
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
        <DialogHeader><DialogTitle>{t('contact_info')}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('full_name')}</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>{t('phone')}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>{t('cancel')}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-navy hover:bg-navy/90">
              {saving ? <Loader2 className="animate-spin me-1" size={16} /> : null}
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}