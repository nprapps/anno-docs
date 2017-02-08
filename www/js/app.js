import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';
import createElement from 'virtual-dom/create-element';
import virtualize from 'vdom-virtualize';
// import nocache from 'superagent-no-cache';
import request from 'superagent';
import URL from 'url-parse';
import WHITELIST from './station_domains.json';
import moment from 'moment-timezone';

// Global vars
let pymChild = null;
let transcriptURL = null;
let transcriptvDOM = null;
let transcriptDOM = null;
let headervDOM = null;
let headerDOM = null;
let footervDOM = null;
let footerDOM = null;
let currentFactChecks = [];
let trackedFactChecks = [];
let numReadFactChecks = 0;
let readFactChecks = [];
let seenFactChecks = [];
let transcriptInterval = null;
let scrollToID = null;
let lastRequestTime = null;
let vHeight = null;
let navAnalyticsTracked = null;

const parser = new DOMParser();
const transcriptWrapper = document.querySelector('.transcript-wrapper')
const headerWrapper = document.querySelector('.header-wrapper')
const footerWrapper = document.querySelector('.footer-wrapper')
const updateInterval = APP_CONFIG.DEPLOYMENT_TARGET ? 10000 : 10000;

/*
 * Initialize pym
 * Initialize transcript DOM
 * Set poll on transcript file
 */
const onWindowLoaded = function() {
    pymChild = new pym.Child({
        renderCallback: updateIFrame
    });
    moment.tz.setDefault("America/New_York");
    // event listeners
    pymChild.onMessage('visibility-available', onVisibilityAvailable)
    pymChild.onMessage('on-screen', onFactCheckRead);
    pymChild.onMessage('fact-check-visible', onFactCheckVisible);
    pymChild.onMessage('request-client-rect', onRectRequest);
    pymChild.onMessage('viewport-height', onViewHeight);
    window.addEventListener("unload", onUnload);

    pymChild.sendMessage('test-visibility-tracker', 'test');
    pymChild.sendMessage('get-viewport-height', '');
    setBodyClass();
    initUI();
    transcriptURL = buildTranscriptURL();
    getTranscript();

    transcriptInterval = setInterval(function () {
        getTranscript();
    }, updateInterval);
}

const setBodyClass = function() {
    const url = new URL(pymChild.parentUrl);
    const domain = url.hostname.split('.').slice(-2).join('.');
    if (WHITELIST.domains.indexOf(domain) != -1) {
        document.body.classList.add('whitelabel');
    } else if (domain == 'npr.org' || url.hostname == 'localhost' ||
               url.hostname == '127.0.0.1') {
        document.body.classList.add('whitelabel');
    }
}

const initUI = function() {
    transcriptvDOM = renderInitialTranscriptvDOM();
    transcriptDOM = createElement(transcriptvDOM);
    transcriptWrapper.appendChild(transcriptDOM);

    const headerData = {
        'updated': moment().format('h:mm A') + ' ET ',
        'numAnnotations': 0
    }
    headervDOM = renderHeadervDOM(headerData);
    headerDOM = createElement(headervDOM);
    headerWrapper.appendChild(headerDOM);

    const footerData = {
        'updated': moment().format('h:mm A') + ' ET ',
        'newAnnotations': 0
    }

    const loadingAnimvDOM = renderLoadingAnimvDOM();
    const loadingAnimDOM = createElement(loadingAnimvDOM);
    footerWrapper.appendChild(loadingAnimDOM);

    footervDOM = renderFootervDOM(footerData);
    footerDOM = createElement(footervDOM);
    footerWrapper.appendChild(footerDOM);

    document.querySelector('.jump-to-top').addEventListener('click', onJumpToTopClick, false);
}

/*
 * Request the transcript from S3/local server
 * update the transcript
 * update the rest of the UI based on the transcript
 * send iframe height to parent page
 */
const getTranscript = function() {
    request.get(transcriptURL)
        .set('If-Modified-Since', lastRequestTime ? lastRequestTime : '')
        .end(function(err, res) {
            if (res.status === 200) {
                lastRequestTime = new Date().toUTCString();
                updateTranscript(res.text);
                updateHeader();
                updateFooter();
            }
            updateIFrame();
            if (scrollToID) {
                scrollToFactCheck(scrollToID);
            }
        });
}

/*
 * Build new virtual DOM from HTTP request
 * Diff with current DOM and apply patches
 */
const updateTranscript = function(data) {
    const domNode = parser.parseFromString(data, 'text/html');
    const transcript = domNode.querySelector('.transcript');
    const newTranscriptvDOM = buildTranscriptvDOM(transcript);
    const patches = diff(transcriptvDOM, newTranscriptvDOM);

    transcriptDOM = patch(transcriptDOM, patches);
    transcriptvDOM = newTranscriptvDOM;
    registerTrackers();
    addNavListeners();
}

