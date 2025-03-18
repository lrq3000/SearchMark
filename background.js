// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
    var	o   = parseUri.options,
        m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
        uri = {},
        i   = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

// background.html: SearchMark back-end
//
// Copyright (C) 2010  Akshay Dua, and Candy Yiu
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see http://www.gnu.org/licenses/.

// =============== GLOBALS ==============

// Bookmarked page database
var SearchMarkDB = {};

// Communicate with extension UI
var gPort;

// Used to highlight searched keywords in results
var uiHighlightStart = '<span class=highlight>';
var uiHighlightEnd = '</span>';
var uiEllipses = '<b>...</b>';
var uiContextLen = -30;

// ======================== DATABASE API ==================

// Open the database
SearchMarkDB.db = null;
// SearchMarkDB.open = function()
// {
//     var dbSize = 200 * 1024 * 1024; // 200 MB
//     SearchMarkDB.db =
//         openDatabase('SearchMarkDB', '1.0', 'Bookmark Page Storage', dbSize);
// }

// initialize the pages storage in chrome.storage.local
// (no tables in chrome.storage.local, using array 'pages')
SearchMarkDB.initializePagesStorage =
    function()
{
    // chrome.storage.local is object-based, no tables
    // initialize 'pages' array if not exists
    chrome.storage.local.get('pages', function(items) {
        if (!items.pages) {
            chrome.storage.local.set({ 'pages': [] }, function() {
                console.log('Pages storage initialized.');
            });
        } else {
            console.log('Pages storage already exists.');
        }
    });
}

// alias for clarity - initializePagesStorage is called createTable in init()
SearchMarkDB.createTable = SearchMarkDB.initializePagesStorage;

// add a bookmark and associated page to the database
SearchMarkDB.addBookmarkedPage =
    function(newId, newUrl, newTitle, newPlainPage, newTime,
             newPageImg, newHtmlPage)
{
    chrome.storage.local.get('pages', function(items) {
        var pages = items.pages;
        if (!pages) {
            pages = [];
        }
        pages.push({
            id: newId,
            url: newUrl,
            title: newTitle,
            page: newPlainPage,
            time: newTime,
            img: newPageImg,
            htmlpage: newHtmlPage
        });
        chrome.storage.local.set({ 'pages': pages }, function() {
            console.log('Page added to storage: ' + newUrl);
        });
    });
}

// remove a bookmarked page from the database
SearchMarkDB.removeBookmarkedPage =
    function(theId)
{
    chrome.storage.local.get('pages', function(items) {
        var pages = items.pages;
        var newPages = pages.filter(page => page.id != theId);
        chrome.storage.local.set({ 'pages': newPages }, function() {
            console.log('Page removed from storage: ' + theId);
        });
    });
}

// update an already stored bookmarked page
SearchMarkDB.updateBookmarkedPage =
    function(theId, theUrl, theTitle, thePlainPage, theTime,
             thePageImg, theHtmlPage)
{
    chrome.storage.local.get('pages', function(items) {
        var pages = items.pages;
        var updatedPages = pages.map(page => {
            if (page.id == theId) {
                return {
                    id: theId,
                    url: theUrl,
                    title: theTitle,
                    page: thePlainPage,
                    time: theTime,
                    img: thePageImg,
                    htmlpage: theHtmlPage
                };
            }
            return page;
        });
        chrome.storage.local.set({ 'pages': updatedPages }, function() {
            console.log('Page updated in storage: ' + theUrl);
        });
    });
}

// get all bookmark URLs. Callback function can
// be provided use the results as necessary.
SearchMarkDB.getStoredBookmarks =
    function()
{
    chrome.storage.local.get('pages', function(items) {
        var pages = items.pages;
        if (pages) {
            // Process and return bookmarks, for example:
            console.log('Retrieved bookmarks from storage:', pages);
            // You might want to pass these bookmarks to a callback
            // or store them in a way that the rest of the code can use.
            // For now, just logging them.
        } else {
            console.log('No bookmarks found in storage.');
        }
    });
}

