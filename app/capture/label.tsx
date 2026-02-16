import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { FileUpload } from '@/src/components/FileUpload';

export default function CaptureLabelScreen() {
  const { labelImageUri, setLabelImage } = useScan();

  const handleContinue = () => {
    if (!labelImageUri) return;
    router.push('/capture/branding');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Upload nutrition label</Text>
        <Text style={styles.hintText}>
          Include the full nutrition facts table and ingredients list for best results.
        </Text>
      </View>

      <FileUpload
        value={labelImageUri}
        onChange={setLabelImage}
        placeholder="Upload nutrition label image"
      />

      <Pressable
        style={[styles.continueBtn, !labelImageUri && styles.continueBtnDisabled]}
        onPress={handleContinue}
      >
        <Text style={styles.continueText}>Continue to claim</Text>
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
    backgroundColor: '#fdf2f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#722F37',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#722F37',
  },
  hintText: {
    fontSize: 14,
    color: '#44403c',
    lineHeight: 22,
  },
  continueBtn: {
    backgroundColor: '#22c55e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  continueBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
