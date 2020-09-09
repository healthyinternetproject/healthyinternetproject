
jQuery(document).ready(function ($) {
    // $.get(chrome.runtime.getURL('/html/mentor-review.html'), function(data) {
    //     $(data).appendTo('body');
    // });	

    // var state = "tip";

    // TIP -> SEE FLAG -> PROVIDE FEEDBACK -> THANK YOU
    $('.overlay-container button#main').click(() => changeScreen("FLAG"));

});

function changeScreen(state, verdict){
    if(state === "FLAG"){
        $(".overlay-container .title").attr("data-i18n-message","review_flag");
        $(".overlay-container .title").html( getString("review_flag"));

        $('.overlay-container .subtitle').css("display","none"); //remove subtitle

        $('.overlay-container #tip').css("display","none"); //change content from tip to card
        $('.overlay-container textarea').css("display","none"); //remove textarea in case user went back to this screen
        $('.overlay-container .button.back').css("display","none");  //remove back button in case user went back to this screen
        $('.overlay-container .card').css("display","block"); //change content from tip to card
        //TODO: fill in card with correct data

        $('.overlay-container .tip-button').css("display","none"); //remove tip link
        $('.overlay-container .button.secondary').css("display","block");  //add secondary button - disagree
        $('.overlay-container .button.secondary').click(() => changeScreen("FEEDBACK", false));

        //TODO: change primary button text - agree
        $('.overlay-container .button#main').click(() => changeScreen("FEEDBACK", true));

    }
    else if(state === "FEEDBACK"){
        $(".overlay-container .title").attr("data-i18n-message","review_feedback");
        $(".overlay-container .title").html( getString("review_feedback"));

        $('.overlay-container .card').css("display","none"); //change content from card to textarea
        $('.overlay-container textarea').css("display","block"); //change content from card to textarea

        // flag approved
        if(verdict){
                //TODO: change placeholder text
                // Any helpful tips or support for the original flagger?
        }else{
                //TODO: change placeholder text
                // Help the flagger understand why you denied the flag
        }
        
        $('.overlay-container .button.secondary').css("display","none");  //change secondary button to back button
        $('.overlay-container .button.back').css("display","block");  //change secondary button to back button
        $('.overlay-container .button.back').click(() => changeScreen("FLAG"));  //change secondary button to back button

        //change text of primary button -> Submit
        $('.overlay-container .button#main').click(() => changeScreen("SUBMIT"));


    }else if(state ==="SUBMIT"){
        // capture and submit text

        //change title
        $(".overlay-container .title").attr("data-i18n-message","review_thank_you");
        $(".overlay-container .title").html( getString("review_thank_you"));
        
        $('.overlay-container .button.back').css("display","none");
        $('.overlay-container textarea').css("display","none");
        $('.overlay-container #thank-you').css("display","block");

        //TODO: change text of primary button -> done
        //TODO: add event listener for done button
    }

}

