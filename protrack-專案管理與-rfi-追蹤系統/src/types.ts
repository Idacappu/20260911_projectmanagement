export type UserRole = 'PM' | 'Architect' | 'Engineer' | 'Contractor';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department?: string;
}

export type TicketType = 'RFI' | 'TASK';

export type TicketStatus = 'TODO' | 'RFI_PENDING' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export type PriorityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Attachment {
  id: number;
  ticket_id: number;
  file_name: string;
  file_url: string; // Base64 or URL
  file_type: string;
  uploaded_by: number;
  uploader_name?: string;
  uploader_role?: UserRole;
  created_at: string;
  thumbnail_url?: string;
}

export interface Comment {
  id: number;
  ticket_id: number;
  author_id: number;
  author_name?: string;
  author_role?: UserRole;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface Ticket {
  id: number;
  ticket_no: string; // e.g. RFI-202609-001 or TASK-202609-002
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: PriorityLevel;
  creator_id: number;
  assignee_id: number;
  due_date: string; // YYYY-MM-DD
  start_date?: string; // YYYY-MM-DD
  parent_id?: number | null; // Parent Work Package ID
  progress?: number; // 0 - 100%
  is_milestone?: boolean;
  dependencies?: number[]; // Predecessor ticket IDs
  created_at: string;
  updated_at: string;
  creator?: User;
  assignee?: User;
  attachments?: Attachment[];
  comments?: Comment[];
}

export interface TicketFilterOptions {
  search: string;
  type: 'ALL' | 'RFI' | 'TASK';
  assigneeId: string; // 'ALL' or user ID
  priority: 'ALL' | PriorityLevel;
  status?: 'ALL' | TicketStatus;
}
