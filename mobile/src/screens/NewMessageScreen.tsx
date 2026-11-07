import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import SpaceBackground from '../components/fx/SpaceBackground';
import { ListSkeleton } from '../components/states/Skeleton';
import type { SocialStackParamList } from '../types';
import { Friend, social } from '../features/social/api';
import { Avatar, Empty } from '../features/social/ui';

/** Pick a friend to message. Only friends can be messaged. */
export default function NewMessageScreen() {
  const nav = useNavigation<NativeStackNavigationProp<SocialStackParamList>>();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  useEffect(() => { social.friends().then(setFriends).catch(() => setFriends([])); }, []);
  return (
    <View style={{ flex: 1 }}>
      <SpaceBackground quiet />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={s.top}>
          <TouchableOpacity onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="Back"><Ionicons name="chevron-back" size={28} color={colors.ink} /></TouchableOpacity>
          <Text style={s.title}>New message</Text><View style={{ width: 28 }} />
        </View>
        {friends === null ? <ListSkeleton /> : (
          <FlatList
            data={friends} keyExtractor={(f) => f.id}
            ListEmptyComponent={<Empty icon="people-outline" title="No friends yet" body="Add friends first, then you can message them." />}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} onPress={() => nav.replace('Thread', { userId: item.id, name: item.displayName })} accessibilityRole="button">
                <Avatar name={item.displayName} size={44} /><Text style={s.name}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8 }, title: { fontSize: 20, fontWeight: '900', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10 }, name: { color: colors.ink, fontWeight: '800', fontSize: 16 },
});
