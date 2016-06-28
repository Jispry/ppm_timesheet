'use strict';
	
var identityToken;
	
// list of all calendars
var calendars = {
	holidays: "sk.slovak#holiday@group.v.calendar.google.com",
}
	
// authenticate 
chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
	if (chrome.runtime.lastError) {
        callback(chrome.runtime.lastError);
        return;
    }
	identityToken = token;
});
	  
var eventsProvider = function(){
		  
	function CalendarEvent(name,startDate, endDate){
		this.name = name;
		this.startDate = startDate;
		this.endDate = endDate;
	};
		
	function StorageObject(period, events){
		// date 1st day of month
		this.period = period;
		this.data = events;
	};
		
	/*  move to somewhere else */
		
	function getFirstDayInMonth(date){
		return new Date(date.getFullYear(), date.getMonth(), 1);
	};
		
	function getLastDayInMonth(date){
		return new Date(date.getFullYear(), (date.getMonth() +1), 0);
	};
	
	function dateToString(date){
		//2016-07-06
		return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
	}
		
	/*  move to somewhere else  END */
		
	function readFromStorage(key, callback){
		chrome.storage.local.get(key, function(data){
			var result = undefined;
			if (data && data[key])
			{
				result = data[key];
			}
			callback(result);
		});
	};
		
	function writeToStorage(key, data, callback){
		var item = {};
		item[key] = data;
		chrome.storage.local.set(item, callback);
	};		
		
	function validateMonth(requestedDate, storageDate){
		return (requestedDate.getFullYear() == storageDate.getFullYear()
			&& requestedDate.getMonth() == storageDate.getMonth());
	};
		
	function requestGoogleCalendar(calendarId, requestDate, callback){
		var timeMin = getFirstDayInMonth(requestDate);
		var timeMax = getLastDayInMonth(requestDate);
			
		gapi.client.load("calendar", "v3").then(function(){
			var request = gapi.client.calendar.events.list({
				'calendarId': calendarId,
				'timeMax': timeMax.toISOString(),
				'timeMin': timeMin.toISOString(),
			});
			  
			request.then(function(data){
				if (data.result && data.result.items)
				{
				   // map the events 
					var events = data.result.items.map(function (event){
						return new CalendarEvent(event.summary, event.start.date, event.end.date);
					});
					callback(events);
				}
				else{
					throw Error("unexpected Response");
				}
			});
		});
	};
	
	function processCalendarResponse(calendarId, requestDate, data, callback){
		var period = dateToString(getFirstDayInMonth(requestDate));
		//save data to storage
		writeToStorage(calendarId, new StorageObject(period, data), function(){
			callback(data);
		});
	};
		
	function loadEvents(calendarId, requestDate, resultCallback){
		// check storage
		readFromStorage(calendarId, function validateStorage(data){
			// if there are data
			if (data){
				if (data.period && validateMonth(requestDate, new Date(data.period))){
					resultCallback(data.data);
				}
				else {
				// no period specified not valid
					chrome.storage.local.clear();
					requestGoogleCalendar(calendarId, requestDate, function (events){
						processCalendarResponse(calendarId, requestDate, events, resultCallback);
					});
				}
			}
			else {
				requestGoogleCalendar(calendarId, requestDate, function (events){
					processCalendarResponse(calendarId, requestDate, events, resultCallback);
				});
			}
		});		  
	};
		  
	return {
		loadEvents: loadEvents
	};
}();
	
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log(sender.tab ?
				"from a content script:" + sender.tab.url :
				"from the extension");
		gapi.auth.setToken({
			'access_token' : identityToken,
			'state': "https://www.googleapis.com/auth/calendar.readonly"
		});
		if (request.type == "getHolidays"){
			var requestDate = new Date(request.date);
			eventsProvider.loadEvents(calendars.holidays, requestDate, function(events)
			{
				sendResponse({events: events});
			});
		}
		else{
			sendResponse({error: "wrong message"});
		}
		return true;
	}
);
	  
	  
	  
	  
	  
	  
	  