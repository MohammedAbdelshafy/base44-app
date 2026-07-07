import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { formatDateTime, nowCairo } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function BuildingNotesLog({ buildingId }) {
  const { t } = useLang();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!buildingId) return;
    const n = await base44.entities.BuildingNote.filter({ building_id: buildingId }, '-created_date');
    setNotes(n);
  }

  useEffect(() => { load(); }, [buildingId]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    await base44.entities.BuildingNote.create({
      building_id: buildingId,
      note: newNote.trim(),
      author_id: user?.id,
      author_name: user?.full_name || user?.email || '',
      timestamp: nowCairo().toISOString(),
    });
    setNewNote('');
    setSaving(false);
    load();
  }

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-navy text-sm">{t('customer_service_notes')}</h4>
      <div className="flex gap-2">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          rows={2}
          placeholder={t('add_note')}
          className="text-sm"
        />
        <Button onClick={addNote} disabled={saving || !newNote.trim()} className="bg-navy hover:bg-navy/90 self-start shrink-0">
          {t('add')}
        </Button>
      </div>
      <div className="space-y-2 max-h-48 overflow-auto">
        {notes.length === 0 && <p className="text-xs text-muted-foreground">{t('no_data')}</p>}
        {notes.map(n => (
          <div key={n.id} className="bg-muted/30 rounded-lg p-2 text-sm">
            <p>{n.note}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {n.author_name} · {formatDateTime(n.timestamp || n.created_date)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}