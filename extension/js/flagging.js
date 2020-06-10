
var CARD_DISPLAY_TITLE_LENGTH = 48;
var CARD_DISPLAY_URL_LENGTH = 60;

var currentReport = {};	
var currentUrl = "";
var CONFIG = {};

var uiInitialized = false;


if ((typeof browser === 'undefined') && (typeof chrome !== 'undefined'))
{
	browser = chrome;
}


debug('Starting...');


jQuery(document).ready(function ($) {

	debug('Document ready.');

	browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {

		debug(request);

		if (request.command == 'config')
		{				
			debug(request.config);
			CONFIG = request.config;
			initializeUI(CONFIG);
		}
		else if (request.command == 'flag-error')
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

		return Promise.resolve("Dummy response to keep the console quiet");
	});

	browser.runtime.sendMessage({command: 'get-config'}, function () {});

	

	function initializeUI (config)
	{
		if (uiInitialized) { return; }

		debug("Initializing UI");
		uiInitialized = true;
		

		browser.tabs.query({active: true, currentWindow: true}, function(tabs) {		

			let url        = tabs[0].url;
			let displayUrl = url ? url : "";
			let onboarding = (displayUrl.indexOf("chrome-extension://") === 0);

			debug("Tab query complete");


			if (!config.onboardingDone && !config.onboardingOptOut && !onboarding )
			{
				debug("Onboarding incomplete");
				debug(config);

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
				debug("Onboarding complete");
				$(".flagging-ui").css('display','block');				
			}


			if ($(".site-title").length > 0)
			{
				//populate the flagging with details of the site

				let title = getPageTitle( tabs[0].title );
				let url = tabs[0].url;					
				let favicon = "chrome://favicon/" + displayUrl;					
				let messageDetails = isPermalink( displayUrl );

				currentUrl = url;

				if ( messageDetails )
				{
					$(".flagging .message h1").html( messageDetails.title );
					$(".flagging .message .text").html( messageDetails.message );

					if (messageDetails.image)
					{
						$(".flagging .message .example").attr('src',messageDetails.image).css('display','block');
					}

					$(".flagging .message").css('display','block');
				}
				else
				{			
					if (onboarding)
					{
						//TODO: get headline title from demo article dynamically and fill flagging window title with that

						//move the pointy hand to the next step ONLY on the correct onboarding step
						if(url.slice(-2) == "#5"){
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

			}

			
			$("body").click(function (ev) {

				$(".select.open").click();
				console.log('body click');
			});
			


			$(".flagging ul.flags li").click(function () {

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
				if (firstTimeOnboarding && currentUrl.indexOf("chrome-extension://") === 0 && severity == 2)
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

				console.log("Severity is " + newSeverity);

				updateCurrentReport();		
			});

			$("#reasoning").click(function (ev) {
				// for onboarding demo, move tool tip to next location
				if (currentUrl.indexOf("chrome-extension://") === 0)
				{
					browser.runtime.sendMessage({command: 'move-hand-dropdown'}, function (response) { console.log(response); });
				}

			});


			$(".options").click(function (ev) {
				// for onboarding demo, move tool tip to next location
				if (currentUrl.indexOf("chrome-extension://") === 0)
				{
					browser.runtime.sendMessage({command: 'move-hand-submit'}, function (response) { console.log(response); });
				}

			});

			$(".select").click(function (ev) {

				let $this    = $(this);
				let $preview = $this.find(".preview");
				let $options = $this.find(".options");
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


			$(".select .options .option").click(function () {

				let $this    = $(this);
				let $select  = $this.closest(".select");
				let $preview = $select.find(".preview");
				let value    = $this.attr("data-value");

				$select.find(".option").removeClass('selected');
				$this.addClass('selected');

				$preview.html( value ).addClass("selected");

				updateCurrentReport();
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

					if (onboarding)
					{
						//move onboarding to next step
						browser.runtime.sendMessage({command: 'done-flagging'}, function (response) { console.log(response); });
					}
				});

				window.close();
			});

		});
	}


});


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

	//save mission to API
	browser.runtime.sendMessage( data, function () {} ); 

	// for onboarding demo, move tool tip to next location
	if (currentUrl.indexOf("chrome-extension://") === 0)
	{
		browser.runtime.sendMessage({command: 'move-hand-done'}, function (response) { console.log(response); });
	}

	$(".page[data-index]").css({ 'transform':'translateX(-100%)' }).removeClass('active');
	$(".page[data-index=1]").addClass('active');

	adjustPopupSize();
	updateThanksPage();	
}


function debug (data)
{
	let $debug = $("#debugger");
	let existing = $debug.html();
	let json = JSON.stringify(data);

	$debug.html( existing + "<hr>" + json );
}


function goToThanksPage ()
{
	$(".page[data-index]").css({ 'transform':'translateX(-200%)' }).removeClass('active');
	$(".page[data-index=2]").addClass('active');
	adjustPopupSize();	
}


function updateCurrentReport ()
{
	let flags             = $(".flagging ul.flags li");
	let $selectedCampaign = $(".campaign .option.selected");
	let campaign          = "";
	let campaignId        = "";

	if ($selectedCampaign.length > 0)
	{
		campaign = $( $selectedCampaign.get(0) ).attr("data-value");
		campaignId = $( $selectedCampaign.get(0) ).attr("data-campaign-id");
		//debug("Campaign ID is " + campaignId);
	}

	currentReport = {
		'flags'      : [],
		'notes'      : $("#reasoning").val(),
		'campaign'   : campaign,
		'campaignId' : campaignId
	};

	flags.each(function () {

		let $this    = $(this);
		let severity = parseInt($this.attr("data-severity"));
		let good     = $this.hasClass("good");
		let $image   = $this.find(".icon img");

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

	debug(currentReport);


	//todo: save to localStorage in case we need to resume
}


function updateThanksPage ()
{
	let $selectedFlags    = $(".thanks .selected-flags");
	let $selectedCampaign = $(".thanks .selected-campaign");
	let $notes            = $(".thanks .notes");

	console.log(currentReport);

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


function adjustPopupSize ()
{
	let newHeight     = 0;
	let $activePage   = $(".page.active");
	let $button       = $activePage.find(".button");
	let bottomPadding = 50;

	if ($button.length > 0)
	{
		let $flagging = $(".flagging");
		newHeight = $button.offset().top + $button.outerHeight() + bottomPadding;

		$flagging.height( newHeight + "px" );
		
		setTimeout(function () {
			$flagging.css('transition','height 200ms ease-in-out');	
		}, 100);
		

		console.log($button.offset().top, $button.outerHeight(), newHeight);
	}
	else
	{
		console.log("No buttons");
	}
}


function isPermalink ( url )
{
	if (!url) { return true; }

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
			url.indexOf("/posts/") === -1 &&
			url.indexOf("/photos/") === -1 &&
			url.indexOf("/permalink/") === -1 &&
			url.indexOf("/photo.php") === -1
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
		console.log(domain);
	}
	return false;
}



function getPageTitle ( foundTitle )
{
	let title = foundTitle;

	if (!title)
	{
		title = getString("this_page");
	}
	else
	{
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