// services/auth.ts
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Linking from "expo-linking";
import { supabase } from "../config/supabase";

// 1. Complete auth session handling (must be called outside component)
WebBrowser.maybeCompleteAuthSession();

/**
 * Hook to handle Google OAuth sign-in with Supabase in an Expo Development Build.
 * 
 * @returns {Object} - signInWithGoogle function, loading state, and error state
 */
export function useGoogleAuth() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log("🔧 [useGoogleAuth] Hook initialized");

    // 2. Auth State Change Listener
    // Note: App.tsx already has the main listener, so this is optional/redundant
    // Keeping it for logging purposes only
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log("🔔 [useGoogleAuth] Auth event:", event);

                if (event === "SIGNED_IN" && session) {
                    console.log("✅ [useGoogleAuth] User signed in:", session.user.email);
                    // Don't show Alert here - App.tsx will handle navigation
                }

                if (event === "SIGNED_OUT") {
                    console.log("👋 [useGoogleAuth] User signed out");
                }
            }
        );

        return () => {
            console.log("🧹 Cleaning up auth listener in useGoogleAuth");
            subscription.unsubscribe();
        };
    }, []);

    // 3. Deep Link Handler (backup for when app is already open)
    useEffect(() => {
        const handleDeepLink = async (event: { url: string }) => {
            console.log("🔗 Deep link received:", event.url);

            if (event.url.includes('#access_token=')) {
                try {
                    // Extract tokens from URL hash
                    const params = new URLSearchParams(event.url.split('#')[1]);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');

                    if (access_token && refresh_token) {
                        console.log("🔑 Tokens extracted from deep link");
                        const { data, error } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });

                        if (error) {
                            console.error("❌ Session error from deep link:", error);
                            Alert.alert("Error", "Failed to complete sign in");
                        } else if (data.session) {
                            console.log("✅ Session established from deep link:", data.session.user.email);
                        }
                    }
                } catch (err: any) {
                    console.error("💥 Deep link handling error:", err);
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleDeepLink);

        return () => {
            console.log("🧹 Cleaning up deep link listener");
            subscription.remove();
        };
    }, []);

    /**
     * Initiates Google OAuth sign-in flow
     */
    const signInWithGoogle = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log("🚀 Starting Google OAuth flow...");

            // 4. Generate redirect URI
            // CRITICAL: useProxy: false for Development Builds with custom scheme
            const redirectTo = AuthSession.makeRedirectUri({
                scheme: 'todoapp',
                useProxy: false,
            });
            console.log("🔗 Using redirect URI:", redirectTo);
            console.log("⚙️  Ensure this URI is added to Supabase Dashboard:");
            console.log("   Authentication > URL Configuration > Redirect URLs");

            // 5. Initiate OAuth flow with Supabase
            const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo,
                    queryParams: {
                        access_type: "offline",
                        prompt: "consent"
                    },
                },
            });

            if (oauthError) throw oauthError;

            console.log("🧭 Supabase OAuth URL obtained");

            // 6. Open web browser for authentication
            const result = await WebBrowser.openAuthSessionAsync(
                data.url,
                redirectTo
            );

            console.log("📱 Browser result type:", result.type);

            // 7. Handle the authentication result
            if (result.type === "success") {
                console.log("🔗 Redirect URL received:", result.url);

                // Extract tokens from URL hash
                const params = new URLSearchParams(result.url.split('#')[1]);
                const access_token = params.get('access_token');
                const refresh_token = params.get('refresh_token');

                if (!access_token || !refresh_token) {
                    throw new Error('No tokens found in redirect URL');
                }

                console.log("🔑 Tokens extracted, setting session...");

                // Set the session with extracted tokens
                const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                    access_token,
                    refresh_token,
                });

                if (sessionError) {
                    throw new Error(`Session error: ${sessionError.message}`);
                }

                if (sessionData.session) {
                    console.log("✅ Session established:", sessionData.session.user.email);
                    console.log("🎉 OAuth flow completed successfully");
                    console.log("🏠 App.tsx should now navigate to MainTabNavigator");
                } else {
                    console.warn("⚠️ No session found after setSession");
                }

            } else if (result.type === "cancel") {
                console.log("❌ User cancelled the OAuth flow");
                Alert.alert("Cancelled", "Sign in was cancelled");
            } else {
                console.warn("⚠️ OAuth flow ended with type:", result.type);
            }

        } catch (err: any) {
            console.error("💥 Google sign-in failed:", err);
            setError(err.message);
            Alert.alert(
                "Sign In Failed",
                err.message || "An unexpected error occurred"
            );
        } finally {
            setIsLoading(false);
        }
    };

    return {
        signInWithGoogle,
        isLoading,
        error
    };
}

/*
USAGE EXAMPLE:

import { useGoogleAuth } from './services/auth';

function LoginScreen() {
    const { signInWithGoogle, isLoading, error } = useGoogleAuth();

    return (
        <View>
            <Button 
                title={isLoading ? "Signing in..." : "Sign In with Google"} 
                onPress={signInWithGoogle}
                disabled={isLoading}
            />
            {error && <Text style={{ color: 'red' }}>{error}</Text>}
        </View>
    );
}

SETUP CHECKLIST:
1. ✅ Add 'todoapp://' to Supabase > Authentication > URL Configuration > Redirect URLs
2. ✅ Ensure scheme: 'todoapp' matches your app.json scheme
3. ✅ Google OAuth credentials configured in Supabase
4. ✅ Testing on Development Build (NOT Expo Go)
5. ✅ Supabase client initialized with correct URL and anon key
*/