
var CARD_DISPLAY_TITLE_LENGTH = 48;
var CARD_DISPLAY_URL_LENGTH = 60;

var currentReport = {};	
var currentUrl = "";
var uiInitialized = false;
var autofilling = false;
var notificationType;


console.log('Starting...');
browser.runtime.sendMessage({command: 'get-message'}, function () {});
browser.runtime.sendMessage({command: 'get-flag'}, function () {});




jQuery(document).ready(function ($) {

    console.log('Document ready!');



	browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {		
		let $this = $(this);


		if (request.command == 'notification-type')
		{
			notificationType = request.type;

		}
        else if ( request.command == 'populate-message')
        {


			if(notificationType == "journalist-contact")
			{
				console.log('populate-message')
				console.log(request.message)
				// document.getElementById("message").innerHTML = request.message.text;
				var html = $.parseHTML(request.message.text);
				$(".message-container").append(html);

				let replyemail = 'mailto:'+request.message.reply_to;
				document.getElementById("email-button").href =  replyemail;

				$(".notification-header").text( getString( "notification_header_journalist")).html();
				$(".notification-body").text( getString( "notification_journalist")).html();

				document.getElementById("left-footer").style.display = "block";


			}
			else if (notificationType == "user-impact"){

				var html = $.parseHTML(request.message.text);
				console.log(html)
				// $("#message").text( getString( request.message.text )).html();
				$(".message-container").append(html);

				$(".notification-header").text( getString( "notification_header_impact")).html();
				$(".notification-body").text( getString( "notification_impact")).html();

			}

           
		}
		
		else if ( request.command == 'populate-flag')
		{

            console.log('populate-flag')
			console.log(request.data)
			

			document.getElementById("visit-site").href =  request.data.flagging_event.url;
			document.getElementById("campaign").innerHTML =  request.data.flagging_event.campaign;

			$("#timestamp").text( getString( request.data.flagging_event.timestamp )).html();

			document.getElementById("notes").innerHTML =  request.data.flagging_event.notes;
			let favicon = "chrome://favicon/" + request.data.flagging_event.url;	
			document.getElementById("favicon").src =  favicon;
			document.getElementById("site-title").innerHTML =  request.data.flagging_event.url;
			$("#data-severity").attr("data-severity", request.data.flagging_event.flags[0].severity);


			//should probably internationalize this 
			document.getElementById("flag_type").innerHTML =  request.data.flagging_event.flags[0].type;


			//could clean this up with data-root
			if(request.data.flagging_event.flags[0].type == "Worthwhile ideas"){
				document.getElementById("flag-img").src =  "/images/trueIdeas.svg";
				$("#data-severity").attr("class", "good");
				document.getElementById("campaign").style.backgroundColor = "var(--green)";

			}
			else if(request.data.flagging_event.flags[0].type == "Abuse or harassment"){
				document.getElementById("flag-img").src =  "/images/abuse.svg";

			}
			else if(request.data.flagging_event.flags[0].type == "Division or fear"){
				document.getElementById("flag-img").src =  "/images/division.svg";

			}
			else if(request.data.flagging_event.flags[0].type == "Lies or manipulation"){
				document.getElementById("flag-img").src =  "/images/manipulation.svg";

			}

			var severity = "severity_"+request.data.flagging_event.flags[0].severity;
			$(".severity").text( getString( severity)).html();

        }

        else
		{
			console.log("Unrecognized request:");
			console.log(request);
		}	

		return Promise.resolve("Dummy response to keep the console quiet");
    });

});

