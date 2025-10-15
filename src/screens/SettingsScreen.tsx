// Settings: Change name, email, password. Includes sign-out button
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { supabase } from '../config/supabase';

export default function SettingsScreen() {
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert('Error', 'Failed to sign out');
      }
    } catch {
      Alert.alert('Error', 'Error occurred');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 32,
    color: '#fff',
    marginBottom: 40,
  },
  signOutButton: {
    width: 320,
    height: 40,
    backgroundColor: '#3FE3BF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
});
