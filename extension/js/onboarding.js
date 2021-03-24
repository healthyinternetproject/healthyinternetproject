
var FADE_TIME = 400;
var WELCOME_ANIMATION_TIME = 900; //matches transition time for .onboarding .welcome in onboarding.css
var uiInitialized = false;
jQuery(document).ready(function ($) 
{	


	initializeUI();	



	if(window.location.protocol=="moz-extension:"){
		$(".help-button").css({'display':'none'});
	}

	browser.runtime.onMessage.addListener(function(request, sender, sendResponse) 
	{

		console.log(request);


		if (request.command == 'notification-click')
		{
			notificationClick();
		
        }
		else if (request.command == 'move-hand-flag')
		{
            // in case user clicks on extension before closing pin helper
			removePinHelper();
			

			$("#pointer-hand").removeClass();
			$("#pointer-tip").removeClass();

			$("#pointer-hand").addClass("point-at-flag");
			$("#pointer-tip").addClass("point-at-flag");
			//move height to the selected mission
			var top = 0;
			switch($(".mission-name").text()) 
			{
				case "worthwhile ideas":
					top = 50;
				  break;
				case "lies or manipulation":
					top = 125;
					break;
				case "abuse or harassment":
					top = 187;
					break;
				case "division or fear":
					top = 245;
				  break;
				default:
					top = 55;
			}

			$(".onboarding #pointer-hand.point-at-flag").css("top", top);
			$(".onboarding #pointer-tip.point-at-flag").css("top", top);

			//change i18n data field - may not be necessary
			$("#pointer-tip span").attr("data-i18n-message","tooltip_click_multiple");
			//change content of tip!
			$("#pointer-tip span").text( getString("tooltip_click_multiple")).html();

			sendResponse({result: "success"});

		}
		else if (request.command == 'move-hand-text')
		{
			$("#pointer-hand").removeClass();
			$("#pointer-tip").removeClass();

			$("#pointer-hand").addClass("point-at-text");
			$("#pointer-tip").addClass("point-at-text");


			//change i18n data field - may not be necessary
			$("#pointer-tip span").attr("data-i18n-message","tooltip_click_freetext");
			//change content of tip!
			$("#pointer-tip span").text( getString("tooltip_click_freetext")).html();

			sendResponse({result: "success"});

		}
		else if (request.command == 'move-hand-dropdown')
		{
			setTimeout(function(){
				$("#pointer-hand").removeClass();
				$("#pointer-tip").removeClass();
	
				$("#pointer-hand").addClass("point-at-dropdown");
				$("#pointer-tip").addClass("point-at-dropdown");
	
				//change i18n data field - may not be necessary
				$("#pointer-tip span").attr("data-i18n-message","tooltip_click_dropdown");
				//change content of tip!
				$("#pointer-tip span").text( getString("tooltip_click_dropdown")).html();
	
				sendResponse({result: "success"});
			},2000);

		}
		else if (request.command == 'move-hand-submit')
		{
			$("#pointer-hand").removeClass();
			$("#pointer-tip").removeClass();

			$("#pointer-hand").addClass("point-at-submit");
			$("#pointer-tip").addClass("point-at-submit");

			//change i18n data field - may not be necessary
			$("#pointer-tip span").attr("data-i18n-message","tooltip_click_submit");
			//change content of tip!
			$("#pointer-tip span").text( getString("tooltip_click_submit")).html();

			sendResponse({result: "success"});

		}
		else if (request.command == 'move-hand-done')
		{
			$("#pointer-hand").remove();
			$("#pointer-tip").remove();

			sendResponse({result: "success"});
		}
		else if (request.command == 'done-flagging')
		{
			console.log("done with flagging demo");
			window.location.href = window.location.pathname + "#6";
			sendResponse({result: "success"});
			browser.runtime.sendMessage({command: 'onboarding-done'}, function () {});
		}

		else
		{
			console.log("Unrecognized command");
		}

		return Promise.resolve("Dummy response to keep the console quiet");
	});


	function initializeUI ()
	{
		if (uiInitialized) { return; }

		console.log("Initializing UI");
		uiInitialized = true;




		$(".onboarding .user-id").html( formatUserId(CONFIG.userId) );

		$(".onboarding .progress .step [href]").click(function (ev) 
		{

			let $this = $(this);
			let $step = $this.closest('.step');

			if ($step.hasClass('ahead'))
			{
				ev.preventDefault();
				return false;
			}
		});


		$(".onboarding .missions li").on('click', function (ev) 
		{

			console.log('click ' + Date.now());
			ev.stopPropagation();
			ev.preventDefault();

			let $this = $(this);
			let $panel = $this.closest('.panel');
			let $img  = $this.find("img[data-active]");
			let $next = $panel.find(".next");

			if ($this.hasClass('active'))
			{
				$this.removeClass('active');
				$next.addClass('disabled');
				$img.attr("src", $img.attr("data-inactive"));
			}
			else
			{
				let $active = $(".missions li.active");
				let $activeImage = $active.find("img[data-active]");

				if ($active.length > 0)
				{				
					$activeImage.attr("src", $activeImage.attr("data-inactive"));
					$active.removeClass('active');
				}
				$next.removeClass('disabled');
				$this.addClass('active');
				$img.attr("data-inactive", $img.attr("src"));
				$img.attr("src", $img.attr("data-active"));

				$(".mission-name").text( getString( $this.attr("data-message-root") + "_on" ).toLowerCase() ).html();
				$(".demo-article-headline").text( getString( $this.attr("data-message-root") + "_headline" )).html();
				$(".demo-article-content").text( getString( $this.attr("data-message-root") + "_content" )).html();


				if ($this.hasClass('good'))
				{
					$(".mission-name").addClass('good');
				}
				else
				{
					$(".mission-name").removeClass('good');	
				}
			}

        });	

        $('.onboarding #pointer-tip').on('click','.help-button',addPinHelper);

        $('.onboarding #pointer-tip').on('click','.done-button',removePinHelper);

		$(".onboarding .panel.mission-selector .next").click(function () 
		{

			let id = parseInt( $(".onboarding .missions li.active").attr("data-mission-id") );

			console.log("Saving mission id " + id);

			//save mission to API
			browser.runtime.sendMessage(
				{command: 'save-mission', 'mission_id': id}, 
				function () {}
			);

		});

		$(".submit_feedback").click(function () 
		{
			let text =  $(".content-warning .no-review .reasoning").val() ;

			console.log("Saving reasoning " + text);

			//save mission to API
			browser.runtime.sendMessage(
				{command: 'save-reasoning', 'reasoning': text}, 
				function () {}
			);

		});

		// $(".onboarding #countrypicker").load('countrylist.html',function (){
		$( ".onboarding .panel .countrypicker" ).ready(function() {
				console.log("ready!")

				var $next = $("#countrybutton");
			$("select").change(function() {

				// $next = $(".onboarding #countrybutton")
				$next.removeClass('disabled');
					// document.getElementById("countrybutton").disabled = false;
					
					let id = parseInt( $(this).val());
					console.log("Saving country id " + id);

					//save mission to API
					browser.runtime.sendMessage(
						{command: 'save-country', 'country_id': id}, 
						function () {}
				);
			});
		});




		


		//activate 'next' buttons in onboarding
		$(".onboarding .panel .next").click(function () 
		{

			let $this = $(this);
			let $current = $(".panel.current");
			let currentIndex = $current.attr("data-index");
			let nextIndex = parseInt(currentIndex) + 1;

			//console.log(nextIndex);

			if ($this.hasClass('disabled')) { return; }
						
			window.location.href = window.location.pathname + "#" + nextIndex;
		});


		$(".sample-notification").click(function () 
		{

			if (Notification.permission == "denied")
			{
				alert( getString("error_notifications_disabled") );
			}
			else
			{
				if(window.location.protocol=='moz-extension:'){
					firefoxNotifyMe();
				}
				browser.runtime.sendMessage({command: 'sample-notification'}, function (response) { console.log(response); });
			}
		});

		$("#launch-demo").click(function () 
		{
			let $demo = $(".demo");
			let $bgoverlay = $("#bg-overlay");
			let $browserbar = $(".browserbar");
			let $demoarticle = $(".demo-article");
			let $button = $("#button-container-demo")
			let $content = $(".content")
			let $panels = $(".panels");
			let $contentwarning = $(".content-warning");


			$panels.css({ 'color': 'rgba(255, 255, 255, .15)', 'filter': 'blur(5px)'});
			$contentwarning.css({'display':'block'})


			$demo.css({'display':'block',
			'position': 'absolute',
			'top': '-40px',
			'left': '0'});

			$bgoverlay.css({'display': 'block', 'background-color': '#2FC38E'});	
			$browserbar.css({'width': '1000px', 'max-width': '1000px'});
			$demoarticle.css({'width': '1000px', 'max-width': '1000px', 'height': '570px'});
			$button.css({'display':'none'});
			$content.css({'font-size': '20px'});
			
		});


		$("#button-container-review").click(function () 
		{
			let $contentwarning = $(".content-warning");
			let $panels = $(".panels");

			$panels.css({ 'filter': 'blur(0px)'});
			$contentwarning.css({'display':'none'})

		});

		$("#uncomfortable-link").click(function () 
		{
			let $first = $(".first");
			let $noreview = $(".no-review");

			$first.css({'display':'none'})
			$noreview.css({'display': 'block'})

		});


		


		$(".timed-appearance").each(function () 
		{

			let $this   = $(this);
			let delay   = $this.attr("data-delay");
			let trigger = $this.attr("data-trigger");

			$("#" + trigger).click(function () 
			{
				setTimeout(function () 
				{
					$this.slideDown();
				}, delay);
			});
		});


		$(".troubleshoot").each(function () 
		{

			let $troubleshoot = $("#troubleshoot");
			let $tips = $("#tips");

			$troubleshoot.click(function () 
			{
				$tips.css({'display':'block'});


			});
        });
        
        $(".inspiration").each(function () 
        {

			let $inspiration = $("#inspiration");
			let $inspirationFlag = $("#inspirationFlag");

			$inspiration.click(function () 
			{
				$inspirationFlag.css({'display':'block'});
			});
		});




		$("#button-container-notif").each(function () 
		{

			let $buttonNotif = $("#button-container-notif");
			let $tips = $("#tips");

			count = 0;
			$buttonNotif.click(function () 
			{

				count += 1;
				if(count > 2)
				{
					$tips.css({'display':'block'});
				}
			});
		});


		//let browser back/forward buttons work as expected
		window.onhashchange = function () 
		{
			let index = parseInt(location.hash.substring(1));

			if (!index) { index = 0; }

			goToOnboardingStep(index);
		};

        // if hash is "#0" already, force-call function to update UI 
        if(location.hash === "#0"){
            goToOnboardingStep(0);
        }else{
            location.hash = "#0";
        }
	}

});

