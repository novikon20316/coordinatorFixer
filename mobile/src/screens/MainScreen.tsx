import React, { useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { he } from "@admin-coordinator/shared";
import { Header } from "../components/Header";
import { AppMenu } from "../components/AppMenu";
import { MenuKey } from "../navigation/types";
import { DashboardScreen } from "./DashboardScreen";
import { PlaceholderScreen } from "./PlaceholderScreen";
import { CoordinatorsScreen } from "./CoordinatorsScreen";

const TITLES: Record<MenuKey, string> = {
  overview: he.menu.overview,
  reports: he.menu.reports,
  changeStatus: he.menu.changeStatus,
  coordinators: he.menu.coordinators,
};

export function MainScreen() {
  const [active, setActive] = useState<MenuKey>("overview");
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={TITLES[active]} onMenuPress={() => setMenuVisible(true)} />

      {active === "overview" && <DashboardScreen />}
      {active === "reports" && <PlaceholderScreen title={he.menu.reports} />}
      {active === "changeStatus" && <PlaceholderScreen title={he.menu.changeStatus} />}
      {active === "coordinators" && <CoordinatorsScreen />}

      <AppMenu
        visible={menuVisible}
        active={active}
        onSelect={setActive}
        onClose={() => setMenuVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
