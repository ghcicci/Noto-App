// Registers navigation, global providers, and the auth gate (decides between Welcome/Login/Signup vs. main app)

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/config/supabase';
import * as Font from 'expo-font';

// Icons
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

// Auth Screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';

// Main App Screens
import HomeScreen from './src/screens/HomeScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import DayViewScreen from './src/screens/DayViewScreen';
import FocusModeScreen from './src/screens/FocusModeScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ⭐ NEW: Timer Screen
import FocusTimerScreen from './src/screens/FocusTimerScreen';

// Navigator objects
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const CalendarStack = createNativeStackNavigator();
const FocusStack = createNativeStackNavigator();

// -------------------------
// Focus Stack Navigator
// -------------------------
function FocusStackNavigator() {
  return (
    <FocusStack.Navigator screenOptions={{ headerShown: false }}>
      <FocusStack.Screen name="FocusMode" component={FocusModeScreen} />
      <FocusStack.Screen name="FocusTimer" component={FocusTimerScreen} />
    </FocusStack.Navigator>
  );
}

// -------------------------
// Auth Navigator
// -------------------------
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#000000' }
      }}
    >
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// -------------------------
// Calendar stack
// -------------------------
function CalendarStackNavigator() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarView" component={CalendarScreen} />
      <CalendarStack.Screen name="DayView" component={DayViewScreen} />
    </CalendarStack.Navigator>
  );
}

// -------------------------
// Main Bottom Tabs
// -------------------------
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          height: 74,
          borderTopWidth: 0,
        },
        tabBarActiveTintColor: '#3FE3BF',
        tabBarInactiveTintColor: '#888888',
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 12,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="list-check" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarStackNavigator}
        options={{
          tabBarIcon: ({ color }) => (
            <AntDesign name="calendar" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Focus"
        component={FocusStackNavigator}   // ⭐ IMPORTANT: NOW USE FOCUS STACK
        options={{
          tabBarIcon: ({ color }) => (
            <Feather name="book-open" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="settings" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// -------------------------
// App
// -------------------------
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      await Font.loadAsync({
        'Inter': require('./assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
      });
      setFontsLoaded(true);
    }
    loadFonts();

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🏁 [App.tsx] Initial session:", session?.user?.email || "null");
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔔 [App.tsx] Session changed:", session?.user?.email || "null");
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <NavigationContainer>
      {session ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
