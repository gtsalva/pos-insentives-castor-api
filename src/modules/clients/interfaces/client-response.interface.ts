export interface ClientResponse {
  client_id: string;
  nit: string | null;
  dpi: string | null;
  full_name: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_department: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
