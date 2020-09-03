
import mysql.connector

class CivicDB:

	def __init__(self, config, logging):
		self.config = config
		self.lastid = False		
		self.logging = logging
		self.in_transaction = False
		self.connect()	


	def connect(self):
		config = self.config
		self.connection = mysql.connector.connect(host=config['host'],database=config['database'],user=config['username'],password=config['password'])
		db_info = self.connection.get_server_info()
		# print("Connected to DB Server ", db_info)
		return self.connection


	def get_cursor(self):
		# try:
		#  	self.connection.ping(reconnect=True, attempts=3, delay=5)
		# except mysql.connector.Error as err:
		#  	# reconnect cursor
		# 	self.connection = self.connect()
		self.connection = self.connect()
		return self.connection.cursor(buffered=True, dictionary=True)	


	def execute(self, sql, params=(), commit=True):
		cursor = self.get_cursor()
		
		self.logging.debug("Query: " + " ".join(sql.split()))
		self.logging.debug("Params: " + str(params))

		result = cursor.execute(sql, params)

		self.logging.debug("Filled Query: " + str(getattr(cursor,'statement', '[none]')))

		if commit and self.in_transaction is False:
			self.connection.commit()

		self.lastid = getattr(cursor,'lastrowid', None)
		return result


	def start_transaction(self):
		cursor = self.get_cursor()
		cursor.execute("START TRANSACTION")
		self.in_transaction = True


	def commit(self):
		if (self.in_transaction):
			cursor = self.get_cursor()
			cursor.execute("COMMIT")
			self.in_transaction = False


	def rollback(self):
		if (self.in_transaction):
			cursor = self.get_cursor()
			cursor.execute("ROLLBACK")
			self.in_transaction = False


	def fetchone(self, sql, params=(), commit=True):
		cursor = self.get_cursor()
		cursor.execute(sql, params)

		self.logging.debug("Query: " + getattr(cursor,'statement', '[none]'))

		row = cursor.fetchone()
		if commit and self.in_transaction is False:
			self.connection.commit()
		return row


	def fetchall(self, sql, params=(), commit=True):
		cursor = self.get_cursor()
		cursor.execute(sql, params)

		self.logging.debug("Query: " + getattr(cursor,'statement', '[none]'))

		rows = cursor.fetchall()
		if commit and self.in_transaction is False:
			self.connection.commit()
		return rows


	def lastrowid(self):
		# cursor = self.get_cursor()
		# return cursor.lastrowid
		return self.lastid


	def close(self):		
		cursor = self.get_cursor()
		cursor.close()
		self.connection.close()

