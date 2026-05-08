import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { AsyncStorage } from 'react-native';
import Firebase from 'firebase';
import { NavigationEvents } from 'react-navigation';

export default function LoginForm(props) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'teacher'
  const [warning, setWarning] = useState('');
  const [database, setDatabase] = useState({});

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

  function fetchUsers(selectedRole) {
    const path = selectedRole === 'teacher' ? '/teachers/' : '/users/';
    Firebase.database()
      .ref(path)
      .once('value', (snapshot) => {
        setDatabase(snapshot.val() || {});
      });
  }

  useEffect(() => {
    fetchUsers(role);
    restoreSession();
  }, []);

  function handleRoleSwitch(newRole) {
    setRole(newRole);
    setUserId('');
    setPassword('');
    setWarning('');
    fetchUsers(newRole);
  }

  async function onSubmit() {
    setWarning('');
    if (!userId.trim() || !password.trim()) {
      setWarning('Please enter your ID and password.');
      return;
    }
    try {
      if (!database[userId]) {
        setWarning('ID not found. Please check and try again.');
        return;
      }
      if (database[userId].password !== password) {
        setWarning('Incorrect password. Please try again.');
        return;
      }
      await AsyncStorage.setItem('SRNToken', userId);
      await AsyncStorage.setItem('userRole', role);
      global.user = userId;
      global.userRole = role;

      if (role === 'teacher') {
        props.navigation.navigate('TeacherDashboard');
      } else {
        props.navigation.navigate('AppHome');
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function restoreSession() {
    try {
      const savedId = await AsyncStorage.getItem('SRNToken');
      const savedRole = await AsyncStorage.getItem('userRole');
      if (savedId) {
        global.user = savedId;
        setUserId(savedId);
        if (savedRole) {
          setRole(savedRole);
          global.userRole = savedRole;
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  function onFocus() {
    fetchUsers(role);
    restoreSession();
  }

  return (
    <View style={styles.container}>
      <NavigationEvents
        onWillFocus={() => onFocus()}
        onDidFocus={() => onFocus()}
      />

      {/* Role toggle: Student / Teacher */}
      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
          onPress={() => handleRoleSwitch('student')}
          activeOpacity={0.8}
        >
          <Text style={[styles.roleBtnText, role === 'student' && styles.roleBtnTextActive]}>
            Student
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === 'teacher' && styles.roleBtnActive]}
          onPress={() => handleRoleSwitch('teacher')}
          activeOpacity={0.8}
        >
          <Text style={[styles.roleBtnText, role === 'teacher' && styles.roleBtnTextActive]}>
            Teacher
          </Text>
        </TouchableOpacity>
      </View>

      {warning ? <Text style={styles.warning}>{warning}</Text> : null}

      <TextInput
        placeholder={role === 'teacher' ? 'Employee ID' : 'Student ID / SRN'}
        placeholderTextColor="rgba(255,255,255,0.65)"
        style={styles.input}
        onChangeText={(text) => setUserId(text)}
        value={userId}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor="rgba(255,255,255,0.65)"
        secureTextEntry
        style={styles.input}
        onChangeText={(text) => setPassword(text)}
      />

      <TouchableOpacity style={styles.loginBtn} onPress={onSubmit} activeOpacity={0.85}>
        <Text style={styles.loginBtnText}>Login</Text>
      </TouchableOpacity>

      {global.user ? (
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={() =>
            global.userRole === 'teacher'
              ? props.navigation.navigate('TeacherDashboard')
              : props.navigation.navigate('AppHome')
          }
          activeOpacity={0.85}
        >
          <Text style={styles.continueBtnText}>Continue as {global.user}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 28,
    padding: 4,
    marginBottom: 20,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 24,
    alignItems: 'center',
  },
  roleBtnActive: {
    backgroundColor: 'white',
  },
  roleBtnText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontSize: 15,
  },
  roleBtnTextActive: {
    color: '#00796B',
  },
  warning: {
    color: '#FFD54F',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 10,
    fontSize: 13,
  },
  input: {
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
    color: '#FFF',
    paddingHorizontal: 16,
    fontSize: 15,
    borderRadius: 10,
  },
  loginBtn: {
    backgroundColor: '#004D40',
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 10,
  },
  loginBtnText: {
    textAlign: 'center',
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  continueBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  continueBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
  },
});
