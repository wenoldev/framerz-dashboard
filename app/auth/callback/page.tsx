'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // your initialized supabase client wrapper

export default function CallbackPage() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      if (error) {
        console.error('OAuth error:', error);
        router.push('/?error=auth_failed');
        return;
      }

      // Now the session is stored in cookies & localStorage
      router.push('/dashboard');
    };

    handleOAuthCallback();
  }, [router, supabase]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Processing login...</h1>
        <p>Please wait while we authenticate your account.</p>
      </div>
    </div>
  );
}
