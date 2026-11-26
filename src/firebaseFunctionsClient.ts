import type { Role } from './types';
import type { ApprovalDecision } from './utils/firebaseDataSync';

export interface CloudFunctionCallOutcome<T = unknown> {
  ok: boolean;
  usedCloudFunction: boolean;
  data?: T;
  fallbackReason?: string;
}

/**
 * 100% Free Firebase Spark Plan mode:
 * Account approvals and cascade deletions run directly against hardened
 * Firestore & Realtime Database security rules without requiring Blaze billing
 * or paid Cloud Functions v2 deployment.
 */
export async function callApproveApplicationCloudFunction(_input: {
  targetUid: string;
  applicationId?: string;
  decision: ApprovalDecision;
  role: Role | 'pending';
  schoolId?: string;
  note?: string;
}): Promise<CloudFunctionCallOutcome<{ targetUid: string; role: string; status: string; isActive: boolean }>> {
  return {
    ok: false,
    usedCloudFunction: false,
    fallbackReason: 'Spark Free Plan active: using direct hardened Firestore + RTDB rules.',
  };
}

export async function callPermanentDeleteCascadeCloudFunction(_input: {
  targetType: 'user' | 'school' | 'teacher' | 'student';
  targetId: string;
  schoolId?: string;
  reason?: string;
}): Promise<CloudFunctionCallOutcome<{ ok: boolean; targetType: string; targetId: string }>> {
  return {
    ok: false,
    usedCloudFunction: false,
    fallbackReason: 'Spark Free Plan active: using direct Firestore + RTDB cascade cleanup.',
  };
}
