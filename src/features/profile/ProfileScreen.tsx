import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { AppLoadingSpinner } from '../../components/feedback/AppLoadingSpinner';
import { Screen, SCREEN_HORIZONTAL_PADDING } from '../../components/layout/Screen';
import { updateAuthDisplayName } from '../../services/auth';
import {
  loadMealCalorieProfile,
  type MealCalorieProfile,
  type MealCalorieSex,
  saveMealCalorieProfile,
} from '../../services/mealCalorieTarget';
import { supabase } from '../../services/supabase';
import {
  clearPersistedAvatar,
  getPersistedAvatarUri,
  persistAvatarFromBase64,
} from '../../services/userAvatar';
import { colors } from '../../theme/tokens';
import { MEAL_PRIMARY } from '../meals/mealUiTheme';
import { HEALTHFIRST_AVATAR_CHANGED } from './profileAvatarEvents';

const INPUT_BG = '#F3F4F6';

const PICK_OPTIONS = {
  mediaType: 'photo' as const,
  quality: 0.8 as const,
  maxWidth: 1200,
  maxHeight: 1200,
  includeBase64: true,
};

export function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [savedGoalKg, setSavedGoalKg] = useState(70);
  const [heightCm, setHeightCm] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<MealCalorieSex>('female');

  const refreshAvatar = useCallback(async () => {
    const uri = await getPersistedAvatarUri();
    setAvatarUri(uri);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const [profile, avatar, auth] = await Promise.all([
          loadMealCalorieProfile(),
          getPersistedAvatarUri(),
          supabase.auth.getUser(),
        ]);
        if (!alive) {
          return;
        }
        setAvatarUri(avatar);
        setWeightKg(String(profile.weightKg));
        setSavedGoalKg(profile.goalWeightKg);
        setHeightCm(String(profile.heightCm));
        setAge(String(profile.age));
        setSex(profile.sex);
        const user = auth.data.user;
        const em = user?.email ?? '';
        setEmail(em);
        const metaName = user?.user_metadata?.name;
        const name =
          typeof metaName === 'string' && metaName.trim().length > 0
            ? metaName.trim()
            : em.split('@')[0] || '';
        setDisplayName(name);
        setInitialDisplayName(name);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const openPhotoActions = useCallback(() => {
    const hasPhoto = avatarUri != null;
    Alert.alert('Profile photo', 'Choose a photo or remove your current one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Photo library',
        onPress: () => {
          void (async () => {
            try {
              setAvatarBusy(true);
              const result = await launchImageLibrary(PICK_OPTIONS);
              const asset = result.assets?.[0];
              if (result.didCancel || !asset) {
                if (result.errorMessage) {
                  Alert.alert('Photos', result.errorMessage);
                }
                return;
              }
              if (!asset.base64) {
                Alert.alert('Photos', 'Could not read this image. Try another photo.');
                return;
              }
              const mime =
                asset.type && asset.type.startsWith('image/') ? asset.type : 'image/jpeg';
              await persistAvatarFromBase64(asset.base64, mime);
              await refreshAvatar();
              DeviceEventEmitter.emit(HEALTHFIRST_AVATAR_CHANGED);
            } catch (e) {
              Alert.alert(
                'Photos',
                e instanceof Error ? e.message : 'Could not save this photo.',
              );
            } finally {
              setAvatarBusy(false);
            }
          })();
        },
      },
      {
        text: 'Take photo',
        onPress: () => {
          void (async () => {
            if (Platform.OS === 'android') {
              const perm = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.CAMERA,
              );
              if (perm !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert('Camera', 'Camera permission is needed to take a photo.');
                return;
              }
            }
            try {
              setAvatarBusy(true);
              const result = await launchCamera({
                ...PICK_OPTIONS,
                saveToPhotos: false,
              });
              const asset = result.assets?.[0];
              if (result.didCancel || !asset) {
                if (result.errorMessage) {
                  Alert.alert('Camera', result.errorMessage);
                }
                return;
              }
              if (!asset.base64) {
                Alert.alert('Camera', 'Could not read this photo. Try again.');
                return;
              }
              const mime =
                asset.type && asset.type.startsWith('image/') ? asset.type : 'image/jpeg';
              await persistAvatarFromBase64(asset.base64, mime);
              await refreshAvatar();
              DeviceEventEmitter.emit(HEALTHFIRST_AVATAR_CHANGED);
            } catch (e) {
              Alert.alert(
                'Camera',
                e instanceof Error ? e.message : 'Could not use the camera.',
              );
            } finally {
              setAvatarBusy(false);
            }
          })();
        },
      },
      ...(hasPhoto
        ? [
            {
              text: 'Remove photo',
              style: 'destructive' as const,
              onPress: () => {
                void (async () => {
                  try {
                    setAvatarBusy(true);
                    await clearPersistedAvatar();
                    setAvatarUri(null);
                    DeviceEventEmitter.emit(HEALTHFIRST_AVATAR_CHANGED);
                  } catch (e) {
                    Alert.alert(
                      'Photos',
                      e instanceof Error ? e.message : 'Could not remove the photo.',
                    );
                  } finally {
                    setAvatarBusy(false);
                  }
                })();
              },
            },
          ]
        : []),
    ]);
  }, [avatarUri, refreshAvatar]);

  const handleSave = useCallback(async () => {
    const w = Number.parseFloat(weightKg.replace(',', '.'));
    const h = Number.parseFloat(heightCm.replace(',', '.'));
    const a = Number.parseInt(age.replace(/\s/g, ''), 10);
    if (!Number.isFinite(w) || w < 30 || w > 300) {
      Alert.alert('Check weight', 'Enter current weight between 30 and 300 kg.');
      return;
    }
    if (!Number.isFinite(h) || h < 120 || h > 230) {
      Alert.alert('Check height', 'Enter height between 120 and 230 cm.');
      return;
    }
    if (!Number.isFinite(a) || a < 14 || a > 100) {
      Alert.alert('Check age', 'Enter age between 14 and 100.');
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const nextBody: MealCalorieProfile = {
        weightKg: w,
        goalWeightKg: savedGoalKg,
        heightCm: h,
        age: a,
        sex,
      };
      await saveMealCalorieProfile(nextBody);

      if (displayName.trim() !== initialDisplayName.trim()) {
        const nameResult = await updateAuthDisplayName(displayName);
        if (!nameResult.ok) {
          Alert.alert('Display name', nameResult.message);
          return;
        }
        setInitialDisplayName(displayName.trim());
      }
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (e) {
      Alert.alert(
        'Could not sync',
        e instanceof Error ? e.message : 'Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    weightKg,
    savedGoalKg,
    heightCm,
    age,
    sex,
    displayName,
    initialDisplayName,
  ]);

  if (loading) {
    return (
      <Screen applyTopSafeArea={false}>
        <View style={styles.centered}>
          <AppLoadingSpinner title="Loading profile…" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen applyTopSafeArea={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Photo</Text>
          <View style={styles.avatarBlock}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              onPress={openPhotoActions}
              disabled={avatarBusy}
              style={({ pressed }) => [
                styles.avatarRing,
                pressed && styles.avatarPressed,
                avatarBusy && styles.avatarDisabled,
              ]}
            >
              {avatarUri ? (
                <Image
                  key={avatarUri}
                  source={{ uri: avatarUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="account" size={44} color={colors.primary} />
                </View>
              )}
              {avatarBusy ? (
                <View style={styles.avatarSpinner}>
                  <AppLoadingSpinner title="Uploading…" compact color={colors.surface} />
                </View>
              ) : null}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={openPhotoActions}
              disabled={avatarBusy}
              style={({ pressed }) => [styles.linkBtn, pressed && styles.linkBtnPressed]}
            >
              <Text style={styles.linkBtnText}>
                {avatarUri ? 'Change or remove photo' : 'Add profile photo'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Account</Text>
          <Text style={styles.fieldLabel}>Display name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.emailReadonly}>{email || '—'}</Text>

          <Text style={styles.sectionLabel}>Body and goals</Text>
          <Text style={styles.blurb}>
            Used for calorie estimates (Mifflin–St Jeor). Not medical advice.
          </Text>

          <Text style={styles.fieldLabel}>Current weight (kg)</Text>
          <TextInput
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="decimal-pad"
            placeholder="72"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.fieldLabel}>Height (cm)</Text>
          <TextInput
            value={heightCm}
            onChangeText={setHeightCm}
            keyboardType="decimal-pad"
            placeholder="170"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.fieldLabel}>Age</Text>
          <TextInput
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="32"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.fieldLabel}>Sex (for BMR)</Text>
          <View style={styles.sexRow}>
            {(['female', 'male'] as const).map(s => (
              <Pressable
                key={s}
                accessibilityRole="button"
                accessibilityState={{ selected: sex === s }}
                onPress={() => setSex(s)}
                style={({ pressed }) => [
                  styles.seg,
                  sex === s && styles.segOn,
                  pressed && styles.segPressed,
                ]}
              >
                <Text style={[styles.segText, sex === s && styles.segTextOn]}>
                  {s === 'female' ? 'Female' : 'Male'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => handleSave().catch(() => {})}
            style={({ pressed }) => [
              styles.saveBtn,
              saving && styles.saveDisabled,
              pressed && !saving && styles.savePressed,
            ]}
          >
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const AVATAR_SIZE = 104;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  avatarPressed: {
    opacity: 0.92,
  },
  avatarDisabled: {
    opacity: 0.7,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSpinner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  linkBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkBtnPressed: {
    opacity: 0.75,
  },
  linkBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 12,
    marginBottom: 6,
  },
  blurb: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 4,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emailReadonly: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sexRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  seg: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  segOn: {
    borderColor: MEAL_PRIMARY,
    backgroundColor: colors.primarySoft,
  },
  segPressed: {
    opacity: 0.9,
  },
  segText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  segTextOn: {
    color: MEAL_PRIMARY,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: MEAL_PRIMARY,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveDisabled: {
    opacity: 0.55,
  },
  savePressed: {
    opacity: 0.92,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.surface,
  },
});
