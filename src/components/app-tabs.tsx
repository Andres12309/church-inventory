import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { PremiumPalette } from '@/shared/presentation/ui/premiumPalette';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={PremiumPalette.surface}
      indicatorColor="rgba(79, 70, 229, 0.2)"
      iconColor={{
        default: PremiumPalette.textMutedOnDark,
        selected: PremiumPalette.primary,
      }}
      labelStyle={{
        default: { color: PremiumPalette.textMutedOnDark },
        selected: { color: PremiumPalette.textOnDark, fontWeight: '600' },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md="home"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="inventario">
        <NativeTabs.Trigger.Label>Inventario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'shippingbox', selected: 'shippingbox.fill' }}
          md="inventory_2"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="finanzas">
        <NativeTabs.Trigger.Label>Finanzas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'dollarsign.circle', selected: 'dollarsign.circle.fill' }}
          md="payments"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="reportes">
        <NativeTabs.Trigger.Label>Reportes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'doc.text', selected: 'doc.text.fill' }}
          md="description"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="ajustes">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
