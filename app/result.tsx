import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { evaluateClaims } from '@/src/rules/evaluateClaims';
import { getSugarVerdict, getSugaryIngredientsWithInfo, getSugarWarning } from '@/src/rules/sugarVerdict';
import { buildStructuredSummary, extractNutritionAndIngredientsOnly, getCombinedExtractedText } from '@/src/utils/extractNutritionSections';
import { getClaimEducation } from '@/src/knowledge/claimEducation';
import { getSweetenerFactCard } from '@/src/knowledge/sweetenerFactCards';
import type { SweetenerInfo } from '@/src/knowledge/artificialSweetenerInfo';
import { findSweetenerMatches } from '@/src/parser/ingredientsParser';
import {
  getLikeCount,
  incrementLike,
  hasUserLiked,
  clearLikedState,
  submitFeedback,
  canSubmitFeedback,
} from '@/src/services/feedback';

/** Sanitize label summary for display: remove control chars and junk, normalize spaces. */
function sanitizeLabelSummary(s: string): string {
  return s
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** Strips trailing OCR junk (=], |=, etc.) from verbatim text. */
function stripVerbatimJunk(s: string): string {
  return s
    .replace(/[\s=\[\]|\\]+$/g, '')
    .replace(/^[\s=\[\]|\\]+/g, '')
    .trim();
}

/** Filters OCR junk from verbatim text; falls back to alias when verbatim is garbled. */
function getCleanVerbatim(verbatim: string, alias: string): string {
  const v = stripVerbatimJunk(verbatim).trim();
  if (!v) return alias.charAt(0).toUpperCase() + alias.slice(1);
  // OCR junk: pipes, double pipes, backslash
  if (/[|\\]/.test(v) || /\|\|/.test(v)) return alias.charAt(0).toUpperCase() + alias.slice(1);
  // Trailing junk like =]
  if (/[=\[\]]/.test(v) && v.length < 25) return alias.charAt(0).toUpperCase() + alias.slice(1);
  // Likely from nutrition facts table (e.g. "sugar (9)" or "total sugar 1.5g" - not an ingredient)
  if (/\(\s*\d+\.?\d*\s*\)|\(\s*[gm]\s*\)/i.test(v)) return alias.charAt(0).toUpperCase() + alias.slice(1);
  if (/^(?:total|added)\s+sugar\s+\d|amount\s+per\s+\d/i.test(v)) return alias.charAt(0).toUpperCase() + alias.slice(1);
  // Too many symbols / nonsensical
  const letterRatio = (v.match(/[a-zA-Z]/g) ?? []).length / Math.max(v.length, 1);
  if (letterRatio < 0.5 && v.length > 10) return alias.charAt(0).toUpperCase() + alias.slice(1);
  return stripVerbatimJunk(v);
}

function getReadabilityScore(text: string): number {
  const cleaned = sanitizeLabelSummary(text || '');
  if (!cleaned) return 1;
  const rawLength = cleaned.length;
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const wordCount = (cleaned.match(/[A-Za-z]{2,}/g) ?? []).length;
  const digitCount = (cleaned.match(/\d/g) ?? []).length;
  const keywordCount = (cleaned.match(/sugar|ingredient|calorie|energy|fat|protein|carb|sodium|per\s*100|kcal/gi) ?? []).length;
  let score = 10;
  if (rawLength < 80) score = 1;
  else if (rawLength < 140) score = 2;
  else if (rawLength < 220) score = 3;
  else if (rawLength < 300) score = 4;
  else if (rawLength < 380) score = 5;
  else if (rawLength < 460) score = 6;
  else if (rawLength < 540) score = 7;
  else if (rawLength < 620) score = 8;
  else if (rawLength < 700) score = 9;
  if (keywordCount === 0) score = Math.min(score, 2);
  if (wordCount < 12) score = Math.min(score, 2);
  if (digitCount < 4) score = Math.min(score, 3);
  if (lines.length < 3) score = Math.min(score, 3);
  return Math.max(1, Math.min(10, score));
}

/** Split fact card content into segments; spike warning segments are marked for red styling. */
function getFactCardSegments(content: string): { text: string; isSpikeWarning: boolean }[] {
  const segments: { text: string; isSpikeWarning: boolean }[] = [];
  const re = /Spike Warning:[^\n]+(?:\n(?!\s*•)[^\n]+)*/gi;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ text: content.slice(lastIndex, m.index), isSpikeWarning: false });
    }
    segments.push({ text: m[0], isSpikeWarning: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ text: content.slice(lastIndex), isSpikeWarning: false });
  }
  return segments.length > 0 ? segments : [{ text: content, isSpikeWarning: false }];
}

/** Inline spike-warning phrases to render in red within body text. */
const INLINE_SPIKE_PHRASES = /(unexpected spikes|rise in blood glucose|effect on blood sugar|glycemic impact of real sugar|moderate rise in blood glucose)/gi;

