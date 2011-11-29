//Mixpanel queue var
var mpq = [];

var mpTracker = (function($){
    var mpTracker = {};

    mpTracker.version = '0.1';
	
	mpTracker.enableTracking = true;
	mpTracker.enableDebug = false;
	
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
	 * @param message mixed
	 * @param object *optional* object
	 */
	mpTracker.debug = function(message, object) {
		if(mpTracker.enableDebug !== true || typeof console.log !== 'function') {
			return;
		}
		
		if(typeof object === 'object') {
			console.log('[mpHelper - DEBUG] ' + message);
			console.log(object);
		}
		else if(typeof message !== 'string') {
			console.log('[mpHelper - DEBUG]');
			console.log(message);
		}
		else {
			console.log('[mpHelper - DEBUG] ' + message);
		}
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
	 * @param dom *optional* DOM element to start the search from
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
		
		var separator = '|';

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
			//If the string has the separator in it, use the second part as the type property
            else if(attrData.indexOf(separator) !== -1) {
				var parts = attrData.split(separator, 2);
				trackEvent = parts[0];
				trackObj = {prop: parts[1]};
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
            if(	this.tagName.toString().toLowerCase() === 'a' && 
				$(this).attr('href') !== '' &&
				$(this).attr('href') !== '#' &&
				$(this).attr('href').indexOf('javascript:') !== 0) {

                $(this).bind('click', function(e) {
                    e.preventDefault();
                    var href = $(this).attr('href');
                    mpTracker.track(trackEvent, trackObj, function() {
                        window.location.href = href;
                    });
                });
            }
			//If there are other events bound to click, we need to run them after
			//the mixpanel callback is executed
			else if(typeof $(this).data('events') === 'object' && $(this).data('events').click.length > 0) {
				//Make a copy of all the click events bound to this element
				var callbacks = [],
					clickEvents = $(this).data('events').click;
				for(var i = 0; i < clickEvents.length; i++) {
					if(typeof clickEvents[i].handler !== 'function') {
						continue;
					}
					
					callbacks.push(clickEvents[i].handler);
				}
				
				//Unbind all existing click events on this element
				$(this).unbind('click');
				
				//Bind a new click event. First call the mixpanel track event and
				//then call all the other handlers in the order they were added
				$(this).bind('click', function(e) {
					mpTracker.track(trackEvent, trackObj, function() {
						for(var j = 0; j < callbacks.length; j++) {
							callbacks[j](e);
						}
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
		mpTracker.debug('track: ' +mpEvent, mpProperties);
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpEvent !== 'string') {
          throw 'Exception: Must provide an event name';
      }
      if(mpCallback !== null && typeof mpCallback !== 'function' && typeof mpCallback !== 'undefined') {
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
		mpTracker.debug('register: type: "' + mpType + '" days: "' + mpDays + '" properties:', mpProperties);
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
		mpTracker.debug('register_once: type: "' + mpType + '" days: "' + mpDays + '" properties:', mpProperties);
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
		mpTracker.debug('identify: ' + mpUniqueIdentifier);
		
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
		mpTracker.debug('name_tag: ' + mpName);
		if(mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
      if(typeof mpName !== 'string') {
          return mpTracker;
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
		mpTracker.debug('set_config:', mpConfig);
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