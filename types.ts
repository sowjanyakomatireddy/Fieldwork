
export type ClientType = string;
export type VisitStatus = 'follow_up' | 'converted' | 'rejected';
// Convert UserRole to enum to support UserRole.WORKER and UserRole.ADMIN usage
export enum UserRole {
  WORKER = 'worker',
  ADMIN = 'admin'
}

export type ActivityType = 'created' | 'updated' | 'status_changed' | 'follow_up_added' | 'assigned';

export interface VisitActivity {
  id: string;
  visit_id: string;
  action_type: ActivityType;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  note: string;
  performed_by: string;
  created_at: string;
}

export interface FieldVisit {
  id?: string;
  created_at?: string;
  worker_name: string;
  worker_phone?: string;
  client_name: string;
  client_type: ClientType;
  client_phone?: string;
  client_email?: string | null;
  address?: string;
  landmark: string;
  requirements: string | null;
  budget: number;
  status: VisitStatus;
  follow_up_at: string | null;
  rejection_reason: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  mobile: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
}
