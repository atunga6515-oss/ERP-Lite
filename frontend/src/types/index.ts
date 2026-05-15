export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  status: string;
  permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  user_id: number;
  module_name: string;
  can_access: boolean;
}

export interface Warehouse {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  unit: string;
  category: string;
  supplier_name: string;
  min_stock_level: number;
  sale_price?: number;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  warehouse_id: number;
  product_id: number;
  quantity: number;
  warehouse?: Warehouse;
  product?: Product;
  updated_at: string;
}

export interface Recipe {
  id: number;
  product_id: number;
  product?: Product;
  items?: RecipeItem[];
  image_path: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: number;
  recipe_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
}

export interface Customer {
  id: number;
  name: string;
  authorized_person: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  authorized_person: string;
  email: string;
  phone: string;
  address: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: number;
  supplier_id?: number;
  supplier?: Supplier;
  purchase_date: string;
  note: string;
  total_price: number;
  status: string;
  user_id: number;
  items?: PurchaseItem[];
  created_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  product?: Product;
  warehouse_id: number;
  warehouse?: Warehouse;
  supplier_id?: number;
  supplier?: Supplier;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_qty: number;
}

export interface IssuingCompany {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  logo_path: string;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  quote_number: string;
  customer_id: number;
  customer?: Customer;
  issuing_company_id?: number;
  issuing_company?: IssuingCompany;
  quote_date: string;
  valid_until: string;
  sub_total: number;
  tax_total: number;
  total_price: number;
  status: string;
  note: string;
  currency: string;
  items?: QuoteItem[];
  created_at: string;
  updated_at: string;
}

export interface QuoteItem {
  id: number;
  quote_id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
}

export interface Sale {
  id: number;
  customer_id: number;
  customer?: Customer;
  sale_date: string;
  note: string;
  total_price: number;
  status: string;
  user_id: number;
  items?: SaleItem[];
  created_at: string;
  shipped_at?: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product?: Product;
  warehouse_id: number;
  warehouse?: Warehouse;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface WorkOrder {
  id: number;
  product_id: number;
  product?: Product;
  quantity: number;
  status: string;
  source_warehouse_id: number;
  source_warehouse?: Warehouse;
  target_warehouse_id: number;
  target_warehouse?: Warehouse;
  start_date: string;
  started_at?: string;
  end_date?: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: number;
  type: string;
  quantity: number;
  note?: string;
  timestamp: string;
  product_id: number;
  product?: Product;
  from_warehouse_id?: number;
  from_warehouse?: Warehouse;
  to_warehouse_id?: number;
  to_warehouse?: Warehouse;
  customer_id?: number;
  customer?: Customer;
  user_id?: number;
  user?: User;
}
