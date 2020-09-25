

import logging
import json
from classes.HIPDatabase import HIPDatabase

with open("../api-config.json") as json_data_file:
	config = json.load(json_data_file)

logging.basicConfig(filename='../test.log', filemode='w', level=logging.DEBUG)

logging.debug('debug')
logging.info('info')
logging.warning('warning')
logging.error('error')
logging.critical('critical')

verbose_mode = True
db = HIPDatabase(config.get("mariadb"), logging)

print("Connected to database.")

cursor = db.get_cursor()
campaigns = []
campaign_query = "SELECT * FROM campaign WHERE active = 1"
cursor.execute(campaign_query)
rows = cursor.fetchall()

for row in rows:
	print(row['name'])

cursor.close()
db.close()