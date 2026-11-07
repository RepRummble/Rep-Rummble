import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { Friend, social } from '../social/api';
import { Avatar } from '../social/ui';

/** Pick friends to invite. People in `exclude` (already in the challenge) are not shown. */
export default function FriendPicker({ selected, onChange, exclude = [], max = 9 }: { selected: string[]; onChange: (ids: string[]) => void; exclude?: string[]; max?: number }) {
  const [friends, setFriends] = useState<Friend[] | null>(null);
  useEffect(() => { social.friends().then(setFriends).catch(() => setFriends([])); }, []);
  if (friends === null) return <ActivityIndicator color={colors.brandBright} style={{ margin: 16 }} />;
  const list = friends.filter((f) => !exclude.includes(f.id));
  if (list.length === 0) return <Text style={s.none}>{friends.length ? 'All your friends are already in.' : 'You have no friends yet. Add friends from the People screen, then invite them.'}</Text>;
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : selected.length >= max ? selected : [...selected, id]);
  return (
    <View>
      {list.map((f) => {
        const on = selected.includes(f.id);
        return (
          <TouchableOpacity key={f.id} style={s.row} onPress={() => toggle(f.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
            <Avatar name={f.displayName} size={38} />
            <View style={{ flex: 1 }}><Text style={s.name}>{f.displayName}</Text>{f.streak > 0 ? <Text style={s.sub}>🔥 {f.streak} day streak</Text> : null}</View>
            <View style={[s.check, on && s.checkOn]}>{on ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}</View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  none: { color: colors.muted, fontSize: 13.5, lineHeight: 19, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }, name: { color: colors.ink, fontWeight: '800', fontSize: 15 }, sub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }, checkOn: { backgroundColor: colors.brand, borderColor: colors.brand },
});
