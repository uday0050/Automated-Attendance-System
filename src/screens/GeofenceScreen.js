import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import Firebase from 'firebase';
import { isInsideGeofence } from '../utils/geofence';

// Firebase data structure used by this screen:
// /students/{uid}/enrolledClasses       → array of classIds
// /classes/{classId}                    → { name, subject, room, geofence: { lat, lon, radius } }
// /classes/{classId}/sessions/{id}      → { active: bool, startTime }
// /classes/{classId}/sessions/{id}/attendance/{uid} → { markedAt, accuracy, status }

const GPS_ACCURACY_WARN = 50; // warn user if accuracy is worse than 50m

export default function GeofenceScreen() {
  const [gpsStatus, setGpsStatus] = useState('requesting');
  // states: requesting | searching | inside | outside | no_session | error
  const [distance, setDistance] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [currentClass, setCurrentClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const locationSub = useRef(null);

  const uid = global.user;

  useEffect(() => {
    initializeScreen();
    return () => {
      if (locationSub.current) locationSub.current.remove();
    };
  }, []);

  async function initializeScreen() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('error');
        setLoading(false);
        return;
      }
      await findActiveSession();
    } catch (err) {
      console.log(err);
      setGpsStatus('error');
    } finally {
      setLoading(false);
    }
  }

  async function findActiveSession() {
    // Load enrolled classes for this student, then find one with an active session
    const enrolledSnap = await Firebase.database()
      .ref(`/students/${uid}/enrolledClasses`)
      .once('value');
    const enrolledClasses = enrolledSnap.val() || [];

    for (const classId of enrolledClasses) {
      const classSnap = await Firebase.database()
        .ref(`/classes/${classId}`)
        .once('value');
      const classData = classSnap.val();
      if (!classData) continue;

      const sessionsSnap = await Firebase.database()
        .ref(`/classes/${classId}/sessions`)
        .orderByChild('active')
        .equalTo(true)
        .once('value');
      const sessions = sessionsSnap.val();
      if (!sessions) continue;

      const sessionId = Object.keys(sessions)[0];

      // Check if this student has already marked attendance for this session
      const attSnap = await Firebase.database()
        .ref(`/classes/${classId}/sessions/${sessionId}/attendance/${uid}`)
        .once('value');

      setCurrentClass({ id: classId, ...classData });
      setCurrentSession({ id: sessionId, ...sessions[sessionId] });
      setAttendanceMarked(attSnap.exists());
      startLocationWatch(classData.geofence);
      return;
    }

    setGpsStatus('no_session');
  }

  async function startLocationWatch(geofenceData) {
    if (!geofenceData) {
      setGpsStatus('no_session');
      return;
    }
    setGpsStatus('searching');
    locationSub.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (location) => {
        const { latitude, longitude, accuracy: acc } = location.coords;
        setAccuracy(Math.round(acc));
        const { inside, distance: dist } = isInsideGeofence(
          latitude,
          longitude,
          geofenceData.lat,
          geofenceData.lon,
          geofenceData.radius || 100
        );
        setDistance(dist);
        setGpsStatus(inside ? 'inside' : 'outside');
      }
    );
  }

  async function markAttendance() {
    if (!currentSession || !currentClass || gpsStatus !== 'inside') return;
    try {
      await Firebase.database()
        .ref(`/classes/${currentClass.id}/sessions/${currentSession.id}/attendance/${uid}`)
        .set({
          markedAt: Firebase.database.ServerValue.TIMESTAMP,
          accuracy: accuracy,
          status: 'present',
        });
      setAttendanceMarked(true);
      Alert.alert('Attendance Marked', "You're all set for today's class!");
    } catch (err) {
      console.log(err);
      Alert.alert('Error', 'Could not mark attendance. Please try again.');
    }
  }

  function getStatusConfig() {
    const map = {
      requesting: { color: '#757575', text: 'Requesting location access...', icon: '📍' },
      searching:  { color: '#F57F17', text: 'Locating you...',               icon: '🔍' },
      inside:     { color: '#2E7D32', text: 'Inside Classroom',              icon: '✅' },
      outside:    { color: '#C62828', text: 'Outside Classroom',             icon: '❌' },
      no_session: { color: '#757575', text: 'No Active Class Session',       icon: '📚' },
      error:      { color: '#C62828', text: 'Location Access Denied',        icon: '⚠️' },
    };
    return map[gpsStatus] || map.requesting;
  }

  const statusConfig = getStatusConfig();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00796B" />
        <Text style={styles.loadingText}>Setting up GPS...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GPS Check-In</Text>
        {currentClass ? (
          <Text style={styles.headerSubtitle}>
            {currentClass.subject}  ·  Room {currentClass.room}
          </Text>
        ) : null}
      </View>

      <View style={[styles.statusCard, { borderColor: statusConfig.color }]}>
        <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
        <Text style={[styles.statusText, { color: statusConfig.color }]}>
          {statusConfig.text}
        </Text>
        {distance !== null && gpsStatus !== 'no_session' && gpsStatus !== 'error' && (
          <Text style={styles.distanceText}>{distance} m from classroom</Text>
        )}
        {accuracy !== null && (
          <View style={[styles.accuracyBadge, accuracy > GPS_ACCURACY_WARN && styles.lowAccuracy]}>
            <Text style={styles.accuracyText}>
              GPS Accuracy: ±{accuracy}m{accuracy > GPS_ACCURACY_WARN ? '  (weak signal)' : ''}
            </Text>
          </View>
        )}
      </View>

      {gpsStatus === 'error' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Location permission is required to verify your presence in the classroom.
            Please enable location access in your device settings.
          </Text>
        </View>
      )}

      {gpsStatus === 'no_session' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your teacher has not started a session yet.{'\n'}
            Please wait for class to begin.
          </Text>
        </View>
      )}

      {accuracy !== null && accuracy > GPS_ACCURACY_WARN && gpsStatus === 'outside' && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            Weak GPS signal detected. Move near a window for better accuracy.
          </Text>
        </View>
      )}

      {attendanceMarked ? (
        <View style={styles.markedBox}>
          <Text style={styles.markedText}>✅  Attendance Marked</Text>
          <Text style={styles.markedSub}>You're all set for today's class!</Text>
        </View>
      ) : currentSession ? (
        <TouchableOpacity
          style={[styles.markButton, gpsStatus !== 'inside' && styles.markButtonDisabled]}
          onPress={markAttendance}
          disabled={gpsStatus !== 'inside'}
          activeOpacity={0.8}
        >
          <Text style={styles.markButtonText}>Mark Attendance</Text>
        </TouchableOpacity>
      ) : null}
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
  loadingText: {
    marginTop: 12,
    color: '#00796B',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#00796B',
    paddingTop: 50,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 26,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    marginTop: 6,
  },
  statusCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: 14,
  },
  statusText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  distanceText: {
    color: '#616161',
    fontSize: 16,
    marginTop: 10,
  },
  accuracyBadge: {
    marginTop: 12,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  lowAccuracy: {
    backgroundColor: '#FFF8E1',
  },
  accuracyText: {
    color: '#555',
    fontSize: 13,
  },
  infoBox: {
    marginHorizontal: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 18,
  },
  infoText: {
    color: '#1565C0',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  warningBox: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
  },
  warningText: {
    color: '#E65100',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  markButton: {
    marginHorizontal: 30,
    marginTop: 30,
    backgroundColor: '#00796B',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00796B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  markButtonDisabled: {
    backgroundColor: '#BDBDBD',
    elevation: 0,
    shadowOpacity: 0,
  },
  markButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  markedBox: {
    marginHorizontal: 30,
    marginTop: 30,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 26,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  markedText: {
    color: '#2E7D32',
    fontSize: 20,
    fontWeight: 'bold',
  },
  markedSub: {
    color: '#388E3C',
    fontSize: 14,
    marginTop: 6,
  },
});
