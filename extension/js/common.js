
var backgroundPage = null;
var CONFIG = {};

if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}

if (browser && browser.extension && browser.extension.getBackgroundPage)
{
	backgroundPage = browser.extension.getBackgroundPage();
	if (backgroundPage)
	{
		CONFIG = backgroundPage.CONFIG;
	}
}


jQuery(document).ready(function ($) {

	console.log("Locale is " + getString("@@ui_locale"));


	//insert localized strings
	localizeStrings($(document));

});


function localizeStrings ($el)
{
	$el.find("span[data-i18n-message]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-message"));
		$this.html( message );
		//consoleLog(messageId + " = " + message);
	});

	$el.find("[data-i18n-placeholder]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-placeholder"));
		$this.attr("placeholder", message );
		//consoleLog(messageId + " = " + message);
	});	
}


function consoleLog (data)
{
	if (backgroundPage)
	{
		backgroundPage.console.log(data);
	}
	else
	{
		console.log(data);
	}
}


function getString (messageId)
{
	let string = browser.i18n.getMessage(messageId);

	if (string) 
	{
		return string;
	}
	else
	{
		return messageId;
	}
}


function formatUserId (userId)
{
	var id = "" + userId + "";
	return id.substring(0,3) + "-" + id.substring(3,6) + "-" + id.substring(6,9);
}

