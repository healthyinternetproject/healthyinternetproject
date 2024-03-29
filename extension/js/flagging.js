
var CARD_DISPLAY_TITLE_LENGTH = 48;
var CARD_DISPLAY_URL_LENGTH = 60;

var currentReport = {};	
var currentUrl = "";
var uiInitialized = false;
var autofilling = false;


debug('Starting...');
console = backgroundPage.console;


jQuery(document).ready(function ($) {

	if(typeof InstallTrigger !== 'undefined'){
		console.log("firefox");
		$(".page[data-index=2]").css('padding-left','50px');
		$(".page[data-index=2]").css('overflow','hidden');

	}
	debug('Document ready.');
	initializeUI(CONFIG);

	browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {		

		if (request.command == 'flag-error')
		{				
			debug(request.data);
			//$(".page[data-index]").css({ 'transform':'translateX(0)' }).removeClass('active');
			//$(".page[data-index=0]").addClass('active');			
			showError( 
				'flag_failed', 
				[
					{ 
						'labelId' : 'retry',
						'func' : function () {
							$(".flagging .error").css('display','none');
							$(".flagging-ui").css('display','block');								
							$(".flagging .pages").css('display','block');
							sendFlagData(currentReport, currentUrl);							
						} 
					}
				]
			);			
		}		
		else if (request.command == 'flag-saved')
		{				
			debug(request.data);
			goToThanksPage();
		}	
		else
		{
			debug("Unrecognized request:");
			debug(request);
		}	

		return Promise.resolve("Dummy response to keep the console quiet");
	});
	

	function initializeUI (config)
	{
		if (uiInitialized) { return; }

		uiInitialized = true;

		let manifestData = browser.runtime.getManifest();
		let language = navigator.languages[0].toLowerCase(); 

		debug(CONFIG);

		//localize bug report link if possible
		if (language.indexOf("es") === 0)
		{
			$("#report-bug-link").attr("href","https://forms.gle/9Mzz5GZSu3QU5FzYA");
		}
		else if (language.indexOf("fr") === 0)
		{
			$("#report-bug-link").attr("href","https://forms.gle/rRhT3JU7PipJY4sGA");
		}
		else if (language.indexOf("ar") === 0)
		{
			$("#report-bug-link").attr("href","https://forms.gle/BRSoaqHPPESzMMgs8");
		}

		$(".flagging .user-id").html( formatUserId(CONFIG.userId) );
		$(".flagging .extension-version").html( manifestData.version );
		$(".test-journalism-request").click( generateTestMessage );
		$(".test-notification-ping").click( function () { getNotifications(true); } );
		$(".test-mentor-review").click( testMentorReview );
		$(".test-onboarding").click( testOnboarding );	
		$(".test-mentor-onboarding").click( testMentorOnboarding );		
		$(".test-local-api").click( testLocalAPI );		
		$(".test-remote-api").click( testRemoteAPI );		
		$(".test-flagging-in-tab").click( testLoadFlaggingInTab );
		$(".test-rtl").click( testRTL );
		$(".close-debug").click( closeDebug );

		browser.tabs.query({active: true, currentWindow: true}, function(tabs) {		

			let url          = tabs[0].url;
			let displayUrl   = url ? url : "";
			let onboarding   = (displayUrl.indexOf("chrome-extension://") === 0);		
			if(window.location.protocol=='moz-extension:'){
				onboarding = (url.indexOf("moz-extension://") === 0);
			}


			currentUrl = url ? url : "about:blank";


			if (!config.userId)
			{
				//missing user id, launch onboarding to get a user id from the api
				window.open("/html/onboarding.html");				
			}
			else if ( !config.onboardingDone && !config.onboardingOptOut && !onboarding )
			{
				debug("Onboarding incomplete");
				//debug(config);

				showError( 
					'onboarding_incomplete', 
					[
						{
							'labelId' : 'no',
							'func' : function () {
								browser.runtime.sendMessage({command: 'onboarding-opt-out'}, function (response) { debug(response); });
								$(".flagging .error").css('display','none');
								$(".flagging-ui").css('display','block');								
								$(".flagging .pages").css('display','block');
								$(".flagging").css('height','500px');
							}
						},
						{ 
							'labelId' : 'yes',
							'func' : function () {
								setTimeout(function () { window.close(); }, 100);						
								window.open("/html/onboarding.html");
							} 
						}
						
					]
				);
			}
			else
			{
				//debug("Onboarding complete");
				$(".flagging-ui").css('display','block');				
			}


			//populate the flagging with details of the site

			let title          = getPageTitle( tabs[0] );				
			let favicon        = "chrome://favicon/" + displayUrl;					
			if(window.location.protocol=='moz-extension:' && !onboarding){
				let domain = (new URL(url)).hostname;
				console.log(domain)
				favicon = 'https://'+ domain + '/favicon.ico';
				console.log(favicon)
			}
			let messageDetails = isPermalink( displayUrl );

			if ( messageDetails )
			{
				$(".flagging .message h1").html( messageDetails.title );
				$(".flagging .message .text").html( messageDetails.message );

				if (messageDetails.image)
				{
					$(".flagging .message .example").attr('src',messageDetails.image).css('display','block');
				}

				$(".flagging .message").css('display','block');
				$(".flagging .pages").css('display','none');

				adjustPopupSize(true); //toggle message screen size
			}
			else
			{			
				if (onboarding)
				{
					//TODO: get headline title from demo article dynamically and fill flagging window title with that

					//move the pointy hand to the next step ONLY on the correct onboarding step
					if(url.slice(-2) == "#5")
					{
						//we are looking at an extension page, work in demo mode
						title = getString("example_site_title");
						displayUrl = "http://example.com";
						favicon = "/images/demo-favicon.svg";
						browser.runtime.sendMessage({command: 'move-hand-flag'}, function (response) { console.log(response); });
					}
				}
				else
				{
					if (title.length > CARD_DISPLAY_TITLE_LENGTH)
					{
						title = title.substring(0,CARD_DISPLAY_TITLE_LENGTH);
					}

					if (displayUrl.length > CARD_DISPLAY_URL_LENGTH)
					{
						displayUrl = displayUrl.substring(0,(CARD_DISPLAY_URL_LENGTH - 3)) + "...";
					}
				}

				$(".site-title").html( title );
				//$(".card .site-url").html( '<a href="' + url + '" target="_blank" rel="noreferrer noopener">' + displayUrl + '</a>' );
				$(".with-favicon img").attr('src', favicon);

				$(".flagging .pages").css('display','block');

				adjustPopupSize();
			}


			
			$("body").click(function (ev) {

				$(".select.open").click();
			});
			


			$(".flagging ul.flags li").click(function () 
			{
				let $openSelect = $(".select.open");

				if ($openSelect.length > 0)
				{
					//user is clicking to close the select, not trying to click this
					return;
				}

				let $this               = $(this);
				let $label              = $this.find("label");
				let $severity           = $this.find(".severity");
				let $page               = $this.closest(".page");
				let $submit             = $page.find(".next");
				let messageRoot         = $this.attr("data-message-root");
				let severity            = parseInt($this.attr("data-severity"));
				let newSeverity         = (severity <= 2) ? (severity+1) : 0;
				let firstTimeOnboarding = true;

				// for onboarding demo, when we loop back to original state, move tool tip to next location
				if (firstTimeOnboarding && (currentUrl.indexOf("chrome-extension://") === 0 || (window.location.protocol=='moz-extension:')) && severity == 2)
				{
					browser.runtime.sendMessage({command: 'move-hand-text'}, function (response) { console.log(response); });
					firstTimeOnboarding = false;
				}
				
				if (newSeverity == 0)
				{
					$this.removeClass('on');	
					$label.html( getString(messageRoot + "_off") );

					//see if we need to disable the submit button
					if ( $(".flagging ul.flags li.on").length == 0 )
					{
						$submit.addClass('disabled');
					}
				}
				else
				{
					if (newSeverity == 1)
					{
						$this.addClass('first-click');
					}
					else
					{
						$this.removeClass('first-click');
					}
					$this.addClass('on');
					$label.html( getString(messageRoot + "_on") );
					$submit.removeClass('disabled');
				}

				if ($this.hasClass("good"))
				{
					$severity.html( getString("quality_" + newSeverity) );
				}
				else
				{
					$severity.html( getString("severity_" + newSeverity) );
				}
				$this.attr("data-severity", newSeverity);

				updateCurrentReport();
			});


			$("#reasoning").on("keyup", function () {
				updateSelectedHashtags();
				updateCurrentReport();
			});

			$("#reasoning").click(function (ev) {
				// for onboarding demo, move tool tip to next location
				if ((currentUrl.indexOf("chrome-extension://") === 0) || (window.location.protocol=='moz-extension:'))
				{
					browser.runtime.sendMessage({command: 'move-hand-dropdown'}, function (response) { console.log(response); });
				}

			});


			$(".options").click(function (ev) {
				// for onboarding demo, move tool tip to next location
				if ((currentUrl.indexOf("chrome-extension://") === 0) || (window.location.protocol=='moz-extension:'))
				{
					browser.runtime.sendMessage({command: 'move-hand-submit'}, function (response) { console.log(response); });
				}

			});

			$(".select").click(function (ev) {

				let $this    = $(this);
				let open     = $this.hasClass("open");

				if (open)
				{
					//close it
					$this.removeClass("open");
				}
				else
				{
					//open it
					$this.addClass("open");
				}

				ev.stopPropagation();
			});


			$(".select .options .option").click(function (ev) {
				//console.log("Option click");

				ev.stopPropagation();

				try
				{
					let $this    = $(this);
					let $select  = $this.closest(".select");
					//let value    = $this.attr("data-value");
					let value    = $this.text();
					let $notes   = $("#reasoning");
					let tags     = "";

					/*$select.find(".option").removeClass('selected');
					$this.addClass('selected');*/
					//$select.addClass('selected');

					if (notesContainHashtag(value))
					{
						let text = $notes.val();
						$notes.val( text.replace(value, "").trim() );
					}
					else
					{
						$notes.val( $notes.val() + " " + value );
					}
					//console.log("TEST");
					updateCurrentReport();
					tags = getHashtagsFromNotes();

					updateSelectedHashtags();
				}
				catch (e)
				{
					console.error(e.message);
				}
			});

			
			$(".page[data-index=0] .button.next").click(function () {

				if ( $(this).hasClass('disabled') )
				{
					return;
                }
                
				updateCurrentReport();

				sendFlagData(currentReport, currentUrl);

			});
			
			
			$(".flagging .close").click(function () {

				browser.tabs.query({active: true, currentWindow: true}, function(tabs) {		

					let url = tabs[0].url;
					let onboarding = (url.indexOf("chrome-extension://") === 0);
					if(window.location.protocol=='moz-extension:'){
						onboarding = (url.indexOf("moz-extension://") === 0);
					}

					if (onboarding)
					{
						//move onboarding to next step
						browser.runtime.sendMessage({command: 'done-flagging'}, function (response) { console.log(response); });
					}
				});

				window.close();
			});


			$(".flagging .menu-open").click(function (ev) {

				if (ev.ctrlKey || ev.metaKey)
				{
					toggleDevConsole();
				}
				else
				{
					$(".flagging .pane").addClass("open");
				}
			});

			$(".flagging .menu-close").click(function () {

				$(".flagging .pane").removeClass("open");
			});
			
			
			restoreStoredReport(currentUrl);			

		});
	}
});



