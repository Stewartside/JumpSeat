"use strict";

/**
 * Guide Model
 * @author Mike Priest
 * @type {{url: string, urlSearch: string, defaults: Function, byId: Function, update: Function, validate: Function}}
 */
Aero.model.guide = {

    /**
     *  Services URL
     */
    url : "api/guides",
    urlSearch: "api/search",

    /**
     *  Default model
     *  Used so we don't have to store all value in the DB
     */
    defaults : function(){

        return {
            "title": "",
            "active": false,
            "steps" : []
        }
    },

    /**
     *  Get guide from the model by id
     */
    byId : function(id, callback){
        Aero.guide.getAll(function(guides){
            $q.each(guides, function(i, guide){

                if(guide && (id == guide.id)){
                    callback(guides[i]);
                    aeroStorage.setItem('aero:session:index', i, function(){}, true);
                }
            })
        });
    },

    /**
     *  Update our model/view
     */
    update : function(callback, newid){
        Aero.guide.getAll(function(r){
            Aero.view.guide.render(r);
            if(callback) callback(newid);
        }, true);
    },

    /**
     *  Validate our forms
     */
    validate : function(){

        //Validate
        var valid = $q('form').isFormValid();

        //Check content
        if($q('#aeroEditor').trumbowyg('html').replace(/<br>/g, '') == ""){
            valid = false;
            $q('.trumbowyg-editor').addClass('aero-require-error');
        }

        //Add messaging
        if(!valid){
            $q('#aeroSection0 p:first').after('<div class="aero-error-box">'+AeroStep.lang.requirede+'</div>');
        }

        return valid;
    }
};

/**
 * Guide Views
 * @type {{render: Function, renderRestrict: Function, positionRestrict: Function, search: Function, clearSearch: Function, setEvents: Function}}
 */
