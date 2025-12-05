import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
// 1. BleService 임포트
import BleService from '../services/BleService';

interface FocusTask {
    id: string;
    description: string;
    completed: boolean;
}

export default function FocusTimerScreen() {
    const navigation = useNavigation();

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);
    const [ended, setEnded] = useState(false);
    const [tasks, setTasks] = useState<FocusTask[]>([]);

    // 2. 실시간 상태 참조를 위한 Ref
    const tasksRef = useRef<FocusTask[]>([]);

    // tasks가 변할 때마다 Ref 업데이트
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    // Load session metadata
    useEffect(() => {
        const loadData = async () => {
            const id = await AsyncStorage.getItem('activeSessionId');
            const createdAt = await AsyncStorage.getItem('activeSessionCreatedAt');
            const duration = await AsyncStorage.getItem('activeSessionDurationSeconds');

            if (!id || !createdAt || !duration) {
                navigation.goBack();
                return;
            }

            setSessionId(id);
            setDurationSeconds(Number(duration));
            setStartTime(new Date(createdAt).getTime());
        };

        loadData();
    }, []);

    // Load tasks for this session
    useEffect(() => {
        const loadTasks = async () => {
            if (!sessionId) return;

            const { data, error } = await supabase
                .from('focus_session_tasks')
                .select('*')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true });

            if (!error && data) setTasks(data as FocusTask[]);
        };

        loadTasks();
    }, [sessionId]);

    // 3. BLE 모니터링 시작
    useEffect(() => {
        const startBleListener = async () => {
            BleService.startMonitoring((data) => {
                const message = data.trim();
                const currentTasks = tasksRef.current;

                if (message === "task1_done") {
                    if (currentTasks.length > 0 && !currentTasks[0].completed) {
                        toggleTask(currentTasks[0].id);
                    }
                }
                if (message === "task2_done") {
                    if (currentTasks.length > 1 && !currentTasks[1].completed) {
                        toggleTask(currentTasks[1].id);
                    }
                }
                if (message === "task3_done") {
                    if (currentTasks.length > 2 && !currentTasks[2].completed) {
                        toggleTask(currentTasks[2].id);
                    }
                }
                if (message === "task4_done") {
                    if (currentTasks.length > 3 && !currentTasks[3].completed) {
                        toggleTask(currentTasks[3].id);
                    }
                }
            });
        };

        startBleListener();
    }, []);


    // Toggle task completion
    const toggleTask = async (taskId: string) => {
        const currentTasks = tasksRef.current;
        const t = currentTasks.find(x => x.id === taskId);
        if (!t) return;

        const newCompleted = !t.completed;

        const updated = currentTasks.map(x =>
            x.id === taskId ? { ...x, completed: newCompleted } : x
        );
        setTasks(updated); // UI 즉시 업데이트

        // Supabase 업데이트
        await supabase
            .from('focus_session_tasks')
            .update({ completed: newCompleted })
            .eq('id', taskId);

        const allDone = updated.every(x => x.completed);
        if (allDone && sessionId) await endSession(sessionId);
    };

    // Timer + backend monitoring
    useEffect(() => {
        if (!sessionId || !durationSeconds || !startTime) return;

        const interval = setInterval(async () => {
            const now = Date.now();
            const elapsed = Math.floor((now - startTime) / 1000);
            const newRemaining = durationSeconds - elapsed;

            // ▼▼▼ [수정됨] 1분마다 시간 전송 + 화면 갱신(ON) ▼▼▼
            if (newRemaining % 60 === 0 && newRemaining > 0) {
                const h = Math.floor(newRemaining / 3600);
                const m = Math.floor((newRemaining % 3600) / 60);
                const timeStr = `${h}:${String(m).padStart(2, '0')}`;

                BleService.sendData("TIME").then(() => {
                     setTimeout(() => {
                        BleService.sendData(timeStr);
                        // [추가] 시간 전송 후 화면 갱신 명령(ON) 전송
                        setTimeout(() => {
                            BleService.sendData("ON");
                        }, 300);
                     }, 300);
                });
            }
            // ▲▲▲▲▲▲

            // 타이머 종료 체크
            if (newRemaining <= 0 && !ended) {
                setRemaining(0);
                clearInterval(interval);

                // 0:00 전송 및 갱신
                BleService.sendData("TIME");
                setTimeout(() => {
                    BleService.sendData("0:00");
                    setTimeout(() => BleService.sendData("ON"), 300);
                }, 300);

                await endSession(sessionId);
                return;
            }

            setRemaining(newRemaining);

            const { data } = await supabase
                .from('study_session')
                .select('completed')
                .eq('id', sessionId)
                .single();

            if (data?.completed && !ended) {
                clearInterval(interval);
                await endSession(sessionId);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionId, durationSeconds, startTime, ended]);

    // End session (shared logic)
    const endSession = async (id: string) => {
        if (ended) return;
        setEnded(true);

        // 세션 종료 시 STOP 명령 (화면 초기화)
        BleService.sendData("STOP");

        await supabase
            .from('study_session')
            .update({ completed: true })
            .eq('id', id);

        await AsyncStorage.removeItem('activeSessionId');
        await AsyncStorage.removeItem('activeSessionCreatedAt');
        await AsyncStorage.removeItem('activeSessionDurationSeconds');

        Alert.alert('Session Complete', 'Great job!');
        navigation.goBack();
    };

    const formatTime = (sec: number | null) => {
        if (sec === null) return '--:--';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.centerContainer}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Focus Session</Text>

            <Text style={styles.timerText}>{formatTime(remaining)}</Text>

            <Text style={styles.sectionTitle}>Tasks</Text>

            {tasks.map(task => (
                <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() => toggleTask(task.id)}
                >
                    <View style={styles.checkbox}>
                        {task.completed && <AntDesign name="check" size={12} color="#3FE3BF" />}
                    </View>

                    <Text style={[styles.taskText, task.completed && styles.completedText]}>
                        {task.description}
                    </Text>
                </TouchableOpacity>
            ))}

            {ended && <Text style={styles.endedText}>Session Completed</Text>}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    centerContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: 40,
        paddingBottom: 80,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 30,
        color: '#3FE3BF',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '600',
    },
    timerText: {
        fontSize: 80,
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
        letterSpacing: 2,
    },
    sectionTitle: {
        fontSize: 20,
        color: '#fff',
        marginBottom: 20,
        textAlign: 'center',
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1,
        borderColor: '#fff',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskText: {
        color: '#fff',
        fontSize: 17,
        flex: 1,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#777',
    },
    endedText: {
        marginTop: 20,
        fontSize: 16,
        color: '#A9ABAF',
        textAlign: 'center',
    },
});