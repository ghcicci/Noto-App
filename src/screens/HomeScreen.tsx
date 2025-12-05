// Home screen (add, edit, delete, complete tasks)
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import BleService from '../services/BleService';

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

interface GroupedTasks {
  [date: string]: Task[];
}

export default function HomeScreen() {
  const [firstName, setFirstName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // [기존] 실시간 tasks 참조용 Ref
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // [추가] ESP32에 전송된 Task들의 ID를 저장하는 Ref (순서 유지용)
  const syncedTaskIdsRef = useRef<string[]>([]);

  useEffect(() => {
    loadUserData();
    loadTasks();
  }, []);

  // [추가] BLE 메시지 처리 함수 (리스너)
  const handleBleMessage = (data: string) => {
    const message = data.trim();
    console.log("BLE Received:", message);

    // 저장해둔 ID 목록에서 완료할 대상 찾기
    const syncedIds = syncedTaskIdsRef.current;
    let targetId = null;

    if (message === "task1_done") targetId = syncedIds[0];
    else if (message === "task2_done") targetId = syncedIds[1];
    else if (message === "task3_done") targetId = syncedIds[2];
    else if (message === "task4_done") targetId = syncedIds[3];

    if (targetId) {
      // tasksRef에서 최신 상태의 해당 Task 찾기
      const currentTasks = tasksRef.current;
      const targetTask = currentTasks.find(t => t.id === targetId);

      // 이미 완료된 상태가 아니면 토글 실행
      if (targetTask && !targetTask.completed) {
        toggleTask(targetTask);
        // Alert.alert("Task Completed", `'${targetTask.description}' checked!`);
      }
    }
  };

  // 앱 켤 때 혹시 연결되어 있으면 리스너 등록
  useEffect(() => {
    BleService.startMonitoring(handleBleMessage);
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

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleSyncTodayTasks = async () => {
    const todayStr = dates[0];
    const todayTasks = groupedTasks[todayStr] || [];
    // 완료 안 된 것들 중 상위 4개
    const targetTasks = todayTasks.filter(t => !t.completed).slice(0, 4);

    if (targetTasks.length === 0) {
      Alert.alert("알림", "오늘 할 일이 없거나 모두 완료되었습니다.");
      return;
    }

    setSyncing(true);

    try {
      const hasPermission = await BleService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Error', 'Bluetooth permissions are required.');
        setSyncing(false);
        return;
      }

      const success = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          BleService.manager.stopDeviceScan();
          Alert.alert('Timeout', 'ESP32를 찾을 수 없습니다.');
          resolve(false);
        }, 10000);

        BleService.scanAndConnect(async (device) => {
          clearTimeout(timeout);
          try {
            // [중요] 연결 성공 직후 모니터링 시작!
            BleService.startMonitoring(handleBleMessage);

            await delay(1000);

            // [중요] 전송하는 Task들의 ID를 순서대로 저장 (나중에 완료 처리를 위해)
            syncedTaskIdsRef.current = targetTasks.map(t => t.id);

            // 1. Task 전송
            for (let i = 0; i < targetTasks.length; i++) {
              const taskCmd = `TASK${i + 1}`;
              await BleService.sendData(taskCmd);
              await delay(300);
              await BleService.sendData(targetTasks[i].description);
              await delay(300);
            }

            // 2. 시간 전송
            const now = new Date();
            const h = String(now.getHours());
            const m = String(now.getMinutes()).padStart(2, '0');
            const timeStr = `${h}:${m}`;

            await BleService.sendData("TIME");
            await delay(300);
            await BleService.sendData(timeStr);
            await delay(300);

            // 3. HOME 모드 시작 (잠금 X)
            await BleService.sendData("HOME");
            await delay(500);

            // 4. 화면 갱신
            await BleService.sendData("ON");

            resolve(true);
          } catch (e) {
            console.log(e);
            resolve(false);
          }
        });
      });

      if (success) {
        Alert.alert("Success", "ESP32 received today's tasks.");
      }

    } catch (e) {
      console.log("Sync Error:", e);
      Alert.alert("Error", "전송 중 오류가 발생했습니다.");
    } finally {
      setSyncing(false);
    }
  };

  const loadTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 13);
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

  // [수정됨] 토글 로직을 안전하게 변경 (Functional Update 사용)
  const toggleTask = async (task: Task) => {
    const newCompleted = !task.completed;

    // 1. Optimistic Update (이전 상태를 기반으로 업데이트하여 Stale Closure 방지)
    setTasks(prevTasks => prevTasks.map(t =>
      t.id === task.id ? { ...t, completed: newCompleted } : t
    ));

    // 2. DB Update
    const { error } = await supabase
      .from('tasks')
      .update({ completed: newCompleted })
      .eq('id', task.id);

    if (error) {
      Alert.alert('Error', 'Failed to update task');
      loadTasks(); // 실패 시 롤백
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
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

    dates.forEach(date => {
      grouped[date] = [];
    });

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

        <TouchableOpacity
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSyncTodayTasks}
          disabled={syncing}
        >
          <AntDesign name="sync" size={16} color="#000" style={{ marginRight: 8 }} />
          <Text style={styles.syncButtonText}>
            {syncing ? "Syncing..." : "Sync Today's Tasks"}
          </Text>
        </TouchableOpacity>

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
  syncButton: {
    backgroundColor: '#3FE3BF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  syncButtonText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
});