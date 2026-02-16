import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme ?? 'light'].tint;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* About SweetLies - Hero */}
      <View style={styles.heroCard}>
        <Text style={[styles.heroTitle, { color: tint }]}>About SweetLies</Text>
        <Text style={styles.heroTagline}>
          Labels can be sneaky. If there&apos;s sugar—even the &quot;hidden&quot; kind—we&apos;re here to find it.
        </Text>
        <Text style={styles.heroBody}>
          SweetLies decodes the complex ingredient lists on packaged foods to tell you what&apos;s
          actually inside. We cross-reference the fine print against a database of over 150
          metabolic triggers so you can see past the marketing &quot;halos.&quot;
        </Text>
      </View>

      {/* The Ground Rules */}
      <Text style={[styles.sectionTitle, { color: tint }]}>The Ground Rules</Text>

      <View style={[styles.ruleCard, styles.ruleCardFirst]}>
        <Text style={styles.ruleLabel}>Not a Doctor</Text>
        <Text style={styles.ruleText}>
          Our verdicts are based on nutritional science and code, not your medical history. This
          isn&apos;t medical advice—always stick to the plan your doctor or nutritionist gave you.
        </Text>
      </View>

      <View style={styles.ruleCard}>
        <Text style={styles.ruleLabel}>AI Isn&apos;t Perfect</Text>
        <Text style={styles.ruleText}>
          We use AI to &quot;read&quot; the text. Sometimes it might misread a word or miss a line. If
          something looks off, trust your gut (and the physical label) over the app.
        </Text>
      </View>

      <View style={styles.ruleCard}>
        <Text style={styles.ruleLabel}>The &quot;Gold Standard&quot;</Text>
        <Text style={styles.ruleText}>
          For my friends with diabetes: a &quot;Green&quot; light here is a guide, but your CGM
          (Continuous Glucose Monitor) or Glucometer is the ultimate truth. If the app says
          &quot;No Sugar&quot; but your sugar spikes, trust your body!
        </Text>
      </View>

      {/* Pro-Tip */}
      <View style={[styles.proTipBox, { borderLeftColor: tint }]}>
        <Text style={[styles.proTipTitle, { color: tint }]}>Pro-Tip for Best Results</Text>
        <Text style={styles.proTipText}>
          Clear photos are everything. These labels use tiny fonts; if the photo is blurry or
          dark, the AI might hallucinate. Make sure the ingredients and nutrition table are
          sharp and readable before you hit upload!
        </Text>
      </View>

      {/* Credit */}
      <Text style={styles.credit}>Designed by Seema Goel with the help of AI</Text>

      <View style={styles.bottomSpacer} />
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  content: {
    padding: 20,
    paddingTop: 16,
    flexGrow: 1,
    maxWidth: '100%',
  },
  heroCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heroTagline: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 26,
    marginBottom: 14,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 25,
    color: '#475569',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
    color: '#0f172a',
  },
  ruleCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  ruleCardFirst: {
    marginBottom: 12,
  },
  ruleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  ruleText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#64748b',
  },
  proTipBox: {
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderLeftWidth: 5,
    overflow: 'hidden',
  },
  proTipTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  proTipText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#78350f',
  },
  credit: {
    marginTop: 24,
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
