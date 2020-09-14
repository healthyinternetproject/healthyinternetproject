
var API_ROOT_URL = "https://api.healthyinternetproject.org/api/v1/"; 
var NOTIFICATION_CHECK_MIN_TIME = 600000; //10 minutes in milliseconds
var DEV_NOTIFICATION_BUTTON = "dev-button";

if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}


var CONFIG = {
	'userId'           : false,
	'token'            : false,
	'onboardingDone'   : false,
	'onboardingOptOut' : false,
	'debug'            : false,
	'skipAPI'          : false,
	'initialized'      : false,
	'apiUrl'           : false
};

var messageID;
var flagging_event_id;
var notificationType;
var lastNotificationCheck = 0;


if ( isDevMode() )
{
	//API_ROOT_URL = "http://127.0.0.1:8080/api/v1/"; 
}

initializeExtension();



function initializeExtension () 
{

	CONFIG.apiUrl = API_ROOT_URL;

	
	browser.runtime.onInstalled.addListener(function() 
	{

		//showNotification("Civic", 'Civic Activated');
		
		console.log("Checking to see if user is already registered...");
		isUserRegistered();

		//window.open("/html/flagging.html");

		//browser.browserAction.setBadgeText({text: "1"});
		//browser.browserAction.setBadgeBackgroundColor({ color: [87, 98, 213, 255] });

		return Promise.resolve("Dummy response to keep the console quiet");
	});


	browser.tabs.onUpdated.addListener(function ( tabId, changeInfo, tab) 
	{

		//testing/dev only
		//console.log(changeInfo, tab);

		getConfigFromStorage();

		if (
			false &&
			changeInfo.status == 'complete' &&
			tab.url.indexOf("example.com") > -1
		)
		{
			let startMentorOnboarding = function (notificationId) 
			{
				window.open("/html/onboarding-mentor.html");
				setTimeout(function () { browser.notifications.clear(notificationId); }, 100);
			};	

			let notification = browser.notifications.create({
				"type"               : "basic",
				"iconUrl"            : browser.extension.getURL("images/icon-128.png"),
				"title"              : browser.i18n.getMessage("congratulations_mentor_notification"),
				"message"            : browser.i18n.getMessage("check_out_your_new_role"),
				"requireInteraction" : true,
				"buttons"            : []
			});

			if (browser.runtime.lastError)
			{
				console.log(browser.runtime.lastError);
			}

			browser.notifications.onClicked.addListener(startMentorOnboarding);
			browser.notifications.onButtonClicked.addListener(startMentorOnboarding);
		}

		return Promise.resolve("Dummy response to keep the console quiet");
	});


	browser.runtime.onMessage.addListener(
		function(request, sender, sendResponse) 
		{
			
			console.log(request);

			if ( request.command == 'console-log' )
			{
				console.log(request.data);
			}				
			else if ( request.command == 'save-mission')
			{
				sendMissionToAPI(request.mission_id);
				sendResponse("Initiating XHR...");
				return true; 
			}
			else if ( request.command == 'save-flag' )
			{
				//console.log
				sendFlagDataToAPI(
					request.url,
					request.campaign_id,
					request.flags,
					request.notes
				);
				
				sendResponse("Initiating XHR...");
				return true; 
			}
			else if (request.command == 'sample-notification')
			{		
				let notification = browser.notifications.create({
					"type"               : "basic",
					"iconUrl"            : browser.extension.getURL("images/icon-128.png"),
					"title"              : browser.i18n.getMessage("click_here"),
					"message"            : browser.i18n.getMessage("via_these_alerts"),
					"requireInteraction" : true,
					"buttons"            : []
				});

				if (browser.runtime.lastError)
				{
					console.log(browser.runtime.lastError);
				}

				//add .onclick etc
				//https://developer.chrome.com/extensions/notifications

				browser.notifications.onClicked.addListener(dismissNotification);
				browser.notifications.onButtonClicked.addListener(dismissNotification);
				browser.notifications.onClosed.addListener(dismissNotification);
				browser.notifications.onShowSettings.addListener(dismissNotification);

				//np.then(onNotificationSuccess);
			
				sendResponse("Notification shown");
			}
			else if (request.command == 'onboarding-done') 
			{
				browser.storage.sync.set({ 'onboardingDone': 1 });	
				CONFIG.onboardingDone = 1;
			}
			else if (request.command == 'onboarding-opt-out') 
			{
				browser.storage.sync.set({ 'onboardingOptOut': 1 });	
				CONFIG.onboardingOptOut = 1;
				//console.log("Trying to opt out");
			}
			else if (request.command == 'inject-mentor-code')
			{
				browser.tabs.insertCSS({
					file: '/css/mentor-review.css'
				});
				browser.tabs.executeScript({
					file: '/js/mentor-review.js'
				});
			}
			else if (request.command == 'test-message')
			{
				generateTestMessage();
			}
			else if (request.command == 'get-notifications')
			{
				getNotificationsFromAPI(DEV_NOTIFICATION_BUTTON);
			}
			else if (request.command == 'get-message')
			{
				if(messageID){
					showJournalistMessage(messageID)
				}
				else{
					console.log('message id hasnt updated yet')
				}
				
			}
			else if (request.command == 'get-flag')
			{
				console.log('get-flag')
				if(flagging_event_id){
					showJournalistFlag(messageID, flagging_event_id)
				}
				else{
					console.log('notification id hasnt updated yet')
				}
				
			}
			
			else
			{
				console.log("Unrecognized or missing command");
				console.log(request);
			}			

			return Promise.resolve("Dummy response to keep the console quiet");		
		}
	);
  

	browser.tabs.onUpdated.addListener( getNotificationsFromAPI );
	browser.tabs.onActivated.addListener( getNotificationsFromAPI );
	browser.windows.onFocusChanged.addListener( getNotificationsFromAPI );

	getNotificationsFromAPI();



	/*
	function sendMessageToClientScript ( data, responseFunc ) {

		browser.tabs.query(
			{active: true, currentWindow: true}, 
			function(tabs) {
				browser.tabs.sendMessage(tabs[0].id, data, responseFunc);
			}
		);	
	}
	*/


}

