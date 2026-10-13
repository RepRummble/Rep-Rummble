import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription, PLAN_PRICES } from '../context/SubscriptionContext';
import { PlanId } from '../types';

import { colors } from '../theme/colors';
const { width: SW } = Dimensions.get('window');

// ── Feature table data ────────────────────────────────────────────────────────

const FEATURES: Array<{ label: string; free: string | boolean; pro: string | boolean; premium: string | boolean; icon: string }> = [
  { icon: 'camera',           label: 'AI Meal Scans',          free: '3 / day',      pro: 'Unlimited',    premium: 'Unlimited'    },
  { icon: 'search',           label: 'Food Search',            free: true,           pro: true,           premium: true           },
  { icon: 'barbell',          label: 'Workout Logging',        free: true,           pro: true,           premium: true           },
  { icon: 'chatbubble',       label: 'AI Coach Chat',          free: '5 msgs / day', pro: 'Unlimited',    premium: 'Unlimited'    },
  { icon: 'nutrition',        label: 'Micronutrients',         free: false,          pro: true,           premium: true           },
  { icon: 'trophy',           label: 'Full Leaderboard',       free: 'Top 10 only',  pro: true,           premium: true           },
  { icon: 'watch',            label: 'Wearable Sync',          free: false,          pro: '1 device',     premium: 'All devices'  },
  { icon: 'people',           label: 'Create Challenges',      free: false,          pro: true,           premium: true           },
  { icon: 'stats-chart',      label: 'Advanced Analytics',     free: false,          pro: false,          premium: true           },
  { icon: 'sparkles',         label: 'Personalised Plans',     free: false,          pro: false,          premium: true           },
  { icon: 'headset',          label: 'Priority Support',       free: false,          pro: false,          premium: true           },
  { icon: 'ribbon',           label: 'Premium Profile Badge',  free: false,          pro: false,          premium: true           },
];

// ── Plan card config ──────────────────────────────────────────────────────────

interface PlanCard {
  id: PlanId;
  name: string;
  tag: string;
  colors: readonly [string, string];
  border: string;
  textColor: string;
  badge?: string;
  badgeColor?: string;
  highlights: string[];
}

