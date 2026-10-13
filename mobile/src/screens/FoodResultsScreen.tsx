import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../config/api';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList, FoodAnalysisResponse, DetectedFood } from '../types';

import { colors } from '../theme/colors';
type RouteProps = RouteProp<RootStackParamList, 'FoodResults'>;

export default function FoodResultsScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { user, updateUser } = useAuth();

  const { analysisResult, imageUri } = route.params;
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPortions, setSelectedPortions] = useState<Record<number, string>>({});

  const {
    detectedFoods,
    totalNutrition,
    healthScore,
    suggestions,
    alternatives,
    confidence,
  } = analysisResult;

  const handleSaveMeal = async () => {
    setIsSaving(true);
    try {
      // Create meal entry
      const mealData = {
        foodName: detectedFoods.map(f => f.name).join(', '),
        calories: totalNutrition.calories,
        protein: totalNutrition.protein,
        carbs: totalNutrition.carbs,
        fat: totalNutrition.fat,
        fiber: totalNutrition.micronutrients?.fiber,
        sugar: totalNutrition.micronutrients?.sugar,
        sodium: totalNutrition.micronutrients?.sodium,
        imageUrl: imageUri,
        confidence: confidence,
        isAIGenerated: true,
        detectedFoods: detectedFoods,
        healthScore: healthScore,
        aiSuggestions: suggestions,
        alternatives: alternatives,
      };

      await api.post('/meals', mealData);

      // Update user XP
      if (user) {
        const newXp = (user.xp || 0) + 5;
        updateUser({ xp: newXp });
        await api.put('/users/profile', { xp: newXp });
      }

      Alert.alert(
        'Meal Logged!',
        'Your meal has been saved. +5 XP earned!',
        [{ text: 'Great!', onPress: () => navigation.navigate('Main' as never) }]
      );
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return colors.success;
    if (score >= 60) return colors.warning;
    if (score >= 40) return colors.accent;
    return colors.danger;
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={14} color={colors.brand} />
          <Text style={styles.aiText}>AI</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Food Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.foodImage} />
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>
              {Math.round(confidence * 100)}% confident
            </Text>
          </View>
        </View>

        {/* Detected Foods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Foods</Text>
          {detectedFoods.map((food: DetectedFood, index: number) => (
            <View key={index} style={styles.foodItem}>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodPortion}>
                  Portion: {food.portion}
                </Text>
              </View>
              <View style={styles.foodConfidence}>
                <Text style={styles.confidenceValue}>
                  {Math.round(food.confidence * 100)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Health Score */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Score</Text>
          <View style={styles.healthScoreCard}>
            <View style={styles.healthScoreCircle}>
              <Text style={[styles.healthScoreValue, { color: getHealthScoreColor(healthScore) }]}>
                {healthScore}
              </Text>
              <Text style={styles.healthScoreMax}>/100</Text>
            </View>
            <View style={styles.healthScoreInfo}>
              <Text style={[styles.healthScoreLabel, { color: getHealthScoreColor(healthScore) }]}>
                {getHealthScoreLabel(healthScore)}
              </Text>
              <Text style={styles.healthScoreDesc}>
                Based on nutritional balance and food quality
              </Text>
            </View>
          </View>
        </View>

        {/* Nutrition Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
          <View style={styles.nutritionGrid}>
            {/* Calories */}
            <View style={[styles.nutritionCard, styles.caloriesCard]}>
              <Ionicons name="flame" size={24} color={colors.accent} />
              <Text style={styles.nutritionValue}>{totalNutrition.calories}</Text>
              <Text style={styles.nutritionLabel}>Calories</Text>
            </View>

            {/* Protein */}
            <View style={[styles.nutritionCard, styles.proteinCard]}>
              <Ionicons name="fish" size={24} color={colors.success} />
              <Text style={styles.nutritionValue}>{totalNutrition.protein}g</Text>
              <Text style={styles.nutritionLabel}>Protein</Text>
            </View>

            {/* Carbs */}
            <View style={[styles.nutritionCard, styles.carbsCard]}>
              <Ionicons name="leaf" size={24} color={colors.warning} />
              <Text style={styles.nutritionValue}>{totalNutrition.carbs}g</Text>
              <Text style={styles.nutritionLabel}>Carbs</Text>
            </View>

            {/* Fat */}
            <View style={[styles.nutritionCard, styles.fatCard]}>
              <Ionicons name="water" size={24} color={colors.brand} />
              <Text style={styles.nutritionValue}>{totalNutrition.fat}g</Text>
              <Text style={styles.nutritionLabel}>Fat</Text>
            </View>
          </View>

          {/* Micronutrients */}
          {totalNutrition.micronutrients && (
            <View style={styles.micronutrients}>
              <Text style={styles.microTitle}>Micronutrients</Text>
              <View style={styles.microGrid}>
                {totalNutrition.micronutrients.fiber !== undefined && (
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>{totalNutrition.micronutrients.fiber}g</Text>
                    <Text style={styles.microLabel}>Fiber</Text>
                  </View>
                )}
                {totalNutrition.micronutrients.sugar !== undefined && (
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>{totalNutrition.micronutrients.sugar}g</Text>
                    <Text style={styles.microLabel}>Sugar</Text>
                  </View>
                )}
                {totalNutrition.micronutrients.sodium !== undefined && (
                  <View style={styles.microItem}>
                    <Text style={styles.microValue}>{totalNutrition.micronutrients.sodium}mg</Text>
                    <Text style={styles.microLabel}>Sodium</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* AI Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Suggestions</Text>
            {suggestions.map((suggestion: string, index: number) => (
              <View key={index} style={styles.suggestionItem}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Healthier Alternatives */}
        {alternatives && alternatives.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Healthier Alternatives</Text>
            {alternatives.map((alt, index) => (
              <View key={index} style={styles.alternativeItem}>
                <View style={styles.alternativeInfo}>
                  <Text style={styles.alternativeName}>{alt.name}</Text>
                  <Text style={styles.alternativeReason}>{alt.reason}</Text>
                </View>
                <Text style={styles.alternativeCalories}>{alt.calories} cal</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveMeal}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              <Text style={styles.saveButtonText}>Log This Meal</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.ink,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 16,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
  },
  foodPortion: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  foodConfidence: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  healthScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  healthScoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  healthScoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  healthScoreMax: {
    fontSize: 12,
    color: colors.faint,
  },
  healthScoreInfo: {
    flex: 1,
  },
  healthScoreLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  healthScoreDesc: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  caloriesCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  proteinCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  carbsCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  fatCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.brand,
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
    marginTop: 8,
  },
  nutritionLabel: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  micronutrients: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  microTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 12,
  },
  microGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  microItem: {
    alignItems: 'center',
  },
  microValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.ink,
  },
  microLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '20',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    lineHeight: 20,
  },
  alternativeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.success,
  },
  alternativeReason: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  alternativeCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    height: 56,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});