/*
function showNotification (title, bodyText)
{
	return new Notification(
		title, 
		{
			icon: '/images/civic-48.png',
			body: bodyText
		}
	);
}
*/

function getConfigFromStorage (callback)
{
	if (!callback || typeof callback !== "function")
	{
		callback = function () {};
	}

	if (CONFIG && CONFIG.initialized)
	{
		callback(CONFIG);
		return;
	}

	browser.storage.sync.get(['userId','password','token','onboardingDone','onboardingOptOut'], function(result) 
	{		
		//console.log(result);

		if (result.userId)
		{
			//console.log("Credentials retrieved from sync storage, user id " + result.userId);

			CONFIG.userId           = result.userId;
			CONFIG.password         = result.password;
			CONFIG.token            = result.token;
			CONFIG.onboardingDone   = result.onboardingDone;
			CONFIG.onboardingOptOut = result.onboardingOptOut;
			CONFIG.initialized      = true;

			callback(CONFIG);
			return;
		}
		else
		{
			console.log("No credentials in sync storage");
			callback(false);
			return false;
		}
	});
}


function sendMessageToPopup (data, responseFunc )
{
	browser.runtime.sendMessage(data, responseFunc);
}


function sendMessageToClientScript ( data, responseFunc ) {

	browser.tabs.query(
		{active: true, currentWindow: true}, 
		function(tabs) {
			browser.tabs.sendMessage(tabs[0].id, data, responseFunc);
		}
	);	
}


function isUserRegistered ()
{
	var callback = function (result) {

		console.log(result);

		if (result && result.userId)
		{
			console.log("User already registered, user id " + result.userId);
			return true;
		}
		else
		{
			console.log("User not registered, contacting API...");

			registerUser(function (data) {
				//open onboarding when registration succeeds
				//todo: what to do when offline?

				console.log(data);

				if (CONFIG.skipAPI)
				{					
					console.log("Skipping API.");
					CONFIG.userId = 123456;
					CONFIG.password = 'sdfjalsfjhlsjdk';

					//window.open("/html/onboarding.html");
					browser.tabs.create({
						'url': "/html/onboarding.html"
					});
					return;
				}
				else
				{
					console.log("Received user ID " + data.user_id + " from API");
					CONFIG.userId = data.user_id;
					CONFIG.password = data.password;
				}

				browser.storage.sync.set(
					{
						'userId': data.user_id,
						'password': data.password
					}, 
					function() {
						browser.tabs.create({
							'url': "/html/onboarding.html"
						});
					}
				);				
			});
			
			return false;
		}

	};

	getConfigFromStorage(callback);

}


function dismissNotification (notificationId) 
{
	sendMessageToClientScript( { command: 'notification-click' }, function () {} );
	setTimeout(function () { browser.notifications.clear(notificationId); }, 100);
}


function openNotification (notificationId) 
{
	console.log('clicked')
	window.location.href = 'html/notification.html';

}

function sendToAPI ( term, data, authenticate, callback )
{
	if (callback)
	{
		console.log("this is the callback "+callback.name)
	}

	getConfigFromStorage (function (result) {

		let xhr = new XMLHttpRequest();
		let url = window.API_ROOT_URL + term;
		let params = [];
		let postData = "";

		console.log("Sending to " + url + "...");
		console.log(data);

		if (result.skipAPI)
		{
			console.log("Skipping API");
			if (callback)
			{
				callback();
			}
			return true;
		}

		if (data)
		{
			params.push("json=" + encodeURI(JSON.stringify(data)));
		}

		if (authenticate)
		{
			if (result.userId)
			{
				params.push( "user_id=" + encodeURI(result.userId) );
				params.push( "password=" + encodeURI(result.password) );
				params.push( "token=" + encodeURI(result.token) );
			}
			else
			{
				console.log("User ID not found in sync data.");
			}
		}

		postData = params.join("&");

		//console.log(postData);

		xhr.onreadystatechange = function () 
		{
			if (xhr.readyState == 4) 
			{

				let data = (xhr.status == 200) ? xhr.response : false;

				console.log("Response from API:");
				console.log(data);

				if (data.token)
				{
					CONFIG.token = data.token;
				}

				if (callback)
				{
					console.log("callback called "+ callback.name)
					callback(data);
				}			
			}
		};
		
		xhr.responseType = 'json';  	
		xhr.open('POST', url, true );			
		xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xhr.send(postData);			
	});
	
}


