import { StyleSheet, ScrollView } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function InfoScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tips for best results</Text>
      <Text style={styles.tip}>• Hold the label flat with good lighting</Text>
      <Text style={styles.tip}>• Include the full nutrition facts table</Text>
      <Text style={styles.tip}>• Capture ingredients list when visible</Text>
      <Text style={styles.tip}>• Ensure bold claims on the pack are readable</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  tip: { fontSize: 15, lineHeight: 28, color: '#475569' },
});
