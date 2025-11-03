// When user clicks a day in the Calendar tab, takes them here
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

// Pulled from Supabase to load tasks
interface Task {
  id: string;
  user_id: string;
  description: string;
  completed: boolean;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export default function DayViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { date } = route.params as { date: string };

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [date]);

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', date + 'T00:00:00')
      .lte('due_date', date + 'T23:59:59')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  // All of this is the same as the homescreen
  const addTask = async () => {
    if (!newTaskText.trim() || isSubmitting) {
      setAddingTask(false);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    const taskDate = new Date(date + 'T00:00:00');

    const { error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        description: newTaskText.trim(),
        completed: false,
        due_date: taskDate.toISOString(),
      });

    if (error) {
      Alert.alert('Error', 'Failed to add task');
      console.error(error);
    } else {
      setNewTaskText('');
      setAddingTask(false);
      loadTasks();
    }
    setIsSubmitting(false);
  };

  // User checks off a task (or unchecks it)
  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id);

    if (error) {
      Alert.alert('Error', 'Failed to update task');
    } else {
      loadTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      Alert.alert('Error', 'Failed to delete task');
    } else {
      setMenuVisible(null);
      loadTasks();
    }
  };

  // User edits a task
  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditText(task.description);
    setMenuVisible(null);
  };

  // User saves an edit
  const saveEdit = async (taskId: string) => {
    if (!editText.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .update({ description: editText.trim() })
      .eq('id', taskId);

    if (error) {
      Alert.alert('Error', 'Failed to update task');
    } else {
      setEditingTask(null);
      setEditText('');
      loadTasks();
    }
  };

  const formatDate = () => {
    const dateObj = new Date(date + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    return dateObj.toLocaleDateString('en-US', options);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
      >
        <AntDesign name="left" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.dateTitle}>{formatDate()}</Text>

        {tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            {editingTask === task.id ? (
              <>
                <TextInput
                  style={styles.editInput}
                  value={editText}
                  onChangeText={setEditText}
                  onSubmitEditing={() => saveEdit(task.id)}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity onPress={() => saveEdit(task.id)}>
                  <AntDesign name="check" size={20} color="#3FE3BF" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => toggleTask(task)}
                  style={styles.checkbox}
                >
                  {task.completed && (
                    <AntDesign name="check" size={12} color="#3FE3BF" />
                  )}
                </TouchableOpacity>
                <Text
                  style={[
                    styles.taskText,
                    task.completed && styles.taskCompleted,
                  ]}
                >
                  {task.description}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setMenuVisible(menuVisible === task.id ? null : task.id)
                  }
                  style={styles.menuButton}
                >
                  <Entypo name="dots-three-vertical" size={16} color="#fff" />
                </TouchableOpacity>

                {menuVisible === task.id && (
                  <View style={styles.menu}>
                    <TouchableOpacity
                      onPress={() => startEdit(task)}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteTask(task.id)}
                      style={styles.menuItem}
                    >
                      <Text style={styles.menuText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        ))}

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
              autoFocus
              returnKeyType="done"
              blurOnSubmit={true}
            />
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setAddingTask(true)}
            style={styles.taskRow}
          >
            <View style={styles.checkbox} />
            <Text style={styles.addTaskText}>Add task</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backButton: {
    marginTop: 60,
    marginLeft: 20,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  dateTitle: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '500',
    color: '#fff',
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
  taskText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  addTaskText: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#A9ABAF',
    flex: 1,
  },
  addTaskInput: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#fff',
    flex: 1,
    padding: 0,
  },
  editInput: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: '#fff',
    flex: 1,
    padding: 0,
    marginRight: 12,
  },
  menuButton: {
    padding: 8,
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: 30,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingVertical: 8,
    minWidth: 120,
    zIndex: 1000,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  menuText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: '#fff',
  },
});
