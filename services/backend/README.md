#### Install MongoDB and Import the Data
1. Install MongoDB and MongoDB Compass.
- https://www.mongodb.com/docs/manual/installation/
- https://www.mongodb.com/docs/compass/current/install/
- Hint: Troubleshooting with M1 macbook for errors with brew: https://stackoverflow.com/questions/64882584/how-to-run-the-homebrew-installer-under-rosetta-2-on-m1-macbook
2. Launch the MongoDB Compass and click "connect" to the localhost. (Be sure mongodb is started in case of any errors)
3. Click on Databases and create a database called "companiesdatabase" with the collection name "companies"

#### Run the Backend
Run ``python app.py run``

ignore potential warnings and navigate to http://127.0.0.1:5000/companies