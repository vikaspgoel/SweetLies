import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { PRODUCT_CLAIM_OPTIONS } from '@/src/knowledge/worryAndClaims';
import { MultiFileUpload } from '@/src/components/MultiFileUpload';
import { extractText } from '@/src/ocr/extractText';
import { getClaimLabel, getEvaluatorKey } from '@/src/knowledge/worryAndClaims';
import { extractNutritionAndIngredientsOnly, getCombinedExtractedText } from '@/src/utils/extractNutritionSections';

export default function HomeScreen() {
  const {
    setSelectedClaim,
    setWorryType,
    selectedClaim,
    labelImageUris,
    addLabelImage,
    removeLabelImage,
    setLabelText,
    setSelectedClaims,
  } = useScan();
  const [processing, setProcessing] = useState(false);
  const [showWhyExpand, setShowWhyExpand] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const slowMsgRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const claimLabel = getClaimLabel(selectedClaim);
  const claimEvaluatorKey = getEvaluatorKey(selectedClaim);

  const handleClaimSelect = (id: string) => {
    setSelectedClaim(id);
    setWorryType('sugar');
  };

  useEffect(() => {
    if (!processing) {
      setShowSlowMessage(false);
      if (slowMsgRef.current) {
        clearTimeout(slowMsgRef.current);
        slowMsgRef.current = null;
      }
    } else {
      slowMsgRef.current = setTimeout(() => setShowSlowMessage(true), 2000);
    }
    return () => {
      if (slowMsgRef.current) clearTimeout(slowMsgRef.current);
    };
  }, [processing]);

  const handleTellMeTheTruth = async () => {
    if (labelImageUris.length === 0) {
      Alert.alert('Upload required', 'Please add at least one image of the nutrition label or ingredients.');
      return;
    }

    setProcessing(true);
    try {
      const allBlocks: string[] = [];
      for (const uri of labelImageUris) {
        const blocks = await extractText(uri);
        allBlocks.push(...blocks);
      }

      if (allBlocks.length === 0) {
        Alert.alert(
          'Could not read',
          'The images were not clear enough. Please upload clearer photos of the nutrition label.'
        );
        setProcessing(false);
        return;
      }

      const combined = allBlocks.join('\n');
      const scoped = extractNutritionAndIngredientsOnly(combined);
      const scopedCombined = getCombinedExtractedText(scoped);
      const scopedBlocks = scopedCombined && scopedCombined.trim().length > 0
        ? scopedCombined.split(/\n+/).map((s) => s.trim()).filter(Boolean)
        : allBlocks;
      setLabelText(scopedBlocks);
      setSelectedClaims(claimEvaluatorKey ? [claimLabel] : []);

      // Defer navigation so React commits context updates before ResultScreen mounts
      setTimeout(() => {
        router.push({
          pathname: '/result',
          params: {
            labelText: JSON.stringify(allBlocks),
            selectedClaim: selectedClaim ?? '',
            claimLabel: claimLabel,
            claimEvaluatorKey: claimEvaluatorKey ?? '',
          },
        });
      }, 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Error', msg + ' Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const canProceed = labelImageUris.length > 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.brandSweet}>Sweet</Text>
          <Text style={styles.brandLies}>Lies</Text>
        </View>
        <Text style={styles.tagline}>Labels can mislead. If it has sugar, we&apos;ll find it.</Text>
        <Text style={styles.subtagline}>Just 1-2-3 steps and you&apos;ll see the verdict in a jiffy.</Text>
        <Pressable style={styles.whyExpandBtn} onPress={() => setShowWhyExpand((v) => !v)}>
          <Text style={styles.whyExpandLabel}>
            Why this app? {showWhyExpand ? '▲' : '▼'}
          </Text>
        </Pressable>
        {showWhyExpand && (
          <View style={styles.whyExpandContent}>
            <Text style={styles.whyExpandText}>We&apos;re not here to tell you sugar is good or bad.</Text>
            <Text style={styles.whyExpandText}>We&apos;re here to make sure you know when it&apos;s actually there.</Text>
            <Text style={styles.whyExpandText}>Food labels are full of clever wordplay — this app simply helps you see through it.</Text>
          </View>
        )}
      </View>

      {/* ① CLAIM */}
      <View style={styles.section}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepNum}>1</Text>
        </View>
        <Text style={styles.sectionTitle}>What&apos;s the product claiming? (optional)</Text>
        <Text style={styles.claimHint}>This is for information purposes only; it won't impact the verdict.</Text>
        <View style={styles.options}>
          {PRODUCT_CLAIM_OPTIONS.map((opt) => (
            <Pressable
              key={opt.id}
              style={[
                styles.optionBtn,
                selectedClaim === opt.id && styles.optionBtnSelected,
              ]}
              onPress={() => handleClaimSelect(opt.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedClaim === opt.id && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ② UPLOAD */}
      <View style={styles.section}>
        <View style={[styles.stepBadge, styles.stepBadge2]}>
          <Text style={styles.stepNum}>2</Text>
        </View>
        <Text style={styles.sectionTitle}>Upload photos of ingredients and nutrition label</Text>
        <Text style={styles.sectionHint}>
          Hope you have taken clear pictures of ingredients and nutrition labels. Tap to add up to 5 clear pics of the same product.
        </Text>
        <MultiFileUpload
          uris={labelImageUris}
          onAdd={addLabelImage}
          onRemove={removeLabelImage}
          maxCount={5}
          placeholder="Tap to add ingredients & nutrition label"
        />
      </View>

      {/* ③ GET THE VERDICT */}
      <View style={styles.section}>
        <View style={[styles.stepBadge, styles.stepBadge3]}>
          <Text style={styles.stepNum}>3</Text>
        </View>
        <Text style={styles.sectionTitle}>Get the verdict</Text>
        <Pressable
          style={[
            styles.truthBtn,
            (!canProceed || processing) && styles.truthBtnDisabled,
          ]}
          onPress={handleTellMeTheTruth}
          disabled={!canProceed || processing}
        >
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.truthBtnText}>Let's find sweet lies</Text>
          )}
        </Pressable>
        {!canProceed && (
          <Text style={styles.truthHint}>
            Add at least one photo to continue.
          </Text>
        )}
        {showSlowMessage && processing && (
          <Text style={styles.slowMessage}>
            We&apos;re working on it — it&apos;s worth the wait!
          </Text>
        )}
      </View>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 24, paddingTop: 48, paddingBottom: 48 },
  header: {
    marginBottom: 32,
    position: 'relative',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  brandSweet: {
    fontSize: 38,
    fontWeight: '800',
    color: '#2f5b3f',
    letterSpacing: -0.5,
  },
  brandLies: {
    fontSize: 38,
    fontWeight: '800',
    color: '#6b4c2f',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 18,
    color: '#355a41',
    marginTop: 10,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
  },
  subtagline: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 22,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  whyExpandBtn: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  whyExpandLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b4c2f',
  },
  whyExpandContent: {
    marginTop: 10,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginHorizontal: 8,
  },
  whyExpandText: {
    fontSize: 15,
    color: '#355a41',
    lineHeight: 24,
    marginBottom: 6,
    textAlign: 'center',
  },
  claimHint: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stepBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f5b3f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepBadge2: { backgroundColor: '#6b4c2f' },
  stepBadge3: { backgroundColor: '#7a8f3a' },
  stepNum: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 22,
  },
  options: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: '#f9fafb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionBtnSelected: {
    backgroundColor: '#eef2e6',
    borderColor: '#2f5b3f',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  optionTextSelected: {
    color: '#2f5b3f',
    fontWeight: '600',
  },
  truthBtn: {
    backgroundColor: '#2f5b3f',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  truthBtnDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  truthBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  truthHint: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  slowMessage: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: { height: 40 },
});
