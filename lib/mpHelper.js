$(document).ready(function(){
    $(document).find('*[data-track]').each(function(){
        try {
            var trackObj = $.parseJSON($(this).attr('data-track')),
                trackEvent = trackObj.tEvent;
        
            //If the trackEvent wasn't defined, we can't continue
            if(typeof trackEvent === 'undefined') {
                return;
            }

            delete trackObj.tEvent;
        } catch (err) {
            return;
        }

        //If this is an anchor tag with a href, intercept the redirect
        if(this.tagName.toString().toLowerCase() === 'a' && $(this).attr('href') !== '#') {
            $(this).bind('click', function(e) {
                e.preventDefault();
                var href = $(this).attr('href');
                mpq.track(trackEvent, trackObj, function() {
                    window.location.href = href;
                });
            });
        }
        //If this track element is inside a form, check for a submit event
        //on the form and bind to that when this elem is clicked
        else if($(this).closest('form').length > 0) {
            $(this).bind('click', function () {
                var tEvent = trackEvent,
                    tObj = trackObj;
                $(this).closest('form').bind('submit', function (e) {
                    e.preventDefault();
                
                    var $this = $(this);
                    mpq.track(tEvent, tObj, function () {
                        $this.submit();
                    });
                });
            });
        } else {
            $(this).bind('click', function(e) {
                mpq.track(trackEvent, trackObj);
            });
        }
    });
});
