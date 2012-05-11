// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    var app = WinJS.Application;

    // Set up data bindings for the search results list - empty initial
    WinJS.Namespace.define("SearchResults", {
        itemList: new WinJS.Binding.List([])
    });
    WinJS.Namespace.define("HubContents", {
        itemList: new WinJS.Binding.List([])
    });

    (function () {
        // Create the groups for the ListView from the item data and the grouping functions
        HubContents.groupedList = HubContents.itemList.createGrouped(getGroupKey, getGroupData, compareGroups);

        // Function used to sort the groups
        // Note: This is similar to default sorting behavior 
        //   when using WinJS.Binding.List.createGrouped()
        function compareGroups(left, right) {
            return left.charCodeAt(0) - right.charCodeAt(0);
        }

        // Function which returns the group key that an item belongs to
        function getGroupKey(dataItem) {
            return dataItem.group.toUpperCase().charAt(0);
        }

        // Function which returns the data for a group
        function getGroupData(dataItem) {
            return {
                title: dataItem.group
            };
        }
    })();

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
            WinJS.UI.processAll().then(function () {
                initHub();
                // Handler for links!
                $(document).on('click', 'a', function (event) {
                    var url = $(this).attr('href'),
                        refMatches = url.match(/^#cite_note/),
                        hashMatches = url.match(/^#/),
                        wikiMatches = url.match(/\/wiki\/(.*)/);
                    console.log(url);
                    if (refMatches) {
                        //
                        console.log(url);
                        var $ref = $(url).clone();
                        showLightbox($ref, 'small');
                        event.preventDefault();
                    } else if (hashMatches) {
                        // no-op
                        $('.lightbox-bg, .lightbox-fg').remove();
                    } else if (wikiMatches) {
                        $('.lightbox-bg, .lightbox-fg').remove();
                        var title = decodeURIComponent(wikiMatches[1]);
                        doLoadPage(title);
                        event.preventDefault();
                    } else {
                        if (url.match(/^\/\//)) {
                            // fixup for protocol-relative links
                            url = 'https:' + url;
                        }
                        var uri = new Windows.Foundation.Uri(url);
                        Windows.System.Launcher.launchUriAsync(uri);
                        event.preventDefault();
                    }
                });
                $('#back').click(function () {
                    clearSearch();
                    $('#reader').hide();
                    $('#hub').show();
                    $('#back').hide();
                });
                $('#resultlist').bind('iteminvoked', function (event) {
                    var index = event.originalEvent.detail.itemIndex;
                    var selected = SearchResults.itemList.getItem(index);
                    console.log(selected);
                    if (!selected.data.title) {
                        throw new Error("bad title");
                    }
                    doLoadPage(selected.data.title);
                });
                $('#hub-list').bind('iteminvoked', function (event) {
                    var index = event.originalEvent.detail.itemIndex;
                    var selected = HubContents.groupedList.getItem(index);
                    if (!selected.data.title) {
                        throw new Error("bad title");
                    }
                    doLoadPage(selected.data.title);
                });
                $(window).bind('resize', function () {
                    //sizeContent();
                });
                $(window).resize();
            });
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
        $.ajax({
            url: suggestionUri,
            success: function(data, textstatus, request) {
                if (data && data instanceof Array) {
                    var suggestions = data[1];
                    if (suggestions) {
                        suggestionRequest.searchSuggestionCollection.appendQuerySuggestions(suggestions);
                        console.log("Suggestions provided for query: " + queryText);
                    } else {
                        console.log("No suggestions provided for query: " + queryText);
                    }
                }
                deferral.complete(); // Indicate we're done supplying suggestions.
            }
        });
    });
    // Handle the selection of a Result Suggestion for Scenario 6
    searchPane.addEventListener("resultsuggestionchosen", function (e) {
        console.log('search', e);
        doLoadPage(e.queryText);
    });

    function stripHtmlTags(html) {
        if (typeof html !== 'string') {
            throw new Error('must be string');
        }
        return html.replace(/<[^>]+>/g, ''); // fixme put in real html parser
    }

    function doSearch(query) {
        $('#hub').hide();
        $('#back').show();
        $('#reader').hide();
        $('#search-results').show();
        $('#title').text(query);
        var url = 'https://en.wikipedia.org/w/api.php';
        $.ajax({
            url: url,
            data: {
                action: 'query',
                list: 'search',
                srwhat: 'text',
                srsearch: query,
                srlimit: 21,
                format: 'json'
            },
            success: function (data) {
                // data.query.search
                // [
                //   {ns, size, snippet, timestamp, title, wordcount
                // ]
                // data.query.searchinfo
                //   totalhits
                if (data.error) {
                    // ..
                    $("#content").text('Search error');
                } else {
                    // Replace the current list
                    var list = SearchResults.itemList;
                    list.splice(0, list.length);

                    data.query.search.forEach(function (item, i) {
                        list.push({
                            title: item.title,
                            snippet: stripHtmlTags(item.snippet)
                        });
                    });
                }
            }
        });
    }

    function clearSearch() {
        // Clear the results list
        var list = SearchResults.itemList;
        list.splice(0, list.length);
        $('#search-results').hide();
        $('#title').text('Wikipedia');
    }

    function doLoadPage(title) {
        $('#hub').hide();
        $('#back').show();
        clearSearch();
        $('#content').empty();
        $('#title').text(title.replace(/_/g, ' '));
        $('#reader').show();
        sizeContent();

        $.ajax({
            url: 'https://en.wikipedia.org/w/api.php',
            data: {
                action: 'mobileview',
                page: title,
                sections: 'all',
                format: 'json'
            },
            success: function (data) {
                if (data.error) {
                    $('#title').text('error');
                    return;
                }
                /*
                mobileview
                    .normlizedtitle
                    sections [
                        {
                            id
                            text
                        }
                        {
                            toclevel
                            line
                            id
                        }
                    ]

                */
                $('#content').empty();
                data.mobileview.sections.forEach(function (section) {
                    if (!section.text) {
                        return;
                    }
                    insertWikiHtml('#content', section.text);
                });
                $('#content').append('<div class="column-spacer"></div>');
            }
        });
    }

    // Outgoing sharing
    var dataTransferManager = Windows.ApplicationModel.DataTransfer.DataTransferManager.getForCurrentView();
    dataTransferManager.addEventListener("datarequested", function (e) {
        var request = e.request;
        var title = document.getElementById('title').textContent;
        var uri = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(title);
        request.data.setUri(new Windows.Foundation.Uri(uri));
        request.data.properties.title = title + ' - Wikipedia';
        request.data.properties.description = 'Link to Wikipedia article';
    });


    // Live tile stuff
    function updateLiveTile(title, content) {
        var Notifications = Windows.UI.Notifications;
        var tileXml = Notifications.TileUpdateManager.getTemplateContent(Notifications.TileTemplateType.tileWideText09);
        var tileAttributes = tileXml.getElementsByTagName("text");
        tileAttributes[0].appendChild(tileXml.createTextNode(title));
        tileAttributes[1].appendChild(tileXml.createTextNode(content));
        var tileNotification = new Notifications.TileNotification(tileXml);
        var currentTime = new Date();
        tileNotification.expirationTime = new Date(currentTime.getTime() + 600 * 1000);
        Notifications.TileUpdateManager.createTileUpdaterForApplication().update(tileNotification);
    }
    function fetchFeed(feed, callback) {
        $.ajax({
            url: "https://en.wikipedia.org/w/api.php",
            data: {
                action: 'featuredfeed',
                feed: feed,
                feedformat: 'atom'
            },
            success: function (data, textstatus, request) {
                var summaries = request.responseXML.getElementsByTagName('summary');
                var htmlList = [];
                for (var i = summaries.length - 1; i >= 0; i--) {
                    var summary = summaries[i];
                    htmlList.push(summary.textContent);
                }
                callback(htmlList);
            }
        });
    }

    function insertWikiHtml(target, html) {
        // hack for protocol-relative images (unsafe)
        if (typeof html !== "string") {
            throw new Error('we got a non-string');
        }
        html = html.replace(/"\/\/upload\.wikimedia\.org/g, '"https://upload.wikimedia.org');
        var $div = $('<div>');
        MSApp.execUnsafeLocalFunction(function () {
            $div.append(html);
        });
        /*
        $div.find('img').each(function () {
            // hack for protocol-relative images
            var $img = $(this),
                src = $img.attr('src');
            if (src.substr(0, 2) == '//') {
                $img.attr('src', 'https:' + src);
            }
        });
        */
        $div.find('table').each(function () {
            var $table = $(this);
            var $embedded = $table.parent().closest('table');
            console.log($embedded.length);
            if ($embedded.length > 0) {
                // Embedded in another table
                return;
            }
            var passes = [
                'infobox',
                'metadata',
                'ombox',
                'cquote'
            ];
            for (var i = 0; i < passes.length; i++) {
                if ($table.hasClass(passes[i])) {
                    // Usually we want these inline: infoboxes fit a single column and have important data,
                    // and metadata bits are usually small.
                    return;
                }
            }
            var $placeholder = $('<button>')
                .text('Show table')
                .click(function () {
                    console.log('yeah');
                    showLightbox($table);
                })
                .insertAfter($table);
            $table.detach();
        });
        $(target).append($div);
    }

    function initHub() {
        $('#hub').show();
        $('#search').hide();
        $('#reader').hide();
        $('#back').hide();
        /*
        fetchFeed('featured', function (html) {
            insertWikiHtml('#featured', html);
            var txt = stripHtmlTags(html);
            updateLiveTile("Featured Article", txt);
        });
        fetchFeed('potd', function (html) {
            insertWikiHtml('#potd', html);
        });
        fetchFeed('onthisday', function (html) {
            insertWikiHtml('#onthisday', html);
        });*/
        var list = HubContents.itemList;
        list.splice(0, list.length);
        fetchFeed('featured', function (htmlList) {
            var txt = stripHtmlTags(htmlList[0]);
            updateLiveTile("Featured Article", txt);
            htmlList.slice(0, 5).forEach(function (html) {
                var $html = $('<div>').html(html),
                    $links = $html.find('a'),
                    $imgs = $html.find('img'),
                    title = '',
                    image = '';
                for (var i = 0; i < $links.length; i++) {
                    var $link = $($links[i]);
                    if ($link.find('img').length) {
                        // Skip a link containing an image
                        continue;
                    }
                    title = extractWikiTitle($link.attr('href'));
                    break;
                }
                if ($imgs.length) {
                    image = $imgs.attr('src');
                    if (image.substr(0, 2) == '//') {
                        image = 'https:' + image;
                    }
                }
                list.push({
                    title: title,
                    snippet: stripHtmlTags(html).substr(0, 120) + '...',
                    image: image,
                    group: 'Featured Articles'
                });
            });
        });
        fetchFeed('onthisday', function (htmlList) {
            var html = htmlList[0],
                $html = $('<div>').html(html),
                $lis = $html.find('li');
            $lis.each(function () {
                var $li = $(this),
                    txt = stripHtmlTags($li.html()),
                    $link = $li.find('b a'),
                    title = extractWikiTitle($link.attr('href'));
                list.push({
                    title: title,
                    snippet: txt,
                    image: '',
                    group: 'On this day'
                });

            });
        });
        $('#hub').append('<div class="column-spacer"></div>');
    }

    function sizeContent() {
        var top = $('#content').position().top;
        var h = $(window).height() - top - 60;
        $('#content').css('height', h + 'px');
    }

    function showLightbox(element, className) {
        var $bg = $('<div>').addClass('lightbox-bg').appendTo('body'),
            $fg = $('<div>').addClass('lightbox-fg').appendTo('body');
        if (className) {
            $fg.addClass(className);
        }
        $fg.append(element);
        $bg.click(function () {
            $(element).detach();
            $fg.remove();
            $bg.remove();
        });
        $(document).bind('keypress.lightbox', function (event) {
            if (event.keyCode == 27) {
                // ESC
                $bg.click();
                $(document).unbind('keypress.lightbox');
            }
        });
    }

    function extractWikiTitle(url) {
        var wikiMatches = url.match(/\/wiki\/(.*)/);
        if (wikiMatches) {
            return decodeURIComponent(wikiMatches[1].replace(/_/g, ' '));
        } else {
            throw new Error('not a wiki url');
        }
    }

    app.start();
})();
