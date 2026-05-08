import React from 'react';
import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import LoginScreen from './src/screens/LoginScreen';
import AppHome from './src/screens/AppHome';
import TeacherDashboard from './src/screens/TeacherDashboard';
import AttendanceScreen from './src/screens/AttendanceScreen';

const AppNavigator = createStackNavigator(
  {
    Login: {
      screen: LoginScreen,
      navigationOptions: { title: 'GeoAttend' },
    },
    AppHome: {
      screen: AppHome,
      navigationOptions: { headerShown: false },
    },
    TeacherDashboard: {
      screen: TeacherDashboard,
      navigationOptions: { headerShown: false },
    },
    Attendance: {
      screen: AttendanceScreen,
      navigationOptions: { title: 'Attendance' },
    },
  },
  {
    initialRouteName: 'Login',
    defaultNavigationOptions: {
      headerStyle: {
        backgroundColor: '#00796B',
        elevation: 4,
        height: 100,
        shadowOpacity: 0.2,
      },
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#ffffff',
        fontSize: 20,
      },
    },
  }
);

export default createAppContainer(AppNavigator);
