var ZoomableWikiView = WinJS.Class.define(function (wikiview) {
    // constructor
    this._wikiview = wikiview;
}, {
    // public methods
    getPanAxis: function () {
        return "horizontal";
    },
    configureForZoom: function (isZoomedOut, isCurrentView, triggerZoom, prefetchedPages) {
    },
    setCurrentItem: function (x, y) {
    },
    getCurrentItem: function () {
    },
    beginZoom: function () {
    },
    positionItem: function () {
    },
    endZoom: function (isCurrentView) {
    },
    handlePointer: function (pointerId) {
    }
});

WinJS.Namespace.define("WikiControls", {
    WikiView: WinJS.Class.define(function (element, options) {
        this._element = element;
    }, {
        // public methods
        zoomableView: {
            get: function () {
                if (!this._zoomableView) {
                    this._zoomableView = new ZoomableWikiView(this);
                }
                return this._zoomableView;
            }
        },
    })
});