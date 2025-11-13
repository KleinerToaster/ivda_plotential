from flask import Flask
from flask_cors import CORS
from flask_restx import Resource, Api
from flask_pymongo import PyMongo
from pymongo.collection import Collection
from .model import Company
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
companies: Collection = pymongo.db.companies
api = Api(app)
class CompaniesList(Resource):
    def get(self, args=None):
        # retrieve the arguments and convert to a dict
        args = request.args.to_dict()
        print(args)
        # Check if category parameter exists
        if 'category' not in args:
            # If no category specified, return all companies
            cursor = companies.find()
        # If the user specified category is "All" we retrieve all companies
        elif args['category'] == 'All':
            cursor = companies.find()
        # In any other case, we only return the companies where the category applies
        else:
            cursor = companies.find(args)
        # we return all companies as json
        return [Company(**doc).to_json() for doc in cursor]
class Companies(Resource):
    def get(self, id):
        import pandas as pd
        from statsmodels.tsa.ar_model import AutoReg
        # search for the company by ID
        cursor = companies.find_one_or_404({"id": id})
        company = Company(**cursor)
        # retrieve args
        args = request.args.to_dict()
        # retrieve the profit
        profit = company.profit
        
        # Check if algorithm parameter exists
        if 'algorithm' in args:
            # add to df
            profit_df = pd.DataFrame(profit).iloc[::-1]
            
            if args['algorithm'] == 'random':
                # retrieve the profit value from 2021
                prediction_value = int(profit_df["value"].iloc[-1])
                # add the value to profit list at position 0
                company.profit.insert(0, {'year': 2022, 'value': prediction_value})
            elif args['algorithm'] == 'regression':
                # create model
                model_ag = AutoReg(endog=profit_df['value'], lags=1, trend='c', seasonal=False, exog=None, hold_back=None,
                                period=None, missing='none')
                # train the model
                fit_ag = model_ag.fit()
                # predict for 2022 based on the profit data
                prediction_value = fit_ag.predict(start=len(profit_df), end=len(profit_df), dynamic=False).values[0]
                # add the value to profit list at position 0
                company.profit.insert(0, {'year': 2022, 'value': prediction_value})
            
        
        return company.to_json()
        
api.add_resource(CompaniesList, '/companies')
api.add_resource(Companies, '/companies/<int:id>')

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