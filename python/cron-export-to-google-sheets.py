
import json
import logging
import gspread
from classes.CivicDB import CivicDB

logging.basicConfig(filename='/home/ubuntu/cron-warnings.log', filemode='w', level=logging.WARNING)

with open("/home/ubuntu/api-config.json") as json_data_file:
    config = json.load(json_data_file)

new_sheet_rows = []
sheet_keys = False
country_names = {}


def get_country_name (country_id):

	if country_id: 
		if (country_id in country_names):
			return country_names[country_id]

		country_query = "SELECT name FROM country WHERE country_id = %s LIMIT 1"
		row           = db.fetchone(country_query, (country_id,))

		if (row and row['name']):
			logging.debug("Country name is " + str(row['name']))
			country_names[country_id] = row['name']
			return row['name']
		else:
			logging.debug("Country not found")

	return "Not Specified"



# Connect to DB
db = CivicDB(config.get("mariadb"), logging)
print("Connected to database")

gc = gspread.service_account(filename='/home/ubuntu/google-drive-api-credentials-production.json')

# https://docs.google.com/spreadsheets/d/11Qkl28RYeLg306IvrCCrYyBSxaHvICVyfIYsEOYKi5k/edit#gid=0
sheet = gc.open_by_key('11Qkl28RYeLg306IvrCCrYyBSxaHvICVyfIYsEOYKi5k')

worksheet = sheet.get_worksheet(0)
print("Connected to Google Sheet")

# query for all relevant flags
data_query = ("SELECT "
	"LEFT(flagging_event_status_link.timestamp, 16) as `timestamp`, "
	"flagging_event.flagging_event_id as `flagging event id`, "
	"flag_type.name as `flag type`, "
	"flag.severity, "
	"campaign.name as `campaign`, "
	"flagging_event.user_id as `user id`, "
	"locale.code as `language`, "
	"flagging_event.country_id as `country`, "
	"flagging_event.url as `url`, "
	"flagging_event.notes as `notes`"
	"FROM flag "
	"INNER JOIN flagging_event ON flag.flagging_event_id=flagging_event.flagging_event_id "
	"INNER JOIN flagging_event_status_link ON flag.flagging_event_id=flagging_event_status_link.flagging_event_id "
	"INNER JOIN flag_type ON flag.flag_type_id = flag_type.flag_type_id "
	"INNER JOIN campaign ON flagging_event.campaign_id = campaign.campaign_id "
	"INNER JOIN locale ON flagging_event.locale_id = locale.locale_id "
	"WHERE flagging_event.url NOT LIKE 'chrome%%'  "
	"AND flagging_event.url NOT LIKE 'moz-extension%%'  "
	"AND flagging_event.url NOT LIKE '127.0.0.1%%'  "
	"AND flagging_event.url NOT LIKE '%%www.damninteresting.com%%' "
	"AND flagging_event.notes NOT LIKE 'test%%'  "
	"AND flagging_event.notes NOT LIKE 'justin%%' "
	"AND flagging_event.notes NOT LIKE 'Alan%%' "
	"AND flagging_event.notes NOT LIKE '%%anand%%' "	
	"ORDER BY flagging_event_status_link.timestamp DESC;")

rows = db.fetchall(data_query)
print("There are " + str(len(rows)) + " flags in the database")

# assemble new sheet content
for row in rows:
	new_sheet_row = []

	if sheet_keys is False:
		sheet_keys = list(row.keys())
		new_sheet_rows.append(sheet_keys)

	for key in sheet_keys:
		new_sheet_row.append(row[key])

	new_sheet_row[7] = get_country_name(row['country'])

	new_sheet_rows.append(new_sheet_row)
	

# clear the existing google sheet contents
worksheet.clear()
print("Cleared old data")

# insert new content
worksheet.append_rows(new_sheet_rows)
print("Adding " + str(len(new_sheet_rows)) + " rows to spreadsheet (including column headers)")
 
# worksheet.format('A1:B1', {'textFormat': {'bold': False}})

print("Done.");
