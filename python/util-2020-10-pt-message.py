
# Send a notification to all Portuguese users

import logging
import json
from datetime import datetime
from classes.HIPDatabase import HIPDatabase

with open("../api-config.json") as json_data_file:
	config = json.load(json_data_file)

logging.basicConfig(filename='../utils.log', filemode='w', level=logging.DEBUG)

logging.debug('debug')
logging.info('info')
logging.warning('warning')
logging.error('error')
logging.critical('critical')

verbose_mode = True
db = HIPDatabase(config.get("mariadb"), logging)

print("Connected to database.")


def get_localized_string( string_key, locale_id ):
	string_query = "SELECT text FROM string WHERE string_key = %s AND locale_id = %s LIMIT 1"
	string       = db.fetchone(string_query, (string_key, locale_id))

	if (string):
		return string['text']
	elif (locale_id != 1):
		# default to English
		return get_localized_string( string_key, 1 )
	else:
		return "[Error: string not found]";


############## Custom code here ##############


user_query = "SELECT * FROM user WHERE locale_id = 151"
#user_query = "SELECT * FROM user WHERE user_id IN (369909115)" # ,521695950,960796633)"

insert_notification = ("INSERT INTO notification " 
	"(notification_type_id, user_id_strict, title_string_key, body_string_key, message_id, timestamp) "
	"VALUES (3, %s, 'your_flags_matter', 'click_to_read_about_impact', %s, %s)")

insert_message = ("INSERT INTO message " 
	"(user_id, subject, text, timestamp) "
	"VALUES (%s, %s, %s, %s)")


users = db.fetchall(user_query)
count = 0
timestamp = datetime.now()	

for user in users:
	count = count+1
	subject = get_localized_string('title_community_update', user['locale_id'])
	text = get_localized_string('body_community_impact_2020_10', user['locale_id'])

	db.execute(insert_message, (user['user_id'], subject, text, timestamp))
	messageid = db.lastrowid()

	print("Message id = " + str(messageid))

	db.execute(insert_notification, (user['user_id'], messageid, timestamp))

	print(user['user_id'])

db.close()

print("\n" + str(count) + " users.\n\n")