function getInlineSpikeParts(text: string): { text: string; isSpike: boolean }[] {
  const parts: { text: string; isSpike: boolean }[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_SPIKE_PHRASES.exec(text)) !== null) {
    if (m.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, m.index), isSpike: false });
    }
    parts.push({ text: m[0], isSpike: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isSpike: false });
  }
  return parts.length > 0 ? parts : [{ text, isSpike: false }];
}

/** Classify a line for fact card: intro (The X:), bullet header (• Safety / • Gut), or body. */
function getFactCardLineStyle(line: string): 'intro' | 'bullet' | 'body' {
  const t = line.trim();
  if (/^The .+:/.test(t)) return 'intro';
  if (/^•\s*(Safety|Gut):/.test(t)) return 'bullet';
  return 'body';
}

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    labelText?: string;
    selectedClaim?: string;
    claimLabel?: string;
    claimEvaluatorKey?: string;
  }>();
  const { resetScan, labelText: contextLabelText } = useScan();

  const rawLabelText = (() => {
    if (params.labelText) {
      try {
        return JSON.parse(params.labelText) as string[];
      } catch {
        return [];
      }
    }
    return [];
  })();

  const labelText = contextLabelText && contextLabelText.length > 0 ? contextLabelText : rawLabelText;

  const selectedClaim = params.selectedClaim ?? '';
  const claimLabel = params.claimLabel ?? '';
  const claimEvaluatorKey = params.claimEvaluatorKey ?? '';

  const [activeTab, setActiveTab] = useState<'overview' | 'nutrition'>('overview');
  const [showRawOcr, setShowRawOcr] = useState(false);
  const [showPolyolReadMore, setShowPolyolReadMore] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackBlocked, setFeedbackBlocked] = useState(false);
  const [showClaimEducation, setShowClaimEducation] = useState(false);
  const [factCardSweetener, setFactCardSweetener] = useState<SweetenerInfo | null>(null);

  const hasData = (labelText?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasData) router.replace('/(tabs)');
  }, [hasData]);

  useEffect(() => {
    if (!hasData || Platform.OS !== 'web') return;
    (async () => {
      const [count, liked] = await Promise.all([getLikeCount(), hasUserLiked()]);
      setLikeCount(count);
      setHasLiked(liked);
    })();
  }, [hasData]);

  const handleLike = async () => {
    if (Platform.OS !== 'web' || hasLiked || likeLoading) return;
    setLikeLoading(true);
    const result = await incrementLike();
    setLikeLoading(false);
    if (result.ok) {
      setHasLiked(true);
      setLikeCount((c) => c + 1);
    } else if (result.error) {
      if (result.error === 'Already liked') {
        setHasLiked(true);
      } else {
        const short = result.error.length > 80 ? result.error.slice(0, 80) + '...' : result.error;
        Alert.alert('Could not save like', `Error: ${short}\n\nCheck Firebase Console: Realtime Database > Rules (must allow write on likes/count).`);
      }
    }
  };

  const handleOpenFeedback = async () => {
    if (Platform.OS !== 'web') return;
    const ok = await canSubmitFeedback();
    setFeedbackBlocked(!ok);
    setShowFeedbackModal(true);
    setFeedbackSubmitted(false);
    setFeedbackText('');
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    const result = await submitFeedback(feedbackText);
    setFeedbackSubmitting(false);
    if (result.ok) {
      setFeedbackSubmitted(true);
      setFeedbackText('');
    } else if (result.error) {
      const short = result.error.length > 80 ? result.error.slice(0, 80) + '...' : result.error;
      Alert.alert('Could not send feedback', `Error: ${short}\n\nCheck Firebase Console: Realtime Database > Rules (must allow write on feedback).`);
    }
  };

  if (!hasData) return null;

  const labelCombined = labelText!.join('\n');
  const extracted = extractNutritionAndIngredientsOnly(labelCombined);
  const hasScopedBlocks = (extracted.nutritionBlock.trim().length > 0 || extracted.ingredientsBlock.trim().length > 0);
  const nutritionBlock = hasScopedBlocks ? extracted.nutritionBlock : labelCombined;
  const ingredientsBlock = hasScopedBlocks ? extracted.ingredientsBlock : labelCombined;
  const claimsToVerify = claimEvaluatorKey ? [claimEvaluatorKey] : [];
  const evaluation = evaluateClaims(nutritionBlock, ingredientsBlock, [], claimsToVerify);
  const { claimResults, details } = evaluation;

  const sugarVerdict = getSugarVerdict({
    sugarAliasesFound: details.sugarAliasesFound,
    sugarPer100g: details.sugarPer100g,
    polyolsPer100g: details.polyolsPer100g,
  });
  const sugaryIngredients = getSugaryIngredientsWithInfo(details.sugarMatches ?? []);
  const sugarWarnings = getSugarWarning(details.sugarAliasesFound ?? []);
  const polyolsGrams = details.polyolsPer100g ?? 0;
  const hasPolyolsFromNutrition = polyolsGrams >= 5;
  const effectiveWarnings = hasPolyolsFromNutrition && !sugarWarnings.some((w) => w.includes('Polyols'))
    ? [`WARNING: Contains Sugar alcohol (Polyols) ${polyolsGrams}g per 100g — significant glycemic impact.`, ...sugarWarnings]
    : sugarWarnings;
  const rawIngredients = details.rawIngredients ?? [];
  const sweetenerMatches = findSweetenerMatches(rawIngredients);

  const handleNewScan = () => {
    resetScan();
    router.replace('/(tabs)');
  };

  const shareMessage = "Hey, I just detected a hidden sugar in so-called 'no sugar' food. You may also check this out: https://sweetlies.aboutnutrition.co.in/";
  const handleShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    Linking.openURL(url).catch(() => {});
  };

  const showClaimVerdict = claimResults.length > 0 && claimResults[0].claim !== 'No claims to verify';

  const fullReadText = (rawLabelText.length > 0 ? rawLabelText : labelText).join('\n');
  const readabilityScore = getReadabilityScore(fullReadText);
  const extractedForReadability = extractNutritionAndIngredientsOnly(fullReadText || '');
  const summaryForReadability = buildStructuredSummary(extractedForReadability, fullReadText || '');
  const hasAnyLabelData =
    extractedForReadability.nutritionBlock.trim().length > 0 ||
    extractedForReadability.ingredientsBlock.trim().length > 0 ||
    summaryForReadability.ingredients.length > 0 ||
    summaryForReadability.nutritionRows.length > 0;
  const isInconclusive = readabilityScore <= 1 && !hasAnyLabelData;
  const isLowReadability = !isInconclusive && readabilityScore >= 2 && readabilityScore <= 3;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {activeTab === 'overview' && !isInconclusive && (
        <View style={[styles.finalVerdict, sugarVerdict === 'NO_SUGAR' ? styles.finalVerdictNoSugar : styles.finalVerdictSugar]}>
          <Text style={styles.finalVerdictLabel}>Final Verdict</Text>
          <Text style={styles.finalVerdictText}>
            {sugarVerdict === 'NO_SUGAR' ? 'No Sugar is found' : 'Sugar/Sugar type is there'}
          </Text>
        </View>
      )}

      {activeTab === 'overview' && isLowReadability && (
        <View style={styles.readabilityNote}>
          <Text style={styles.readabilityNoteText}>
            Your label clarity was low. You may retry with a clearer photo of the ingredients and nutrition table.
          </Text>
        </View>
      )}

      {activeTab === 'overview' && isInconclusive && (
        <View style={styles.littleReadBanner}>
          <Text style={styles.littleReadTitle}>Inconclusive verdict</Text>
          <Text style={styles.littleReadText}>
            The label text is too unclear to verify. You may retry with a clearer photo of the ingredients and nutrition table.
          </Text>
        </View>
      )}

      {activeTab === 'overview' && !isInconclusive && sugarVerdict === 'NO_SUGAR' && sweetenerMatches.length === 0 && (
        <View style={styles.imageWarningBanner}>
          <Text style={styles.imageWarningText}>
            Try a clearer image of the ingredients list and nutrition label.
          </Text>
        </View>
      )}

      {/* Label Details tab - single tab; overview is default */}
      <View style={styles.tabBar}>
        <View style={styles.tabSpacer} />
        <Pressable
          style={[styles.tabLabelDetails, activeTab === 'nutrition' && styles.tabLabelDetailsActive]}
          onPress={() => setActiveTab(activeTab === 'nutrition' ? 'overview' : 'nutrition')}
        >
          <View style={styles.tabLabelDetailsInner}>
            <Text style={[
              styles.tabLabelDetailsText,
              activeTab === 'nutrition' && styles.tabLabelDetailsTextActive,
              activeTab !== 'nutrition' && Platform.OS === 'web' && styles.tabLabelDetailsUnderline,
            ]}>
              {activeTab === 'nutrition' ? 'Back' : 'Label Details'}
            </Text>
            {activeTab !== 'nutrition' && (
              <FontAwesome5 name="chevron-right" size={12} color="#5c1a1a" />
            )}
          </View>
        </Pressable>
      </View>

      {activeTab === 'nutrition' ? (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Summary of the label</Text>
          <Text style={styles.rawOcrHint}>Information captured under Ingredients and Nutrition Label.</Text>
          {((): React.ReactNode => {
            const fullTextLines = (rawLabelText.length > 0 ? rawLabelText : labelText).join('\n');
            const full = sanitizeLabelSummary(fullTextLines || '');
            const extractedBlocks = extractNutritionAndIngredientsOnly(full || '');
            const { ingredients, nutritionRows } = buildStructuredSummary(extractedBlocks, full);
            const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
            const fullLines = full.split('\n').map((l) => l.trim()).filter(Boolean);
            const ingredientTokens = ingredients.map((i) => normalize(i)).filter(Boolean);
            const nutrientLabels = nutritionRows.map((r) => normalize(r.label)).filter(Boolean);
            const nutrientValues = nutritionRows.map((r) => normalize(r.value)).filter(Boolean);
            const isUsedLine = (line: string) => {
              const n = normalize(line);
              if (!n) return false;
              if (n.includes('ingredients') || n.includes('nutrition')) return true;
              if (ingredientTokens.some((t) => t && n.includes(t))) return true;
              if (nutrientLabels.some((t) => t && n.includes(t))) return true;
              if (nutrientValues.some((t) => t && n.includes(t))) return true;
              return false;
            };
            const discardedLines = fullLines.filter((line) => !isUsedLine(line));

            return (
              <>
                <View style={styles.summarySection}>
                  <Text style={styles.summarySectionTitle}>Ingredients</Text>
                  <View style={styles.rawOcrBox}>
                    <Text style={styles.rawOcrText}>
                      {ingredients.length > 0
                        ? ingredients.map((line) => line.trim()).filter(Boolean).join(', ')
                        : 'Not found in this scan.'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.summarySection, { marginTop: ingredients.length > 0 ? 16 : 0 }]}>
                  <Text style={styles.summarySectionTitle}>Nutrition (per 100g or per serving)</Text>
                  {nutritionRows.length > 0 ? (
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.tableHeaderCell}>Nutrient</Text>
                        <Text style={[styles.tableHeaderCell, styles.tableValueCell]}>Value</Text>
                      </View>
                      {nutritionRows.map((r, i) => (
                        <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                          <Text style={styles.tableLabel}>{r.label}</Text>
                          <Text style={[styles.tableValue, styles.tableValueCell]}>{r.value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.rawOcrBox}>
                      <Text style={styles.rawOcrText}>Not found in this scan.</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.summarySection, { marginTop: 16 }]}>
                  <Text style={styles.summarySectionTitle}>Discarded text/phrases</Text>
                  <View style={styles.rawOcrBox}>
                    {discardedLines.length > 0 ? (
                      discardedLines.map((line, idx) => (
                        <Text key={idx} style={styles.rawOcrTextLine}>{line}</Text>
                      ))
                    ) : (
                      <Text style={styles.rawOcrText}>None</Text>
                    )}
                  </View>
                </View>
              </>
            );
          })()}
          <Pressable
            style={styles.rawOcrToggle}
            onPress={() => setShowRawOcr((v) => !v)}
          >
            <Text style={styles.rawOcrToggleText}>
              {showRawOcr ? 'Hide full scanner text' : 'Show full scanner text'}
            </Text>
          </Pressable>
          {showRawOcr && (
            <View style={styles.rawOcrBox}>
              <Text style={styles.rawOcrHint}>Unedited text from the scanner. If sugar or numbers are missing here, try a clearer photo.</Text>
              {((): React.ReactNode => {
              const fullRawText = (rawLabelText.length > 0 ? rawLabelText : labelText).join('\n');
              const full = sanitizeLabelSummary(fullRawText || '') || '(empty)';
              const lines = full.split('\n');
              if (lines.length <= 1) return <Text style={styles.rawOcrText}>{full}</Text>;
              return lines.map((line, idx) => (
                <Text key={idx} style={styles.rawOcrTextLine}>{line || ' '}</Text>
              ));
            })()}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.tabContent}>
          {/* Sugary Ingredients - more descriptive */}
          {sugarVerdict === 'SUGAR_PRESENT' && (
            <View style={[styles.ingredientsSection, styles.segmentCard]}>
              {effectiveWarnings.length > 0 && (
                <View style={styles.warningsBlock}>
                  {effectiveWarnings.map((w, i) => {
                    const isPolyolWarning = w.includes('Polyols') || w.includes('polyols');
                    return (
                      <View key={i} style={styles.warningItem}>
                        <Text style={styles.warningText}>{w}</Text>
                        {isPolyolWarning && (
                          <>
                            <Pressable
                              style={styles.readMoreBtn}
                              onPress={() => setShowPolyolReadMore((v) => !v)}
                            >
                              <Text style={styles.readMoreText}>
                                {showPolyolReadMore ? 'Read less' : 'Read more'}
                              </Text>
                              <Text style={styles.readMoreArrow}>
                                {showPolyolReadMore ? ' \u25B2' : ' \u25BC'}
                              </Text>
                            </Pressable>
                            {showPolyolReadMore && (
                              <Text style={styles.polyolEducation}>
                                Polyols, or sugar alcohols, are carbohydrates used as low-calorie
                                sweeteners that occur naturally in some fruits and vegetables.
                                Unlike high-intensity sweeteners like Stevia, many polyols are
                                partially absorbed by the body, meaning they still contribute
                                calories and trigger an insulin response. From a strict health
                                perspective, they are treated similarly to sugar because they can
                                cause significant blood glucose spikes, particularly in people
                                with diabetes.
                              </Text>
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
              {sugaryIngredients.length > 0 && (
                <>
                  <Text style={styles.segmentSectionTitle}>Sugar present?</Text>
                  <Text style={styles.whatWeFoundIntro}>These exact ingredients on the label made us say "Sugar/Sugar type is there":</Text>
                  {sugaryIngredients.map(({ verbatim, alias, info }, i) => {
                    const displayText = getCleanVerbatim(verbatim, alias);
                    return (
                    <View key={i} style={styles.ingredientCard}>
                      <Text style={styles.ingredientVerbatim}>"{displayText}"</Text>
                      <Text style={styles.ingredientName}>{info.name}</Text>
                      <Text style={styles.ingredientDesc}>{info.description}</Text>
                      {info.gi != null && (
                        <Text style={styles.ingredientGi}>Glycemic Index: {info.gi}</Text>
                      )}
                      <Text style={styles.ingredientImpact}>Blood sugar impact: {info.bloodSugarImpact}</Text>
                    </View>
                  );})}
                </>
              )}
              {sugaryIngredients.length === 0 && (
                <Text style={styles.sugarAmountNote}>
                  No specific sugary ingredients identified in the ingredients list.
                </Text>
              )}
            </View>
          )}

          {/* Artificial Sweeteners Present? - shown for every scan */}
          {!isInconclusive && (
            <View style={[styles.artSweetenerSection, styles.segmentCard]}>
              <Text style={styles.segmentSectionTitle}>Artificial Sweeteners Present?</Text>
              {sweetenerMatches.length > 0 ? (
                <>
                  <View style={styles.sweetenerTable}>
                    <View style={styles.sweetenerTableHeader}>
                      <Text style={[styles.sweetenerTableHeaderCell, styles.sweetenerColName]}>Name</Text>
                      <Text style={[styles.sweetenerTableHeaderCell, styles.sweetenerColCategory]}>Category</Text>
                      <Text style={[styles.sweetenerTableHeaderCell, styles.sweetenerColGi]}>GI</Text>
                      <Text style={[styles.sweetenerTableHeaderCell, styles.sweetenerColCal]}>Cal/g</Text>
                    </View>
                    {sweetenerMatches.map(({ verbatim, info }, i) => {
                      const rowStyle =
                        info.safetyCategory === 'Safe Sweetener'
                          ? styles.sweetenerRowSafe
                          : info.safetyCategory === 'Moderate GI'
                            ? styles.sweetenerRowModerate
                            : styles.sweetenerRowHigh;
                      return (
                        <View key={i} style={[styles.sweetenerTableRow, rowStyle]}>
                          <View style={styles.sweetenerNameCell}>
                            <Text style={[styles.sweetenerTableCell, styles.sweetenerColName]}>{info.name}</Text>
                            <Pressable
                              style={styles.sweetenerInfoIcon}
                              onPress={() => setFactCardSweetener(info)}
                              hitSlop={8}
                            >
                              <FontAwesome5 name="info-circle" size={16} color="#94a3b8" />
                            </Pressable>
                          </View>
                          <Text style={[styles.sweetenerTableCell, styles.sweetenerColCategory]}>{info.safetyCategory}</Text>
                          <Text style={[styles.sweetenerTableCell, styles.sweetenerColGi]}>{info.gi}</Text>
                          <Text style={[styles.sweetenerTableCell, styles.sweetenerColCal]}>{info.calPerG}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {sweetenerMatches.some((m) => m.info.isMaltitol) && (
                    <Text style={styles.maltitolAlert}>
                      Note: Contains High GI sweetener that may impact blood glucose levels.
                    </Text>
                  )}
                  <Text style={styles.sweetenerFoundAs}>
                    Found as: {sweetenerMatches.map((m) => `"${m.verbatim}"`).join(', ')}
                  </Text>
                </>
              ) : (
                <Text style={styles.artSweetenerNone}>
                  No sweeteners (artificial or polyols) were identified in the ingredients.
                </Text>
              )}
            </View>
          )}

          {/* Claim verification */}
          {showClaimVerdict && (
            <View style={[styles.claimSection, styles.segmentCard]}>
              <Text style={styles.segmentSectionTitle}>What about product claim?</Text>
              {claimResults.map((r, i) => {
                const edu = getClaimEducation(r.claim);
                return (
                <View key={i} style={styles.claimRow}
                >
                  <Text style={styles.claimNameHighlight}>{r.claim}</Text>
                  {!isInconclusive && r.reason ? (
                    <View style={styles.verdictBlock}>
                      <Text style={styles.verdictBlockTitle}>What we found</Text>
                      <Text style={styles.reasonProminent}>{r.reason}</Text>
                    </View>
                  ) : null}
                  {edu && (
                    <>
                      <Pressable
                        style={styles.claimEducationToggle}
                        onPress={() => setShowClaimEducation((v) => !v)}
                      >
                        <Text style={styles.claimEducationToggleText}>
                          {showClaimEducation ? 'Hide' : 'Learn more about this claim'}
                        </Text>
                        <FontAwesome5 name={showClaimEducation ? 'chevron-up' : 'chevron-down'} size={14} color="#5c1a1a" />
                      </Pressable>
                      {showClaimEducation && (
                        <View style={styles.claimEducation}>
                          <Text style={styles.eduLabel}>What made them say this</Text>
                          <Text style={styles.eduText}>{edu.whatMadeThemSay}</Text>
                          <Text style={[styles.eduLabel, { marginTop: 12 }]}>Where the catch is</Text>
                          <Text style={styles.eduText}>{edu.whereTheLieIs}</Text>
                          <Text style={styles.eduTakeaway}>{edu.takeaway}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );})}
            </View>
          )}
        </View>
      )}

      <View style={styles.bottomActions}>
        <Pressable style={styles.newScanBtn} onPress={handleNewScan}>
          <Text style={styles.newScanText}>Check another product</Text>
        </Pressable>
        <View style={styles.feedbackRow}>
          <Pressable style={styles.shareBtn} onPress={handleShare}>
            <FontAwesome5 name="whatsapp" size={18} color="#25D366" solid />
            <Text style={styles.shareBtnText}>Share</Text>
          </Pressable>
          {Platform.OS === 'web' && (
            <>
              <Pressable
                style={[styles.likeBtn, hasLiked && styles.likeBtnDisabled]}
                onPress={handleLike}
                onLongPress={async () => { await clearLikedState(); setHasLiked(false); }}
                disabled={hasLiked || likeLoading}
              >
                {likeLoading ? (
                  <ActivityIndicator size="small" color="#64748b" />
                ) : (
                  <FontAwesome5 name="heart" size={16} color={hasLiked ? '#dc2626' : '#64748b'} solid={hasLiked} />
                )}
                <Text style={styles.likeBtnText}>{hasLiked ? 'Liked' : 'Like'}</Text>
                <Text style={styles.likeCountText}>({likeCount})</Text>
              </Pressable>
              <Pressable style={styles.feedbackBtn} onPress={handleOpenFeedback}>
                <FontAwesome5 name="comment-alt" size={16} color="#64748b" />
                <Text style={styles.shareBtnText}>Feedback</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>

      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFeedbackModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Send feedback</Text>
            {feedbackBlocked ? (
              <Text style={styles.modalHint}>You can send one feedback per 24 hours. Try again later.</Text>
            ) : feedbackSubmitted ? (
              <Text style={styles.modalSuccess}>Thank you! Your feedback has been received.</Text>
            ) : (
              <>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Your feedback (anonymous, max 500 chars)"
                  placeholderTextColor="#94a3b8"
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  multiline
                  maxLength={500}
                  editable={!feedbackSubmitting}
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalCancelBtn} onPress={() => setShowFeedbackModal(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalSubmitBtn, (!feedbackText.trim() || feedbackSubmitting) && styles.modalSubmitDisabled]}
                    onPress={handleSubmitFeedback}
                    disabled={!feedbackText.trim() || feedbackSubmitting}
                  >
                    {feedbackSubmitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Send</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sweetener fact card modal */}
      <Modal
        visible={factCardSweetener !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFactCardSweetener(null)}
      >
        <Pressable style={styles.factCardOverlay} onPress={() => setFactCardSweetener(null)}>
          <Pressable style={[styles.factCard, { maxHeight: Dimensions.get('window').height * 0.5 }]} onPress={(e) => e.stopPropagation()}>
            {factCardSweetener && (() => {
              const content = getSweetenerFactCard(factCardSweetener.name);
              if (!content) {
                return (
                  <>
                    <View style={styles.factCardHeader}>
                      <Text style={styles.factCardTitle}>{factCardSweetener.name}</Text>
                      <Pressable onPress={() => setFactCardSweetener(null)} hitSlop={12} style={styles.factCardCloseBtn}>
                        <FontAwesome5 name="times" size={20} color="#64748b" />
                      </Pressable>
                    </View>
                    <Text style={styles.factCardBody}>No fact card available.</Text>
                  </>
                );
              }
              const segments = getFactCardSegments(content);
              return (
                <>
                  <View style={styles.factCardHeader}>
                    <Text style={styles.factCardTitle}>{factCardSweetener.name}</Text>
                    <Pressable onPress={() => setFactCardSweetener(null)} hitSlop={12} style={styles.factCardCloseBtn}>
                      <FontAwesome5 name="times" size={20} color="#64748b" />
                    </Pressable>
                  </View>
                  <ScrollView style={styles.factCardScroll} showsVerticalScrollIndicator>
                    <View style={styles.factCardBodyWrap}>
                      {segments.flatMap((seg, idx) => {
                        const baseStyle = seg.isSpikeWarning ? styles.factCardSpikeWarning : styles.factCardBody;
                        return seg.text.split('\n').map((line, lineIdx) => {
                          if (!line.trim()) {
                            return <View key={`${idx}-${lineIdx}`} style={styles.factCardLineGap} />;
                          }
                          const lineStyle = getFactCardLineStyle(line);
                          const displayText = lineStyle === 'bullet' ? line.replace(/^\s*•\s*/, '') : line;
                          if (lineStyle === 'intro') {
                            const introMatch = displayText.match(/^(The [^:]+:)\s*(.*)$/);
                            const [headerPart, bodyPart] = introMatch
                              ? [introMatch[1], introMatch[2]]
                              : [displayText, ''];
                            return (
                              <Text key={`${idx}-${lineIdx}`}>
                                <Text style={styles.factCardIntroHeader}>{headerPart} </Text>
                                {bodyPart ? (
                                  <Text style={baseStyle}>
                                    {seg.isSpikeWarning ? bodyPart : (() => {
                                      const parts = getInlineSpikeParts(bodyPart);
                                      return parts.some(p => p.isSpike)
                                        ? parts.map((p, i) =>
                                            p.isSpike ? (
                                              <Text key={i} style={styles.factCardSpikeWarning}>{p.text}</Text>
                                            ) : (
                                              p.text
                                            )
                                          )
                                        : bodyPart;
                                    })()}
                                  </Text>
                                ) : null}
                              </Text>
                            );
                          }
                          if (lineStyle === 'bullet') {
                            const bulletMatch = displayText.match(/^(Safety|Gut):\s*(.*)$/);
                            const [headerPart, bodyPart] = bulletMatch
                              ? [`${bulletMatch[1]}:`, bulletMatch[2].trimStart()]
                              : [displayText, ''];
                            return (
                              <Text key={`${idx}-${lineIdx}`}>
                                <Text style={styles.factCardBulletHeader}>{headerPart} </Text>
                                {bodyPart ? (
                                  <Text style={baseStyle}>{bodyPart}</Text>
                                ) : null}
                              </Text>
                            );
                          }
                          if (lineStyle === 'body' && !seg.isSpikeWarning) {
                            const parts = getInlineSpikeParts(displayText);
                            if (parts.some(p => p.isSpike)) {
                              return (
                                <Text key={`${idx}-${lineIdx}`} style={styles.factCardBody}>
                                  {parts.map((p, i) =>
                                    p.isSpike ? (
                                      <Text key={i} style={styles.factCardSpikeWarning}>{p.text}</Text>
                                    ) : (
                                      p.text
                                    )
                                  )}
                                </Text>
                              );
                            }
                          }
                          return (
                            <Text key={`${idx}-${lineIdx}`} style={baseStyle}>
                              {displayText}
                            </Text>
                          );
                        });
                      })}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  finalVerdict: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderLeftWidth: 14,
    marginBottom: 20,
  },
  finalVerdictNoSugar: {
    backgroundColor: '#dcfce7',
    borderLeftColor: '#16a34a',
  },
  finalVerdictSugar: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#dc2626',
  },
  finalVerdictLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  finalVerdictText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  littleReadBanner: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  littleReadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  littleReadText: {
    fontSize: 14,
    color: '#b45309',
    lineHeight: 21,
  },
  readabilityNote: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  readabilityNoteText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    textAlign: 'center',
  },
  imageWarningBanner: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  imageWarningText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400e',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  tabSpacer: {
    flex: 1,
  },
  tabLabelDetails: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  tabLabelDetailsActive: {
    backgroundColor: '#3d1f1a',
    borderColor: '#3d1f1a',
  },
  tabLabelDetailsInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabelDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c1a1a',
  },
  tabLabelDetailsUnderline: {
    textDecorationLine: 'underline' as const,
  },
  tabLabelDetailsTextActive: {
    color: '#fff',
  },
  tabContent: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  segmentSectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12, textAlign: 'center' as const },
  summarySection: { marginBottom: 16 },
  summarySectionTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  noData: { padding: 20, fontSize: 14, color: '#64748b', lineHeight: 21 },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: { fontSize: 14, fontWeight: '600', color: '#475569' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableLabel: { fontSize: 14, color: '#1e293b', flex: 1 },
  tableValue: { fontSize: 14, color: '#475569' },
  tableValueCell: { width: 90, textAlign: 'right' },
  rawOcrHint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  rawOcrBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rawOcrToggle: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  rawOcrToggleText: {
    fontSize: 14,
    color: '#722F37',
    fontWeight: '600',
  },
  rawOcrText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  rawOcrTextLine: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 2,
  },
  whatWeFoundIntro: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  warningsBlock: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#d97706',
  },
  warningItem: {
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 21,
    marginBottom: 4,
  },
  readMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    paddingRight: 4,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b45309',
  },
  readMoreArrow: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b45309',
    marginLeft: 2,
  },
  polyolEducation: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 21,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(180, 83, 9, 0.3)',
  },
  segmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    padding: 16,
    marginBottom: 20,
  },
  ingredientsSection: { marginBottom: 24 },
  ingredientCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ingredientVerbatim: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  ingredientDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 6,
  },
  ingredientGi: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  ingredientImpact: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sugarAmountNote: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  artSweetenerSection: {
    marginBottom: 24,
  },
  artSweetenerIntro: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    marginBottom: 16,
  },
  artSweetenerCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  artSweetenerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  artSweetenerMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  artSweetenerGi: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  artSweetenerSpike: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  artSweetenerNote: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 8,
  },
  artSweetenerVerbatim: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  artSweetenerNone: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 22,
  },
  sweetenerTable: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sweetenerTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sweetenerTableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sweetenerTableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sweetenerRowSafe: {
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  sweetenerRowModerate: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  sweetenerRowHigh: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  sweetenerTableCell: {
    fontSize: 14,
    color: '#334155',
  },
  sweetenerNameCell: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sweetenerInfoIcon: {
    padding: 4,
    alignSelf: 'center',
  },
  sweetenerColName: { flex: 1.2 },
  sweetenerColCategory: { flex: 1.1 },
  sweetenerColGi: { flex: 0.5 },
  sweetenerColCal: { flex: 0.5 },
  maltitolAlert: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  sweetenerFoundAs: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  claimSection: { marginTop: 8 },
  claimRow: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  claimRowPass: { borderLeftColor: '#22c55e' },
  claimRowFail: { borderLeftColor: '#dc2626' },
  claimName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  claimNameHighlight: { fontSize: 16, fontWeight: '700', color: '#7c2d12', marginBottom: 12 },
  claimEducation: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eduLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  eduText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
  },
  eduTakeaway: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
    fontStyle: 'italic',
  },
  verdictBlock: { gap: 8, marginTop: 4 },
  verdictBlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  claimEducationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 0,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  claimEducationToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c1a1a',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  badgePass: { backgroundColor: '#dcfce7' },
  badgeFail: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextPass: { color: '#166534' },
  badgeTextFail: { color: '#dc2626' },
  reason: { fontSize: 14, color: '#475569', lineHeight: 20 },
  reasonProminent: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 22,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
  },
  dailyText: { fontSize: 14, color: '#1e293b', marginBottom: 6 },
  bottomActions: { marginTop: 8, gap: 12 },
  newScanBtn: { backgroundColor: '#3d1f1a', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  newScanText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  feedbackRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  shareBtnText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  likeBtnDisabled: { opacity: 0.8 },
  likeBtnText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  likeCountText: { fontSize: 13, color: '#94a3b8' },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  modalHint: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  modalSuccess: { fontSize: 15, color: '#16a34a', fontWeight: '500' },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  modalSubmitBtn: {
    backgroundColor: '#3d1f1a',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  modalSubmitDisabled: { opacity: 0.6 },
  modalSubmitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  factCardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  factCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fefaf9',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8ddd9',
    borderLeftWidth: 4,
    borderLeftColor: '#7c2d12',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  factCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e8ddd9',
    backgroundColor: '#f9f0ee',
  },
  factCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5c1a1a',
  },
  factCardCloseBtn: {
    padding: 4,
  },
  factCardScroll: {
    maxHeight: '100%',
  },
  factCardBodyWrap: {
    padding: 20,
    paddingBottom: 24,
  },
  factCardLineGap: {
    height: 8,
  },
  factCardIntroHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5c1a1a',
    lineHeight: 22,
    marginBottom: 8,
  },
  factCardBulletHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5c1a1a',
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 4,
  },
  factCardBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 6,
  },
  factCardSpikeWarning: {
    fontSize: 14,
    color: '#dc2626',
    lineHeight: 21,
    marginBottom: 6,
    fontWeight: '600',
  },
});
