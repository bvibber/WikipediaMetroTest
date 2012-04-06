// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    var app = WinJS.Application;

    app.onactivated = function (eventObject) {
        var detail = eventObject.detail;
        if (detail.kind === Windows.ApplicationModel.Activation.ActivationKind.launch) {
            if (detail.previousExecutionState !== Windows.ApplicationModel.Activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize C:\Users\brion\src\wiki\WikipediaMetroTest\WikipediaMetroTest\js\default.js
                // your application here.
            } else {
                // TODO: This application has been reactivated from suspension. 
                // Restore application state here.
            }
            WinJS.UI.processAll();
        } else if (detail.kind === Windows.ApplicationModel.Activation.ActivationKind.search) {
            doSearch(detail.queryText);
        }
    };

    app.oncheckpoint = function (eventObject) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the 
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // eventObject.setPromise(). 
    };

    // Obtain the Search Pane object and register for handling search while running as the main application
    var searchPane = Windows.ApplicationModel.Search.SearchPane.getForCurrentView();
    searchPane.addEventListener("querysubmitted", function (e) {
        console.log('querysubmitted', e);
        doSearch(e.queryText);
    });
    var request;
    // Register to Handle Suggestion Request
    searchPane.addEventListener("suggestionsrequested", function (e) {
        console.log('suggestionsrequested', e);
        var suggestionRequest = e.request,
            queryText = e.queryText;
        // Indicate that we'll obtain suggestions asynchronously:
        var deferral = suggestionRequest.getDeferral();

        // This refers to a local package file that contains a sample JSON response. You can update the Uri to a service that supports this standard in order to see suggestions come from a web service.  In order for the updated Uri to work it must also be included in the ApplicationContentUriRules in the manifest
        var suggestionUri = "https://en.wikipedia.org/w/api.php?action=opensearch&namespace=0&suggest=&search=";
        // If you are using a webservice,the query string should be encoded into the URI. See example below:
        suggestionUri += encodeURIComponent(queryText);

        // Cancel the previous suggestion request if it is not finished
        if (request && request.abort) {
            request.abort();
        }

        // Create request to obtain suggestions from service and supply them to the Search Pane
        request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status >= 200 && request.status < 300) {
                    if (request.responseText) {
                        var parsedResponse = JSON.parse(request.responseText);
                        if (parsedResponse && parsedResponse instanceof Array) {
                            var suggestions = parsedResponse[1];
                            if (suggestions) {
                                suggestionRequest.searchSuggestionCollection.appendQuerySuggestions(suggestions);
                                console.log("Suggestions provided for query: " + queryText);
                            } else {
                                console.log("No suggestions provided for query: " + queryText);
                            }
                        }
                    }
                } else {
                    console.log("Error retrieving suggestions for query: " + queryText);
                }
                deferral.complete(); // Indicate we're done supplying suggestions.
            }
        };
        request.open("GET", suggestionUri, true);
        request.send();
    });
    // Handle the selection of a Result Suggestion for Scenario 6
    searchPane.addEventListener("resultsuggestionchosen", function (e) {
        console.log('search', e);
        doSearch(e.queryText);
    });

    function doSearch(query) {
        var content = document.getElementById('content');
        content.textContent = query;
    }

    app.start();
})();
