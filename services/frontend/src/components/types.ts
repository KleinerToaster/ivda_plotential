// representation of ISIN-based company info from /companies_isin
export interface CompanyISIN {
  id: number;
  description: string;
  country: string;
  market_cap: number;
  stocks_owned: number;
  isin: string;
  name: string;
}

// representation of sector data from /companies_sector and /companies_sector/<isin>
export interface CompanySector {
  description: string;
  id: number;
  isin: string;
  name: string;
  gics_sector: string;
  gics_level: string;
  confidence: number;
  communication_services?: number | null;
  communication_services_u?: number | null;
  consumer_discretionary?: number | null;
  consumer_discretionary_u?: number | null;
  consumer_staples?: number | null;
  consumer_staples_u?: number | null;
  energy?: number | null;
  energy_u?: number | null;
  financials?: number | null;
  financials_u?: number | null;
  health_care?: number | null;
  health_care_u?: number | null;
  industrials?: number | null;
  industrials_u?: number | null;
  information_technology?: number | null;
  information_technology_u?: number | null;
  materials?: number | null;
  materials_u?: number | null;
  real_estate?: number | null;
  real_estate_u?: number | null;
  utilities?: number | null;
  utilities_u?: number | null;
}

// representation of industry group data from /company_industry_group
export interface CompanyIndustryGroup {
  id: number;
  isin: string;
  gics_industry_group: string;
  confidence: number;
}


