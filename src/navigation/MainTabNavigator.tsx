import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import HomeScreen from '../screens/HomeScreen';
import CalendarStackNavigator from './CalendarStackNavigator';
import FocusModeScreen from '../screens/FocusModeScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: '#000', height: 74, borderTopWidth: 0 },
                tabBarActiveTintColor: '#3FE3BF',
                tabBarInactiveTintColor: '#888',
                tabBarLabelStyle: { fontFamily: 'Inter', fontSize: 12 },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarIcon: ({ color }) => <FontAwesome6 name="list-check" size={24} color={color} /> }}
            />
            <Tab.Screen
                name="Calendar"
                component={CalendarStackNavigator}
                options={{ tabBarIcon: ({ color }) => <AntDesign name="calendar" size={24} color={color} /> }}
            />
            <Tab.Screen
                name="Focus"
                component={FocusModeScreen}
                options={{ tabBarIcon: ({ color }) => <Feather name="book-open" size={24} color={color} /> }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} /> }}
            />
        </Tab.Navigator>
    );
}
