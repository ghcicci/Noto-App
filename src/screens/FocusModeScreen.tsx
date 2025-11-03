// Focus Mode Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';

interface FocusTask {
  id: string;
  description: string;
  completed: boolean;
}

export default function FocusModeScreen() {
  const [tasks, setTasks] = useState<FocusTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const addTask = () => {
    if (!newTaskText.trim() || tasks.length >= 4) {
      setAddingTask(false);
      return;
    }

    const newTask: FocusTask = {
      id: Date.now().toString(),
      description: newTaskText.trim(),
      completed: false,
    };

    setTasks([...tasks, newTask]);
    setNewTaskText('');
    setAddingTask(false);
  };

  const toggleTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
    setMenuVisible(null);
  };

  const handleSyncToDevice = () => {
    // Non-functional for now
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Focus Mode</Text>

        <Text style={styles.sectionTitle}>Session Tasks</Text>

        {tasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <TouchableOpacity
              onPress={() => toggleTask(task.id)}
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
                  onPress={() => deleteTask(task.id)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuText}>Delete</Text>
                </TouchableOpacity>
              </View>
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
        ) : tasks.length < 4 ? (
          <TouchableOpacity
            onPress={() => setAddingTask(true)}
            style={styles.taskRow}
          >
            <View style={styles.checkbox} />
            <Text style={styles.addTaskText}>Add task</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Session Duration</Text>

        <View style={styles.timerContainer}>
          <View style={styles.timeInputGroup}>
            <Text style={styles.timeLabel}>Hours</Text>
            <TextInput
              style={styles.timeInput}
              value={hours}
              onChangeText={(text) => {
                if (/^\d*$/.test(text)) {
                  setHours(text);
                }
              }}
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
              onChangeText={(text) => {
                if (/^\d*$/.test(text)) {
                  setMinutes(text);
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="0"
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncToDevice}
        >
          <Text style={styles.syncButtonText}>Sync to device</Text>
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          After syncing, place your phone{'\n'}in the lock box.
        </Text>
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
  title: {
    fontFamily: 'Inter',
    fontSize: 34,
    fontWeight: '500',
    color: '#3FE3BF',
    marginTop: 78,
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 20,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 16,
    marginTop: 16,
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeLabel: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    marginBottom: 12,
  },
  timeInput: {
    width: 120,
    height: 60,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
  },
  timeSeparator: {
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '400',
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
  syncButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  instructionText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#A9ABAF',
    textAlign: 'center',
    marginBottom: 40,
  },
});
