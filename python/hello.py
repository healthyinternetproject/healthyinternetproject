import flask

app = flask.Flask(__name__)
app.config["DEBUG"] = True

@app.route('/')
def hello_world():
	return 'Hello, World!'