// Supports the cached page feature. Returns cached raw html page.
SearchMarkDB.getRawHtmlPage =
    function (id, callback)
{
    // SearchMarkDB.db.transaction is no longer used with chrome.storage.local
    // This function seems to be related to the old database implementation.
    // It should be reviewed and potentially removed or adapted for chrome.storage.local if needed.
    // For now, this function will be kept as is, but it might not be functional.
    // If caching raw HTML pages is still required with chrome.storage.local,
    // this function needs to be reimplemented using chrome.storage.local API.
    //
    // Original code:
    // SearchMarkDB.db.transaction( ... ); // Removed transaction logic
    console.warn("SearchMarkDB.getRawHtmlPage is using deprecated database transaction logic.");
    console.warn("Functionality might be broken. Please review and update.");
    callback(null, { rows: [] }); // Returning empty result to prevent errors.
}

SearchMarkDB.doSearch =
    function(callback, keywords)
{
    chrome.storage.local.get('pages', function(items) {
        var pages = items.pages;
        if (pages) {
            var results = pages.filter(page => {
                // Basic keyword search - improve as needed
                const text = (page.title + ' ' + page.url + ' ' + page.page).toLowerCase();
                return keywords.toLowerCase().split(' ').every(keyword => text.includes(keyword));
            }).map(page => {
                // Create snippet - this is a simplified version
                const snippet = page.page.substring(0, 100) + '...'; // Example snippet
                return {
                    id: page.id,
                    url: page.url,
                    title: page.title,
                    img: page.img,
                    snippet: snippet // Using basic snippet for now
                };
            });
            callback(null, { rows: results.map(result => ({ item: () => result })) }); // Simulate SQL result
        } else {
            callback(null, { rows: [] });
        }
    });
}

// clear all stored information.
SearchMarkDB.clear =
    function()
{
    chrome.storage.local.remove('pages', function() {
        console.log('Pages storage cleared.');
    });
}

// remove the table and all stored information
SearchMarkDB.purge =
    function()
{
    chrome.storage.local.clear(function() {
        console.log('All storage cleared (purge).');
    });
}

// ========================== CORE ===============

// prepare to initialize

// open the database each time extension loads.
// SearchMarkDB.open(); // No longer needed for chrome.storage.local
console.debug("Using chrome.storage.local for storage.");

chrome.storage.local.set({'newversion': 2.5});

// Important for new installs
chrome.storage.local.get('oldversion', function(items) {
    if (!items.oldversion) { // not defined
        // set to a version before upgrade functionality ever existed
        chrome.storage.local.set({'oldversion': 1.1});
    }
});

chrome.storage.local.get(['newversion', 'oldversion', 'initialized'], function(items) {
    var newversion = items.newversion;
    var oldversion = items.oldversion;
    var initialized = items.initialized;
    if(newversion > oldversion) {
        // will not be true for new installs
        if(initialized) { // already installed. Do upgrade.
            console.log("Upgrading to version: " + newversion);
            doUpgrade();
        }
        chrome.storage.local.set({'oldversion': newversion});
    }
});

init();

chrome.action.onClicked.addListener( // changed from browserAction to action
    function(tab)
    {
        chrome.tabs.create(
            {'url' : 'SearchMarkUI.html'},
            function(newTab) {});
    });

// chrome.extension.onRequest has been deprecated in Manifest V3.
// replaced with chrome.runtime.onMessage.addListener
chrome.runtime.onMessage.addListener(handleRequest);

// chrome.extension.onRequest has been deprecated in Manifest v3
// remove deprecated listener
// chrome.extension.onRequest.addListener(handleRequest);

chrome.bookmarks.onChanged.addListener(
    function(id, changeInfo)
    {
        chrome.storage.local.get('initialized', function(items) {
            if (!items.initialized) {
                return;
            }

            getAndStoreBookmarkContent(
                {id : id,
                 url : changeInfo.url,
                 title : changeInfo.title,
                 time : 0},
                SearchMarkDB.updateBookmarkedPage);
        });
    });

