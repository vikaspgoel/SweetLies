import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { extractText } from '@/src/ocr/extractText';
import { MultiFileUpload } from '@/src/components/MultiFileUpload';
import { getClaimLabel, getEvaluatorKey } from '@/src/knowledge/worryAndClaims';

export default function UploadScreen() {
  const {
    selectedClaim,
    labelImageUris,
    addLabelImage,
    removeLabelImage,
    setLabelText,
    setSelectedClaims,
  } = useScan();
  const [processing, setProcessing] = useState(false);

  const claimLabel = getClaimLabel(selectedClaim);
  const claimEvaluatorKey = getEvaluatorKey(selectedClaim);

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

      setLabelText(allBlocks);
      setSelectedClaims(claimEvaluatorKey ? [claimLabel] : []);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload photos of ingredients and nutrition label</Text>
      <Text style={styles.subtitle}>
        Upload up to 5 photos. Ingredients and nutrition labels are a must.
      </Text>
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>Tips for best results</Text>
        <Text style={styles.tipsText}>
          For jars or curved labels: take 2-3 photos, zoom into the nutrition panel, and capture ingredients separately. Multiple photos improve accuracy.
        </Text>
      </View>

      <MultiFileUpload
        uris={labelImageUris}
        onAdd={addLabelImage}
        onRemove={removeLabelImage}
        maxCount={5}
        placeholder="Tap to add ingredients & nutrition label"
      />

      <View style={styles.claimSummary}>
        <Text style={styles.claimLabel}>Verifying:</Text>
        <Text style={styles.claimValue}>{claimLabel}</Text>
      </View>

      <Pressable
        style={[styles.truthBtn, (labelImageUris.length === 0 || processing) && styles.truthBtnDisabled]}
        onPress={handleTellMeTheTruth}
        disabled={labelImageUris.length === 0 || processing}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.truthBtnText}>Let's find sweet lies</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 22,
  },
  tipsBox: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 6,
  },
  tipsText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 20,
  },
  claimSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#fdf2f4',
    borderRadius: 8,
  },
  claimLabel: { fontSize: 14, color: '#64748b' },
  claimValue: { fontSize: 15, fontWeight: '600', color: '#722F37' },
  truthBtn: {
    backgroundColor: '#3d1f1a',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  truthBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.8,
  },
  truthBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
