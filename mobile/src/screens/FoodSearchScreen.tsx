import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { searchNutrition, saveMeal } from '../services/foodService';
import { NutritionSearchItem } from '../types';

import { colors } from '../theme/colors';
const scaleNutrients = (nutrients: NutritionSearchItem['nutrientsPer100g'], grams: number) => {
  const factor = grams / 100;
  const round = (value: number) => Math.round(value * 10) / 10;

  return {
    calories: round((nutrients.calories || 0) * factor),
    protein: round((nutrients.protein || 0) * factor),
    carbs: round((nutrients.carbs || 0) * factor),
    fat: round((nutrients.fat || 0) * factor),
    fiber: round((nutrients.fiber || 0) * factor),
    sugar: round((nutrients.sugar || 0) * factor),
    sodium: round((nutrients.sodium || 0) * factor),
  };
};

export default function FoodSearchScreen() {
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NutritionSearchItem[]>([]);
  const [selected, setSelected] = useState<NutritionSearchItem | null>(null);
  const [grams, setGrams] = useState('100');
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setSelected(null);
    try {
      const data = await searchNutrition(trimmed, 12);
      setResults(data);
    } catch (error) {
      console.error('Nutrition search error:', error);
      Alert.alert('Search Failed', 'Could not search foods. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: NutritionSearchItem) => {
    setSelected(item);
    setGrams('100');
  };

  const handleSave = async () => {
    if (!selected) return;
    const quantity = Number(grams);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Enter a valid gram amount.');
      return;
    }

    const scaled = scaleNutrients(selected.nutrientsPer100g, quantity);

    setIsSaving(true);
    try {
      await saveMeal({
        foodName: selected.brand ? `${selected.name} (${selected.brand})` : selected.name,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        fiber: scaled.fiber,
        sugar: scaled.sugar,
        sodium: scaled.sodium,
        servingSize: `${quantity} g`,
        mealType,
        isAIGenerated: false,
      });

      Alert.alert('Meal Logged', 'Nutrition has been added to your day.', [
        { text: 'Back to Home', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Save meal error:', error);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: NutritionSearchItem }) => (
    <TouchableOpacity style={styles.resultCard} onPress={() => handleSelect(item)}>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>{item.name}</Text>
        {item.brand ? <Text style={styles.resultBrand}>{item.brand}</Text> : null}
      </View>
      <View style={styles.resultMacros}>
        <Text style={styles.macroText}>{item.nutrientsPer100g.calories} kcal</Text>
        <Text style={styles.macroSub}>per 100g</Text>
      </View>
    </TouchableOpacity>
  );

  const selectedNutrients = selected
    ? scaleNutrients(selected.nutrientsPer100g, Number(grams) || 0)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Search</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search foods (e.g. chicken, rice)"
          placeholderTextColor={colors.faint}
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Searching USDA database...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.fdcId)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Search foods to start tracking.</Text>
          }
        />
      )}

      {selected && (
        <View style={styles.detailSheet}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>{selected.name}</Text>
            <Text style={styles.detailSub}>Adjust serving size</Text>
          </View>
          <View style={styles.quantityRow}>
            <Text style={styles.label}>Quantity (g)</Text>
            <TextInput
              value={grams}
              onChangeText={setGrams}
              keyboardType="numeric"
              style={styles.quantityInput}
            />
          </View>
          <View style={styles.mealTypeRow}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.mealTypePill, mealType === type && styles.mealTypeActive]}
                onPress={() => setMealType(type)}
              >
                <Text style={[styles.mealTypeText, mealType === type && styles.mealTypeTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {selectedNutrients && (
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{selectedNutrients.calories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{selectedNutrients.protein}g</Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{selectedNutrients.carbs}g</Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{selectedNutrients.fat}g</Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.saveButtonText}>Log Meal</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.ink,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.ink,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.muted,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 220,
  },
  emptyText: {
    color: colors.faint,
    textAlign: 'center',
    marginTop: 20,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  resultBrand: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  resultMacros: {
    alignItems: 'flex-end',
  },
  macroText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  macroSub: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  detailSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  detailHeader: {
    marginBottom: 12,
  },
  detailTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  detailSub: {
    color: colors.muted,
    marginTop: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
  },
  quantityInput: {
    width: 90,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    color: colors.ink,
    textAlign: 'center',
  },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mealTypePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  mealTypeActive: {
    backgroundColor: colors.brand,
  },
  mealTypeText: {
    color: colors.muted,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  mealTypeTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  nutritionItem: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  nutritionValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
  },
  nutritionLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
