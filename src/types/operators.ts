export interface Operator {
  id: string;
  name: string;
  country_code: string;
  forward_code: string;
  cancel_code: string;
  logo_url?: string;
  active?: boolean;
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  operators: Operator[];
  active?: boolean;
}

export interface ForwardingCode {
  code: string;
  description: string;
}