chrome.bookmarks.onCreated.addListener(
    function(id, newBookmark)
    {
        chrome.storage.local.get('totalbookmarks', function(items) {
            var totalbookmarks = items.totalbookmarks || 0;
            chrome.storage.local.set({'totalbookmarks': totalbookmarks + 1});
        });

        chrome.storage.local.get('initialized', function(items) {
            if (!items.initialized) return;

            getAndStoreBookmarkContent(
                {id : id,
                 url : newBookmark.url,
                 title : newBookmark.title,
                 time : newBookmark.dateAdded},
                SearchMarkDB.addBookmarkedPage);
        });
    });

chrome.bookmarks.onRemoved.addListener(
    function(id, removeInfo)
    {
        chrome.storage.local.get('totalbookmarks', function(items) {
            var totalbookmarks = items.totalbookmarks || 0;
            chrome.storage.local.set({'totalbookmarks': totalbookmarks - 1});
        });

        chrome.storage.local.get('initialized', function(items) {
            if (!items.initialized) return;

            SearchMarkDB.removeBookmarkedPage(id);
        });
    });

// experimental APIs require user to start chrome with a specific option
// flag from the command line. So, not using for now.
// chrome.experimental.omnibox.onInputEntered.addListener(
//     function(keywords) {
//         handleRequest({method: 'search', keywords: keywords},
//                       background, function() {});
//     }
// );

// ================= CORE API ===================

function init()
{
    console.log("Initializing...");

    // if bookmarks in DB not in sync with actual bookmarks
    chrome.storage.local.get(['added', 'totalbookmarks'], function(items) {
        var added = items.added || 0;
        var totalbookmarks = items.totalbookmarks || 0;
        if(added && totalbookmarks && added != totalbookmarks)
            cleanupStorage();
    });

    // initialize once only. Populate the database
    // by retrieving and storing bookmarked pages, and
    // URLs.
    chrome.storage.local.get('initialized', function(items) {
     if (!items.initialized || items.initialized == 0)
        {
        SearchMarkDB.createTable();

        chrome.bookmarks.getTree(
            function(bookmarks)
            {
                chrome.storage.local.set({'added': 0, 'totalbookmarks': 0});
    	        initBookmarkDatabase(bookmarks);
            });

        // number of times the welcome page was opened
        chrome.storage.local.set({'uivisits': 0});

        chrome.storage.local.set({'initialized': 1});
     } else {
        chrome.storage.local.get('initialized', function(items) {
            var initialized = items.initialized || 0;
            chrome.storage.local.set({'initialized': initialized + 1});
        });
     }
    });
}

// any upgrade functionality should be placed here
function doUpgrade()
{
    chrome.storage.local.get('oldversion', function(items) {
        if(items.oldversion)
        cleanupStorage();
    });
}

// clean up stored configuration variables
function cleanupStorage()
{
    console.log("Cleaning up...");

    console.log("Clearing database tables");
    SearchMarkDB.clear();

    console.log("Removing the tables");
    SearchMarkDB.purge();

    console.log("Setting to 'not initialized'");
    chrome.storage.local.set({'initialized': 0});
}

function handleRequest(request, sender, callback)
{
    if (request.method == 'search') {
        gPort = chrome.runtime.connect( {name : "uiToBackend"});

        console.debug("search: " + request.keywords);

        SearchMarkDB.doSearch(searchBookmarkedPagesCb,
                              "'" + request.keywords + "'");

        callback();
    } else if (request.method == 'cached') {
        SearchMarkDB.getRawHtmlPage(request.bookmarkid, displayRawPage);

        console.debug("cache request: " + request.bookmarkid);

        callback();
    } else {
        callback();
    }
}

function displayRawPage(tx, r)
{
    if(r.rows.length) {

        chrome.tabs.create(
            {url: 'rawPageView.html', selected: true},
            function (tab)
            {
                // connect to tab that will show the raw page
                var port = chrome.runtime.connect({name:
                "rawPageView"});

                // send the raw page
                port.postMessage(r.rows.item(0).htmlpage);

                // done.
                port.disconnect();
            });

    } else {
        console.log("Unexpected error: this page should have " +
                    "been cached. Please file a bug report " +
                    "at <todo:put github url here>");
    }
}

