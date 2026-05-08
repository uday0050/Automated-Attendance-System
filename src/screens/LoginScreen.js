import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Image } from 'react-native';
import LoginForm from './LoginForm';

export default function LoginScreen(props) {
  return (
    <KeyboardAvoidingView
      behavior="position"
      keyboardVerticalOffset={-2000}
      style={styles.container}
    >
      <View>
        <Image
          source={require('../../assets/loginLogo.png')}
          style={{ width: 350, height: 220, alignSelf: 'center' }}
        />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>GeoAttend</Text>
        <Text style={styles.subtitle}>GPS-BASED ATTENDANCE SYSTEM</Text>
      </View>

      <View style={styles.formContainer}>
        <LoginForm navigation={props.navigation} />
      </View>

      <View style={styles.footer} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#00796B',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    letterSpacing: 2.5,
    marginTop: 4,
  },
  formContainer: {
    marginTop: 24,
  },
  footer: {
    height: 60,
  },
});
