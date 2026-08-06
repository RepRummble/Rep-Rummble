import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { socialService, SocialPost } from "../services/socialService";
import { useAuth } from "../context/AuthContext";

const { width: SW } = Dimensions.get("window");

const POST_TYPES = [
  { key: "all", label: "All", icon: "apps", color: "#7c3aed" },
  { key: "workout", label: "Workout", icon: "barbell", color: "#22c55e" },
  { key: "meal", label: "Meal", icon: "restaurant", color: "#f97316" },
  { key: "achievement", label: "Win", icon: "trophy", color: "#eab308" },
  { key: "challenge", label: "Challenge", icon: "flash", color: "#ef4444" },
];

const TYPE_META: Record<string, { color: string; icon: string; label: string }> = {
  workout:     { color: "#22c55e", icon: "barbell",    label: "Workout" },
  meal:        { color: "#f97316", icon: "restaurant", label: "Meal" },
  achievement: { color: "#eab308", icon: "trophy",     label: "Achievement" },
  challenge:   { color: "#ef4444", icon: "flash",      label: "Challenge" },
  milestone:   { color: "#a78bfa", icon: "star",       label: "Milestone" },
  general:     { color: "#94a3b8", icon: "chatbubble", label: "Post" },
};

const MOCK_STORIES = [
  { id: "s1", name: "Alex K",  initial: "A", color: ["#7c3aed", "#4f1d9a"] as const, hasStory: true,  streak: 7  },
  { id: "s2", name: "Jordan",  initial: "J", color: ["#22c55e", "#15803d"] as const, hasStory: true,  streak: 14 },
  { id: "s3", name: "Sam R",   initial: "S", color: ["#f97316", "#c2410c"] as const, hasStory: true,  streak: 3  },
  { id: "s4", name: "Taylor",  initial: "T", color: ["#eab308", "#92400e"] as const, hasStory: false, streak: 0  },
  { id: "s5", name: "Morgan",  initial: "M", color: ["#ef4444", "#b91c1c"] as const, hasStory: true,  streak: 21 },
];

const DISCOVER = [
  { id: "d1", title: "Push Up Challenge", desc: "100 reps today",   emoji: "💪", color: "#7c3aed", joined: 847,  left: "18h" },
  { id: "d2", title: "Morning Run Club",  desc: "5km sunrise run",  emoji: "🏃", color: "#22c55e", joined: 234,  left: "6h"  },
  { id: "d3", title: "Protein Goal",      desc: "Hit 150g protein", emoji: "🥩", color: "#f97316", joined: 512,  left: "12h" },
  { id: "d4", title: "Squat PR Day",      desc: "Beat your squat",  emoji: "🏋️", color: "#eab308", joined: 183,  left: "20h" },
];

const SNAP_STICKERS = [
  { emoji: "💪", label: "Crushed it" },
  { emoji: "🔥", label: "On fire"    },
  { emoji: "🏆", label: "New PR"     },
  { emoji: "😤", label: "Beast mode" },
  { emoji: "🥗", label: "Eating clean" },
  { emoji: "😴", label: "Recovery"   },
  { emoji: "🎯", label: "On track"   },
  { emoji: "⚡", label: "Energy"     },
];

const REACTIONS = ["💪", "🔥", "❤️", "🏆", "😤", "🤩"];

const FEELINGS = [
  { emoji: "💪", label: "Motivated"  },
  { emoji: "🔥", label: "On fire"    },
  { emoji: "😤", label: "Beast mode" },
  { emoji: "🎯", label: "Focused"    },
  { emoji: "😄", label: "Happy"      },
  { emoji: "🤩", label: "Excited"    },
  { emoji: "⚡", label: "Energized"  },
  { emoji: "🏆", label: "Winning"    },
  { emoji: "😴", label: "Tired"      },
  { emoji: "😓", label: "Struggling" },
  { emoji: "🧘", label: "Calm"       },
  { emoji: "😅", label: "Exhausted"  },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, size = 40, colors = ["#7c3aed", "#4f1d9a"] as const }: { name: string; size?: number; colors?: readonly [string, string] }) {
  return (
    <LinearGradient colors={colors} style={{ width: size, height: size, borderRadius: size / 2, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.38 }}>{name[0].toUpperCase()}</Text>
    </LinearGradient>
  );
}

function LikeButton({ count, onPress }: { count: number; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [liked, setLiked] = useState(false);

  const handlePress = () => {
    setLiked(l => !l);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 40 }),
      Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 30 }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.actionBtn} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? "#ef4444" : "#94a3b8"} />
      </Animated.View>
      <Text style={[styles.actionCount, liked && { color: "#ef4444" }]}>{count + (liked ? 1 : 0)}</Text>
    </TouchableOpacity>
  );
}

