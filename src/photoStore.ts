import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  return dir;
}

async function pickImage(fromCamera: boolean): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  };
  let result: ImagePicker.ImagePickerResult;
  if (fromCamera) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

/**
 * Opens camera or gallery, then copies the chosen image into the app's own
 * photos directory so it survives gallery cleanups. Returns the stored URI.
 */
export async function captureAndStorePhoto(fromCamera: boolean): Promise<string | null> {
  const sourceUri = await pickImage(fromCamera);
  if (!sourceUri) return null;
  const source = new File(sourceUri);
  const name = `hair-${Date.now()}-${Math.floor(Math.random() * 1e6)}.jpg`;
  const dest = new File(photosDir(), name);
  source.copy(dest);
  return dest.uri;
}

export function removeStoredPhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Photo file already gone — nothing to clean up
  }
}
