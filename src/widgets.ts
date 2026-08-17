import RosewaterWidgets from '../modules/rosewater-widgets';

let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Home screen widgets read the database themselves, so all the app has to do is
 * say "something changed".
 *
 * Debounced because a burst of writes — checking off four vitamins in a row, or
 * saving an entry that also rewrites its products — would otherwise redraw every
 * placed widget once per statement. Absent on iOS and in Expo Go, where the
 * native module is not linked, so this is a no-op there.
 */
export function refreshWidgets(): void {
  const widgets = RosewaterWidgets;
  if (!widgets) return;
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    try {
      widgets.refresh();
    } catch {
      // A widget failing to redraw must never take the app down with it.
    }
  }, 250);
}