const PLANS: PlanCard[] = [
  {
    id: 'free',
    name: 'Free',
    tag: 'Get started — no card needed',
    colors: [colors.surface, colors.surface],
    border: colors.border,
    textColor: colors.muted,
    highlights: ['3 AI scans/day', '5 AI chat messages/day', 'Basic workout log', 'Top-10 leaderboard'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'Best for serious athletes',
    colors: [colors.brandSoft, colors.brandSoft],
    border: colors.brand,
    textColor: colors.brand,
    badge: 'MOST POPULAR',
    badgeColor: colors.brand,
    highlights: ['Unlimited AI meal scans', 'Unlimited AI coach chat', 'Full leaderboard access', 'Connect 1 wearable device', 'Create & join challenges', 'Micronutrient tracking'],
  },
  {
    id: 'premium',
    name: 'Premium',
    tag: 'Everything, unlocked',
    colors: [colors.warningSoft, colors.warningSoft],
    border: colors.warning,
    textColor: colors.warning,
    badge: 'ALL-IN',
    badgeColor: colors.warning,
    highlights: ['Everything in Pro', 'Personalised AI training plans', 'Advanced analytics dashboard', 'Sync unlimited wearables', 'Priority 24/7 support', 'Premium profile badge'],
  },
];

// ── Cell renderer ─────────────────────────────────────────────────────────────

function Cell({ val }: { val: string | boolean }) {
  if (val === true) return <Ionicons name="checkmark-circle" size={18} color={colors.success} />;
  if (val === false) return <Ionicons name="close-circle" size={18} color={colors.faint} />;
  return <Text style={st.cellText}>{val as string}</Text>;
}

// ── Paywall modal (reusable) ──────────────────────────────────────────────────

export function PaywallModal({
  visible, onClose, feature, requiredPlan = 'pro',
}: {
  visible: boolean;
  onClose: () => void;
  feature: string;
  requiredPlan?: 'pro' | 'premium';
}) {
  const navigation = useNavigation();
  const planName = requiredPlan === 'pro' ? 'Pro' : 'Premium';
  const planColor = requiredPlan === 'pro' ? colors.brand : colors.warning;
  const planColors: readonly [string, string] = requiredPlan === 'pro'
    ? [colors.brandSoft, colors.brandSoft]
    : [colors.warningSoft, colors.warningSoft];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalSheet}>
          <LinearGradient colors={planColors} style={st.modalGrad}>
            <View style={st.modalHandle} />

            <View style={[st.modalIconWrap, { backgroundColor: planColor + '30', borderColor: planColor + '60' }]}>
              <Ionicons name="lock-closed" size={28} color={planColor} />
            </View>

            <Text style={st.modalTitle}>{planName} Feature</Text>
            <Text style={st.modalBody}>
              <Text style={{ color: colors.ink, fontWeight: '700' }}>{feature}</Text>
              {' '}is available on the {planName} plan.{'\n'}Upgrade to unlock this and much more.
            </Text>

            <TouchableOpacity
              style={st.modalCta}
              onPress={() => {
                onClose();
                (navigation as any).navigate('Subscription');
              }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={planColors.map(c => c) as any} style={[st.modalCtaGrad, { borderColor: planColor + '80', borderWidth: 1 }]}>
                <Ionicons name="sparkles" size={16} color={planColor} />
                <Text style={[st.modalCtaText, { color: planColor }]}>View {planName} Plans</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={st.modalSkip}>
              <Text style={st.modalSkipText}>Maybe later</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

// ── Main SubscriptionScreen ───────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const navigation = useNavigation();
  const { plan: currentPlan, setPlan } = useSubscription();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [selected, setSelected] = useState<PlanId>(currentPlan === 'free' ? 'pro' : currentPlan);

  const handleSubscribe = (planId: PlanId) => {
    if (planId === 'free') {
      Alert.alert('Downgrade', 'Downgrade to Free plan?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Downgrade', style: 'destructive', onPress: () => { setPlan('free'); (navigation as any).goBack(); } },
      ]);
      return;
    }

    const plan = PLANS.find(p => p.id === planId)!;
    const price = billing === 'monthly' ? PLAN_PRICES[planId].monthly : PLAN_PRICES[planId].annual;
    const period = billing === 'monthly' ? '/month' : '/year';

    Alert.alert(
      `Subscribe to ${plan.name}`,
      `$${price}${period}\n\nThis is a demo — no real payment is processed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe', onPress: () => {
            setPlan(planId);
            Alert.alert('Welcome to ' + plan.name + '!', 'Your plan has been activated.', [
              { text: 'Awesome!', onPress: () => (navigation as any).goBack() },
            ]);
          },
        },
      ]
    );
  };

  const savings = (planId: PlanId) => {
    if (planId === 'free') return null;
    const m = PLAN_PRICES[planId].monthly * 12;
    const a = PLAN_PRICES[planId].annual;
    return Math.round(((m - a) / m) * 100);
  };

  return (
    <View style={st.root}>
      <LinearGradient colors={[colors.bg, colors.bg, colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation as any).goBack()} style={st.backBtn}>
            <Ionicons name="chevron-down" size={24} color={colors.muted} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Plans & Pricing</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

          {/* Hero */}
          <View style={st.hero}>
            <LinearGradient colors={[colors.brand, colors.tealMid]} style={st.heroIcon}>
              <Ionicons name="barbell" size={28} color={colors.white} />
            </LinearGradient>
            <Text style={st.heroTitle}>Level Up Your Fitness</Text>
            <Text style={st.heroSub}>Choose the plan that fits your grind</Text>
          </View>

          {/* Current plan badge */}
          <View style={st.currentRow}>
            <Text style={st.currentLabel}>Current plan:</Text>
            <View style={st.currentBadge}>
              <Text style={st.currentBadgeText}>{currentPlan.toUpperCase()}</Text>
            </View>
          </View>

          {/* Billing toggle */}
          <View style={st.billingToggle}>
            {(['monthly', 'annual'] as const).map(b => (
              <TouchableOpacity
                key={b}
                style={[st.billingBtn, billing === b && st.billingBtnActive]}
                onPress={() => setBilling(b)}
              >
                <Text style={[st.billingBtnText, billing === b && st.billingBtnTextActive]}>
                  {b === 'monthly' ? 'Monthly' : 'Annual'}
                </Text>
                {b === 'annual' && (
                  <View style={st.savingsBadge}>
                    <Text style={st.savingsBadgeText}>Save up to 33%</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Plan Cards */}
          {PLANS.map(plan => {
            const price = PLAN_PRICES[plan.id];
            const shown = billing === 'monthly' ? price.monthly : price.annual;
            const isSelected = selected === plan.id;
            const isCurrent = currentPlan === plan.id;
            const save = savings(plan.id);

            return (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.85}
                onPress={() => setSelected(plan.id)}
                style={[st.planCard, isSelected && { borderColor: plan.border, borderWidth: 2 }]}
              >
                <LinearGradient colors={plan.colors} style={st.planCardInner}>

                  {/* Top row: name + badge */}
                  <View style={st.planTop}>
                    <View>
                      <View style={st.planNameRow}>
                        <Text style={[st.planName, { color: plan.textColor }]}>{plan.name}</Text>
                        {plan.badge && (
                          <View style={[st.planBadge, { backgroundColor: plan.badgeColor + '30', borderColor: plan.badgeColor + '60' }]}>
                            <Text style={[st.planBadgeText, { color: plan.badgeColor }]}>{plan.badge}</Text>
                          </View>
                        )}
                        {isCurrent && (
                          <View style={st.currentPill}>
                            <Ionicons name="checkmark-circle" size={12} color={colors.success} />
                            <Text style={st.currentPillText}>Active</Text>
                          </View>
                        )}
                      </View>
                      <Text style={st.planTag}>{plan.tag}</Text>
                    </View>

                    {/* Price */}
                    <View style={{ alignItems: 'flex-end' }}>
                      {shown === 0 ? (
                        <Text style={[st.planPrice, { color: plan.textColor }]}>Free</Text>
                      ) : (
                        <>
                          <View style={st.priceRow}>
                            <Text style={[st.planPriceDollar, { color: plan.textColor }]}>$</Text>
                            <Text style={[st.planPrice, { color: plan.textColor }]}>{shown}</Text>
                          </View>
                          <Text style={st.planPricePer}>/{billing === 'monthly' ? 'mo' : 'yr'}</Text>
                        </>
                      )}
                      {billing === 'annual' && save && (
                        <View style={[st.saveTag, { backgroundColor: plan.border + '30' }]}>
                          <Text style={[st.saveTagText, { color: plan.textColor }]}>Save {save}%</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Highlights */}
                  <View style={st.highlights}>
                    {plan.highlights.map((h, i) => (
                      <View key={i} style={st.highlightRow}>
                        <Ionicons name="checkmark-circle" size={15} color={plan.border} />
                        <Text style={[st.highlightText, { color: plan.textColor }]}>{h}</Text>
                      </View>
                    ))}
                  </View>

                  {/* CTA */}
                  <TouchableOpacity
                    onPress={() => handleSubscribe(plan.id)}
                    activeOpacity={0.85}
                    style={{ marginTop: 16 }}
                  >
                    {isCurrent ? (
                      <View style={[st.ctaOutline, { borderColor: plan.border }]}>
                        <Ionicons name="checkmark-circle" size={16} color={plan.textColor} />
                        <Text style={[st.ctaOutlineText, { color: plan.textColor }]}>Current Plan</Text>
                      </View>
                    ) : plan.id === 'free' ? (
                      <View style={[st.ctaOutline, { borderColor: colors.borderStrong }]}>
                        <Text style={[st.ctaOutlineText, { color: colors.faint }]}>Downgrade to Free</Text>
                      </View>
                    ) : (
                      <LinearGradient
                        colors={[plan.border, plan.border + 'cc']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={st.ctaBtn}
                      >
                        <Text style={st.ctaBtnText}>Get {plan.name}</Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.white} />
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}

          {/* Feature comparison table */}
          <Text style={st.tableTitle}>Full Feature Comparison</Text>
          <View style={st.table}>
            {/* Header */}
            <View style={[st.tableRow, st.tableHeader]}>
              <Text style={[st.tableCell, st.tableCellFeature, st.tableHeaderText]}>Feature</Text>
              <Text style={[st.tableCell, st.tableCellPlan, st.tableHeaderText]}>Free</Text>
              <Text style={[st.tableCell, st.tableCellPlan, st.tableHeaderText, { color: colors.brand }]}>Pro</Text>
              <Text style={[st.tableCell, st.tableCellPlan, st.tableHeaderText, { color: colors.warning }]}>Premium</Text>
            </View>

            {FEATURES.map((f, i) => (
              <View key={i} style={[st.tableRow, i % 2 === 0 && st.tableRowAlt]}>
                <View style={[st.tableCell, st.tableCellFeature, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <Ionicons name={f.icon as any} size={13} color={colors.faint} />
                  <Text style={st.tableCellText}>{f.label}</Text>
                </View>
                <View style={[st.tableCell, st.tableCellPlan, { alignItems: 'center' }]}><Cell val={f.free} /></View>
                <View style={[st.tableCell, st.tableCellPlan, { alignItems: 'center' }]}><Cell val={f.pro} /></View>
                <View style={[st.tableCell, st.tableCellPlan, { alignItems: 'center' }]}><Cell val={f.premium} /></View>
              </View>
            ))}
          </View>

          {/* FAQ */}
          <Text style={st.tableTitle}>Common Questions</Text>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel at any time from your Profile screen. You keep access until the end of the billing period.' },
            { q: 'Is my payment secure?', a: 'All payments are processed via Apple Pay / Google Pay / Stripe. We never store card details.' },
            { q: 'Can I switch plans?', a: 'Yes. Upgrade or downgrade anytime. Upgrades take effect immediately; downgrades apply at renewal.' },
            { q: 'Is there a free trial?', a: 'Pro and Premium both include a 7-day free trial for new subscribers. No charge until the trial ends.' },
          ].map((item, i) => (
            <View key={i} style={st.faqItem}>
              <Text style={st.faqQ}>{item.q}</Text>
              <Text style={st.faqA}>{item.a}</Text>
            </View>
          ))}

          <Text style={st.legalNote}>
            Prices shown in USD. Taxes may apply. Subscriptions auto-renew unless cancelled.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },

  hero: { alignItems: 'center', paddingVertical: 20, gap: 10 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: "900", color: colors.ink, letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: colors.muted },

  currentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  currentLabel: { fontSize: 13, color: colors.faint },
  currentBadge: { backgroundColor: colors.success + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.success + '40' },
  currentBadgeText: { fontSize: 11, fontWeight: '800', color: colors.success, letterSpacing: 1 },

  billingToggle: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 20, marginBottom: 20, padding: 4, gap: 4 },
  billingBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  billingBtnActive: { backgroundColor: colors.brand },
  billingBtnText: { fontSize: 13, fontWeight: '700', color: colors.faint },
  billingBtnTextActive: { color: colors.white },
  savingsBadge: { backgroundColor: colors.success + '30', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  savingsBadgeText: { fontSize: 9, fontWeight: '800', color: colors.success },

  planCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  planCardInner: { padding: 20 },
  planTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
  planName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  planBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  planBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  currentPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '20', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  currentPillText: { fontSize: 10, fontWeight: '700', color: colors.success },
  planTag: { fontSize: 12, color: colors.faint },

  priceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  planPriceDollar: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  planPrice: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  planPricePer: { fontSize: 12, color: colors.faint, textAlign: 'right' },
  saveTag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 4 },
  saveTagText: { fontSize: 10, fontWeight: '800' },

  highlights: { gap: 8 },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  highlightText: { fontSize: 13, fontWeight: '500' },

  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  ctaBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
  ctaOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 13, borderWidth: 1 },
  ctaOutlineText: { fontSize: 14, fontWeight: '700' },

  tableTitle: { fontSize: 14, fontWeight: '800', color: colors.ink, paddingHorizontal: 20, marginTop: 12, marginBottom: 12, letterSpacing: 0.3 },
  table: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 12 },
  tableRowAlt: { backgroundColor: colors.bg + '40' },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 },
  tableHeaderText: { fontSize: 12, fontWeight: '800', color: colors.faint },
  tableCell: { paddingHorizontal: 2 },
  tableCellFeature: { flex: 2 },
  tableCellPlan: { flex: 1, justifyContent: 'center' },
  tableCellText: { fontSize: 11, color: colors.muted },
  cellText: { fontSize: 10, color: colors.muted, textAlign: 'center' },

  faqItem: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  faqQ: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  faqA: { fontSize: 13, color: colors.muted, lineHeight: 20 },

  legalNote: { fontSize: 11, color: colors.faint, textAlign: 'center', paddingHorizontal: 24, marginTop: 16 },

  // Paywall modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.black + '80' },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  modalGrad: { padding: 28, paddingBottom: 40, alignItems: 'center' },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.white + '30', borderRadius: 2, marginBottom: 24 },
  modalIconWrap: { width: 68, height: 68, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.ink, marginBottom: 10, textAlign: 'center' },
  modalBody: { fontSize: 15, color: colors.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalCta: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  modalCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 16 },
  modalCtaText: { fontSize: 16, fontWeight: '800' },
  modalSkip: { paddingVertical: 10 },
  modalSkipText: { fontSize: 14, color: colors.faint },
});