function addPinHelper()
{
    var helpInterface = `
    <div class="help-container">
        <div><img src='/images/puzzle.png'><span class='puzzle-row' data-i18n-message='tooltip_puzzle_icon'></span></div>
        <div><img src='/images/icon-48.png'><span class='hip-row' data-i18n-message='tooltip_hip_icon'></span></div>
        <div><img src='/images/pin.png'><span class='pin-row' data-i18n-message='tooltip_pin_icon'></span></div>
        <button class='done-button'><span data-i18n-message='tooltip_done_button'></span></button>
    </div>
    `;
    $("#pointer-tip").addClass("help-tip");

    $("#pointer-tip").html(helpInterface);
    console.log(helpInterface);

    $("#pointer-tip .puzzle-row").html( getString("tooltip_puzzle_icon"));
    $("#pointer-tip .hip-row").html( getString("tooltip_hip_icon"));
    $("#pointer-tip .pin-row").html( getString("tooltip_pin_icon"));
    $("#pointer-tip .done-button span").html( getString("tooltip_done_button"));
}

function removePinHelper()
{
    var clearSpan = "<span></span>"
    $("#pointer-tip").html(clearSpan);
    $("#pointer-tip").removeClass("help-tip");

    $("#pointer-tip span").attr("data-i18n-message","tooltip_find_the_hip_button");
    //change content of tip!
	$("#pointer-tip span").html( getString("tooltip_find_the_hip_button"));

	
	
}


