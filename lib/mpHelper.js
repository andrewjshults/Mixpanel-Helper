//Mixpanel queue var
var mpq = [];

var mpTracker = (function($){
    var mpTracker = {};

    mpTracker.version = '0.1';
	
	mpTracker.enableTracking = true;
	
	/**
	 * @param tracking boolean
	 * 
	 * @return mpTracker
	 */
	mpTracker.setTracking = function(tracking) {
		mpTracker.enableTracking = tracking;
		
		return mpTracker;
	};

    /**
     * @param apiKey string
	 * 
	 * @return mpTracker
     */
    mpTracker.init = function(apiKey) {
        //If the Mixpanel library is already initialized, don't do anything else
        if(typeof MixpanelLib === 'function' || mpTracker.enableTracking === false) {
            return mpTracker;
        }

        mpq.push(["init", apiKey]);
        (function(){
            var b,a,e,d,c;
            b = document.createElement("script");
            b.type = "text/javascript";
            b.async = true;
            b.src = (document.location.protocol === "https:" ? "https:" : "http:") + "//api.mixpanel.com/site_media/js/api/mixpanel.js";
            a = document.getElementsByTagName("script")[0];
            a.parentNode.insertBefore(b,a);
            e = function(f) {
                return function(){
                    mpq.push([f].concat(Array.prototype.slice.call(arguments,0)));
                }
            };
            d = ["init","track","track_links","track_forms","register","register_once","identify","name_tag","set_config"];
            for(c=0;c<d.length;c++) {
                mpq[d[c]] = e(d[c]);
            }
        })();

        return mpTracker;
    };

    /**
     * @param attrName *optional* string
     * @param eventVar *optional* string
	 * @param dom *optional* DOM element
	 * 
	 * @return mpTracker
     */
    mpTracker.bind = function(attrName, eventVar, dom) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
        if(typeof attrName === 'undefined') {
            attrName = 'data-track';
        }
        if(typeof eventVar === 'undefined') {
            eventVar = 'mpEvent';
        }
		if(typeof dom === 'undefined') {
			dom = document;
		}

        $(dom).find('*[' + attrName + ']').each(function(){
            var attrData = $(this).attr(attrName),
                trackEvent,
                trackObj = {};

            //Remove the attr so that if bind is called again, it doesn't rebind
            $(this).removeAttr(attrName);

            //Make sure the attrData is actually a string
            if(typeof attrData !== 'string') {
                throw 'Exception: attrData was not a string.';
            }

            //If the attrData is JSON, parse it, otherwise use it as the Mixpanel event
            if(attrData.indexOf('{') === 0) {
                //Wrap this in case the JSON is malformed, on error stop
                try {
                    trackObj = $.parseJSON(attrData);
                } catch (err) {
                    throw 'Exception: JSON invalid + (' + attrData + ')';
                }

                trackEvent = trackObj[eventVar];
            }
            else {
                trackEvent = attrData;
            }

            //If the trackEvent wasn't defined, we can't continue
            if(trackEvent === null || typeof trackEvent === 'undefined') {
                throw 'Exception: track event was not defined.';
            }

            //Remove the eventVar from the object so it doesn't get sent twice
            delete trackObj[eventVar];

            //If this is an anchor tag with a href, intercept the redirect
            if(this.tagName.toString().toLowerCase() === 'a' && $(this).attr('href') !== '#') {
                $(this).bind('click', function(e) {
                    e.preventDefault();
                    var href = $(this).attr('href');
                    mpTracker.track(trackEvent, trackObj, function() {
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
                        mpTracker.track(tEvent, tObj, function () {
                            $this.submit();
                        });
                    });
                });
            }
            else {
                $(this).bind('click', function(e) {
                    mpTracker.track(trackEvent, trackObj);
                });
            }
        });

        return mpTracker;
    };

    /**
     * @param mpEvent string
     * @param mpProperties object
     * @param mpCallback function
     *
     * @return mpTracker
     */
    mpTracker.track = function(mpEvent, mpProperties, mpCallback) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpEvent !== 'string') {
          throw 'Exception: Must provide an event name';
      }
      if(mpCallback !== null || typeof mpCallback !== 'function' || typeof mpCallback !== 'undefined') {
          throw 'Exception: Callback must either be undefined or a function';
      }

      mpq.track(mpEvent, mpProperties, mpCallback);

      return mpTracker;  
    };

    /**
     * @param mpProperties object
     * @param mpType string
     * @param mpDays integer
     *
     * @return mpTracker
     */
    mpTracker.register = function(mpProperties, mpType, mpDays) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpProperties !== 'object') {
          throw 'Exception: Must provide properties to register';
      }

      mpq.register(mpProperties, mpType, mpDays);

      return mpTracker;  
    };

    /**
     * @param mpProperties object
     * @param mpType string
     * @param mpDays integer
     *
     * @return mpTracker
     */
    mpTracker.register_once = function(mpProperties, mpType, mpDays) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpProperties !== 'object') {
          throw 'Exception: Must provide properties to register';
      }

      mpq.register_once(mpProperties, mpType, mpDays);

      return mpTracker;  
    };

    /**
     * @param mpUniqueIdentifier string
     *
     * @return mpTracker
     */
    mpTracker.identify = function(mpUniqueIdentifier) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpUniqueIdentifier !== 'string') {
          return mpTracker;
      }
	  
	  mpq.identify(mpUniqueIdentifier);

      return mpTracker;  
    };

    mpTracker.name_tag = function(mpName) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpName !== 'string') {
          throw 'Exception: Must provide a name';
      }

      mpq.name_tag(mpName);

      return mpTracker;  
    };

    /**
     * @param mpConfig object
     *
     * @return mpTracker
     */
    mpTracker.set_config = function(mpConfig) {
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
        if(typeof mpConfig !== 'object') {
            throw 'Exception: Must provide a config';
        }

        mpq.set_config(mpConfig);
      
        return mpTracker;  
    };

    return mpTracker;
}).call(this, jQuery);