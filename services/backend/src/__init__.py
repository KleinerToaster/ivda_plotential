from flask import Flask
from flask_cors import CORS
from flask_restx import Resource, Api
from flask_pymongo import PyMongo
from pymongo.collection import Collection
from .model import CompanyISIN, CompanySector, CompanyIndustryGroup
from flask import request
# Configure Flask & Flask-PyMongo:
app = Flask(__name__)
# allow access from any frontend
cors = CORS()
cors.init_app(app, resources={r"*": {"origins": "*"}})
# add your mongodb URI
app.config["MONGO_URI"] = "mongodb://localhost:27017/companiesdatabase"
pymongo = PyMongo(app)
# Get a reference to the companies collection.
companies_isin: Collection = pymongo.db.companyISIN
companies_sector: Collection = pymongo.db.companySector
companies_industry_group: Collection = pymongo.db.companyIndustryGroups
api = Api(app)

def _company_isin_from_doc(doc) -> CompanyISIN:
    return CompanyISIN(
        description=doc.get("Description") or doc.get("description"),
        id=doc.get("ID") or doc.get("id"),
        isin=doc.get("ISIN") or doc.get("isin"),
        name=doc.get("Name") or doc.get("name"),
        country=str(doc.get("country") or doc.get("Country") or ""),
        mkt_cap=int(doc.get("mktCap (EUR)") or doc.get("mkt_cap") or 0),
        stocks_owned=doc.get("stocksOwned") or doc.get("stocks_owned", 0),
    )

class CompaniesISINList(Resource):
    def get(self):
        cursor = companies_isin.find()
        return [_company_isin_from_doc(doc).to_json() for doc in cursor]

class CompanyISINDetail(Resource):
    def get(self, isin):
        cursor = companies_isin.find_one_or_404({"ISIN": isin})
        company_isin_obj = _company_isin_from_doc(cursor)
        return company_isin_obj.to_json()


class CompaniesISIN(Resource):
    def get(self, isin):
        cursor = companies_isin.find_one_or_404({"ISIN": isin})
        company = _company_isin_from_doc(cursor)
        return company.to_json()

class CompaniesSectorList(Resource):
    def get(self):
        cursor = companies_sector.find()
        return [CompanySector(**doc).to_json() for doc in cursor]

class CompaniesSectorDetail(Resource):
    def get(self, isin):
        cursor = companies_sector.find_one_or_404({"isin": isin})
        company = CompanySector(**cursor)
        return company.to_json()

class CompanyIndustryGroupList(Resource):
    def get(self):
        cursor = companies_industry_group.find()
        # Return raw docs but make them JSON-serializable by stringifying ObjectId
        docs = []
        for doc in cursor:
            doc = dict(doc)
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            docs.append(doc)
        return docs

api.add_resource(CompaniesISIN, '/companies_isin/<string:isin>')
api.add_resource(CompaniesSectorDetail, '/companies_sector/<string:isin>')
api.add_resource(CompanyISINDetail, '/company_isin/<string:isin>')
api.add_resource(CompaniesISINList, '/companies_isin')
api.add_resource(CompaniesSectorList, '/companies_sector')
api.add_resource(CompanyIndustryGroupList, '/company_industry_group')

# Import Groq client for poem generation
from .llm.groq_llm import GroqClient
import os

class PoemGenerator(Resource):
    def get(self, id):
        print(f"Poem generation request for company ID: {id}")
        try:
            # Get the company by ID
            print(f"Looking up company with ID: {id}")
            company_cursor = companies.find_one_or_404({"id": id})
            company = Company(**company_cursor)
            print(f"Found company: {company.name}")
            
            # Get any keywords from the request
            args = request.args.to_dict()
            keywords = args.get('keywords', '')
            print(f"Keywords provided: {keywords if keywords else 'None'}")
            
            # Initialize Groq client
            print("Initializing Groq client")
            groq_client = GroqClient()
            print(f"API key available: {bool(groq_client.api_key)}")
            
            # Get the path to the prompts directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompt_path = os.path.join(current_dir, 'llm', 'prompts', 'groq_api_poem.json')
            print(f"Prompt file exists: {os.path.exists(prompt_path)}")
            
            # Generate poem about the company
            print(f"Generating poem for {company.name} with keywords: {keywords}")
            poem = groq_client.generate_poem(company.name, prompt_path, keywords)
            print("Poem generated successfully")
            
            return {"poem": poem}
            
        except Exception as e:
            print(f"Error in poem generation: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}, 500

api.add_resource(PoemGenerator, '/llm/groq/poem/<int:id>')

class AdditionalInformationGenerator(Resource):
    def get(self, id):
        print(f"Additional information request for company ID: {id}")
        try:
            # Get the company by ID
            print(f"Looking up company with ID: {id}")
            company_cursor = companies.find_one_or_404({"id": id})
            company = Company(**company_cursor)
            print(f"Found company: {company.name}")
            
            # Get any qualifications from the request
            args = request.args.to_dict()
            qualifications = args.get('qualifications', '')
            print(f"Qualifications provided: {qualifications if qualifications else 'None'}")
            
            # Initialize Groq client
            print("Initializing Groq client")
            groq_client = GroqClient()
            print(f"API key available: {bool(groq_client.api_key)}")
            
            # Get the path to the prompts directory
            current_dir = os.path.dirname(os.path.abspath(__file__))
            prompt_path = os.path.join(current_dir, 'llm', 'prompts', 'groq_api_additional_information.json')
            print(f"Prompt file exists: {os.path.exists(prompt_path)}")
            
            # Generate additional information about the company
            print(f"Generating qualification list for {company.name} with user qualifications: {qualifications}")
            additional_info = groq_client.generate_poem(company.name, prompt_path, qualifications)
            print("Additional information generated successfully")
            
            return {"additional_information": additional_info}
            
        except Exception as e:
            print(f"Error in poem generation: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}, 500

api.add_resource(AdditionalInformationGenerator, '/llm/groq/additional_information/<int:id>')

class Ping(Resource):
    def get(self):
        return {
            'status': 'success',
            'message': 'pong!'
        }
        
# Make sure the route is properly registered
api.add_resource(Ping, '/ping')


# Add an explicit route for debugging
@app.route('/test')
def test():
    return {"status": "Server is running correctly"}