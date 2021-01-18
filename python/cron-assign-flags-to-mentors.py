
import cfg
import functions
from datetime import datetime, date

STALE_FLAG_HOURS           = 720
STALE_MENTOR_REQUEST_HOURS = 24



def unassign_stale_mentorship_requests ():

	# find stale
	# set status_id to 1
	# insert new status
	
	# add user_id to status link so we can see who are not mentoring

	timestamp = datetime.now()	

	data_query = ("SELECT "
		"flagging_event_status_link.timestamp as `timestamp`, "
		"flagging_event_status_link.flagging_event_status_id as `status_id`, "
		"flagging_event.flagging_event_id as `flagging_event_id`, "
		"flagging_event_response.flagging_event_response_id as `flagging_event_response_id`, "
		"flagging_event_response.user_id as `user_id`, "
		"campaign.name as `campaign`, "
		"locale.code as `language`, "
		"flagging_event.url as `url`, "
		"flagging_event.notes as `notes` "
		"FROM flagging_event "
		"INNER JOIN flagging_event_status_link ON flagging_event.flagging_event_id = flagging_event_status_link.flagging_event_id  "
		"INNER JOIN campaign ON flagging_event.campaign_id = campaign.campaign_id  "
		"INNER JOIN locale ON flagging_event.locale_id = locale.locale_id  "
		"INNER JOIN flagging_event_response ON flagging_event_response.flagging_event_id = flagging_event_status_link.flagging_event_id "
		"WHERE flagging_event_status_link.flagging_event_status_id != 1 "
		"AND flagging_event_response.agree IS NULL "
		"AND flagging_event_status_link.timestamp < DATE_SUB(NOW(), INTERVAL " + str(STALE_MENTOR_REQUEST_HOURS) + " HOUR)  "
		"AND flagging_event.url NOT LIKE 'chrome%%' "
		"AND flagging_event.url NOT LIKE 'moz-extension%%' "
		"AND flagging_event.url NOT LIKE '%%www.damninteresting.com%%' "
		"AND flagging_event.notes NOT LIKE 'test%%' "
		"AND flagging_event.notes NOT LIKE 'justin%%' "
		"AND flagging_event.notes NOT LIKE 'Alan%%' "
		"AND flagging_event.notes NOT LIKE '%%anand%%' "
		"AND flagging_event.url NOT LIKE '127.0.0.1%%'  "
		"ORDER BY flagging_event_status_link.timestamp DESC;")

	rows = cfg.db.fetchall(data_query)

	for row in rows:
		print("Unassigning flagging_event_id " + row['flagging_event_id'] + " from mentor user_id ")

		delete_response_query = ("DELETE FROM flagging_event_response "
			"WHERE flagging_event_response_id = %s")

		cfg.db.execute(delete_status_query, (row['flagging_event_response_id'],))	

		# delete notification if present

		delete_notification_query = ("DELETE FROM notification "
			"WHERE flagging_event_id = %s AND user_id_strict = %s")

		cfg.db.execute(delete_notification_query, (row['flagging_event_id'],row['user_id']))

		insert_status_query = ("INSERT INTO flagging_event_status_link "
			"(flagging_event_id, timestamp, flagging_event_status_id) "
			"VALUES "
			"(%s, %s, %s)")

		cfg.db.execute(insert_status_query, (row['flagging_event_id'], timestamp, 1))


def fetch_unmentored_flagging_events ():

	# query for all flags in need of review
	# a flag needs review if 
		# its latest status is 1
		# it is not a test flag
		# it is not too old

	data_query = ("SELECT "
		"fesl1.timestamp as `timestamp`, "
		"fesl1.flagging_event_status_id as `status_id`, "
		"flagging_event.flagging_event_id as `flagging_event_id`, "
		"flagging_event.locale_id as `locale_id`, "
		"flagging_event.url as `url` "
		"FROM flagging_event_status_link fesl1 "
		"INNER JOIN flagging_event ON flagging_event.flagging_event_id = fesl1.flagging_event_id  "
		"INNER JOIN campaign ON flagging_event.campaign_id = campaign.campaign_id  "
		"INNER JOIN locale ON flagging_event.locale_id = locale.locale_id  "
		"WHERE timestamp = ("
			"SELECT MAX(timestamp) FROM flagging_event_status_link fesl2 "
			"WHERE fesl1.flagging_event_id = fesl2.flagging_event_id"
		")"
		"AND timestamp > DATE_SUB(NOW(), INTERVAL " + str(STALE_FLAG_HOURS) + " HOUR) "
		"AND flagging_event.url NOT LIKE 'chrome%%' "
		"AND flagging_event.url NOT LIKE 'moz-extension%%' "
		"AND flagging_event.url NOT LIKE '%%www.damninteresting.com%%' "
		"AND flagging_event.notes NOT LIKE 'test%%' "
		"AND flagging_event.notes NOT LIKE 'justin%%' "
		"AND flagging_event.notes NOT LIKE 'Alan%%' "
		"AND flagging_event.notes NOT LIKE '%%anand%%'  "
		"AND flagging_event.url NOT LIKE '127.0.0.1%%'  "
		"GROUP BY `timestamp`, status_id, `flagging_event_id`, locale_id, url "
		"HAVING status_id = 1 "
		"ORDER BY fesl1.timestamp DESC;")

	rows = cfg.db.fetchall(data_query)
	return rows


def assign_mentor (row):
	# when picking mentor consider
		# role
		# recent activity?
		# locale
		# have they declined to review this

	mentor = False
	timestamp = datetime.now()	

	while (mentor is False):

		random_mentor_query = ("SELECT "
			"user.user_id FROM user "
			"INNER JOIN user_role_link ON user_role_link.user_id = user.user_id "
			"WHERE user.locale_id = %s "
			"AND user_role_link.role_id = 2 "
			"AND user_role_link.begin < NOW() "
			"AND (user_role_link.end IS NULL OR user_role_link.end > NOW()) "
			"ORDER BY RAND() "
			"LIMIT 1")

		mentor = cfg.db.fetchone(random_mentor_query, (row['locale_id'],))

		if (mentor is None):
			# no mentors match the request 
			# todo: alert the admins
			print("No available mentors (event " + str(row['flagging_event_id']) + ", locale " + functions.get_locale_string(row['locale_id']) + ")")
			return False

		mentor_user = functions.get_user_by_id(mentor['user_id'])

		if (functions.mentor_can_respond(mentor_user, row['flagging_event_id'])):

			print("Event " + str(row['flagging_event_id']) + " assigned to user " + str(mentor['user_id']))

			status_query = ("INSERT INTO flagging_event_status_link "
				"(flagging_event_id, timestamp, flagging_event_status_id) "
				"VALUES "
				"(%s, %s, %s)")
			
			cfg.db.execute(status_query, (row['flagging_event_id'], timestamp, 4))

			response_query = ("INSERT INTO flagging_event_response "
				"(flagging_event_id, user_id, timestamp) "
				"VALUES "
				"(%s, %s, %s)")
			
			cfg.db.execute(response_query, (row['flagging_event_id'], mentor['user_id'], timestamp))

			functions.add_simple_notification(mentor_user, 5, 'need_mentor_review', 'content_requires_mentor_review', row['url'])

		else:
			print("User id " + str(mentor['user_id']) + " cannot mentor event " + str(row['flagging_event_id']))


def main():

	unassign_stale_mentorship_requests()

	rows = fetch_unmentored_flagging_events()

	print("There are " + str(len(rows)) + " flagging events in need of mentoring")
	
	for row in rows:
		
		assign_mentor(row)

	print("Done.")




if __name__ == '__main__':
    main()