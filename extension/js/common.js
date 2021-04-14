
if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}

var backgroundPage = null;
var CONFIG = {};
//var locale = getString("@@ui_locale");
var locale = navigator.languages[0];
var rtlLocales = [
	//'en',
	//'en-US',
	//'en_US',
	'ar'
];


if (browser && browser.extension && browser.extension.getBackgroundPage)
{
	backgroundPage = browser.extension.getBackgroundPage();
	if (backgroundPage)
	{
		CONFIG = backgroundPage.CONFIG;
	}
}


jQuery(document).ready(function ($) {

	consoleLog("Locale is " + locale);


	//insert localized strings
	localizeStrings($(document));


	//switch inputs to RTL if needed
	localizeUI();

});


function localizeStrings ($el)
{
	$el.find("span[data-i18n-message]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-message"));
		$this.html( message );
	});

	$el.find("[data-i18n-message=select_a_country]").each(function () {
		
		let $this = $(this);
		$this.attr("data-i18n-message")
		let message = getString($this.attr("data-i18n-message"));
		$this.html( message );
		console.log($this.attr("data-i18n-message") + " = " + message);

	});
	$el.find("[data-i18n-message=prefer_not_to_say]").each(function () {
		
		let $this = $(this);
		$this.attr("data-i18n-message")
		let message = getString($this.attr("data-i18n-message"));
		$this.html( message );
		console.log($this.attr("data-i18n-message") + " = " + message);

	});

	$el.find("[data-i18n-placeholder]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-placeholder"));
		$this.attr("placeholder", message );
		//consoleLog(messageId + " = " + message);
	});	
}


function localizeUI ()
{
	let rtl = rtlLocales.includes(locale);

	if (rtl !== false)
	{
		consoleLog("RTL mode");

		$hipEls = $(".healthy-internet-project");

		$hipEls.attr("dir","rtl");

		consoleLog("Adding RTL direction to input elements");

		$hipEls.find("textarea").each(function () {
			let $this = $(this);
			$this.attr("dir", "rtl");
		});

		$hipEls.find("input").each(function () {
			let $this = $(this);
			$this.attr("dir", "rtl");
		});
	}
	else
	{
		consoleLog("LTR mode");
	}
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
		return "";
	}
}


function formatUserId (userId)
{
	var id = "" + userId + "";
	return id.substring(0,3) + "-" + id.substring(3,6) + "-" + id.substring(6,9);
}

