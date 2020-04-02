
if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}

(function() {

	//console.log("Script injected");

	browser.runtime.onMessage.addListener(function(request, sender, sendResponse) 
	{
		if (request.action == "getFlagDetails")
		{
			let temp = false;
			let response = {};
			let pageUrl = window.location.href;
			let $pageTitle = document.querySelector("head title");

			response.title = $pageTitle.textContent;
			response.url = cleanURL(pageUrl);

			sendResponse(response);
		}
		else
		{
			sendResponse({'error':'unrecognized action'}); 
		}
	});

}());




function cleanURL (url)
{
	let hash = url.indexOf("#");

	if (hash > 0)
	{
		url = url.substring(0,hash);
	}

	return url;
}