function showMessage (title, text)
{
	let $message = $(".message-box");
	let $h1 = $message.find("h1");
	let $text = $message.find(".text");

	$h1.html(title);
	$text.html(text);

	$message.fadeIn(FADE_TIME);
}


function hideMessage ()
{
	let $message = $(".message-box");

	$message.fadeOut(FADE_TIME);
}


function goToOnboardingStep (index)
{
	//let $current = $(".panel.current");
	let $target = $(".panel[data-index=" + index + "]");

	if ($target.length > 0)
	{
		let currentStepReached = (index == 0);
		let $hand              = $("#pointer-hand");
		let $logo              = $("#civic-logo");
		let $tip               = $("#pointer-tip");
		let handState          = $target.attr("data-hand");	
		let logoState          = $target.attr("data-logo");	
		let $progress          = $("ul.progress");	
		let $panels            = $target.closest('.panels');
		let $button            = $('#button-container-notif');
		let $buttonText        = $('#send-notification');
		let $overlay           = $("#bg-overlay");
		let $tedconf           = $("#ted-conf");
		let $copyright         = $("#copyright");


		window.location.href = window.location.pathname + "#" + index;

		if (index == 0 || index == 5)
		{
			$panels.css('transform','translate(-50%,-50%)'); 
			$panels.css('top','50%'); 
			$overlay.fadeIn(WELCOME_ANIMATION_TIME);
		}
		else if (index == 4){
			$button.css({"left": "0px", "bottom": "0px", "position":"relative", "top": "10px"});
			$buttonText.css({"font-size": "20px"});
			$tedconf.css({'color':'white'});
			$copyright.css({'color':'white'});
			$panels.css({'top':'20%','transform':'translate(-50%,0)'});
			$overlay.fadeOut(WELCOME_ANIMATION_TIME);
		}
		else if (index > 4){
			$tedconf.css({'color':'white'});
			$copyright.css({'color':'white'});
			$panels.css({'top':'20%','transform':'translate(-50%,0)'});
			$overlay.fadeOut(WELCOME_ANIMATION_TIME);

		}
		else
		{
			$panels.css({'top':'20%','transform':'translate(-50%,0)'});
			$overlay.fadeOut(WELCOME_ANIMATION_TIME);
		}

		$(".panel.current").fadeOut(FADE_TIME, function () 
		{
			$target.fadeIn(FADE_TIME);
		});		

		if (logoState)
		{
			$logo.attr("src","/images/" + logoState);
		}	

		console.log(index);

		$(".panel[data-index]").each(function () 
		{

			let $this = $(this);
			let i = parseInt($this.attr("data-index"));

			//console.log(i + " " + index);
			
			if (i == index)
			{
				$this.addClass('current').removeClass('behind ahead');
			}			
			else if (i < index)
			{
				$this.addClass('behind').removeClass('current ahead');
			}
			else
			{
				$this.addClass('ahead').removeClass('current behind');
			}
			
		});

		$progress.find(".step[data-index]").each(function () 
		{

			let $this = $(this);
			let indexList = $this.attr("data-index");

			if (indexList.indexOf('|' + index + '|') > -1)
			{
				//current item
				let currentProgress = $this.attr("data-progress");
				$this.addClass('current').removeClass('behind ahead');
				$progress.removeClass().addClass('progress progress-' + currentProgress);
				currentStepReached = true;
			}
			else if (currentStepReached === false)
			{
				$this.addClass('behind').removeClass('current ahead');
			}
			else
			{
				$this.addClass('ahead').removeClass('current behind');
			}
		});

		$hand.removeClass();
		$tip.removeClass();
		
		if (handState != "")
		{
			$hand.addClass(handState);
			$tip.addClass(handState);
		}		
	}
}


