
const CONFIG = {
	//'apiRootUrl' : "http://127.0.0.1:5000/api/v1/", //if you change this, also update the matching permissions in manifest.json
	'apiRootUrl' : "http://18.221.76.156:8080/api/v1/", //if you change this, also update the matching permissions in manifest.json
	
	'userId' : false,
	'debug' : false,
	'skipAPI' : false
};


(function() {

	if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
	{
		browser = chrome;
	}

	
	browser.runtime.onInstalled.addListener(function() {

		//showNotification("Civic", 'Civic Activated');
		
		isUserRegistered();		

		//window.open("/html/flagging.html");

		//browser.browserAction.setBadgeText({text: "1"});
		//browser.browserAction.setBadgeBackgroundColor({ color: [87, 98, 213, 255] });
	});


	browser.tabs.onUpdated.addListener(function ( tabId, changeInfo, tab) {

		//testing/dev only
		//console.log(changeInfo, tab);

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
	});


	browser.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			
			//console.log(request);

			if (request.command == 'get-config')
			{
				//script wants the config settings
				sendMessageToClientScript({command: 'config', config: CONFIG});
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
					request.campaign,
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


function sendMessageToPopup (data, responseFunc )
{
	chrome.runtime.sendMessage(data, responseFunc);
}

function sendMessageToClientScript ( data, responseFunc ) {

	chrome.tabs.query(
		{active: true, currentWindow: true}, 
		function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, data, responseFunc);
		}
	);	
}



function isUserRegistered ()
{
	/*
	browser.storage.sync.set({key: value}, function() {
		console.log('Value is set to ' + value);
	});
	*/

	browser.storage.sync.get(['civicUserId','civicPassword'], function(result) 
	{
		console.log(result);

		if (result.civicUserId)
		{
			CONFIG.userId = result.civicUserId;
			CONFIG.password = result.civicPassword;
			return true;
		}
		else
		{
			registerUser(function (data) {
				//open onboarding when registration succeeds
				//todo: what to do when offline?

				console.log(data);

				if (CONFIG.skipAPI)
				{
					CONFIG.userId = 123456;
					CONFIG.password = 'sdfjalsfjhlsjdk';

					window.open("/html/onboarding.html");
					return;
				}
				else
				{
					CONFIG.userId = data.user_id;
					CONFIG.password = data.password;
				}

				browser.storage.sync.set(
					{
						'civicUserId': data.user_id,
						'civicPassword': data.password
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
	let xhr = new XMLHttpRequest();
	let url = CONFIG.apiRootUrl + term;
	let params = [];

	if (CONFIG.skipAPI)
	{
		if (callback)
		{
			callback();
		}
		return true;
	}

	if (data)
	{
		/*
		for (var key in data)
		{
			let value = data[key];


			if (Array.isArray(value))
			{
				for (let i=0; i < value.length; i++)
				{
					params.push( encodeURI(key) + "=" + encodeURI(value[i]) );
				}
			}
			else
			{
				params.push( encodeURI(key) + "=" + encodeURI(value) );
			}
		}*/
		params.push("json=" + encodeURI(JSON.stringify(data)));
	}

	if (authenticate)
	{
		params.push( "user_id=" + encodeURI(CONFIG.userId) );
		params.push( "password=" + encodeURI(CONFIG.password) );
	}

	console.log(params.join("&"));

	xhr.onreadystatechange = function () {

		//console.log(xhr.readyState);

		if (xhr.readyState == 4) {

			let data = (xhr.status == 200) ? xhr.response : false;
			console.log(data);

			if (callback)
			{
				callback(data);
			}

			//sendMessageToClientScript({command: "fetchedFollowerTotals",'data': data});	
		}
	};
	
	xhr.responseType = 'json';  	
	xhr.open('POST', url, true );			
	xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	xhr.send(params.join("&"));		
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


function sendFlagDataToAPI (url, campaign, flags, notes)
{
	let data = {
		'url'      : url,
		'campaign' : campaign,
		'flags'    : flags,
		'notes'    : notes
	};

	let callback = function () 
	{		
		sendMessageToPopup({command: 'flag-saved'});
	};

	return sendToAPI( "flag", data, true, callback );
}