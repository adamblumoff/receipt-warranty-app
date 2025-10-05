import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerSelection, triggerImpactLight, triggerNotificationSuccess } from '../utils/haptics';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuid } from 'uuid';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useBenefits } from '../providers/BenefitsProvider';
import {
  SURFACE_COLOR,
  CANVAS_COLOR,
  TEXT_PRIMARY,
  TEXT_MUTED,
  TEXT_ACCENT,
  TEXT_WARNING,
} from '../theme/colors';
import type { BenefitType, VisionAnalysisResult } from '@receipt-warranty/shared';
const logTiming = (label: string, start: number): void => {
  const duration = Date.now() - start;
  console.log(`⏱️ ${label}: ${duration}ms`);
};

const logEvent = (label: string, context?: Record<string, unknown>): void => {
  if (context) {
    console.log(`[${label}]`, context);
  } else {
    console.log(`[${label}]`);
  }
};

type AddBenefitRouteParams = NonNullable<RootStackParamList['AddBenefit']>;

const EMPTY_COUPON = {
  merchant: '',
  description: '',
  expiresOn: '',
  terms: '',
};

const EMPTY_WARRANTY = {
  productName: '',
  merchant: '',
  purchaseDate: '',
  coverageEndsOn: '',
  coverageNotes: '',
};

const toDisplayDate = (iso: string): Date | null => {
  if (!iso) {
    return null;
  }
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
};

const toUtcMiddayIso = (date: Date): string =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)).toISOString();

const formatReadableDate = (iso?: string): string => {
  if (!iso) {
    return 'Select date';
  }
  const date = toDisplayDate(iso);
  if (!date) {
    return 'Select date';
  }
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    if (error instanceof RangeError) {
      return 'Select date';
    }
    throw error;
  }
};

