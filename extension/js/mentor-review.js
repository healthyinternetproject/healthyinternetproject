var verdict;
var originalBodyFilter = '';

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) 
{
	console.log(request);

	if (request.command == 'mentor-review' && request.url == location.href)
	{
		originalBodyFilter = $("body").css("filter");
		$("body").css("filter","blur(15px)");

		$(request.html).appendTo('html');

		$('.healthy-internet-project.content-warning button#begin_review').click(() => startReview());
		$('.healthy-internet-project.content-warning #uncomfortable-link').click(() => uncomfortable());
		$(".healthy-internet-project .submit_feedback").click(function () { window.close(); });

		// TIP -> SEE FLAG -> PROVIDE FEEDBACK -> THANK YOU
		$('.healthy-internet-project.overlay-container button#main').click(() => changeScreen("FLAG"));
		$('.healthy-internet-project #feedback').on('input', () => activateButton());		
    }
});

browser.runtime.sendMessage({command: 'check-for-mentor-review','url': location.href}, function (response) { console.log(response); });



/*
useful for switching to vanilla js

function addEventListeners (selector, elements, func)
{
	[].forEach.call(document.querySelectorAll(selector), function(el) 
	{
		el.addEventListener(eventName, func);
	})	
}
*/

function startReview()
{
    $('.healthy-internet-project.overlay-container').css("display","flex"); 
    $('.healthy-internet-project.content-warning').fadeOut(300); 
    $('body').css('filter',originalBodyFilter);
    changeScreen("FEEDBACK");
}

function uncomfortable()
{
    $(".healthy-internet-project .first").css({'display':'none'})
    $(".healthy-internet-project .no-review").css({'display': 'flex'})
}

function changeScreen(state)
{
    if(state === "FLAG")
    {
        $(".healthy-internet-project.overlay-container .title").attr("data-i18n-message","review_title_2");
        $(".healthy-internet-project.overlay-container .title").html( getString("review_title_2"));

        $('.healthy-internet-project.overlay-container .subtitle').css("display","none"); //remove subtitle

        $('.healthy-internet-project.overlay-container #tip').css("display","none"); //change content from tip to card
        $('.healthy-internet-project.overlay-container textarea').css("display","none"); //remove textarea in case user went back to this screen
        $('.healthy-internet-project.overlay-container .button.back').css("display","none");  //remove back button in case user went back to this screen
        $('.healthy-internet-project.overlay-container .card').css("display","block"); //change content from tip to card
        
        //TODO: fill in card with correct data

        $('.healthy-internet-project.overlay-container .tip-button').css("display","none"); //remove tip link
        $('.healthy-internet-project.overlay-container .button.secondary').css("display","block");  //add secondary button - disagree
        $('.healthy-internet-project.overlay-container .button.secondary').unbind("click");
        $('.healthy-internet-project.overlay-container .button.secondary').click(() => {changeScreen("FEEDBACK");verdict = false;});
        
        $('.healthy-internet-project.overlay-container .button#main').css("opacity","1");  //change secondary button to back button
        $(".healthy-internet-project.overlay-container .button#main").attr("data-i18n-message","review_agree_button");
        $(".healthy-internet-project.overlay-container .button#main").html( getString("review_agree_button"));
        $('.healthy-internet-project.overlay-container .button#main').unbind("click");
        $('.healthy-internet-project.overlay-container .button#main').click(() => {changeScreen("FEEDBACK");verdict = true;});
        
    }
    else if(state === "FEEDBACK")
    {
        $(".healthy-internet-project.overlay-container .title").attr("data-i18n-message","review_title_3");
        $(".healthy-internet-project.overlay-container .title").html( getString("review_title_3"));

        $('.healthy-internet-project.overlay-container .card').css("display","none"); //change content from card to textarea
        $('.healthy-internet-project.overlay-container textarea').css("display","block"); //change content from card to textarea

        // flag approved
        //if(verdict){
                //TODO: change placeholder text
                // Text: Any helpful tips or support for the original flagger?
        //}else{
                //TODO: change placeholder text
                // Text: Help the flagger understand why you denied the flag
        //}
        
        $('.healthy-internet-project.overlay-container .button.secondary').css("display","none");  //change secondary button to back button
        $('.healthy-internet-project.overlay-container .button.back').css("display","block");  //change secondary button to back button
        $('.healthy-internet-project.overlay-container .button.back').unbind("click");
        $('.healthy-internet-project.overlay-container .button.back').click(() => changeScreen("FLAG"));  //change secondary button to back button

        $('.healthy-internet-project.overlay-container .button#main').css("opacity",".6");  //change secondary button to back button
        $(".healthy-internet-project.overlay-container .button#main").attr("data-i18n-message","review_submit_button");
        $(".healthy-internet-project.overlay-container .button#main").html( getString("review_submit_button"));
        $('.healthy-internet-project.overlay-container .button#main').unbind("click");

    }else if(state ==="SUBMIT"){
        // TODO: capture and submit text

        // flag approved
        if(verdict){
            $(".healthy-internet-project.overlay-container .title").attr("data-i18n-message","review_title_approved");
            $(".healthy-internet-project.overlay-container .title").html( getString("review_title_approved"));
            $(".healthy-internet-project.overlay-container  #thank-you").attr("data-i18n-message","review_thanks_approved");
            $(".healthy-internet-project.overlay-container  #thank-you").html( getString("review_thanks_approved"));
        }else{
            $(".healthy-internet-project.overlay-container .title").attr("data-i18n-message","review_title_denied");
            $(".healthy-internet-project.overlay-container .title").html( getString("review_title_denied"));
            $(".healthy-internet-project.overlay-container  #thank-you").attr("data-i18n-message","review_thanks_denied");
            $(".healthy-internet-project.overlay-container  #thank-you").html( getString("review_thanks_denied"));
        }

        $('.healthy-internet-project.overlay-container .button.back').css("visibility","hidden");
        $('.healthy-internet-project.overlay-container textarea').css("display","none");
        $('.healthy-internet-project.overlay-container #thank-you').css("display","block");

        $(".healthy-internet-project.overlay-container .button#main").attr("data-i18n-message","review_done_button");
        $(".healthy-internet-project.overlay-container .button#main").html( getString("review_done_button"));
        $('.healthy-internet-project.overlay-container .button#main').unbind("click");
        $('.healthy-internet-project.overlay-container .button#main').click(() => closeOverlay());
    }
}

function activateButton()
{
    $('.healthy-internet-project.overlay-container .button#main').click(() => changeScreen("SUBMIT"));
    $('.healthy-internet-project.overlay-container .button#main').css("opacity","1");
}

function closeOverlay()
{
    $('.healthy-internet-project.overlay-container').css("display","none");
}

