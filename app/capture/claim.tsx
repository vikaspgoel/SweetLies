import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { getClaimsForWorry, WORRY_OPTIONS } from '@/src/knowledge/worryAndClaims';

export default function ClaimScreen() {
  const { worryType, setSelectedClaim } = useScan();

  const worry = worryType ?? 'sugar';
  const worryLabel = WORRY_OPTIONS.find((o) => o.id === worry)?.label ?? 'Sugar';
  const claims = getClaimsForWorry(worry);

  const handleClaimSelect = (claimId: string) => {
    setSelectedClaim(claimId);
    router.push('/capture/upload');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>What&apos;s the product&apos;s bold claim?</Text>
      <Text style={styles.subquestion}>About {worryLabel.toLowerCase()}</Text>
      <View style={styles.options}>
        {claims.map((opt) => (
          <Pressable
            key={opt.id}
            style={({ pressed }) => [styles.optionBtn, pressed && styles.optionBtnPressed]}
            onPress={() => handleClaimSelect(opt.id)}
          >
            <Text style={styles.optionText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 24,
    backgroundColor: '#fff',
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subquestion: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
  },
  options: {
    gap: 12,
  },
  optionBtn: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionBtnPressed: {
    backgroundColor: '#fdf2f4',
    borderColor: '#722F37',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
});
