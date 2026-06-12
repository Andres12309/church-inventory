import { Directory, File, Paths } from 'expo-file-system';

const PHOTOS_DIR_NAME = 'bienes_fotos';

function getPhotosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR_NAME);
}

function ensurePhotosDirectory(): Directory {
  const dir = getPhotosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function inferExtension(sourceUri: string): string {
  const match = sourceUri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png' || ext === 'webp' || ext === 'heic' || ext === 'jpeg' || ext === 'jpg') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

function isPersistedPhotoUri(uri: string | null | undefined): boolean {
  if (!uri) {
    return false;
  }
  return uri.includes(`/${PHOTOS_DIR_NAME}/`);
}

export async function persistBienPhoto(bienId: string, tempUri: string): Promise<string> {
  const dir = ensurePhotosDirectory();
  const source = new File(tempUri);
  const extension = inferExtension(tempUri);
  const destination = new File(dir, `${bienId}.${extension}`);

  if (destination.exists) {
    destination.delete();
  }

  source.copy(destination);
  return destination.uri;
}

export async function deleteBienPhotoIfExists(uri: string | null | undefined): Promise<void> {
  if (!isPersistedPhotoUri(uri)) {
    return;
  }

  const file = new File(uri!);
  if (file.exists) {
    file.delete();
  }
}

export async function replaceBienPhoto(
  bienId: string,
  tempUri: string,
  previousUri: string | null | undefined,
): Promise<string> {
  if (previousUri && previousUri !== tempUri) {
    await deleteBienPhotoIfExists(previousUri);
  }

  return persistBienPhoto(bienId, tempUri);
}

export const ImageStorageService = {
  persistBienPhoto,
  deleteBienPhotoIfExists,
  replaceBienPhoto,
};