Aero.view.guide = {

    /**
     *  @function sidebar view
     *  @param {array} guides
     *  @param {function} callback function
     *  @param {boolean} is search render
     */
    render : function(guides, callback, search){
        var self = this;

        //Cleanup stuff
        $q('.aero-restrict, .aero-contextual').remove();

        if(!search) self.clearSearch();

        Aero.tpl.get("sidebar-guides.html", function (r) {
            aeroStorage.getItem('aero:sidebar:open', function (s) {
                aeroStorage.getItem('aero:session:tab', function (tab) {
                    //Remove duplicates
                    $q('#aeroGuidebar').remove();

                    var tpl = _q.template(r);
                    $q('body').append(tpl({sidebar: s, guides: guides}));
                    $q('#aeroStepbar').remove();

                    if (tab > $q('#aeroGuidebar').outerHeight()) tab = $q('#aeroGuidebar').outerHeight() - 100;
                    if (tab < 0) tab = 0;

                    $q('#aero-tab').css("top", tab + "px");
                    self.setEvents();
                    Aero.view.sidebar.setEvents();
                    Aero.view.sidebar.setScrollable();

                    //Notify of new guides
                    var diff = parseInt($q('body').data('newguides'));
                    if (diff > 0) {
                        Aero.view.sidebar.notify(diff);
                    }
                }, true);
            }, true);
        });
    },

    /**
     * Render tooltip for context item
     * @param guideid
     * @param step
     */
    renderContextualTip : function(guideid, step){

        function renderTip (step, index){
            var $tpl = $q(Aero.tip.options.template(step));
            var loc = guideid + '-' + index;

            $tpl.attr('id', 'atip-' + loc);
            $tpl.addClass('aero-action-tip');
            $q('body').append($tpl);

            Aero.tip.setPosition($q('#aaction-' + loc), $q('#atip-' + loc), step.position);
            $tpl.show();
        }

        Aero.guide.get(guideid, function(r){
            renderTip(r.step[step], step);
        });
    },
    /**
     * @function contextual tooltips
     * @param guide with tips
     */
    renderContextualAction : function(guide){

        var _this = this;

        if(!guide.contextual || guide.contextual.length == 0) return;

        function renderBox(step, loc){

            var $el, $box;
            $el = $q(loc);

            if($el.length > 0) {

                var off = $el.offset();

                //Setup Box
                $box = $q('<a />')
                    .attr('id', 'aaction-' + guide.id + '-' + step)
                    .addClass('aero-contextual')
                    .css({
                        top: off.top + ($el.outerHeight() / 2) - 8,
                        left: off.left + ($el.outerWidth())
                    })
                    .data('loc', loc)
                    .data('guideid', guide.id)
                    .data('step', parseInt(step));

                $q('body').append($box);
            }
        }

        for(var j in guide.contextual) {
            if (guide.step.length > 0) {
                var index = parseInt(guide.contextual[j]);
                if(guide.step[index] && guide.step[index].loc) {
                    renderBox(index, guide.step[index].loc);
                }
            }
        }
    },

    /**
     *  @function restrict a guide
     *  @param guide with restrictions
     */
    renderRestrict : function(guide){

        var _this = this;

        if(guide.isComplete || !guide.restrict || guide.restrict.length == 0) return;

        function renderBox(step, loc, color){

            var $el, $box;
            $el = $q(loc);

            if($el.length > 0) {
                //Setup Box
                $box = $q('<a />')
                    .addClass('aero-restrict')
                    .css({
                        'background-color': color,
                        'cursor': 'pointer',
                        'opacity': 0.5
                    })
                    .data('loc', loc)
                    .data('guideid', guide.id)
                    .data('step', parseInt(step));

                $q('body').append($box);

                _this.positionRestrict($box);
            }
        }

        for(var j in guide.restrict) {
            j = parseInt(j.replace('s', ''));

            if (guide.step.length > 0) {
                renderBox(j, guide.step[j].loc, guide.step[j].restrictColor);
            }
        }
    },

    /**
     *  @function restrict a guide
     *  @param guide with restrictions
     */
    positionRestrict : function($box){

        var $el = $q($box.data('loc'));

        var pos = Aero.pos.isFixed($el) ? 'fixed' : 'absolute';

        //Setup Box
        $box.css({
            'width' : $el.outerWidth(),
            'height' : $el.outerHeight(),
            'top' : $el.offset().top,
            'left' : $el.offset().left,
            'position' : pos,
            'z-index' : 99999999
        });
    },

    /**
     *  @function search
     *  @param {array} guides
     *  @param {function} callback function
     */
    search : function(term){
        var self = this;

        $q('.aero-search i').switchClass( "fa-search", "fa-times", 0);
        $q('.aero-search a').switchClass( "aero-search-btn", "aero-search-clear", 0);

        Aero.guide.getByTerm(term, function(r){
            r.search = term;
            self.render(r, function(){}, true);
        });
    },

    /**
     *  @function search reset ui
     */
    clearSearch : function(){
        if($q('.aero-search-clear').length > 0){
            $q('.aero-search i').switchClass( "fa-times", "fa-search", 0);
            $q('.aero-search a').switchClass( "aero-search-clear", "aero-search-btn", 0);
            $q('.aero-search').removeClass('aero-active');
            $q('input[name=aero_search]').val(AeroStep.lang.search);
        }
    },

    /**
     *  @function setEvents on the guide view
     */
    setEvents: function(){
        var self = this;

        //Start a guide
        $q('body').off('click.aeroStart').on('click.aeroStart', '.aero-guides ul li > a', function(){
            var id = $q(this).parents('li:eq(0)').data('guideid');
            aeroStorage.removeItem("aero:session:pause");
            Aero.tip.start(id);
        });

        //Search active placeholder
        $q('body').off('click.apF').on('focus.apF', '.aero-sidebar input[name=aero_search]', function(){
            $q(this).parents("div:eq(0)").addClass('aero-active');
            if($q(this).val() == AeroStep.lang.search) $q(this).val("");
        });
        $q('body').off('click.apB').on('blur.apB', '.aero-sidebar input[name=aero_search]', function(){
            if($q(this).val() == ""){
                $q(this).parents("div:eq(0)").removeClass('aero-active');
                $q(this).val(AeroStep.lang.search);
            }
        });

        //Perform search
        $q('body').off('click.aS').on('click.aS', '.aero-search a.aero-search-btn', function(){
            self.search($q('input[name=aero_search]').val());
        });
        $q('body').off('keypress.asK').on('keypress.asK', '.aero-sidebar input[name=aero_search]', function(e){
            var code = e.keyCode || e.which;
            if(code == 13){
                self.search($q(this).val());
            }
        });

        //Clear search
        $q('body').off('click.asC').on('click.asC', '.aero-search-clear', function(){
            Aero.guide.getAll(function(guides){
                self.render(guides);
            });
            return false;
        });

        //Restrict Start
        $q('body').off('click.asr').on('click.asr', '.aero-restrict', function(){

            var _this = $q(this);

            Aero.confirm({
                ok : AeroStep.lang.ok,
                title : AeroStep.lang.restrictt,
                msg : AeroStep.lang.restrictb,
                onConfirm : function(){
                    Aero.tip.start(_this.data('guideid'));
                }
            });
        });

        //Contextual Start
        $q('body').off('mouseenter.actip').on('mouseenter.actip', '.aero-contextual', function(){
            var _this = $q(this);
            var guideid = _this.data('guideid');
            var step = _this.data('step');

            $q('.aero-action-tip').remove();
            setTimeout(function() {
                self.renderContextualTip(guideid, step);
            }, 250);
        });
        //Contextual End
        $q('body').off('mouseleave.actip').on('mouseleave.actip', '.aero-contextual', function(){
            $q('.aero-action-tip').remove();
        });

        //Auto start options
        $q('body').on('click', 'input[name="aero_auto"]', function(){
            $q('.aero-auto-page').hide();
            if($q(this).is(':checked')){
                $q('.aero-auto-page').show();
            }
        });
    }
};

