import { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Image, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { extractText } from '@/src/ocr/extractText';
import { FileUpload } from '@/src/components/FileUpload';
import { ClaimSelector } from '@/src/components/ClaimSelector';

export default function CaptureBrandingScreen() {
  const {
    labelImageUri,
    setBrandingImage,
    setLabelText,
    setBrandingText,
    selectedClaims,
    setSelectedClaims,
  } = useScan();
  const [brandingUri, setBrandingUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleAnalyze = async () => {
    if (!labelImageUri) {
      Alert.alert('Upload required', 'Please upload the nutrition label first.');
      return;
    }
    if (selectedClaims.length === 0 && !brandingUri) {
      Alert.alert('Select or upload', 'Select at least one claim to verify, or upload a claim image.');
      return;
    }

    setProcessing(true);
    try {
      const labelBlocks = await extractText(labelImageUri);

      if (labelBlocks.length === 0) {
        Alert.alert(
          'Could not read label',
          'The nutrition label image was not clear enough. Please upload a clearer image.'
        );
        setProcessing(false);
        return;
      }

      setLabelText(labelBlocks);

      let brandingBlocks: string[] = [];
      if (brandingUri) {
        brandingBlocks = await extractText(brandingUri);
        setBrandingText(brandingBlocks);
      }

      router.push({
        pathname: '/result',
        params: {
          labelText: JSON.stringify(labelBlocks),
          brandingText: JSON.stringify(brandingBlocks),
          selectedClaims: JSON.stringify(selectedClaims),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text extraction failed.';
      Alert.alert('Processing error', message + ' Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const canAnalyze = labelImageUri && (selectedClaims.length > 0 || brandingUri);

  return (
    <View style={styles.container}>
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Claim to verify</Text>
        <Text style={styles.hintText}>
          Upload a product image with the claim, or select the claim(s) you want to verify.
        </Text>
      </View>

      <ClaimSelector selectedClaims={selectedClaims} onSelectionChange={setSelectedClaims} />

      <Text style={styles.orLabel}>Or upload claim image (optional)</Text>
      <FileUpload
        value={brandingUri}
        onChange={(uri) => {
          setBrandingUri(uri);
          setBrandingImage(uri);
        }}
        placeholder="Upload product/claim image"
      />

      <Pressable
        style={[styles.analyzeBtn, (!canAnalyze || processing) && styles.analyzeBtnDisabled]}
        onPress={handleAnalyze}
        disabled={!canAnalyze || processing}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.analyzeText}>Analyze & get verdict</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  hintBox: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#92400e',
  },
  hintText: {
    fontSize: 14,
    color: '#a16207',
    lineHeight: 22,
  },
  orLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  analyzeBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  analyzeBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  analyzeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
