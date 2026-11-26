import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import {
  buildFirestoreMediaAssetPayload,
  buildStorageObjectPath,
  MAX_SPARK_DATAURL_CHARS,
  MAX_SPARK_INLINE_BYTES,
  sanitizeFirestoreId,
  validateStorageUploadCandidate,
  type StorageAssetCategory,
} from './utils/firebaseDataSync';

export interface StorageUploadResult {
  ok: boolean;
  url?: string;
  path?: string;
  assetId?: string;
  contentType?: string;
  sizeBytes?: number;
  storedIn?: 'firestore_and_local' | 'local_spark_cache';
  errorBn?: string;
  errorEn?: string;
}

const SPARK_MEDIA_CACHE_KEY = 'psms_spark_media_cache_v1';

interface CachedSparkAsset {
  assetId: string;
  path: string;
  category: StorageAssetCategory;
  scopeId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  updatedAtIso: string;
}

function readLocalMediaCache(): Record<string, CachedSparkAsset> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SPARK_MEDIA_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CachedSparkAsset>) : {};
  } catch {
    return {};
  }
}

function writeLocalMediaCacheEntry(entry: CachedSparkAsset): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readLocalMediaCache();
    current[entry.assetId] = entry;
    const entries = Object.values(current).sort((a, b) =>
      b.updatedAtIso.localeCompare(a.updatedAtIso)
    );
    // Keep cache bounded (~2.5 MB total) so browser localStorage quota is respected
    const trimmed: Record<string, CachedSparkAsset> = {};
    let totalChars = 0;
    for (const item of entries.slice(0, 12)) {
      const len = item.dataUrl.length + 300;
      if (totalChars + len > 2_500_000) continue;
      trimmed[item.assetId] = item;
      totalChars += len;
    }
    window.localStorage.setItem(SPARK_MEDIA_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota failures gracefully
  }
}

function removeLocalMediaCacheEntry(assetIdOrPath: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const current = readLocalMediaCache();
    let removed = false;
    const cleanId = sanitizeFirestoreId(assetIdOrPath, '');
    Object.keys(current).forEach((k) => {
      if (k === assetIdOrPath || k === cleanId || current[k]?.path === assetIdOrPath) {
        delete current[k];
        removed = true;
      }
    });
    if (removed) {
      window.localStorage.setItem(SPARK_MEDIA_CACHE_KEY, JSON.stringify(current));
    }
    return removed;
  } catch {
    return false;
  }
}

function parseDataUrlMeta(dataUrl: string): { mimeType: string; approxBytes: number } {
  const match = /^data:([^;,]+);base64,(.*)$/i.exec(dataUrl.trim());
  if (!match) {
    return { mimeType: 'application/octet-stream', approxBytes: 0 };
  }
  const mimeType = match[1].toLowerCase();
  const base64Len = match[2].length;
  const approxBytes = Math.floor((base64Len * 3) / 4);
  return { mimeType, approxBytes };
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not encode file as Data URL.'));
    };
    reader.onerror = () => reject(new Error('Failed reading file.'));
    reader.readAsDataURL(blob);
  });
}

async function compressImageDataUrlForSpark(
  sourceDataUrl: string,
  category: StorageAssetCategory
): Promise<{
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
}> {
  if (typeof document === 'undefined') {
    const meta = parseDataUrlMeta(sourceDataUrl);
    return {
      dataUrl: sourceDataUrl.slice(0, MAX_SPARK_DATAURL_CHARS),
      mimeType:
        meta.mimeType === 'image/png' || meta.mimeType === 'image/webp'
          ? meta.mimeType
          : 'image/jpeg',
      sizeBytes: Math.max(1, meta.approxBytes),
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = category === 'profile_photos' ? 480 : 1024;
      const ratio = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
      const targetW = Math.max(1, Math.round((img.width || 320) * ratio));
      const targetH = Math.max(1, Math.round((img.height || 320) * ratio));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const meta = parseDataUrlMeta(sourceDataUrl);
        resolve({
          dataUrl: sourceDataUrl.slice(0, MAX_SPARK_DATAURL_CHARS),
          mimeType: 'image/jpeg',
          sizeBytes: Math.max(1, meta.approxBytes),
        });
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const targetBytes = category === 'profile_photos' ? 180 * 1024 : 320 * 1024;
      let outUrl = canvas.toDataURL('image/webp', 0.82);
      if (!outUrl.startsWith('data:image/webp')) {
        outUrl = canvas.toDataURL('image/jpeg', 0.82);
      }

      let meta = parseDataUrlMeta(outUrl);
      const qualities = [0.72, 0.6, 0.48, 0.36];
      for (const q of qualities) {
        if (meta.approxBytes <= targetBytes && outUrl.length <= MAX_SPARK_DATAURL_CHARS) {
          break;
        }
        const candidate = canvas.toDataURL('image/jpeg', q);
        const cMeta = parseDataUrlMeta(candidate);
        if (cMeta.approxBytes < meta.approxBytes || candidate.length <= MAX_SPARK_DATAURL_CHARS) {
          outUrl = candidate;
          meta = cMeta;
        }
      }

      resolve({
        dataUrl: outUrl,
        mimeType: outUrl.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg',
        sizeBytes: Math.max(1, meta.approxBytes),
      });
    };
    img.onerror = () => {
      const meta = parseDataUrlMeta(sourceDataUrl);
      resolve({
        dataUrl: sourceDataUrl.slice(0, MAX_SPARK_DATAURL_CHARS),
        mimeType: 'image/jpeg',
        sizeBytes: Math.max(1, meta.approxBytes),
      });
    };
    img.src = sourceDataUrl;
  });
}