/**
 * Guide Object
 * @author Mike Priest
 * @type {{init: Function, autoStart: Function, updateCache: Function, getAll: Function, get: Function, getByTerm: Function, create: Function, update: Function, destroy: Function}}
 */
Aero.guide = {

    /**
     * @function Initialize the sidebar as guide listing
     * @param {function} callback function
     */
    init : function(){
        var self = this;

        //Set user and load template
        Aero.tpl.get("sidebar-guides.html", function () {

            //Check for ended guide
            var end = aeroStorage.getItem('aero:session:end');
            if (end) Aero.tip.sayCongrats();

            self.getAll(function (guides) {
                aeroStorage.getItem('aero:session', function (ls) {

                    var hasLink = Aero.utils.getUrlParam('guideid');

                    if (ls) {
                        //Session start
                        var guide = JSON.parse(ls);

                        //Get current step
                        aeroStorage.getItem('aero:session:current', function (i) {
                            Aero.tip.start(guide.id, parseInt(i));
                        }, true);

                    } else if (hasLink) {
                        //URL link start
                        Aero.tip.start(Aero.utils.getUrlParam('guideid'));

                        //Change URL param
                        window.history.pushState("object or string", "Title", window.location.href.replace('guideid', 'startedid'));
                    } else {
                        //Render guide sidebar
                        var index = aeroStorage.getItem('aero:pathway');
                        if (index && index != "0") {
                            Aero.pathway.get(function (r) {
                                var t = Aero.view.pathway.render(r, parseInt(index));
                                if (!t) Aero.view.guide.render(guides);
                            });
                        } else {
                            Aero.view.guide.render(guides);
                        }
                    }
                }, true);
            });
        });
    },

    /**
     *  @function autoStart a guide based on URL or any page
     *  @param guide to start
     */
    autoStart : function(guide){

        //Check restrict
        Aero.view.guide.renderRestrict(guide);

        //Check contextual tips
        Aero.view.guide.renderContextualAction(guide);

        if(!guide.auto) return;
        if(!guide.isStarted && !AeroStep.admin && guide.step.length > 0){

            var isStart = false;

            //Start on any page?
            if(guide.autoPage){
                isStart = true;
            }else{
                //Check current page matches first step URL
                if(guide.step.length > 0 && window.location.pathname == guide.step[0].url){
                    isStart = true;
                }
            }

            if(isStart) {
                aeroStorage.setItem('aero:guide:auto', 1);
                Aero.tip.start(guide.id);
            }
        }
    },

    /**
     *  @function update local storage data
     */
    updateCache : function(guides){
        aeroStorage.setItem('aero:guides', JSON.stringify(guides));
    },

    /**
     * @function Get all the guides in the system
     * @param {function} callback function
     * @param force guide reload
     */
    getAll : function(callback, force){

        //Auto start for first time only
        if(aeroStorage.getItem('aero:guide:auto')){
            //Clear cache for completed
            force = true;
            aeroStorage.removeItem('aero:guide:auto');
        }

        //Get cache
        var oldData = null;
        var ls = aeroStorage.getItem('aero:guides');
        var cache = aeroStorage.getItem('aero:cache');
        var locale = aeroStorage.getItem('aero:locale');

        if(!cache) cache = AeroStep.cache;
        if(!locale) cache = AeroStep.locale;

        cache = parseInt(cache);

        //Clear cache
        if(cache != AeroStep.cache || locale != AeroStep.locale) {
            oldData = JSON.parse(ls);
            aeroStorage.removeItem('aero:guides');

            //Clear cache
            ls = null;
        }

        //Local or Server storage loader
        if(!ls || force){

            Aero.log("Loading from SS", "success");
            Aero.send(Aero.model.guide.url, { enduser: Aero.constants.USERNAME }, function(guides){

                //Notify of new
                if(oldData) {
                    var diff = guides.length - oldData.length;
                    if (diff > 0) $q('body').data('newguides', diff);
                }

                aeroStorage.setItem('aero:cache', AeroStep.cache);
                aeroStorage.setItem('aero:locale', AeroStep.locale);
                aeroStorage.setItem('aero:guides', JSON.stringify(guides));
                if(callback) callback(guides);
            });
        }else{
            Aero.log("Loading from LS", "success");
            callback(JSON.parse(ls));
        }
    },

    /**
     *  Get a guide by id
     */
    get : function(id, callback){
        Aero.send(Aero.model.guide.url, { id : id }, function(guide){
            if(callback) callback(guide);
        });
    },


    /**
     *  Get a guide by id
     */
    getByTerm : function(term, callback){
        Aero.send(Aero.model.guide.urlSearch, { term : term }, function(guide){
            if(callback) callback(guide);
        });
    },

    /**
     * @function Create a new guide
     * @param {object} guide data
     * @param {function} callback function
     */
    create : function(guide, callback){
        Aero.send(Aero.model.guide.url, guide, function(r){
            Aero.model.guide.update(callback, r);
        }, "POST");
    },

    /**
     * @function Update guide data
     * @param {object} guide data
     * @param {function} callback function
     */
    update : function(guide, callback){
        Aero.send(Aero.model.guide.url, guide, function(){
            Aero.model.guide.update();
            if(callback) callback();
        }, "PUT");
    },

    /**
     * @function Delete a guide
     * @param {integer} id
     */
    destroy : function(id){
        Aero.send(Aero.model.guide.url, { id : id }, function(){
            Aero.model.guide.update();
        }, "DELETE");
    }
};

