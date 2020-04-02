
import mysql.connector

class CivicDB:

	def __init__(self):
		#super(CivicDB, self).__init__(self)
		#todo: move this to config file
		#self.connection = mysql.connector.connect(host='localhost',database='civic',user='civic',password='DZjf#8W3XEvSvCx')
		self.connection = mysql.connector.connect(host='civic20200331.c5f1jwselycn.us-east-1.rds.amazonaws.com',database='civic',user='civicadmin',password='kcAjrq7uT44yZhDu')
		self.cursor = self.connection.cursor()
		db_info = self.connection.get_server_info()
		print("Connected to MySQL Server version ", db_info)
		self.cursor = self.connection.cursor(buffered=True, dictionary=True)
		#self.cursor.execute("select database()")		

	def execute(self, sql, params, commit=True):
		result = self.cursor.execute(sql, params)
		if commit:
			self.connection.commit()
		return result


	def fetchone(self, sql, params, commit=True):
		self.cursor.execute(sql, params)
		row = self.cursor.fetchone()
		if commit:
			self.connection.commit()
		return row


	def fetchall(self, sql, params, commit=True):
		self.cursor.execute(sql, params)
		rows = self.cursor.fetchall()
		if commit:
			self.connection.commit()
		return rows


	def lastrowid(self):
		return self.cursor.lastrowid


	def close(self):		
		self.cursor.close()
		self.connection.close()

