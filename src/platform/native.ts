// What differs between the web app (PWA) and the installed app (APK). Everything here works
// in both: in the browser the native parts are simply not used, and the plugins are loaded
// only inside the APK, so the web bundle does not grow.

import { Capacitor } from '@capacitor/core';
import { downloadFile } from '../ui/download';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Hands a text file to the user. In the browser it is a download. In the APK a WebView
 * cannot download a generated file, so the file is written to the app's cache and offered
 * through the system share sheet (save to Files or Drive, send to a calendar, ...).
 * Resolves to `false` when the user closed the share sheet without choosing anything.
 */
export async function saveTextFile(name: string, text: string, type: string): Promise<boolean> {
  if (!isNativeApp()) {
    downloadFile(name, text, type);
    return true;
  }
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const written = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    // Resolves once another app took the file. Whether that app then saved it, the share
    // sheet does not tell: the screens say "handed over", not "saved".
    await Share.share({ title: name, files: [written.uri] });
    return true;
  } catch {
    // Closing the share sheet rejects the promise, and so does a full disk; nothing is lost.
    return false;
  }
}
