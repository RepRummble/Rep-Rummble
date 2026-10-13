import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { LeaderboardEntry } from '../../types';

import { colors } from '../../theme/colors';
const MEDAL = [
  { icon: 'trophy', color: colors.gold, bg: [colors.gold, '#d98f00'] as const, glow: colors.gold + '40' },
  { icon: 'medal', color: colors.silver, bg: [colors.silver, '#6b7688'] as const, glow: colors.silver + '40' },
  { icon: 'medal', color: colors.bronze, bg: [colors.bronze, '#99571f'] as const, glow: colors.bronze + '40' },
];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLeaderboard(); }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/leaderboard');
      setLeaderboard(response.data.data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboard();
    setRefreshing(false);
  };

  const renderItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isMe = item.email === user?.email;
    const medal = rank <= 3 ? MEDAL[rank - 1] : null;

    return (
      <View style={[styles.rankRow, isMe && styles.rankRowMe]}>
        {isMe && <LinearGradient colors={[colors.brand + '20', colors.brand + '05']} style={StyleSheet.absoluteFill} />}

        {/* Rank */}
        <View style={styles.rankNumWrap}>
          {medal ? (
            <Ionicons name={medal.icon as any} size={22} color={medal.color} />
          ) : (
            <Text style={[styles.rankNum, isMe && { color: colors.brand }]}>#{rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <LinearGradient
          colors={isMe ? [colors.brand, colors.tealMid] : medal ? medal.bg : [colors.faint, colors.muted]}
          style={styles.rowAvatar}
        >
          <Text style={styles.rowAvatarText}>
            {(item.userName || item.email)[0].toUpperCase()}
          </Text>
        </LinearGradient>

        {/* Info */}
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, isMe && { color: colors.brand }]}>
            {item.userName || item.email.split('@')[0]}{isMe ? ' · You' : ''}
          </Text>
          <Text style={styles.rowLevel}>Level {item.level}</Text>
        </View>

        {/* Stats */}
        <View style={styles.rowStats}>
          <View style={styles.rowStat}>
            <Ionicons name="flame" size={14} color={colors.accent} />
            <Text style={styles.rowStatVal}>{item.streak}</Text>
          </View>
          <View style={styles.rowStat}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <Text style={styles.rowStatVal}>{item.xp}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Who's dominating this week?</Text>
        </View>

        {/* Podium */}
        {leaderboard.length >= 3 && (
          <View style={styles.podium}>
            {/* 2nd */}
            <View style={styles.podiumCol}>
              <LinearGradient colors={MEDAL[1].bg} style={[styles.podiumAvatar, styles.podiumAvatar2]}>
                <Text style={styles.podiumAvatarText}>{(leaderboard[1].userName || leaderboard[1].email)[0].toUpperCase()}</Text>
              </LinearGradient>
              <Ionicons name="medal" size={22} color={colors.silver} style={{ marginTop: 6 }} />
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[1].userName || leaderboard[1].email.split('@')[0]}</Text>
              <View style={styles.podiumXpBadge}>
                <Text style={styles.podiumXpText}>{leaderboard[1].xp} XP</Text>
              </View>
              <LinearGradient colors={[colors.surfaceAlt, colors.border]} style={[styles.podiumPlatform, { height: 56 }]}>
                <Text style={styles.platformNum}>2</Text>
              </LinearGradient>
            </View>

            {/* 1st */}
            <View style={[styles.podiumCol, styles.podiumColFirst]}>
              <View style={styles.crownWrap}>
                <Text style={styles.crown}>👑</Text>
              </View>
              <LinearGradient colors={MEDAL[0].bg} style={[styles.podiumAvatar, styles.podiumAvatar1]}>
                <Text style={[styles.podiumAvatarText, { fontSize: 28 }]}>{(leaderboard[0].userName || leaderboard[0].email)[0].toUpperCase()}</Text>
              </LinearGradient>
              <Ionicons name="trophy" size={26} color={colors.gold} style={{ marginTop: 6 }} />
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[0].userName || leaderboard[0].email.split('@')[0]}</Text>
              <View style={[styles.podiumXpBadge, { backgroundColor: colors.gold + '20', borderColor: colors.gold }]}>
                <Text style={[styles.podiumXpText, { color: colors.gold }]}>{leaderboard[0].xp} XP</Text>
              </View>
              <LinearGradient colors={[colors.warningSoft, '#fde9b8']} style={[styles.podiumPlatform, { height: 80 }]}>
                <Text style={[styles.platformNum, { color: colors.gold }]}>1</Text>
              </LinearGradient>
            </View>

            {/* 3rd */}
            <View style={styles.podiumCol}>
              <LinearGradient colors={MEDAL[2].bg} style={[styles.podiumAvatar, styles.podiumAvatar3]}>
                <Text style={styles.podiumAvatarText}>{(leaderboard[2].userName || leaderboard[2].email)[0].toUpperCase()}</Text>
              </LinearGradient>
              <Ionicons name="medal" size={22} color={colors.bronze} style={{ marginTop: 6 }} />
              <Text style={styles.podiumName} numberOfLines={1}>{leaderboard[2].userName || leaderboard[2].email.split('@')[0]}</Text>
              <View style={[styles.podiumXpBadge, { borderColor: colors.bronze }]}>
                <Text style={styles.podiumXpText}>{leaderboard[2].xp} XP</Text>
              </View>
              <LinearGradient colors={[colors.accentSoft, '#fbd9b8']} style={[styles.podiumPlatform, { height: 40 }]}>
                <Text style={[styles.platformNum, { color: colors.bronze }]}>3</Text>
              </LinearGradient>
            </View>
          </View>
        )}

        {/* Full list */}
        <FlatList
          data={leaderboard}
          renderItem={renderItem}
          keyExtractor={(item, i) => item.oderId || i.toString()}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="trophy-outline" size={56} color={colors.border} />
                <Text style={styles.emptyText}>No rankings yet</Text>
                <Text style={styles.emptyHint}>Start logging workouts to climb!</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.faint, marginTop: 4 },

  // Podium
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  podiumCol: { alignItems: 'center', flex: 1 },
  podiumColFirst: { marginBottom: 0 },
  crownWrap: { marginBottom: 4 },
  crown: { fontSize: 24 },
  podiumAvatar: { justifyContent: 'center', alignItems: 'center', borderRadius: 999 },
  podiumAvatar1: { width: 72, height: 72, borderWidth: 2, borderColor: colors.gold },
  podiumAvatar2: { width: 58, height: 58, borderWidth: 2, borderColor: colors.silver },
  podiumAvatar3: { width: 58, height: 58, borderWidth: 2, borderColor: colors.bronze },
  podiumAvatarText: { fontSize: 22, fontWeight: '800', color: colors.white },
  podiumName: { fontSize: 12, fontWeight: '600', color: colors.ink, marginTop: 4, textAlign: 'center' },
  podiumXpBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.silver, backgroundColor: colors.silver + '10' },
  podiumXpText: { fontSize: 11, fontWeight: '700', color: colors.silver },
  podiumPlatform: { width: '100%', marginTop: 8, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  platformNum: { fontSize: 22, fontWeight: '900', color: colors.muted },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  rankRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  rankRowMe: { borderColor: colors.brand },
  rankNumWrap: { width: 36, alignItems: 'center' },
  rankNum: { fontSize: 16, fontWeight: '700', color: colors.faint },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  rowAvatarText: { fontSize: 16, fontWeight: '800', color: colors.white },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowLevel: { fontSize: 12, color: colors.faint, marginTop: 2 },
  rowStats: { flexDirection: 'row', gap: 14 },
  rowStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rowStatVal: { fontSize: 13, fontWeight: '700', color: colors.ink },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 17, fontWeight: '600', color: colors.faint, marginTop: 14 },
  emptyHint: { fontSize: 13, color: colors.border, marginTop: 6 },
});