/*
 * Build new virtual DOM based on current time and number of annotations
 * Diff with current DOM and apply patches
 */
const updateHeader = function() {
    const headerData = {
        'updated': moment().format('h:mm A') + ' ET ',
        'numAnnotations': document.querySelectorAll('.annotation').length
    }

    const newHeadervDOM = renderHeadervDOM(headerData);
    const headerPatches = diff(headervDOM, newHeadervDOM);
    headerDOM = patch(headerDOM, headerPatches);
    headervDOM = newHeadervDOM;
}

/*
 * Build new virtual DOM based on number of unread annotations
 * Diff with current DOM and apply patches
 */
const updateFooter = function() {
    const newAnnotationsCount = document.querySelectorAll('.annotation').length - seenFactChecks.length;

    const footerData = {
        'updated': moment().format('h:mm A') + ' ET ',
        'newAnnotations': newAnnotationsCount >= 0 ? newAnnotationsCount : 0
    }
    const newFootervDOM = renderFootervDOM(footerData);
    const footerPatches = diff(footervDOM, newFootervDOM);
    footerDOM = patch(footerDOM, footerPatches);
    footervDOM = newFootervDOM;
}

const buildTranscriptvDOM = function(transcript) {
    if (transcript.classList.contains('before')) {
        document.body.classList.add('before');
        document.body.classList.remove('during');
        document.body.classList.remove('transcript-end');
        document.body.classList.remove('after');
    } else if (transcript.classList.contains('during')) {
        document.body.classList.add('during');
        document.body.classList.remove('before');
        document.body.classList.remove('transcript-end');
        document.body.classList.remove('after');
    } else if (transcript.classList.contains('transcript-end')){
        document.body.classList.add('transcript-end');
        document.body.classList.remove('before');
        document.body.classList.remove('during');
        document.body.classList.remove('after');
    }else if (transcript.classList.contains('after')) {
        document.body.classList.add('after');
        document.body.classList.remove('before');
        document.body.classList.remove('during');
        document.body.classList.remove('transcript-end');
        clearInterval(transcriptInterval);
    }
    const children = transcript.children;
    const childrenArray = Array.prototype.slice.call(children);
    return h('div', {
        className: transcript.className
    }, [
        childrenArray.map(child => renderChild(child))
    ]);

    function renderChild(child) {
        try {
            let element = null;
            if (child.tagName === 'DIV') {
                if (child.classList.contains('annotation')){
                    element = renderAnnotation(child);
                } else if (child.classList.contains('speaker_wrapper')) {
                    element = renderSpeaker(child);
                } else {
                    element = virtualize(child);
                }
            } else {
                element = virtualize(child);
            }
            return element;
        } catch (e) {
            console.error(e);
        }

    }

    function renderSpeaker(child) {
        var formattedTime = "";
        var timeText = child.querySelector('.timestamp').innerHTML;
        if (timeText !== "None") {
            var timeObj = new Date(timeText);
            formattedTime = moment(timeObj).format('h:mm A');
        }
        return h('div.speaker_wrapper', [
            virtualize(child.querySelector('h4')),
            h('span.timestamp', formattedTime)
        ])
    }

    function renderAnnotation(child) {
        const id = child.getAttribute('id');
        if (readFactChecks.indexOf(id) === -1){
            child.classList.add('unread');
        }

        if (seenFactChecks.indexOf(id) === -1){
            child.classList.add('offscreen');
        }
        return h('div', {
            id: child.getAttribute('id'),
            className: child.className
        },[
            virtualize(child.querySelector('.annotations-wrapper')),
            virtualize(child.querySelector('.annotation-header')),
            virtualize(child.querySelector('.annotation-nav'))
        ])
    }
}

/*
 * Render the initial state.
 */
const renderInitialTranscriptvDOM = function() {
    return h('div.init', h('p', 'Waiting for transcript...'));
}

/*
 * Render virtual DOM representation of header
 */
const renderHeadervDOM = function(data) {
    var headerContents;

    if (document.body.classList.contains('before')) {
        headerContents = renderHeaderContentsBefore(data);
    } else if (document.body.classList.contains('during') || document.body.classList.contains('transcript-end')) {
        headerContents = renderHeaderContentsDuring(data);
    } else if (document.body.classList.contains('after')) {
        headerContents = renderHeaderContentsAfter(data);
    }

    return h('div.header#header', headerContents)
}

/*
 * Render virtual DOM representation of header contents BEFORE debate
 */
