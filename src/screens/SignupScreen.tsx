import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

type AuthStack = {
 Welcome: undefined;
 Login: undefined;
 Signup: undefined;
};

type Nav = NativeStackNavigationProp<AuthStack, 'Signup'>;

export default function SignupScreen() {
 const nav = useNavigation<Nav>();

 const [first, setFirst] = useState('');
 const [last, setLast] = useState('');
 const [email, setEmail] = useState('');
 const [pass, setPass] = useState('');
 const [show, setShow] = useState(false);
 const [busy, setBusy] = useState(false);


 // Can be edited if TA wants more rigorus password
 const checkPass = (p: string) => {
   if (p.length < 8) return 'Password must be at least 8 characters';
   if (!/\d/.test(p)) return 'Password must contain at least one number';
   if (!/[!@#$%^&*(),.?":{}|<>]/.test(p)) return 'Password must contain at least one special character';
   return null;
 };

 const onSignup = async () => {
   const f = first.trim();
   const l = last.trim();
   const e = email.trim();

   if (!f || !l || !e || !pass) {
     Alert.alert('Error', 'Please fill in all fields');
     return;
   }

   const msg = checkPass(pass);
   if (msg) {
     Alert.alert('Invalid Password', msg);
     return;
   }

   setBusy(true);
   try {
     const { data: auth, error: authErr } = await supabase.auth.signUp({ email: e, password: pass });
     if (authErr) {
       Alert.alert('Signup Failed', authErr.message);
       return;
     }

     if (auth?.user) {
       const { error: profErr } = await supabase
         .from('profiles')
         .update({ first_name: f, last_name: l })
         .eq('id', auth.user.id);

       if (profErr) console.warn('Profile update error:', profErr);
       Alert.alert(
         'Success',
         'Account created. Check your email to verify your account.',
         [{ text: 'OK', onPress: () => nav.goBack() }]
       );
     }
   } catch {
     Alert.alert('Error', 'An unexpected error occurred');
   } finally {
     setBusy(false);
   }
 };

 return (
   <View style={s.root}>
     <TouchableOpacity style={s.back} onPress={() => nav.goBack()} accessibilityRole="button">
       <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
     </TouchableOpacity>

     <View style={s.center}>
       <Text style={s.title}>Make a Noto account</Text>

       <View style={s.inputs}>
         <View style={s.row}>
           <TextInput
             style={s.name}
             placeholder="First name"
             placeholderTextColor="#888"
             value={first}
             onChangeText={setFirst}
             autoCapitalize="words"
             returnKeyType="next"
           />
           <TextInput
             style={s.name}
             placeholder="Last name"
             placeholderTextColor="#888"
             value={last}
             onChangeText={setLast}
             autoCapitalize="words"
             returnKeyType="next"
           />
         </View>

         <TextInput
           style={s.input}
           placeholder="Email"
           placeholderTextColor="#888"
           value={email}
           onChangeText={setEmail}
           autoCapitalize="none"
           keyboardType="email-address"
           textContentType="emailAddress"
           returnKeyType="next"
         />

         <View style={s.passWrap}>
           <TextInput
             style={s.pass}
             placeholder="Password"
             placeholderTextColor="#888"
             value={pass}
             onChangeText={setPass}
             secureTextEntry={!show}
             autoCapitalize="none"
             textContentType="password"
             returnKeyType="done"
           />
           <TouchableOpacity style={s.eye} onPress={() => setShow(v => !v)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
             <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
           </TouchableOpacity>
         </View>
       </View>
     </View>

     <View style={s.actions}>
       <TouchableOpacity style={[s.primary, busy && s.disabled]} onPress={onSignup} disabled={busy}>
         <Text style={s.primaryText}>{busy ? 'Creating account...' : 'Create account'}</Text>
       </TouchableOpacity>
     </View>
   </View>
 );
}

const BOX_W = 338;

const s = StyleSheet.create({
 root: {
   flex: 1,
   backgroundColor: '#000',
   paddingHorizontal: 20,
 },
 back: {
   marginTop: 60,
   marginBottom: 20,
   alignSelf: 'flex-start',
 },
 center: {
   flex: 1,
   justifyContent: 'center',
   marginTop: -80,
 },
 title: {
   fontFamily: 'Inter',
   fontSize: 28,
   color: '#fff',
   textAlign: 'center',
   marginBottom: 40,
 },
 inputs: {
   alignItems: 'center',
   gap: 16,
 },
 row: {
   flexDirection: 'row',
   gap: 12,
   width: BOX_W,
 },
 name: {
   flex: 1,
   height: 40,
   backgroundColor: '#2A2A2A',
   borderRadius: 8,
   paddingHorizontal: 16,
   fontFamily: 'Inter',
   fontSize: 16,
   color: '#fff',
 },
 input: {
   width: BOX_W,
   height: 40,
   backgroundColor: '#2A2A2A',
   borderRadius: 8,
   paddingHorizontal: 16,
   fontFamily: 'Inter',
   fontSize: 16,
   color: '#fff',
 },
 passWrap: {
   width: BOX_W,
   height: 40,
   backgroundColor: '#2A2A2A',
   borderRadius: 8,
   flexDirection: 'row',
   alignItems: 'center',
 },
 pass: {
   flex: 1,
   height: 40,
   paddingHorizontal: 16,
   fontFamily: 'Inter',
   fontSize: 16,
   color: '#fff',
 },
 eye: {
   paddingHorizontal: 16,
 },
 actions: {
   paddingBottom: 50,
   alignItems: 'center',
 },
 primary: {
   width: 320,
   height: 40,
   backgroundColor: '#3FE3BF',
   borderRadius: 20,
   justifyContent: 'center',
   alignItems: 'center',
 },
 primaryText: {
   fontFamily: 'Inter',
   fontSize: 16,
   fontWeight: '500',
   color: '#000',
 },
 disabled: {
   opacity: 0.7,
 },
});
