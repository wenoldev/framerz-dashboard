// app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js'; // Your Supabase client instance

export default function CallbackPage() {
    const router = useRouter();
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');

                if (accessToken && refreshToken) {
                    // Set session in client
                    const { error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });

                    if (error) {
                        console.error('Error setting session:', error);
                        router.push('/?error=auth_failed');
                        return;
                    }

                    // Force a hard refresh to ensure server gets the cookies
                    // window.location.href = '/dashboard';
                } else {
                    router.push('/');
                }
                // Get the session from the URL hash that Supabase OAuth redirects to
                const { data, error } = await supabase.auth.getSession();

            if (error || !data.session) {
                throw error || new Error('No session found');
            }

            // Successful authentication
            router.push('/dashboard');
        } catch (error) {
            console.error('Error during OAuth callback:', error);
            router.push('/');
        }
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