import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '../types';

// Tab Screens
import HomeScreen from '../screens/tabs/HomeScreen';
import SnapScreen from '../screens/tabs/SnapScreen';
import StreakScreen from '../screens/tabs/StreakScreen';
import LeaderboardScreen from '../screens/tabs/LeaderboardScreen';
import ProfileScreen from '../screens/tabs/ProfileScreen';
import WearablesScreen from '../screens/WearablesScreen';
import SocialStackNavigator from "./SocialStackNavigator";

import { colors } from '../theme/colors';
const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'fade',
        tabBarStyle: {
          backgroundColor: 'rgba(6, 10, 22, 0.94)',
          borderTopColor: 'rgba(255, 122, 26, 0.28)',
          borderTopWidth: 1,
          height: 85,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#ff7a1a',
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Snap":
              iconName = focused ? "camera" : "camera-outline";
              break;
            case "Streak":
              iconName = focused ? "flame" : "flame-outline";
              break;
            case "Leaderboard":
              iconName = focused ? "trophy" : "trophy-outline";
              break;
            case "Wearables":
              iconName = focused ? "watch" : "watch-outline";
              break;
            case "Social":
              iconName = focused ? "people" : "people-outline";
              break;
            case "Profile":
              iconName = focused ? "person" : "person-outline";
              break;
            default:
              iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Snap"
        component={SnapScreen}
        options={{ tabBarLabel: "Meals" }}
      />
      <Tab.Screen
        name="Streak"
        component={StreakScreen}
        options={{ tabBarLabel: "Train" }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarLabel: "Ranks" }}
      />
      <Tab.Screen
        name="Wearables"
        component={WearablesScreen}
        options={{ tabBarLabel: "Health" }}
      />
      <Tab.Screen
        name="Social"
        component={SocialStackNavigator}
        options={{ tabBarLabel: "Social" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}