function notesContainHashtag (tag)
{
	let $notes = $("#reasoning");
	let index = $notes.val().indexOf(tag);

	/*backgroundPage.console.log("Looking for " + tag);
	backgroundPage.console.log("Current val is " + $notes.val());
	backgroundPage.console.log("Index is " + index);*/
	return (index > -1);
}


function updateSelectedHashtags ()
{
	//console.log("Updating selected tags");
	var tags     = getHashtagsFromNotes();
	let $select  = $(".select.campaign");
	var $options = $select.find(".option");
	let $preview = $select.find(".preview");

	$options.removeClass("selected");

	if (tags && tags.length > 0)
	{
		for (let i=0; i < tags.length; i++)
		{
			let tag = tags[i];

			//console.log("Checking " + tag);

			$options.each(function () {
				let $this = $(this);


				if ($this.text() == tag)
				{
					$this.addClass('selected');
				}
				else
				{
					//console.log($this.text() + " != " + tag + "?");
				}
			});
		}
		$preview.html( tags.join(", ") ).addClass("selected");
	}
	else
	{
		//console.log("Tags", tags);
		$preview.html( "" ).removeClass("selected");
	}	
}


function getHashtagsFromNotes ()
{
	var notes = $("#reasoning").val();

	//console.log("Notes are: " + notes);
	// abc#
	// #الانتخابات
	// #كوفيد19 #لقاح #العلوم

	if (!notes) { return; }
	if (notes.indexOf("#") == -1) { return; }

	var re         = /#[^\s]+/g;
	var matches    = notes.match(re);
	/*
	var rtlRe      = /\b[\S\-\_]+?\#/g;
	var rtlMatches = notes.match(rtlRe);

	if (!matches)
	{
		matches = [];
	}

	matches.concat(rtlMatches);
	*/

	//console.log("Matches: " + matches);

	return matches;
}


