// Settings: View & edit first/last name, sign out
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { supabase } from '../config/supabase';

export default function SettingsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [initialFirstName, setInitialFirstName] = useState<string>('');
  const [initialLastName, setInitialLastName] = useState<string>('');
  const [focusedField, setFocusedField] = useState<'first' | 'last' | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const f = data?.first_name ?? '';
        const l = data?.last_name ?? '';

        setFirstName(f);
        setLastName(l);
        setInitialFirstName(f);
        setInitialLastName(l);
      } catch (err) {
        Alert.alert('Error', 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateProfile = async (
    patch: Partial<{ first_name: string; last_name: string }>
  ) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  };

  const confirmUpdate = (field: 'first_name' | 'last_name', value: string) => {
    const label = field === 'first_name' ? 'first' : 'last';

    Alert.alert(
      'Confirm change',
      `Save ${label} name as "${value || 'blank'}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Revert to previous value
            if (field === 'first_name') {
              setFirstName(initialFirstName);
            } else {
              setLastName(initialLastName);
            }
          },
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              await updateProfile({ [field]: value });
              if (field === 'first_name') {
                setInitialFirstName(value);
              } else {
                setInitialLastName(value);
              }
            } catch {
              Alert.alert('Error', 'Failed to update profile');
            }
          },
        },
      ]
    );
  };

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!loading && (
          <>
            {/* First name box */}
            <View
              style={[
                styles.fieldCard,
                focusedField === 'first' && styles.fieldCardActive,
              ]}
            >
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>First name</Text>
                <TextInput
                  style={styles.fieldValueInput}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('first')}
                  onBlur={() => setFocusedField(null)}
                  onEndEditing={() =>
                    confirmUpdate('first_name', firstName.trim())
                  }
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Last name box */}
            <View
              style={[
                styles.fieldCard,
                focusedField === 'last' && styles.fieldCardActive,
              ]}
            >
              <View style={styles.fieldTextContainer}>
                <Text style={styles.fieldLabel}>Last name</Text>
                <TextInput
                  style={styles.fieldValueInput}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor="#777"
                  autoCapitalize="words"
                  onFocus={() => setFocusedField('last')}
                  onBlur={() => setFocusedField(null)}
                  onEndEditing={() =>
                    confirmUpdate('last_name', lastName.trim())
                  }
                  returnKeyType="done"
                />
              </View>
            </View>
          </>
        )}
      </View>

      {/* Footer / Sign Out at bottom */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: '500',
    color: '#3FE3BF',
    marginTop: 78,
    marginBottom: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  fieldCardActive: {
    backgroundColor: '#282828',
    borderColor: '#3FE3BF',
  },
  fieldTextContainer: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  fieldValueInput: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#B3B3B3',
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  signOutButton: {
    width: '100%',
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
