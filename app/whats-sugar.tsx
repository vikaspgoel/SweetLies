import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const SWEETENER_DATA = [
  { sweetener: 'White sugar (sucrose)', gi: '~65', reality: 'Standard reference for most sweets' },
  { sweetener: 'Jaggery (gur)', gi: '70–85', reality: 'Often marketed healthy but similar impact as sugar' },
  { sweetener: 'Honey', gi: '55–70', reality: 'Slightly variable, still raises glucose' },
  { sweetener: 'Dates / date paste', gi: '60–70', reality: 'Natural but high natural sugar' },
  { sweetener: 'Coconut sugar', gi: '54–68', reality: 'Slightly lower GI but still sugar' },
  { sweetener: 'Brown sugar', gi: '~64', reality: 'Nutritionally similar to white sugar' },
  { sweetener: 'Maple syrup', gi: '~60', reality: 'Still a sugar source' },
  { sweetener: 'Agave syrup', gi: '15–30', reality: 'Low GI but very high fructose' },
  { sweetener: 'Maltodextrin', gi: '95–110', reality: 'Extremely high GI, spikes quickly' },
  { sweetener: 'Fruit juice concentrate', gi: '65–75', reality: 'Common hidden sugar in "healthy" foods' },
];

export default function WhatsSugarScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What&apos;s Sugar?</Text>
        <Pressable style={styles.closeBtn} hitSlop={12} onPress={() => router.back()}>
          {({ pressed }) => (
            <FontAwesome
              name="times"
              size={24}
              color="#475569"
              style={{ opacity: pressed ? 0.6 : 1 }}
            />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.highlightBox}>
          <Text style={styles.highlightText}>
            Do you know that honey, jaggery and fruit concentrate are nothing but sugar?
          </Text>
          <Text style={[styles.highlightText, styles.highlightTextLast]}>
            Sugar has at least 60+ different aliases that do the same job — just with better PR.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h1}>What is Sugar?</Text>
          <Text style={styles.para}>
            Sugar is a simple carbohydrate that the body converts into glucose for energy. While glucose
            is essential for survival, most modern foods contain far more sugar than our bodies need.
            When people think of sugar, they usually imagine white table sugar. But sugar exists in many
            forms — honey, jaggery, syrups, fruit concentrates, and even ingredients like maltodextrin.
            The body treats most of these very similarly once consumed.
          </Text>
          <Text style={styles.para}>
            A common myth is that &quot;natural&quot; sugars like honey or jaggery are much healthier than
            regular sugar. In reality, they still raise blood glucose and should be consumed in moderation.
            Another misconception is that &quot;sugar-free&quot; or &quot;no added sugar&quot; products contain no sugar at all.
            These products may still contain natural sugars from milk or fruit, or use alternative sweeteners
            that affect metabolism differently.
          </Text>
          <Text style={styles.para}>
            It&apos;s also important to know that sugar is not only in sweets and desserts. Many packaged foods
            such as cereals, protein bars, sauces, and drinks contain hidden sugars. Understanding how to
            identify sugar in all its forms helps you make informed choices. Awareness — not complete avoidance
            — is the key to managing sugar intake wisely.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Other names of sugar!</Text>
          <Text style={styles.caption}>
            Not all sugars look the same on labels, but many affect blood glucose in a similar way. The
            Glycaemic Index (GI) indicates how quickly a food raises blood sugar (higher = faster spike).
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colSweetener]}>Sweetener</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colGi]}>Approx GI</Text>
              <Text style={[styles.tableCell, styles.tableHeaderCell, styles.colReality]}>Reality Check</Text>
            </View>
            {SWEETENER_DATA.map((row, i) => (
              <View
                key={i}
                style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, styles.colSweetener]}>{row.sweetener}</Text>
                <Text style={[styles.tableCell, styles.colGi]}>{row.gi}</Text>
                <Text style={[styles.tableCell, styles.colReality, styles.colRealityBody]}>{row.reality}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Important to know</Text>
          <Text style={styles.tipText}>
            Many &quot;natural&quot; or &quot;unrefined&quot; sweeteners create a health halo but behave similarly to
            regular sugar in the body. Low GI does not always mean healthy — some low-GI sweeteners are
            high in fructose and should still be consumed carefully.
          </Text>
          <Text style={styles.tipText}>
            Understanding these differences helps you see beyond marketing claims and make smarter choices
            about sugar intake.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  h1: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  caption: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  para: {
    fontSize: 16,
    lineHeight: 26,
    color: '#334155',
    marginBottom: 14,
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#722F37',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableHeaderCell: {
    color: '#fff',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    fontSize: 14,
    color: '#334155',
  },
  colSweetener: {
    flex: 1.4,
    paddingRight: 8,
  },
  colGi: {
    width: 72,
    fontWeight: '600',
  },
  colReality: {
    flex: 1.6,
    fontSize: 13,
  },
  colRealityBody: {
    color: '#475569',
  },
  highlightBox: {
    backgroundColor: '#722F37',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 6,
    borderLeftColor: '#d97706',
  },
  highlightText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 26,
    marginBottom: 10,
  },
  highlightTextLast: {
    marginBottom: 0,
  },
  tipBox: {
    backgroundColor: '#fef3c7',
    padding: 18,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#78350f',
    marginBottom: 8,
  },
});