const renderHeaderContentsBefore = function(data) {
    return [
        /*h('a', {
            href: 'http://npr.org'
        }, h('img.header-logo', {
            src: './assets/npr-color-100.png'
        })),*/
        h('h2.header-title', 'NPR Live Transcript'),
        h('p.header-info', 'Once the event has started, a live transcript will appear below.'),
    ]
};

/*
 * Render virtual DOM representation of header contents DURING debate
 */
const renderHeaderContentsDuring = function(data) {
    return [
        h('a', {
            href: 'http://npr.org'
        }, h('img.header-logo', {
            src: './assets/npr-color-100.png'
        })),
        h('h2.header-title', 'NPR Live Transcript'),
        h('p.header-info', [
            h('span.last-updated', ['Last updated: ' + data.updated]),
            h('span.num-annotations', data.numAnnotations + ' Annotations')
        ]),
    ]
};

/*
 * Render virtual DOM representation of header contents AFTER debate
 */
const renderHeaderContentsAfter = function(data) {
    return [
        h('a', {
            href: 'http://npr.org'
        }, h('img.header-logo', {
            src: './assets/npr-color-100.png'
        }))
    ]
};

/*
 * Render virtual DOM representation of loading animation
 */
const renderLoadingAnimvDOM = function() {
    return h('div.loading-anim', 'Loading...');
};

/*
 * Render virtual DOM representation of footer
 */
const renderFootervDOM = function(data) {
    const annoStr = data.newAnnotations === 1 ? 'annotation' : 'annotations';
    const annoNum = data.newAnnotations === 0 ? 'no' : data.newAnnotations;

    return h('div.footer', [
        h('div.update-wrapper', [
            h('p.update-notice', [
                'While you were reading, we added ',
                h('span.update-number', annoNum + ' new ' + annoStr + '.'),
            ]),
            h('p.update-info', 'To make new annotations easier to spot, we\'ve marked them in yellow. Scroll back up to see what you\'ve missed.')
        ]),
        h('div.footer-nav', [
            h('span.last-updated', ['Last updated: ' + data.updated]),
            h('a.jump-to-top', {
                href: '#'
            }, 'Back to top')
        ])
    ])
};

/*
 * Build correct transcript URL based on hostname
 */
const buildTranscriptURL = function() {
    let transcript_page = '/factcheck.html';
    return APP_CONFIG.S3_BASE_URL + transcript_page;
}

const onViewHeight = function(height){
    vHeight = height;
}

const scrollToFactCheck = function(id) {
    let el = null;
    try {
        el = document.querySelector(id);
    } catch(e) {
        // ignore scrolling if id is not valid
    }
    if (el) {
        let prev = el.previousSibling;
        if (!prev.innerHTML) {
            prev = prev.previousSibling;
        }

        if (prev.getElementsByClassName('fact-checked') && prev.getElementsByClassName('fact-checked').length > 0) {
            prev = prev.getElementsByClassName('fact-checked')[0];
        }

        const elBottom = el.getBoundingClientRect().bottom;
        const elTop = el.getBoundingClientRect().top;
        const rect = prev.getBoundingClientRect();
        const rectTop = rect.top;

        var spaceBetween = elBottom - rectTop;
        if (vHeight && spaceBetween >= vHeight){
            pymChild.scrollParentToChildPos(elBottom - vHeight + 40);
        }
        else {
            pymChild.scrollParentToChildPos(rectTop - 60);
        }

    }
    scrollToID = null;
}

const registerTrackers = function() {
    const factChecks = document.querySelectorAll('.annotation');

    currentFactChecks = [];

    [].forEach.call(factChecks, function(check) {
        const id = check.getAttribute('id');
        currentFactChecks.push(id);

        if (trackedFactChecks.indexOf(id) === -1) {
            trackedFactChecks.push(id);
            pymChild.sendMessage('new-fact-check', id);

            check.classList.add('new');
            setTimeout(function() {
                check.classList.remove('new')
            }, 200);

            check.addEventListener('transitionend', updateIFrame);
        }
    });

    const diff = trackedFactChecks.filter(x => currentFactChecks.indexOf(x) === -1);

    if (diff.length > 0) {
        for (const lostID of diff) {
            pymChild.sendMessage('remove-tracker', lostID);

            removeFromArray(trackedFactChecks, lostID);
            removeFromArray(readFactChecks, lostID);
            removeFromArray(seenFactChecks, lostID);
        }
    }

}

const removeFromArray = function(array, item) {
    const index = array.indexOf(item);

    if (index > -1) {
        array.splice(index, 1);
    }
}

// event handlers

/*
 * Update pym iframe height
 */
const updateIFrame = function() {
    if (pymChild) {
        pymChild.sendHeight();
    }
}

