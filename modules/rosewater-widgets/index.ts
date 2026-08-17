import { requireOptionalNativeModule } from 'expo-modules-core';

interface RosewaterWidgetsModule {
  /** Re-reads the database and redraws every placed widget. */
  refresh(): void;
}

/**
 * Absent in Expo Go and on iOS, where the native module is not linked. Callers
 * go through `src/widgets.ts`, which turns that into a no-op.
 */
const RosewaterWidgets = requireOptionalNativeModule<RosewaterWidgetsModule>('RosewaterWidgets');

export default RosewaterWidgets;
