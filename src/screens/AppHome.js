import React from 'react';
import { createAppContainer } from 'react-navigation';
import { createBottomTabNavigator } from 'react-navigation-tabs';
import HomeScreen from './HomeScreen';
import AttendanceScreen from './AttendanceScreen';
import ProfileScreen from './ProfileScreen';
import GeofenceScreen from './GeofenceScreen';
import IconMI from 'react-native-vector-icons/MaterialIcons';
import IconF from 'react-native-vector-icons/Feather';
import IconAD from 'react-native-vector-icons/AntDesign';

const TabNavigator = createBottomTabNavigator(
  {
    Home: {
      screen: HomeScreen,
      navigationOptions: {
        tabBarLabel: 'Home',
        tabBarIcon: ({ tintColor }) => (
          <IconAD name="home" color={tintColor} size={26} />
        ),
      },
    },
    CheckIn: {
      screen: GeofenceScreen,
      navigationOptions: {
        tabBarLabel: 'Check-In',
        tabBarIcon: ({ tintColor }) => (
          <IconF name="navigation" color={tintColor} size={24} />
        ),
      },
    },
    AttendanceScreen: {
      screen: AttendanceScreen,
      navigationOptions: {
        tabBarLabel: 'Attendance',
        tabBarIcon: ({ tintColor }) => (
          <IconF name="check-circle" color={tintColor} size={26} />
        ),
      },
    },
    Profile: {
      screen: ProfileScreen,
      navigationOptions: {
        tabBarLabel: 'Profile',
        tabBarIcon: ({ tintColor }) => (
          <IconMI name="person-outline" color={tintColor} size={28} />
        ),
      },
    },
  },
  {
    initialRouteName: 'Home',
    tabBarOptions: {
      showLabel: true,
      activeTintColor: '#00796B',
      inactiveTintColor: '#9E9E9E',
      style: {
        height: 62,
        paddingBottom: 8,
        paddingTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
      },
      labelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    },
  }
);

export default createAppContainer(TabNavigator);
