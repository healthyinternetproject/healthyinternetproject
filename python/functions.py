
import cfg
from datetime import datetime, date, timedelta
import json
from flask import jsonify
from argon2 import PasswordHasher
import hashlib
import string
import random


def to_console (message):
	# return False
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
	user = cfg.db.fetchone(user_query, (user_id,))
	return user


def authenticate_user (user_id, password, token=False):	
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

	string = str(user_id) + "|" + password + "|" + today_string + "|" + tomorrow_string + "|" + cfg.settings.get("token_secret_key")	
	token = hashlib.sha256(string.encode('utf-8')).hexdigest()
	print(token)
	return token


def get_locale_id (locale_string):

	if locale_string: 

		# replace underscore with hyphen to match our format
		locale_string = locale_string.replace("_", "-")

		# we use a LIKE query because the browser might send a less specific language code
		# e.g., 'en' rather than 'en-US'
		locale_query = "SELECT * FROM locale WHERE code LIKE %s LIMIT 1"
		locale       = cfg.db.fetchone(locale_query, ('%' + locale_string + '%',))

		if (locale and locale['locale_id']):
			cfg.logging.debug("Locale id is " + str(locale['locale_id']))
			return locale['locale_id']
		else:
			cfg.logging.debug("Locale not found")

	return cfg.settings['default_locale_id']


def get_locale_string (locale_id):

	if locale_id: 

		locale_query = "SELECT * FROM locale WHERE locale_id = %s LIMIT 1"
		locale       = cfg.db.fetchone(locale_query, (locale_id,))

		if (locale and locale['code']):
			return locale['code']
		else:
			cfg.logging.debug("Locale not found")

	return False


def get_localized_string ( string_key, locale_id ):
	string_query = "SELECT text FROM string WHERE string_key = %s AND locale_id = %s LIMIT 1"
	string       = cfg.db.fetchone(string_query, (string_key, locale_id))

	if (string):
		return string['text']
	elif (locale_id != 1):
		# default to English
		return get_localized_string( string_key, 1 )
	else:
		return "[Error: string not found]";


def get_notification_type_name (notification_type_id):	
	query = "SELECT name FROM notification_type WHERE notification_type_id = %s"
	row = cfg.db.fetchone(query, (notification_type_id,))
	if (row):
		return row['name']
	return "notification"


def get_flag_type_name (flag_type_id):
	query = "SELECT name FROM flag_type WHERE flag_type_id = %s"
	row = cfg.db.fetchone(query, (flag_type_id,))
	if (row):
		return row['name']
	return "flag"


def get_campaign_name (campaign_id):
	query = "SELECT name FROM campaign WHERE campaign_id = %s"
	row = cfg.db.fetchone(query, (campaign_id,))
	if (row):
		return row['name']
	return ""


def get_flagging_event_create_date (flagging_event_id):
	try:
		query = ("SELECT DATE_FORMAT(timestamp, \"%%Y-%%m-%%d %%H:%%i:00\") as timestamp FROM flagging_event_status_link WHERE flagging_event_id = %s "
			"ORDER BY timestamp ASC LIMIT 1")
		row = cfg.db.fetchone(query, (flagging_event_id,))
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

		results = cfg.db.fetchall(flag_query, flag_query_data)

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



def get_user_roles (user):

	roles = []
	query = ("SELECT role.name "
		"FROM role, user_role_link "
		"WHERE role.role_id = user_role_link.role_id "
		"AND user_role_link.user_id = %s")
	
	query_data = (user['user_id'],)

	results = cfg.db.fetchall(query, query_data)

	for row in results:
		#print(str(flag))
		roles.append(str(row['name']))

	return roles


def add_simple_notification (user, notification_type_id, title_string_key, body_string_key, url):
	timestamp = datetime.now()	

	# need alt version that assigns user_id_strict
	# need version that includes a message

	insert_notification = ("INSERT INTO notification " 
	"(notification_type_id, user_id_strict, title_string_key, body_string_key, url, timestamp) "
	"VALUES (%s, %s, %s, %s, %s, %s)")

	cfg.db.execute(insert_notification, (notification_type_id, user['user_id'], title_string_key, body_string_key, url, timestamp))
	return True


def user_has_role(user, role_name):

	if (user and role_name):
		roles = get_user_roles(user)

		for role in roles:
			if (role == role_name):
				return True

	return False


def get_flagging_event(flagging_event_id):

	query = ("SELECT * "
		"FROM flagging_event "
		"WHERE flagging_event_id = %s "
		"LIMIT 1")
	
	query_data = (flagging_event_id,)

	flagging_event = cfg.db.fetchone(query, query_data)

	if (flagging_event is None):
		return False

	return flagging_event



def mentor_can_respond(user, flagging_event_id):

	if (user_has_role(user, 'mentor') is False):
		return False

	if (mentor_has_other_pending(user, flagging_event_id)):
		return False

	if (mentor_is_submitter(user, flagging_event_id)):
		return False

	if (mentor_has_responded(user, flagging_event_id)):
		return False



	# todo: maybe one day we make sure we asked for this feedback
	# low risk, and low impact

	return True


def mentor_has_responded(user, flagging_event_id):

	query = ("SELECT * "
		"FROM flagging_event_response "
		"WHERE user_id = %s "
		"AND flagging_event_id = %s "
		"LIMIT 1")

	# todo: also need to make sure mentor hasn't turned this one away already
	
	query_data = (user['user_id'],flagging_event_id)

	results = cfg.db.fetchall(query, query_data)

	if (len(results) > 0):
		return True

	return False


def mentor_has_other_pending(user, flagging_event_id):

	query = ("SELECT * "
		"FROM flagging_event_response "
		"WHERE user_id = %s "
		"AND flagging_event_id != %s "
		"AND agree IS NULL "
		"LIMIT 1")

	# todo: also need to make sure mentor hasn't turned this one away already
	
	query_data = (user['user_id'],flagging_event_id)

	results = cfg.db.fetchall(query, query_data)

	if (len(results) > 0):
		return True

	return False


def mentor_is_submitter(user, flagging_event_id):

	query = ("SELECT user_id "
		"FROM flagging_event "
		"WHERE user_id = %s AND flagging_event_id = %s "
		"LIMIT 1")

	query_data = (user['user_id'],flagging_event_id)

	results = cfg.db.fetchall(query, query_data)

	if (len(results) > 0):
		return True

	return False