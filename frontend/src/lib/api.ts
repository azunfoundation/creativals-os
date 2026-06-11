import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach Bearer token from localStorage
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 and extract data.data
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) {
      // If it contains pagination metadata, keep the envelope so the page can read meta info
      if (
        response.data.meta !== undefined ||
        response.data.links !== undefined ||
        response.data.current_page !== undefined
      ) {
        return response;
      }
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ============================================================
// Types
// ============================================================

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
  permissions: string[];
  departments: Department[];
  avatar_url: string | null;
  status: 'active' | 'inactive';
  employee_id?: string;
  phone?: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  color?: string;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  module: string;
}

export interface Department {
  id: number;
  name: string;
  color?: string;
  head?: User;
  members_count?: number;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// CRM TYPES
export interface LeadContact {
  id: number;
  lead_id: number;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  notes?: string;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeadStage {
  id: number;
  name: string;
  slug: string;
  color: string;
  sort_order: number;
  is_system: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LeadSource {
  id: number;
  name: string;
  slug: string;
  color: string;
  icon?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LeadActivity {
  id: number;
  lead_id: number;
  type: 'call' | 'whatsapp' | 'email' | 'note' | 'meeting' | 'stage_change' | 'assignment_change' | 'system_event';
  description: string;
  due_date?: string;
  status?: 'pending' | 'completed';
  logged_by_user_id?: number;
  logged_by?: User;
  created_at: string;
}

export interface Lead {
  id: number;
  company_name: string;
  website_url?: string;
  timezone?: string;
  expected_start_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  temperature: 'cold' | 'warm' | 'hot';
  budget: number;
  interested_services?: string[];
  stage_id: number;
  source_id: number;
  sales_exec_id?: number;
  sales_head_id?: number;
  stage?: LeadStage;
  source?: LeadSource;
  sales_exec?: User;
  sales_head?: User;
  contacts: LeadContact[];
  activities: LeadActivity[];
  created_at: string;
  updated_at: string;
}

export interface LeadListParams {
  page?: number;
  per_page?: number;
  search?: string;
  stage_id?: number;
  source_id?: number;
  sales_exec_id?: number;
  priority?: string;
  temperature?: string;
  min_budget?: number;
  max_budget?: number;
}

export interface CreateLeadData {
  company_name: string;
  website_url?: string;
  timezone?: string;
  expected_start_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  temperature: 'cold' | 'warm' | 'hot';
  budget: number;
  interested_services?: string[];
  stage_id: number;
  source_id: number;
  sales_exec_id?: number;
  sales_head_id?: number;
  primary_contact: {
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    notes?: string;
  };
  secondary_contacts?: Array<{
    name: string;
    designation?: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    notes?: string;
  }>;
}

export interface UpdateLeadData {
  company_name?: string;
  website_url?: string;
  timezone?: string;
  expected_start_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  temperature?: 'cold' | 'warm' | 'hot';
  budget?: number;
  interested_services?: string[];
  stage_id?: number;
  source_id?: number;
  sales_exec_id?: number;
  sales_head_id?: number;
}

export interface ConvertLeadData {
  quote_name: string;
  valid_until: string;
}

export interface LogActivityData {
  type: 'call' | 'whatsapp' | 'email' | 'note' | 'meeting' | 'stage_change' | 'assignment_change' | 'system_event';
  description: string;
  due_date?: string;
}

export interface Alert {
  id: number;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

// ============================================================
// Auth API
// ============================================================

export const auth = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<User>('/auth/me'),
};

// ============================================================
// Users API
// ============================================================

export interface UserListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  department_id?: number;
  role_id?: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  employee_id?: string;
  status?: string;
  role_ids?: number[];
  department_ids?: number[];
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  phone?: string;
  employee_id?: string;
  status?: string;
  role_ids?: number[];
  department_ids?: number[];
}

export const users = {
  list: (params?: UserListParams) =>
    api.get<{ data: User[]; meta: PaginationMeta }>('/users', { params }),

  create: (data: CreateUserData) =>
    api.post<User>('/users', data),

  update: (id: number, data: UpdateUserData) =>
    api.put<User>(`/users/${id}`, data),

  delete: (id: number) =>
    api.delete(`/users/${id}`),

  syncRoles: (id: number, roleIds: number[]) =>
    api.post(`/users/${id}/sync-roles`, { role_ids: roleIds }),
};

// ============================================================
// Roles API
// ============================================================

export const roles = {
  list: () => api.get<Role[]>('/roles'),

  syncPermissions: (id: number, permissionIds: number[]) =>
    api.post(`/roles/${id}/sync-permissions`, { permission_ids: permissionIds }),
};

// ============================================================
// Permissions API
// ============================================================

export const permissions = {
  list: () => api.get<Permission[]>('/permissions'),
};

// ============================================================
// Departments API
// ============================================================

export interface CreateDepartmentData {
  name: string;
  color?: string;
  head_user_id?: number;
}

export interface UpdateDepartmentData {
  name?: string;
  color?: string;
  head_user_id?: number;
}

export const departments = {
  list: () => api.get<Department[]>('/departments'),

  create: (data: CreateDepartmentData) =>
    api.post<Department>('/departments', data),

  update: (id: number, data: UpdateDepartmentData) =>
    api.put<Department>(`/departments/${id}`, data),

  delete: (id: number) =>
    api.delete(`/departments/${id}`),
};

// ============================================================
// Leads API
// ============================================================

export const leads = {
  list: (params?: LeadListParams) =>
    api.get<{ data: Lead[]; meta: PaginationMeta }>('/leads', { params }),

  create: (data: CreateLeadData) =>
    api.post<Lead>('/leads', data),

  get: (id: number) =>
    api.get<Lead>(`/leads/${id}`),

  update: (id: number, data: UpdateLeadData) =>
    api.put<Lead>(`/leads/${id}`, data),

  delete: (id: number) =>
    api.delete(`/leads/${id}`),

  updateStage: (id: number, stageId: number, notes?: string) =>
    api.patch<Lead>(`/leads/${id}/stage`, { stage_id: stageId, notes }),

  convert: (id: number, data: ConvertLeadData) =>
    api.post<{ quote_id: number }>(`/leads/${id}/convert`, data),

  logActivity: (id: number, data: LogActivityData) =>
    api.post<LeadActivity>(`/leads/${id}/activities`, data),
};

// ============================================================
// Lead Stages API
// ============================================================

export const leadStages = {
  list: () =>
    api.get<LeadStage[]>('/lead-stages'),

  create: (data: { name: string; slug: string; color: string; sort_order: number }) =>
    api.post<LeadStage>('/lead-stages', data),

  update: (id: number, data: { name?: string; slug?: string; color?: string; sort_order?: number }) =>
    api.put<LeadStage>(`/lead-stages/${id}`, data),

  delete: (id: number) =>
    api.delete(`/lead-stages/${id}`),
};

// ============================================================
// Lead Sources API
// ============================================================

export const leadSources = {
  list: () =>
    api.get<LeadSource[]>('/lead-sources'),

  create: (data: { name: string; slug: string; color: string; icon?: string }) =>
    api.post<LeadSource>('/lead-sources', data),

  update: (id: number, data: { name?: string; slug?: string; color?: string; icon?: string }) =>
    api.put<LeadSource>(`/lead-sources/${id}`, data),

  delete: (id: number) =>
    api.delete(`/lead-sources/${id}`),
};

// ============================================================
// Alerts API
// ============================================================

export const alerts = {
  list: () =>
    api.get<Alert[]>('/alerts'),

  markRead: (id: number) =>
    api.post<void>(`/alerts/${id}/read`),

  markAllRead: () =>
    api.post<void>('/alerts/read-all'),
};

// ============================================================
// Service Catalog & Quotations API Types
// ============================================================

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  unit: string;
  tax_rate: number;
  category?: ServiceCategory;
  created_at?: string;
  updated_at?: string;
}

export interface Package {
  id: number;
  name: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  services?: Service[];
  service_ids?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_amount?: number;
  max_discount?: number;
  expires_at?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CouponValidationResponse {
  valid: boolean;
  discount_amount: number;
  final_amount: number;
  message?: string;
}

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  service_id?: number;
  service?: Service;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

export interface QuoteApproval {
  id: number;
  quote_id: number;
  user_id: number;
  user?: User;
  step_name: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  actioned_at?: string;
  created_at: string;
}

export interface Quote {
  id: number;
  quote_number: string;
  lead_id?: number;
  lead?: Lead;
  title: string;
  currency: string;
  valid_until: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  coupon_code?: string;
  terms_conditions?: string;
  internal_comments?: string;
  items: QuoteItem[];
  created_by?: User;
  approvals?: QuoteApproval[];
  created_at: string;
  updated_at: string;
}

export interface QuoteListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  lead_id?: number;
}

export interface CreateQuoteData {
  lead_id?: number;
  title: string;
  currency: string;
  valid_until: string;
  coupon_code?: string;
  terms_conditions?: string;
  internal_comments?: string;
  items: Array<{
    service_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    tax_rate: number;
  }>;
}

export interface UpdateQuoteData extends Partial<CreateQuoteData> {
  status?: Quote['status'];
}

// ============================================================
// Service Categories API
// ============================================================
export const serviceCategories = {
  list: () => api.get<ServiceCategory[]>('/service-categories'),
  create: (data: Partial<ServiceCategory>) => api.post<ServiceCategory>('/service-categories', data),
  update: (id: number, data: Partial<ServiceCategory>) => api.put<ServiceCategory>(`/service-categories/${id}`, data),
  delete: (id: number) => api.delete(`/service-categories/${id}`),
};

// ============================================================
// Services API
// ============================================================
export const services = {
  list: (params?: { category_id?: number; search?: string }) =>
    api.get<Service[]>('/services', { params }),
  create: (data: Partial<Service>) => api.post<Service>('/services', data),
  update: (id: number, data: Partial<Service>) => api.put<Service>(`/services/${id}`, data),
  delete: (id: number) => api.delete(`/services/${id}`),
};

// ============================================================
// Packages API
// ============================================================
export const packages = {
  list: () => api.get<Package[]>('/packages'),
  create: (data: Partial<Package> & { service_ids?: number[] }) => api.post<Package>('/packages', data),
  update: (id: number, data: Partial<Package> & { service_ids?: number[] }) => api.put<Package>(`/packages/${id}`, data),
  delete: (id: number) => api.delete(`/packages/${id}`),
};

// ============================================================
// Coupons API
// ============================================================
export const coupons = {
  list: () => api.get<Coupon[]>('/coupons'),
  create: (data: Partial<Coupon>) => api.post<Coupon>('/coupons', data),
  update: (id: number, data: Partial<Coupon>) => api.put<Coupon>(`/coupons/${id}`, data),
  delete: (id: number) => api.delete(`/coupons/${id}`),
  validate: (code: string, amount: number) =>
    api.post<CouponValidationResponse>('/coupons/validate', { code, amount }),
};

// ============================================================
// Quotes API
// ============================================================
// ============================================================
// Quotes API
// ============================================================
export const quotes = {
  list: (params?: QuoteListParams) =>
    api.get<{ data: Quote[]; meta: PaginationMeta }>('/quotes', { params }),
  get: (id: number) => api.get<Quote>(`/quotes/${id}`),
  create: (data: CreateQuoteData) => api.post<Quote>('/quotes', data),
  update: (id: number, data: UpdateQuoteData) => api.put<Quote>(`/quotes/${id}`, data),
  delete: (id: number) => api.delete(`/quotes/${id}`),
  submitApproval: (id: number) => api.post<Quote>(`/quotes/${id}/submit-approval`),
  approve: (id: number, comments?: string) => api.post<Quote>(`/quotes/${id}/approve`, { comments }),
  reject: (id: number, comments?: string) => api.post<Quote>(`/quotes/${id}/reject`, { comments }),
};

// ============================================================
// Invoices & Payments API Types
// ============================================================

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  service_id?: number;
  service?: Service;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_percentage: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount?: number;
}

export interface Payment {
  id: number;
  invoice_id: number;
  invoice?: Invoice;
  payment_number: string;
  amount: number;
  payment_method: 'bank_transfer' | 'card' | 'upi' | 'cash' | 'cheque';
  transaction_reference?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceApproval {
  id: number;
  invoice_id: number;
  user_name: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  comments?: string;
  actioned_at?: string;
  created_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  quote_id?: number;
  quote?: Quote;
  lead_id?: number;
  lead?: Lead;
  title: string;
  client_name: string;
  client_email?: string;
  currency: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  terms_conditions?: string;
  notes?: string;
  items: InvoiceItem[];
  payments?: Payment[];
  approval_status?: 'draft' | 'pending' | 'approved' | 'rejected';
  approvals?: InvoiceApproval[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceListParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  lead_id?: number;
}

export interface CreateInvoiceData {
  quote_id?: number;
  lead_id?: number;
  title: string;
  client_name: string;
  client_email?: string;
  currency: string;
  issue_date: string;
  due_date: string;
  terms_conditions?: string;
  notes?: string;
  items: Array<{
    service_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
    discount_percentage: number;
  }>;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  status?: Invoice['status'];
}

export interface CreatePaymentData {
  invoice_id: number;
  amount: number;
  payment_method: 'bank_transfer' | 'card' | 'upi' | 'cash' | 'cheque';
  transaction_reference?: string;
  payment_date: string;
  notes?: string;
}

export interface PaymentListParams {
  page?: number;
  per_page?: number;
  search?: string;
  invoice_id?: number;
}

// ============================================================
// Invoices API
// ============================================================
export const invoices = {
  list: (params?: InvoiceListParams) =>
    api.get<{ data: Invoice[]; meta: PaginationMeta }>('/invoices', { params }),
  get: (id: number) => api.get<Invoice>(`/invoices/${id}`),
  create: (data: CreateInvoiceData) => api.post<Invoice>('/invoices', data),
  update: (id: number, data: UpdateInvoiceData) => api.put<Invoice>(`/invoices/${id}`, data),
  delete: (id: number) => api.delete(`/invoices/${id}`),
};

// ============================================================
// Payments API
// ============================================================
export const payments = {
  list: (params?: PaymentListParams) =>
    api.get<{ data: Payment[]; meta: PaginationMeta }>('/payments', { params }),
  get: (id: number) => api.get<Payment>(`/payments/${id}`),
  create: (data: CreatePaymentData) => api.post<Payment>('/payments', data),
  delete: (id: number) => api.delete(`/payments/${id}`),
};

// ============================================================
// Sprint 5 API Types & Implementations
// ============================================================

export interface Project {
  id: number;
  project_number: string;
  name: string;
  client_id?: number;
  client_name?: string;
  invoice_id?: number;
  invoice_number?: string;
  manager_id?: number;
  manager?: User;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  completion_percentage: number;
  start_date: string;
  end_date: string;
  budget_hours: number;
  budget: number;
  description?: string;
  departments?: Department[];
  members?: User[];
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  project_id: number;
  project?: Project;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: number;
  assignee?: User;
  due_date?: string;
  estimated_hours?: number;
  completion_percentage: number;
  subtasks?: Subtask[];
  comments?: TaskComment[];
  time_logs?: Timesheet[];
  created_at?: string;
  updated_at?: string;
}

export interface Subtask {
  id: number;
  task_id: number;
  title: string;
  is_completed: boolean;
  created_at?: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  user?: User;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface Timesheet {
  id: number;
  user_id: number;
  user?: User;
  project_id: number;
  project?: Project;
  task_id?: number;
  task?: Task;
  date: string;
  hours: number;
  description?: string;
  billable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by_id?: number;
  rejected_notes?: string;
  submitted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectProfitability {
  project_id: number;
  project_name: string;
  budget_amount: number;
  revenue: number;
  labor_cost: number;
  expense_cost: number;
  total_cost: number;
  net_profit: number;
  margin_percentage: number;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  due_date: string;
  is_completed: boolean;
  completion_percentage: number;
}

export const projects = {
  list: (params?: any) => api.get<{ data: Project[]; meta?: PaginationMeta }>('/projects', { params }),
  get: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (data: any) => api.post<Project>('/projects', data),
  update: (id: number, data: any) => api.put<Project>(`/projects/${id}`, data),
  delete: (id: number) => api.delete(`/projects/${id}`),
  addMember: (id: number, data: { user_id: number; role?: string }) => api.post<void>(`/projects/${id}/members`, data),
  removeMember: (id: number, userId: number) => api.delete<void>(`/projects/${id}/members/${userId}`),
  profitability: (id: number) => api.get<ProjectProfitability>(`/projects/${id}/profitability`),
  milestones: (id: number) => api.get<Milestone[]>(`/projects/${id}/milestones`),
  timesheets: (id: number) => api.get<Timesheet[]>(`/projects/${id}/timesheets`),
  tasks: (id: number) => api.get<Task[]>(`/projects/${id}/tasks`),
};

export const tasks = {
  list: (params?: any) => api.get<{ data: Task[]; meta?: PaginationMeta }>('/tasks', { params }),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (data: any) => api.post<Task>('/tasks', data),
  update: (id: number, data: any) => api.put<Task>(`/tasks/${id}`, data),
  delete: (id: number) => api.delete(`/tasks/${id}`),
  updateStatus: (id: number, status: Task['status']) => api.patch<Task>(`/tasks/${id}/status`, { status }),
  updateCompletion: (id: number, pct: number) => api.patch<Task>(`/tasks/${id}/completion`, { completion_percentage: pct }),
  addComment: (id: number, data: { comment: string; is_internal: boolean }) => api.post<TaskComment>(`/tasks/${id}/comments`, data),
  listComments: (id: number) => api.get<TaskComment[]>(`/tasks/${id}/comments`),
  logTime: (id: number, data: { date: string; hours: number; description?: string; billable: boolean }) => api.post<Timesheet>(`/tasks/${id}/time-log`, data),
};

export const timesheets = {
  list: (params?: any) => api.get<{ data: Timesheet[]; meta?: PaginationMeta }>('/timesheets', { params }),
  create: (data: any) => api.post<Timesheet>('/timesheets', data),
  update: (id: number, data: any) => api.put<Timesheet>(`/timesheets/${id}`, data),
  delete: (id: number) => api.delete(`/timesheets/${id}`),
  submit: (id: number) => api.post<Timesheet>(`/timesheets/${id}/submit`),
  approve: (id: number) => api.post<Timesheet>(`/timesheets/${id}/approve`),
  reject: (id: number, notes: string) => api.post<Timesheet>(`/timesheets/${id}/reject`, { notes }),
  pending: () => api.get<Timesheet[]>('/timesheets/pending'),
};

// ============================================================
// Sprint 6 API Types & Implementations
// ============================================================

export interface Vendor {
  id: number;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  currency_id: number;
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExpenseCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  category_id: number;
  category?: ExpenseCategory;
  project_id?: number;
  project?: Project;
  vendor_id?: number;
  vendor?: Vendor;
  submitted_by: number;
  submitter?: User;
  approved_by?: number;
  approver?: User;
  title: string;
  description?: string;
  amount: number;
  currency_id: number;
  currency_code?: string;
  expense_date: string;
  receipt_url?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  is_billable: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRun {
  id: number;
  run_number: string;
  year: number;
  month: number;
  status: 'draft' | 'submitted' | 'approved' | 'processed' | 'paid';
  submitted_by: number;
  submitter?: User;
  approved_by?: number;
  approver?: User;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  currency_id: number;
  approved_at?: string;
  processed_at?: string;
  notes?: string;
  items?: PayrollRunItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PayrollRunItem {
  id: number;
  payroll_run_id: number;
  user_id: number;
  user?: User;
  base_salary: number;
  bonus_amount: number;
  deductions: number;
  net_salary: number;
  hours_logged: number;
  expected_hours: number;
  utilization_rate: number;
  breakdown?: {
    base?: number;
    bonuses?: Array<{ type: string; amount: number; reason?: string }>;
    deductions?: Array<{ description: string; amount: number }>;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeCompensation {
  id: number;
  user_id: number;
  user?: User;
  compensation_type_id: number;
  compensation_type?: { id: number; name: string; type: string };
  base_amount: number;
  currency_id: number;
  expected_monthly_hours: number;
  hourly_rate: number;
  effective_from: string;
  effective_until?: string;
  is_current: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bonus {
  id: number;
  user_id: number;
  user?: User;
  payroll_run_id?: number;
  approved_by?: number;
  amount: number;
  currency_id: number;
  type: 'performance' | 'festival' | 'referral';
  reason?: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  created_at?: string;
  updated_at?: string;
}

export interface ProjectCostAllocation {
  project_id: number;
  project_name: string;
  allocated_cost: number;
  logged_hours: number;
  percentage: number;
}

export const payroll = {
  listRuns: (params?: any) => api.get<{ data: PayrollRun[]; meta?: PaginationMeta }>('/payroll-runs', { params }),
  generateRun: (data: { year: number; month: number; notes?: string }) => api.post<PayrollRun>('/payroll-runs/generate', data),
  getRunDetails: (id: number) => api.get<PayrollRun>(`/payroll-runs/${id}`),
  approveRun: (id: number, notes?: string) => api.post<PayrollRun>(`/payroll-runs/${id}/approve`, { notes }),
  costAllocation: (id: number) => api.get<ProjectCostAllocation[]>(`/payroll-runs/${id}/cost-allocation`),
};

export const expenses = {
  listExpenses: (params?: any) => api.get<{ data: Expense[]; meta?: PaginationMeta }>('/expenses', { params }),
  createExpense: (data: any) => api.post<Expense>('/expenses', data),
  updateExpense: (id: number, data: any) => api.put<Expense>(`/expenses/${id}`, data),
  deleteExpense: (id: number) => api.delete(`/expenses/${id}`),
  approveExpense: (id: number, action: 'approve' | 'reject', notes?: string) => api.post<Expense>(`/expenses/${id}/approve`, { action, notes }),
};

export const vendors = {
  listVendors: (params?: any) => api.get<{ data: Vendor[]; meta?: PaginationMeta }>('/vendors', { params }),
  createVendor: (data: any) => api.post<Vendor>('/vendors', data),
  updateVendor: (id: number, data: any) => api.put<Vendor>(`/vendors/${id}`, data),
  deleteVendor: (id: number) => api.delete(`/vendors/${id}`),
};

// ============================================================
// Sprint 7 — Client Portal API Types & Implementations
// ============================================================

export interface PortalLoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface PortalProject {
  id: number;
  project_number: string;
  name: string;
  description?: string;
  client_id: number;
  invoice_id?: number;
  manager_id?: number;
  status: string;
  start_date?: string;
  end_date?: string;
  budget_hours?: number;
  budget_amount?: number;
  completion_percentage: number;
  is_recurring: boolean;
  milestones_count: number;
  tasks_count: number;
  budget_used_hours: number;
  created_at?: string;
  updated_at?: string;
}

export interface PortalMilestone {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  due_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_percentage: number;
  sort_order: number;
}

export interface PortalTask {
  id: number;
  task_number: string;
  project_id: number;
  milestone_id?: number;
  parent_task_id?: number;
  title: string;
  description?: string;
  assigned_to?: number;
  assignee_name?: string;
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  completion_percentage: number;
}

export interface PortalInvoice {
  id: number;
  invoice_number: string;
  title: string;
  client_id: number;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  issue_date: string;
  due_date: string;
  currency?: { code: string; symbol: string; name: string };
  created_at?: string;
}

// Portal-specific axios instance that reads client_token from localStorage
const portalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});
portalApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('client_token');
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
portalApi.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('client_token');
        localStorage.removeItem('client_user');
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  }
);

export { portalApi };

export const portal = {
  /** Authenticate a client user and receive a token. */
  login: (email: string, password: string) =>
    api.post<PortalLoginResponse>('/portal/login', { email, password }),

  /** List all projects owned by the authenticated client. */
  getProjects: (params?: { page?: number; per_page?: number }) =>
    portalApi.get<{ data: PortalProject[]; meta?: PaginationMeta }>('/portal/projects', { params }),

  /** Get a specific project with milestones. */
  getProject: (id: number) =>
    portalApi.get<{ data: PortalProject; milestones: PortalMilestone[] }>(`/portal/projects/${id}`),

  /** List read-only tasks for a client's project. */
  getProjectTasks: (projectId: number) =>
    portalApi.get<{ data: PortalTask[] }>(`/portal/projects/${projectId}/tasks`),

  /** List all invoices belonging to the authenticated client. */
  getInvoices: (params?: { page?: number; per_page?: number }) =>
    portalApi.get<{ data: PortalInvoice[]; meta?: PaginationMeta }>('/portal/invoices', { params }),
};

// ============================================================
// Reports Types & Bindings (Sprint 8A)
// ============================================================

export interface ReportParams {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  export?: string; // csv
}

export interface PipelineReportParams extends ReportParams {
  lead_date_type?: 'created' | 'converted';
}

export interface RevenueReportSummary {
  total_invoiced: number;
  total_collected: number;
  total_outstanding: number;
  collection_rate_pct: number;
  invoice_count: number;
  avg_invoice_value: number;
}

export interface RevenueReportTrend {
  month_key: string;
  invoiced_amount: number;
  collected_amount: number;
}

export interface RevenueReportTopClient {
  client_id: number;
  client_name: string;
  total_billed: number;
  total_paid: number;
  outstanding: number;
}

export interface RevenueReportData {
  period: { from: string; to: string };
  summary: RevenueReportSummary;
  trend: RevenueReportTrend[];
  top_clients: RevenueReportTopClient[];
}

export interface PipelineReportSummary {
  total_leads: number;
  converted_leads: number;
  conversion_rate_pct: number;
  avg_budget: number;
  total_pipeline_value: number;
  leads_created_period: number;
  leads_converted_period: number;
}

export interface PipelineByStage {
  stage_name: string;
  stage_color: string;
  lead_count: number;
  total_budget: string;
}

export interface PipelineBySource {
  source_name: string;
  source_color: string;
  lead_count: number;
  conversion_count: number;
  conversion_rate_pct: number;
}

export interface PipelineByExec {
  exec_name: string;
  lead_count: number;
  converted_count: number;
  total_pipeline_value: number;
  conversion_rate_pct: number;
}

export interface PipelineReportData {
  period: { from: string; to: string; date_type: string };
  summary: PipelineReportSummary;
  by_stage: PipelineByStage[];
  by_source: PipelineBySource[];
  by_exec: PipelineByExec[];
  temperature_split: {
    cold_count: number;
    warm_count: number;
    hot_count: number;
  };
}

export interface QuoteReportSummary {
  total_quotes: number;
  draft_count: number;
  pending_count: number;
  approved_count: number;
  sent_count: number;
  won_count: number;
  rejected_count: number;
  win_rate_pct: number;
  avg_quote_value: number;
  total_quote_value: number;
}

export interface QuoteReportFunnel {
  stage: string;
  count: number;
}

export interface QuoteReportTopService {
  service_name: string;
  quote_count: number;
  total_value: number;
}

export interface QuoteReportData {
  period: { from: string; to: string };
  summary: QuoteReportSummary;
  funnel: QuoteReportFunnel[];
  top_services: QuoteReportTopService[];
}

export interface ProfitabilityReportSummary {
  project_count: number;
  total_revenue: number;
  total_labor_cost: number;
  total_expense_cost: number;
  total_net_profit: number;
  avg_margin_pct: number;
}

export interface ProfitabilityReportRow {
  project_id: number;
  project_name: string;
  project_number: string;
  status: string;
  start_date: string;
  end_date: string;
  budget_amount: number;
  hours_logged: number;
  revenue: number;
  labor_cost: number;
  expense_cost: number;
  total_cost: number;
  net_profit: number;
  margin_percentage: number;
}

export interface ProfitabilityReportData {
  period: { from: string; to: string };
  summary: ProfitabilityReportSummary;
  breakdown: ProfitabilityReportRow[];
}

export interface UtilisationReportSummary {
  team_size: number;
  total_logged_hours: number;
  total_billable_hours: number;
  billable_rate_pct: number;
  avg_utilisation_pct: number;
}

export interface UtilisationReportRow {
  user_id: number;
  user_name: string;
  department: string;
  expected_hours: number;
  logged_hours: number;
  billable_hours: number;
  utilisation_pct: number;
  billable_rate_pct: number;
}

export interface UtilisationReportTopProject {
  project_name: string;
  total_hours: number;
  billable_hours: number;
}

export interface UtilisationReportData {
  period: { from: string; to: string };
  summary: UtilisationReportSummary;
  breakdown: UtilisationReportRow[];
  top_projects_by_hours: UtilisationReportTopProject[];
}

export interface ExpenseReportSummary {
  total_submitted: number;
  total_approved: number;
  total_pending: number;
  total_rejected: number;
  expense_count: number;
}

export interface ExpenseReportByCategory {
  category_name: string;
  category_color: string;
  count: number;
  total_amount: number;
}

export interface ExpenseReportByProject {
  project_name: string;
  count: number;
  total_amount: number;
}

export interface ExpenseReportByVendor {
  vendor_name: string;
  count: number;
  total_amount: number;
}

export interface ExpenseReportTrend {
  month_key: string;
  approved_amount: number;
  submitted_amount: number;
}

export interface ExpenseReportData {
  period: { from: string; to: string };
  summary: ExpenseReportSummary;
  by_category: ExpenseReportByCategory[];
  by_project: ExpenseReportByProject[];
  by_vendor: ExpenseReportByVendor[];
  trend: ExpenseReportTrend[];
}

export interface PayrollReportSummary {
  total_gross: number;
  total_net: number;
  total_deductions: number;
  total_bonuses: number;
  run_count: number;
}

export interface PayrollReportMonthRow {
  year: number;
  month: number;
  run_number: string;
  status: string;
  total_gross: number;
  total_net: number;
  employee_count: number;
}

export interface PayrollReportTopEarner {
  user_name: string;
  net_salary: number;
  base_salary: number;
  bonus_amount: number;
}

export interface PayrollReportData {
  period: { from: string; to: string };
  summary: PayrollReportSummary;
  by_month: PayrollReportMonthRow[];
  top_earners: PayrollReportTopEarner[];
}

export interface ClientReportSummary {
  total_clients: number;
  total_active: number;
  total_billed: number;
  total_collected: number;
  total_outstanding: number;
}

export interface ClientReportRow {
  client_id: number;
  client_name: string;
  client_email: string;
  active_projects: number;
  total_projects: number;
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
  last_invoice_date: string | null;
  last_payment_date: string | null;
}

export interface ClientReportData {
  period: { from: string; to: string };
  summary: ClientReportSummary;
  breakdown: ClientReportRow[];
}

export const reports = {
  getRevenue: (params?: ReportParams) =>
    api.get<RevenueReportData>('/reports/revenue', { params }),
  
  getPipeline: (params?: PipelineReportParams) =>
    api.get<PipelineReportData>('/reports/pipeline', { params }),
  
  getQuotes: (params?: ReportParams) =>
    api.get<QuoteReportData>('/reports/quotes', { params }),
  
  getProfitability: (params?: ReportParams) =>
    api.get<ProfitabilityReportData>('/reports/profitability', { params }),
  
  getUtilisation: (params?: ReportParams) =>
    api.get<UtilisationReportData>('/reports/utilisation', { params }),
  
  getExpenses: (params?: ReportParams) =>
    api.get<ExpenseReportData>('/reports/expenses', { params }),
  
  getPayroll: (params?: ReportParams) =>
    api.get<PayrollReportData>('/reports/payroll', { params }),
  
  getClients: (params?: ReportParams) =>
    api.get<ClientReportData>('/reports/clients', { params }),
};

// ============================================================
// Settings & Audit Logs & Backups Types (Sprint 8B)
// ============================================================

export interface CompanySettings {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_address: string;
  timezone: string;
  logo_url?: string | null;
}

export interface TaxSettings {
  default_tax_rate: number;
}

export interface NumberSequence {
  id: number;
  entity_type: 'lead' | 'quote' | 'invoice' | 'project' | 'task' | 'payroll' | string;
  prefix: string;
  current_number: number;
  padding_length: number;
  format: string;
}

export interface CurrencySetting {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate_to_inr: number;
  is_default: boolean;
  is_active: boolean;
}

export interface SystemSettings {
  company: CompanySettings;
  tax: TaxSettings;
  currencies: CurrencySetting[];
  number_sequences: NumberSequence[];
}

export interface AuditLog {
  id: number;
  user_id: number;
  user?: User;
  auditable_type: string;
  auditable_id: number;
  event: 'created' | 'updated' | 'deleted' | 'restored' | string;
  ip_address?: string;
  user_agent?: string;
  metadata?: {
    old?: Record<string, any>;
    new?: Record<string, any>;
    type?: string;
    filename?: string;
    restored_file?: string;
    fallback_backup?: string;
    [key: string]: any;
  } | null;
  created_at: string;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  user_id?: number;
  module?: string;
  event?: string;
  from?: string;
  to?: string;
}

export interface BackupFile {
  filename: string;
  size: number;
  created_at: string;
  status: 'valid' | 'corrupted';
}

export const platformSettings = {
  get: () => api.get<SystemSettings>('/settings'),
  updateCompany: (data: CompanySettings) => api.put<void>('/settings/company', data),
  updateTax: (data: TaxSettings) => api.put<void>('/settings/tax', data),
  updateNumberSequences: (sequences: NumberSequence[]) => api.put<void>('/settings/number-sequences', { sequences }),
  updateCurrencies: (data: { default_currency_code: string; active_currency_codes: string[] }) =>
    api.put<void>('/settings/currencies', data),
};

export const auditLogs = {
  list: (params?: AuditLogParams) =>
    api.get<{ data: AuditLog[]; meta: PaginationMeta }>('/audit-logs', { params }),
  exportCsv: (params?: AuditLogParams) =>
    api.get('/audit-logs', { params: { ...params, export: 'csv' }, responseType: 'blob' }),
};

export const backups = {
  list: () => api.get<BackupFile[]>('/backups'),
  create: () => api.post<BackupFile>('/backups'),
  restore: (filename: string) => api.post<void>(`/backups/${filename}/restore`),
  delete: (filename: string) => api.delete<void>(`/backups/${filename}`),
};


