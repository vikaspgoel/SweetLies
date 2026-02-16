import { StyleSheet, View, Text, Pressable } from 'react-native';
import { CLAIM_CATEGORIES } from '@/src/knowledge/claimCategories';

interface ClaimSelectorProps {
  selectedClaims: string[];
  onSelectionChange: (claims: string[]) => void;
}

export function ClaimSelector({ selectedClaims, onSelectionChange }: ClaimSelectorProps) {
  const toggleClaim = (claim: string) => {
    if (selectedClaims.includes(claim)) {
      onSelectionChange(selectedClaims.filter((c) => c !== claim));
    } else {
      onSelectionChange([...selectedClaims, claim]);
    }
  };

  const claims = CLAIM_CATEGORIES.sugar ?? [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select claim(s) to verify</Text>
      <View style={styles.claimList}>
        {claims.map((claim) => (
          <Pressable
            key={claim}
            style={[
              styles.claimChip,
              selectedClaims.includes(claim) && styles.claimChipSelected,
            ]}
            onPress={() => toggleClaim(claim)}
          >
            <Text
              style={[
                styles.claimChipText,
                selectedClaims.includes(claim) && styles.claimChipTextSelected,
              ]}
            >
              {claim}
            </Text>
          </Pressable>
        ))}
      </View>
      {selectedClaims.length > 0 && (
        <Text style={styles.selectedCount}>
          {selectedClaims.length} claim(s) selected
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  claimList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  claimChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  claimChipSelected: {
    backgroundColor: '#22c55e',
  },
  claimChipText: {
    fontSize: 14,
    color: '#475569',
  },
  claimChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
});
