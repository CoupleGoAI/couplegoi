import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ScanQRScreenProps } from '../../navigation/types';
import GradientButton from '../../components/ui/GradientButton';
import { useAppStore } from '../../store/appStore';
import { generateId } from '../../utils/helpers';
import { palette } from '../../theme/colors';
import { radii, spacing } from '../../theme/spacing';
import { fontFamilies, fontSize, fontWeight } from '../../theme/typography';

const { width } = Dimensions.get('window');
const VIEWFINDER = width * 0.65;

export default function ScanQRScreen({ navigation }: ScanQRScreenProps) {
  const setPartner = useAppStore((s) => s.setPartner);
  const setCouple = useAppStore((s) => s.setCouple);
  const currentUser = useAppStore((s) => s.currentUser);

  const handleSimulatedScan = () => {
    const mockPartner = {
      id: generateId(),
      name: 'Alex',
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };
    setPartner(mockPartner);
    setCouple({
      id: generateId(),
      userA: currentUser!,
      userB: {
        id: mockPartner.id,
        name: mockPartner.name,
        createdAt: new Date().toISOString(),
      },
      connectedAt: new Date().toISOString(),
      streakDays: 0,
      lastActivityAt: new Date().toISOString(),
    });
    navigation.navigate('ConnectionConfirmed');
  };

  return (
    <View style={styles.container}>
      <View style={styles.camera}>
        <View style={styles.overlay}>
          {/* Top bar */}
          <SafeAreaView style={styles.headerArea} edges={['top']}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color={palette.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Viewfinder */}
          <View style={styles.viewfinder}>
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
            ].map((corner, i) => (
              <View
                key={i}
                style={[styles.corner, corner as any, { borderColor: palette.pink400 }]}
              />
            ))}
            <Text style={styles.scanHint}>Point at your partner's QR code</Text>
          </View>

          {/* Bottom */}
          <SafeAreaView style={styles.bottomArea} edges={['bottom']}>
            <Text style={styles.cameraPlaceholder}>
              📷 Camera access required in production.{'\n'}Tap below to simulate a scan.
            </Text>
            <GradientButton
              label="Simulate Scan (Demo)"
              onPress={handleSimulatedScan}
              size="lg"
              fullWidth
            />
          </SafeAreaView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.black },
  camera: { flex: 1, backgroundColor: palette.gray900 },
  overlay: { flex: 1 },
  headerArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['2'],
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radii.full,
  },
  headerTitle: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: palette.white,
  },
  viewfinder: {
    width: VIEWFINDER,
    height: VIEWFINDER,
    alignSelf: 'center',
    marginTop: spacing['10'],
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 2,
  },
  scanHint: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: spacing['8'],
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing['5'],
    paddingBottom: spacing['8'],
    gap: spacing['4'],
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: spacing['5'],
  },
  cameraPlaceholder: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
