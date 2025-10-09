// Welcome to Noto Screen (No Animations)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

type AuthStack = {
  Welcome: undefined;
  Login: undefined;
  Signup: undefined;
};

type Nav = NativeStackNavigationProp<AuthStack, 'Welcome'>;

export default function WelcomeScreen() {
  const nav = useNavigation<Nav>();

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <SafeAreaView style={s.container}>
        <View style={s.top}>
          <Text style={s.heading}>Welcome to</Text>
          <Text style={s.logo}>Noto</Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={s.primary}
            onPress={() => nav.navigate('Signup')}
          >
            <Text style={s.primaryText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.secondary}
            onPress={async () => {
              nav.navigate('Login');
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
              } catch {}
            }}
          >
            <Text style={s.secondaryText}>Log in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  top: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    marginBottom: 60,
  },
  heading: {
    fontFamily: 'Inter',
    fontSize: 60,
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  logo: {
    fontFamily: 'Inter',
    fontSize: 60,
    color: '#3FE3BF',
    textAlign: 'center',
    marginTop: 16,
  },
  actions: {
    marginTop: 'auto',
    paddingBottom: 24,
    alignItems: 'center',
    gap: 14,
  },
  primary: {
    width: 320,
    height: 44,
    backgroundColor: '#3FE3BF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  secondary: {
    width: 320,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
