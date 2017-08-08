// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var socket = io.connect("https://taparoo-server.herokuapp.com");
/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  // chrome.tabs.query(queryInfo, function(tabs) {
  //   // chrome.tabs.query invokes the callback with a list of tabs that match the
  //   // query. When the popup is opened, there is certainly a window and at least
  //   // one tab, so we can safely assume that |tabs| is a non-empty array.
  //   // A window can only have one active tab at a time, so the array consists of
  //   // exactly one tab.
  //   var tab = tabs[0];
  //
  //   // A tab is a plain object that provides information about the tab.
  //   // See https://developer.chrome.com/extensions/tabs#type-Tab
  //   var url = tab.url;
  //
  //   // tab.url is only available if the "activeTab" permission is declared.
  //   // If you want to see the URL of other tabs (e.g. after removing active:true
  //   // from |queryInfo|), then the "tabs" permission is required to see their
  //   // "url" properties.
  //   console.assert(typeof url == 'string', 'tab.url should be a string');
  //
  //   callback(url);
  // });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

/**
 * @param {string} searchTerm - Search term for Google Image search.
 * @param {function(string,number,number)} callback - Called when an image has
 *   been found. The callback gets the URL, width and height of the image.
 * @param {function(string)} errorCallback - Called when the image is not found.
 *   The callback gets a string that describes the failure reason.
 */
function getBeers(callback, errorCallback) {
  // Google image search - 100 searches per day.
  // https://developers.google.com/image-search/
  var beersUrl = 'https://taparoo-server.herokuapp.com/api/v1/beers';
  var x = new XMLHttpRequest();
  x.open('GET', beersUrl);
  // The Google image search API responds with JSON, so let Chrome parse it.
  x.responseType = 'json';
  x.onload = function() {
    // Parse and process the response from Google Image Search.
    var response = x.response;
    // if (!response || !response.responseData || !response.responseData.results ||
    //     response.responseData.results.length === 0) {
    //   errorCallback('No Response');
    //   return;
    // }
    var beers = response.beers;
    // Take the thumbnail instead of the full image to get an approximately
    // consistent image size.
    callback(beers);
  };
  x.onerror = function() {
    errorCallback('Network error.');
  };
  x.send();
}

function renderStatus(statusText) {
  document.getElementById('status').textContent = statusText;
}

document.addEventListener('DOMContentLoaded', function() {
    // Put the image URL in Google search.
    renderStatus('Performing Google Image search for ');

    getBeers(function(beers) {
      let optionsRight = [];
      let optionsLeft = [];
      let optionsCooler = [];
      renderStatus("Update taps");
      var leftTapSelect = document.querySelector("#leftTap");
      var rightTapSelect = document.querySelector("#rightTap");
      var coolerSelect = document.querySelector("#cooler");
      // Explicitly set the width/height to minimize the number of reflows. For
      // a single image, this does not matter, but if you're going to embed
      // multiple external images in your page, then the absence of width/height
      // attributes causes the popup to resize multiple times.
      console.log(leftTapSelect);
      for(let i = 0; i < beers.length; i++) {
        optionsCooler[i] = document.createElement("option");
        optionsRight[i] = document.createElement("option");
        optionsLeft[i] = document.createElement("option");
        optionsRight[i].innerText = beers[i].name;
        optionsRight[i].value = i;
        optionsLeft[i].innerText = beers[i].name;
        optionsLeft[i].value = i;
        optionsCooler[i].innerText = beers[i].name;
        optionsCooler[i].value = i;
        coolerSelect.append(optionsCooler[i]);
        leftTapSelect.append(optionsLeft[i]);
        rightTapSelect.append(optionsRight[i]);
      }

      document.querySelector("#tapUpdate").addEventListener("click", () => {
        let left = leftTapSelect.value;
        let right = rightTapSelect.value;
        let cooler = coolerSelect.value;
        console.log(left);
        console.log("beers", beers);
        let onTap = {
          left: {
            "name": beers[left].name,
            "berwery": beers[left].brewery,
            "type": beers[left].type,
            "abv": beers[left].abv,
            "image_url": beers[left].image_url
          },
          right: {
            "name": beers[right].name,
            "berwery": beers[right].brewery,
            "type": beers[right].type,
            "abv": beers[right].abv,
            "image_url": beers[right].image_url
          },
          cooler: {
            "name": beers[cooler].name,
            "berwery": beers[cooler].brewery,
            "type": beers[cooler].type,
            "abv": beers[cooler].abv,
            "image_url": beers[cooler].image_url
          }
        };

        socket.emit("tapUpdate", onTap);

        let payload={"text": `${onTap.left.name} and ${onTap.right.name} are tapped :beers:`};

        $.post("https://hooks.slack.com/services/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", JSON.stringify(payload));

        $.ajax({
          url: "https://taparoo-server.herokuapp.com/api/v1/beers/on_tap",
          context: onTap,
          method: "PUT"
        });

      });

    }, function(errorMessage) {
      renderStatus('Error ' + errorMessage);
});
});
