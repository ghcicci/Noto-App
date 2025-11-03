// Home screen (add, edit, delete, complete tasks)
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Alert
} from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { supabase } from '../config/supabase';

// Same as Supabase
interface Task {
  id: string;
  user_id: string;
  description: string;
  completed: boolean;
  due_date: string;
  created_at: string;
  updated_at: string;
}

// Each task is assigned to a date for storage in Supabase
interface GroupedTasks {
  [date: string]: Task[];
}

// Sets up react native variables
export default function HomeScreen() {
  const [firstName, setFirstName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUserData();
    loadTasks();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setFirstName(profile.first_name || 'User');
      }
    }
  };

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get tasks starting from today for the next 14 days
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 13); // 14 days
    futureDate.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('due_date', today.toISOString())
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  const addTask = async (dateStr: string) => {
    if (!newTaskText.trim() || isSubmitting) {
      setActiveDate('');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsSubmitting(false);
      return;
    }

    // Create the task date at midnight in local timezone
    const taskDate = new Date(dateStr + 'T00:00:00');

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
      setActiveDate('');
      loadTasks();
    }
    setIsSubmitting(false);
  };

  // Check to complete task (or opposite)
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

  // Removing tasks
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

  // Editing tasks
  const startEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditText(task.description);
    setMenuVisible(null);
  };

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getNext14Days = () => {
    const dates = [];
    const now = new Date();
    
    // Get today's date in local timezone
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Format as YYYY-MM-DD in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };

  const groupTasksByDate = (): GroupedTasks => {
    const grouped: GroupedTasks = {};
    const dates = getNext14Days();
    
    // Initialize all dates with empty arrays
    dates.forEach(date => {
      grouped[date] = [];
    });

    // Group tasks by date
    tasks.forEach(task => {
      const taskDate = task.due_date.split('T')[0];
      if (grouped[taskDate]) {
        grouped[taskDate].push(task);
      }
    });

    return grouped;
  };

  const getDateLabel = (dateStr: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(dateStr + 'T00:00:00');
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    return formatDate(dateStr);
  };

  const groupedTasks = groupTasksByDate();
  const dates = getNext14Days();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.greeting}>Hello, {firstName}</Text>
        
        {dates.map((dateStr, index) => {
          const dateTasks = groupedTasks[dateStr] || [];
          
          return (
            <View key={dateStr}>
              <Text style={styles.dateHeader}>{getDateLabel(dateStr)}</Text>
              
              {dateTasks.map((task) => (
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
                          task.completed && styles.taskCompleted
                        ]}
                      >
                        {task.description}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => setMenuVisible(menuVisible === task.id ? null : task.id)}
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

              {activeDate === dateStr ? (
                <View style={styles.taskRow}>
                  <View style={styles.checkbox} />
                  <TextInput
                    style={styles.addTaskInput}
                    value={newTaskText}
                    onChangeText={setNewTaskText}
                    placeholder="Add task"
                    placeholderTextColor="#A9ABAF"
                    onSubmitEditing={() => addTask(dateStr)}
                    autoFocus
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => setActiveDate(dateStr)}
                  style={styles.taskRow}
                >
                  <View style={styles.checkbox} />
                  <Text style={styles.addTaskText}>Add task</Text>
                </TouchableOpacity>
              )}

              {index < dates.length - 1 && <View style={styles.separator} />}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  greeting: {
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: '500',
    color: '#3FE3BF',
    marginTop: 78,
  },
  dateHeader: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '500',
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
  separator: {
    height: 1,
    backgroundColor: '#333',
    marginTop: 32,
    marginBottom: 16,
  },
});
