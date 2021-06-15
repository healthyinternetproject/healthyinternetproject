
import sys
import json
import logging
import gspread
from classes.CivicDB import CivicDB
import os 

dir_path = os.path.dirname(os.path.realpath(__file__))

print("Starting")

logging.basicConfig(filename=dir_path + '/../cron-warnings.log', filemode='w', level=logging.WARNING)

with open(dir_path + "/../api-config.json") as json_data_file:
    config = json.load(json_data_file)

print("Loaded config")

new_sheet_rows = []
sheet_keys = False
country_names = {}
last_url = ''
last_flag_id = 0
last_flag_type = ''
current_row = False
local_test_mode = False
sheet_columns = []

flag_types = ['Worthwhile ideas','Lies or manipulation','Abuse or harassment','Division or fear']
sheet_columns_flag_types_offset = 3 # flag types appear at this column index

severity_strings = ['','Mild','Medium','Severe']	
severity_strings_worthwhile = ['','Minor','Medium','Brilliant']	

if len(sys.argv) > 1 and sys.argv[1] == 'test':
	local_test_mode = True

# if you change this order, you may need to update numeric indexes below

sheet_columns.append('Timestamp')
sheet_columns.append('Country')
sheet_columns.append('Language')
sheet_columns.append(flag_types[0])
sheet_columns.append(flag_types[1])
sheet_columns.append(flag_types[2])
sheet_columns.append(flag_types[3])
sheet_columns.append('URL')
sheet_columns.append('Notes')
sheet_columns.append('User ID')
sheet_columns.append('Flag ID')


def fill_type_severity_columns (flag_type, severity, row):
	new_row = row
	severity_string = ''
	i = sheet_columns_flag_types_offset

	# if flag_type == flag_types[0]:
	# 	severity_string = severity_strings_worthwhile[severity]
	# else:
	# 	severity_string = severity_strings[severity]

	severity_string = str(severity)

	for t in flag_types:
		if t == flag_type:
			new_row[i] = severity_string
		i = i + 1

	return new_row



# Connect to DB
db = CivicDB(config.get("mariadb"), logging)
print("Connected to database")

if local_test_mode is False:
	gc = gspread.service_account(filename='/home/ubuntu/google-drive-api-credentials-production.json')

	# https://docs.google.com/spreadsheets/d/11Qkl28RYeLg306IvrCCrYyBSxaHvICVyfIYsEOYKi5k/edit#gid=0
	sheet = gc.open_by_key('11Qkl28RYeLg306IvrCCrYyBSxaHvICVyfIYsEOYKi5k')

	worksheet = sheet.get_worksheet(0)
	print("Connected to Google Sheet")

# query for all relevant flags

data_query = ("SELECT "
	"LEFT(flagging_event_status_link.timestamp, 16) as `Timestamp`, "
	"country.name as `Country`, "
	"locale.code as `Language`, "
	"flag_type.name as `Flag Type`, "
	"flag.severity as `Severity`, "
	"campaign.name as `Hashtag`, "
	"flagging_event.url as `URL`, "
	"flagging_event.notes as `Notes`, "
	"flagging_event.user_id as `User ID`, "
	"flagging_event.flagging_event_id as `Flag ID` "
	"FROM flag "
	"INNER JOIN flagging_event ON flag.flagging_event_id=flagging_event.flagging_event_id "
	"INNER JOIN flagging_event_status_link ON flag.flagging_event_id=flagging_event_status_link.flagging_event_id "
	"INNER JOIN flag_type ON flag.flag_type_id = flag_type.flag_type_id "
	"INNER JOIN campaign ON flagging_event.campaign_id = campaign.campaign_id "
	"INNER JOIN locale ON flagging_event.locale_id = locale.locale_id "
	"INNER JOIN user_country_link ON user_country_link.user_id=flagging_event.user_id "
	"INNER JOIN country ON country.country_id = user_country_link.country_id "
	"WHERE flagging_event.url NOT LIKE 'chrome%%'  "
	"AND flagging_event.url NOT LIKE 'moz-extension%%'  "
	"AND flagging_event.url NOT LIKE '%%127.0.0.1%%'  "
	"AND flagging_event.url NOT LIKE '%%www.damninteresting.com%%' "
	"AND flagging_event.notes NOT LIKE 'test%%'  "
	"AND flagging_event.notes NOT LIKE 'justin%%' "
	"AND flagging_event.notes NOT LIKE 'Alan%%' "
	"AND flagging_event.notes NOT LIKE '%%anand%%' "	
	"ORDER BY flagging_event_status_link.timestamp DESC;")

print(data_query)

rows = db.fetchall(data_query)
print("There are " + str(len(rows)) + " flags in the database")

new_sheet_rows.append(sheet_columns)

# assemble new sheet content
for row in rows:
	flag_id = row['Flag ID']
	flag_type = row['Flag Type']
	severity =  row['Severity'] 


	if current_row and current_row[10] == flag_id:
		# this is part of the same flag as the previously processed row
		# need to update type/severity
		current_row = fill_type_severity_columns(flag_type, severity, current_row)
		
	else:
		# a new flag

		if current_row:
			#write out the row we were building
			new_sheet_rows.append(current_row)

		current_row = []
		current_row.append(row['Timestamp']) 
		current_row.append(row['Country'])
		current_row.append(row['Language'])		
		current_row.append('') # these filled in later
		current_row.append('')
		current_row.append('')
		current_row.append('')
		current_row.append(row['URL'])
		current_row.append(row['Notes'])
		current_row.append(row['User ID'])
		current_row.append(row['Flag ID'])

		if row['Hashtag'] and row['Hashtag'] != 'none':
			# used the old hashtag system
			current_row[8] = current_row[8] + " #" + row['Hashtag']

		current_row = fill_type_severity_columns(flag_type, severity, current_row)


	if row['Country'] is None:	
		current_row[1] = 'Not Specified'


# append the last row that was built
if current_row:
	new_sheet_rows.append(current_row)

	
#get old hashtag and add to notes


if local_test_mode:
	for row in new_sheet_rows:
		for col in row:
			print('"' + str(col) + '"', end='')
			print(",", end='') 
		print("\n", end='')

else:
	# clear the existing google sheet contents
	worksheet.clear()
	print("Cleared old data")

	# insert new content
	worksheet.append_rows(new_sheet_rows)
	print("Adding " + str(len(new_sheet_rows)) + " rows to spreadsheet (including column headers)")
	 
	# worksheet.format('A1:B1', {'textFormat': {'bold': False}})

print("Done.")