function sendFlagData (currentReport, currentUrl)
{
	let data = {
		'command'     : 'save-flag',
		'url'         : currentUrl,
		'campaign_id' : currentReport.campaignId,
		'flags'       : currentReport.flags,
		'notes'       : currentReport.notes
	};

	debug("Saving flag...");
	debug(data);

	//save flag to API
	browser.runtime.sendMessage( data, function () {} ); 

	// for onboarding demo, move tool tip to next location
	if ((currentUrl.indexOf("chrome-extension://") === 0) || (window.location.protocol=='moz-extension:'))
	{
		browser.runtime.sendMessage({command: 'move-hand-done'}, function (response) { console.log(response); });
	}

	$(".page[data-index]").css({ 'transform':'translateX(-100%)' }).removeClass('active');
	$(".page[data-index=1]").addClass('active');

	adjustPopupSize();
	updateThanksPage();	
}


function generateTestMessage ()
{
	let data = {
		'command' : 'test-message'
	};

	browser.runtime.sendMessage( data ); 
	debug("Test message requested...");
}


function getNotifications (force)
{
	let data = {
		'command' : 'get-notifications'
	};

	browser.runtime.sendMessage( data ); 
	
	debug("Pinging for notifications (" + backgroundPage.CONFIG.apiUrl + ")");
	//backgroundPage.getNotificationsFromAPI(force);
}