function registerUser ( callback )
{
	let language = navigator.languages[0]; //this may need to be more robust, I'm not sure -AB

	let data = {
		'locale' : language
	};
	return sendToAPI( "register", data, false, callback );
}


function sendMissionToAPI (mission_id)
{
	let data = {
		'mission_id': mission_id
	};
	return sendToAPI( "mission", data, true );
}


function sendFlagDataToAPI (url, campaignId, flags, notes)
{
	let language = navigator.languages[0]; 

	if (!campaignId)
	{	
		campaignId = 5; //default to 'none'
	}

	let data = {
		'url'         : encodeURIComponent(url),
		'campaign_id' : campaignId,
		'flags'       : flags,
		'notes'       : encodeURIComponent(notes),
		'locale'      : language
	};

	let callback = function (data) 
	{
		if (data && data.status == 'success')
		{
			sendMessageToPopup({'command': 'flag-saved','data':data});	
		}
		else
		{
			sendMessageToPopup({'command': 'flag-error','data':data});		
		}
		
	};

	return sendToAPI( "flag", data, true, callback );
}


function getNotificationsFromAPI (force=false)
{
	var now = Date.now();

	if (force === DEV_NOTIFICATION_BUTTON || lastNotificationCheck == 0 || now > (lastNotificationCheck + NOTIFICATION_CHECK_MIN_TIME))
	{
		console.log("Getting notifications from API");
		lastNotificationCheck = now;
		return sendToAPI( "notifications", {}, true, showNotifications );
	}
	else
	{
		return false;
	}
}


function generateTestMessage ()
{
	let data = {};
	return sendToAPI( "message-test", data, true );
}


function showNotifications ( data ) 
{
	if (data.notifications && data.notifications.length > 0)
	{
		console.log(data.notifications.length + " new notifications for user " + CONFIG.userId);

		for (let i=0; i < data.notifications.length; i++)
		{
			let notification = data.notifications[i];
	

			console.log(notification);
			let notificationId = getNotificationId();

			let n = browser.notifications.create(notificationId, {
				"type"               : "basic",
				"iconUrl"            : browser.extension.getURL("images/icon-128.png"),
				"title"              : notification.title,
				"message"            : notification.body,
				"requireInteraction" : true,
				"buttons"            : []
			});	

			// if (notification.type == "journalist-contact")
			// {
				
				messageID = notification.message_id;
				flagging_event_id = notification.flagging_event_id
				notificationType = notification.type;
				var tabs = 0;
				browser.notifications.onClicked.addListener(function(notificationId) {
					if (tabs==0){
						browser.tabs.create({
							'url': "/html/notification.html"+ '?'+ 'message_id='+notification.message_id
						});
					}
					tabs++;
				});
				browser.notifications.onButtonClicked.addListener();
				browser.notifications.onClosed.addListener();
				browser.notifications.onShowSettings.addListener();				
			// }
		}
	}
	else
	{
		console.log("No new notifications for user " + CONFIG.userId);
	}
}


function showJournalistMessage ( messageId )
{
	console.log("Showing journalist message");
	sendMessageToClientScript( { command: 'notification-type', type: notificationType }, function () {
	} );

	console.log("message-id " + messageId);
	data = { 
		'user_id': CONFIG.userId,
		'message_id' : messageId
	};

	return sendToAPI( "message", data, true, updateNotificationHTML );

}


function showJournalistFlag ( messageId, flagging_event_id )
{
	console.log("Showing journalist flag");

	console.log("flagging_event_id " + flagging_event_id);
	data = { 
		'user_id': CONFIG.userId,
		'flagging_event_id' : flagging_event_id
	};

	return sendToAPI( "flagging-event", data, true, updateNotificationFlagHTML );
	
	// sendMessageToClientScript( { command: 'notification-click' }, function () {
	// } );


}



function updateNotificationFlagHTML (data)
{

	console.log(JSON.stringify(data))
	sendMessageToClientScript({command: 'populate-flag', 'data': data}, function () {});

	return true;
		
}


function updateNotificationHTML (data)
{

	console.log(JSON.stringify(data))
	sendMessageToClientScript({command: 'populate-message', 'message': data.message}, function () {});

	return true;
		
}





function isDevMode () 
{
	return !('update_url' in browser.runtime.getManifest());
}


function getNotificationId () 
{
    var id = Math.floor(Math.random() * 9007199254740992) + 1;
    return id.toString();
}
