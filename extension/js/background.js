
var CONFIG = {
	//'apiRootUrl'     : "http://127.0.0.1:5000/api/v1/", //if you change this, also update the matching permissions in manifest.json
	'apiRootUrl'       : "https://api.healthyinternetproject.org/api/v1/", //if you change this, also update the matching permissions in manifest.json=	
	'userId'           : false,
	'onboardingDone'   : false,
	'onboardingOptOut' : false,
	'debug'            : false,
	'skipAPI'          : false
};

if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}

(function() {

	
	browser.runtime.onInstalled.addListener(function() {

		//showNotification("Civic", 'Civic Activated');
		
		console.log("Checking to see if user is already registered...");
		isUserRegistered();

		//window.open("/html/flagging.html");

		//browser.browserAction.setBadgeText({text: "1"});
		//browser.browserAction.setBadgeBackgroundColor({ color: [87, 98, 213, 255] });

		return Promise.resolve("Dummy response to keep the console quiet");
	});


	browser.tabs.onUpdated.addListener(function ( tabId, changeInfo, tab) {

		//testing/dev only
		//console.log(changeInfo, tab);

		getCredentialsFromStorage();

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
		function(request, sender, sendResponse) {
			
			console.log(request);

			if (request.command == 'get-config')
			{
				//script wants the config settings
				sendMessageToClientScript({command: 'config', config: CONFIG});
				sendMessageToPopup({command: 'config', config: CONFIG});
				sendResponse("Config sent");
			}	
			else if ( request.command == 'console-log' )
			{
				console.log(request.data);
			}				
			else if ( request.command == 'save-mission')
			{
				sendMissionToAPI(request.mission_id);
				sendResponse("Initiating XHR...");
			}
			else if ( request.command == 'save-flag' )
			{
				sendFlagDataToAPI(
					request.url,
					request.campaign_id,
					request.flags,
					request.notes
				);
				//console.log(request);
				sendResponse("Initiating XHR...");
			}
			else if (request.command == 'sample-notification')
			{		
				/*		
				let notification = showNotification("");

				notification.onclick = function() {
					window.open("/html/onboard.html#3");
				};
				*/
				let dismissNotification = function (notificationId) 
				{
					sendMessageToClientScript( { command: 'notification-click' }, function () {} );
					setTimeout(function () { browser.notifications.clear(notificationId); }, 100);
				};	

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
			}
			else if (request.command == 'onboarding-opt-out') 
			{
				browser.storage.sync.set({ 'onboardingOptOut': 1 });	
				CONFIG.onboardingOptOut = 1;
				console.log("Trying to opt out");
			}

			return Promise.resolve("Dummy response to keep the console quiet");		
		}
	);
  




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


}());

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

function getCredentialsFromStorage (callback)
{
	browser.storage.sync.get(['userId','password','onboardingDone','onboardingOptOut'], function(result) 
	{		
		//console.log(result);

		if (!callback || typeof callback !== "function")
		{
			callback = function () {};
		}

		if (result.userId)
		{
			console.log("Credentials retrieved from sync storage, user id " + result.userId);

			callback({
				'userId'           : result.userId,
				'password'         : result.password,
				'onboardingDone'   : result.onboardingDone,
				'onboardingOptOut' : result.onboardingOptOut
			});
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
	getCredentialsFromStorage(function (result) {

		console.log(result);

		if (result && result.userId)
		{
			console.log("User already registered, user id " + result.userId);
			//CONFIG.userId = result.userId;
			//CONFIG.password = result.password;
			CONFIG = result;
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

					window.open("/html/onboarding.html");
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
						window.open("/html/onboarding.html");
					}
				);				
			});
			
			return false;
		}

	});

}


function sendToAPI ( term, data, authenticate, callback )
{
	getCredentialsFromStorage(function (result) {

		let xhr = new XMLHttpRequest();
		let url = CONFIG.apiRootUrl + term;
		let params = [];
		let postData = "";

		console.log("Sending to API...");

		if (CONFIG.skipAPI)
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
			}
			else
			{
				console.log("User ID not found in sync data.");
			}
		}

		postData = params.join("&");

		console.log(postData);

		xhr.onreadystatechange = function () {

			if (xhr.readyState == 4) {

				let data = (xhr.status == 200) ? xhr.response : false;
				console.log("Response from API:");
				console.log(data);

				if (callback)
				{
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
	return sendToAPI( "register", false, false, callback );
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
	if (!campaignId)
	{	
		campaignId = 5; //default to 'none'
	}

	let data = {
		'url'         : url,
		'campaign_id' : campaignId,
		'flags'       : flags,
		'notes'       : notes
	};

	let callback = function (data) 
	{
		if (data.status == 'success')
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