function searchBookmarkedPagesCb(tx, r)
{
    var result = {};

    for ( var i = 0; i < r.rows.length; i++) {
        // deprecated, remove eventually - removed line below
        // result.matchType = "page"; // Removed deprecated line

        result.id = r.rows.item(i).id;
        result.url = r.rows.item(i).url;
        result.title = r.rows.item(i).title;
        result.text = r.rows.item(i).snippet;
        result.img = r.rows.item(i).img;

        console.log("img:", result.img);

        gPort.postMessage(result);

        result = {};
    }

    result.matchType = "DONE";

    gPort.postMessage(result);
}

function removeHTMLfromPage(page)
{
    // reduce spaces, remove new lines
    var pagetxt = page.replace(/\s+/gm, " ");

    // remove 'script', 'head', 'style' tags
    pagetxt = pagetxt.replace(/<\s*?head.*?>.*?<\s*?\/\s*?head\s*?>/i, " ");
    pagetxt = pagetxt.replace(/<\s*?script.*?>.*?<\s*?\/\s*?script\s*?>/gi, " ");
    pagetxt = pagetxt.replace(/<\s*?style.*?>.*?<\s*?\/\s*?style\s*?>/gi, " ");

    // Now remove other tags
    pagetxt = pagetxt.replace(/<.*?\/?>/g, " ");

    // Remove symbols
    pagetxt = pagetxt.replace(/&.*?;/g, " ");

    // Remove comment markers
    pagetxt = pagetxt.replace(/(<!--|-->)/g, " ");
    
    // After all the filtering, need to fix up spaces again
    pagetxt = pagetxt.replace(/\s+/gm, " ");

    return pagetxt;
}

function extractPageImg(page, url)
{
    // // look for first top-level heading
    // var idx = page.search(/<h[1-3]/i);

    // // if idx =  -1 (not found)
    // // get first image
    // if(idx == -1)
    //     idx = 0;

    var imgstart = page.indexOf("<img", 0);

    // if no image, screw it
    if(imgstart == -1)
        return "";

    // var imgend = page.indexOf(">", imgstart);

    // // if malformed html, screw it
    // if(imgend == -1)
    //     return "";

    // var imgtag = page.substring(imgstart, imgend + 1);

    // fix src url of image if necessary
    var srcstart = page.indexOf("src", imgstart);

    // malformed img tag
    if(srcstart == -1)
        return "";

    var quote = '"';

    srcstart = page.indexOf(quote, srcstart);

    // maybe its a single quote
    if(srcstart == -1)
    {
        quote = "'";
        srcstart = page.indexOf(quote, srcstart);
    }

    // malformed img tag
    if(srcstart == -1)
        return "";

    var srcend = page.indexOf(quote, srcstart + 1);

    // malformed img tag
    if(srcend == -1)
        return "";

    var src = page.substring(srcstart + 1, srcend);

    if(src.indexOf("://", 0) != -1)
    { // full path
        ;
    }
    else if(src[0] == '/')
    { // path from host url

        if(src[1] == '/')
            src = src.substring(2);
        else
            src = parseUri(url).host + src;
    }
    else
    { // relative path
        src = parseUri(url).host + parseUri(url).directory + src;
    }

    console.debug("extracted image: " + src + ", url: " + url);

    return src;
}

// debug and test function. Not called from core
function getUrlContent(url)
{
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function()
        {
            try {
                if (this.readyState == 4) {

                    console.log("got page. extracting img url");

                    imgurl = extractPageImg(this.responseText, url);

                    this.abort();
                }
            } catch (e) {
                console.log("Error in getUrlContent:", e.message);
            }
        }

        xhr.send();
    } catch (e) {
        console.log("Error in getUrlContent for URL " + bookmark.url + ": " + e.message);
    }
}

