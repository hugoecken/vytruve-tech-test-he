import { browserEnvironment } from '@/shared/config/browser-environment';

/** Builds the authenticated API route for one current owned patient photo. */
export function getPatientPhotoUrl(patientId: string): string {
  return `${browserEnvironment.apiBaseUrl}/patients/${patientId}/photo`;
}
