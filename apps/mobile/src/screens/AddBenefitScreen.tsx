import React, { useEffect, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

const toIsoOrEmpty = (value?: string | number | Date): string => {
  if (!value) {
    return '';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
};

const AddBenefitScreen = (): React.ReactElement => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addCoupon, addWarranty, analyzeBenefitImage } = useBenefits();

  const [mode, setMode] = useState<BenefitType>('coupon');
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [warrantyForm, setWarrantyForm] = useState(EMPTY_WARRANTY);
  const [analysis, setAnalysis] = useState<VisionAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [couponDatePickerVisible, setCouponDatePickerVisible] = useState(false);
  const [couponDateDraft, setCouponDateDraft] = useState<Date>(new Date());

  useEffect(() => {
    if (couponForm.expiresOn) {
      const parsed = new Date(couponForm.expiresOn);
      if (!Number.isNaN(parsed.getTime())) {
        setCouponDateDraft(parsed);
      }
    }
  }, [couponForm.expiresOn]);

  const getCouponExpiryDisplay = (): string => {
    if (!couponForm.expiresOn) {
      return 'Select date';
    }
    const date = new Date(couponForm.expiresOn);
    if (Number.isNaN(date.getTime())) {
      return 'Select date';
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const openCouponDatePicker = () => {
    const initial = couponForm.expiresOn ? new Date(couponForm.expiresOn) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (_event: DateTimePickerEvent, selectedDate?: Date) => {
          if (selectedDate) {
            setCouponForm((prev) => ({
              ...prev,
              expiresOn: selectedDate.toISOString(),
            }));
          }
        },
      });
    } else {
      setCouponDateDraft(initial);
      setCouponDatePickerVisible(true);
    }
  };

  const handleIosCouponDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      setCouponDateDraft(selectedDate);
    }
  };

  const confirmCouponDate = () => {
    setCouponForm((prev) => ({
      ...prev,
      expiresOn: couponDateDraft.toISOString(),
    }));
    setCouponDatePickerVisible(false);
  };

  const cancelCouponDate = () => {
    setCouponDatePickerVisible(false);
  };

  const iosCouponDatePicker =
    couponDatePickerVisible && Platform.OS === 'ios' ? (
      <Modal transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DateTimePicker
              value={couponDateDraft}
              mode="date"
              display="spinner"
              onChange={handleIosCouponDateChange}
              style={styles.iosPicker}
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
    ) : null;

  const handleAnalyzeImage = async (source: 'library' | 'camera') => {
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
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (mode === 'coupon') {
        const { merchant, description, expiresOn, terms } = couponForm;
        if (!merchant || !description || !expiresOn) {
          Alert.alert(
            'Missing info',
            'Merchant, description, and expiration are required for coupons.',
          );
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
        if (!productName || !merchant || !purchaseDate || !coverageEndsOn) {
          Alert.alert(
            'Missing info',
            'Please provide product, merchant, purchase date, and coverage end.',
          );
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

      Alert.alert('Saved', 'Benefit added to your wallet.');
      navigation.navigate('Wallet');
      setCouponForm(EMPTY_COUPON);
      setWarrantyForm(EMPTY_WARRANTY);
      setAnalysis(null);
    } catch (error) {
      console.warn('Failed to save benefit', error);
      Alert.alert('Unable to save', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCouponFields = () => (
    <View style={styles.section}>
      <Text style={styles.label}>Merchant</Text>
      <TextInput
        style={styles.input}
        value={couponForm.merchant}
        onChangeText={(merchant) => setCouponForm((prev) => ({ ...prev, merchant }))}
        placeholder="Coffee Spot"
      />
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        multiline
        value={couponForm.description}
        onChangeText={(description) => setCouponForm((prev) => ({ ...prev, description }))}
        placeholder="Buy one get one free latte"
      />
      <Text style={styles.label}>Expires On</Text>
      <Pressable style={[styles.input, styles.dateInput]} onPress={openCouponDatePicker}>
        <Text style={couponForm.expiresOn ? styles.dateInputText : styles.dateInputPlaceholder}>
          {getCouponExpiryDisplay()}
        </Text>
      </Pressable>
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
      <Text style={styles.label}>Product Name</Text>
      <TextInput
        style={styles.input}
        value={warrantyForm.productName}
        onChangeText={(productName) => setWarrantyForm((prev) => ({ ...prev, productName }))}
        placeholder="4K TV"
      />
      <Text style={styles.label}>Merchant</Text>
      <TextInput
        style={styles.input}
        value={warrantyForm.merchant}
        onChangeText={(merchant) => setWarrantyForm((prev) => ({ ...prev, merchant }))}
        placeholder="Electronics World"
      />
      <Text style={styles.label}>Purchase Date</Text>
      <TextInput
        style={styles.input}
        value={warrantyForm.purchaseDate}
        onChangeText={(purchaseDate) => setWarrantyForm((prev) => ({ ...prev, purchaseDate }))}
        placeholder={toIsoOrEmpty(new Date())}
        autoCapitalize="none"
      />
      <Text style={styles.label}>Coverage Ends On</Text>
      <TextInput
        style={styles.input}
        value={warrantyForm.coverageEndsOn}
        onChangeText={(coverageEndsOn) => setWarrantyForm((prev) => ({ ...prev, coverageEndsOn }))}
        placeholder={toIsoOrEmpty(new Date().setFullYear(new Date().getFullYear() + 1))}
        autoCapitalize="none"
      />
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
    <SafeAreaView style={styles.safeArea}>
      {iosCouponDatePicker}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add a benefit</Text>
        <Text style={styles.subtitle}>
          Snap or pick a photo to auto-fill fields, then review before saving.
        </Text>

        <View style={styles.modeToggle}>
          {(['coupon', 'warranty'] as BenefitType[]).map((type) => (
            <Pressable
              key={type}
              onPress={() => {
                setMode(type);
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
              <Text style={styles.scanText}>Scan from gallery</Text>
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
              <Text style={styles.scanTextSecondary}>Capture photo</Text>
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
                Expires: {couponForm.expiresOn ? getCouponExpiryDisplay() : '—'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.previewLine}>Product: {warrantyForm.productName || '—'}</Text>
              <Text style={styles.previewLine}>Merchant: {warrantyForm.merchant || '—'}</Text>
              <Text style={styles.previewLine}>Purchased: {warrantyForm.purchaseDate || '—'}</Text>
              <Text style={styles.previewLine}>
                Coverage Ends: {warrantyForm.coverageEndsOn || '—'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 24,
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
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
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  scanButtonSecondary: {
    backgroundColor: '#e2e8f0',
  },
  scanButtonDisabled: {
    opacity: 0.75,
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanTextSecondary: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    gap: 12,
    backgroundColor: '#fff',
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
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#111827',
  },
  dateInput: {
    justifyContent: 'center',
  },
  dateInputText: {
    fontSize: 15,
    color: '#111827',
  },
  dateInputPlaceholder: {
    fontSize: 15,
    color: '#9ca3af',
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
    backgroundColor: '#f4f4f5',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  previewLine: {
    fontSize: 14,
    color: '#374151',
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
    color: '#9a3412',
  },
  warningText: {
    fontSize: 13,
    color: '#9a3412',
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
  },
});

export default AddBenefitScreen;
