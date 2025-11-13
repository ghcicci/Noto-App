// src/navigation/CalendarStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CalendarScreen from '../screens/CalendarScreen';
import DayViewScreen from '../screens/DayViewScreen';

const CalendarStack = createNativeStackNavigator();

export default function CalendarStackNavigator() {
    return (
        <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
            <CalendarStack.Screen name="CalendarView" component={CalendarScreen} />
            <CalendarStack.Screen name="DayView" component={DayViewScreen} />
        </CalendarStack.Navigator>
    );
}
