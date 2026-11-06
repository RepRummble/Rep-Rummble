import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { ago } from '../../config/cache';

/** Shown above content that came from the saved copy: what you see, how old it is, what still works. */
export default function StaleNote({ savedAt, what = 'This is' }: { savedAt?: number; what?: string }) {
  return (
    <View style={s.wrap} accessibilityRole="alert">
      <Ionicons name="time-outline" size={16} color={colors.warning} />
      <Text style={s.text}>
        {what} from {ago(savedAt)}. You can keep browsing; new changes will not save until you are back online. Pull down to refresh.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginHorizontal: 20, marginBottom: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#fedf89' },
  text: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#93370d' },
});
