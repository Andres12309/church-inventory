import { View, StyleSheet } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { TabFabOverlay } from '@/features/dashboard/presentation/components/TabFabOverlay';

export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <AppTabs />
      <TabFabOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
