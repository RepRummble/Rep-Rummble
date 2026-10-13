import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { RootStackParamList, FoodAnalysisResponse } from '../types';
import { useSubscription } from '../context/SubscriptionContext';
import { PaywallModal } from './SubscriptionScreen';

import { colors } from '../theme/colors';
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'FoodScanner'>;

export default function FoodScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { canScan, recordScan } = useSubscription();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    if (!canScan()) { setShowPaywall(true); return; }

    recordScan();
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7,
        exif: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        // Analyze the captured image
        await analyzeFood(photo.base64!, photo.uri);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'] as ImagePicker.MediaType[],
        base64: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const image = result.assets[0];
        setCapturedImage(image.uri);
        await analyzeFood(image.base64!, image.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const analyzeFood = async (base64Image: string, imageUri: string) => {
    setIsAnalyzing(true);
    try {
      const response = await api.post<FoodAnalysisResponse>('/ai/analyze-food', {
        imageBase64: base64Image,
        mealType: getMealTypeByTime(),
      });

      if (response.data.success) {
        navigation.replace('FoodResults', {
          analysisResult: response.data.data,
          imageUri: imageUri,
        });
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error: any) {
      console.error('Error analyzing food:', error);
      Alert.alert(
        'Analysis Failed',
        error.response?.data?.message || 'Could not analyze the food. Please try again with a clearer image.',
        [
          { text: 'Retry', onPress: () => setCapturedImage(null) },
          { text: 'Cancel', onPress: () => navigation.goBack() },
        ]
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMealTypeByTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    return 'dinner';
  };

  const toggleFlash = () => {
    setFlashMode(current => current === 'off' ? 'on' : 'off');
  };

  const toggleCamera = () => {
    setFacing(current => current === 'back' ? 'front' : 'back');
  };

  // Permission not granted
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.faint} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan your meals and analyze nutrition.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonAlt}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing state
  if (isAnalyzing && capturedImage) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          <View style={styles.analyzingOverlay}>
            <View style={styles.analyzingContent}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={styles.analyzingTitle}>Analyzing Your Meal</Text>
              <Text style={styles.analyzingText}>
                AI is identifying foods and calculating nutrition...
              </Text>

              {/* Animated scanning effect placeholder */}
              <View style={styles.scanningIndicator}>
                <View style={styles.scanLine} />
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature="Unlimited AI Meal Scans"
        requiredPlan="pro"
      />
      {/* Wrapper so CameraView has no children (SDK 54 requirement) */}
      <View style={styles.camera}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flashMode}
        />

        {/* Top Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.controlButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Meal</Text>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons name={flashMode === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrame}>
          <View style={styles.frameCorner} />
          <View style={[styles.frameCorner, styles.topRight]} />
          <View style={[styles.frameCorner, styles.bottomLeft]} />
          <View style={[styles.frameCorner, styles.bottomRight]} />
          <Text style={styles.frameHint}>Position your meal inside the frame</Text>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.sideButton} onPress={handlePickImage}>
            <Ionicons name="images" size={28} color={colors.white} />
            <Text style={styles.sideButtonText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={isCapturing}>
            <View style={styles.captureButtonInner}>
              {isCapturing
                ? <ActivityIndicator size="small" color={colors.brand} />
                : <Ionicons name="scan" size={32} color={colors.success} />}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sideButton} onPress={toggleCamera}>
            <Ionicons name="camera-reverse" size={28} color={colors.white} />
            <Text style={styles.sideButtonText}>Flip</Text>
          </TouchableOpacity>
        </View>

        {/* Tips */}
        <View style={styles.tips}>
          <View style={styles.tip}>
            <Ionicons name="sunny-outline" size={16} color={colors.muted} />
            <Text style={styles.tipText}>Good lighting helps</Text>
          </View>
          <View style={styles.tip}>
            <Ionicons name="resize-outline" size={16} color={colors.muted} />
            <Text style={styles.tipText}>Show all items clearly</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  camera: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  scanFrame: {
    flex: 1,
    margin: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.brand,
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    top: undefined,
    left: undefined,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 12,
  },
  frameHint: {
    color: colors.white,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sideButton: {
    alignItems: 'center',
    width: 70,
  },
  sideButtonText: {
    color: colors.white,
    fontSize: 12,
    marginTop: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    padding: 4,
  },
  captureButtonInner: {
    flex: 1,
    backgroundColor: colors.brand,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  // Permission styles
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: colors.bg,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.ink,
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingVertical: 12,
  },
  backButtonAltText: {
    color: colors.muted,
    fontSize: 16,
  },
  // Analyzing styles
  analyzingContainer: {
    flex: 1,
    backgroundColor: colors.black,
  },
  previewImage: {
    flex: 1,
    resizeMode: 'cover',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  analyzingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: 24,
    marginBottom: 8,
  },
  analyzingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  scanningIndicator: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 32,
    overflow: 'hidden',
  },
  scanLine: {
    width: '30%',
    height: '100%',
    backgroundColor: colors.brand,
    borderRadius: 2,
  },
});
