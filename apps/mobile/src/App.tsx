import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppErrorState, AppLoadingState } from "@/components/AppStates";
import { OnboardingFlow } from "@/features/onboarding/OnboardingFlow";
import { HomeScreen } from "@/features/home/HomeScreen";
import { MembershipScreen } from "@/features/membership/MembershipScreen";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";
import { BodyScreen } from "@/features/profile/BodyScreen";
import { ProfileScreen } from "@/features/profile/ProfileScreen";
import { SettingsScreen } from "@/features/profile/SettingsScreen";
import { QuestsScreen } from "@/features/quests/QuestsScreen";
import { RankScreen } from "@/features/rank/RankScreen";
import { RewardScreen } from "@/features/workouts/RewardScreen";
import { TrainScreen } from "@/features/workouts/TrainScreen";
import { WorkoutSessionScreen } from "@/features/workouts/WorkoutSessionScreen";
import { NavigationProvider, useNavigation, type TabKey } from "@/navigation/Navigation";
import { AppStoreProvider, useAppStore } from "@/state/AppStore";
import { colors, radius, shadow, spacing, typography } from "@/theme";

const TABS: Array<{ key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "home", label: "Home", icon: "grid" },
  { key: "train", label: "Train", icon: "barbell" },
  { key: "quests", label: "Quests", icon: "flag" },
  { key: "rank", label: "Rank", icon: "trophy" },
  { key: "profile", label: "Profile", icon: "person" }
];

const TAB_TITLES: Record<TabKey, string> = {
  home: "Level up every rep",
  train: "Training ground",
  quests: "Quest board",
  rank: "Season ladder",
  profile: "Your character"
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <NavigationProvider>
          <StatusBar style="light" />
          <Root />
        </NavigationProvider>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}

function Root() {
  const { status, session, reload } = useAppStore();

  if (status === "unauthenticated") {
    return (
      <SafeAreaView style={styles.shell}>
        <OnboardingFlow />
      </SafeAreaView>
    );
  }

  if (status === "error") {
    return (
      <SafeAreaView style={styles.shell}>
        <View style={styles.centered}>
          <AppErrorState onRetry={() => void reload()} />
        </View>
      </SafeAreaView>
    );
  }

  if (status === "loading" || !session) {
    return (
      <SafeAreaView style={styles.shell}>
        <View style={styles.loadingWrap}>
          <AppLoadingState />
        </View>
      </SafeAreaView>
    );
  }

  return <Shell />;
}

function Shell() {
  const { reload } = useAppStore();
  const { tab, setTab, modal } = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.shell}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.primary}
          />
        }
      >
        <Header title={TAB_TITLES[tab]} />
        {tab === "home" && <HomeScreen />}
        {tab === "train" && <TrainScreen />}
        {tab === "quests" && <QuestsScreen />}
        {tab === "rank" && <RankScreen />}
        {tab === "profile" && <ProfileScreen />}
      </ScrollView>
      <BottomTabs activeTab={tab} onChange={setTab} />
      {modal && <ModalHost />}
    </SafeAreaView>
  );
}

function Header({ title }: { title: string }) {
  const { session } = useAppStore();
  const { openModal } = useNavigation();
  const unread = session?.notifications.filter((item) => !item.read).length ?? 0;

  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.eyebrow}>RatLevel</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.headerActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          onPress={() => openModal({ name: "notifications" })}
          style={({ pressed }) => [styles.logoMark, pressed && styles.pressed]}
        >
          <Ionicons name="notifications" size={21} color={unread > 0 ? colors.text : colors.textMuted} />
          {unread > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{unread}</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.logoMark}>
          <MaterialCommunityIcons name="rodent" size={25} color={colors.text} />
        </View>
      </View>
    </View>
  );
}

function ModalHost() {
  const { modal, closeModal } = useNavigation();
  if (!modal) return null;

  // Full-bleed experiences that own their layout, headers and footers.
  if (modal.name === "session") {
    return (
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.shell}>
          <WorkoutSessionScreen templateId={modal.templateId} repeatLogId={modal.repeatLogId} />
        </SafeAreaView>
      </View>
    );
  }
  if (modal.name === "reward") {
    return (
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.shell}>
          <RewardScreen summary={modal.summary} />
        </SafeAreaView>
      </View>
    );
  }

  const titles: Record<string, string> = {
    membership: "Membership",
    body: "Body tracking",
    settings: "Settings",
    notifications: "Notifications"
  };

  return (
    <View style={styles.modalOverlay}>
      <SafeAreaView style={styles.shell}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{titles[modal.name]}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={closeModal}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {modal.name === "membership" && <MembershipScreen />}
          {modal.name === "body" && <BodyScreen />}
          {modal.name === "settings" && <SettingsScreen />}
          {modal.name === "notifications" && <NotificationsScreen />}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BottomTabs({ activeTab, onChange }: { activeTab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <View style={styles.tabBar}>
      {TABS.map((tabItem) => {
        const active = tabItem.key === activeTab;
        return (
          <Pressable
            key={tabItem.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tabItem.label}
            onPress={() => onChange(tabItem.key)}
            style={({ pressed }) => [styles.tabButton, active && styles.activeTab, pressed && styles.pressed]}
          >
            <Ionicons name={tabItem.icon} size={21} color={active ? colors.text : colors.textMuted} />
            <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{tabItem.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.background,
    flex: 1
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  loadingWrap: {
    flex: 1,
    padding: spacing.lg
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 108
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  eyebrow: {
    color: colors.primary,
    fontSize: typography.small,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: colors.text,
    fontSize: typography.display,
    fontWeight: "900"
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  bellBadge: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 4,
    position: "absolute",
    right: -2,
    top: -2
  },
  bellBadgeText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900"
  },
  modalOverlay: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  modalTitle: {
    color: colors.text,
    fontSize: typography.heading + 2,
    fontWeight: "900"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  modalContent: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: 0
  },
  tabBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    bottom: 14,
    flexDirection: "row",
    gap: spacing.xs,
    left: spacing.md,
    padding: spacing.xs,
    position: "absolute",
    right: spacing.md,
    ...shadow.card
  },
  tabButton: {
    alignItems: "center",
    borderRadius: radius.lg,
    flex: 1,
    gap: 2,
    justifyContent: "center",
    minHeight: 58
  },
  activeTab: {
    backgroundColor: colors.primarySoft
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800"
  },
  activeTabLabel: {
    color: colors.text
  },
  pressed: {
    opacity: 0.78
  }
});
