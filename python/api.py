
import sys

import os
import json
import flask
from datetime import datetime, date, timedelta
from flask import request, jsonify, abort, send_from_directory
import string
from argon2 import PasswordHasher
import logging
from classes.HIPDatabase import HIPDatabase
import urllib.parse
import random
import hashlib

# Useful to troubleshoot Segmentation Faults
# import faulthandler
# faulthandler.enable()


with open("../api-config.json") as json_data_file:
	config = json.load(json_data_file)

# logging.basicConfig(filename='../api.log', filemode='w', level=logging.DEBUG)
logging.basicConfig(filename='../api.log', filemode='w', level=logging.ERROR)

logging.debug('debug')
logging.info('info')
logging.warning('warning')
logging.error('error')
logging.critical('critical')

verbose_mode = True
app = flask.Flask(__name__)
db = HIPDatabase(config.get("mariadb"), logging)
# app.config["DEBUG"] = True


def to_console (message):
	# return False
	if (verbose_mode is True):
		print("[" + str(datetime.now()) + "] " + message)


def quit_with_error(title,message,code=500):
	to_console(title + ": " + message)
	#return "<h1>" + title + "</h1><p>" + message + "</p>", code
	#sys.exit()
	#abort(code, description=title)

	results = {
		'status': 'error',
		'error': title,
		'message': message,
		'code': code
	}

	json = jsonify(results)
	
	print(json)
	return json


def random_string(string_length=10):
	"""Generate a random string of fixed length """
	# password_characters = string.ascii_letters + string.digits + string.punctuation
	characters = string.ascii_letters + string.digits
	randomstring = ''.join(random.choice(characters) for i in range(string_length))
	return randomstring


def random_number(digits=9):
	"""Generate a random number of fixed length """
	# zero not allowed as first digit, otherwise you get fewer digits than you expect if you convert to int
	firstdigit = '123456789' 
	characters = string.digits
	randomstring = random.choice(firstdigit) + ''.join(random.choice(characters) for i in range(digits-1))
	return randomstring


def get_unique_user_id():
	user_id = False
	available = False

	while available == False:
		user_id = random_number(9)
		existing = get_user_by_id(user_id)
		if existing is None:
			available = True
	return user_id;


def get_user_by_id (user_id):
	user_query = "SELECT * FROM user WHERE user_id = %s LIMIT 1"
	user = db.fetchone(user_query, (user_id,))
	return user


def authenticate_user(user_id, password, token=False):	
	# todo: limit login attempts to prevent brute force attacks
	if user_id is None: 
		return quit_with_error("Incomplete Request","Your request did not include all required parameters (user_id).", 400)

	if password is None: 
		return quit_with_error("Incomplete Request","Your request did not include all required parameters (password).", 400)

	to_console("Authenticating user id " + user_id + "...")

	if (token):
		if (token == generate_user_token(user_id, password)):
			to_console("Authenticated with token")
			user = {
				"user_id": user_id,
				"token": token
			}
			return user
		else:
			to_console("Expired/invalid token")

	
	user = get_user_by_id(user_id)

	if user is not None:		
		ph = PasswordHasher()
		# to_console(user)

		if (ph.verify(user['password_hash'], password)):
			user['token'] = generate_user_token(user_id, password)
			return user
		else:
			to_console("Incorrect password")
			return False
	else:
		to_console("User not found")
		return False


def generate_user_token (user_id, password):

	# generate a token that will grant this user access for up to 48 hours
	# this helps reduce load on the database
	# you can invalidate all tokens by changing the token_secret_key in ../api-config.json
	date_format = '%Y-%m-%dT%H:%M:%S.%f%z'
	today = date.today()
	today_string = today.strftime(date_format)
	tomorrow = today + timedelta(days=1)
	tomorrow_string = tomorrow.strftime(date_format)

	string = str(user_id) + "|" + password + "|" + today_string + "|" + tomorrow_string + "|" + config.get("token_secret_key")	
	token = hashlib.sha256(string.encode('utf-8')).hexdigest()
	print(token)
	return token


