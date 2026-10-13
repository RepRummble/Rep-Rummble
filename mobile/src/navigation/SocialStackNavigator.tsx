import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SocialStackParamList } from "../types";

// Social Screens
import SocialFeedScreen from "../screens/SocialFeedScreen";
import FriendsScreen from "../screens/FriendsScreen";
import ChallengesScreen from "../screens/ChallengesScreen";

import { colors } from '../theme/colors';
const Stack = createNativeStackNavigator<SocialStackParamList>();

export default function SocialStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="SocialFeed"  component={SocialFeedScreen}  />
      <Stack.Screen name="Friends"     component={FriendsScreen}     />
      <Stack.Screen name="Challenges"  component={ChallengesScreen}  />
    </Stack.Navigator>
  );
}
