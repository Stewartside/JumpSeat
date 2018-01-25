"use strict";

/**
 * ToolTip Object
 * @author Mike Priest
 * @type {{options: {labels: {end: *, next: *, prev: *}, template: Function}, setGuide: Function, setStep: Function, redirect: Function, start: Function, stop: Function, next: Function, prev: Function, jumpTo: Function, findStep: Function, findStepTimeout: Function, observe: Function, beforeShow: Function, show: Function, hide: Function, buildNav: Function, setPosition: Function, containIn: Function, scrollToElement: Function, isReturnBranch: Function, renderBranch: Function, renderException: Function, setNav: Function, sayCongrats: Function, setEvents: Function}}
 */
Aero.tip = {

	/**
	 *  Default settings
	 */
    tries : 0,
	options : {

        //Multilingual
		labels: {
			end: AeroStep.lang['finished'],
			next: AeroStep.lang['next'],
			prev: AeroStep.lang['prev']
		},

		template: function(step){
			var size = "",
				title = "",
				quiz = "",
                media = "";
			var pos = step.position ? step.position : "top";
			var now = parseInt(Aero.tip._current) + 1;
			var total = (Aero.tip._guide) ? Aero.tip._guide.step.length : 0;

			if(isNaN(step.size)){
				size = (step.size && step.size != "") ? " aero-tip-"+step.size : "";
			}else{
				size = "' style='width:"+step.size+"px'";
			}

			//Replace hot words
			var hotwords = ['OVERVIEW', 'CLICK', 'CHOOSE', 'COPY', 'DRAG', 'FORK', 'NOTE', 'TIP', 'TYPE', 'SCROLL'];
            var titleImageTpl = '<img class="as-icon-TITLE" src="' + Aero.constants.PATH + 'assets/images/icons/TITLE.png" title="TITLE" />';

            for(var j in hotwords) {
                if(typeof hotwords[j] == "string"){
                    var title = (hotwords[j] == "OVERVIEW") ? "Overview" : "";
                    step.title = step.title.replace(hotwords[j], titleImageTpl.replace(/TITLE/g, hotwords[j].toLowerCase()) + " " + title);
            }}

			if(step.showTitle) title = '<div class="aero-tip-title">'+step.title+'<span></span><a title="Close Guide">&#10005;</a></div>';
			var progress = step.multi ? "" : "<div class='aero-tip-nav clearfix'><div class='aero-progress'><span>Step " + now +" of "+total+"</span></div></div>";

			//Clear progress on contextual tips
			if(!Aero.tip._guide) progress = "";

			//Does it have a Quiz?
			if(step.answers && step.answers.length > 0){
				quiz = Aero.view.quiz.render(step.answers, step.quizsize);
			}

			//Does it have media?
            if(step.embed || step.youtube){
                media = Aero.view.media.render(step);
            }

            var licrep = AeroStep.license == "Enterprise" ? '' : '<div class="aero-lic">Powered by <a href="http://www.jumpseat.io" target="_blank">JumpSeat</a></div>';

			return "<div id='"+step.id +"' class='aero-tip aero-tip-"+pos+size+"' style='display:none'>" +
                    "<div class='aero-tip-arrow'></div>" +
					"<div class='aero-tip-body'>"+title+step.body+quiz+media+"</div>" +
                    progress + licrep +
                    "<div class='aero-tip-draggable'></div>" +
	    	  "</div>";
		}
	},

    /**
     * Create Spotlight Effect
     * @param step
     * @todo complete spotlight feature
     */
    spotlight : function($tip, step){

         var $el, $window, $svg, $pos;


        $el = $q(step.loc);
        $window = {height: window.innerHeight, width: window.innerWidth};

        var baseHeight = 1 / $window.height;
        var baseWidth = 1 / $window.width;

        $pos = $el.offset();
        $pos.tl = {top: baseHeight * $pos.top, left: baseWidth * $pos.left };
        $pos.tr = {top: baseHeight * $pos.top, left: baseWidth * ($pos.left + $el.innerWidth())};
        $pos.br = {top: baseHeight * ($pos.top + $el.innerHeight()), left: baseWidth * ($pos.left + $el.innerWidth())};
        $pos.bl = {top: baseHeight * ($pos.top + $el.innerHeight()), left: baseWidth *$pos.left};


        $svg = '<svg width="0" height="0" class="aero-remove"><defs><clipPath id="clipArea" clipPathUnits="objectBoundingBox">';
        $svg += '<path d="M0,0 L1,0 L1,1 L0,1 L'+$pos.bl.left+','+$pos.bl.top+' L'+$pos.br.left+','+$pos.br.top+' L'+$pos.tr.left+','+$pos.tr.top+' L'+$pos.tl.left+','+$pos.tl.top+'  L'+$pos.bl.left+','+$pos.bl.top+' L0,1" />';
        $svg += '</clipPath></defs></svg>';
        
        $q('body').append($svg);
        $q('body').append('<div class="aero-remove aero-overlay"></div>');
    },

	/**
	 * @function Get step data
	 * @param {integer} id unique guide id
     * @returns {object} guide object
	 */
	setGuide : function(id, callback, force){

		var self = this;
			self._guide = false;

        aeroStorage.getItem('aero:session', function(ls){

            if(ls && !force) {

                //Start from session
                self._guide = JSON.parse(ls);
                Aero.view.step.render(self._guide);
                if(callback) callback();
            }else{

                //Start without session
                Aero.model.guide.byId(id, function (guide) {

                    //Set current
                    self._guide = guide;

                    //Set cookie
                    Aero.view.step.render(self._guide);

                    aeroStorage.setItem('aero:session', JSON.stringify(self._guide), function () {
                        if (callback) callback();
                    }, true);
                });
            }
        }, true);
	},

	/**
	 *  @function Set current step once shown
	 *  @param {Number} i index to set
	 */
	setStep : function(i, skipStore, callback) {
		this._current = parseInt(i);
		if(!skipStore) {
            aeroStorage.setItem('aero:session:current', this._current, function () {
                if (callback) callback();
            }, true);
        }else{
            if (callback) callback();
        }
	},

	/**
	 *  @function Redirect to correct page if needed
	 *  @param {string} url for step
	 */
	redirect : function(url, ignore, cds) {

		//Trailing hash
        var self = this;
		var skipTrim = false;
		var an = /#$/;
		var sl = /\/$/;
		var curUrl = document.URL;
        var cdsEnabled = false;

        //If cross domain
        var myHost = (cdsEnabled || aeroStorage.override) ? Aero.host : location.protocol + '//' + location.hostname + (location.port ? ':' + location.port : '');
        var full = cds ? cds : myHost;

		if(url == "/#/") skipTrim = true;
		if(!url) url = "";
        url = full + url;

        // @crossdomain
        // Replace for wild card apps
        if(!cds) url = url.replace(Aero.host, location.protocol + "//" + location.host);

		if(!skipTrim){
			//Remove trailing empty hash
			if(an.test(curUrl)) curUrl = curUrl.replace("#", "");
			if(sl.test(curUrl)) curUrl = curUrl.slice(0,-1);
		}

		//Replace
		url = AeroStep.getSubURL(url);

		if(ignore == "all") return false;

		if(ignore == "par"){
			curUrl = curUrl.split('?')[0];
			url = url.split('?')[0];
		}

		if(ignore == "anc"){
			curUrl = curUrl.split('#')[0];
			url = url.split('#')[0];
		}

		if(curUrl != url){
			var tried = aeroStorage.getItem('aero:session:404');
			var tries = (tried) ? (parseInt(tried) + 1) : 0;

			aeroStorage.setItem('aero:session:404', tries);

			if(tries > 1){
				Aero.confirm({
					ok : AeroStep.lang['done'],
					title : AeroStep.lang['notfound'],
					msg : AeroStep.lang['urlloop'] + "</br></br><strong>" + url + "</strong>",
					onConfirm : function(){
						Aero.tip.stop();
					},
                    onClose : function(){
                        Aero.view.step.setState(aeroStorage.getItem('aero:session:pause'), 'forward');
                    }
				});
			}else{
                //First step, just take me there
                if(Aero.forceTakeme || Aero.navigating || Aero.tip._current == 0){
                    Aero.navigating = false;
                    window.location = url;

                    return true;
                }

                //Not the first step, choose where you go
				Aero.confirm({
					ok : AeroStep.lang['oopst'],
                    cancel : AeroStep.lang['oopsm'],
					title : AeroStep.lang['oops'],
					msg : AeroStep.lang['oopsdesc'],
					onConfirm : function(){
						window.location = url;
					},
                    onCancel : function(){
                        Aero.forceTakeme = true;
                        var i = Aero.tip._current - 1;

                        self.setStep(i, false, function() {
                            Aero.tip.jumpTo(i);
                        });
                    },
                    onClose : function(){
                        Aero.view.step.setState(aeroStorage.getItem('aero:session:pause'), 'forward');
                    }
				});
			}
			return true;
		}

		return false;
	},

    /**
     *  @function Validate if the user can move on
     */
    validate : function(){

        var valid = true;

        //Check for Quiz
        var step = Aero.step.get(this._current);
        if(step.answers && step.answers.length > 0) valid = Aero.view.quiz.validate(step);

        return valid;
    },

	/**
	 * @function Start a guide
     * @param {string} id unique guide id
     * @returns {void}
	 */
	start : function(id, step, force){
		var s = step ? step : 0;
        var self = this;

        //Cross Domain
        aeroStorage.getItem('aero:session:cds', function(cds){

            if(!cds) {
                //Cross Domain
                aeroStorage.setItem('aero:session:cds', Aero.host, function () {
                }, true);
            }else{
                Aero.host = cds;
            }

            self._forward = true;
            self.setGuide(id, function() {

                self.setNav();
                self.beforeShow(s);

                Aero.audit.init(function(){
                    self.setNav();

                    //Remove restrictions
                    $q('.aero-restrict').remove();

                    //Start the tips!
                    self.beforeShow(s);
                });
            }, force);
        }, true);
	},

	/**
	 * @function Stop the guide
     * @returns {void}
	 */
	stop : function(){

        var _this = this;

        //Validate
        if(!_this.validate()) return;

        Aero.audit.save();

		//Check cross domain is active
		aeroStorage.getItem('aero:session:cds', function (r) {

			if(r) {
                Aero.host = AeroStep.host;

				//Remove it
				aeroStorage.removeItem('aero:sidebar:cdshost', true);
                aeroStorage.removeItem('aero:session:cds', true);

                //Reload window
                aeroStorage.removeItem('aero:guides', null);
                aeroStorage.removeItem('aero:cache', null);
			}

			//Remove play button if exists
			$q('.aero-play').remove();

			// @todo clear on restrict and auto only
			aeroStorage.setItem('aero:cache', -1);

			//Return to branch?
			var isReturn = _this.isReturnBranch();

			if(!isReturn) {
                //Stop recording
                if(Aero.view.step.record) Aero.view.step.record.off();

				//Last step end?
				if (Aero.tip._guide.step && Aero.tip._current == (Aero.tip._guide.step.length - 1)) _this.sayCongrats();

				_this.setStep(null);
				_this.hide(_this._current);
				clearInterval(_this.ob);

				//Clear session
				AeroStep.session.destroy();
				Aero.tip._guide = null;
				Aero.guide.init();
			}
		}, true);
	},

	/**
	 * @function Move to next step
     * @returns {void}
	 */
	next : function(){

        //Validate
        if(!this.validate()) return;

        //Last step
        if(aeroStorage.getItem('aero:session:end') == "1"){
            if(!AeroStep.admin) self.stop();
            return;
        }

		var step = Aero.step.get(this._current);

		this._forward = true;
		clearInterval(this.ob);

		aeroStorage.removeItem('aero:session:pause');

		if(step.next != -1){
			this.hide(this._current);
			this.beforeShow(step.next);
		}
	},

	/**
	 * @function Move to previous step
     * @returns {void}
	 */
	prev : function(){
		var step = Aero.step.get(this._current);
		this._forward = false;
		clearInterval(this.ob);

		aeroStorage.removeItem('aero:session:pause');

		if(step.prev != -1){
			this.hide(this._current);
			this.beforeShow(step.prev);
		}
	},

	/**
	 * @function Jump to specific step
     * @param {integer} i Step number
     * @returns {void}
	 */
	jumpTo : function(i){

        if(aeroStorage.getItem('aero:session:end') == "1"){
            if(!AeroStep.admin) {
                self.stop();
            }else{
                aeroStorage.removeItem('aero:session:end');
            }
        } else {
            var step = Aero.step.get(i);
            this._forward = true;
            clearInterval(this.ob);
            Aero.jump = true;

            $q('.aero-play').remove();

            aeroStorage.removeItem('aero:session:pause');

            if (step) {
                this.hide(this._current);
                this.beforeShow(i);
            }
        }
	},

	/**
	 * @function Find step element
     * @param {string} Locator path
     * @returns {object} element
	 */
	findStep : function(step){

		var $el = false;

        //Default orphan to body
		if(step.position == "orphan") step.loc = "body";

		if(step.loc){
			$el = step.isFrame ? $q(step.framePath).contents().find(step.loc) : $q(step.loc);

			if($el.length === 0 || !$el.is(":visible") || $el.css("visibility") == "hidden")
				$el = false;
		}

		return $el;
	},

	/**
	 * @function Look for step until timeout
     * @param {string} Find or loss type
	 * @param {object} step object
	 * @param {integer} Seconds until timeout
     * @returns {void}
	 */
	findStepTimeout : function(type, step, time, i){

        var self = this;
        if(Aero.hashChange) return;
        clearTimeout(Aero.timeFindStep);

        if($q('.aero-modal:visible').length > 0) return;

		if(self.tries < time * 2){
			Aero.timeFindStep = setTimeout(function(){
				self.hide(i - 1);

                var before = (self._forward) ? step.beforeCode : self._guide.step[i].beforeCode;

                //Fire custom code
                if (before) {
                    try {
                        eval(before);
                    } catch (err) {
                        Aero.log('Before show code is broken: ' + err, 'error');
                    }
                }

				self.show(i);
				self.tries++;
			}, 500);
		}else{
            //Finished Trying
            Aero.view.step.setState(i, "missing");
            var prefix = type == "loss" ? "loss" : "";

            if(step[type] == "alert"){
                this.renderException(step[prefix + "alert"], step[prefix + "alertContent"], true);
            }
            else if(step[type] == "back"){
                Aero.view.step.setState(i, "missing");
                this.prev();
            }
            else if(step[type] == "skip"){
                self.next();
            }
            else if(step[type] == "skipto") {
				self.jumpTo(step[prefix + "skipto"]);

				for (var i = Aero.tip._current; i <= step[prefix + "skipto"] - 1; i++) {
					Aero.view.step.setState(i, "missing");
				}
			} else if(step[type] == "ignore"){
				//Do nothing
				return;
            }else {
                this.renderException("Step is Missing", "To fix this, try:" +
					"<ul style='font-size:14px'>" +
					"<li>Using a more generic element</li>" +
					"<li>Increase the step wait timer</li>" +
					"<li>Check the previous step navigation:" +
					"<ul><li>Page changed or refreshed - when steps move between pages</li>" +
					"<li>Next item visible - on the same page, but has an animation or time delay when showing the next step</li>" +
					"</ul></li></ul>" +
					"", true);
            }
		}
	},


	/**
	 * @function Observe element to progress
     * @param {object} $el Element to watch
     * @param {integer} i Step index
     * @returns {void}
	 */
	observe : function(i, isFound, callback){
		var self = this;
    	var step = Aero.step.get(i);

        if(isFound){
            clearInterval(self.obf);

            //Every half second
            self.obf = setInterval(function(){
                //Found the step?
                var found = self.findStep(step);
                Aero.navigating = true;
                Aero.log("Observing for item visible", "info");

                //If found and callback on waiting
                if (found) {
                    Aero.log("Observe found item", "success");
                    clearInterval(self.obf);
                    callback();
                }
            }, 500);
        }else {
            clearInterval(self.ob);

            //Only every one second
            self.ob = setInterval(function(){
                Aero.log("Observing for item not visible", "info");

                //Found the step?
                var found = self.findStep(step);

                //If found and callback on missing
                if(!found) {

                    //Wait for next step to be set
                    setTimeout(function(){
                        //Don't do anything for steps in transition
                        if(Aero.navigating) {
                            Aero.navigating = false;
                            clearInterval(self.ob);
                            return;
                        }

                        Aero.log("Observe lost item", "warn");
                        callback();
                        clearInterval(self.ob);
                    }, 500);
                }
            }, 1000);
        }
    },

    /**
     * @function Before showing a step
     * @param {integer} i Step number
     * @returns {void}
     */
    beforeShow : function(i){
        var self = this;
        self.tries = 1;

        //Get Step Info
        var step = Aero.step.get(i);

        self.setStep(i, false, function() {

            //Default wait
            var wait = 200;
            var before = (self._forward) ? step.beforeCode : self._guide.step[i].beforeCode;
            if (step.pause) wait = parseInt(step.pause) * 1000;

            //Fire custom code
            if (before) {
                try {
                    eval(before);
                } catch (err) {
                    Aero.log('Before show code is broken: ' + err, 'error');
                }
            }

            //Call Show Step
            clearTimeout(Aero.timeBeforeShow);
            Aero.timeBeforeShow = setTimeout(function () {
                if (!Aero.hashChange) self.show(i);
            }, wait);
        });
    },

    /**
     * @function Show a step
     * @param {integer} i Step number
     * @returns {void}
     */
    show : function(i, skipStore){
        var $tip, $el, step, self;

        self = this;

        //Stop trying
        clearTimeout(Aero.timeFindStep);

        //Empty guide
        if (Aero.tip._guide.step.length == 0) return;

        //Default current step
        if (typeof i == "undefined") i = self._current;
        if (!Aero.tip._guide || i > Aero.tip._guide.step.length || i < 0) return;
        aeroStorage.setItem("aero:session:forward", true);

        //Get step data
        step = Aero.step.get(i);

        //Setsidebar based on step style
        aeroStorage.setItem('aero:sidebar:open', step.sidebar ? 0 : 1, function(){}, true);

        //Set the step and go for it
        self.setStep(i, skipStore, function() {

            //Close sidebar?
            if (step.sidebar) {
                //Timeout required for bug
                setTimeout("Aero.view.sidebar.hide();", 100);
            } else {
                aeroStorage.getItem('aero:sidebar:open', function (s) {
                    if (!$q('.aero-sidebar').hasClass('open') && s == "1") Aero.view.sidebar.show();
                }, true);
            }

            //Go find the element step
            $el = self.findStep(step, i);

            //Check for redirect (admins don't need to)
            if (AeroStep.admin && aeroStorage.getItem('aero:session:pause') && aeroStorage.getItem('aero:session:forwardUrl') !== document.URL) {
                Aero.view.step.setState(aeroStorage.getItem('aero:session:pause'), 'forward');

                var $play = $q('<a class="aero-play aero-play-icon"><span></span></a>');
				var $overlay = $q('<div class="aero-play aero-play-shadow"></div>');

                $play.css({
                    top: $q(window).height() / 2 - 150,
                    left: $q(window).width() / 2 - 100
                });

				$overlay.css({ opacity : 0.4 });
                $q('body').append($play, $overlay);

                //Continue session
                if(Aero.view.step.record && aeroStorage.getItem('aero:session:recording')) {
                    Aero.view.step.record.on(true);
                }

                return;
            } else {
                if (self.redirect(step.url, step.noUrl, step.cds)) return;
            }

            //Clear 404 watcher
            aeroStorage.removeItem('aero:session:404');

            //Found element?
            if ($el && $el.is(':visible')) {
                Aero.log('Found Step ' + i, 'success');

                //Wait and see if it disappears
                Aero.navigating = false;
                Aero.tip.isMoving = null;
                self.observe(i, false, function(){
                    self.findStepTimeout("loss", step, 0, i);
                });

                //Add input mask
                if (step.mask && step.mask != "") $el.mask(step.mask);

                //Update audit
                Aero.audit.update();

                //Setup Cross Domain and Pause Guide
                if (AeroStep.admin) {
                    aeroStorage.setItem('aero:sidebar:cdshost', i + "~" + window.location.host, function () {}, true);
                    aeroStorage.setItem("aero:session:pause", i);
                    aeroStorage.setItem("aero:session:forwardUrl", document.URL);
                }

                //Get tip template
                $tip = $q(self.options.template(step));

                //Apply branch options
                if (step.branch) {
                    $tip = self.renderBranch($tip, step.branch, step.branchstep, step['return']);
                }

                //Build Navigation
                $tip = self.buildNav($tip, step);

                //Add Flag
                $q('.ae-active-el').removeClass('ae-active-el');
                $el.addClass('ae-active-el');

                //Draw
                $q('body').append($tip);
                Aero.view.step.setState(i);

				try {
					if (step.onCode) eval(step.onCode);
				}
				catch(err){
					Aero.log('On show code error: ' + err, 'error');
				}

                if(step.spotlight){
                    self.spotlight($tip, step);
                }
                self.setPosition($el, $tip, step.position);
                self.setEvents($el, step.nav, $tip, step.position);

                //Don't scroll orphans
                if(step.position != "orphan") {
                    self.scrollToElement($el);
                }else{
                    $q('.aero-tip').fadeIn(200);
                }
            } else {
                //Missing steps
                if (step.tries && step.tries > 0) {
                    self.findStepTimeout("miss", step, step.tries, i);
                    return;
                }
                else {
                    if (!step.multi) {
                        clearTimeout(Aero.timeFindStep);

                        //Default skip
                        Aero.log('Skipping step: ' + i + ' with loc:' + step.loc, 'error');
                        Aero.view.step.setState(i, "missing");

                        if (i < Aero.tip._guide.step.length) {
                            if (self._forward) {
                                self.next();
                            } else {
                                self.prev();
                            }
                        }
                    }
                }
            }

            // @todo on page load try multi
            var d = (self._forward) ? 1 : -1;
            var isMulti = false;

            if (self._forward && Aero.step.get(i + d).multi || !self._forward && step.multi) isMulti = true;

            if (Aero.jump && step.multi) {
                isMulti = true;
                d = -1;
                self._forward = false;
            }

            if (isMulti) self.show(i + d, true);
            Aero.jump = null;
        });
	},

	/**
	 * @function Hide a step
     * @param {integer} Step number to hide
     * @returns {void}
	 */
	hide : function(i){
		var step = Aero.step.get(i);

        //Ignore missing steps
        if(!$q('.aero-tip:visible').length > 0) return;

        if(step.offCode){
            try {
                eval(step.offCode);
            }catch(err){
                Aero.log('Before hide code is broken: ' + err,'error');
            }
        }

		$q('.aero-active, .aero-showElement').removeClass('aero-active aero-showElement aero-relativePosition');
		$q('.aero-tip, .aero-remove').remove();

		if(step.afterCode){
			try {
				eval(step.afterCode);
			}catch(err){
				Aero.log('After hide code is broken: ' + err,'error');
			}
		}
	},

	/**
	 * @function Position tool-tip inline with element and within document
     * @param {integer} i Step number
     * @returns {void}
	 */
	buildNav : function($el, step){
		var nav = "";
		var skipNext = false;

		//Only show next on next nav
		if(!step.nav.next && !step.nav.blur) skipNext = true;
        if(step.nav.length == 0) skipNext = false;

		if(!step.noNav){
			if(step.next == -1) nav += "<a class='aero-btn-end'>"+this.options.labels.end+"</a>";
			if(!step.noNext && !skipNext && step.next != -1) nav += "<a class='aero-btn-next'>"+this.options.labels.next+"</a>";
			if(!step.noPrev && step.prev != -1) nav += "<a class='aero-btn-prev'>"+this.options.labels.prev+"</a>";
		}
		$el.find('.aero-tip-nav').append(nav);

		return $el;
	},

	/**
	 * @function Position tool-tip inline with element and within document
     * @param {integer} i Step number
     * @returns {void}
	 */
	setPosition : function($el, $tip, position) {
        var pos = {};
        var off = $el.offset();
        var tipMidX = $tip.outerWidth() / 2;
        var tipMidY = $tip.outerHeight();
        var elMidX = off.left + ($el.outerWidth() / 2);
        var elMidY = off.top + ($el.outerHeight() / 2);
        var $tri = $tip.find('.aero-tip-arrow');

        pos.tLeft = tipMidX - ($tri.outerWidth() / 2);
        pos.tTop = ($tip.outerHeight() / 2) - ($tri.outerHeight() / 2);

        switch (position) {
            case "top":
                pos.left = elMidX - tipMidX;
                pos.top = off.top - tipMidY - $tip.find('.aero-tip-arrow').outerHeight();
                break;
            case "bottom":
                pos.left = elMidX - tipMidX;
                pos.top = off.top + $el.outerHeight();
                break;
            case "left":
                pos.left = off.left - $tip.outerWidth() - $tip.find('.aero-tip-arrow').outerWidth();
                pos.top = elMidY - (tipMidY / 2);
                break;
            case "right":
                pos.left = off.left + $el.outerWidth();
                pos.top = elMidY - (tipMidY / 2);
                break;
            case "orphan":
                pos.left = $q(window).width() / 2 - tipMidX;
                pos.top = $q(window).height() / 2 - (tipMidY / 2);
                break;
        }

        //Snap to window
        pos = this.containIn(document, $tip, pos, position);

        //Set position
        $tip.css({"left": pos.left, "top": pos.top});

		//Set triangle
        if ($tip.hasClass('aero-tip-bottom') || $tip.hasClass('aero-tip-top')) $tri.css({'left': pos.tLeft});
        if ($tip.hasClass('aero-tip-left') || $tip.hasClass('aero-tip-right')) $tri.css({'top': pos.tTop});
        if ($tip.hasClass('aero-tip-top')) $tri.css({'top': 'auto'});

    },

	/**
	 * @function Scroll tool-tip into view
     * @returns {void}
	 */
	containIn : function(container, $tip, pos, position){

		//Window
		var winH = $q(container).height();
		var winW = $q(window).width();
		var rightDiff = pos.left + $tip.outerWidth() - winW;
		var bottomDiff = pos.top + $tip.outerHeight() - winH;

		//Push right in
		if(rightDiff > 0){
			if(position == "bottom" || position == "top") pos.tLeft += rightDiff;
			pos.left -= rightDiff;
		}

		//Push left in
		if(pos.left < 0){
			if(position == "bottom" || position == "top") pos.tLeft += pos.left;
			pos.left -= pos.left;
		}

		//Push top in
		if(pos.top < 0){
			if(position == "left" || position == "right") pos.tTop += pos.top;
			pos.top -= pos.top;
		}

		//Push bottom up
		if(bottomDiff > 0 && position == "bottom"){
			if(position == "left" || position == "right") pos.tTop += bottomDiff;
			pos.top -= bottomDiff;
		}

		//Auto open or close sidebar
		var r = pos.left + $tip.outerWidth();

		if(r > (winW - 270)){
            //Need: Timing issue with cross domain ls
            aeroStorage.getItem('aero:sidebar:open', function(s){
                Aero.view.sidebar.hide();
            }, true);
		}else {
            aeroStorage.getItem('aero:sidebar:open', function(o){
                if(o == "1"){
                    Aero.view.sidebar.show();
                }
            }, true);

            //Center in free space
            //if(position == "orphan") pos.left -= 115;
		}

		return pos;
	},

	/**
	 * @function Scroll tool-tip into view
     * @returns {void}
	 */
	scrollToElement : function($el){

	    var $tip, $scrollParent, nudge, winH,scroll;

        $tip = $q('.aero-tip:eq(0)');
        $tip.show();
        $scrollParent = Aero.pos.isScrollable($el);


		if (!$el.visible(false, $scrollParent) || !$tip.visible(false)) {

		    winH = $scrollParent ? $scrollParent.height() / 2 : $q(window).height()/2;

            //Check if $el is part of scrollable list
            nudge = $scrollParent ? $scrollParent.scrollTop() - $scrollParent.offset().top : 0;
            $scrollParent = $scrollParent ? $scrollParent : $q('body, html');
            scroll = nudge + $tip.offset().top - winH + $tip.outerHeight() / 2;

            $tip.hide();

            $scrollParent.stop().animate({
                scrollTop: scroll
            }, 500, function () {
                $q('.aero-tip').fadeIn(200);
            });
		}else{
			$tip.hide();
			$q('.aero-tip').fadeIn(200);
		}
	},

	/**
	 *  Return back to branch
	 */
	isReturnBranch : function(){

		var id = aeroStorage.getItem('aero:session:branch:returnid');
		var to = aeroStorage.getItem('aero:session:branch:returnto');
		if(!id) return false;
        if(!to || to == "") to = 0;

		Aero.confirm({
			ok : "Return",
			cancel : "End Guide",
			title : "Branch complete",
			msg : "You have completed this branch, we will now move you back to the original guide.",
			onConfirm : function(){
                //Update audit
                Aero.audit.save();

			    //Hide the current in case same page
				Aero.tip.hide();

				//Start return
				Aero.tip.start(id, parseInt(to), true);

                aeroStorage.removeItem('aero:session:branch:returnid');
                aeroStorage.removeItem('aero:session:branch:returnto');
			},
			onCancel : function(){

                aeroStorage.removeItem('aero:session:branch:returnid');
				Aero.tip.stop();
			}
		});

		return true;
	},

	/**
	 * @function Display branch options
     * @param {string} guideid
     * @returns {void}
	 */
	renderBranch : function($tip, guideid, step, returnStep){

		var body = $tip.find('.aero-tip-body').html();
        var tpl = body + "<div class='aero-branch'></div>";

        setTimeout(function(){
            for(i in guideid) { if(typeof guideid[i] == "string"){
                Aero.guide.get(guideid[i], function(r) {
                    if( $q('.aero-branch').find('#b-' + r.id).length == 0)
                        $q('.aero-branch').append("<a id='b-"+r.id+"' data-returnid='" + Aero.tip._guide.id + "' data-returnto='" + returnStep + "' data-guideid='" + r.id + "' class='aero-start'>" + r.title + "</a>");
                    $q(window).trigger('resize');
                });
            }}
        }, 250);

        //tpl += "<a class='aero-continue'>Continue with this guide</a></div>";
        $tip.find('.aero-tip-body').html(tpl);
		return $tip;
	},

	/**
	 * @function Display exceiption to user when element cannot be found
     * @param {object} options for alert dialog
     * @returns {void}
	 */
	renderException : function(title, body, goBack){

        var dropdown = "";

        //Optional move to step for admins
        if(goBack && AeroStep.admin) {
            dropdown = '<div class="aero-section aero-goto"><label>Go back to step:</label><select id="aero-goto">';

            for (var i = 0; i < Aero.tip._guide.step.length; i++) {
                var s = i == (Aero.tip._current - 1) ? 'selected="selected"' : '';
                dropdown += '<option ' + s + 'value="' + i + '">' + (i + 1) + ': '+ Aero.tip._guide.step[i].title + '</option>';
            }
            dropdown += '</select></div>';
        }

        Aero.confirm({
			ok : "End Guide",
            cancel : goBack ? "Go Back" : "Ok",
			title : title,
			msg : body + dropdown,
			onConfirm : function(){
				Aero.tip.stop();
			},
			onCancel : function(){
                if(goBack && AeroStep.admin){
                    Aero.tip.jumpTo(parseInt($q('#aero-goto').val()));
                }
                else if(goBack){
                    Aero.tip.prev();
                }
			},
            onClose : function(){
                Aero.view.step.setState(aeroStorage.getItem('aero:session:pause'), 'forward');
            }
		});
	},

	/**
	 * @function Display exceiption to user when element cannot be found
     * @param {object} options for alert dialog
     * @returns {void}
	 */
	setNav : function(){
		var self = this;

		$q('body')
			.off('mousedown.aPe').on('mousedown.aPe', '.aero-btn-prev', function(){
                Aero.navigating = true;
                self.prev();

                return false;
			})
			.off('click.aEd').on('click.aEd', '.aero-btn-end', function(){
				self.stop();
			});
	},

	/**
	 *  @function Say congratulations
	 *  @param {string} session
	 */
	sayCongrats : function(){
		aeroStorage.getItem("aero:session", function(ls){
			var guide = JSON.parse(ls);

			if(!AeroStep.admin){
				Aero.confirm({
					ok : AeroStep.lang['ok'],
                    cancel: "",
					title : AeroStep.lang['gfinished'],
					msg : AeroStep.lang['congrats'] + guide.title,
					onConfirm : function(){
						AeroStep.session.destroy();
					}
				});
			}
		}, true);
	},

	/**
	 * @function Setup navigation for tip
     * @param {object} $el Element
     * @returns {string} $nav Navigation type
	 */
	setEvents : function($el, nav, $tip, position){
		var self = this;

		//Watch
		$q(document).off("scroll.scw").on("scroll.scw" + Aero.tip._current, function(){ self.setPosition($el, $tip, position);  }, 250);
		$q('div *:not(".aero-steps")').off("scroll.scd").on("scroll.scd" + Aero.tip._current, function(){ self.setPosition($el, $tip, position); }, 250);

        //Draggable tips
        $q('.aero-tip').draggable({ handle: "div.aero-tip-draggable" });

        //Tip X button
        $q('body').off('click.ctxx').on('click.ctxx', '.aero-tip-title a', function(){
            Aero.tip.stop();
        });

		//Resize window reposition
        $q(window).on("resize", function(){
            self.setPosition($el, $tip, position);
            Aero.view.sidebar.setScrollable();
		}, 250);

		//Is last step?
		aeroStorage.removeItem('aero:session:end');
		if(parseInt($q('.aero-tip:last').attr('id').replace('astep-', '')) == (Aero.tip._guide.step.length - 1)){
			aeroStorage.setItem('aero:session:end', 1);
		}

		//Branch continue
		$q('body').off('click.branchc').on('click.branchc', '.aero-continue', function(){
			Aero.tip.next();
		});

		//Branch start
		$q('body').off('click.branchs').on('click.branchs', '.aero-start', function(){

			aeroStorage.setItem('aero:session:branch:returnid', $q(this).data('returnid'));
			aeroStorage.setItem('aero:session:branch:returnto', $q(this).data('returnto'));
            aeroStorage.setItem('aero:session:branch:audit', 1);

			Aero.tip.hide();
			Aero.tip.start($q(this).data('guideid'), 0, true);
		});

        //Default for next
        $q('body').off('mousedown.aNe').on('mousedown.aNe', '.aero-btn-next', function(){
            Aero.navigating = true;
            self.next();

			return false;
        });

		for(var n in nav){
            if (nav.hasOwnProperty(n)) {
			    //Default next
                if(nav[n] == -1) nav[n] = Aero.tip._current + 1;
                nav[n] = parseInt(nav[n]);

                switch(n) {
                    case "next":
                        $q('body').off('mousedown.aNe').on('mousedown.aNe', '.aero-btn-next', function(){
                            Aero.navigating = true;
                            if(!self.validate()) return;

                            self.jumpTo(nav[n]);

							return false;
                        });
                        break;

					case "click":
                        $el.off('click.aeronav').on('click.aeronav', $el, function(){

                            //Stop bubbling on move
                            $el.off('click.aeronav');

                            //Set nav
                            Aero.navigating = true;
                            if(!self.validate()) return;

                            self.jumpTo(nav[n]);
                        });
                        break;

					case "rclick":
						$el.off('contextmenu.aeronav').on('contextmenu.aeronav', $el, function(){

							//Stop bubbling on move
							$el.off('contextmenu.aeronav');

							//Set nav
							Aero.navigating = true;
							if(!self.validate()) return;

							self.jumpTo(nav[n]);
						});
						break;

                    case "mousedown":
                        $el.off('mousedown.aeronav').on('mousedown.aeronav', $el, function(){
                            Aero.navigating = true;
                            if(!self.validate()) return;

                            self.jumpTo(nav[n]);
                        });
                        break;

                    case "hover":
                        $el.off('mouseenter.aeronav').on('mouseenter.aeronav', $el, function(){
                            Aero.navigating = true;
                            if(!self.validate()) return;

                            setTimeout(function(){
                                self.jumpTo(nav[n]);
                            },500);
                        });
                        break;

                    case "blur":
                        $el.off('keydown.aeronav').on('keydown.aeronav', $el, function(e){
                            Aero.navigating = true;
                            if(!self.validate()) return;

                            var code = e.keyCode || e.which;
                            if(code == 13 || code == 9){
                                self.jumpTo(nav[n]);
                            }
                        });
						$el.off('focusout.aeronavb').on('focusout.aeronavb', $el, function(e){
                            Aero.navigating = true;
                            if(!self.validate()) return;
							self.jumpTo(nav[n]);
						});
                        break;

                    case "unload":
                        $q(window).off('beforeunload.aeronav').on('beforeunload.aeronav', function(){
                            Aero.navigating = true;
                            self.setStep(nav[n]);
                        });
                        break;

                    case "observe":
                        self.observe(self._current + 1, true, function(){
                            Aero.navigating = true;
                            self.next();
                        });
                        break;
                }
            }
		}
	}
};