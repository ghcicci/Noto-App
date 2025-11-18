// Focus Mode Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../config/supabase';

interface FocusTask {
  id: string;
  description: string;
  completed: boolean;
}

export default function FocusModeScreen() {
  const navigation = useNavigation();

  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load active session status from storage
  useEffect(() => {
    const checkActiveSession = async () => {
      const id = await AsyncStorage.getItem('activeSessionId');
      setActiveSessionId(id);
    };
    const unsubscribe = navigation.addListener('focus', checkActiveSession);
    return unsubscribe;
  }, []);

  // Load tasks from Supabase if session active
  useEffect(() => {
    const loadActiveSessionTasks = async () => {
      if (!activeSessionId) return;

      const { data, error } = await supabase
        .from('focus_session_tasks')
        .select('*')
        .eq('session_id', activeSessionId)
        .order('created_at');

      if (!error && data) setTasks(data);
    };

    loadActiveSessionTasks();
  }, [activeSessionId]);

  const makeTempId = () => `${Date.now()}-${Math.random()}`;

  // Add task
  const addTask = () => {
    if (activeSessionId) return;

    if (!newTaskText.trim() || tasks.length >= 4) {
      setAddingTask(false);
      setNewTaskText('');
      return;
    }

    setTasks([
      ...tasks,
      {
        id: makeTempId(),
        description: newTaskText.trim(),
        completed: false,
      },
    ]);

    setNewTaskText('');
    setAddingTask(false);
  };

  // Toggle task (works even during active session)
  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.completed;

    const updated = tasks.map(t =>
      t.id === taskId ? { ...t, completed: newCompleted } : t
    );
    setTasks(updated);

    // If active session, also update DB
    if (activeSessionId) {
      const { error } = await supabase
        .from('focus_session_tasks')
        .update({ completed: newCompleted })
        .eq('id', taskId);

      if (error) {
        Alert.alert('Update Failed', error.message);
        return;
      }

      // Auto-end session if all tasks completed
      const allDone = updated.length > 0 && updated.every(t => t.completed);
      if (allDone) {
        await supabase
          .from('study_session')
          .update({ completed: true })
          .eq('id', activeSessionId);
      }

      return;
    }
  };

  // Delete task
  const deleteTask = (taskId: string) => {
    if (activeSessionId) return;
    setTasks(tasks.filter(t => t.id !== taskId));
    setMenuVisible(null);
  };

  // Sync to device (create session)
  const handleSyncToDevice = async () => {
    if (activeSessionId) {
      navigation.navigate('FocusTimer');
      return;
    }

    if (tasks.length === 0) {
      Alert.alert('No Tasks', 'Please add at least one task before syncing.');
      return;
    }

    if (!hours && !minutes) {
      Alert.alert('Missing Duration', 'Please set a session duration.');
      return;
    }

    setSyncing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      const { data: session, error: sessionError } = await supabase
        .from('study_session')
        .insert({
          profile_id: user.id,
          hours: hours || '0',
          minutes: minutes || '0',
          completed: false,
        })
        .select()
        .single();

      if (sessionError) {
        Alert.alert('Sync Failed', sessionError.message);
        return;
      }

      setActiveSessionId(session.id);

      const payload = tasks.map(t => ({
        session_id: session.id,
        description: t.description,
        completed: t.completed,
      }));

      const { data: insertedTasks, error: tasksError } =
        await supabase
          .from('focus_session_tasks')
          .insert(payload)
          .select();

      if (tasksError) {
        Alert.alert('Sync Failed', tasksError.message);
        return;
      }

      setTasks(insertedTasks);

      await AsyncStorage.setItem('activeSessionId', session.id);
      await AsyncStorage.setItem('activeSessionCreatedAt', session.created_at);

      const totalMinutes =
        (parseInt(hours || '0') || 0) * 60 +
        (parseInt(minutes || '0') || 0);

      await AsyncStorage.setItem(
        'activeSessionDurationSeconds',
        String(totalMinutes * 60)
      );

      navigation.navigate('FocusTimer');
      Alert.alert('Success', 'Study session synced!');
    } catch (err) {
      Alert.alert('Error', 'Unexpected error occurred');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>

        <Text style={styles.title}>Focus Mode</Text>

        <Text style={styles.sectionTitle}>Session Tasks</Text>

        {tasks.map((task, index) => (
          <View key={task.id} style={[styles.taskRow, { zIndex: 1000 - index }]}>
            <TouchableOpacity
              onPress={() => toggleTask(task.id)}
              style={styles.checkbox}
            >
              {task.completed && (
                <AntDesign name="check" size={12} color="#3FE3BF" />
              )}
            </TouchableOpacity>

            <Text style={[styles.taskText, task.completed && styles.taskCompleted]}>
              {task.description}
            </Text>

            {!activeSessionId && (
              <TouchableOpacity
                onPress={() =>
                  setMenuVisible(menuVisible === task.id ? null : task.id)
                }
                style={styles.menuButton}
              >
                <Entypo name="dots-three-vertical" size={16} color="#fff" />
              </TouchableOpacity>
            )}

            {menuVisible === task.id && !activeSessionId && (
              <View style={styles.menu}>
                <TouchableOpacity
                  onPress={() => deleteTask(task.id)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Allow editing only when NOT in session */}
        {!activeSessionId && (
          <>
            {addingTask ? (
              <View style={styles.taskRow}>
                <View style={styles.checkbox} />
                <TextInput
                  style={styles.addTaskInput}
                  value={newTaskText}
                  onChangeText={setNewTaskText}
                  placeholder="Add task"
                  placeholderTextColor="#A9ABAF"
                  onSubmitEditing={addTask}
                  onBlur={() => {
                    if (newTaskText.trim()) addTask();
                    else {
                      setAddingTask(false);
                      setNewTaskText('');
                    }
                  }}
                  autoFocus
                  returnKeyType="done"
                />
              </View>
            ) : tasks.length < 4 ? (
              <TouchableOpacity
                onPress={() => setAddingTask(true)}
                style={styles.taskRow}
              >
                <View style={styles.checkbox} />
                <Text style={styles.addTaskText}>Add task</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        <Text style={styles.sectionTitle}>Session Duration</Text>

        {!activeSessionId && (
          <View style={styles.timerContainer}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Hours</Text>
              <TextInput
                style={styles.timeInput}
                value={hours}
                onChangeText={(t) => /^\d*$/.test(t) && setHours(t)}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor="#666"
              />
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.timeInputGroup}>
              <Text style={styles.timeLabel}>Minutes</Text>
              <TextInput
                style={styles.timeInput}
                value={minutes}
                onChangeText={(t) => /^\d*$/.test(t) && setMinutes(t)}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor="#666"
              />
            </View>
          </View>
        )}

        {/* Only one button */}
        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSyncToDevice}
          disabled={syncing}
        >
          <Text style={styles.syncButtonText}>
            {activeSessionId
              ? 'Return to Session'
              : syncing
                ? 'Syncing...'
                : 'Sync to device'}
          </Text>
        </TouchableOpacity>

        {/* Single message */}
        <Text style={styles.instructionText}>
          {activeSessionId
            ? 'You have an active study session.'
            : 'After syncing, place your phone\nin the lock box.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollView: { flex: 1, paddingHorizontal: 20 },

  title: {
    fontSize: 34,
    fontWeight: '500',
    color: '#3FE3BF',
    marginTop: 78,
    marginBottom: 32,
  },

  sectionTitle: {
    fontSize: 20,
    color: '#fff',
    marginTop: 16,
    marginBottom: 16,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },

  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  taskText: { fontSize: 16, color: '#fff', flex: 1 },
  taskCompleted: { textDecorationLine: 'line-through', color: '#888' },

  addTaskText: { fontSize: 16, color: '#A9ABAF', flex: 1 },
  addTaskInput: { fontSize: 16, color: '#fff', flex: 1, padding: 0 },

  menuButton: { padding: 8 },

  menu: {
    position: 'absolute',
    right: 0,
    top: 30,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 120,
  },

  menuItem: { paddingVertical: 8, paddingHorizontal: 16 },
  menuText: { fontSize: 14, color: '#fff' },

  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },

  timeInputGroup: { alignItems: 'center' },
  timeLabel: { fontSize: 16, color: '#fff', marginBottom: 12 },

  timeInput: {
    width: 120,
    height: 60,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    color: '#fff',
    fontSize: 32,
    textAlign: 'center',
  },

  timeSeparator: {
    fontSize: 32,
    color: '#fff',
    marginHorizontal: 16,
    marginTop: 32,
  },

  syncButton: {
    backgroundColor: '#3FE3BF',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
  },

  syncButtonText: { fontSize: 16, fontWeight: '500', color: '#000' },
  syncButtonDisabled: { opacity: 0.7 },

  instructionText: {
    fontSize: 14,
    color: '#A9ABAF',
    textAlign: 'center',
    marginBottom: 40,
  },
});