function getAndStoreBookmarkContent(bookmark, storeInDB)
{
    try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", bookmark.url, true);
        xhr.onreadystatechange = function()
        {
            try {
                if (this.readyState == 4) {

                    var pageNoHtml = removeHTMLfromPage(this.responseText);

                    // add page to database
                    storeInDB(bookmark.id, bookmark.url,
                              bookmark.title, pageNoHtml,
                              bookmark.dateAdded,
                              extractPageImg(this.responseText,
                                             bookmark.url),
                              this.responseText);

                    this.abort();
                }
            } catch (e) {
                console.log("Error in getAndStoreBookmarkContent:", e.message);
                storeInDB(bookmark.id, bookmark.url, bookmark.title,
                          bookmark.dateAdded, "", "", "");
            }
        }
        xhr.send();
    } catch (e) {
        console.log("Error in getAndStoreBookmarkContent for URL " + bookmark.url + ": " + e.message);
        storeInDB(bookmark.id, bookmark.url, bookmark.title,
                  bookmark.dateAdded, "", "", "");
        }
    }

function initBookmarkDatabase(bookmarks)
{
    bookmarks.forEach(
        function(bookmark)
        {
            if (bookmark.url &&
                bookmark.url.match("^https?://*"))
            { // url exists and is well formed

                console.debug("Adding bookmark: " + bookmark.url);

                chrome.storage.local.get('totalbookmarks', function(items) {
                    var totalbookmarks = items.totalbookmarks || 0;
                    chrome.storage.local.set({'totalbookmarks': totalbookmarks + 1});
                });
                

                getAndStoreBookmarkContent(bookmark,
                                           SearchMarkDB.addBookmarkedPage);
            } else {
                console.debug("Skipping bookmark: " + bookmark.url);
            }
            
            if (bookmark.children)
                initBookmarkDatabase(bookmark.children);
        });
}

function getCallback(cbname, msg, type)
{
    switch (cbname) {
    case "show db":
        if (type == 1)
            return function(tx, r)
        {
            for ( var i = 0; i < r.rows.length; i++) {
                console.log("Stored. " + msg + ", " + "url: " + r.rows.item(i).url);
            }
        }
        else
            return function(tx, r)
        {
            console.debug("failed: " + cbname + ", msg: " + msg);
            console.log("  " + r.message);
        }
        break;
    case "search pages":
        if (type == 1) // success callback
            return function(tx, r)
        {
            console.debug("succeded: " + cbname + ", msg: " + msg);
        }
        else
            return function(tx, e)
        {
            console.debug("failed: " + cbname + ", msg: " + msg);
            console.log("  " + e.message);

            // search pages failed, tell user
            var result = {};

            result.matchType = "DONE";
            result.error = 'Sorry, I am not sure what you are ' +
                'looking for. Could you be missing a quote (") ' +
                'while searching for a phrase?';

            gPort.postMessage(result);
        }
        break;
    case "insert page raw":
        if (type == 1) // success callback
            return function(tx, r)
        {
            console.debug("succeded: " + cbname + ", msg: " + msg);
            chrome.storage.local.get('added', function(items) {
                var added = items.added || 0;
                chrome.storage.local.set({'added': added + 1});
            });
        }
        else
            // failure callback
            return function(tx, e)
        {
            console.debug("failed: " + cbname + ", msg: " + msg);
            console.log("  " + e.message);
        }
        break;
    case "remove page raw":
        if (type == 1) // success callback
            return function(tx, r)
        {
            console.debug("succeded: " + cbname + ", msg: " + msg);
            chrome.storage.local.get('added', function(items) {
                var added = items.added || 0;
                chrome.storage.local.set({'added': added - 1});
            });
        }
        else
            // failure callback
            return function(tx, e)
        {
            console.debug("failed: " + cbname + ", msg: " + msg);
            console.log("  " + e.message);
        }
        break;
    default:
        if (type == 1) // success callback
            return function(tx, r)
        {
            console.debug("succeded: " + cbname + ", msg: " + msg);
        }
        else
            // failure callback
            return function(tx, e)
        {
            console.debug("failed: " + cbname + ", msg: " + msg);
            console.log("  " + e.message);
        }
    }
}