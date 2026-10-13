import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { friendService, Friend, FriendRequest } from "../services/friendService";

import { colors } from '../theme/colors';
const AVATAR_COLORS: readonly [string, string][] = [
  [colors.brand, colors.tealMid],
  [colors.brand, colors.tealMid],
  [colors.accent, colors.accent],
  [colors.warning, colors.warning],
  [colors.danger, colors.danger],
  [colors.info, colors.info],
];

function getColor(name: string): readonly [string, string] {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const gradient = getColor(name);
  return (
    <LinearGradient colors={gradient} style={{ width: size, height: size, borderRadius: size / 2, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: colors.white, fontWeight: "800", fontSize: size * 0.38 }}>{name[0].toUpperCase()}</Text>
    </LinearGradient>
  );
}

type TabKey = "friends" | "requests" | "search";

export default function FriendsScreen({ navigation }: { navigation: any }) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("friends");

  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).finally(() => setLoading(false));
  }, []);

  const loadFriends = async () => {
    try {
      const res = await friendService.getFriends();
      if (res.success) setFriends(res.friends);
    } catch {}
  };

  const loadRequests = async () => {
    try {
      const res = await friendService.getFriendRequests();
      if (res.success) setRequests(res.requests);
    } catch {}
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await friendService.searchUsers(q);
      if (res.success) setSearchResults(res.users);
    } catch {}
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await friendService.sendFriendRequest(userId);
      Alert.alert("Sent!", "Friend request sent 🎉");
      setSearchResults([]);
      setSearchQuery("");
    } catch {
      Alert.alert("Error", "Failed to send request");
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await friendService.acceptFriendRequest(id);
      await Promise.all([loadFriends(), loadRequests()]);
    } catch {
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await friendService.declineFriendRequest(id);
      await loadRequests();
    } catch {}
  };

  const handleRemove = (friendshipId: string, name: string) => {
    Alert.alert("Remove Friend", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await friendService.removeFriend(friendshipId);
          await loadFriends();
        } catch {}
      }},
    ]);
  };

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "friends", label: "Friends", count: friends.length },
    { key: "requests", label: "Requests", count: requests.length },
    { key: "search", label: "Find People" },
  ];

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.bg, colors.bg]} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <ActivityIndicator size="large" color={colors.brand} style={{ marginTop: 40 }} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>Friends</Text>
          {requests.length > 0 && (
            <View style={styles.requestBadge}>
              <Text style={styles.requestBadgeText}>{requests.length}</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.tabActive]} onPress={() => setActiveTab(t.key)} activeOpacity={0.8}>
              {activeTab === t.key && <LinearGradient colors={[colors.brand + '20', colors.brand + '05']} style={[StyleSheet.absoluteFill, { borderRadius: 10 }]} />}
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.label}{t.count !== undefined ? ` (${t.count})` : ""}
              </Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Friends tab */}
        {activeTab === "friends" && (
          <FlatList
            data={friends}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const name = item.displayName || item.email;
              return (
                <View style={styles.friendRow}>
                  <Avatar name={name} size={48} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{name}</Text>
                    <Text style={styles.friendEmail}>{item.email}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(item.friendshipId, name)} style={styles.removeBtn}>
                    <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={56} color={colors.border} />
                <Text style={styles.emptyTitle}>No friends yet</Text>
                <Text style={styles.emptyHint}>Search for people to connect with</Text>
                <TouchableOpacity onPress={() => setActiveTab("search")} style={styles.emptyBtn}>
                  <LinearGradient colors={[colors.brand, colors.tealMid]} style={styles.emptyBtnGrad}>
                    <Text style={styles.emptyBtnText}>Find Friends</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
          />
        )}

        {/* Requests tab */}
        {activeTab === "requests" && (
          <FlatList
            data={requests}
            keyExtractor={i => i.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const name = item.requester.displayName || item.requester.email;
              return (
                <View style={styles.requestRow}>
                  <Avatar name={name} size={50} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{name}</Text>
                    <Text style={styles.friendEmail}>{item.requester.email}</Text>
                    <Text style={styles.requestDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.requestBtns}>
                    <TouchableOpacity onPress={() => handleAccept(item.id)} style={styles.acceptBtn}>
                      <LinearGradient colors={[colors.brand, colors.tealMid]} style={styles.acceptBtnGrad}>
                        <Ionicons name="checkmark" size={16} color={colors.white} />
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDecline(item.id)} style={styles.declineBtn}>
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="mail-outline" size={56} color={colors.border} />
                <Text style={styles.emptyTitle}>No pending requests</Text>
              </View>
            }
          />
        )}

        {/* Search tab */}
        {activeTab === "search" && (
          <View style={{ flex: 1 }}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.faint} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor={colors.faint}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={colors.faint} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={searchResults}
              keyExtractor={i => i._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const name = item.displayName || item.email;
                return (
                  <View style={styles.friendRow}>
                    <Avatar name={name} size={48} />
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{name}</Text>
                      <Text style={styles.friendEmail}>{item.email}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleSendRequest(item._id)} style={styles.addBtn}>
                      <LinearGradient colors={[colors.brand, colors.tealMid]} style={styles.addBtnGrad}>
                        <Ionicons name="person-add" size={15} color={colors.white} />
                        <Text style={styles.addBtnText}>Add</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                searchQuery.length >= 2 ? (
                  <View style={styles.empty}>
                    <Ionicons name="search-outline" size={48} color={colors.border} />
                    <Text style={styles.emptyTitle}>No users found</Text>
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Ionicons name="person-add-outline" size={56} color={colors.border} />
                    <Text style={styles.emptyTitle}>Find People</Text>
                    <Text style={styles.emptyHint}>Type at least 2 characters to search</Text>
                  </View>
                )
              }
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.border, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.5, flex: 1 },
  requestBadge: { backgroundColor: colors.danger, width: 24, height: 24, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  requestBadgeText: { color: colors.white, fontSize: 12, fontWeight: "800" },

  tabBar: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", position: "relative", borderRadius: 10, overflow: "hidden" },
  tabActive: {},
  tabText: { fontSize: 14, color: colors.faint, fontWeight: "500" },
  tabTextActive: { color: colors.brand, fontWeight: "700" },
  tabUnderline: { position: "absolute", bottom: 0, left: "20%", right: "20%", height: 2, backgroundColor: colors.brand, borderRadius: 1 },

  listContent: { paddingHorizontal: 16, paddingBottom: 100 },

  friendRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  requestRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, gap: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  friendEmail: { fontSize: 12, color: colors.faint, marginTop: 2 },
  requestDate: { fontSize: 11, color: colors.border, marginTop: 2 },

  removeBtn: { width: 36, height: 36, backgroundColor: colors.danger + '15', borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.danger + '30' },
  requestBtns: { flexDirection: "row", gap: 8 },
  acceptBtn: {},
  acceptBtnGrad: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  declineBtn: { width: 36, height: 36, backgroundColor: colors.danger + '15', borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.danger + '30' },
  addBtn: {},
  addBtnGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 5 },
  addBtnText: { color: colors.white, fontSize: 13, fontWeight: "700" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15 },

  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.faint, marginTop: 14 },
  emptyHint: { fontSize: 13, color: colors.border, marginTop: 4 },
  emptyBtn: { marginTop: 20 },
  emptyBtnGrad: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { color: colors.white, fontWeight: "700", fontSize: 15 },
});