function testMentorReview ()
{
	debug("Testing mentor review...");
	backgroundPage.testMentorReviewNotification(currentUrl);	
}


function testOnboarding ()
{
	debug("Testing onboarding...");
	var creating = browser.tabs.create({
		url:"/html/onboarding.html"
	});	
	backgroundPage.testOnboarding();	
}


function testMentorOnboarding ()
{
	debug("Testing onboarding...");
	backgroundPage.testMentorOnboarding();	
}


function testLocalAPI ()
{
	debug("Switching to local API...");
	backgroundPage.testLocalAPI();	
	debug(backgroundPage.CONFIG.apiUrl);
}


function testRemoteAPI ()
{
	debug("Switching to remote API...");
	backgroundPage.testRemoteAPI();	
	debug(backgroundPage.CONFIG.apiUrl);
}


function testLoadFlaggingInTab ()
{
	backgroundPage.testLoadFlaggingInTab();
}


function testRTL ()
{
	$("body").addClass("rtl");
}


function debug (data)
{
	let $debug = $("#debugger .messages");
	let existing = $debug.html();
	let json = JSON.stringify(data);

	$debug.html( existing + "<hr>" + json );
	$debug.animate(
		{ 'scrollTop' : $debug[0].scrollHeight }, 
		300
	);
}


