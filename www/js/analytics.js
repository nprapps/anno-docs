/*
 * Module for tracking standardized analytics.
 */

var _gaq = _gaq || [];
var _sf_async_config = {};
var _comscore = _comscore || [];

window.ANALYTICS = (function () {

    // Global time tracking variables
    var slideStartTime =  new Date();
    var timeOnLastSlide = null;

    var embedGa = function() {
        (function(i,s,o,g,r,a,m) {
            i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
    }

    var setupVizAnalytics = function() {
        const currentUrl = new URL(window.location.href);
        const parentUrl = new URL(currentUrl.searchParams.get("parentUrl"));

        const embedUrl = window.location.protocol +
            '//' + window.location.hostname +
            window.location.pathname;

        const gaLocation = embedUrl;
        const gaPath = window.location.pathname;

        // Dimension structure mirrrors that of the standard Visuals team analytics
        const DIMENSION_PARENT_URL = 'dimension1';
        const DIMENSION_PARENT_HOSTNAME = 'dimension2';
        const DIMENSION_PARENT_INITIAL_WIDTH = 'dimension3';
        let customData = {};
        customData[DIMENSION_PARENT_URL] = currentUrl.searchParams.get("parentUrl") || '';
        customData[DIMENSION_PARENT_HOSTNAME] = parentUrl.hostname;
        customData[DIMENSION_PARENT_INITIAL_WIDTH] = currentUrl.searchParams.get("initialWidth") || '';

        window.ga('create', APP_CONFIG.VIZ_GOOGLE_ANALYTICS.ACCOUNT_ID, 'auto');
        window.ga('set', 'location', gaLocation);
        window.ga('set', 'page', gaPath);
        window.ga('send', 'pageview', customData);
    }

    var getParameterByName = function(name) {
        name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
        var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
            results = regex.exec(location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    var setupGoogle = function() {
        embedGa();
        setupVizAnalytics();
     }

    /*
     * Event tracking.
     */
    var trackEvent = function(eventName, label, value) {
        var eventData = {
            'hitType': 'event',
            'eventCategory': APP_CONFIG.CURRENT_FACTCHECK,
            'eventAction': eventName
        }

        if (label) {
            eventData['eventLabel'] = label;
        }

        if (value) {
            eventData['eventValue'] = value
        }

        ga('send', eventData);
    }

    // SHARING

    var openShareDiscuss = function() {
        trackEvent('open-share-discuss');
    }

    var closeShareDiscuss = function() {
        trackEvent('close-share-discuss');
    }

    var clickTweet = function(location) {
        trackEvent('tweet', location);
    }

    var clickFacebook = function(location) {
        trackEvent('facebook', location);
    }

    var clickEmail = function(location) {
        trackEvent('email', location);
    }

    var postComment = function() {
        trackEvent('new-comment');
    }

    var actOnFeaturedTweet = function(action, tweet_url) {
        trackEvent('featured-tweet-action', action, null);
    }

    var actOnFeaturedFacebook = function(action, post_url) {
        trackEvent('featured-facebook-action', action, null);
    }

    var copySummary = function() {
        trackEvent('summary-copied');
    }

    // NAVIGATION
    var usedKeyboardNavigation = false;

    var useKeyboardNavigation = function() {
        if (!usedKeyboardNavigation) {
            trackEvent('keyboard-nav');
            usedKeyboardNavigation = true;
        }
    }

    var completeTwentyFivePercent =  function() {
        trackEvent('completion', '0.25');
    }

    var completeFiftyPercent =  function() {
        trackEvent('completion', '0.5');
    }

    var completeSeventyFivePercent =  function() {
        trackEvent('completion', '0.75');
    }

    var completeOneHundredPercent =  function() {
        trackEvent('completion', '1');
    }

    var startFullscreen = function() {
        trackEvent('fullscreen-start');
    }

    var stopFullscreen = function() {
        trackEvent('fullscreen-stop');
    }

    var begin = function(location) {
        trackEvent('begin', location);
    }

    var readyChromecast = function() {
        trackEvent('chromecast-ready');
    }

    var startChromecast = function() {
        trackEvent('chromecast-start');
    }

    var stopChromecast = function() {
        trackEvent('chromecast-stop');
    }

    // SLIDES

    var exitSlide = function(slide_index) {
        var currentTime = new Date();
        timeOnLastSlide = Math.abs(currentTime - slideStartTime);
        slideStartTime = currentTime;
        trackEvent('slide-exit', slide_index, timeOnLastSlide);
    }

    setupGoogle();

    return {
        'trackEvent': trackEvent,
        'openShareDiscuss': openShareDiscuss,
        'closeShareDiscuss': closeShareDiscuss,
        'clickTweet': clickTweet,
        'clickFacebook': clickFacebook,
        'clickEmail': clickEmail,
        'postComment': postComment,
        'actOnFeaturedTweet': actOnFeaturedTweet,
        'actOnFeaturedFacebook': actOnFeaturedFacebook,
        'copySummary': copySummary,
        'useKeyboardNavigation': useKeyboardNavigation,
        'completeTwentyFivePercent': completeTwentyFivePercent,
        'completeFiftyPercent': completeFiftyPercent,
        'completeSeventyFivePercent': completeSeventyFivePercent,
        'completeOneHundredPercent': completeOneHundredPercent,
        'exitSlide': exitSlide,
        'startFullscreen': startFullscreen,
        'stopFullscreen': stopFullscreen,
        'begin': begin,
        'readyChromecast': readyChromecast,
        'startChromecast': startChromecast,
        'stopChromecast': stopChromecast
    };
}());
