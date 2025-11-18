import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BleScreen from '../BLE/BleScreen'; // 실제 경로에 맞게 수정

const Tab = createBottomTabNavigator();

export function RootNavigator() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />

      {/* 🔴 이 줄이 꼭 있어야 navigate('BLE')가 먹음 */}
      <Tab.Screen
        name="BLE"
        component={BleScreen}
        options={{ title: 'BLE Test' }}
      />
    </Tab.Navigator>
  );
}
