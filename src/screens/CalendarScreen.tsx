// Calendar Screen (go far into the future or see past tasks)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../config/supabase';

type CalendarStackParamList = {
  CalendarView: undefined;
  DayView: { date: string };
};

type NavigationProp = NativeStackNavigationProp<CalendarStackParamList, 'CalendarView'>;

export default function CalendarScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [months, setMonths] = useState<any[]>([]);
  const [daysWithTasks, setDaysWithTasks] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateNext12Months();
    loadTaskDates();
  }, []);

  const loadTaskDates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 12, 0);

    const { data, error } = await supabase
      .from('tasks')
      .select('due_date')
      .eq('user_id', user.id)
      .gte('due_date', startDate.toISOString())
      .lte('due_date', endDate.toISOString());

    if (error) {
      console.error('Error loading task dates:', error);
    } else if (data) {
      const dates = new Set(
        data.map((task) => task.due_date.split('T')[0])
      );
      setDaysWithTasks(dates);
    }
  };

  const generateNext12Months = () => {
    const monthsData = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();

      // Get month name
      const monthName = date.toLocaleDateString('en-US', { month: 'long' });

      // Get first day of month (0 = Sunday, 6 = Saturday)
      const firstDay = date.getDay();

      // Get number of days in month
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      monthsData.push({
        monthName,
        year,
        month,
        firstDay,
        daysInMonth,
      });
    }

    setMonths(monthsData);
  };

  const handleDayPress = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    navigation.navigate('DayView', { date: dateStr });
  };

  const renderMonth = (monthData: any) => {
    const { monthName, year, month, firstDay, daysInMonth } = monthData;
    const weeks = [];
    let currentWeek = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(
        <View key={`empty-${i}`} style={styles.dayCell} />
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasTask = daysWithTasks.has(dateStr);

      currentWeek.push(
        <TouchableOpacity
          key={day}
          style={styles.dayCell}
          onPress={() => handleDayPress(year, month, day)}
        >
          <Text style={[styles.dayNumber, hasTask && styles.dayWithTask]}>{day}</Text>
        </TouchableOpacity>
      );

      // If we've filled a week (7 days), push it to weeks array and start a new week
      if (currentWeek.length === 7) {
        weeks.push(
          <View key={`week-${weeks.length}`} style={styles.weekRow}>
            {currentWeek}
          </View>
        );
        currentWeek = [];
      }
    }

    // Add the remaining days if the last week isn't complete
    if (currentWeek.length > 0) {
      // Fill remaining cells in the last week
      while (currentWeek.length < 7) {
        currentWeek.push(
          <View key={`empty-end-${currentWeek.length}`} style={styles.dayCell} />
        );
      }
      weeks.push(
        <View key={`week-${weeks.length}`} style={styles.weekRow}>
          {currentWeek}
        </View>
      );
    }

    return (
      <View key={`${monthName}-${year}`} style={styles.monthContainer}>
        <Text style={styles.monthName}>{monthName}</Text>
        <View style={styles.calendar}>{weeks}</View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
        <View style={styles.weekDaysHeader}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {months.map((monthData) => renderMonth(monthData))}
      </ScrollView>
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
    marginBottom: 16,
  },
  weekDaysHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  monthContainer: {
    marginTop: 24,
  },
  monthName: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#3FE3BF',
    marginBottom: 12,
  },
  calendar: {
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayNumber: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '300',
    color: '#fff',
  },
  dayWithTask: {
    color: '#3FE3BF',
  },
});