def get_locale_id(locale_string):

	if locale_string: 

		# replace underscore with hyphen to match our format
		locale_string = locale_string.replace("_", "-")

		# we use a LIKE query because the browser might send a less specific language code
		# e.g., 'en' rather than 'en-US'
		locale_query = "SELECT * FROM locale WHERE code LIKE %s LIMIT 1"
		locale       = db.fetchone(locale_query, ('%' + locale_string + '%',))

		if (locale and locale['locale_id']):
			logging.debug("Locale id is " + str(locale['locale_id']))
			return locale['locale_id']
		else:
			logging.debug("Locale not found")

	return config['default_locale_id']


def get_locale_string(locale_id):

	if locale_id: 

		locale_query = "SELECT * FROM locale WHERE locale_id = %s LIMIT 1"
		locale       = db.fetchone(locale_query, (locale_id,))

		if (locale and locale['code']):
			return locale['code']
		else:
			logging.debug("Locale not found")

	return False


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


def get_notification_type_name (notification_type_id):	
	query = "SELECT name FROM notification_type WHERE notification_type_id = %s"
	row = db.fetchone(query, (notification_type_id,))
	if (row):
		return row['name']
	return "notification"


def get_flag_type_name (flag_type_id):
	query = "SELECT name FROM flag_type WHERE flag_type_id = %s"
	row = db.fetchone(query, (flag_type_id,))
	if (row):
		return row['name']
	return "flag"


def get_campaign_name (campaign_id):
	query = "SELECT name FROM campaign WHERE campaign_id = %s"
	row = db.fetchone(query, (campaign_id,))
	if (row):
		return row['name']
	return ""


def get_flagging_event_create_date (flagging_event_id):
	try:
		query = ("SELECT DATE_FORMAT(timestamp, \"%%Y-%%m-%%d %%H:%%i:00\") as timestamp FROM flagging_event_status_link WHERE flagging_event_id = %s "
			"ORDER BY timestamp ASC LIMIT 1")
		row = db.fetchone(query, (flagging_event_id,))
		if (row):
			return row['timestamp']
	except Exception as err:
		return "0000-00-00 00:00:00"

	return ""


def get_flags(flagging_event_id):
	
	if (flagging_event_id):
		flags = []
		flag_query = "SELECT * FROM flag WHERE flagging_event_id = %s"
		flag_query_data = (flagging_event_id,)

		results = db.fetchall(flag_query, flag_query_data)

		for row in results:

			#print(str(flag))

			flag_details = {
				'type'    : get_flag_type_name(row['flag_type_id']),
				'severity': row['severity']
			}
			flags.append(flag_details)

		return flags

	else:
		return False


@app.errorhandler(404)
def page_not_found(e):
	return quit_with_error("Not Found","The resource could not be found.", 404)


@app.route('/', methods=['GET'])
def home():
	to_console("home")
	return '<h1>Civic API (' + config['version'] + ')</h1>'


@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(app.root_path, 'static'),'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/api/v1/register', methods=['GET','POST'])
def api_register():
	to_console("register")
	requestJson = request.form.get("json")
	timestamp   = datetime.now()
	password    = random_string(20)
	ph          = PasswordHasher()
	hash        = ph.hash(password)	
	params      = ''
	locale      = ''

	logging.debug("Trying to register user...")

	try:		
		requestJson = request.form.get("json")

		if not requestJson:
			# check if sent via GET, probably testing
			requestJson = request.args.get('json')

		if (requestJson):
			params = json.loads(requestJson)
			locale = params.get("locale")
			logging.debug("Request JSON: " + requestJson)
			logging.debug("Locale string: " + locale)
		else:
			logging.debug("Locale not found in params (" + str(requestJson) + ")");

		user_id = get_unique_user_id()
		locale_id = get_locale_id(locale)

		add_user = ("INSERT INTO user "
			"(user_id, created, password_hash, locale_id) "
			"VALUES (%s, %s, %s, %s)")

		user_data = (user_id, timestamp, hash, locale_id)

		# Insert new user
		db.execute(add_user, user_data)
		user_id = db.lastrowid()

		logging.debug("Added user ID " + str(user_id))

		add_role_link = ("INSERT INTO user_role_link"
			"(user_id, role_id, begin) "
			"VALUES (%s, %s, %s)"
			)

		role_link_data = (user_id, 1, timestamp) #default to role id 1, flagger

		db.execute(add_role_link, role_link_data)

		results = {
			'status': 'success',
			'user_id': user_id,
			'password': password,
			'token': generate_user_token(user_id, password)
		}

		return jsonify(results)
	
	except Exception as err:

		logging.debug("Database error")
		#logging.debug(err)

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)



