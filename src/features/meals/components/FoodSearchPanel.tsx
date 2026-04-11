import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { LogMealItemPayload } from '../../../services/meals';
import {
  fetchUsdaFoodDetail,
  sanitizeLoggedQuantityLabel,
  searchUsdaFoods,
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
import {
  formatFoodValueDisplayName,
  searchFoodValues,
  type FoodValueEntry,
} from '../foodValuesCatalog';
import { computeScaledFromDetail, mealDetailPortionOptions, type MealFoodDetailState } from '../mealFoodDetailState';
import { FoodPortionMacrosBlock } from './FoodPortionMacrosBlock';

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

  const [detail, setDetail] = useState<MealFoodDetailState | null>(null);
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

  const localHits = useMemo(() => searchFoodValues(debounced), [debounced]);

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
    setDetail({ kind: 'usda', food: r.food });
    const opts = r.food.portionOptions;
    const idx = opts.findIndex((o) => Math.abs(o.grams - 100) < 0.01);
    setPortionIndex(idx >= 0 ? idx : 0);
  }, []);

  const selectLocalEntry = useCallback((entry: FoodValueEntry) => {
    if (submitting || detailLoading) {
      return;
    }
    setDetailError(null);
    setFieldError(null);
    setDetail({ kind: 'local', entry });
    setPortionIndex(0);
    setServingsText('1');
  }, [submitting, detailLoading]);

  const scaled = useMemo(
    () => (detail ? computeScaledFromDetail(detail, portionIndex, servingsText) : null),
    [detail, portionIndex, servingsText],
  );

  const handleAddFood = useCallback(async () => {
    if (!detail || !scaled) {
      return;
    }
    setFieldError(null);
    const displayName =
      detail.kind === 'usda'
        ? detail.food.brandOwner
          ? `${detail.food.description} (${detail.food.brandOwner})`
          : detail.food.description
        : formatFoodValueDisplayName(detail.entry);
    const qtyRaw =
      scaled.servings === 1
        ? scaled.portionLabel
        : `${scaled.servings} × ${scaled.portionLabel}`;
    const qty = sanitizeLoggedQuantityLabel(qtyRaw);
    const payload: LogMealItemPayload = {
      name: displayName,
      quantity: qty,
      calories: Math.round(scaled.kcal),
      usdaFdcId: detail.kind === 'usda' ? detail.food.fdcId : null,
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
              <View style={styles.recentChipColumn}>
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
                      {r.quantity ? `${sanitizeLoggedQuantityLabel(r.quantity)} · ` : ''}
                      {r.calories} kcal
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.quickSection}>
            <Text style={styles.quickSectionTitle}>Quick searches</Text>
            <View style={styles.stapleWrap}>
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
                  <Text style={styles.stapleChipText} numberOfLines={1}>
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

      {(localHits.length > 0 || hits.length > 0) && !detail ? (
        <View style={styles.resultsBox}>
          {localHits.length > 0 ? (
            <>
              <Text style={styles.resultsCaption}>Common dishes</Text>
              {localHits.map((entry) => (
                <Pressable
                  key={`local-${entry.name}`}
                  accessibilityRole="button"
                  onPress={() => selectLocalEntry(entry)}
                  disabled={detailLoading || submitting}
                  style={({ pressed }) => [styles.hitRow, pressed && styles.hitPressed]}
                >
                  <Text style={styles.hitTitle} numberOfLines={2}>
                    {formatFoodValueDisplayName(entry)}
                  </Text>
                  <Text style={styles.hitBrand} numberOfLines={1}>
                    {entry.category} · local guide
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}
          {hits.length > 0 ? (
            <>
              <Text
                style={[
                  styles.resultsCaption,
                  localHits.length > 0 ? styles.resultsCaptionSpaced : null,
                ]}
              >
                {localHits.length > 0 ? 'USDA catalog' : 'Matches'}
              </Text>
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
            </>
          ) : null}
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
        <FoodPortionMacrosBlock
          title={
            detail.kind === 'usda'
              ? detail.food.description
              : formatFoodValueDisplayName(detail.entry)
          }
          subtitle={
            detail.kind === 'usda' && detail.food.brandOwner
              ? detail.food.brandOwner
              : detail.kind === 'local'
                ? `${detail.entry.category} · from food-values guide`
                : null
          }
          portionOptions={mealDetailPortionOptions(detail)}
          portionIndex={portionIndex}
          onPortionIndex={setPortionIndex}
          servingsText={servingsText}
          onServingsText={setServingsText}
          scaled={scaled}
          submitting={submitting}
          primaryLabel={submitting ? 'Adding…' : 'Add this food'}
          primaryIcon="plus"
          onPrimary={() => handleAddFood().catch(() => {})}
          secondaryLabel="Choose a different food"
          onSecondary={() => {
            setDetail(null);
            setDetailError(null);
          }}
        />
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
  recentChipColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  recentChip: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stapleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  stapleChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stapleChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
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
  resultsCaptionSpaced: {
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
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
