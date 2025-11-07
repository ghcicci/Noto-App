// services/auth.ts

import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../config/supabase';
import { useEffect } from 'react';
import { Alert } from 'react-native';

// 1. Crucial for dismissing the web browser session correctly
WebBrowser.maybeCompleteAuthSession();

// Define the correct Expo Auth Proxy Redirect URI
// This MUST match the URI set in your app.json (originalFullName)
// AND the URI registered in your Google Cloud Console and Supabase settings.
const EXPO_GO_REDIRECT_URI = 'https://auth.expo.io/@park1318/TodoApp/auth';

export function useGoogleAuth() {
    console.log('🔧 useGoogleAuth hook initialized');

    // 2. Monitor auth state changes to react to a successful sign-in
    useEffect(() => {
        // Use onAuthStateChange to watch for the session being set
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Auth event:', event);
            
            if (event === 'SIGNED_IN' && session) {
                console.log('✅ User signed in:', session.user.email);
                Alert.alert('Success!', `Welcome ${session.user.email}`);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            console.log('🚀 Starting Google OAuth flow...');

            // The 'redirectTo' parameter tells Supabase where Google should send the user back to.
            // For Expo Go, this must be the Expo Auth Proxy URL.
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: EXPO_GO_REDIRECT_URI, // <--- THE CRITICAL FIX
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                },
            });

            if (error) {
                console.error('❌ OAuth error:', error);
                throw error;
            }

            console.log('🌐 Opening browser...');

            // Open the browser to the URL provided by Supabase
            const result = await WebBrowser.openBrowserAsync(data.url);

            console.log('📱 Browser result type:', result.type);
            
            // Note: On native, WebBrowser.openBrowserAsync doesn't block execution, 
            // the session is typically set via deep linking after the browser closes.
            
            // Small delay and manual session check (your original workaround, which is useful)
            await new Promise(resolve => setTimeout(resolve, 2000));

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (session) {
                console.log('✅ Session found on return.');
                // onAuthStateChange will handle the success alert
            } else if (sessionError) {
                console.error('❌ Error checking session:', sessionError.message);
            } else {
                console.log('⚠️ Session may be delayed or was checked by onAuthStateChange.');
                // We trust the onAuthStateChange hook to catch the login event
            }

        } catch (error: any) {
            console.error('❌ Google sign-in error:', error.message);
            Alert.alert('Error', 'Failed to sign in with Google');
        }
    };

    return { signInWithGoogle };
}