function goToThanksPage ()
{
    // Dynamically change thank you text for each flag submitted!
    var numStrings1 = 5;
    var r1 = (Math.floor(Math.random() * numStrings1) + 1);
    var a1 = "thank_you_header_" + r1;
    $("#dynamic-thanks").attr("data-i18n-message",a1);
    $("#dynamic-thanks").text( getString(a1)).html();

    var numStrings2 = 10;
    var r2 = (Math.floor(Math.random() * numStrings2) + 1);
    var a2 = "thank_you_" + r2;
    $("#dynamic-submitted").attr("data-i18n-message",a2);
    $("#dynamic-submitted").text( getString(a2)).html();
    
	$(".page[data-index]").css({ 'transform':'translateX(-200%)' }).removeClass('active');
	$(".page[data-index=2]").addClass('active');
	adjustPopupSize();	
	clearStoredReport(currentUrl);
}


function updateCurrentReport ()
{
	if (autofilling == true)
	{
		//console.log("Autofilling, ignoring updateCurrentReport");
		return;
	}

	//console.log("Building report");

	try
	{
		let $flags = $(".flagging ul.flags li");

		currentReport = {
			'url'        : currentUrl,
			'flags'      : [],
			'notes'      : $("#reasoning").val()
		};	

		$flags.each(function () {

			let $this      = $(this);
			let severity   = parseInt($this.attr("data-severity"));
			let good       = $this.hasClass("good");
			let $image     = $this.find(".icon img");
			let jsonReport = "";

			if (severity > 0)
			{
				currentReport.flags.push({
					'flag_type_id' : $this.attr("data-id"),
					'name'         : $this.attr("data-message-root"),
					'severity'     : severity,
					'good'         : good,
					'image'        : $image.attr("src")
				});
			}
		});

		//console.log("Report built");

		setStoredReport(currentUrl, currentReport);
	}
	catch (e)
	{
		console.error(e.message);
	}
}


function updateThanksPage ()
{
	let $selectedFlags    = $(".thanks .selected-flags");
	let $selectedCampaign = $(".thanks .selected-campaign");
	let $notes            = $(".thanks .notes");

	//console.log(currentReport);

	$selectedFlags.html("");
	$selectedCampaign.html("");
	$notes.html("");

	for (let i=0; i < currentReport.flags.length; i++)
	{
		let flag         = currentReport.flags[i];
		let $li          = $('<li data-severity="' + flag.severity + '"></li>');
		let $icon        = $('<div class="icon"><img src="' + flag.image + '"></div>');
		let $thermometer = $("<span class='thermometer'></span>");
		let $severity    = null;
		let $label       = $('<label>' + getString( flag.name + "_on") + '</label>');

		if (flag.good)
		{
			$li.addClass('good');
			$severity = $('<div class="severity">' + getString("quality_" + flag.severity) + '</div>');
		}
		else
		{
			$severity = $('<div class="severity">' + getString("severity_" + flag.severity) + '</div>');
		}

		$li.append( $icon );
		$li.append( $thermometer );
		$li.append( $severity );
		$li.append( $label );

		$selectedFlags.append( $li );
	}

	if (currentReport.campaign)
	{
		$selectedCampaign.html('<span>' + currentReport.campaign + '</span>');
	}

	if (currentReport.notes)
	{
		$notes.css('display','block').text( currentReport.notes );
	}
	else
	{
		$notes.css('display','none');
	}

	adjustPopupSize();

}


function adjustPopupSize (messageToggle)
{
	let newHeight     = 0;
	let $activePage   = $(".page.active");
	let $button       = $activePage.find(".button");
	let bottomPadding = 20;
	let $flagging     = $(".flagging");

	if (messageToggle)
	{
		$flagging.height("auto");	//set height to auto for messages with no "page"
		$flagging.css( "overflow","hidden" );

	}
	else if ($button.length > 0)
	{
		newHeight = $button.offset().top + $button.outerHeight() + bottomPadding;

		$flagging.height( newHeight + "px" );
		
		setTimeout(function () {
			$flagging.css('transition','height 200ms ease-in-out');	
		}, 100);
		
		//console.log($button.offset().top, $button.outerHeight(), newHeight);
	}
	else
	{
		//console.log("No buttons");
	}
}


