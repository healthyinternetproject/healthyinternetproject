
import pymysql

class HIPDatabase:


	def __init__(self, config, logging):
		self.config = config
		self.connection = False
		self.lastid = False		
		self.logging = logging
		self.connect()	


	def connect(self):
		self.connection = pymysql.connect(
			host=self.config['host'],
			user=self.config['username'],
			password=self.config['password'],
			db=self.config['database'],
			charset='utf8',
			cursorclass=pymysql.cursors.DictCursor)

		self.connection.autocommit( 1 )

		return self.connection


	def get_cursor(self):
		if (self.connection is False):
			self.connect()
		return self.connection.cursor()


	def execute(self, sql, params=()):
		cursor = self.get_cursor()
		
		self.logging.debug("Query: " + " ".join(sql.split()))
		self.logging.debug("Params: " + str(params))

		result = cursor.execute(sql, params)

		self.logging.debug("Filled Query: " + str(getattr(cursor,'statement', '[none]')))

		self.lastid = getattr(cursor,'lastrowid', None)
		cursor.close()
		return result


	def fetchone(self, sql, params=()):
		cursor = self.get_cursor()
		cursor.execute(sql, params)

		self.logging.debug("Query: " + getattr(cursor,'statement', '[none]'))

		row = cursor.fetchone()

		cursor.close()
		return row


	def fetchall(self, sql, params=()):
		cursor = self.get_cursor()
		cursor.execute(sql, params)

		self.logging.debug("Query: " + getattr(cursor,'statement', '[none]'))

		rows = cursor.fetchall()

		cursor.close()
		return rows


	def lastrowid(self):
		# cursor = self.get_cursor()
		# return cursor.lastrowid
		return self.lastid


	def close(self):		
		self.connection.close()