function resolveSparkAssetId(category: StorageAssetCategory, scopeId: string): string {
  const safeScope = sanitizeFirestoreId(scopeId, 'shared').slice(0, 64);
  if (category === 'profile_photos' || category === 'school_covers') {
    return sanitizeFirestoreId(`${category}_${safeScope}`, 'asset').slice(0, 128);
  }
  return sanitizeFirestoreId(`${category}_${safeScope}_${Date.now().toString(36)}`, 'doc').slice(0, 128);
}

async function persistSparkMediaAsset(params: {
  assetId: string;
  objectPath: string;
  category: StorageAssetCategory;
  scopeId: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  sizeBytes: number;
  dataUrl: string;
}): Promise<StorageUploadResult> {
  if (params.sizeBytes > MAX_SPARK_INLINE_BYTES || params.dataUrl.length > MAX_SPARK_DATAURL_CHARS) {
    return {
      ok: false,
      errorBn: 'ফ্রি Firebase Spark প্ল্যান সীমা (৪৫০ KB) অতিক্রম করেছে। ছোট ফাইল নির্বাচন করুন।',
      errorEn: 'File exceeds Free Spark Plan inline document limit (450 KB). Choose a smaller file.',
    };
  }

  writeLocalMediaCacheEntry({
    assetId: params.assetId,
    path: params.objectPath,
    category: params.category,
    scopeId: params.scopeId,
    fileName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes: params.sizeBytes,
    dataUrl: params.dataUrl,
    updatedAtIso: new Date().toISOString(),
  });

  const user = auth.currentUser;
  if (user && user.emailVerified) {
    try {
      const payload = buildFirestoreMediaAssetPayload({
        assetId: params.assetId,
        ownerUid: user.uid,
        category: params.category,
        scopeId: params.scopeId,
        fileName: params.fileName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
        dataUrl: params.dataUrl,
      });
      await setDoc(doc(db, 'media_assets', payload.assetId), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        ok: true,
        url: payload.dataUrl,
        path: `media_assets/${payload.assetId}`,
        assetId: payload.assetId,
        contentType: payload.mimeType,
        sizeBytes: payload.sizeBytes,
        storedIn: 'firestore_and_local',
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        ok: true,
        url: params.dataUrl,
        path: `local:${params.objectPath}`,
        assetId: params.assetId,
        contentType: params.mimeType,
        sizeBytes: params.sizeBytes,
        storedIn: 'local_spark_cache',
        errorBn: `লোকাল ক্যাশে সংরক্ষিত (Firestore সতর্কতা: ${msg})`,
        errorEn: `Saved locally (Firestore fallback note: ${msg})`,
      };
    }
  }

  return {
    ok: true,
    url: params.dataUrl,
    path: `local:${params.objectPath}`,
    assetId: params.assetId,
    contentType: params.mimeType,
    sizeBytes: params.sizeBytes,
    storedIn: 'local_spark_cache',
  };
}

