import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import type { RewardSummary } from "@ratlevel/domain";

export type TabKey = "home" | "train" | "quests" | "rank" | "profile";

export type ModalRoute =
  | { name: "membership" }
  | { name: "session"; templateId?: string; repeatLogId?: string }
  | { name: "reward"; summary: RewardSummary }
  | { name: "body" }
  | { name: "settings" }
  | { name: "notifications" };

interface NavigationValue {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  modal: ModalRoute | null;
  openModal: (modal: ModalRoute) => void;
  closeModal: () => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

export function NavigationProvider({ children }: PropsWithChildren) {
  const [tab, setTab] = useState<TabKey>("home");
  const [modal, setModal] = useState<ModalRoute | null>(null);

  const openModal = useCallback((route: ModalRoute) => setModal(route), []);
  const closeModal = useCallback(() => setModal(null), []);

  const value = useMemo(
    () => ({ tab, setTab, modal, openModal, closeModal }),
    [tab, modal, openModal, closeModal]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error("useNavigation must be used inside NavigationProvider");
  }
  return value;
}
