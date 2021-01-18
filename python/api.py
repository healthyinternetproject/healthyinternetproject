
# We've moved all common functions to functions.py
# to call those function we now need to use functions.functioname()
# e.g., functions.random_string(20) instead of just random_string(20)


import sys
import os
import json
import flask
from datetime import datetime, date
from flask import request, jsonify, abort, send_from_directory
import string
from argon2 import PasswordHasher
import urllib.parse
import random
import cfg
import functions

# Useful to troubleshoot Segmentation Faults
# import faulthandler
# faulthandler.enable()

app = flask.Flask(__name__)
# app.config["DEBUG"] = True



@app.route('/', methods=['GET'])
def home():
	functions.to_console("home")
	return '<h1>Civic API (' + cfg.settings['version'] + ')</h1>'


@app.route('/favicon.ico')
def favicon():
	return send_from_directory(os.path.join(app.root_path, 'static'),'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/api/v1/register', methods=['GET','POST'])
def api_register():
	functions.to_console("register")
	requestJson = request.form.get("json")
	timestamp   = datetime.now()
	password    = functions.random_string(20)
	ph          = PasswordHasher()
	hash        = ph.hash(password)	
	params      = ''
	locale      = ''

	cfg.logging.debug("Trying to register user...")

	try:		
		requestJson = request.form.get("json")

		if not requestJson:
			# check if sent via GET, probably testing
			requestJson = request.args.get('json')

		if (requestJson):
			params = json.loads(requestJson)
			locale = params.get("locale")
			cfg.logging.debug("Request JSON: " + requestJson)
			cfg.logging.debug("Locale string: " + locale)
		else:
			cfg.logging.debug("Locale not found in params (" + str(requestJson) + ")");

		user_id = functions.get_unique_user_id()
		locale_id = functions.get_locale_id(locale)

		add_user = ("INSERT INTO user "
			"(user_id, created, password_hash, locale_id) "
			"VALUES (%s, %s, %s, %s)")

		user_data = (user_id, timestamp, hash, locale_id)

		# Insert new user
		cfg.db.execute(add_user, user_data)
		user_id = cfg.db.lastrowid()

		cfg.logging.debug("Added user ID " + str(user_id))

		add_role_link = ("INSERT INTO user_role_link"
			"(user_id, role_id, begin) "
			"VALUES (%s, %s, %s)"
			)

		role_link_data = (user_id, 1, timestamp) #default to role id 1, flagger

		cfg.db.execute(add_role_link, role_link_data)

		results = {
			'status': 'success',
			'user_id': user_id,
			'password': password,
			'token': functions.generate_user_token(user_id, password)
		}

		return jsonify(results)
	
	except Exception as err:

		cfg.logging.debug("Database error")
		#cfg.logging.debug(err)

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		return jsonify(results)



