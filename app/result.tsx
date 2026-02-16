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
} from 'react-native';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams } from 'expo-router';
import { useScan } from '@/src/context/ScanContext';
import { evaluateClaims } from '@/src/rules/evaluateClaims';
import { getSugarVerdict, getSugaryIngredientsWithInfo, getSugarWarning } from '@/src/rules/sugarVerdict';
import { extractNutritionAndIngredientsOnly, parseStructuredSummary } from '@/src/utils/extractNutritionSections';
import { getClaimEducation } from '@/src/knowledge/claimEducation';
import { findArtificialSweetenerMatches } from '@/src/parser/ingredientsParser';
import {
  getLikeCount,
  incrementLike,
  hasUserLiked,
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

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    labelText?: string;
    selectedClaim?: string;
    claimLabel?: string;
    claimEvaluatorKey?: string;
  }>();
  const { resetScan, labelText: contextLabelText } = useScan();

  const labelText = (() => {
    if (contextLabelText && contextLabelText.length > 0) {
      return contextLabelText;
    }
    if (params.labelText) {
      try {
        return JSON.parse(params.labelText) as string[];
      } catch {
        return [];
      }
    }
    return [];
  })();

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
      const short = result.error.length > 80 ? result.error.slice(0, 80) + '...' : result.error;
      Alert.alert('Could not save like', `Error: ${short}\n\nCheck Firebase Console: Realtime Database > Rules (must allow write on likes/count).`);
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
  const extractedForEval = extractNutritionAndIngredientsOnly(labelCombined);

  const claimsToVerify = claimEvaluatorKey ? [claimEvaluatorKey] : [];
  const textForEval = extractedForEval.trim().length > 0 ? [extractedForEval] : labelText!;
  const evaluation = evaluateClaims(textForEval, [], claimsToVerify);
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
  const artificialSweetenerMatches = sugarVerdict === 'NO_SUGAR'
    ? findArtificialSweetenerMatches(rawIngredients)
    : [];

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

  const rawLength = labelCombined.length;
  const hasNutritionKeywords = /sugar|ingredient|calorie|energy|fat|protein|carb|sodium|per\s*100|kcal|\d+\s*g\b/i.test(labelCombined);
  const readVeryLittle = rawLength < 120 || !hasNutritionKeywords;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. FINAL VERDICT - only in overview tab; Nutrition Info tab shows raw table only */}
      {activeTab === 'overview' && !readVeryLittle && (
        <View style={[styles.finalVerdict, sugarVerdict === 'NO_SUGAR' ? styles.finalVerdictNoSugar : styles.finalVerdictSugar]}>
          <Text style={styles.finalVerdictLabel}>Final Verdict</Text>
          <Text style={styles.finalVerdictText}>
            {sugarVerdict === 'NO_SUGAR' ? 'No Sugar is found' : 'Sugar is there'}
          </Text>
        </View>
      )}

      {activeTab === 'overview' && readVeryLittle && (
        <View style={styles.littleReadBanner}>
          <Text style={styles.littleReadTitle}>We only read a small amount from this photo</Text>
          <Text style={styles.littleReadText}>
            For better results: use a clear, flat photo of the full ingredients list and nutrition table; avoid glare. Try another photo focused on the label text.
          </Text>
        </View>
      )}

      {/* 2. Tabs: Tell me more | Label Details */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Read below</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'nutrition' && styles.tabActive]}
          onPress={() => setActiveTab('nutrition')}
        >
          <Text style={[styles.tabText, activeTab === 'nutrition' && styles.tabTextActive]}>Label Details</Text>
        </Pressable>
      </View>

      {activeTab === 'nutrition' ? (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Summary of the label</Text>
          <Text style={styles.rawOcrHint}>Information captured under Ingredients and Nutrition Label.</Text>
          {((): React.ReactNode => {
            const extracted = sanitizeLabelSummary(extractNutritionAndIngredientsOnly(labelCombined || '') || '');
            let { ingredients, nutritionRows } = parseStructuredSummary(extracted);
            if (ingredients.length === 0 && nutritionRows.length === 0 && (labelCombined?.length ?? 0) > 80) {
              const rawParsed = parseStructuredSummary(sanitizeLabelSummary(labelCombined || ''));
              if (rawParsed.ingredients.length > 0 || rawParsed.nutritionRows.length > 0) {
                ingredients = rawParsed.ingredients;
                nutritionRows = rawParsed.nutritionRows;
              }
            }
            const hasAny = ingredients.length > 0 || nutritionRows.length > 0;

            if (!hasAny) {
              return (
                <View style={styles.rawOcrBox}>
                  <Text style={styles.noData}>We couldn&apos;t extract clear ingredients or nutrition from this photo. Try a clearer image of the ingredients list and nutrition label.</Text>
                </View>
              );
            }

            return (
              <>
                {ingredients.length > 0 && (
                  <View style={styles.summarySection}>
                    <Text style={styles.summarySectionTitle}>Ingredients</Text>
                    <View style={styles.rawOcrBox}>
                      <Text style={styles.rawOcrText}>
                        {ingredients.map((line) => line.trim()).filter(Boolean).join(', ')}
                      </Text>
                    </View>
                  </View>
                )}
                {nutritionRows.length > 0 && (
                  <View style={[styles.summarySection, { marginTop: ingredients.length > 0 ? 16 : 0 }]}>
                    <Text style={styles.summarySectionTitle}>Nutrition (per 100g or per serving)</Text>
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
                  </View>
                )}
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
              const full = sanitizeLabelSummary(labelCombined || '') || '(empty)';
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
            <View style={styles.ingredientsSection}>
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
                  <Text style={styles.sectionTitle}>What we found</Text>
                  <Text style={styles.whatWeFoundIntro}>These exact ingredients on the label made us say "Sugar is there":</Text>
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

          {/* If no sugar, what is making this sweet? */}
          {sugarVerdict === 'NO_SUGAR' && !readVeryLittle && (
            <View style={styles.artSweetenerSection}>
              <Text style={styles.artSweetenerSectionTitle}>If no sugar, what is making this sweet?</Text>
              {artificialSweetenerMatches.length > 0 ? (
                <>
                  <Text style={styles.artSweetenerIntro}>
                    These sweeteners were found in the ingredients — they provide sweetness without raising blood sugar like regular sugar.
                  </Text>
                  {artificialSweetenerMatches.map(({ verbatim, info }, i) => (
                    <View key={i} style={styles.artSweetenerCard}>
                      <Text style={styles.artSweetenerName}>{info.name}</Text>
                      <View style={styles.artSweetenerMeta}>
                        <Text style={styles.artSweetenerGi}>GI: {info.giValue}</Text>
                        <Text style={styles.artSweetenerSpike}>Blood sugar spike: {info.bloodSugarSpike}</Text>
                      </View>
                      <Text style={styles.artSweetenerNote}>{info.note}</Text>
                      <Text style={styles.artSweetenerVerbatim}>Found as: "{verbatim}"</Text>
                    </View>
                  ))}
                </>
              ) : (
                <Text style={styles.artSweetenerNone}>
                  No artificial sweeteners were identified in the ingredients. The product may use other additives, flavorings, or the sweetness could come from ingredients we didn&apos;t detect.
                </Text>
              )}
            </View>
          )}

          {/* Claim verification */}
          {showClaimVerdict && (
            <View style={styles.claimSection}>
              <Text style={styles.sectionTitle}>Claim verification</Text>
              {claimResults.map((r, i) => {
                const edu = getClaimEducation(r.claim);
                return (
                <View key={i} style={styles.claimRow}
                >
                  <Text style={styles.claimNameHighlight}>{r.claim}</Text>
                  {edu && (
                    <View style={styles.claimEducation}>
                      <Text style={styles.eduLabel}>What made them say this</Text>
                      <Text style={styles.eduText}>{edu.whatMadeThemSay}</Text>
                      <Text style={[styles.eduLabel, { marginTop: 12 }]}>Where the lie is</Text>
                      <Text style={styles.eduText}>{edu.whereTheLieIs}</Text>
                      <Text style={styles.eduTakeaway}>{edu.takeaway}</Text>
                    </View>
                  )}
                  {!readVeryLittle && r.reason ? (
                    <View style={styles.verdictBlock}>
                      <Text style={styles.reasonProminent}>{r.reason}</Text>
                    </View>
                  ) : null}
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
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3d1f1a',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
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
  artSweetenerSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 12,
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
});
