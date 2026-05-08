import React, { useState, useEffect } from 'react';
import {
  StyleSheet, ScrollView, Text, View, FlatList,
  TouchableOpacity, Dimensions, RefreshControl,
} from 'react-native';
import Modal from 'react-native-modalbox';
import Firebase from 'firebase';
import ModalContent from './ModalContent';

const { width, height } = Dimensions.get('window');

export default function AttendanceScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [database, setDatabase] = useState(null);

  const user = global.user;

  const firebaseConfig = {
    apiKey: '<your-api-key>',
    authDomain: '<your-project-id>.firebaseapp.com',
    databaseURL: 'https://<your-project-id>-default-rtdb.firebaseio.com',
    projectId: '<your-project-id>',
    storageBucket: '<your-project-id>.appspot.com',
    messagingSenderId: '<your-messaging-sender-id>',
    appId: '<your-app-id>',
    measurementId: '<your-measurement-id>',
  };

  if (!Firebase.apps.length) {
    Firebase.initializeApp(firebaseConfig);
  }

  useEffect(() => {
    updateDatabase();
  }, []);

  function updateDatabase() {
    Firebase.database()
      .ref('/users/' + user)
      .on('value', (snapshot) => {
        setDatabase(snapshot.val());
      });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    updateDatabase();
    wait(100).then(() => setRefreshing(false));
  }, []);

  function getAttendanceRange(p) {
    if (p >= 85) return 'high';
    if (p >= 75) return 'mid';
    return 'low';
  }

  if (!database) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  // Build attendance list: [{ subjectId, subjectName, percentage }]
  const listAttendance = Object.keys(database.attendance || {}).map((subjectId) => {
    const dayStr = Object.values(database.attendance[subjectId]).join('');
    const attended = (dayStr.match(/1/g) || []).length;
    const total = dayStr.length;
    const perc = total > 0 ? Math.round((attended / total) * 10000) / 100 : 0;
    return {
      subjectId,
      subjectName: database.subjects ? database.subjects[subjectId] : subjectId,
      attended,
      total,
      perc,
    };
  });

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#00796B']}
            tintColor="#00796B"
          />
        }
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Hello, {database.name}!</Text>
            <Text style={styles.headerSub}>Tap a subject for details</Text>
          </View>

          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderItem}>Subject</Text>
            <Text style={styles.tableHeaderItem}>Attendance</Text>
          </View>

          <FlatList
            style={{ width: '100%' }}
            data={listAttendance}
            keyExtractor={(item) => item.subjectId}
            scrollEnabled={false}
            renderItem={({ item }) => {
              const range = getAttendanceRange(item.perc);
              return (
                <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.7}>
                  <View style={styles.listItem}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{item.subjectName}</Text>
                      <Text style={styles.subjectId}>{item.subjectId}</Text>
                      <Text style={styles.classCount}>
                        {item.attended}/{item.total} classes
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.percText,
                        range === 'high' && styles.percHigh,
                        range === 'mid' && styles.percMid,
                        range === 'low' && styles.percLow,
                      ]}
                    >
                      {item.perc}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </ScrollView>

      <Modal
        entry="bottom"
        backdropPressToClose
        isOpen={modalVisible}
        style={styles.modalBox}
        onClosed={() => setModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <ModalContent />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00796B',
    fontSize: 15,
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  headerSub: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 2,
    borderBottomColor: '#00796B',
    borderTopWidth: 2,
    borderTopColor: '#00796B',
    paddingVertical: 4,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#E0F2F1',
  },
  tableHeaderItem: {
    fontSize: 14,
    lineHeight: 36,
    fontWeight: 'bold',
    color: '#004D40',
    letterSpacing: 0.5,
  },
  listItem: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  subjectInfo: {
    flex: 1,
    marginRight: 12,
  },
  subjectName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#212121',
  },
  subjectId: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  classCount: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  percText: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  percHigh: { color: '#2E7D32' },
  percMid:  { color: '#E65100' },
  percLow:  { color: '#C62828' },
  modalBox: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    height,
    width,
    backgroundColor: 'transparent',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    width,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
