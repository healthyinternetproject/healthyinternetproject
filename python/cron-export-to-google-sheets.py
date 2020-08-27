
import json
import logging
import gspread
from classes.CivicDB import CivicDB

logging.basicConfig(filename='../api.log', filemode='w', level=logging.WARNING)

with open("../api-config.json") as json_data_file:
    config = json.load(json_data_file)

new_sheet_rows = []
sheet_keys = False

# Connect to DB
db = CivicDB(config.get("mariadb"), logging)
gc = gspread.service_account(filename='../google-drive-api-credentials.json')
print("Connected to database")

# Connect to google sheet
sheet = gc.open("Copy of Healthy Internet Project Flags")
worksheet = sheet.get_worksheet(0)
print("Connected to Google Sheet")

# query for all relevant flags
data_query = ("SELECT LEFT(flagging_event_status_link.timestamp, 16) as timestamp, flag_type.name as `flag type`, flag.severity, campaign.name as `campaign`,  locale.code as locale, flagging_event.url, flagging_event.notes FROM flag "
	"INNER JOIN flagging_event "
	"ON flag.flagging_event_id=flagging_event.flagging_event_id "
	"INNER JOIN flagging_event_status_link "
	"ON flag.flagging_event_id=flagging_event_status_link.flagging_event_id "
	"INNER JOIN flag_type "
	"ON flag.flag_type_id = flag_type.flag_type_id "
	"INNER JOIN campaign "
	"ON flagging_event.campaign_id = campaign.campaign_id "
	"INNER JOIN locale  "
	"ON flagging_event.locale_id = locale.locale_id "
	"WHERE flagging_event.url NOT LIKE 'chrome%%'  "
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

	new_sheet_rows.append(new_sheet_row)
	

# clear the existing google sheet contents
worksheet.clear()
print("Cleared old data")


# insert new content
worksheet.append_rows(new_sheet_rows)
print("Adding " + str(len(new_sheet_rows)) + " rows to spreadsheet (including column headers")
 
# worksheet.format('A1:B1', {'textFormat': {'bold': True}})


print("Done.");

# print(sheet.sheet1.get('A1'))
# list_of_hashes = worksheet.get_all_records()
# print(list_of_hashes)