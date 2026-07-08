import { StyleSheet, View } from "react-native";
import QRCodeSvg from "react-native-qrcode-svg";

import { colors, radius, spacing } from "@/theme";

/** A real, scannable QR code — encodes the member's payload for staff to scan at the front desk. */
export function MemberQrCode({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <View style={styles.frame} accessibilityLabel="Membership check-in pass">
      <QRCodeSvg value={value} size={size} backgroundColor={colors.text} color={colors.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.md
  }
});
