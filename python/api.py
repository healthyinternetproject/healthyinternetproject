# Endpoints:
# 
# create account
# save a flag event
# check for messages
# mentor agree/disagree

#import sys
import json
import flask
from flask import request, jsonify, abort
from datetime import datetime
import random
import string
from argon2 import PasswordHasher
import logging
from classes.CivicDB import CivicDB
import mysql.connector

with open("../api-config.json") as json_data_file:
    config = json.load(json_data_file)
                                                             
# print log in example.log instead of the console, and set the log level to DEBUG (by default, it is set to WARNING)
logging.basicConfig(filename='../api.log', filemode='w', level=logging.DEBUG)

logging.debug('debug')
logging.info('info')
logging.warning('warning')
logging.error('error')
logging.critical('critical')

app = flask.Flask(__name__)
db = CivicDB(config.get("mariadb"), logging)
app.config["DEBUG"] = True



def quit_with_error(title,message,code=500):
	print(title + ": " + message)
	#return "<h1>" + title + "</h1><p>" + message + "</p>", code
	#sys.exit()
	abort(code, description=title)

	results = {
		'status': 'error',
		'error': title,
		'message': message,
		'code': code
	}
	
	return jsonify(results)



def random_string(string_length=10):
	"""Generate a random string of fixed length """
	# password_characters = string.ascii_letters + string.digits + string.punctuation
	characters = string.ascii_letters + string.digits
	randomstring = ''.join(random.choice(characters) for i in range(string_length))
	return randomstring


def authenticate_user(user_id, password):	
	# todo: limit login attempts to prevent brute force attacks

	if user_id is None: 
		return quit_with_error("Incomplete Request","Your request did not include all required parameters (user_id).", 400)

	if password is None: 
		return quit_with_error("Incomplete Request","Your request did not include all required parameters (password).", 400)

	print("Authenticating user id " + user_id + "...")
	
	auth_user = "SELECT * FROM user WHERE user_id = %s LIMIT 1"

	user = db.fetchone(auth_user, (user_id,))

	if user is not None:		
		ph = PasswordHasher()    
		# print(user)

		if (ph.verify(user['password_hash'], password)):
			return user
		else:
			print("Incorrect password\n")
	else:
		print("User not found\n")
	
	return False
	

@app.errorhandler(404)
def page_not_found(e):
	return quit_with_error("Not Found","The resource could not be found.", 404)


@app.route('/', methods=['GET'])
def home():
    return '<h1>Civic API (' + config['version'] + ')</h1>'


@app.route('/api/v1/register', methods=['POST'])
def api_register():
	timestamp        = datetime.now()	
	password         = random_string(20)
	ph               = PasswordHasher()
	hash             = ph.hash(password)	

	try:
		add_user = ("INSERT INTO user "
			"(created, password_hash, locale_id) "
			"VALUES (%s, %s, %s)")

		user_data = (timestamp, hash, 1)

		# Insert new user
		db.execute(add_user, user_data)
		user_id = db.lastrowid()

		# todo: Add role link
		add_role_link = ("INSERT INTO user_role_link"
			"(user_id, role_id, begin) "
			"VALUES (%s, %s, %s)"
			)

		role_link_data = (user_id, 1, timestamp) #default to role id 1, flagger

		db.execute(add_role_link, role_link_data)

		results = {
			'status': 'success',
			'user_id': user_id,
			'password': password
		}

		return jsonify(results)
	
	except mysql.connector.errors.DatabaseError as err:

		results = {
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)



@app.route('/api/v1/mission', methods=['POST'])
def api_mission():
	params           = json.loads(request.form.get("json"))
	mission_id       = params.get('mission_id')
	user_id          = request.form.get("user_id")
	password         = request.form.get("password")
	user             = authenticate_user(user_id, password)	

	if mission_id is None:
		print("missing mission_id\n")
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		print("auth failed\n")
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_mission = ("INSERT INTO user_mission_link "
			"(user_id, mission_id) "
			"VALUES (%s, %s)")

		mission_data = (user['user_id'], mission_id)

		db.execute(add_mission, mission_data)

		results = {
			'status': 'success'
		}

		return jsonify(results)

	except mysql.connector.errors.DatabaseError as err:

		results = {
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)



@app.route('/api/v1/flag', methods=['POST'])
def api_flag():	
	logging.debug(request.form.get("json"))
	params            = json.loads(request.form.get("json"))
	url               = params.get("url")
	notes             = params.get("notes")
	flags             = params.get("flags")
	campaign_id       = params.get("campaign_id")
	user_id           = request.form.get('user_id')
	password          = request.form.get('password')
	timestamp         = datetime.now()	
	user              = authenticate_user(user_id, password)
	flagging_event_id = 0;

	# print(jsonify(flags))

	if url is None:
		return quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		return quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_event = ("INSERT INTO flagging_event "
			"(user_id, locale_id, url, notes, campaign_id) "
			"VALUES (%s, %s, %s, %s, %s)")

		event_data = (user['user_id'], user['locale_id'], url, notes, campaign_id)

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
			'flagging_event_id': flagging_event_id
		}

		return jsonify(results)

	except mysql.connector.errors.DatabaseError as err:

		results = {
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)


	

if __name__ == '__main__':
	from waitress import serve
	serve(app, host="0.0.0.0", port=8080)





