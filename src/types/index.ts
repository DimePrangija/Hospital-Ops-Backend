export type UserRole = "admin" | "doctor" | "billing";
export type ClaimStatus = "open" | "approved" | "denied" | "appealing";
export type DocType = "insurance_card" | "lab_result" | "referral" | "prior_auth" | "other";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  id: string;
  name: string;
  date_of_birth: string;
  email?: string;
  phone?: string;
  address?: string;
  insurance_provider?: string;
  insurance_id?: string;
  medical_record_number: string;
  created_by?: string;
  created_at: string;
}

export interface Claim {
  id: string;
  patient_id: string;
  submitted_by?: string;
  diagnosis_code: string;
  description?: string;
  amount: number;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  uploaded_by?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  doc_type?: DocType;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface AuthRequest extends Express.Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}