const onVisibilityAvailable = function(id) {
    document.body.classList.remove('vis-not-available');
    if (id) {
        scrollToID = id;
    }
}


const onFactCheckRead = function(id) {
    const factCheck = document.getElementById(id);
    // Ignore messages sent to annotations that
    // have deing deleted from page
    if (!factCheck) { return; }
    factCheck.classList.remove('unread');
    numReadFactChecks = numReadFactChecks + 1;
    readFactChecks.push(id);

}

const onFactCheckVisible = function(id) {
    const factCheck = document.getElementById(id);
    // Ignore messages sent to annotations that
    // have deing deleted from page
    if (!factCheck) { return; }
    factCheck.classList.remove('offscreen');
    if (seenFactChecks.indexOf(id) == -1) {
        seenFactChecks.push(id);
        updateFooter();
    }
}

const onRectRequest = function(id) {
    const factCheck = document.getElementById(id);
    // Ignore messages sent to annotations that
    // have deing deleted from page
    if (!factCheck) { return; }
    const rect = factCheck.getBoundingClientRect();
    const rectString = rect.top + ' ' + rect.left + ' ' + rect.bottom + ' ' + rect.right;
    pymChild.sendMessage(id + '-rect-return', rectString);

}

const onUnload = function(e) {
    const numAnnotations = document.querySelectorAll('.annotation').length;
    const unreadAnnotations = document.querySelectorAll('.annotation.unread').length;
    const readAnnotations = numAnnotations - unreadAnnotations;

    const strAnnotations = numAnnotations.toString();
    const strRead = readAnnotations.toString();

    const percentageRead = readAnnotations / numAnnotations;
    const nearestTenth = Math.floor10(percentageRead, -1);
    const nearestTenthStr = nearestTenth.toString();

    ANALYTICS.trackEvent('fact-checks-read', strRead, readAnnotations);
    ANALYTICS.trackEvent('fact-checks-on-page', strAnnotations, numAnnotations);
    ANALYTICS.trackEvent('percentage-fact-checks-read', nearestTenthStr);
}

const onJumpToTopClick = function(e) {
    e.preventDefault();
    pymChild.scrollParentToChildEl('header');
    ANALYTICS.trackEvent('jump-to-top-click');
}


// via https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round#Decimal_rounding
const decimalAdjust = function(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

Math.floor10 = function(value, exp) {
    return decimalAdjust('floor', value, exp);
}

const addNavListeners = function(){
  var previousArray = document.getElementsByClassName('previousNav');
  for (var i = 0; i < previousArray.length; i++){
    if (i === 0){
      previousArray[i].classList.add('noShow');
    } else {
      if (previousArray[i].classList.contains('noShow')){
        previousArray[i].classList.remove('noShow');
      }
      previousArray[i].addEventListener('click', onNavigatePreviousClick, false);
    }
  }

  var nextArray = document.getElementsByClassName('nextNav');
  for (var k = 0; k < nextArray.length; k++){
    if (k === nextArray.length - 1){
      nextArray[k].classList.add('noShow');
    } else if (nextArray.length === 1){
      nextArray[0].classList.add('noShow');
    } else {
      if (nextArray[k].classList.contains('noShow')){
        nextArray[k].classList.remove('noShow');
      }
      nextArray[k].addEventListener('click', onNavigateNextclick, false);
    }
  }

}

const onNavigatePreviousClick = function(e){
  e.preventDefault();
  var parentId = this.parentNode.parentNode.id;
  var idIndex = currentFactChecks.indexOf(parentId);
  if (idIndex !== 0){
    var prevAnnotation = currentFactChecks[idIndex - 1];
  } else {
    var prevAnnotation = currentFactChecks[currentFactChecks.length - 1];
  }
  scrollToFactCheck('#' + prevAnnotation);
  if (!navAnalyticsTracked) {
    ANALYTICS.trackEvent('fact-check-nav-click');
    navAnalyticsTracked = true;
  }
}

const onNavigateNextclick = function(e){
  e.preventDefault();
  var parentId = this.parentNode.parentNode.id;
  var idIndex = currentFactChecks.indexOf(parentId);
  if (idIndex !== (currentFactChecks.length - 1)){
    var nextAnnotation = currentFactChecks[idIndex + 1];
  } else {
    var nextAnnotation = currentFactChecks[0];
  }
  scrollToFactCheck('#' + nextAnnotation);
  if (!navAnalyticsTracked) {
    ANALYTICS.trackEvent('fact-check-nav-click');
    navAnalyticsTracked = true;
  }
}



/*
 * Initially load the graphic
 * (NB: Use window.load to ensure all images have loaded)
 */
window.onload = onWindowLoaded;
