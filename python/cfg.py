
import json
import logging
from classes.HIPDatabase import HIPDatabase

with open("../api-config.json") as json_data_file:
	settings = json.load(json_data_file)

logging.basicConfig(filename='../api.log', filemode='w', level=logging.DEBUG)

logging.debug('debug')
logging.info('info')
logging.warning('warning')
logging.error('error')
logging.critical('critical')


db = HIPDatabase(settings.get("mariadb"), logging)	