/**
 * Controls events for the guides and steps sidebars
 * @author Mike Priest
 * @type {{setScrollable: Function, show: Function, hide: Function, notify: Function, setEvents: Function}}
 */
Aero.view.sidebar = {

    /**
     *  @function setScrollable area
     */
    setScrollable : function(){
        var w = $q(window).height() - ($q('.aero-head').outerHeight() + $q('.aero-foot').outerHeight());
        var t = $q('.aero-guide-title').outerHeight();
        var a = $q('.aero-add-step').length > 0 ? $q('.aero-add-step').outerHeight() : 0;

        $q('.aero-guides, .aero-steps').height(w - (t + a));
    },

    /**
     * @function show sidebar
     * @param store {boolean}
     * @param time {int}
     */
    show : function(store, time){

        if(!time) time - 750;

        $q('.aero-sidebar')
            .stop()
            .animate({ right: "-50px" }, time, 'easeInOutBack', function() {})
            .addClass('open');

        if(store) aeroStorage.setItem('aero:sidebar:open', 1, function(){}, true);
    },

    /**
     * @function hide sidebar
     * @param store {boolean} the state
     */
    hide : function(store){

        $q('.aero-sidebar')
            .stop()
            .animate({ right: -($q('.aero-sidebar').outerWidth(true)) }, 300, 'swing', function() {})
            .removeClass('open');

        //Close admin windows
        if($q('.aero-admin-wrapper').length){
            $q('.aero-admin-wrapper').remove();
            $q('#aero-tab').css('left', '-44px');
        }
        $q('.aero-blanket, .aero-edit-active').remove();
        if(store)  aeroStorage.setItem('aero:sidebar:open', 0, function(){}, true);
    },

    /**
     *  @function notify user of new guides
     */
    notify : function(){
        $q('#aero-tab').prepend('<span class="aero-not">'+$q('body').data('newguides')+'</span>');
    },

    /**
     *  @function setEvents
     */
    setEvents : function(){
        var self = this;
        var sizing;

        //Resize window reposition
        window.onresize = function(){
            clearTimeout(sizing);
            sizing = setTimeout(function(){
                self.setScrollable();

                //Reposition overlays
                var $ar = $q('.aero-restrict');
                if($ar.length == 0) return;

                $ar.each(function(){
                    Aero.view.guide.positionRestrict($q(this));
                });

            }, 100);
        };

        //Tab click
        $q('body').off("click.atc").on("click.atc", "#aero-tab a", function(){
            if($q('.aero-sidebar').hasClass('open')){
                self.hide(true);
            }else{
                self.show(true);
            }
        });

        //Tab dragging
        $q('#aero-tab').draggable({
            axis: "y",
            distance: 10,
            containment: 'body',
            stop: function( event, ui ) {
                aeroStorage.setItem('aero:session:tab', ui.offset.top, function(){}, true);
            }
        });

        $q(window).off('hashchange.hashn').on('hashchange.hashn', function() {
            Aero.hashChange = true;
            AeroStep.ready(function(){
                setTimeout(function () {
                    Aero.hashChange = false;
                    Aero.guide.init();
                }, 500);
            }, AeroStep.required);
        });
    }
};
