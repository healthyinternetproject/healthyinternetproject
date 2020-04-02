

if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}


jQuery(document).ready(function ($) {

	console.log("Locale is " + getString("@@ui_locale"));


	//insert localized strings

	$("span[data-i18n-message]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-message"));
		$this.html( message );
		//consoleLog(messageId + " = " + message);
	});

	$("[data-i18n-placeholder]").each(function () {
		let $this = $(this);
		let message = getString($this.attr("data-i18n-placeholder"));
		$this.attr("placeholder", message );
		//consoleLog(messageId + " = " + message);
	});
});



function consoleLog (data)
{
	browser.extension.getBackgroundPage().console.log(data);
}


function getString (messageId)
{
	return browser.i18n.getMessage(messageId);
}

