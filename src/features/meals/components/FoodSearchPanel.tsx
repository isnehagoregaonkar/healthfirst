import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload } from '../../../services/meals';
import {
  fetchUsdaFoodDetail,
  scaleUsdaToGrams,
  searchUsdaFoods,
  type UsdaFoodParsed,
  type UsdaSearchHit,
} from '../../../services/usdaFdc';
import { colors } from '../../../theme/tokens';
import { MEAL_PRIMARY } from '../mealUiTheme';
import {
  loadRecentFoods,
  rememberFoodAfterLog,
  recentFoodToPayload,
  type StoredRecentFood,
} from '../mealRecentFoodsStorage';
import { STAPLE_SEARCH_SUGGESTIONS } from '../mealStapleSearchSuggestions';

type FoodSearchPanelProps = Readonly<{
  submitting: boolean;
  onSubmitPayload: (item: LogMealItemPayload) => Promise<string | null>;
}>;

const SEARCH_DEBOUNCE_MS = 450;
const PLACEHOLDER = '#9CA3AF';
const INPUT_BG = '#F3F4F6';

export function FoodSearchPanel({ submitting, onSubmitPayload }: FoodSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [hits, setHits] = useState<UsdaSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [detail, setDetail] = useState<UsdaFoodParsed | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [portionIndex, setPortionIndex] = useState(0);
  const [servingsText, setServingsText] = useState('1');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [recents, setRecents] = useState<StoredRecentFood[]>([]);

  const refreshRecents = useCallback(() => {
    loadRecentFoods()
      .then(setRecents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setSearchError(null);
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    searchUsdaFoods(debounced)
      .then((r) => {
        if (cancelled) {
          return;
        }
        if (r.ok) {
          setHits(r.foods);
        } else {
          setHits([]);
          setSearchError(r.error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSearching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const selectHit = useCallback(async (hit: UsdaSearchHit) => {
    setDetail(null);
    setDetailError(null);
    setPortionIndex(0);
    setServingsText('1');
    setFieldError(null);
    setDetailLoading(true);
    const r = await fetchUsdaFoodDetail(hit.fdcId);
    setDetailLoading(false);
    if (!r.ok) {
      setDetailError(r.error);
      return;
    }
    setDetail(r.food);
    const opts = r.food.portionOptions;
    const idx = opts.findIndex((o) => Math.abs(o.grams - 100) < 0.01);
    setPortionIndex(idx >= 0 ? idx : 0);
  }, []);

  const scaled = (() => {
    if (!detail) {
      return null;
    }
    const opts = detail.portionOptions;
    const p = opts[Math.min(portionIndex, opts.length - 1)] ?? opts[0];
    const sv = Number.parseFloat(servingsText.replace(',', '.'));
    const servings = Number.isFinite(sv) && sv > 0 ? sv : 1;
    const grams = p.grams * servings;
    return { ...scaleUsdaToGrams(detail.per100g, grams), grams, servings, portionLabel: p.label };
  })();

  const handleAddFood = useCallback(async () => {
    if (!detail || !scaled) {
      return;
    }
    setFieldError(null);
    const displayName = detail.brandOwner
      ? `${detail.description} (${detail.brandOwner})`
      : detail.description;
    const qty =
      scaled.servings === 1
        ? scaled.portionLabel
        : `${scaled.servings} × ${scaled.portionLabel}`;
    const payload: LogMealItemPayload = {
      name: displayName,
      quantity: qty,
      calories: Math.round(scaled.kcal),
      usdaFdcId: detail.fdcId,
      proteinG: scaled.protein,
      carbsG: scaled.carbs,
      fatG: scaled.fat,
      fiberG: scaled.fiber > 0 ? scaled.fiber : null,
    };
    const err = await onSubmitPayload(payload);
    if (err) {
      setFieldError(err);
      return;
    }
    rememberFoodAfterLog(payload)
      .then(() => refreshRecents())
      .catch(() => {});
    setQuery('');
    setHits([]);
    setDetail(null);
    setServingsText('1');
  }, [detail, scaled, onSubmitPayload, refreshRecents]);

  const addFromRecent = useCallback(
    async (entry: StoredRecentFood) => {
      if (submitting) {
        return;
      }
      setFieldError(null);
      const payload = recentFoodToPayload(entry);
      const err = await onSubmitPayload(payload);
      if (err) {
        setFieldError(err);
        return;
      }
      rememberFoodAfterLog(payload)
        .then(() => refreshRecents())
        .catch(() => {});
    },
    [onSubmitPayload, submitting, refreshRecents],
  );

  const applyStapleSearch = useCallback(
    (label: (typeof STAPLE_SEARCH_SUGGESTIONS)[number]) => {
      if (submitting || detailLoading) {
        return;
      }
      setDetail(null);
      setDetailError(null);
      setFieldError(null);
      const q = label.trim();
      if (q.length < 2) {
        return;
      }
      setQuery(q);
      setDebounced(q);
    },
    [submitting, detailLoading],
  );

  const showQuickPickChrome = useMemo(
    () => !detail && query.trim().length < 2,
    [detail, query],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Search foods</Text>
      <Text style={styles.hint}>
        Search the food catalog — calories and macros update for your portion.
      </Text>

      <View style={styles.searchRow}>
        <Icon name="magnify" size={22} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search e.g. chicken breast, greek yogurt"
          placeholderTextColor={PLACEHOLDER}
          editable={!submitting}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searching ? <ActivityIndicator style={styles.searchSpinner} color={MEAL_PRIMARY} /> : null}
      </View>

      {showQuickPickChrome ? (
        <View style={styles.quickPickBlock}>
          {recents.length > 0 ? (
            <View style={styles.quickSection}>
              <Text style={styles.quickSectionTitle}>Recently added</Text>
              <View style={styles.chipWrap}>
                {recents.map((r, i) => (
                  <Pressable
                    key={`${r.savedAt}-${r.name}-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Add again ${r.name}`}
                    disabled={submitting}
                    onPress={() => addFromRecent(r).catch(() => {})}
                    style={({ pressed }) => [
                      styles.recentChip,
                      submitting && styles.chipDisabled,
                      pressed && !submitting && styles.chipPressed,
                    ]}
                  >
                    <Text style={styles.recentChipTitle} numberOfLines={2}>
                      {r.name}
                    </Text>
                    <Text style={styles.recentChipMeta} numberOfLines={2}>
                      {r.quantity ? `${r.quantity} · ` : ''}
                      {r.calories} kcal
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.quickSection}>
            <Text style={styles.quickSectionTitle}>Quick searches</Text>
            <View style={styles.chipWrap}>
              {STAPLE_SEARCH_SUGGESTIONS.map((label) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={`Search ${label}`}
                  disabled={submitting || detailLoading}
                  onPress={() => applyStapleSearch(label)}
                  style={({ pressed }) => [
                    styles.stapleChip,
                    (submitting || detailLoading) && styles.chipDisabled,
                    pressed && !submitting && !detailLoading && styles.chipPressed,
                  ]}
                >
                  <Text style={styles.stapleChipText} numberOfLines={2}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {searchError ? (
        <Text style={styles.errorInline}>{searchError}</Text>
      ) : null}

      {hits.length > 0 && !detail ? (
        <View style={styles.resultsBox}>
          <Text style={styles.resultsCaption}>Matches</Text>
          {hits.map((h) => (
            <Pressable
              key={h.fdcId}
              accessibilityRole="button"
              onPress={() => selectHit(h).catch(() => {})}
              disabled={detailLoading || submitting}
              style={({ pressed }) => [styles.hitRow, pressed && styles.hitPressed]}
            >
              <Text style={styles.hitTitle} numberOfLines={2}>
                {h.description}
              </Text>
              {h.brandName ? (
                <Text style={styles.hitBrand} numberOfLines={1}>
                  {h.brandName}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {detailLoading ? (
        <View style={styles.detailLoading}>
          <ActivityIndicator color={MEAL_PRIMARY} />
          <Text style={styles.detailLoadingText}>Loading nutrition…</Text>
        </View>
      ) : null}

      {detailError ? <Text style={styles.errorInline}>{detailError}</Text> : null}

      {detail && scaled ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle} numberOfLines={3}>
            {detail.description}
          </Text>
          {detail.brandOwner ? <Text style={styles.detailBrand}>{detail.brandOwner}</Text> : null}

          <Text style={styles.subLabel}>Portion</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.portionStrip}
          >
            {detail.portionOptions.map((opt, i) => (
              <Pressable
                key={`${opt.label}-${opt.grams}-${i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: portionIndex === i }}
                onPress={() => setPortionIndex(i)}
                style={({ pressed }) => [
                  styles.portionChip,
                  portionIndex === i && styles.portionChipOn,
                  pressed && styles.portionChipPressed,
                ]}
              >
                <Text
                  style={[styles.portionChipText, portionIndex === i && styles.portionChipTextOn]}
                  numberOfLines={2}
                >
                  {opt.label}
                </Text>
                <Text style={styles.portionGrams}>{opt.grams} g</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.subLabel}>Servings of this portion</Text>
          <View style={styles.servingRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease servings"
              onPress={() => {
                const v = Math.max(0.25, (Number.parseFloat(servingsText) || 1) - 0.25);
                setServingsText(String(v));
              }}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <TextInput
              value={servingsText}
              onChangeText={setServingsText}
              keyboardType="decimal-pad"
              style={styles.servingInput}
              editable={!submitting}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase servings"
              onPress={() => {
                const v = (Number.parseFloat(servingsText) || 1) + 0.25;
                setServingsText(String(v));
              }}
              style={styles.stepBtn}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{Math.round(scaled.kcal)}</Text>
              <Text style={styles.macroLbl}>kcal</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.protein.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>protein g</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.carbs.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>carbs g</Text>
            </View>
            <View style={styles.macroCell}>
              <Text style={styles.macroVal}>{scaled.fat.toFixed(1)}</Text>
              <Text style={styles.macroLbl}>fat g</Text>
            </View>
          </View>
          {scaled.fiber > 0.05 ? (
            <Text style={styles.fiberLine}>Fiber {scaled.fiber.toFixed(1)} g · {scaled.grams.toFixed(0)} g total</Text>
          ) : (
            <Text style={styles.fiberLineMuted}>{scaled.grams.toFixed(0)} g total weight</Text>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => handleAddFood().catch(() => {})}
            disabled={submitting}
            style={({ pressed }) => [styles.addUsdaBtn, submitting && styles.addUsdaDisabled, pressed && !submitting && styles.addUsdaPressed]}
          >
            <Icon name="plus" size={20} color={colors.surface} />
            <Text style={styles.addUsdaText}>{submitting ? 'Adding…' : 'Add this food'}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDetail(null);
              setDetailError(null);
            }}
            style={styles.clearPick}
          >
            <Text style={styles.clearPickText}>Choose a different food</Text>
          </Pressable>
        </View>
      ) : null}

      {fieldError ? (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={18} color={colors.error} />
          <Text style={styles.fieldError}>{fieldError}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  quickPickBlock: {
    marginTop: 12,
    marginBottom: 6,
    gap: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickSection: {
    gap: 10,
  },
  quickSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: '46%',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stapleChip: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: '28%',
    paddingHorizontal: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  stapleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 16,
  },
  recentChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 17,
  },
  recentChipMeta: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 15,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 10,
    fontWeight: '500',
  },
  searchSpinner: {
    marginLeft: 8,
  },
  errorInline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.error,
  },
  resultsBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  resultsCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  hitRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  hitPressed: {
    backgroundColor: colors.background,
  },
  hitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  hitBrand: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    justifyContent: 'center',
  },
  detailLoadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  detailBrand: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  subLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portionStrip: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    paddingBottom: 4,
  },
  portionChip: {
    maxWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: INPUT_BG,
  },
  portionChipOn: {
    borderColor: MEAL_PRIMARY,
    backgroundColor: colors.primarySoft,
  },
  portionChipPressed: {
    opacity: 0.9,
  },
  portionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  portionChipTextOn: {
    color: MEAL_PRIMARY,
  },
  portionGrams: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  servingInput: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    color: colors.textPrimary,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 8,
  },
  macroCell: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 0,
    padding: 10,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
  },
  macroVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  macroLbl: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  fiberLine: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  fiberLineMuted: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    opacity: 0.8,
  },
  addUsdaBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addUsdaDisabled: {
    opacity: 0.55,
  },
  addUsdaPressed: {
    opacity: 0.92,
  },
  addUsdaText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
  clearPick: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  clearPickText: {
    fontSize: 14,
    fontWeight: '700',
    color: MEAL_PRIMARY,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  fieldError: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
    lineHeight: 20,
  },
});
