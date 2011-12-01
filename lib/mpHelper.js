/**
 * A helper library designed to enable attaching of mixpanel click tracking event
 * to DOM elements without having to write additional javascript. Requires jQuery
 * (or an equivalent library that supports finding elements by attribute).
 * 
 * @copyright Copyright (c) 2012 Andrew Jdhults
 * @link https://github.com/andrewjshults/Mixpanel-Helper
 * @license http://www.opensource.org/licenses/mit-license.php The MIT License
 * 
 * @author Andrew J Shults
 * 
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 */

//Mixpanel queue variable, has to be in the global space and declared before the 
//mixpanel library is intialized
var mpq = [];

var mpTracker = (function($, domElem){
	var mpTracker = {};

	mpTracker.version = '0.2';
	mpTracker.separator = '|';
	
	mpTracker.enableTracking = true;
	mpTracker.enableDebug = false;
	
	/**
	 * Used to turn tracking on and off. If tracking is turned off before init,
	 * then the mixpanel javascript library will not even be included. Useful to
	 * programatically disable tracking for groups of users (i.e. yourself) as to
	 * not pollute your mixpanel data
	 * 
	 * @param tracking boolean
	 * 
	 * @return mpTracker
	 */
	mpTracker.setTracking = function(tracking) {
		mpTracker.enableTracking = tracking;
		
		return mpTracker;
	};
	
	/**
	 * Used to debug calls to the mixpanel API. Logs any parameters that will be
	 * passed to the over to the mixpanel javascript library.
	 * 
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
	 * Initalized the mixpanel javascript library in an async manner
	 *
     * @param apiKey string
	 * 
	 * @return mpTracker
     */
	mpTracker.init = function(apiKey) {
		//If the Mixpanel library is already initialized, don't do anything else
		if(typeof MixpanelLib === 'function' || mpTracker.enableTracking === false) {
			return mpTracker;
		}
		
		if(typeof apiKey !== 'string') {
			throw 'Exception: Must provide a mixpanel API key to initialize the library';
		}

		//Start mixpanel javascript include library - Not covered by MIT license
		//Code from http://mixpanel.com/docs/integration-libraries/javascript#js
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
		//End include mixpanel javascript library

		return mpTracker;
	};

	/**
	 * Search the DOM element's children for elements that have the attribute.
	 * The track event is attached in different ways depending on the element
	 * and if there are click handlers attached to it. See the inline comments
	 * for a full explination of how the different attachment methods work.
	 *
     * @param attrName *optional* string (default: data-track) Attribute to 
	 *									 search for
     * @param eventVar *optional* string (default: mpEvent) If using JSON, this 
	 *									 is the object variable that will be 
	 *									 passed to mixpanel as the event name
	 * @param dom *optional* jQuery compatible selector (default: document) 
	 *									 DOM element to search the children of
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
			dom = domElem;
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

			//If the attrData is JSON, parse it
			if(attrData.indexOf('{') === 0) {
				//Wrap this in case the JSON is malformed, on error stop
				try {
					trackObj = $.parseJSON(attrData);
				} catch (err) {
					throw 'Exception: JSON invalid + (' + attrData + ')';
				}

				trackEvent = trackObj[eventVar];
			}
			//If the string has the separator in it, use the second part as the 
			//prop property
			else if(attrData.indexOf(mpTracker.separator) !== -1) {
				var parts = attrData.split(mpTracker.separator, 2);
				var props = parts[1].split('=', 2);
				trackEvent = parts[0];
				trackObj[props[0]] = props[1];
			}
			//Otherwise use it as the Mixpanel event
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

				//Since the mixpanel event is fired async, we need to capture
				//location changes, prevent them, fire the mixpanel event and 
				//use the mixpanel callback to execute the location change
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
			else if(typeof $(this).data('events') === 'object' && 
					$(this).data('events').click.length > 0) {
					
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
				
				//Bind a new click event, call the mixpanel track event and then
				//call all the other handlers in the order they were added
				$(this).bind('click', function(e) {
					mpTracker.track(trackEvent, trackObj, function() {
						for(var j = 0; j < callbacks.length; j++) {
							callbacks[j](e);
						}
					});
				});
			}
			//If it's just a standard DOM element, just bind tracking to click
			else {
				$(this).bind('click', function(e) {
					mpTracker.track(trackEvent, trackObj);
				});
			}
		});

		return mpTracker;
	};
	
	//These are all chainable wrapped versions of mixpanel's javascript API
	//See http://mixpanel.com/docs/integration-libraries/javascript#jsapi for 
	//their full documentation

	/**
	 * http://mixpanel.com/docs/integration-libraries/javascript#track
	 *
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
	 * http://mixpanel.com/docs/integration-libraries/javascript#register
	 *
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
	 * http://mixpanel.com/docs/integration-libraries/javascript#register_once
	 *
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
	 * http://mixpanel.com/docs/integration-libraries/javascript#identify
	 *
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

	/**
	 * http://mixpanel.com/docs/integration-libraries/javascript#name_tag
	 *
	 * @param mpName string
	 * 
	 * @return mpTracker
	 */
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
	 * http://mixpanel.com/docs/integration-libraries/javascript#set_config
	 *
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

	//Return the mpTracker so we can assign it to a global variable (default: mpTracker)
	return mpTracker;
}).call(this, jQuery, document);//Change these if you aren't using jQuery, or
								//want the default DOM element to be something
								//other than the document