export async function uploadFileToStorage(params: {
  file: File;
  category: StorageAssetCategory;
  scopeId?: string;
}): Promise<StorageUploadResult> {
  const check = validateStorageUploadCandidate(params.file.type, params.file.size, params.category);
  if (!check.valid) {
    return {
      ok: false,
      errorBn: check.errorBn,
      errorEn: check.errorEn,
    };
  }

  const targetScope = (params.scopeId?.trim() || auth.currentUser?.uid || 'shared').slice(0, 64);
  const objectPath = buildStorageObjectPath(params.category, targetScope, params.file.name);
  const assetId = resolveSparkAssetId(params.category, targetScope);

  try {
    const rawDataUrl = await readBlobAsDataUrl(params.file);
    if (params.file.type === 'application/pdf') {
      const meta = parseDataUrlMeta(rawDataUrl);
      return await persistSparkMediaAsset({
        assetId,
        objectPath,
        category: params.category,
        scopeId: targetScope,
        fileName: params.file.name,
        mimeType: 'application/pdf',
        sizeBytes: Math.max(1, meta.approxBytes),
        dataUrl: rawDataUrl,
      });
    }

    const compressed = await compressImageDataUrlForSpark(rawDataUrl, params.category);
    return await persistSparkMediaAsset({
      assetId,
      objectPath,
      category: params.category,
      scopeId: targetScope,
      fileName: params.file.name,
      mimeType: compressed.mimeType,
      sizeBytes: compressed.sizeBytes,
      dataUrl: compressed.dataUrl,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      errorBn: `ফ্রি Spark মিডিয়া সংরক্ষণ ব্যর্থ হয়েছে: ${msg}`,
      errorEn: `Free Spark media save failed: ${msg}`,
    };
  }
}

export async function uploadDataUrlToStorage(params: {
  dataUrl: string;
  category: StorageAssetCategory;
  scopeId?: string;
  fileName?: string;
}): Promise<StorageUploadResult> {
  const { mimeType, approxBytes } = parseDataUrlMeta(params.dataUrl);
  const check = validateStorageUploadCandidate(mimeType, approxBytes || 1024, params.category);
  if (!check.valid) {
    return {
      ok: false,
      errorBn: check.errorBn,
      errorEn: check.errorEn,
    };
  }

  const targetScope = (params.scopeId?.trim() || auth.currentUser?.uid || 'shared').slice(0, 64);
  const compressed =
    mimeType === 'application/pdf'
      ? {
          dataUrl: params.dataUrl,
          mimeType: 'application/pdf' as const,
          sizeBytes: Math.max(1, approxBytes),
        }
      : await compressImageDataUrlForSpark(params.dataUrl, params.category);

  const ext = compressed.mimeType === 'image/webp' ? 'webp' : compressed.mimeType === 'image/png' ? 'png' : 'jpg';
  const fileName = params.fileName || `${params.category}_${targetScope}.${ext}`;
  const objectPath = buildStorageObjectPath(params.category, targetScope, fileName);
  const assetId = resolveSparkAssetId(params.category, targetScope);

  return await persistSparkMediaAsset({
    assetId,
    objectPath,
    category: params.category,
    scopeId: targetScope,
    fileName,
    mimeType: compressed.mimeType,
    sizeBytes: compressed.sizeBytes,
    dataUrl: compressed.dataUrl,
  });
}

export async function deleteStorageObject(assetPathOrId: string): Promise<boolean> {
  const raw = assetPathOrId.trim();
  if (!raw) return false;
  const cleanId = raw.replace(/^media_assets\//, '').replace(/^local:/, '');
  const localDeleted = removeLocalMediaCacheEntry(cleanId) || removeLocalMediaCacheEntry(raw);

  const user = auth.currentUser;
  if (user && user.emailVerified) {
    try {
      await deleteDoc(doc(db, 'media_assets', sanitizeFirestoreId(cleanId, cleanId)));
      return true;
    } catch {
      return localDeleted;
    }
  }
  return localDeleted;
}

export async function deleteStorageFolderPrefix(scopeId: string): Promise<number> {
  const cleanScope = sanitizeFirestoreId(scopeId, '');
  if (!cleanScope) return 0;

  let deleted = 0;
  const localCache = readLocalMediaCache();
  Object.values(localCache).forEach((item) => {
    if (item.scopeId === cleanScope || item.assetId.includes(cleanScope)) {
      if (removeLocalMediaCacheEntry(item.assetId)) {
        deleted += 1;
      }
    }
  });

  const user = auth.currentUser;
  if (user && user.emailVerified) {
    try {
      const snap = await getDocs(
        query(collection(db, 'media_assets'), where('ownerUid', '==', user.uid))
      );
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as { scopeId?: string };
        if (data.scopeId === cleanScope) {
          await deleteDoc(docSnap.ref).catch(() => {});
          deleted += 1;
        }
      }
    } catch {
      // Best-effort cleanup
    }
  }
  return deleted;
}
