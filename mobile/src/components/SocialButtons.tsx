import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import type { SocialProvider } from '../services/socialAuth';
import { colors, radius } from '../theme/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const PROVIDERS: { id: SocialProvider; label: string; icon: IconName; iconColor: string; style: 'dark' | 'light' }[] = [
  { id: 'apple', label: 'Continue with Apple', icon: 'logo-apple', iconColor: '#ffffff', style: 'dark' },
  { id: 'google', label: 'Continue with Google', icon: 'logo-google', iconColor: '#ea4335', style: 'light' },
  { id: 'azure', label: 'Continue with Microsoft', icon: 'logo-microsoft', iconColor: '#00a4ef', style: 'light' },
  { id: 'facebook', label: 'Continue with Facebook', icon: 'logo-facebook', iconColor: '#1877f2', style: 'light' },
];

/** "Or continue with" buttons for the sign-in and sign-up screens. */
export default function SocialButtons({ disabled }: { disabled?: boolean }) {
  const { loginWithProvider } = useAuth();
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  const go = async (provider: SocialProvider) => {
    setBusy(provider);
    try {
      await loginWithProvider(provider);
    } catch (error: any) {
      Alert.alert('Sign-in failed', error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.wrap}>
      <View style={s.divider}>
        <View style={s.line} /><Text style={s.dividerText}>or continue with</Text><View style={s.line} />
      </View>
      {PROVIDERS.map((p) => (
        <TouchableOpacity
          key={p.id}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={p.label}
          disabled={disabled || busy !== null}
          onPress={() => go(p.id)}
          style={[s.btn, p.style === 'dark' ? s.btnDark : s.btnLight, (disabled || (busy !== null && busy !== p.id)) && { opacity: 0.55 }]}
        >
          {busy === p.id ? (
            <ActivityIndicator color={p.style === 'dark' ? colors.white : colors.brand} />
          ) : (
            <>
              <Ionicons name={p.icon} size={20} color={p.iconColor} />
              <Text style={[s.label, p.style === 'dark' && { color: colors.white }]}>{p.label}</Text>
            </>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10, marginTop: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 14 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  btn: { minHeight: 52, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  btnDark: { backgroundColor: colors.ink },
  btnLight: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  label: { fontSize: 16, fontWeight: '600', color: colors.ink },
});