const AddBenefitScreen = (): React.ReactElement => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBenefit'>>();
  const routeParams = useMemo<AddBenefitRouteParams>(() => route.params ?? {}, [route.params]);
  const { addCoupon, addWarranty, analyzeBenefitImage } = useBenefits();

  const [mode, setMode] = useState<BenefitType>(() => routeParams.initialMode ?? 'coupon');
  const autoScanHandledRef = useRef(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [warrantyForm, setWarrantyForm] = useState(EMPTY_WARRANTY);
  const [couponErrors, setCouponErrors] = useState<
    Partial<Record<keyof typeof EMPTY_COUPON, string>>
  >({});
  const [warrantyErrors, setWarrantyErrors] = useState<
    Partial<Record<keyof typeof EMPTY_WARRANTY, string>>
  >({});
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponDatePickerVisible, setCouponDatePickerVisible] = useState(false);
  const [couponDateDraft, setCouponDateDraft] = useState<Date>(new Date());
  const [warrantyPurchasePickerVisible, setWarrantyPurchasePickerVisible] = useState(false);
  const [warrantyPurchaseDraft, setWarrantyPurchaseDraft] = useState<Date>(new Date());
  const [warrantyCoveragePickerVisible, setWarrantyCoveragePickerVisible] = useState(false);
  const [warrantyCoverageDraft, setWarrantyCoverageDraft] = useState<Date>(new Date());

  const validateCoupon = useCallback(() => {
    const nextErrors: typeof couponErrors = {};
    if (!couponForm.merchant.trim()) nextErrors.merchant = 'Merchant is required for coupons.';
    if (!couponForm.description.trim()) nextErrors.description = 'Add a short description.';
    if (!couponForm.expiresOn) nextErrors.expiresOn = 'Select the expiration date.';
    setCouponErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [couponForm]);

  const validateWarranty = useCallback(() => {
    const nextErrors: typeof warrantyErrors = {};
    if (!warrantyForm.productName.trim()) nextErrors.productName = 'Product name is required.';
    if (!warrantyForm.merchant.trim()) nextErrors.merchant = 'Merchant is required.';
    if (!warrantyForm.purchaseDate) nextErrors.purchaseDate = 'Add the purchase date.';
    if (!warrantyForm.coverageEndsOn) nextErrors.coverageEndsOn = 'Add when coverage ends.';
    setWarrantyErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [warrantyForm]);

  const handleModeChange = useCallback((nextMode: BenefitType) => {
    triggerSelection();
    setMode(nextMode);
    setCouponErrors({});
    setWarrantyErrors({});
  }, []);

  useEffect(() => {
    if (routeParams.initialMode) {
      setMode(routeParams.initialMode);
    }
  }, [routeParams.initialMode]);

  useEffect(() => {
    if (autoScanHandledRef.current) {
      return;
    }
    if (routeParams.autoScanSource) {
      autoScanHandledRef.current = true;
      const timer = setTimeout(() => {
        void handleAnalyzeImage(routeParams.autoScanSource ?? 'library');
      }, 250);
      return () => clearTimeout(timer);
    }
    autoScanHandledRef.current = true;
  }, [routeParams.autoScanSource, handleAnalyzeImage]);

  useEffect(() => {
    if (couponForm.expiresOn) {
      const parsed = new Date(couponForm.expiresOn);
      if (!Number.isNaN(parsed.getTime())) {
        setCouponDateDraft(parsed);
      }
    }
  }, [couponForm.expiresOn]);

  useEffect(() => {
    if (warrantyForm.purchaseDate) {
      const parsed = new Date(warrantyForm.purchaseDate);
      if (!Number.isNaN(parsed.getTime())) {
        setWarrantyPurchaseDraft(parsed);
      }
    }
  }, [warrantyForm.purchaseDate]);

  useEffect(() => {
    if (warrantyForm.coverageEndsOn) {
      const parsed = new Date(warrantyForm.coverageEndsOn);
      if (!Number.isNaN(parsed.getTime())) {
        setWarrantyCoverageDraft(parsed);
      }
    }
  }, [warrantyForm.coverageEndsOn]);

  const couponExpiryDisplay = useMemo(
    () => formatReadableDate(couponForm.expiresOn),
    [couponForm.expiresOn],
  );
  const warrantyPurchaseDisplay = useMemo(
    () => formatReadableDate(warrantyForm.purchaseDate),
    [warrantyForm.purchaseDate],
  );
  const warrantyCoverageDisplay = useMemo(
    () => formatReadableDate(warrantyForm.coverageEndsOn),
    [warrantyForm.coverageEndsOn],
  );

  const openDatePicker = (
    currentIso: string,
    setDraft: React.Dispatch<React.SetStateAction<Date>>,
    setVisible: React.Dispatch<React.SetStateAction<boolean>>,
    onConfirm: (selected: Date) => void,
  ) => {
    const initial = currentIso ? new Date(currentIso) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (_event: DateTimePickerEvent, selectedDate?: Date) => {
          if (selectedDate) {
            onConfirm(selectedDate);
          }
        },
      });
    } else {
      setDraft(initial);
      setVisible(true);
    }
  };

  const openCouponDatePicker = () => {
    triggerSelection();
    openDatePicker(couponForm.expiresOn, setCouponDateDraft, setCouponDatePickerVisible, (date) => {
      setCouponForm((prev) => ({
        ...prev,
        expiresOn: toUtcMiddayIso(date),
      }));
      setCouponErrors((prev) => ({ ...prev, expiresOn: undefined }));
    });
  };

  const openWarrantyPurchasePicker = () => {
    triggerSelection();
    openDatePicker(
      warrantyForm.purchaseDate,
      setWarrantyPurchaseDraft,
      setWarrantyPurchasePickerVisible,
      (date) => {
        setWarrantyForm((prev) => ({
          ...prev,
          purchaseDate: toUtcMiddayIso(date),
        }));
        setWarrantyErrors((prev) => ({ ...prev, purchaseDate: undefined }));
      },
    );
  };

  const openWarrantyCoveragePicker = () => {
    triggerSelection();
    openDatePicker(
      warrantyForm.coverageEndsOn,
      setWarrantyCoverageDraft,
      setWarrantyCoveragePickerVisible,
      (date) => {
        setWarrantyForm((prev) => ({
          ...prev,
          coverageEndsOn: toUtcMiddayIso(date),
        }));
        setWarrantyErrors((prev) => ({ ...prev, coverageEndsOn: undefined }));
      },
    );
  };

  const handleIosCouponDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setCouponDateDraft(selectedDate);
    }
  };

  const confirmCouponDate = () => {
    setCouponForm((prev) => ({
      ...prev,
      expiresOn: toUtcMiddayIso(couponDateDraft),
    }));
    setCouponDatePickerVisible(false);
  };

  const cancelCouponDate = () => {
    setCouponDatePickerVisible(false);
  };

  const handleAnalyzeImage = useCallback(
    async (source: 'library' | 'camera') => {
      triggerImpactLight();
      if (source === 'library') {
        const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          Alert.alert('Permission required', 'Media library access is needed to scan an image.');
          return;
        }
      } else {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          Alert.alert('Permission required', 'Camera access is needed to capture an image.');
          return;
        }
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: 'images',
        quality: 0.8,
      };

      const overallStart = Date.now();
      logEvent('vision:start', { source });

      const pickerStart = Date.now();
      const pickerResult =
        source === 'library'
          ? await ImagePicker.launchImageLibraryAsync(pickerOptions)
          : await ImagePicker.launchCameraAsync(pickerOptions);
      logTiming('picker', pickerStart);

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      const asset = pickerResult.assets[0];
      let workingUri = asset.uri;
      let mimeType = asset.mimeType ?? 'image/jpeg';

      try {
        const transcodeStart = Date.now();
        const maxDimension = 900;
        const actions: ImageManipulator.Action[] = [];
        if (asset.width && asset.height) {
          const longestEdge = Math.max(asset.width, asset.height);
          if (longestEdge > maxDimension) {
            const scale = maxDimension / longestEdge;
            actions.push({
              resize: {
                width: Math.round(asset.width * scale),
                height: Math.round(asset.height * scale),
              },
            });
          }
        }
        const manipulated = await ImageManipulator.manipulateAsync(asset.uri, actions, {
          compress: 0.4,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        workingUri = manipulated.uri;
        mimeType = 'image/jpeg';
        logTiming('transcode', transcodeStart);
        const info = await FileSystem.getInfoAsync(workingUri);
        logEvent('vision:transcoded', {
          uri: workingUri,
          width: manipulated.width,
          height: manipulated.height,
          size: info.exists ? info.size : undefined,
        });
      } catch (manipulationError) {
        console.warn('Image manipulation skipped', manipulationError);
      }

      const applyAnalysis = (result: VisionAnalysisResult) => {
        setAnalysis(result);
        if (mode === 'coupon') {
          setCouponForm((prev) => ({
            merchant: result.fields.merchant?.value ?? prev.merchant,
            description: result.fields.description?.value ?? prev.description,
            expiresOn: result.fields.expiresOn?.value ?? prev.expiresOn,
            terms: prev.terms,
          }));
        } else {
          setWarrantyForm((prev) => ({
            productName: result.fields.productName?.value ?? prev.productName,
            merchant: result.fields.merchant?.value ?? prev.merchant,
            purchaseDate: result.fields.purchaseDate?.value ?? prev.purchaseDate,
            coverageEndsOn: result.fields.coverageEndsOn?.value ?? prev.coverageEndsOn,
            coverageNotes: prev.coverageNotes,
          }));
        }
        logEvent('vision:applied_remote');
      };

      setAnalyzing(true);
      try {
        const visionStart = Date.now();
        const visionResult = await analyzeBenefitImage({
          uri: workingUri,
          mimeType,
          benefitType: mode,
        });
        logTiming('vision', visionStart);
        applyAnalysis(visionResult);
      } catch (error) {
        console.warn('Vision analysis failed', error);
        Alert.alert('Unable to analyze image', 'Please try again with a clearer photo.');
      } finally {
        logTiming('overall', overallStart);
        setAnalyzing(false);
      }
    },
    [analyzeBenefitImage, mode],
  );

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (mode === 'coupon') {
        const { merchant, description, expiresOn, terms } = couponForm;
        if (!validateCoupon()) {
          setSubmitting(false);
          return;
        }
        await addCoupon({
          id: uuid(),
          merchant,
          description,
          expiresOn,
          terms: terms || undefined,
          createdAt: new Date().toISOString(),
        });
      } else {
        const { productName, merchant, purchaseDate, coverageEndsOn, coverageNotes } = warrantyForm;
        if (!validateWarranty()) {
          setSubmitting(false);
          return;
        }
        await addWarranty({
          id: uuid(),
          productName,
          merchant,
          purchaseDate,
          coverageEndsOn,
          coverageNotes: coverageNotes || undefined,
          createdAt: new Date().toISOString(),
        });
      }

      setCouponForm(EMPTY_COUPON);
      setWarrantyForm(EMPTY_WARRANTY);
      setCouponErrors({});
      setWarrantyErrors({});
      setAnalysis(null);
      triggerNotificationSuccess();
      const resetAction = CommonActions.reset({
        index: 0,
        routes: [{ name: 'Wallet' as keyof RootStackParamList }],
      });
      navigation.dispatch(resetAction);
    } catch (error) {
      console.warn('Failed to save benefit', error);
      Alert.alert('Unable to save', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCouponFields = () => (
    <View style={styles.section}>
      <Text style={styles.helperText}>We’ll remind you before this coupon expires.</Text>
      <Text style={styles.label}>Merchant</Text>
      <TextInput
        style={[styles.input, couponErrors.merchant && styles.inputError]}
        value={couponForm.merchant}
        onChangeText={(merchant) => {
          setCouponForm((prev) => ({ ...prev, merchant }));
          setCouponErrors((prev) => ({ ...prev, merchant: undefined }));
        }}
        placeholder="Coffee Spot"
      />
      {couponErrors.merchant ? <Text style={styles.errorText}>{couponErrors.merchant}</Text> : null}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline, couponErrors.description && styles.inputError]}
        multiline
        value={couponForm.description}
        onChangeText={(description) => {
          setCouponForm((prev) => ({ ...prev, description }));
          setCouponErrors((prev) => ({ ...prev, description: undefined }));
        }}
        placeholder="Buy one get one free latte"
      />
      {couponErrors.description ? (
        <Text style={styles.errorText}>{couponErrors.description}</Text>
      ) : null}
      <Text style={styles.label}>Expires On</Text>
      <Pressable
        style={[styles.input, styles.dateInput, couponErrors.expiresOn && styles.inputError]}
        onPress={openCouponDatePicker}
      >
        <Text style={couponForm.expiresOn ? styles.dateInputText : styles.dateInputPlaceholder}>
          {couponExpiryDisplay}
        </Text>
      </Pressable>
      {couponErrors.expiresOn ? (
        <Text style={styles.errorText}>{couponErrors.expiresOn}</Text>
      ) : null}
      <Text style={styles.label}>Terms (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        value={couponForm.terms}
        onChangeText={(terms) => setCouponForm((prev) => ({ ...prev, terms }))}
        placeholder="Limit one per visit"
      />
    </View>
  );

  const renderWarrantyFields = () => (
    <View style={styles.section}>
      <Text style={styles.helperText}>
        Log purchase and coverage dates to simplify warranty claims.
      </Text>
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={[styles.input, warrantyErrors.productName && styles.inputError]}
        value={warrantyForm.productName}
        onChangeText={(productName) => {
          setWarrantyForm((prev) => ({ ...prev, productName }));
          setWarrantyErrors((prev) => ({ ...prev, productName: undefined }));
        }}
        placeholder="4K TV"
      />
      {warrantyErrors.productName ? (
        <Text style={styles.errorText}>{warrantyErrors.productName}</Text>
      ) : null}
      <Text style={styles.label}>Merchant</Text>
      <TextInput
        style={[styles.input, warrantyErrors.merchant && styles.inputError]}
        value={warrantyForm.merchant}
        onChangeText={(merchant) => {
          setWarrantyForm((prev) => ({ ...prev, merchant }));
          setWarrantyErrors((prev) => ({ ...prev, merchant: undefined }));
        }}
        placeholder="Electronics World"
      />
      {warrantyErrors.merchant ? (
        <Text style={styles.errorText}>{warrantyErrors.merchant}</Text>
      ) : null}
      <Text style={styles.label}>Purchase Date</Text>
      <Pressable
        style={[styles.input, styles.dateInput, warrantyErrors.purchaseDate && styles.inputError]}
        onPress={openWarrantyPurchasePicker}
      >
        <Text
          style={warrantyForm.purchaseDate ? styles.dateInputText : styles.dateInputPlaceholder}
        >
          {warrantyPurchaseDisplay}
        </Text>
      </Pressable>
      {warrantyErrors.purchaseDate ? (
        <Text style={styles.errorText}>{warrantyErrors.purchaseDate}</Text>
      ) : null}
      <Text style={styles.label}>Coverage Ends On</Text>
      <Pressable
        style={[styles.input, styles.dateInput, warrantyErrors.coverageEndsOn && styles.inputError]}
        onPress={openWarrantyCoveragePicker}
      >
        <Text
          style={warrantyForm.coverageEndsOn ? styles.dateInputText : styles.dateInputPlaceholder}
        >
          {warrantyCoverageDisplay}
        </Text>
      </Pressable>
      {warrantyErrors.coverageEndsOn ? (
        <Text style={styles.errorText}>{warrantyErrors.coverageEndsOn}</Text>
      ) : null}
      <Text style={styles.label}>Coverage Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        value={warrantyForm.coverageNotes}
        onChangeText={(coverageNotes) => setWarrantyForm((prev) => ({ ...prev, coverageNotes }))}
        placeholder="Add claim instructions or serial numbers"
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="slide"
          visible={couponDatePickerVisible}
          onRequestClose={cancelCouponDate}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={couponDateDraft}
                mode="date"
                display="spinner"
                onChange={handleIosCouponDateChange}
                style={styles.iosPicker}
                textColor="#111827"
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalButton} onPress={cancelCouponDate}>
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalPrimaryButton]}
                  onPress={confirmCouponDate}
                >
                  <Text style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="slide"
          visible={warrantyPurchasePickerVisible}
          onRequestClose={() => setWarrantyPurchasePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={warrantyPurchaseDraft}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setWarrantyPurchaseDraft(selectedDate);
                  }
                }}
                style={styles.iosPicker}
                textColor="#111827"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setWarrantyPurchasePickerVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalPrimaryButton]}
                  onPress={() => {
                    setWarrantyForm((prev) => ({
                      ...prev,
                      purchaseDate: toUtcMiddayIso(warrantyPurchaseDraft),
                    }));
                    setWarrantyPurchasePickerVisible(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      {Platform.OS === 'ios' ? (
        <Modal
          transparent
          animationType="slide"
          visible={warrantyCoveragePickerVisible}
          onRequestClose={() => setWarrantyCoveragePickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <DateTimePicker
                value={warrantyCoverageDraft}
                mode="date"
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setWarrantyCoverageDraft(selectedDate);
                  }
                }}
                style={styles.iosPicker}
                textColor="#111827"
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalButton}
                  onPress={() => setWarrantyCoveragePickerVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.modalPrimaryButton]}
                  onPress={() => {
                    setWarrantyForm((prev) => ({
                      ...prev,
                      coverageEndsOn: toUtcMiddayIso(warrantyCoverageDraft),
                    }));
                    setWarrantyCoveragePickerVisible(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, styles.modalPrimaryButtonText]}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerBlock}>
          <Text style={styles.title}>{mode === 'coupon' ? 'Add a coupon' : 'Add a warranty'}</Text>
          <Text style={styles.subtitle}>
            {mode === 'coupon'
              ? 'Snap or import your coupon so we can capture the expiration for you.'
              : 'Keep your purchase and coverage details handy to simplify claims later.'}
          </Text>
          {routeParams.autoScanSource ? (
            <View style={styles.inlineBanner}>
              <Ionicons name="sparkles-outline" size={16} color={TEXT_ACCENT} />
              <Text style={styles.inlineBannerText}>
                {routeParams.autoScanSource === 'camera'
                  ? `Launching camera to capture your ${mode === 'coupon' ? 'coupon.' : 'warranty receipt.'}`
                  : 'Importing from your photo library.'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.modeToggle}>
          {(['coupon', 'warranty'] as BenefitType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => {
                handleModeChange(type);
              }}
              style={[styles.modeButton, mode === type && styles.modeButtonActive]}
            >
              <Text style={[styles.modeButtonText, mode === type && styles.modeButtonTextActive]}>
                {type === 'coupon' ? 'Coupon' : 'Warranty'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.scanRow}>
          <Pressable
            style={[styles.scanButton, analyzing && styles.scanButtonDisabled]}
            onPress={() => void handleAnalyzeImage('library')}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.scanButtonContent}>
                <Ionicons name="images-outline" size={18} color="#fff" />
                <Text style={styles.scanText}>Scan from gallery</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[
              styles.scanButton,
              styles.scanButtonSecondary,
              analyzing && styles.scanButtonDisabled,
            ]}
            onPress={() => void handleAnalyzeImage('camera')}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <View style={styles.scanButtonContentSecondary}>
                <Ionicons name="camera-outline" size={18} color={TEXT_PRIMARY} />
                <Text style={styles.scanTextSecondary}>Capture photo</Text>
              </View>
            )}
          </Pressable>
        </View>

        {analysis?.warnings?.length ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>We couldn’t capture everything:</Text>
            {analysis.warnings.map((warning) => (
              <Text key={warning} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        ) : null}

        {mode === 'coupon' ? renderCouponFields() : renderWarrantyFields()}

        <Pressable
          style={[styles.saveButton, submitting && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save to wallet</Text>
          )}
        </Pressable>

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Current values</Text>
          {mode === 'coupon' ? (
            <>
              <Text style={styles.previewLine}>Merchant: {couponForm.merchant || '—'}</Text>
              <Text style={styles.previewLine}>Description: {couponForm.description || '—'}</Text>
              <Text style={styles.previewLine}>
                Expires: {couponForm.expiresOn ? couponExpiryDisplay : '—'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.previewLine}>Product: {warrantyForm.productName || '—'}</Text>
              <Text style={styles.previewLine}>Merchant: {warrantyForm.merchant || '—'}</Text>
              <Text style={styles.previewLine}>
                Purchased: {warrantyForm.purchaseDate ? warrantyPurchaseDisplay : '—'}
              </Text>
              <Text style={styles.previewLine}>
                Coverage Ends: {warrantyForm.coverageEndsOn ? warrantyCoverageDisplay : '—'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  scroll: {
    flex: 1,
    backgroundColor: SURFACE_COLOR,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 20,
  },
  headerBlock: {
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    lineHeight: 22,
  },
  inlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CANVAS_COLOR,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineBannerText: {
    fontSize: 13,
    color: TEXT_PRIMARY,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  modeButtonText: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#1d4ed8',
  },
  scanRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    backgroundColor: TEXT_ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  scanButtonSecondary: {
    backgroundColor: CANVAS_COLOR,
  },
  scanButtonDisabled: {
    opacity: 0.75,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanButtonContentSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanTextSecondary: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 12,
    backgroundColor: SURFACE_COLOR,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  helperText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: SURFACE_COLOR,
    color: TEXT_PRIMARY,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  dateInputPlaceholder: {
    fontSize: 15,
    color: TEXT_MUTED,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#047857',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  previewBox: {
    backgroundColor: CANVAS_COLOR,
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  previewLine: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  warningBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_WARNING,
  },
  warningText: {
    fontSize: 13,
    color: TEXT_WARNING,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingVertical: 8,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  modalPrimaryButton: {
    backgroundColor: '#2563eb',
  },
  modalButtonText: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '600',
  },
  modalPrimaryButtonText: {
    color: '#fff',
  },
  iosPicker: {
    alignSelf: 'stretch',
    height: 220,
  },
});

export default AddBenefitScreen;