function debug (data)
{
	let $debug = $("#debugger");
	let existing = $debug.html();
	let json = JSON.stringify(data);

	$debug.html( existing + "<hr>" + json );
}


function displayError (message, buttonMessage, buttonFunc)
{
	let $overlay = $("#error-overlay");
	let $message = $overlay.find(".message");
	let html = getString(message) + "<br><br>";

	let $button = $("<button>" + getString(buttonMessage) + "</button>");

	$button.click(buttonFunc);

	$message.html(html);
	$message.append($button);
	$overlay.fadeIn(300);
}

function firefoxNotifyMe() {
	// Let's check if the browser supports notifications
	if (!("Notification" in window)) {
	  alert("This browser does not support desktop notification");
	}
  
	// Let's check whether notification permissions have already been granted
	else if (Notification.permission === "granted") {
	  // If it's okay let's create a notification
	  var options = {
		body: browser.i18n.getMessage("via_these_alerts"),
		icon: browser.runtime.getURL("/images/icon-128.png")
	}
  
		var notification = new Notification(browser.i18n.getMessage("click_here"),options);

	// firefox specific : https://developer.mozilla.org/en-US/docs/Web/API/Notification/Notification

		notification.onclick = function(event) {
			notification.close();
			notificationClick();

	  }
	  console.log("Notification shown");
	}
  
	// Otherwise, we need to ask the user for permission
	else if (Notification.permission !== "denied") {
	  Notification.requestPermission().then(function (permission) {
		// If the user accepts, let's create a notification
		if (permission === "granted") {
			var options = {
				body: browser.i18n.getMessage("via_these_alerts"),
				icon: browser.runtime.getURL("/images/icon-128.png")
			}

				var notification = new Notification(browser.i18n.getMessage("click_here"),options);
			
				notification.onclick = function(event) {
					notification.close();
					notificationClick();

			  }
			  console.log("Notification shown");
			}
	  });
	}
} 

function notificationClick(){
	console.log("Notification clicked");
			var segment_array = window.location.href.split( '/' );
			var last_segment = segment_array.pop();
			console.log(last_segment)
			if (last_segment == 'onboarding.html#4'){
				window.location.href = window.location.pathname + "#5";
				sendResponse({result: "success"});
			}
			sendResponse({result: "success"});
}

