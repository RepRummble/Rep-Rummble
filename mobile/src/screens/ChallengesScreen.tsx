import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { challengeService, Challenge, ChallengeProgress } from "../services/challengeService";
import { useAuth } from "../context/AuthContext";

const { width: SW } = Dimensions.get("window");

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: readonly [string, string] }> = {
  workout: { icon: "barbell",    color: "#7c3aed", bg: ["#3b0d6b", "#1e0545"] },
  calories: { icon: "flame",    color: "#f97316", bg: ["#431407", "#1f0a03"] },
  steps:    { icon: "footsteps", color: "#22c55e", bg: ["#052e16", "#021208"] },
};

function daysLeft(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  return d === 0 ? "Today" : d === 1 ? "Yesterday" : `${d}d ago`;
}

export default function ChallengesScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"browse" | "active">("browse");

  useEffect(() => {
    Promise.all([loadChallenges(), loadMyChallenges()]).finally(() => setLoading(false));
  }, []);

  const loadChallenges = async () => {
    try {
      const res = await challengeService.getChallenges({ status: "active" });
      if (res.success) setChallenges(res.challenges);
    } catch {}
  };

  const loadMyChallenges = async () => {
    try {
      const res = await challengeService.getMyChallenges();
      if (res.success) {
        setMyChallenges(res.challenges);
        res.challenges.forEach(c => loadProgress(c._id));
      }
    } catch {}
  };

  const loadProgress = async (challengeId: string) => {
    try {
      const res = await challengeService.getChallengeProgress(challengeId);
      if (res.success) setProgress(p => ({ ...p, [challengeId]: res.progress }));
    } catch {}
  };

  const handleJoin = async (challengeId: string) => {
    try {
      const res = await challengeService.joinChallenge(challengeId);
      if (res.success) {
        Alert.alert("Joined! 🎯", "Challenge accepted. Let's go!");
        await Promise.all([loadChallenges(), loadMyChallenges()]);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Failed to join");
    }
  };

  const renderChallenge = ({ item }: { item: Challenge }) => {
    const cfg = TYPE_CONFIG[item.challengeType] || TYPE_CONFIG.workout;
    const isJoined = myChallenges.some(c => c._id === item._id);
    const prog = progress[item._id];
    const pct = prog ? Math.min(prog.percentage, 100) : 0;
    const days = daysLeft(item.endDate);
    const authorName = item.creator.displayName || item.creator.email.split("@")[0];

    return (
      <View style={styles.card}>
        {/* Gradient header banner */}
        <LinearGradient colors={cfg.bg} style={styles.cardBanner}>
          <View style={styles.cardBannerContent}>
            <View style={styles.typeIconWrap}>
              <Ionicons name={cfg.icon as any} size={28} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.cardTagRow}>
                <View style={[styles.cardTag, { borderColor: cfg.color + "60", backgroundColor: cfg.color + "20" }]}>
                  <Text style={[styles.cardTagText, { color: cfg.color }]}>
                    {item.targetValue} {item.targetUnit}
                  </Text>
                </View>
                <View style={[styles.cardTag, { borderColor: "#2d3561", backgroundColor: "#0d0f1a40" }]}>
                  <Ionicons name="time-outline" size={11} color="#94a3b8" />
                  <Text style={styles.cardTagTextGray}>{days}d left</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Participant avatars */}
          <View style={styles.participantRow}>
            {item.participants.slice(0, 4).map((_, i) => (
              <LinearGradient
                key={i}
                colors={[cfg.color, cfg.color + "80"]}
                style={[styles.participantAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i }]}
              >
                <Text style={styles.participantAvatarText}>U</Text>
              </LinearGradient>
            ))}
            {item.participants.length > 4 && (
              <View style={[styles.participantAvatar, { marginLeft: -10, backgroundColor: "#2d3561", zIndex: 5 }]}>
                <Text style={styles.participantAvatarText}>+{item.participants.length - 4}</Text>
              </View>
            )}
            <Text style={styles.participantCount}>{item.participants.length} joined</Text>
          </View>
        </LinearGradient>

        {/* Card body */}
        <View style={styles.cardBody}>
          {item.description && (
            <Text style={styles.cardDesc}>{item.description}</Text>
          )}

          {/* Progress bar (if joined) */}
          {isJoined && (
            <View style={styles.progressWrap}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={[styles.progressPct, { color: cfg.color }]}>{pct.toFixed(0)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[cfg.color, cfg.color + "80"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${pct}%` }]}
                />
              </View>
              {prog && (
                <Text style={styles.progressDetail}>{prog.current} / {prog.target} {item.targetUnit}</Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.creatorRow}>
              <LinearGradient colors={[cfg.color + "60", cfg.color + "30"]} style={styles.creatorAvatar}>
                <Text style={styles.creatorAvatarText}>{authorName[0].toUpperCase()}</Text>
              </LinearGradient>
              <Text style={styles.creatorName}>by {authorName}</Text>
              <Text style={styles.creatorDate}>{timeAgo(item.createdAt)}</Text>
            </View>

            {isJoined ? (
              <View style={[styles.joinedBadge, { borderColor: cfg.color }]}>
                <Ionicons name="checkmark-circle" size={14} color={cfg.color} />
                <Text style={[styles.joinedText, { color: cfg.color }]}>Active</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => handleJoin(item._id)} activeOpacity={0.85}>
                <LinearGradient colors={[cfg.color, cfg.color + "cc"]} style={styles.joinBtn}>
                  <Text style={styles.joinBtnText}>Join</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={["#1a0533", "#0d0f1a"]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 60 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1a0533", "#0d0f1a", "#080b14"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Challenges</Text>
            <Text style={styles.subtitle}>Compete. Win. Repeat.</Text>
          </View>
          <LinearGradient colors={["#7c3aed20", "#7c3aed05"]} style={styles.statPill}>
            <Ionicons name="trophy" size={16} color="#eab308" />
            <Text style={styles.statPillText}>{myChallenges.length} active</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {[
            { key: "browse" as const, label: "Discover", icon: "compass" },
            { key: "active" as const, label: `My Challenges (${myChallenges.length})`, icon: "flash" },
          ].map(t => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, activeTab === t.key && styles.tabActive]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              {activeTab === t.key && <LinearGradient colors={["#7c3aed20", "#7c3aed05"]} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />}
              <Ionicons name={t.icon as any} size={15} color={activeTab === t.key ? "#a78bfa" : "#6b7280"} />
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={activeTab === "browse" ? challenges : myChallenges}
          renderItem={renderChallenge}
          keyExtractor={i => i._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="trophy-outline" size={56} color="#2d3561" />
              <Text style={styles.emptyTitle}>{activeTab === "browse" ? "No active challenges" : "You haven't joined any"}</Text>
              <Text style={styles.emptyHint}>{activeTab === "active" ? "Browse and join a challenge above" : "Check back soon!"}</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#2d356150", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: "#7c3aed30" },
  statPillText: { color: "#a78bfa", fontWeight: "700", fontSize: 13 },

  tabBar: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 10 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6, borderRadius: 12, position: "relative", overflow: "hidden" },
  tabActive: {},
  tabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#a78bfa", fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, backgroundColor: "#7c3aed", borderRadius: 1 },

  list: { paddingHorizontal: 16, paddingBottom: 100 },

  // Card
  card: { borderRadius: 20, marginBottom: 14, overflow: "hidden", borderWidth: 1, borderColor: "#2d356150" },
  cardBanner: { padding: 16 },
  cardBannerContent: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  typeIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#00000030", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ffffff20" },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#fff", letterSpacing: -0.3, marginBottom: 8 },
  cardTagRow: { flexDirection: "row", gap: 8 },
  cardTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, gap: 4 },
  cardTagText: { fontSize: 12, fontWeight: "700" },
  cardTagTextGray: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  participantRow: { flexDirection: "row", alignItems: "center" },
  participantAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0d0f1a" },
  participantAvatarText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  participantCount: { marginLeft: 8, fontSize: 12, color: "#94a3b8", fontWeight: "500" },

  cardBody: { backgroundColor: "#161b2e", padding: 16 },
  cardDesc: { fontSize: 14, color: "#94a3b8", lineHeight: 20, marginBottom: 14 },

  progressWrap: { marginBottom: 14 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  progressLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  progressPct: { fontSize: 12, fontWeight: "800" },
  progressTrack: { height: 8, backgroundColor: "#2d3561", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressDetail: { fontSize: 11, color: "#6b7280", marginTop: 4, textAlign: "center" },

  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  creatorRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  creatorAvatar: { width: 26, height: 26, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  creatorAvatarText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  creatorName: { fontSize: 12, color: "#94a3b8", fontWeight: "500" },
  creatorDate: { fontSize: 11, color: "#6b7280" },
  joinBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, gap: 6 },
  joinBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  joinedBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: "#00000020" },
  joinedText: { fontSize: 13, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#6b7280", marginTop: 14 },
  emptyHint: { fontSize: 13, color: "#2d3561", marginTop: 4 },
});