@app.route('/api/v1/mission', methods=['POST'])
def api_mission():
	functions.to_console("mission")
	params     = json.loads(request.form.get("json"))
	mission_id = params.get('mission_id')
	user_id    = request.values.get("user_id")
	password   = request.values.get("password")
	token      = request.values.get("token")
	user       = functions.authenticate_user(user_id, password, token)	

	if mission_id is None:
		functions.to_console("missing mission_id\n")
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		functions.to_console("auth failed\n")
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_mission = ("INSERT INTO user_mission_link "
			"(user_id, mission_id) "
			"VALUES (%s, %s)")

		mission_data = (user['user_id'], mission_id)

		cfg.db.execute(add_mission, mission_data)

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
	functions.to_console("country")
	params     = json.loads(request.form.get("json"))
	country_id = request.values.get('country_id')
	user_id    = request.values.get("user_id")
	password   = request.values.get("password")
	token      = request.values.get("token")
	user       = functions.authenticate_user(user_id, password, token)	

	if country_id is None:
		functions.to_console("missing country_id\n")
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		functions.to_console("auth failed\n")
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_country = ("INSERT INTO user_country_link "
			"(user_id, country_id) "
			"VALUES (%s, %s)")

		country_data = (user['user_id'], country_id)

		cfg.db.execute(add_country, country_data)

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
	functions.to_console("preference")
	params             = json.loads(request.form.get("json"))
	preference_type_id = params.get('opt_out_preference_id')
	user_id            = request.values.get("user_id")
	password           = request.values.get("password")
	token              = request.values.get("token")
	user               = functions.authenticate_user(user_id, password, token)	

	if preference_type_id is None:
		functions.to_console("missing preference_id\n")
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		functions.to_console("auth failed\n")
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_preference = ("INSERT INTO opt_out_preferences_link "
			"(user_id, preference_type_id) "
			"VALUES (%s, %s)")

		preference_data = (user['user_id'], preference_type_id)

		cfg.db.execute(add_preference, preference_data)

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
	functions.to_console("expertise")
	params      = json.loads(request.form.get("json"))
	preference_type_id = params.get('opt_in_preference_id')
	user_id     = request.values.get("user_id")
	password    = request.values.get("password")
	token       = request.values.get("token")
	user        = functions.authenticate_user(user_id, password, token)	

	if preference_type_id is None:
		functions.to_console("missing expertise\n")
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		functions.to_console("auth failed\n")
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_expertise = ("INSERT INTO opt_in_preferences_link "
			"(user_id, preference_type_id) "
			"VALUES (%s, %s)")

		expertise_data = (user['user_id'], preference_type_id)

		cfg.db.execute(add_expertise, expertise_data)

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
	functions.to_console("reasoning")
	params    = json.loads(request.form.get("json"))
	reasoning = params.get('reasoning')
	user_id   = request.values.get("user_id")
	password  = request.values.get("password")
	token     = request.values.get("token")
	user      = functions.authenticate_user(user_id, password, token)	

	if reasoning is None:
		functions.to_console("missing reasoning\n")
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		functions.to_console("auth failed\n")
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		add_reasoning = ("INSERT INTO reasoning "
			"(user_id, reasoning) "
			"VALUES (%s, %s)")

		reasoning_data = (user['user_id'], reasoning)

		cfg.db.execute(add_reasoning, reasoning_data)

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
	functions.to_console("flag")
	# cfg.logging.debug(request.form.get("json"))
	params            = json.loads(request.form.get("json"))
	url               = params.get("url")
	notes             = params.get("notes")
	flags             = params.get("flags")
	campaign_id       = params.get("campaign_id")
	locale            = params.get("locale")
	user_id           = request.values.get('user_id')
	password          = request.values.get('password')
	timestamp         = datetime.now()	
	user              = functions.authenticate_user(user_id, password) # we do not auth with token here because we want the user object to be complete
	flagging_event_id = 0;

	# functions.to_console(jsonify(flags))	

	if url is None:
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		locale_id = functions.get_locale_id(locale)

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
		cfg.db.execute(add_event, event_data)
		flagging_event_id = cfg.db.lastrowid()

		# insert individual flags

		for flag in flags:

			add_flag = ("INSERT INTO flag"
				"(flagging_event_id, flag_type_id, severity) "
				"VALUES (%s, %s, %s)")

			flag_data = (flagging_event_id, flag.get("flag_type_id"), flag.get("severity"))

			cfg.db.execute(add_flag, flag_data)

		# insert flag status

		add_status_link = ("INSERT INTO flagging_event_status_link "
			"(flagging_event_id, timestamp, flagging_event_status_id) "
			"VALUES (%s, %s, %s)")

		status_link_data = (flagging_event_id, timestamp, 1)

		# Insert new event
		cfg.db.execute(add_status_link, status_link_data)
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
	functions.to_console("listcampaigns")
	try:
		campaigns = []
		campaign_query = "SELECT * FROM campaign WHERE active = 1"
		rows = cfg.db.fetchall(campaign_query)
		
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
	functions.to_console("notifications")	
	# cfg.logging.debug(request.form.get("json"))
	user_id           = request.values.get('user_id')
	password          = request.values.get('password')
	token             = request.values.get('token')
	timestamp         = datetime.now()	
	user              = functions.authenticate_user(user_id, password, token)
	flagging_event_id = 0;	

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		notifications = []
		# select this user's notifications
		# some will be assigned directly by user id, others will be open but eligible for this user
		notification_query = "SELECT * FROM notification WHERE user_id = %s OR user_id_strict = %s"
		notification_query_data = (user_id, user_id)
		locale_id = user.get('locale_id')

		rows = cfg.db.fetchall(notification_query, notification_query_data)

		#cfg.db.start_transaction()

		for row in rows:
			notification = {
				'title': functions.get_localized_string( row['title_string_key'], locale_id ),
				'body': functions.get_localized_string( row['body_string_key'], locale_id ),
				'message_id': row['message_id'],
				'flagging_event_id': row['flagging_event_id'],
				'type': functions.get_notification_type_name(row['notification_type_id']),
				'url': row['url']
			}
			notifications.append(notification)

			# archive sent notifications
			archive_query = ("INSERT IGNORE INTO notification_archive"
				"(notification_id, flagging_event_id, notification_type_id, user_id, user_id_strict, title_string_key, body_string_key, message_id, timestamp) "
				"VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)"
			)

			cfg.db.execute(
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

			cfg.db.execute("DELETE FROM notification WHERE notification_id = %s", (row['notification_id'],))
			
		results = {
			'status': 'success',
			'notifications': notifications,
			'token': user.get("token")
		}

		#cfg.db.commit()

		return jsonify(results)

	except Exception as err:

		results = {
			'error': "Error: {}".format(err),
			'status': 'error',
			'message': 'Database error'
		}

		#cfg.db.rollback()

		return jsonify(results)


@app.route('/api/v1/message-test', methods=['GET','POST'])
def api_message_test():	
	functions.to_console("message_test")
	user_id        = request.values.get('user_id')
	password       = request.values.get('password')
	token          = request.values.get('token')
	timestamp      = datetime.now()	
	user           = functions.authenticate_user(user_id, password, token)

	# 113 is just an old flag useful for testing
	sample_flag_id = 113

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		message_query = ("INSERT INTO message" 
			"(user_id, flagging_event_id, subject, text, timestamp, reply_to)"
			"VALUES (%s, %s, %s, %s, %s, %s)"
		)		

		cfg.db.execute(message_query, (user_id, sample_flag_id, "Test Subject", "Test Message", timestamp, "alan@alanbellows.com"))

		message_id = cfg.db.lastrowid()

		notification_query = ("INSERT INTO notification"
			"(flagging_event_id, notification_type_id, user_id_strict, title_string_key, body_string_key, message_id, timestamp) "
			"VALUES (%s, %s, %s, %s, %s, %s, %s)"
		)
		
		cfg.db.execute(notification_query, (sample_flag_id, 1, user_id, 'message_from_a_journalist', 'click_here_to_read', message_id, timestamp))

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

		cfg.db.rollback()

		return jsonify(results)


@app.route('/api/v1/message', methods=['GET','POST'])
def api_message():	
	functions.to_console("message")
	requestJson = request.values.get("json")
	user_id     = request.values.get('user_id')
	password    = request.values.get('password')
	token       = request.values.get('token')
	user        = functions.authenticate_user(user_id, password, token)
	results     = {}

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:

		if (requestJson):
			params = json.loads(requestJson)
			message_id = params.get("message_id")

			message_query = "SELECT * FROM message WHERE user_id = %s AND message_id = %s"
			message_query_data = (user_id, message_id)

			message = cfg.db.fetchone(message_query, message_query_data)

			if message:
				
				results = {
					'status' : 'success',
					'message': {
						'subject'   : message['subject'],
						'text'      : message['text'],
						'timestamp' : message['timestamp'],
						'reply_to'  : message['reply_to']
					},
					'flags': functions.get_flags(message['flagging_event_id']),
					'token': user.get("token")
				}

				cfg.db.execute("UPDATE message SET viewed = %s WHERE user_id = %s AND message_id = %s", (datetime.now(),user_id,message_id))

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
	functions.to_console("flagging-event")
	requestJson = request.values.get("json")
	user_id     = request.values.get('user_id')
	password    = request.values.get('password')
	token       = request.values.get('token')
	user        = functions.authenticate_user(user_id, password, token)
	results     = {}

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)
	
	try:
		if (requestJson):
			params = json.loads(requestJson)
			flagging_event_id = params.get("flagging_event_id")

			flagging_event_query = "SELECT * FROM flagging_event WHERE user_id = %s AND flagging_event_id = %s"
			flagging_event_query_data = (user_id, flagging_event_id)

			flagging_event = cfg.db.fetchone(flagging_event_query, flagging_event_query_data)

			if flagging_event:

				results = {
					'status'        : 'success',
					'flagging_event': {
						'flagging_event_id' : flagging_event_id,
						'user_id'           : flagging_event['user_id'],
						'locale'            : functions.get_locale_string(flagging_event['locale_id']),
						'url'               : flagging_event['url'],
						'notes'             : flagging_event['notes'],
						'campaign'          : functions.get_campaign_name(flagging_event['campaign_id']),
						'timestamp'         : get_flagging_event_create_date(flagging_event_id),
						'flags'             : functions.get_flags(flagging_event_id)
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



@app.route('/api/v1/mentor-response', methods=['POST'])
def api_mentor_response():	
	functions.to_console("mentor-response")
	# cfg.logging.debug(request.form.get("json"))
	params                   = json.loads(request.form.get("json"))
	flagging_event_id        = params.get("flagging_event_id")
	agree_string             = params.get("agree") # should be 'yes' or 'no'
	notes                    = params.get("notes")
	user_id                  = request.values.get('user_id')
	password                 = request.values.get('password')
	timestamp                = datetime.now()	
	user                     = functions.authenticate_user(user_id, password) # we do not auth with token here because we want the user object to be complete
	flagging_event_status_id = 3 # 3 = invalidated, the default

	if flagging_event_id is None or agree_string is None:
		return functions.quit_with_error("Incomplete Request","Your request did not include all required parameters.", 400)

	if user is None or user is False:
		return functions.quit_with_error("Incorrect Login","Your credentials are incorrect.", 401)

	if functions.mentor_can_respond(user, flagging_event_id) is False:
		return functions.quit_with_error("Not Found","The request for feedback was not found.", 401)

	if functions.mentor_has_responded(user, flagging_event_id):
		return functions.quit_with_error("Duplicate response","We have already recorded your feedback for this item.", 401)

	# user appears to be valid for this feedback

	try:
		# encoded on arrival, decode it before storing
		notes = urllib.parse.unquote(notes)

		if (agree_string == 'yes'):
			flagging_event_status_id = 2 # 2 = validated

		add_response = ("INSERT INTO flagging_event_response "
			"(flagging_event_id, user_id, timestamp, agree, notes) "
			"VALUES (%s, %s, %s, %s, %s)")

		response_data = (flagging_event_id, user['user_id'], timestamp, agree, notes)

		cfg.db.execute(add_response, response_data)
		flagging_event_reponse_id = cfg.db.lastrowid()

		# update flag status

		add_status_link = ("INSERT INTO flagging_event_status_link "
			"(flagging_event_id, timestamp, flagging_event_status_id) "
			"VALUES (%s, %s, %s)")

		status_link_data = (flagging_event_id, timestamp, flagging_event_status_id)

		cfg.db.execute(add_status_link, status_link_data)

		# notify original flagger of the approval, if relevant

		flagging_event = functions.get_flagging_event(flagging_event_id)

		if (flagging_event is not False):
			flagger = functions.get_user_by_id(flagging_event['user_id'])
			# todo: need the url to open the flag approval page
			# also need the API endpoint to fetch that info
			# also need to collect notes/response when mentor declines review

			if (agree_string == 'yes'):
				functions.add_simple_notification(flagger, 4, 'flag_approved', 'click_to_review_feedback', 'http://example.com')
			else:
				functions.add_simple_notification(flagger, 4, 'flag_denied', 'click_to_review_feedback', 'http://example.com')

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



@app.errorhandler(404)
def page_not_found(e):
	return functions.quit_with_error("Not Found","The resource could not be found.", 404)

	

if __name__ == '__main__':
	from waitress import serve
	functions.to_console("API starting...")
	serve(app, host="0.0.0.0", port=8080, url_scheme='https', threads=1)


