import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image, Modal, TextInput, Button,
  Dimensions, Alert, ScrollView,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { AsyncStorage } from 'react-native';
import Firebase from 'firebase';
import IconF from 'react-native-vector-icons/Feather';

const { width: W, height: H } = Dimensions.get('window');

export default function ProfileScreen(props) {
  const [database, setDatabase] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');

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
        setDatabase(snapshot.val() || {});
      });
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 4) {
      Alert.alert('Invalid', 'Password must be at least 4 characters.');
      return;
    }
    try {
      await Firebase.database()
        .ref('/users/' + user)
        .update({ password: newPassword });
      setModalVisible(false);
      setNewPassword('');
      Alert.alert('Success', 'Password updated successfully.');
    } catch (err) {
      Alert.alert('Error', 'Failed to update password.');
    }
  }

  async function handleLogout() {
    try {
      await AsyncStorage.removeItem('SRNToken');
      await AsyncStorage.removeItem('userRole');
      global.user = null;
      global.userRole = null;
      props.navigation.navigate('Login');
    } catch (e) {
      props.navigation.navigate('Login');
    }
  }

  const subjects = database.subjects ? Object.values(database.subjects) : [];

  return (
    <ScrollView style={styles.scrollView}>
      {/* Change Password Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput
              placeholder="New password"
              onChangeText={(t) => setNewPassword(t)}
              style={styles.modalInput}
              secureTextEntry
              placeholderTextColor="#9E9E9E"
            />
            <View style={styles.modalButtons}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Button title="Cancel" color="#9E9E9E" onPress={() => { setModalVisible(false); setNewPassword(''); }} />
              </View>
              <View style={{ flex: 1, marginLeft: 6 }}>
                <Button title="Save" color="#00796B" onPress={changePassword} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        {database.profilePic ? (
          <Image source={{ uri: database.profilePic }} style={styles.profilePic} />
        ) : (
          <View style={[styles.profilePic, styles.profilePicPlaceholder]}>
            <Text style={{ color: 'white', fontSize: 36 }}>
              {database.name ? database.name[0] : '?'}
            </Text>
          </View>
        )}
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <InfoRow label="Name" value={database.name} />
        <InfoRow label="Student ID" value={database.SRN} />
        <InfoRow label="Branch" value={database.branch} />
        <InfoRow
          label="Subjects"
          value={subjects.length > 0 ? subjects.join(', ') : '—'}
        />

        {/* Password row with edit icon */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Password</Text>
          <View style={styles.passwordRow}>
            <Text style={styles.infoValue}>
              {database.password ? '•'.repeat(database.password.length) : '—'}
            </Text>
            <TouchableOpacity
              onPress={() => { setNewPassword(''); setModalVisible(true); }}
              style={styles.editIcon}
            >
              <IconF name="edit-2" size={18} color="#00796B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#00796B',
    paddingTop: H * 0.05,
    paddingBottom: 30,
    alignItems: 'center',
    position: 'relative',
  },
  headerTitle: {
    position: 'absolute',
    top: H * 0.05,
    left: 20,
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  logoutBtn: {
    position: 'absolute',
    top: H * 0.05 + 4,
    right: 20,
  },
  logoutText: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    fontSize: 14,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'white',
    marginTop: H * 0.04,
  },
  profilePicPlaceholder: {
    backgroundColor: '#004D40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabel: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
    width: 90,
  },
  infoValue: {
    color: '#212121',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
  },
  passwordRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editIcon: {
    marginLeft: 10,
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: W * 0.82,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 24,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#212121',
    marginBottom: 18,
    backgroundColor: '#FAFAFA',
  },
  modalButtons: {
    flexDirection: 'row',
  },
});
