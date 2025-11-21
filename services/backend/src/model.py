from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from typing import List, Optional

class CompanyISIN(BaseModel):
    description: str
    id: int
    isin: str
    name: str
    country: str
    mkt_cap: int
    stocks_owned: int
    def to_json(self):
        return jsonable_encoder(self, exclude_none=True)

class CompanySector(BaseModel):
    communication_services: Optional[float] = None
    communication_services_u: Optional[float] = None
    consumer_discretionary: Optional[float] = None
    consumer_discretionary_u: Optional[float] = None
    consumer_staples: Optional[float] = None
    consumer_staples_u: Optional[float] = None
    description: str
    energy: Optional[float] = None
    energy_u: Optional[float] = None
    financials: Optional[float] = None
    financials_u: Optional[float] = None
    gics_level: str
    gics_sector: str
    health_care: Optional[float] = None
    health_care_u: Optional[float] = None
    id: int
    isin: str
    industrials: Optional[float] = None
    industrials_u: Optional[float] = None
    information_technology: Optional[float] = None
    information_technology_u: Optional[float] = None
    materials: Optional[float] = None
    materials_u: Optional[float] = None
    name: str
    parse_date: str
    real_estate: Optional[float] = None
    real_estate_u: Optional[float] = None
    utilities: Optional[float] = None
    utilities_u: Optional[float] = None
    confidence: float
    def to_json(self):
        return jsonable_encoder(self, exclude_none=True)

class CompanyIndustryGroup(BaseModel):
    automobiles_components: int
    automobiles_components_u: int	
    banks: int
    banks_u: int	
    capital_goods: int	
    capital_goods_u: int	
    commercial_and_professional_services: int	
    commercial_and_professional_services_u: int	
    consumer_durables_apparel: int	
    consumer_durables_apparel_u: int	
    consumer_services: int	
    consumer_services_u: int	
    description: str
    energy: int
    energy_u: int	
    equity_real_estate_investment_trusts_reits: int
    equity_real_estate_investment_trusts_reits_u: int	
    financial_services: int
    financial_services_u: int	    
    food_staples_retail: int
    food_staples_retail_u: int
    food: int
    food_industry_group: int	
    beverage_tobacco: int 
    beverage_tobacco_u: int	
    gics_industry_group: str
    gics_level: str
    health_care_equipment_services: int
    health_care_equipment_services_u: int	
    household_personal_products: int
    household_personal_products_u: int	
    id: int	
    isin: str	
    insurance: int	
    insurance_u: int	
    materials: int	
    materials_u: int	
    media_entertainment: int	
    media_entertainment_u: int	
    name: str	
    parse_date: str	
    pharmaceuticals: int	
    pharmaceuticals_u: int	
    real_estate_management_development: int	
    real_estate_management_development_u: int	
    retailing: int	
    retailing_u: int	
    semiconductors_semiconductor_equipment: int	
    semiconductors_semiconductor_equipment_u: int	
    software_services: int	
    software_services_u: int	
    technology_hardware_equipment: int	
    technology_hardware_equipment_u: int	
    telecommunication_services: int	
    telecommunication_services_u: int	
    transportation: int	
    transportation_u: int	
    utilities: int	
    utilities_u: int	
    confidence: float
    
    