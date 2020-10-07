var verdict;

jQuery(document).ready(function ($) {
    // $.get(chrome.runtime.getURL('/html/mentor-review.html'), function(data) {
    //     $(data).appendTo('body');
    // });	

    //TODO: activate blur
    $('.content-warning button#begin_review').click(() => startReview());
    $('.content-warning #uncomfortable-link').click(() => uncomfortable());
    $(".submit_feedback").click(function () {
        window.close();

    });

    // TIP -> SEE FLAG -> PROVIDE FEEDBACK -> THANK YOU
    $('.overlay-container button#main').click(() => changeScreen("FLAG"));
    $('#feedback').on('input', () => activateButton());

});

function startReview(){
    $('.overlay-container').css("display","flex"); 
    $('.content-warning').css("display","none"); 
    //TODO: remove blur
}

function uncomfortable(){
    $(".first").css({'display':'none'})
    $(".no-review").css({'display': 'flex'})
}

function changeScreen(state){
    if(state === "FLAG"){
        $(".overlay-container .title").attr("data-i18n-message","review_title_2");
        $(".overlay-container .title").html( getString("review_title_2"));

        $('.overlay-container .subtitle').css("display","none"); //remove subtitle

        $('.overlay-container #tip').css("display","none"); //change content from tip to card
        $('.overlay-container textarea').css("display","none"); //remove textarea in case user went back to this screen
        $('.overlay-container .button.back').css("display","none");  //remove back button in case user went back to this screen
        $('.overlay-container .card').css("display","block"); //change content from tip to card
        
        //TODO: fill in card with correct data

        $('.overlay-container .tip-button').css("display","none"); //remove tip link
        $('.overlay-container .button.secondary').css("display","block");  //add secondary button - disagree
        $('.overlay-container .button.secondary').unbind("click");
        $('.overlay-container .button.secondary').click(() => {changeScreen("FEEDBACK");verdict = false;});
        
        $('.overlay-container .button#main').css("opacity","1");  //change secondary button to back button
        $(".overlay-container .button#main").attr("data-i18n-message","review_agree_button");
        $(".overlay-container .button#main").html( getString("review_agree_button"));
        $('.overlay-container .button#main').unbind("click");
        $('.overlay-container .button#main').click(() => {changeScreen("FEEDBACK");verdict = true;});
        
    }
    else if(state === "FEEDBACK"){
        $(".overlay-container .title").attr("data-i18n-message","review_title_3");
        $(".overlay-container .title").html( getString("review_title_3"));

        $('.overlay-container .card').css("display","none"); //change content from card to textarea
        $('.overlay-container textarea').css("display","block"); //change content from card to textarea

        // flag approved
        //if(verdict){
                //TODO: change placeholder text
                // Text: Any helpful tips or support for the original flagger?
        //}else{
                //TODO: change placeholder text
                // Text: Help the flagger understand why you denied the flag
        //}
        
        $('.overlay-container .button.secondary').css("display","none");  //change secondary button to back button
        $('.overlay-container .button.back').css("display","block");  //change secondary button to back button
        $('.overlay-container .button.back').unbind("click");
        $('.overlay-container .button.back').click(() => changeScreen("FLAG"));  //change secondary button to back button

        $('.overlay-container .button#main').css("opacity",".6");  //change secondary button to back button
        $(".overlay-container .button#main").attr("data-i18n-message","review_submit_button");
        $(".overlay-container .button#main").html( getString("review_submit_button"));
        $('.overlay-container .button#main').unbind("click");

    }else if(state ==="SUBMIT"){
        // TODO: capture and submit text

        // flag approved
        if(verdict){
            $(".overlay-container .title").attr("data-i18n-message","review_title_approved");
            $(".overlay-container .title").html( getString("review_title_approved"));
            $(".overlay-container  #thank-you").attr("data-i18n-message","review_thanks_approved");
            $(".overlay-container  #thank-you").html( getString("review_thanks_approved"));
        }else{
            $(".overlay-container .title").attr("data-i18n-message","review_title_denied");
            $(".overlay-container .title").html( getString("review_title_denied"));
            $(".overlay-container  #thank-you").attr("data-i18n-message","review_thanks_denied");
            $(".overlay-container  #thank-you").html( getString("review_thanks_denied"));
        }

        $('.overlay-container .button.back').css("visibility","hidden");
        $('.overlay-container textarea').css("display","none");
        $('.overlay-container #thank-you').css("display","block");

        $(".overlay-container .button#main").attr("data-i18n-message","review_done_button");
        $(".overlay-container .button#main").html( getString("review_done_button"));
        $('.overlay-container .button#main').unbind("click");
        $('.overlay-container .button#main').click(() => closeOverlay());
    }
}

function activateButton(){
    $('.overlay-container .button#main').click(() => changeScreen("SUBMIT"));
    $('.overlay-container .button#main').css("opacity","1");
}

function closeOverlay(){
    $('.overlay-container').css("display","none");
}

