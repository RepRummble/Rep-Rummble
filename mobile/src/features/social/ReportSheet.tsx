import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { errorMessage, social } from './api';
import { REPORT_REASONS } from './socialLogic';

export interface ReportTarget { targetType: 'post' | 'comment' | 'story' | 'message' | 'user'; targetId: string; authorId: string; authorName: string }

/**
 * Report something, or block the person. Reports go to the team, and a post that several people report is hidden.
 * Blocking removes the friendship and hides each person from the other everywhere.
 */
export default function ReportSheet({ target, onClose, onBlocked }: { target: ReportTarget | null; onClose: () => void; onBlocked?: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!target) return null;

  const sendReport = async (reason: string) => {
    setBusy(true);
    try {
      await social.report({ targetType: target.targetType, targetId: target.targetId, reason });
      onClose();
      Alert.alert('Thanks for telling us', 'We have received your report. You can also block this person so you do not see them again.');
    } catch (e) { Alert.alert('Could not send', errorMessage(e, 'Please try again.')); } finally { setBusy(false); }
  };

  const confirmBlock = () => Alert.alert(`Block ${target.authorName}?`, 'They will not be able to see your posts or message you, you will not see theirs, and your friendship ends.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Block', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await social.block(target.authorId); onClose(); onBlocked?.(); }
      catch (e) { Alert.alert('Could not block', errorMessage(e, 'Please try again.')); } finally { setBusy(false); }
    } },
  ]);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.back} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <Text style={s.title}>Report or block</Text>
          <Text style={s.sub}>Why are you reporting this {target.targetType === 'user' ? 'person' : target.targetType}?</Text>
          <ScrollView style={{ maxHeight: 330 }}>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity key={r.key} style={s.row} disabled={busy} onPress={() => sendReport(r.key)} accessibilityRole="button">
                <Text style={s.rowText}>{r.label}</Text><Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={[s.row, s.block]} disabled={busy} onPress={confirmBlock}><Ionicons name="ban-outline" size={18} color="#ff6b7a" /><Text style={[s.rowText, { color: '#ff6b7a', flex: 1 }]}>Block {target.authorName}</Text></TouchableOpacity>
          {busy ? <ActivityIndicator color={colors.brandBright} style={{ marginTop: 10 }} /> : null}
          <TouchableOpacity onPress={onClose} style={s.cancel}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0a1226', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '900', color: colors.ink }, sub: { fontSize: 13.5, color: colors.muted, marginTop: 4, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  rowText: { flex: 1, fontSize: 15.5, fontWeight: '700', color: colors.ink }, block: { borderBottomWidth: 0, marginTop: 6 },
  cancel: { alignItems: 'center', paddingVertical: 14, marginTop: 4 }, cancelText: { color: colors.muted, fontWeight: '800', fontSize: 15 },
});
