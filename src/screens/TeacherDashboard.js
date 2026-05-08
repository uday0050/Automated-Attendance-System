import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Firebase from 'firebase';

// Firebase data structure used by this screen:
// /teachers/{uid}                               → { name, employeeId, classes: [classId, ...] }
// /classes/{classId}                            → { name, subject, room, schedule: { days, startTime, endTime } }
// /classes/{classId}/sessions/{sessionId}       → { active, startTime, endTime }
// /classes/{classId}/sessions/{id}/attendance/{studentId} → { markedAt, status, accuracy }

export default function TeacherDashboard({ navigation }) {
  const [classes, setClasses] = useState([]);
  const [activeSessions, setActiveSessions] = useState({});
  const [attendanceCounts, setAttendanceCounts] = useState({});
  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(true);

  const uid = global.user;

  useEffect(() => {
    fetchTeacherData();
    return () => Firebase.database().ref(`/teachers/${uid}`).off();
  }, []);

  async function fetchTeacherData() {
    try {
      const teacherSnap = await Firebase.database()
        .ref(`/teachers/${uid}`)
        .once('value');
      const teacherData = teacherSnap.val();
      if (!teacherData) {
        setLoading(false);
        return;
      }
      setTeacherName(teacherData.name || '');
      const classIds = teacherData.classes || [];

      const classDetails = [];
      for (const classId of classIds) {
        const classSnap = await Firebase.database()
          .ref(`/classes/${classId}`)
          .once('value');
        const classData = classSnap.val();
        if (classData) classDetails.push({ id: classId, ...classData });
      }
      setClasses(classDetails);

      // Watch active sessions and attendance counts for each class
      for (const cls of classDetails) {
        watchClassSession(cls.id);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  }

  function watchClassSession(classId) {
    Firebase.database()
      .ref(`/classes/${classId}/sessions`)
      .orderByChild('active')
      .equalTo(true)
      .on('value', (snap) => {
        const sessions = snap.val();
        const sessionId = sessions ? Object.keys(sessions)[0] : null;
        setActiveSessions((prev) => ({ ...prev, [classId]: sessionId }));

        if (sessionId) {
          watchAttendanceCount(classId, sessionId);
        } else {
          setAttendanceCounts((prev) => ({ ...prev, [classId]: 0 }));
        }
      });
  }

  function watchAttendanceCount(classId, sessionId) {
    Firebase.database()
      .ref(`/classes/${classId}/sessions/${sessionId}/attendance`)
      .on('value', (snap) => {
        const count = snap.val() ? Object.keys(snap.val()).length : 0;
        setAttendanceCounts((prev) => ({ ...prev, [classId]: count }));
      });
  }

  async function startSession(classId) {
    const sessionId = `session_${Date.now()}`;
    try {
      await Firebase.database()
        .ref(`/classes/${classId}/sessions/${sessionId}`)
        .set({ active: true, startTime: Firebase.database.ServerValue.TIMESTAMP });
    } catch (err) {
      Alert.alert('Error', 'Failed to start session. Check your connection.');
    }
  }

  async function endSession(classId, sessionId) {
    Alert.alert('End Session', 'Are you sure you want to end this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: async () => {
          try {
            await Firebase.database()
              .ref(`/classes/${classId}/sessions/${sessionId}`)
              .update({ active: false, endTime: Firebase.database.ServerValue.TIMESTAMP });
          } catch (err) {
            Alert.alert('Error', 'Failed to end session.');
          }
        },
      },
    ]);
  }

  function handleLogout() {
    navigation.navigate('Login');
  }

  const renderClass = ({ item }) => {
    const sessionId = activeSessions[item.id];
    const count = attendanceCounts[item.id] || 0;
    const isActive = Boolean(sessionId);

    return (
      <View style={[styles.classCard, isActive && styles.classCardActive]}>
        <View style={styles.classInfo}>
          <Text style={styles.subjectName}>{item.subject}</Text>
          <Text style={styles.className}>{item.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>📍 Room {item.room}</Text>
            {item.schedule && (
              <Text style={styles.metaText}>
                🕐 {item.schedule.startTime} – {item.schedule.endTime}
              </Text>
            )}
          </View>
          {item.schedule && (
            <Text style={styles.daysText}>{item.schedule.days}</Text>
          )}
        </View>

        {isActive && (
          <View style={styles.liveRow}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            <Text style={styles.countText}>{count} student{count !== 1 ? 's' : ''} present</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sessionBtn, isActive && styles.endBtn]}
          onPress={() =>
            isActive ? endSession(item.id, sessionId) : startSession(item.id)
          }
          activeOpacity={0.85}
        >
          <Text style={styles.sessionBtnText}>
            {isActive ? 'End Session' : 'Start Session'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00796B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>TEACHER DASHBOARD</Text>
          <Text style={styles.headerName}>{teacherName || 'Welcome'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No classes assigned yet.</Text>
          <Text style={styles.emptySubText}>
            Ask your administrator to assign classes to your account.
          </Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={renderClass}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Your Classes</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#004D40',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerName: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 4,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
    marginTop: 4,
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#B2DFDB',
  },
  classCardActive: {
    borderLeftColor: '#00796B',
  },
  classInfo: {
    marginBottom: 12,
  },
  subjectName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#212121',
  },
  className: {
    fontSize: 14,
    color: '#555',
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#616161',
  },
  daysText: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2E7D32',
    marginRight: 5,
  },
  liveText: {
    color: '#2E7D32',
    fontWeight: 'bold',
    fontSize: 12,
  },
  countText: {
    color: '#388E3C',
    fontSize: 14,
    fontWeight: '600',
  },
  sessionBtn: {
    backgroundColor: '#00796B',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  endBtn: {
    backgroundColor: '#B71C1C',
  },
  sessionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyText: {
    color: '#424242',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubText: {
    color: '#757575',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
});
