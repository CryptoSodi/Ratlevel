import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import type { CheckInMethod, CheckInVerification, Gym } from "@ratlevel/domain";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { useAppStore } from "@/state/AppStore";
import { colors, radius, spacing, typography } from "@/theme";

type PanelState =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "locating" }
  | { kind: "far"; distance: number }
  | { kind: "success"; method: CheckInMethod }
  | { kind: "error"; message: string };

/**
 * Gym entry: scan the QR poster at the gate, or let GPS confirm you're inside
 * the gym's geofence. Manual check-in stays as the front-desk fallback.
 */
export function CheckInPanel({ gym }: { gym: Gym }) {
  const { checkIn } = useAppStore();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [state, setState] = useState<PanelState>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [scanned, setScanned] = useState(false);

  const complete = async (method: CheckInMethod, verification?: CheckInVerification) => {
    if (busy) return;
    setBusy(true);
    try {
      await checkIn(method, verification);
      setState({ kind: "success", method });
    } catch {
      setState({ kind: "error", message: "Check-in failed. Try again or ask the front desk." });
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    setState({ kind: "idle" });
    if (Platform.OS === "web") {
      setState({
        kind: "error",
        message: "Camera scanning needs the mobile app — use GPS or manual check-in here."
      });
      return;
    }
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        setState({ kind: "error", message: "Camera access denied. You can check in manually instead." });
        return;
      }
    }
    setScanned(false);
    setState({ kind: "scanning" });
  };

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    if (data === gym.entryQrCode) {
      void complete("qr", { qrPayload: data });
    } else {
      setState({
        kind: "error",
        message: `That QR code doesn't belong to ${gym.name}. Look for the RatLevel poster at the entrance.`
      });
    }
  };

  const startGps = async () => {
    setState({ kind: "locating" });
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setState({ kind: "error", message: "Location access denied. You can check in manually instead." });
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const distance = distanceMeters(
        position.coords.latitude,
        position.coords.longitude,
        gym.latitude,
        gym.longitude
      );
      if (distance <= gym.geofenceRadiusM) {
        await complete("gps", { latitude: position.coords.latitude, longitude: position.coords.longitude });
      } else {
        setState({ kind: "far", distance });
      }
    } catch {
      setState({ kind: "error", message: "Could not get your location. Try the QR scan instead." });
    }
  };

  return (
    <Card style={styles.panel}>
      {state.kind === "scanning" ? (
        <>
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            <View style={styles.scanTarget} pointerEvents="none" />
          </View>
          <Text style={styles.hint}>Point at the RatLevel entry poster at the gate</Text>
          <Button label="Cancel" variant="ghost" onPress={() => setState({ kind: "idle" })} />
        </>
      ) : (
        <>
          {state.kind === "success" && (
            <View style={styles.feedbackRow}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.successText}>
                Checked in via {state.method === "qr" ? "QR scan" : state.method === "gps" ? "GPS" : "front desk"}. +50 XP — go earn the rest.
              </Text>
            </View>
          )}
          {state.kind === "far" && (
            <View style={styles.feedbackRow}>
              <Ionicons name="navigate" size={20} color={colors.warning} />
              <Text style={styles.warnText}>
                You're {formatDistance(state.distance)} from {gym.name} — get within{" "}
                {gym.geofenceRadiusM} m to auto check-in.
              </Text>
            </View>
          )}
          {state.kind === "error" && (
            <View style={styles.feedbackRow}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={styles.errorText}>{state.message}</Text>
            </View>
          )}

          <Button
            label="Scan entry QR"
            icon="scan"
            loading={busy && state.kind !== "locating"}
            onPress={() => void startScan()}
          />
          <View style={styles.row}>
            <Button
              label={state.kind === "locating" ? "Locating…" : "Use GPS"}
              icon="navigate"
              variant="ghost"
              loading={state.kind === "locating"}
              onPress={() => void startGps()}
              style={styles.rowButton}
            />
            <Button
              label="Manual"
              icon="create"
              variant="ghost"
              onPress={() => void complete("manual")}
              style={styles.rowButton}
            />
          </View>
          <Text style={styles.finePrint}>
            GPS check-in only works inside {gym.name}'s {gym.geofenceRadiusM} m zone — the server
            verifies your coordinates, so this can't be spoofed from the app. Not near the gym?
            Use Manual instead. Nothing is tracked in the background.
          </Text>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm
  },
  cameraFrame: {
    alignItems: "center",
    borderRadius: radius.lg,
    height: 260,
    justifyContent: "center",
    overflow: "hidden"
  },
  camera: {
    ...StyleSheet.absoluteFillObject
  },
  scanTarget: {
    borderColor: colors.primary,
    borderRadius: radius.lg,
    borderWidth: 3,
    height: 170,
    width: 170
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    fontWeight: "700",
    textAlign: "center"
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  rowButton: {
    flex: 1
  },
  feedbackRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  warnText: {
    color: colors.warning,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: typography.caption,
    fontWeight: "800"
  },
  finePrint: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center"
  }
});
