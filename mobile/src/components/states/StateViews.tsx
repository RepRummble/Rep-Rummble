import React, { type ComponentProps } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';
import { isOnline } from '../../config/connectivity';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Tone = 'brand' | 'danger' | 'info' | 'warn';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: colors.brandSoft, fg: colors.brand },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  warn: { bg: colors.warningSoft, fg: colors.warning },
};

function Shell({ icon, tone, title, body, children }: { icon: IconName; tone: Tone; title: string; body: string; children?: React.ReactNode }) {
  const c = TONES[tone];
  return (
    <View style={st.wrap} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <View style={[st.icon, { backgroundColor: c.bg }]}><Ionicons name={icon} size={30} color={c.fg} /></View>
      <Text style={st.title}>{title}</Text>
      <Text style={st.body}>{body}</Text>
      {children}
    </View>
  );
}

const Button = ({ label, onPress, primary = true }: { label: string; onPress: () => void; primary?: boolean }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[st.btn, primary ? st.btnPrimary : st.btnGhost]} accessibilityRole="button">
    <Text style={[st.btnText, !primary && { color: colors.ink }]}>{label}</Text>
  </TouchableOpacity>
);

/** Nothing here yet: say why, then offer one next step. */
export function EmptyState({ icon = 'sparkles-outline', title, why, actionLabel, onAction }: { icon?: IconName; title: string; why: string; actionLabel?: string; onAction?: () => void }) {
  return <Shell icon={icon} tone="brand" title={title} body={why}>{actionLabel && onAction && <Button label={actionLabel} onPress={onAction} />}</Shell>;
}

/** Something failed: what went wrong, whose side, and how to fix it. */
export function ErrorState({ detail, onRetry }: { detail?: string; onRetry?: () => void }) {
  const offline = !isOnline();
  return (
    <Shell
      icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
      tone="danger"
      title={offline ? 'You seem to be offline' : 'Something went wrong'}
      body={offline ? 'We could not reach the server. Check your connection, then try again.' : `That was on our side, not yours.${detail ? ` ${detail}` : ''}`}
    >
      {onRetry && <Button label="Try again" onPress={onRetry} />}
    </Shell>
  );
}

/** A search found nothing: suggest what to try next. */
export function NoResults({ query, suggestions = [], onPick }: { query: string; suggestions?: string[]; onPick?: (s: string) => void }) {
  return (
    <Shell icon="search-outline" tone="info" title={`No results for “${query}”`} body="Check the spelling, or try a broader word.">
      {suggestions.length > 0 && (
        <View style={st.chips}>{suggestions.map((s) => (
          <TouchableOpacity key={s} onPress={() => onPick?.(s)} style={st.chip} accessibilityRole="button"><Text style={st.chipText}>{s}</Text></TouchableOpacity>
        ))}</View>
      )}
    </Shell>
  );
}

/**
 * A permission was refused: explain why we need it and give a way back. The first time we can still
 * ask; once iOS stops asking, the only route is Settings, so the button says so.
 */
export function PermissionDenied({ icon = 'camera-outline', why, canAskAgain = true, onRequest, openSettings, alternativeLabel, onAlternative }: { icon?: IconName; why: string; canAskAgain?: boolean; onRequest?: () => void; openSettings: () => void; alternativeLabel?: string; onAlternative?: () => void }) {
  const ask = canAskAgain && !!onRequest;
  return (
    <Shell icon={icon} tone="warn" title={ask ? 'Allow access to continue' : 'Access is turned off'} body={ask ? why : `${why} You turned this off earlier, so it can only be changed in Settings.`}>
      <Button label={ask ? 'Allow access' : 'Open Settings'} onPress={ask ? onRequest! : openSettings} />
      {alternativeLabel && onAlternative && <Button label={alternativeLabel} onPress={onAlternative} primary={false} />}
    </Shell>
  );
}

const st = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10, paddingHorizontal: 28, paddingVertical: 40 },
  icon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 19, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  body: { fontSize: 14.5, lineHeight: 21, color: colors.muted, textAlign: 'center', maxWidth: 320 },
  btn: { minHeight: 48, paddingHorizontal: 22, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 8, alignSelf: 'stretch', maxWidth: 320, width: '100%' },
  btnPrimary: { backgroundColor: colors.brand },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
});
