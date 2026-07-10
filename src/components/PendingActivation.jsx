import React from 'react';
import { supabase } from '@/api/supabaseClient';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PendingActivation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-slate-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-lg border border-slate-100 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-amber-100">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-navy mb-2" dir="rtl">
          حسابك قيد التفعيل — كلم المدير لتحديد صلاحياتك
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Your account is pending activation — ask the admin to assign your role
        </p>
        <Button onClick={() => base44.auth.logout('/login')} variant="outline" className="w-full">
          Logout
        </Button>
      </div>
    </div>
  );
}