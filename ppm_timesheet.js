(function() {
	"use strict;"

	console.log("PPM_Timesheet Extention");
	
	/**
	 * utils module
	 */
	var utils = function(){
		
		// enum of all availible information from timesheet table header
		var headerSections = {
			timePeriod: "Time Period:",
			status: "Status:",
		};
		
		// list of posible statuses
		var statuses = {
			Closed: "Closed",
			Unsubmitted: "Unsubmitted",
			PendingApproval: "Pending Approval",
		};
		
		/**
		 * Gets requested header value
		 * @param {enum} name of headerSection
		 * @return {string} header information
		 */
		function getHeaderInformation(section){
			return $("td.field-prompt").filter(function() {
					return $.text([this]).trim() == section;
			}).next().text().trim();
		};
		
		/**
		 * @return {string} status value
		 */
		function getStatus(){
			var currentStatus = getHeaderInformation(headerSections.status);
			return currentStatus;
		};
		
		/**
		 * Returns TimePeriod Array 
		 * 0 - start
		 * 1- end
		 * @return {Array} time period array
		 */
		function getTimePeriod(){
				var foundPeriodString = getHeaderInformation(headerSections.timePeriod);
				if (foundPeriodString){
					periodDates = foundPeriodString.trim().split("to");
					return periodDates.map(function (item){
						return getDateFromString(item);
					});
				}
				else{
					throw Error("TimePeriod not found!")
				}
		};
		
		function getTwoDigitDateSubString(substring){
			var trimmed = substring.trim();
			switch(trimmed.length){
				case 1:
					return "0" + trimmed;
				case 2:
					return trimmed;
				default:
					throw Error("Error getTwoDigitDateSubString");
			}
		}
		
		function getDateFromString(dateString){
			// if slovak localization
			if (navigator.language === "sk")
			{
				var splitedString = dateString.split(".");
				//return new Date(splitedString[2], splitedString[1]-1, splitedString[0], 1);
				var year = splitedString[2].trim();
				var month = getTwoDigitDateSubString(splitedString[1]);
				var day = getTwoDigitDateSubString(splitedString[0]);
				var stringFormated = year + "-" + month + "-" + day;
				// need to create date from ISO format to have matching moments in time
				// http://codeofmatt.com/2013/06/07/javascript-date-type-is-horribly-broken/
				return new Date(stringFormated);
			}
			if (navigator.language === "en-US")
			{
				var splitedString = dateString.split(".");
				var year = splitedString[2].trim();
				var month = getTwoDigitDateSubString(splitedString[1]);
				var day = getTwoDigitDateSubString(splitedString[0]);
				var stringFormated = year + "-" + month + "-" + day;
				// need to create date from ISO format to have matching moments in time
				// http://codeofmatt.com/2013/06/07/javascript-date-type-is-horribly-broken/
				return new Date(stringFormated);
			}
				
			throw Error("Unsupported localization {" + navigator.language + "}");
		};
		
		function dateToString(date){
			//2016-07-06
			return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate();
		};
		
		return {
			getTimePeriod: getTimePeriod,
			getStatus: getStatus,
			statuses: statuses,
			getDateFromString: getDateFromString,
			dateToString: dateToString,
		}
	}();
	
	var highlighter = function(){
		
		var cssClasses = {
			weekend: "ppm-weekend",
			holiday: "ppm-holiday",
		}
		
		function isWeekend(date){
			var day = date.getDay();
			// 0 sunday, 6 sathurday
			if (day == 0 || day == 6){
				return true;
			}
			return false;
		}
	
		function getHolidays(date){
			var deferred = $.Deferred();
				
			chrome.runtime.sendMessage({type: "getHolidays", date: utils.dateToString(date)}, function(response) {
				if (response && response.events)
				{
					var events = response.events.map(function eventMapper(calEvent){
						if (calEvent && calEvent.startDate)
						{
							return new Date(calEvent.startDate);
						}
					});
						
					deferred.resolve(events);
				}
				else{
					deferred.reject("invalid response for Holidays");
				}
			});
				
			return deferred.promise();
		};
		
		function isDateInArray(date, dateArray){
			return dateArray.some(function dateComparer(item){
				return date.getTime() === item.getTime();
			});
		}
		
		function highlightDates(){
			console.log("highlightDates");
			var timeSheetPeriod = utils.getTimePeriod();
			var start = timeSheetPeriod[0];
			var end = timeSheetPeriod[1];
			
			$.when(getHolidays(start)).then(function(holidays){
				$("#wiTable_middleDataDiv .tab-list-data-R input[type=hidden]").each(function iterrator(){
					var dateString = $(this).val();
					if (dateString) {
						var date = utils.getDateFromString(dateString);
						if (date && isWeekend(date)){				
							$(this).closest("td").addClass(cssClasses.weekend);
						}
						else if (isDateInArray(date, holidays)){
							$(this).closest("td").addClass(cssClasses.holiday);
						}
					}
					else{
						console.log("noDateStringError");
						throw Error("noDateString");
					}
				});		
			})
			.fail(function(error){
				console.log(error);
				console.log("Failed to load Holidays");
				$("#wiTable_middleDataDiv .tab-list-data-R input[type=hidden]").each(function iterrator(){
					var dateString = $(this).val();
					if (dateString) {
						var date = utils.getDateFromString(dateString);
						if (date && isWeekend(date)){				
							$(this).closest("td").addClass(cssClasses.weekend);
						}
					}
					else{
						console.log("noDateStringError");
						throw Error("noDateString");
					}
				});
			});
		};
	
		return {	
			highlightDates: highlightDates
		}
	}();
	
	if (utils.getStatus() == utils.statuses.Unsubmitted)
	{
		highlighter.highlightDates();
	}
	else {
		console.log("No highlinghting");
	}
})();