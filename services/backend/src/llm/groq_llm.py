import os
import requests
import json
from dotenv import load_dotenv
import sys

# Load environment variables from .env file, looking in parent directories if needed
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

# Get the API key and print debug info
GROQ_API_KEY = os.getenv('API_KEY_GROQ')
print(f"API key environment variable found: {GROQ_API_KEY is not None}")
print(f"Current working directory: {os.getcwd()}")
print(f"Python path: {sys.path}")

class GroqClient:
    def __init__(self):
        self.api_key = GROQ_API_KEY
        self.base_url = "https://api.groq.com/openai/v1"

    def generate_poem(self, company_name, prompt_file_path, extra_info=''):
        # Check if API key is available
        if not self.api_key:
            print("ERROR: No GROQ API key found. Please check your .env file.")
            return "No API key found. Please check server configuration."

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            # Load prompt file
            print(f"Opening prompt file: {prompt_file_path}")
            with open(prompt_file_path, 'r') as file:
                messages_data = json.load(file)

            # Replace {company_name} and any other placeholders in the prompt
            for message in messages_data["messages"]:
                message["content"] = message["content"].replace("{company_name}", company_name)
                
                # Replace keywords or qualifications if provided
                if '{keywords}' in message["content"] and extra_info:
                    message["content"] = message["content"].replace("{keywords}", extra_info)
                
                if '{qualifications}' in message["content"] and extra_info:
                    message["content"] = message["content"].replace("{qualifications}", extra_info)
                    
                # Remove placeholder text if no extra info was provided
                message["content"] = message["content"].replace("{keywords}", "")
                message["content"] = message["content"].replace("{qualifications}", "")

            # Print request details
            print(f"Making API request to: {url}")
            print(f"Company name: {company_name}")
            
            # Make the API request
            payload = {"model": "llama-3.1-8b-instant", "messages": messages_data["messages"]}
            print(f"Request payload: {json.dumps(payload)}")
            
            response = requests.post(url, json=payload, headers=headers)
            print(f"Response status code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()["choices"][0]["message"]["content"]
                print(f"Successfully generated poem (first 50 chars): {result[:50]}...")
                return result
            else:
                error_msg = f"API Error: {response.status_code} - {response.text}"
                print(error_msg)
                return error_msg
                
        except Exception as e:
            error_msg = f"Error generating poem: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return error_msg