export default function SocialFeedScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputFor, setCommentInputFor] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createContent, setCreateContent] = useState("");
  const [createType, setCreateType] = useState<string>("general");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [createLocation, setCreateLocation] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [createFeeling, setCreateFeeling] = useState<{ emoji: string; label: string } | null>(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);

  // Status / story state
  const [showAddStatus, setShowAddStatus] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusMood, setStatusMood] = useState("");
  const [statusImage, setStatusImage] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<{ text: string; mood: string; image: string | null } | null>(null);
  const [viewingMyStatus, setViewingMyStatus] = useState(false);
  const [viewingStory, setViewingStory] = useState<typeof MOCK_STORIES[0] | null>(null);
  const storyProgress = useRef(new Animated.Value(0)).current;
  const [storyReaction, setStoryReaction] = useState<string | null>(null);
  const reactionScale = useRef(new Animated.Value(1)).current;

  // Quick Snap state
  const [showQuickSnap, setShowQuickSnap] = useState(false);
  const [snapText, setSnapText] = useState("");
  const [snapSticker, setSnapSticker] = useState<string | null>(null);
  const [snapImage, setSnapImage] = useState<string | null>(null);
  const snapFabScale = useRef(new Animated.Value(1)).current;

  // Rep Score (derived from user XP)
  const repScore = (user?.xp || 0) + (user?.streak || 0) * 50;

  useEffect(() => { loadFeed(); }, []);

  useEffect(() => {
    const active = viewingStory || viewingMyStatus;
    if (active) {
      storyProgress.setValue(0);
      Animated.timing(storyProgress, { toValue: 1, duration: 4000, useNativeDriver: false }).start(({ finished }) => {
        if (finished) {
          setViewingStory(null);
          setViewingMyStatus(false);
        }
      });
    } else {
      storyProgress.stopAnimation();
    }
  }, [viewingStory, viewingMyStatus]);

  const loadFeed = async (page = 1) => {
    try {
      const res = await socialService.getFeed({ page, limit: 20 });
      if (res.success) {
        page === 1 ? setPosts(res.posts) : setPosts(p => [...p, ...res.posts]);
      }
    } catch (e) {
      console.error("Error loading feed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
    if (status === "granted") return true;
    if (!canAskAgain) {
      Alert.alert(
        "Camera Access Required",
        "Camera permission was denied. Please enable it in Settings to take photos.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      Alert.alert("Camera Access Required", "Please grant camera permission to take photos.");
    }
    return false;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === "granted") return true;
    if (!canAskAgain) {
      Alert.alert(
        "Photo Library Required",
        "Photo access was denied. Please enable it in Settings to pick photos.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
    } else {
      Alert.alert("Photo Library Required", "Please grant photo library permission.");
    }
    return false;
  };

  const openCamera = async () => {
    if (!(await requestCameraPermission())) return;
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) setSelectedImage(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Camera Error", "Unable to open camera. Please try again.");
    }
  };

  const openGallery = async () => {
    if (!(await requestGalleryPermission())) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [4, 3], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) setSelectedImage(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Gallery Error", "Unable to open photo library. Please try again.");
    }
  };

  const openStatusCamera = async () => {
    if (!(await requestCameraPermission())) return;
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) setStatusImage(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Camera Error", "Unable to open camera. Please try again.");
    }
  };

  const openStatusGallery = async () => {
    if (!(await requestGalleryPermission())) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [9, 16], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) setStatusImage(result.assets[0].uri);
    } catch (e) {
      Alert.alert("Gallery Error", "Unable to open photo library. Please try again.");
    }
  };

  const closeAddStatus = () => {
    setShowAddStatus(false);
    setStatusText('');
    setStatusMood('');
    setStatusImage(null);
  };

  const handleShareStatus = () => {
    if (!statusText.trim() && !statusMood && !statusImage) return;
    setMyStatus({ text: statusText.trim(), mood: statusMood, image: statusImage });
    closeAddStatus();
  };

  const sendReaction = (emoji: string) => {
    setStoryReaction(emoji);
    reactionScale.setValue(0.5);
    Animated.spring(reactionScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 14 }).start();
  };

  const handleQuickSnapPost = () => {
    if (!snapText.trim() && !snapSticker && !snapImage) return;
    const moodLabel = SNAP_STICKERS.find(s => s.emoji === snapSticker)?.label || "";
    setMyStatus({ text: snapText.trim(), mood: moodLabel, image: snapImage });
    setShowQuickSnap(false);
    setSnapText("");
    setSnapSticker(null);
    setSnapImage(null);
  };

  const openSnapCamera = async () => {
    if (!(await requestCameraPermission())) return;
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [9, 16], quality: 0.9 });
      if (!result.canceled && result.assets.length > 0) setSnapImage(result.assets[0].uri);
    } catch { Alert.alert("Camera Error", "Unable to open camera. Please try again."); }
  };

  const openSnapGallery = async () => {
    if (!(await requestGalleryPermission())) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: true, aspect: [9, 16], quality: 0.9 });
      if (!result.canceled && result.assets.length > 0) setSnapImage(result.assets[0].uri);
    } catch { Alert.alert("Gallery Error", "Unable to open gallery. Please try again."); }
  };

  const handleGetLocation = async () => {
    setFetchingLocation(true);
    setShowLocationInput(false);
    setShowFeelingPicker(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable location access in Settings to tag your post.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (place) {
        const label = [place.name, place.city, place.region].filter(Boolean).join(", ");
        setCreateLocation(label || `${loc.coords.latitude.toFixed(3)}, ${loc.coords.longitude.toFixed(3)}`);
      }
    } catch {
      Alert.alert("Error", "Could not fetch location. Try again.");
    } finally {
      setFetchingLocation(false);
    }
  };

  const closeCreate = () => {
    setShowCreate(false);
    setCreateContent("");
    setCreateType("general");
    setSelectedImage(null);
    setCreateLocation("");
    setCreateFeeling(null);
    setShowLocationInput(false);
    setShowFeelingPicker(false);
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await socialService.likePost(postId);
      if (res.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId
            ? { ...p, likes: res.liked ? [...p.likes, user?._id || "me"] : p.likes.filter(id => id !== (user?._id || "me")) }
            : p
        ));
      }
    } catch {}
  };

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return;
    try {
      const res = await socialService.addComment(postId, newComment.trim());
      if (res.success) {
        setPosts(prev => prev.map(p =>
          p._id === postId ? { ...p, comments: [...p.comments, res.comment] } : p
        ));
        setNewComment("");
        setCommentInputFor(null);
      }
    } catch {}
  };

  const handleCreatePost = () => {
    if (!createContent.trim() && !selectedImage) return;

    // Optimistic post — show immediately, sync to server in background
    const optimisticPost: SocialPost = {
      _id: `local_${Date.now()}`,
      author: {
        _id: user?._id || "me",
        displayName: user?.displayName,
        email: user?.email || "",
      },
      postType: createType as SocialPost["postType"],
      content: createContent.trim(),
      mediaUrls: selectedImage ? [selectedImage] : [],
      likes: [],
      comments: [],
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setPosts(p => [optimisticPost, ...p]);
    closeCreate();

    // Background sync — replace optimistic post with real one if server responds
    socialService.createPost({
      content: createContent.trim(),
      postType: createType as any,
      mediaUrls: selectedImage ? [selectedImage] : [],
    }).then(res => {
      if (res.success) {
        const real = selectedImage ? { ...res.post, mediaUrls: [selectedImage] } : res.post;
        setPosts(p => p.map(post => post._id === optimisticPost._id ? real : post));
      }
    }).catch(() => {
      // Server failed — keep the optimistic post locally, no alert needed
    });
  };

  const handleDeletePost = (postId: string) => {
    setPosts(p => p.filter(post => post._id !== postId));
    if (!postId.startsWith("local_")) {
      socialService.deletePost(postId).catch(() => {});
    }
  };

  const handlePostMenu = (post: SocialPost) => {
    const isOwn = post.author._id === user?._id || post._id.startsWith("local_");
    if (isOwn) {
      Alert.alert("Post Options", undefined, [
        {
          text: "Delete Post",
          style: "destructive",
          onPress: () =>
            Alert.alert("Delete post?", "This can't be undone.", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => handleDeletePost(post._id) },
            ]),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } else {
      Alert.alert("Post Options", undefined, [
        { text: "Report Post", style: "destructive", onPress: () => Alert.alert("Reported", "Thanks for your report. We'll review it shortly.") },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const filteredPosts = filter === "all" ? posts : posts.filter(p => p.postType === filter);

  const renderPost = ({ item }: { item: SocialPost }) => {
    const meta = TYPE_META[item.postType] || TYPE_META.general;
    const commentsOpen = expandedComments.has(item._id);
    const authorName = item.author.displayName || item.author.email.split("@")[0];

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.storyRing}>
            <Avatar name={authorName} size={42} />
          </View>
          <View style={styles.postAuthorInfo}>
            <Text style={styles.authorName}>{authorName}</Text>
            <View style={styles.postMeta}>
              <LinearGradient colors={[meta.color + "30", meta.color + "10"]} style={styles.typeBadge}>
                <Ionicons name={meta.icon as any} size={10} color={meta.color} />
                <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
              </LinearGradient>
              <Text style={styles.postTime}>{timeAgo(item.createdAt)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreBtn} onPress={() => handlePostMenu(item)}>
            <Ionicons name="ellipsis-horizontal" size={18} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}

        {/* Media image */}
        {item.mediaUrls && item.mediaUrls.length > 0 && (
          <View style={styles.postImageWrap}>
            <Image
              source={{ uri: item.mediaUrls[0] }}
              style={styles.postImage}
              resizeMode="cover"
            />
            {item.mediaUrls.length > 1 && (
              <View style={styles.moreImagesOverlay}>
                <Ionicons name="images" size={18} color="#fff" />
                <Text style={styles.moreImagesText}>+{item.mediaUrls.length - 1}</Text>
              </View>
            )}
          </View>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag, i) => (
              <TouchableOpacity key={i} style={styles.tagPill}>
                <Text style={styles.tagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.postDivider} />

        {/* Actions */}
        <View style={styles.actionsRow}>
          <LikeButton count={item.likes.length} onPress={() => handleLike(item._id)} />

          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleComments(item._id)} activeOpacity={0.7}>
            <Ionicons name={commentsOpen ? "chatbubble" : "chatbubble-outline"} size={21} color={commentsOpen ? "#7c3aed" : "#94a3b8"} />
            <Text style={[styles.actionCount, commentsOpen && { color: "#7c3aed" }]}>{item.comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Ionicons name="paper-plane-outline" size={21} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { marginLeft: "auto" }]} activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={21} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Comments section */}
        {commentsOpen && (
          <View style={styles.commentsSection}>
            {item.comments.slice(0, 3).map(c => (
              <View key={c._id} style={styles.commentRow}>
                <Avatar name={c.author.displayName || c.author.email} size={28} />
                <View style={styles.commentBubble}>
                  <Text style={styles.commentAuthor}>{c.author.displayName || c.author.email.split("@")[0]}</Text>
                  <Text style={styles.commentText}>{c.content}</Text>
                </View>
              </View>
            ))}
            {item.comments.length === 0 && (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            )}
            {/* Comment input inline */}
            {commentInputFor === item._id ? (
              <View style={styles.inlineInput}>
                <TextInput
                  style={styles.inlineInputField}
                  placeholder="Add a comment..."
                  placeholderTextColor="#6b7280"
                  value={newComment}
                  onChangeText={setNewComment}
                  autoFocus
                />
                <TouchableOpacity onPress={() => handleComment(item._id)} style={styles.sendBtn}>
                  <LinearGradient colors={["#7c3aed", "#4f1d9a"]} style={styles.sendBtnGrad}>
                    <Ionicons name="paper-plane" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setCommentInputFor(item._id)} style={styles.addCommentTap}>
                <Avatar name={user?.displayName || user?.email || "Y"} size={28} />
                <Text style={styles.addCommentPlaceholder}>Add a comment...</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#1a0533", "#0d0f1a", "#080b14"]} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Rep Rummble</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 13 }}>🏆</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#a78bfa" }}>{repScore.toLocaleString()}</Text>
              </View>
              {(user?.streak || 0) > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Text style={{ fontSize: 13 }}>🔥</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#f97316" }}>{user?.streak}d</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate("Friends" as never)} style={styles.headerIcon}>
              <Ionicons name="people-outline" size={24} color="#f1f5f9" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Challenges" as never)} style={styles.headerIcon}>
              <Ionicons name="trophy-outline" size={24} color="#f1f5f9" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.createBtn}>
              <LinearGradient colors={["#7c3aed", "#4f1d9a"]} style={styles.createBtnGrad}>
                <Ionicons name="add" size={22} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={item => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFeed(1); }} tintColor="#7c3aed" />}
          ListHeaderComponent={
            <>
              {/* Stories Bar */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesBar} contentContainerStyle={styles.storiesContent}>
                {/* Your story */}
                <TouchableOpacity
                  style={styles.storyItem}
                  onPress={() => myStatus ? setViewingMyStatus(true) : setShowAddStatus(true)}
                  activeOpacity={0.8}
                >
                  {myStatus ? (
                    <LinearGradient colors={["#7c3aed", "#f97316"]} style={styles.storyRingGrad}>
                      <View style={styles.storyAvatarInner}>
                        <Avatar name={user?.displayName || user?.email || "Y"} size={52} />
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={styles.addStoryWrap}>
                      <Avatar name={user?.displayName || user?.email || "Y"} size={56} />
                      <View style={styles.addStoryPlus}>
                        <Ionicons name="add" size={14} color="#fff" />
                      </View>
                    </View>
                  )}
                  <Text style={styles.storyName} numberOfLines={1}>{myStatus ? "My Status" : "Add Status"}</Text>
                </TouchableOpacity>

                {/* Friend stories */}
                {MOCK_STORIES.map(s => (
                  <TouchableOpacity key={s.id} style={styles.storyItem} onPress={() => s.hasStory && setViewingStory(s)} activeOpacity={0.8}>
                    <View style={{ position: "relative" }}>
                      <LinearGradient
                        colors={s.hasStory ? ["#7c3aed", "#f97316"] : ["#2d3561", "#1e2a4a"]}
                        style={styles.storyRingGrad}
                      >
                        <View style={styles.storyAvatarInner}>
                          <Avatar name={s.name} size={52} colors={s.color} />
                        </View>
                      </LinearGradient>
                      {/* Streak badge */}
                      {s.streak > 0 && (
                        <View style={styles.streakBadge}>
                          <Text style={{ fontSize: 9 }}>🔥</Text>
                          <Text style={styles.streakBadgeText}>{s.streak}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.storyName} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* ── Discover / Daily Challenges ── */}
              <View style={styles.discoverSection}>
                <View style={styles.discoverHeader}>
                  <Text style={styles.discoverTitle}>⚡ Today's Challenges</Text>
                  <TouchableOpacity><Text style={styles.discoverSeeAll}>See all</Text></TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                  {DISCOVER.map(d => (
                    <TouchableOpacity key={d.id} activeOpacity={0.85} style={[styles.discoverCard, { borderColor: d.color + "50" }]}>
                      <LinearGradient colors={[d.color + "25", d.color + "08"]} style={StyleSheet.absoluteFill} />
                      <Text style={{ fontSize: 28, marginBottom: 8 }}>{d.emoji}</Text>
                      <Text style={styles.discoverCardTitle}>{d.title}</Text>
                      <Text style={styles.discoverCardDesc}>{d.desc}</Text>
                      <View style={styles.discoverCardFooter}>
                        <Text style={[styles.discoverCardStat, { color: d.color }]}>👥 {d.joined}</Text>
                        <View style={[styles.discoverTimeTag, { backgroundColor: d.color + "20" }]}>
                          <Text style={[styles.discoverTimeTxt, { color: d.color }]}>{d.left}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Filter Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
                {POST_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setFilter(t.key)}
                    style={[styles.filterTab, filter === t.key && { borderColor: t.color }]}
                    activeOpacity={0.8}
                  >
                    {filter === t.key && (
                      <LinearGradient colors={[t.color + "30", t.color + "10"]} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
                    )}
                    <Ionicons name={t.icon as any} size={14} color={filter === t.key ? t.color : "#6b7280"} />
                    <Text style={[styles.filterTabText, filter === t.key && { color: t.color, fontWeight: "700" }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color="#2d3561" />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyHint}>Share your fitness journey!</Text>
            </View>
          }
        />
      </SafeAreaView>

      {/* ── Quick Snap FAB ── */}
      <Animated.View style={[styles.snapFab, { transform: [{ scale: snapFabScale }] }]}>
        <TouchableOpacity
          onPress={() => setShowQuickSnap(true)}
          onPressIn={() => Animated.spring(snapFabScale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()}
          onPressOut={() => Animated.spring(snapFabScale, { toValue: 1, useNativeDriver: true, speed: 30 }).start()}
          activeOpacity={1}
        >
          <LinearGradient colors={["#7c3aed", "#c026d3", "#f97316"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.snapFabGrad}>
            <Ionicons name="camera" size={26} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Quick Snap Creator Modal ── */}
      <Modal visible={showQuickSnap} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowQuickSnap(false)}>
        <View style={{ flex: 1, backgroundColor: '#050508' }}>
          {snapImage ? (
            <Image source={{ uri: snapImage }} style={StyleSheet.absoluteFill as any} resizeMode="cover" />
          ) : (
            <LinearGradient colors={["#120030", "#0a0015", "#050508"]} style={StyleSheet.absoluteFill} />
          )}
          {/* Dark overlay when image present */}
          {snapImage && <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#00000055' }} />}

          {/* Top: sticker row */}
          <View style={{ position: "absolute", top: 60, left: 0, right: 0, zIndex: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {SNAP_STICKERS.map(st => (
                <TouchableOpacity
                  key={st.emoji}
                  onPress={() => setSnapSticker(snapSticker === st.emoji ? null : st.emoji)}
                  style={{ alignItems: "center", gap: 4 }}
                >
                  <View style={[styles.snapSticker, snapSticker === st.emoji && styles.snapStickerActive]}>
                    <Text style={{ fontSize: 22 }}>{st.emoji}</Text>
                  </View>
                  <Text style={{ fontSize: 9, color: snapSticker === st.emoji ? "#fff" : "#ffffff60", fontWeight: "600" }}>{st.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Close */}
          <TouchableOpacity onPress={() => setShowQuickSnap(false)} style={{ position: "absolute", top: 58, right: 16, zIndex: 20, padding: 8, backgroundColor: "#00000060", borderRadius: 20 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Center text input area */}
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
            {snapSticker && <Text style={{ fontSize: 56, marginBottom: 16 }}>{snapSticker}</Text>}
            <TextInput
              style={styles.snapTextInput}
              placeholder="What's your vibe? ✍️"
              placeholderTextColor="#ffffff50"
              multiline
              maxLength={120}
              value={snapText}
              onChangeText={setSnapText}
              textAlign="center"
            />
          </View>

          {/* Bottom bar */}
          <View style={styles.snapBottomBar}>
            <TouchableOpacity onPress={openSnapGallery} style={styles.snapBottomBtn} activeOpacity={0.8}>
              <LinearGradient colors={["#ffffff15", "#ffffff05"]} style={styles.snapBottomBtnGrad}>
                <Ionicons name="images" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.snapBottomLabel}>Gallery</Text>
            </TouchableOpacity>

            {/* Main post button */}
            <TouchableOpacity onPress={handleQuickSnapPost} activeOpacity={0.85} disabled={!snapText.trim() && !snapSticker && !snapImage}>
              <LinearGradient
                colors={(snapText.trim() || snapSticker || snapImage) ? ["#7c3aed", "#c026d3", "#f97316"] : ["#2d3561", "#1e2a4a"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.snapPostBtn}
              >
                <Ionicons name="paper-plane" size={26} color="#fff" />
              </LinearGradient>
              <Text style={[styles.snapBottomLabel, { textAlign: "center", marginTop: 6 }]}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={openSnapCamera} style={styles.snapBottomBtn} activeOpacity={0.8}>
              <LinearGradient colors={["#ffffff15", "#ffffff05"]} style={styles.snapBottomBtnGrad}>
                <Ionicons name="camera" size={22} color="#fff" />
              </LinearGradient>
              <Text style={styles.snapBottomLabel}>Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── My Status Viewer ── */}
      <Modal visible={viewingMyStatus} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setViewingMyStatus(false)}>
        {myStatus && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <LinearGradient colors={['#2a0954', '#0d0f1a', '#000']} style={StyleSheet.absoluteFill} />
            {/* Progress bar */}
            <View style={{ position: 'absolute', top: 54, left: 16, right: 16, height: 3, backgroundColor: '#ffffff30', borderRadius: 2, zIndex: 10 }}>
              <Animated.View style={{ height: '100%', borderRadius: 2, backgroundColor: '#fff', width: storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            </View>
            {/* Close + Delete */}
            <View style={{ position: 'absolute', top: 60, right: 16, zIndex: 20, flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => { setMyStatus(null); setViewingMyStatus(false); }}
                style={{ padding: 8, backgroundColor: '#ef444430', borderRadius: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setViewingMyStatus(false)} style={{ padding: 8 }}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Content */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
              <Avatar name={user?.displayName || user?.email || "Y"} size={80} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 16, marginBottom: 4 }}>{user?.displayName || user?.email?.split('@')[0] || 'You'}</Text>
              <Text style={{ fontSize: 12, color: '#94a3b880', marginBottom: 32 }}>Just now · visible for 24h</Text>

              {/* Photo */}
              {myStatus.image && (
                <View style={{ width: '100%', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
                  <Image source={{ uri: myStatus.image }} style={{ width: '100%', height: 240 }} resizeMode="cover" />
                </View>
              )}

              {/* Mood pill */}
              {myStatus.mood ? (
                <View style={{ backgroundColor: '#7c3aed25', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9, borderWidth: 1, borderColor: '#7c3aed50', marginBottom: 14 }}>
                  <Text style={{ fontSize: 14, color: '#a78bfa', fontWeight: '700' }}>
                    {[
                      { mood: 'workout', label: '💪 Just worked out' },
                      { mood: 'meal',    label: '🥗 Eating healthy'  },
                      { mood: 'pr',      label: '🏆 New PR!'         },
                      { mood: 'streak',  label: '🔥 On a streak'     },
                      { mood: 'rest',    label: '😴 Rest day'        },
                      { mood: 'cardio',  label: '🏃 Cardio done'     },
                    ].find(m => m.mood === myStatus.mood)?.label || myStatus.mood}
                  </Text>
                </View>
              ) : null}

              {/* Text */}
              {myStatus.text ? (
                <LinearGradient colors={['#ffffff15', '#ffffff08']} style={{ borderRadius: 20, padding: 22, borderWidth: 1, borderColor: '#ffffff20', width: '100%' }}>
                  <Text style={{ fontSize: 16, color: '#fff', textAlign: 'center', lineHeight: 24 }}>{myStatus.text}</Text>
                </LinearGradient>
              ) : null}
            </View>
          </View>
        )}
      </Modal>

      {/* ── Story Viewer Modal ── */}
      <Modal visible={!!viewingStory} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => { setViewingStory(null); setStoryReaction(null); }}>
        {viewingStory && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <LinearGradient colors={['#2a0954', '#0d0f1a', '#000']} style={StyleSheet.absoluteFill} />
            {/* Progress bar */}
            <View style={{ position: 'absolute', top: 54, left: 16, right: 16, height: 3, backgroundColor: '#ffffff30', borderRadius: 2, zIndex: 10 }}>
              <Animated.View style={{ height: '100%', borderRadius: 2, backgroundColor: '#fff', width: storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            </View>
            {/* Close */}
            <TouchableOpacity onPress={() => { setViewingStory(null); setStoryReaction(null); }} style={{ position: 'absolute', top: 60, right: 16, zIndex: 20, padding: 8 }}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            {/* Story content */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
              <LinearGradient colors={viewingStory.color} style={{ width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 3, borderColor: '#fff' }}>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff' }}>{viewingStory.initial}</Text>
              </LinearGradient>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 }}>{viewingStory.name}</Text>
              <Text style={{ fontSize: 13, color: '#94a3b880', marginBottom: 40 }}>2h ago</Text>
              <LinearGradient colors={['#ffffff15', '#ffffff08']} style={{ borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#ffffff20', width: '100%', alignItems: 'center' }}>
                <Ionicons name="barbell" size={32} color="#22c55e" style={{ marginBottom: 14 }} />
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 }}>Just crushed leg day 💪</Text>
                <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 22 }}>4 sets of squats, RDLs, and lunges. New PR on squats — 140kg!</Text>
              </LinearGradient>
            </View>
            {/* Reaction bottom bar */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 44, paddingTop: 12 }}>
              {/* Emoji reactions */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
                {REACTIONS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => sendReaction(emoji)}
                    style={[styles.reactionBtn, storyReaction === emoji && styles.reactionBtnActive]}
                    activeOpacity={0.75}
                  >
                    {storyReaction === emoji ? (
                      <Animated.Text style={{ fontSize: 22, transform: [{ scale: reactionScale }] }}>{emoji}</Animated.Text>
                    ) : (
                      <Text style={{ fontSize: 22 }}>{emoji}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              {/* Reply input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff15', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#ffffff25' }}>
                <Text style={{ flex: 1, color: '#94a3b870', fontSize: 15 }}>Reply to {viewingStory?.name}…</Text>
                <Ionicons name="paper-plane-outline" size={22} color="#7c3aed" />
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* ── Add Status Modal ── */}
      <Modal
        visible={showAddStatus}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddStatus}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <LinearGradient colors={['#1a0533', '#0d0f1a']} style={{ flex: 1 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2d3561' }}>
              <TouchableOpacity onPress={closeAddStatus}>
                <Text style={{ color: '#94a3b8', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Add Status</Text>
              <TouchableOpacity onPress={handleShareStatus} disabled={!statusText.trim() && !statusMood && !statusImage}>
                <LinearGradient colors={(statusText.trim() || statusMood || statusImage) ? ['#7c3aed', '#4f1d9a'] : ['#2d3561', '#1e2a4a']} style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              {/* Quick mood pills */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, marginBottom: 10 }}>QUICK STATUS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {[
                  { label: '💪 Just worked out', mood: 'workout' },
                  { label: '🥗 Eating healthy',  mood: 'meal'    },
                  { label: '🏆 New PR!',          mood: 'pr'      },
                  { label: '🔥 On a streak',      mood: 'streak'  },
                  { label: '😴 Rest day',         mood: 'rest'    },
                  { label: '🏃 Cardio done',      mood: 'cardio'  },
                ].map(item => (
                  <TouchableOpacity
                    key={item.mood}
                    onPress={() => setStatusMood(statusMood === item.mood ? '' : item.mood)}
                    style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: statusMood === item.mood ? '#7c3aed' : '#2d3561', backgroundColor: statusMood === item.mood ? '#7c3aed25' : '#161b2e' }}
                  >
                    <Text style={{ fontSize: 13, color: statusMood === item.mood ? '#a78bfa' : '#94a3b8', fontWeight: '600' }}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Text input */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, marginBottom: 10 }}>YOUR MESSAGE</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#161b2e', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2d3561' }}>
                <Avatar name={user?.displayName || user?.email || "Y"} size={40} />
                <TextInput
                  style={{ flex: 1, color: '#fff', fontSize: 16, lineHeight: 24, minHeight: 80, textAlignVertical: 'top' }}
                  placeholder="What's your fitness vibe today?"
                  placeholderTextColor="#6b7280"
                  multiline
                  maxLength={300}
                  value={statusText}
                  onChangeText={setStatusText}
                />
              </View>
              <Text style={{ textAlign: 'right', color: '#6b7280', fontSize: 12, marginTop: 6, marginBottom: 20 }}>{statusText.length}/300</Text>

              {/* Photo section */}
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 1, marginBottom: 10 }}>ADD PHOTO</Text>

              {/* Image preview */}
              {statusImage ? (
                <View style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                  <Image source={{ uri: statusImage }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => setStatusImage(null)}
                    style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: '#00000099', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff30' }}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={openStatusCamera}
                    activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: '#161b2e', borderRadius: 16, borderWidth: 1, borderColor: '#2d3561', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 8 }}
                  >
                    <LinearGradient colors={['#7c3aed30', '#7c3aed10']} style={{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="camera" size={22} color="#a78bfa" />
                    </LinearGradient>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#a78bfa' }}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openStatusGallery}
                    activeOpacity={0.8}
                    style={{ flex: 1, backgroundColor: '#161b2e', borderRadius: 16, borderWidth: 1, borderColor: '#2d3561', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 26, gap: 8 }}
                  >
                    <LinearGradient colors={['#22c55e30', '#22c55e10']} style={{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="images" size={22} color="#22c55e" />
                    </LinearGradient>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#22c55e' }}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Visibility note */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#7c3aed15', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#7c3aed30' }}>
                <Ionicons name="people-outline" size={18} color="#a78bfa" />
                <Text style={{ flex: 1, fontSize: 13, color: '#94a3b8', lineHeight: 19 }}>Your status is visible to your friends for <Text style={{ color: '#a78bfa', fontWeight: '700' }}>24 hours</Text>.</Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Post Modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeCreate}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <LinearGradient colors={["#1a0533", "#0d0f1a"]} style={styles.createModal}>

            {/* ── Header ── */}
            <View style={styles.createHeader}>
              <TouchableOpacity onPress={closeCreate} style={styles.createCancelBtn}>
                <Text style={styles.createCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.createTitle}>New Post</Text>
              <TouchableOpacity onPress={handleCreatePost} disabled={!createContent.trim() && !selectedImage}>
                <LinearGradient
                  colors={(createContent.trim() || selectedImage) ? ["#7c3aed", "#4f1d9a"] : ["#2d3561", "#1e2a4a"]}
                  style={styles.createPostBtn}
                >
                  <Text style={styles.createPostBtnText}>Share</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ── Post type chips ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typePickerRow}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
            >
              {POST_TYPES.filter(t => t.key !== "all").map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setCreateType(t.key)}
                  style={[styles.typePill, createType === t.key && { borderColor: t.color }]}
                >
                  {createType === t.key && (
                    <LinearGradient colors={[t.color + "40", t.color + "10"]} style={[StyleSheet.absoluteFill, { borderRadius: 18 }]} />
                  )}
                  <Ionicons name={t.icon as any} size={13} color={createType === t.key ? t.color : "#6b7280"} />
                  <Text style={[styles.typePillText, createType === t.key && { color: t.color, fontWeight: "700" }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* ── Composer area ── */}
            <ScrollView
              style={styles.createBody}
              contentContainerStyle={styles.createBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* User row */}
              <View style={styles.createUserRow}>
                <Avatar name={user?.displayName || user?.email || "Y"} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.createUserName}>
                    {user?.displayName || user?.email?.split("@")[0] || "You"}
                  </Text>
                  <Text style={styles.createUserSub}>Sharing with friends</Text>
                </View>
              </View>

              {/* Text input */}
              <TextInput
                style={styles.createInput}
                placeholder="What's your fitness vibe today? 💪"
                placeholderTextColor="#4b5563"
                multiline
                scrollEnabled={false}
                value={createContent}
                onChangeText={setCreateContent}
                maxLength={1000}
              />

              {/* Char count */}
              <Text style={styles.charCount}>{createContent.length}/1000</Text>

              {/* Selected tags row */}
              {(createFeeling || createLocation) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 8 }}>
                  {createFeeling && (
                    <TouchableOpacity
                      onPress={() => setCreateFeeling(null)}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#eab30820", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#eab30840" }}
                    >
                      <Text style={{ fontSize: 14 }}>{createFeeling.emoji}</Text>
                      <Text style={{ fontSize: 12, color: "#eab308", fontWeight: "600" }}>{createFeeling.label}</Text>
                      <Ionicons name="close-circle" size={14} color="#eab30880" />
                    </TouchableOpacity>
                  )}
                  {createLocation !== "" && (
                    <TouchableOpacity
                      onPress={() => { setCreateLocation(""); setShowLocationInput(false); }}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f9731620", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "#f9731640" }}
                    >
                      <Ionicons name="location" size={12} color="#f97316" />
                      <Text style={{ fontSize: 12, color: "#f97316", fontWeight: "600" }} numberOfLines={1}>{createLocation}</Text>
                      <Ionicons name="close-circle" size={14} color="#f9731680" />
                    </TouchableOpacity>
                  )}
                </View>
              )}


              {/* Feeling picker grid */}
              {showFeelingPicker && (
                <View style={{ backgroundColor: "#161b2e", borderRadius: 16, borderWidth: 1, borderColor: "#eab30840", padding: 12, marginBottom: 10 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", letterSpacing: 1, marginBottom: 10 }}>HOW ARE YOU FEELING?</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {FEELINGS.map(f => (
                      <TouchableOpacity
                        key={f.label}
                        onPress={() => { setCreateFeeling(createFeeling?.label === f.label ? null : f); setShowFeelingPicker(false); }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: createFeeling?.label === f.label ? "#eab308" : "#2d3561", backgroundColor: createFeeling?.label === f.label ? "#eab30825" : "#0d0f1a" }}
                      >
                        <Text style={{ fontSize: 15 }}>{f.emoji}</Text>
                        <Text style={{ fontSize: 12, color: createFeeling?.label === f.label ? "#eab308" : "#94a3b8", fontWeight: "600" }}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Image preview */}
              {selectedImage && (
                <View style={styles.previewWrap}>
                  <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.previewRemove} onPress={() => setSelectedImage(null)}>
                    <View style={styles.previewRemoveGrad}>
                      <Ionicons name="close" size={16} color="#fff" />
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* ── Media toolbar ── */}
            <View style={styles.mediaToolbar}>
              <TouchableOpacity style={styles.mediaBtn} onPress={openCamera} activeOpacity={0.75}>
                <View style={[styles.mediaBtnGrad, { backgroundColor: "#7c3aed22" }]}>
                  <Ionicons name="camera" size={20} color="#a78bfa" />
                </View>
                <Text style={styles.mediaBtnLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mediaBtn} onPress={openGallery} activeOpacity={0.75}>
                <View style={[styles.mediaBtnGrad, { backgroundColor: "#22c55e22" }]}>
                  <Ionicons name="images" size={20} color="#22c55e" />
                </View>
                <Text style={styles.mediaBtnLabel}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaBtn}
                activeOpacity={0.75}
                onPress={handleGetLocation}
                disabled={fetchingLocation}
              >
                <View style={[styles.mediaBtnGrad, { backgroundColor: createLocation ? "#f9731640" : "#f9731622", borderWidth: createLocation ? 1 : 0, borderColor: "#f9731660" }]}>
                  {fetchingLocation
                    ? <ActivityIndicator size="small" color="#f97316" />
                    : <Ionicons name="location" size={20} color="#f97316" />}
                </View>
                <Text style={[styles.mediaBtnLabel, createLocation && { color: "#f97316" }]}>
                  {fetchingLocation ? "Getting…" : createLocation ? "Located" : "Location"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaBtn}
                activeOpacity={0.75}
                onPress={() => { setShowFeelingPicker(v => !v); setShowLocationInput(false); }}
              >
                <View style={[styles.mediaBtnGrad, { backgroundColor: showFeelingPicker || createFeeling ? "#eab30840" : "#eab30822", borderWidth: showFeelingPicker || createFeeling ? 1 : 0, borderColor: "#eab30860" }]}>
                  <Text style={{ fontSize: createFeeling ? 20 : 18 }}>{createFeeling ? createFeeling.emoji : "😊"}</Text>
                </View>
                <Text style={[styles.mediaBtnLabel, (showFeelingPicker || createFeeling) && { color: "#eab308" }]}>
                  {createFeeling ? createFeeling.label : "Feeling"}
                </Text>
              </TouchableOpacity>
            </View>

          </LinearGradient>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerIcon: { padding: 8 },
  createBtn: { marginLeft: 4 },
  createBtnGrad: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },

  // Stories
  storiesBar: { borderBottomWidth: 1, borderBottomColor: "#2d356130" },
  storiesContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 16 },
  storyItem: { alignItems: "center", width: 70 },
  storyRingGrad: { width: 62, height: 62, borderRadius: 31, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  storyAvatarInner: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#0d0f1a", overflow: "hidden" },
  addStoryWrap: { width: 62, height: 62, borderRadius: 31, marginBottom: 6, position: "relative", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#2d3561", borderStyle: "dashed" },
  addStoryPlus: { position: "absolute", bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0d0f1a" },
  storyName: { fontSize: 11, color: "#94a3b8", textAlign: "center", fontWeight: "500" },
  storyRing: { marginRight: 10 },

  // Filter
  filterBar: { marginVertical: 10 },
  filterContent: { paddingHorizontal: 16, gap: 8 },
  filterTab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#2d3561", gap: 5, overflow: "hidden" },
  filterTabText: { fontSize: 13, color: "#6b7280", fontWeight: "500" },

  // Post card
  postCard: { backgroundColor: "#161b2e", marginHorizontal: 12, marginBottom: 12, borderRadius: 20, borderWidth: 1, borderColor: "#2d356150", overflow: "hidden" },
  postHeader: { flexDirection: "row", alignItems: "center", padding: 14, paddingBottom: 10 },
  postAuthorInfo: { flex: 1 },
  authorName: { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  postMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  typeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, gap: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  postTime: { fontSize: 12, color: "#6b7280" },
  moreBtn: { padding: 4 },
  postContent: { fontSize: 15, color: "#e2e8f0", lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 14, gap: 6, paddingBottom: 12 },
  tagPill: { backgroundColor: "#7c3aed20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: "#7c3aed40" },
  tagText: { color: "#a78bfa", fontSize: 13, fontWeight: "500" },
  postDivider: { height: 1, backgroundColor: "#2d356140", marginHorizontal: 14 },

  // Actions
  actionsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginRight: 20 },
  actionCount: { fontSize: 14, color: "#94a3b8", fontWeight: "600" },

  // Comments
  commentsSection: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: "#2d356140" },
  commentRow: { flexDirection: "row", gap: 10, marginTop: 10, alignItems: "flex-start" },
  commentBubble: { flex: 1, backgroundColor: "#0d0f1a", borderRadius: 14, padding: 10, borderWidth: 1, borderColor: "#2d356140" },
  commentAuthor: { fontSize: 12, fontWeight: "700", color: "#a78bfa", marginBottom: 2 },
  commentText: { fontSize: 14, color: "#e2e8f0", lineHeight: 20 },
  noCommentsText: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 10 },
  addCommentTap: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  addCommentPlaceholder: { fontSize: 14, color: "#6b7280" },
  inlineInput: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  inlineInputField: { flex: 1, backgroundColor: "#0d0f1a", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#2d3561" },
  sendBtn: {},
  sendBtnGrad: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },

  // Empty
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#6b7280", marginTop: 14 },
  emptyHint: { fontSize: 13, color: "#2d3561", marginTop: 4 },

  // Create modal
  createModal: { flex: 1 },
  createHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#2d356140" },
  createCancelBtn: { minWidth: 60 },
  createCancel: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
  createTitle: { fontSize: 17, fontWeight: "800", color: "#fff" },
  createPostBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20 },
  createPostBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Type chips
  typePickerRow: { height: 52, borderBottomWidth: 1, borderBottomColor: "#2d356130" },
  typePill: { flexDirection: "row", alignItems: "center", height: 34, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, borderColor: "#2d3561", gap: 5, overflow: "hidden" },
  typePillText: { fontSize: 12, color: "#6b7280", fontWeight: "600" },

  // Composer body
  createBody: { flex: 1 },
  createBodyContent: { padding: 16, paddingBottom: 24 },
  createUserRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  createUserName: { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  createUserSub: { fontSize: 12, color: "#4b5563", marginTop: 2 },
  createInput: { fontSize: 17, color: "#fff", lineHeight: 26, textAlignVertical: "top", minHeight: 80 },
  charCount: { textAlign: "right", color: "#374151", fontSize: 12, marginTop: 8, marginBottom: 4 },

  // Post image
  postImageWrap: { marginHorizontal: 0, marginBottom: 0, position: "relative" },
  postImage: { width: "100%", height: SW * 0.65, backgroundColor: "#0d0f1a" },
  moreImagesOverlay: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", backgroundColor: "#00000080", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
  moreImagesText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Image preview
  previewWrap: { marginTop: 12, borderRadius: 16, overflow: "hidden", position: "relative" },
  previewImage: { width: "100%", height: 200, borderRadius: 16 },
  previewRemove: { position: "absolute", top: 10, right: 10 },
  previewRemoveGrad: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#00000090", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ffffff30" },

  // Media toolbar
  mediaToolbar: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 8, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#2d356140" },
  mediaBtn: { alignItems: "center", gap: 5 },
  mediaBtnGrad: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  mediaBtnLabel: { fontSize: 11, color: "#6b7280", fontWeight: "500" },

  // Streak badge on story bubble
  streakBadge: { position: "absolute", bottom: 2, right: 0, flexDirection: "row", alignItems: "center", backgroundColor: "#0d0f1a", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: "#2d3561", gap: 1 },
  streakBadgeText: { fontSize: 9, fontWeight: "800", color: "#f97316" },

  // Discover section
  discoverSection: { paddingTop: 14, paddingBottom: 6 },
  discoverHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  discoverTitle: { fontSize: 14, fontWeight: "800", color: "#f1f5f9" },
  discoverSeeAll: { fontSize: 12, color: "#7c3aed", fontWeight: "700" },
  discoverCard: { width: 148, backgroundColor: "#161b2e", borderRadius: 18, padding: 14, borderWidth: 1, overflow: "hidden" },
  discoverCardTitle: { fontSize: 13, fontWeight: "800", color: "#f1f5f9", marginBottom: 3 },
  discoverCardDesc: { fontSize: 11, color: "#6b7280", marginBottom: 10 },
  discoverCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  discoverCardStat: { fontSize: 11, fontWeight: "700" },
  discoverTimeTag: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  discoverTimeTxt: { fontSize: 10, fontWeight: "700" },

  // Quick Snap FAB
  snapFab: { position: "absolute", bottom: 24, right: 20, zIndex: 50 },
  snapFabGrad: { width: 58, height: 58, borderRadius: 29, justifyContent: "center", alignItems: "center", shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 10 },

  // Quick Snap creator
  snapSticker: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#ffffff15", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ffffff20" },
  snapStickerActive: { backgroundColor: "#7c3aed50", borderColor: "#7c3aed", borderWidth: 2 },
  snapTextInput: { fontSize: 24, fontWeight: "700", color: "#fff", textAlign: "center", width: "100%", minHeight: 80, textShadowColor: "#00000080", textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  snapBottomBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: 32, paddingBottom: 50, paddingTop: 16 },
  snapBottomBtn: { alignItems: "center", gap: 6 },
  snapBottomBtnGrad: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#ffffff20" },
  snapBottomLabel: { fontSize: 11, color: "#ffffff80", fontWeight: "600" },
  snapPostBtn: { width: 68, height: 68, borderRadius: 34, justifyContent: "center", alignItems: "center" },

  // Story reactions
  reactionBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff15", borderWidth: 1, borderColor: "#ffffff20" },
  reactionBtnActive: { backgroundColor: "#7c3aed40", borderColor: "#7c3aed", borderWidth: 2 },
});
