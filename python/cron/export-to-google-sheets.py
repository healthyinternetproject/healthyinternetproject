import pygsheets
import pandas as pd
#authorization

auth = pygsheets.authorize(service_file='../../google-api-credentials.json')

# Create empty dataframe
dataframe = pd.DataFrame()

# Create a column
dataframe['name'] = ['John', 'Steve', 'Sarah']

#open the google spreadsheet (where 'PY to Gsheet Test' is the name of my sheet)
spreadsheet = auth.open('1lElaB9Xl2S8LeMjOqRakPTVtEKguHcsqQUuY4jzkRc0')

#select the first sheet 
tab = spreadsheet[0]

#update the first sheet with df, starting at cell B2. 
tab.set_dataframe(dataframe,(1,1))