function isPermalink ( url )
{
	if (!url) 
	{  
		url = "about:blank";
	}

	let domain = (new URL(url)).hostname;

	if ( domain.indexOf('twitter.com') > -1 )
	{
		if (url.indexOf("/status/") === -1)
		{
			return {
				'title'   : getString('twitter_flag'),
				'message' : getString('trying_to_flag_tweet')
			};
		}
	}
	else if ( domain.indexOf('facebook.com') > -1 )
	{
		//todo: there's probably a better way to do this
		if ( 
			url == "https://www.facebook.com/"
			/*url.indexOf("/posts/") === -1 &&
			url.indexOf("/photos/") === -1 &&
			url.indexOf("/permalink/") === -1 &&
			url.indexOf("/photo.php") === -1*/
		) 
		{
			return {
				'title'   : getString('facebook_flag'),
				'message' : getString('trying_to_flag_facebok_post'),
				'image'   : '/images/facebook-timestamp.svg'
			};
		}
	}
	else
	{
		//console.log(domain);
	}
	return false;
}



function getPageTitle ( tab )
{
	let title = getString("this_page");

	if (tab && tab.title)
	{
		title = tab.title;

		//clean up if needed
		title = title.replace(/^\(.*?\)\s/g, '');
	}

	return title;
}


function showError (messageKey, buttons)
{
	console.log("Error");

	let $ = jQuery;
	let $buttons = $(".flagging .error .content .buttons");

	$(".flagging-ui").css('display','none');

	$buttons.html("<div></div>");
	$(".flagging .error .content .text").html( getString(messageKey) );

	for (let i=0; i < buttons.length; i++)
	{
		let $button = $('<div class="button">' + getString(buttons[i].labelId) + '</div>');
		$button.click( buttons[i].func );
		$buttons.append( $button );
	}
	$(".flagging .error").css('display','block');
	$(".flagging-ui").css('display','none');								
	$(".flagging .pages").css('display','none');
}


function getStoredReport (url)
{
	let escapedUrl = encodeURIComponent(url);
	let report = localStorage[escapedUrl];

	if (report)
	{
		debug("Found stored report for " + escapedUrl);
		
		let parsed = JSON.parse(report);
		debug(parsed);
		return parsed;
	}	
	debug("No stored report for " + escapedUrl);
}


function setStoredReport (url, report)
{
	if (autofilling == true)
	{
		//dont save the report if it's the stored report being autofilled
		//debug("Autofilling, ignoring setStoredReport");
		return;
	}
	let json = JSON.stringify(report);
	localStorage[encodeURIComponent(url)] = json;
	//debug("Saved report");
	//debug(json);
}


function clearStoredReport (url)
{
	let escapedUrl = encodeURIComponent(url);
	localStorage.removeItem(escapedUrl);
}


function restoreStoredReport (url)
{
	let storedReport = getStoredReport(url);
	let $flags       = $(".flagging ul.flags li");
	//let $campaigns   = $(".campaign .option");

	if (!storedReport || !storedReport.url)
	{
		return false;
	}

	try
	{
		autofilling = true; //set global var
		
		//save to global var
		currentReport = storedReport;

		debug("Re-entering report data");
		debug(currentReport);

		//update the UI with stored report data
		$("#reasoning").val(currentReport.notes);
		updateSelectedHashtags();

		for (var i=0; i < currentReport.flags.length; i++)
		{
			
			let currentFlag = currentReport.flags[i];

			for (let j=0; j < $flags.length; j++)
			{
				
				let $flag = $( $flags[j] );

				if ($flag.attr("data-id") == currentFlag.flag_type_id)
				{
					for (let k=0; k < currentFlag.severity; k++)
					{
						$flag.trigger('click'); //click this flag once for each level of severity
					}			
				}

			}
		}

	}
	catch (e)
	{
		console.log(e.message);
	}

	autofilling = false; //set global var
}


function toggleDevConsole ()
{
	let $body = $("body");

	if ($body.hasClass('debug'))
	{
		$body.removeClass("debug");
	}
	else
	{
		$body.addClass("debug");
	}
}


function closeDebug ()
{
	$("body").removeClass("debug");
}
