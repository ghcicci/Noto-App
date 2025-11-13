import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../config/supabase';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
    useEffect(() => {
        WebBrowser.maybeCompleteAuthSession();
    }, []);

    async function signInWithGoogle() {
        // ✅ Correct redirect URI for Expo Go
        const redirectTo = AuthSession.makeRedirectUri({
            useProxy: true,
        });

        console.log('✅ Redirect URI:', redirectTo);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                skipBrowserRedirect: false,
            },
        });

        if (error) {
            console.error('❌ Google OAuth error:', error.message);
            return;
        }

        // The browser will open automatically now
    }

    return { signInWithGoogle };
}
