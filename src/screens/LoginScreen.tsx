// Lgoin Screen, Email & Password
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

type Nav = NativeStackNavigationProp<AuthStack, 'Login'>;

export default function LoginScreen() {
 const nav = useNavigation<Nav>();
 const [email, setEmail] = useState('');
 const [pass, setPass] = useState('');
 const [show, setShow] = useState(false);
 const [busy, setBusy] = useState(false);

 const onLogin = async () => {
   const e = email.trim();
   if (!e || !pass) {
     Alert.alert('Error', 'Please enter all information before proceeding.');
     return;
   }

   setBusy(true);
   try {
     const { error } = await supabase.auth.signInWithPassword({ email: e, password: pass });
     if (error) {
       Alert.alert('Login Failed', error.message);
       setBusy(false);
       return;
     }
     // Don't navigate - auth state change will automatically take user to Home
   } catch {
     Alert.alert('Error', 'Oopsie daisey... An unexpected error occurred');
   } finally {
     setBusy(false);
   }
 };

 const onForgot = () => {
   Alert.alert('Forgot Password', 'Add password reset flow here.');
   // Will send email to user
 };

 return (
   <View style={s.root}>
     <TouchableOpacity style={s.back} onPress={() => nav.goBack()} accessibilityRole="button">
       <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
     </TouchableOpacity>

     <View style={s.center}>
       <Text style={s.title}>Welcome back!</Text>

       <View style={s.inputs}>
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

         <TouchableOpacity onPress={onForgot} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
           <Text style={s.forgot}>Forgot Password?</Text>
         </TouchableOpacity>
       </View>
     </View>

     <View style={s.actions}>
       <TouchableOpacity style={[s.primary, busy && s.disabled]} onPress={onLogin} disabled={busy}>
         <Text style={s.primaryText}>{busy ? 'Logging you in...' : 'Log in'}</Text>
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
   fontSize: 32,
   color: '#fff',
   textAlign: 'center',
   marginBottom: 40,
 },
 inputs: {
   gap: 16,
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
   alignSelf: 'center',
 },
 passWrap: {
   width: BOX_W,
   height: 40,
   backgroundColor: '#2A2A2A',
   borderRadius: 8,
   flexDirection: 'row',
   alignItems: 'center',
   alignSelf: 'center',
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
 forgot: {
   fontFamily: 'Inter',
   fontSize: 14,
   color: '#fff',
   textAlign: 'right',
   marginTop: 8,
   alignSelf: 'center',
   width: BOX_W,
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