@app.route('/api/v1/mission', methods=['POST'])
def api_mission():
	to_console("mission")
	params     = json.loads(request.form.get("json"))
	mission_id = params.get('mission_id')
	user_id    = request.values.get("user_id")
	password   = request.values.get("password")
	token      = request.values.get("token")
	user       = authenticate_user(user_id, password, token)	

	if mission_id is None:
		to_console("missing mission_id\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		to_console("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_mission = ("INSERT INTO user_mission_link "
			"(user_id, mission_id) "
			"VALUES (%s, %s)")

		mission_data = (user['user_id'], mission_id)

		db.execute(add_mission, mission_data)

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/country', methods=['POST'])
def api_country():
	to_console("country")
	params     = json.loads(request.form.get("json"))
	country_id = request.values.get('country_id')
	user_id    = request.values.get("user_id")
	password   = request.values.get("password")
	token      = request.values.get("token")
	user       = authenticate_user(user_id, password, token)	

	if country_id is None:
		to_console("missing country_id\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		to_console("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_country = ("INSERT INTO user_country_link "
			"(user_id, country_id) "
			"VALUES (%s, %s)")

		country_data = (user['user_id'], country_id)

		db.execute(add_country, country_data)

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/opt_out_preference', methods=['POST'])
def api_preference():
	to_console("preference")
	params             = json.loads(request.form.get("json"))
	preference_type_id = params.get('opt_out_preference_id')
	user_id            = request.values.get("user_id")
	password           = request.values.get("password")
	token              = request.values.get("token")
	user               = authenticate_user(user_id, password, token)	

	if preference_type_id is None:
		to_console("missing preference_id\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		to_console("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_preference = ("INSERT INTO opt_out_preferences_link "
			"(user_id, preference_type_id) "
			"VALUES (%s, %s)")

		preference_data = (user['user_id'], preference_type_id)

		db.execute(add_preference, preference_data)

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/opt_in_preference', methods=['POST'])
def api_expertise():
	to_console("expertise")
	params      = json.loads(request.form.get("json"))
	preference_type_id = params.get('opt_in_preference_id')
	user_id     = request.values.get("user_id")
	password    = request.values.get("password")
	token       = request.values.get("token")
	user        = authenticate_user(user_id, password, token)	

	if preference_type_id is None:
		to_console("missing expertise\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		to_console("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_expertise = ("INSERT INTO opt_in_preferences_link "
			"(user_id, preference_type_id) "
			"VALUES (%s, %s)")

		expertise_data = (user['user_id'], preference_type_id)

		db.execute(add_expertise, expertise_data)

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/reasoning', methods=['POST'])
def api_reasoning():
	to_console("reasoning")
	params    = json.loads(request.form.get("json"))
	reasoning = params.get('reasoning')
	user_id   = request.values.get("user_id")
	password  = request.values.get("password")
	token     = request.values.get("token")
	user      = authenticate_user(user_id, password, token)	

	if reasoning is None:
		to_console("missing reasoning\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		to_console("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_reasoning = ("INSERT INTO reasoning "
			"(user_id, reasoning) "
			"VALUES (%s, %s)")

		reasoning_data = (user['user_id'], reasoning)

		db.execute(add_reasoning, reasoning_data)

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)





@app.route('/api/v1/flag', methods=['POST'])
def api_flag():	
	to_console("flag")
	# logging.debug(request.form.get("json"))
	params            = json.loads(request.form.get("json"))
	url               = params.get("url")
	notes             = params.get("notes")
	flags             = params.get("flags")
	campaign_id       = params.get("campaign_id")
	locale            = params.get("locale")
	user_id           = request.values.get('user_id')
	password          = request.values.get('password')
	token             = request.values.get('token')
	timestamp         = datetime.now()	
	user              = authenticate_user(user_id, password) # we do not auth with token here because we want the user object to be complete
	flagging_event_id = 0;

	# to_console(jsonify(flags))	

	if url is None:
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		locale_id = get_locale_id(locale)

		# we store country with the flag data since it can later change for users
		country_id = user['country_id']

		# url is encoded on arrival, decode it before storing
		url = urllib.parse.unquote(url)

		# notes is encoded on arrival, decode it before storing
		notes = urllib.parse.unquote(notes)

		add_event = ("INSERT INTO flagging_event "
			"(user_id, locale_id, country_id, url, notes, campaign_id) "
			"VALUES (%s, %s, %s, %s, %s, %s)")

		event_data = (user['user_id'], locale_id, country_id, url, notes, campaign_id)

		# Insert new event
		db.execute(add_event, event_data)
		flagging_event_id = db.lastrowid()

		# insert individual flags

		for flag in flags:

			add_flag = ("INSERT INTO flag"
				"(flagging_event_id, flag_type_id, severity) "
				"VALUES (%s, %s, %s)")

			flag_data = (flagging_event_id, flag.get("flag_type_id"), flag.get("severity"))

			db.execute(add_flag, flag_data)

		# insert flag status

		add_status_link = ("INSERT INTO flagging_event_status_link "
			"(flagging_event_id, timestamp, flagging_event_status_id) "
			"VALUES (%s, %s, %s)")

		status_link_data = (flagging_event_id, timestamp, 1)

		# Insert new event
		db.execute(add_status_link, status_link_data)
		# status_id = cursor.lastrowid

		results = {
			'status': 'success',
			'flagging_event_id': flagging_event_id,
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)




@app.route('/api/v1/listcampaigns', methods=['GET'])
def api_listcampaigns():	
	to_console("listcampaigns")
	try:
		campaigns = []
		campaign_query = "SELECT * FROM campaign WHERE active = 1"
		rows = db.fetchall(campaign_query)
		
		for row in rows:
			campaigns.append(row['name'])
			
		results = {
			'status': 'success',
			'campaigns': campaigns
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/notifications', methods=['GET','POST'])
def api_notifications():
	to_console("notifications")	
	# logging.debug(request.form.get("json"))
	user_id           = request.values.get('user_id')
	password          = request.values.get('password')
	token             = request.values.get('token')
	timestamp         = datetime.now()	
	user              = authenticate_user(user_id, password, token)
	flagging_event_id = 0;	

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		notifications = []
		# select this user's notifications
		# some will be assigned directly by user id, others will be open but eligible for this user
		notification_query = "SELECT * FROM notification WHERE user_id = %s OR user_id_strict = %s"
		notification_query_data = (user_id, user_id)
		locale_id = user.get('locale_id')

		rows = db.fetchall(notification_query, notification_query_data)

		#db.start_transaction()

		for row in rows:
			notification = {
				'title': get_localized_string( row['title_string_key'], locale_id ),
				'body': get_localized_string( row['body_string_key'], locale_id ),
				'message_id': row['message_id'],
				'flagging_event_id': row['flagging_event_id'],
				'type': get_notification_type_name(row['notification_type_id']),
				'url': row['url']
			}
			notifications.append(notification)

			# archive sent notifications
			archive_query = ("INSERT IGNORE INTO notification_archive"
				"(notification_id, flagging_event_id, notification_type_id, user_id, user_id_strict, title_string_key, body_string_key, message_id, timestamp) "
				"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
			)

			db.execute(
				archive_query, 
				(
					row['notification_id'], 
					row['flagging_event_id'], 
					row['notification_type_id'], 
					row['user_id'], 
					row['user_id_strict'], 
					row['title_string_key'], 
					row['body_string_key'], 
					row['message_id'], 
					datetime.now()
				)
			)

			db.execute("DELETE FROM notification WHERE notification_id = %s", (row['notification_id'],))
			
		results = {
			'status': 'success',
			'notifications': notifications,
			'token': user.get("token")
		}

		#db.commit()

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		#db.rollback()

		return jsonify(results)


@app.route('/api/v1/message-test', methods=['GET','POST'])
def api_message_test():	
	to_console("message_test")
	user_id        = request.values.get('user_id')
	password       = request.values.get('password')
	token          = request.values.get('token')
	timestamp      = datetime.now()	
	user           = authenticate_user(user_id, password, token)

	# 113 is just an old flag useful for testing
	sample_flag_id = 113

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		message_query = ("INSERT INTO message" 
			"(user_id, flagging_event_id, subject, text, timestamp, reply_to)"
			"VALUES (%s, %s, %s, %s, %s, %s)"
		)		

		db.execute(message_query, (user_id, sample_flag_id, "Test Subject", "Test Message", timestamp, "alan@alanbellows.com"))

		message_id = db.lastrowid()

		notification_query = ("INSERT INTO notification"
			"(flagging_event_id, notification_type_id, user_id_strict, title_string_key, body_string_key, message_id, timestamp) "
			"VALUES (%s, %s, %s, %s, %s, %s, %s)"
		)
		
		db.execute(notification_query, (sample_flag_id, 1, user_id, 'message_from_a_journalist', 'click_here_to_read', message_id, timestamp))

		results = {
			'status': 'success',
			'token': user.get("token")
		}

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		db.rollback()

		return jsonify(results)


@app.route('/api/v1/message', methods=['GET','POST'])
def api_message():	
	to_console("message")
	requestJson = request.values.get("json")
	user_id     = request.values.get('user_id')
	password    = request.values.get('password')
	token       = request.values.get('token')
	user        = authenticate_user(user_id, password, token)
	results     = {}

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:

		if (requestJson):
			params = json.loads(requestJson)
			message_id = params.get("message_id")

			message_query = "SELECT * FROM message WHERE user_id = %s AND message_id = %s"
			message_query_data = (user_id, message_id)

			message = db.fetchone(message_query, message_query_data)

			if message:
				
				results = {
					'status' : 'success',
					'message': {
						'subject'   : message['subject'],
						'text'      : message['text'],
						'timestamp' : message['timestamp'],
						'reply_to'  : message['reply_to']
					},
					'flags': get_flags(message['flagging_event_id']),
					'token': user.get("token")
				}

				db.execute("UPDATE message SET viewed = %s WHERE user_id = %s AND message_id = %s", (datetime.now(),user_id,message_id))

				return jsonify(results)

			else:

				return page_not_found(False)		

		else:
			results = {
				'status': 'error',
				'message': "Error: Missing json parameter",				
			}			

	except Exception as err:

		results = {
			'error'   : "Error: {}".format(err),
			'status'  : 'error',
			'message' : 'Database error'
		}

		return jsonify(results)


@app.route('/api/v1/flagging-event', methods=['GET','POST'])
def api_flagging_event():	
	to_console("flagging-event")
	requestJson = request.values.get("json")
	user_id     = request.values.get('user_id')
	password    = request.values.get('password')
	token       = request.values.get('token')
	user        = authenticate_user(user_id, password, token)
	results     = {}

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		if (requestJson):
			params = json.loads(requestJson)
			flagging_event_id = params.get("flagging_event_id")

			flagging_event_query = "SELECT * FROM flagging_event WHERE user_id = %s AND flagging_event_id = %s"
			flagging_event_query_data = (user_id, flagging_event_id)

			flagging_event = db.fetchone(flagging_event_query, flagging_event_query_data)

			if flagging_event:

				results = {
					'status'        : 'success',
					'flagging_event': {
						'flagging_event_id' : flagging_event_id,
						'user_id'           : flagging_event['user_id'],
						'locale'            : get_locale_string(flagging_event['locale_id']),
						'url'               : flagging_event['url'],
						'notes'             : flagging_event['notes'],
						'campaign'          : get_campaign_name(flagging_event['campaign_id']),
						'timestamp'         : get_flagging_event_create_date(flagging_event_id),
						'flags'             : get_flags(flagging_event_id)
					},
					'token': user.get("token")
				}

				return jsonify(results)

			else:

				return page_not_found(False)		

		else:
			results = {
				'status': 'error',
				'message': "Error: Missing json parameter",				
			}			

	except Exception as err:

		results = {
			'error'   : "Error: {}".format(err),
			'status'  : 'error',
			'message' : 'Database error'
		}

		return jsonify(results)
	

if __name__ == '__main__':
	from waitress import serve
	serve(app, host="0.0.0.0", port=8080, url_scheme='https', threads=1)

