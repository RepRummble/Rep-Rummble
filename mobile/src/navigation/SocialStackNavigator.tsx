import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SocialStackParamList } from "../types";
import { colors } from '../theme/colors';

import SocialFeedScreen from "../screens/SocialFeedScreen";
import ComposeScreen from "../screens/ComposeScreen";
import MessagesScreen from "../screens/MessagesScreen";
import ThreadScreen from "../screens/ThreadScreen";
import NewMessageScreen from "../screens/NewMessageScreen";
import StreaksScreen from "../screens/StreaksScreen";
import PeopleScreen from "../screens/PeopleScreen";
import ChallengesScreen from "../screens/ChallengesScreen";

const Stack = createNativeStackNavigator<SocialStackParamList>();

/** Social: the feed is home. Everything else (create, messages, people, streaks, challenges) opens from it. */
export default function SocialStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: "slide_from_right" }}>
      <Stack.Screen name="SocialFeed" component={SocialFeedScreen} options={{ contentStyle: { backgroundColor: "transparent" } }} />
      <Stack.Screen name="Compose" component={ComposeScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
      <Stack.Screen name="Thread" component={ThreadScreen} />
      <Stack.Screen name="NewMessage" component={NewMessageScreen} options={{ animation: "slide_from_bottom" }} />
      <Stack.Screen name="Streaks" component={StreaksScreen} />
      <Stack.Screen name="People" component={PeopleScreen} />
      <Stack.Screen name="Challenges" component={ChallengesScreen} />
    </Stack.Navigator>
  );
}
