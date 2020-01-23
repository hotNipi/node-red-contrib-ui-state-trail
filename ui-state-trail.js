/*
MIT License

Copyright (c) 2019 hotNipi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


module.exports = function (RED) {
	function HTML(config) {
		var data = JSON.stringify(config.initial);			
		var styles = String.raw`
		<style>
			.txt-{{unique}} {	
				font-size:1em;			
				fill: currentColor;											
			}	
			.txt-{{unique}}.small{
				font-size:0.7em;
			}			
		</style>`
		var gradient = String.raw`fill="url(#statra_gradi_{{unique}})"`		
		var layout = String.raw`		
			<svg preserveAspectRatio="xMidYMid meet" id="statra_svg_{{unique}}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" ng-init='init(`+data+`)'>
				<defs>
					<linearGradient id="statra_gradi_{{unique}}" x2="100%" y2="0%">
					
					</linearGradient>	
				</defs>
				<text ng-if="${config.height > 1}">
					<tspan id="statra_label_{{unique}}" class="txt-{{unique}}" text-anchor="middle" dominant-baseline="middle" x=`+config.exactwidth/2+` y="25%">
						`+config.label+`
					</tspan>
				</text>	
				<text ng-if="${config.blanklabel != ""}" font-style="italic">
					<tspan id="statra_blank_{{unique}}" class="txt-{{unique}}" text-anchor="middle" dominant-baseline="hanging" x=`+config.exactwidth/2+` y="`+config.stripe.y+`%">
						`+config.blanklabel+`
					</tspan>
				</text>	
				<rect id="statra_{{unique}}" x="`+config.stripe.x+`" y="`+config.stripe.y+`%" width="`+config.exactwidth+`" height="`+config.stripe.height+`" style="stroke:none"; ${gradient}/>	
			
				<text ng-repeat="x in [].constructor(${config.tickmarks}) track by $index" id=statra_tickval_{{unique}}_{{$index}} 
				class="txt-{{unique}} small" text-anchor="middle" dominant-baseline="baseline"
				 y="95%"></text>
				
				 <line ng-repeat="x in [].constructor(${config.tickmarks}) track by $index" id=statra_tick_{{unique}}_{{$index}} visibility="hidden" x1="0" y1="${config.stripe.y+config.stripe.height+3}" x2="0" y2="${config.stripe.y+config.stripe.height+9}" style="stroke:currentColor;stroke-width:1" />
				
			</svg>`			
		
		return String.raw`${styles}${layout}`;
	}

	function checkConfig(node, conf) {
		if (!conf || !conf.hasOwnProperty("group")) {
			node.error(RED._("ui_statetrail.error.no-group"));
			return false;
		}
		return true;
	}

	var ui = undefined;

	function StateTrailNode(config) {
		try {
			var node = this;			
			if (ui === undefined) {
				ui = RED.require("node-red-dashboard")(RED);
			}			
			RED.nodes.createNode(this, config);			
			
			var done = null;
			var range = null;
			var site = null;	
		
			var getSiteProperties = null;
			var getPosition = null;
			var checkPayload = null;
			var store = null;
			var generateGradient = null;
			var generateTicks = null;
			var getColor = null;
			var formatTime = null;
			var validType = null;
			var storage = null;
			var storeInContext = null;
			var prepareStorage = null;
			var stroageSpace = null;
			var showInfo = null;
			var ctx = node.context()
	
			if (checkConfig(node, config)) {
				
				checkPayload = function (input){
					var ret = null
					if(Array.isArray(input)){
						return []
					}					
					if(typeof input === 'object' && input !== null){
						if(input.hasOwnProperty('state') && input.hasOwnProperty("timestamp")){
							if(validType(input.state)){								
								ret = {state:input.state,time:input.timestamp}
							}
						}
					}
					else{
						if(validType(input)){
							ret = {state:input,time:new Date().getTime()}
						}
					}													
					return ret
				}
				validType = function (input) {
					for(var i = 0;i<config.states.length;i++){
						if(config.states[i].state === input){							
							return true
						}
					}
					return false
				}

				store = function (val){										
					if(Array.isArray(val)){
						storage = []
						config.max = new Date().getTime() 
						config.min = config.max - config.period
						storeInContext()
						return						
					}			
					if(storage.length == 0){
						storage.push(val)						
					}					
					else{
						var temp = [...storage]
						temp = temp.filter(el => el.time != val.time)						
						temp.push(val)											
						temp = temp.sort((a, b) => a.time - b.time)
						var idx = temp.length - 1
						if(idx > 1){
							if(temp[idx-2].state === temp[idx-1].state){
								temp.splice(idx-1,1)
							}
						}
						var time = temp[temp.length -1].time - config.period
						temp = temp.filter(el => el.time > time);
						storage = temp																									
					}
										
					config.min = storage[0].time
					config.insidemin = storage.length < 3 ? config.min :  storage[1].time
					config.max = storage[storage.length - 1].time
					showInfo()	
					storeInContext()					
				}				

				getSiteProperties = function(){
					var opts = null;					
					if (typeof ui.getSizes === "function") {			
						opts = {};
						opts.sizes = ui.getSizes();
						opts.theme = ui.getTheme();
					}	
					if(opts === null){
						node.log("Couldn't reach to the site parameters. Using hardcoded default parameters!")
						opts = {}
						opts.sizes = { sx: 48, sy: 48, gx: 4, gy: 4, cx: 4, cy: 4, px: 4, py: 4 }
						opts.theme = {'widget-backgroundColor':{value:"#097479"}}						
					}									
					return opts
				}
				range = function (n,p,a,r){					
					if (a == "clamp") {
                        if (n < p.minin) { n = p.minin; }
                        if (n > p.maxin) { n = p.maxin; }
                    }
                    if (a == "roll") {
                        var d = p.maxin - p.minin;
                        n = ((n - p.minin) % d + d) % d + p.minin;
                    }
                   	var v = ((n - p.minin) / (p.maxin - p.minin) * (p.maxout - p.minout)) + p.minout;
                    if (r) { v = Math.round(v); }
					return v					
				}	
				getPosition = function(target,min,max){
					var p =  {minin:min, maxin:max, minout:config.stripe.left, maxout:config.stripe.right}
					return range(target,p,'clamp',false)
				}
				
				getColor = function(type){
					for(var i = 0;i<config.states.length;i++){
						if(config.states[i].state === type){							
							return config.states[i].col
						}
					}
					return 'black'
				}
				
				generateGradient = function(){
					var ret = []
					if(storage.length < 2){
						return ret
					}
					var o = {p:0,c:getColor(storage[0].state),a:0}
					ret.push(o)
					o = {p:config.stripe.left,c:getColor(storage[0].state),a:1}
					ret.push(o)			
					var i
					var po
					po = getPosition(storage[1].time,config.insidemin,config.max)
					for(i = 1;i<storage.length-1;i++){						
						if(isNaN(po)){
							continue
						}					 	
						o = {p:po,c:getColor(storage[i-1].state),a:1}
						ret.push(o)						
						o = {p:po,c:getColor(storage[i].state),a:1}
						ret.push(o)
						po = getPosition(storage[i+1].time,config.insidemin,config.max)
					}
					o = {p:config.stripe.right,c:getColor(storage[storage.length-2].state),a:1}
					ret.push(o) 
					o = {p:config.stripe.right,c:getColor(storage[storage.length-1].state),a:1}
					ret.push(o) 
					o = {p:100,c:getColor(storage[storage.length-1].state),a:0}
					ret.push(o) 
					
					return ret
				}
				formatTime = function(stamp){
					var d = new Date(stamp);
					var hours = d.getHours(); 
					var minutes = d.getMinutes(); 
					var seconds = d.getSeconds(); 
					var t 
					 switch (config.timeformat) {
						case 'HH:mm:ss':
							t = hours.toString().padStart(2, '0') + ':' +  
							minutes.toString().padStart(2, '0') + ':' +  
							seconds.toString().padStart(2, '0');
							break;
						case 'HH:mm':
							t = hours.toString().padStart(2, '0') + ':' +  
							minutes.toString().padStart(2, '0');
							break;
						case 'mm:ss':
							t = minutes.toString().padStart(2, '0') + ':' +  
							seconds.toString().padStart(2, '0');
							break;	
						case 'mm':
							t = minutes.toString().padStart(2, '0');
							break;	
						case 'ss':
							t = seconds.toString().padStart(2, '0');
							break;	
						default:
							break;
					 }
										
					return t
				}
				
				generateTicks = function(){
					var ret = []
					if(storage.length < 2){
						return ret
					}
					var o 
					var po
					var t
					var total = config.max - config.min
					var step = (total / (config.tickmarks-1))
					for (let i = 0; i < config.tickmarks; i++) {
						t = storage[0].time + (step*i)						 					
						po = getPosition(t,config.min,config.max) 
						o = {x:po,v:formatTime(t),id:i}					
						ret.push(o) 						
					}					
					return ret
				}
				
				prepareStorage = function(){
					var contextStores = RED.settings.get('contextStorage')
					console.log('available stores:',contextStores)
					if(contextStores == undefined){						
						return
					}
					if(Object.keys(contextStores).length === 0 && contextStores.constructor === Object){						
						return
					}
					
					for (var key in contextStores) {
						if(contextStores[key].hasOwnProperty('module')){
							console.log('contextStores[key]',contextStores[key])
							if(contextStores[key].module == 'localfilesystem'){
								console.log('found:',contextStores[key].module)
								stroageSpace = key								
								return									
							}
						}						
					}
				}
				
				storeInContext = function (force){
					if(stroageSpace == null){
						return						
					}					
					if(force == true || config.persist == true){
						ctx.set('stateTrailStorage',storage, stroageSpace)
						ctx.set('stateTrailMax',config.max, stroageSpace)
						ctx.set('stateTrailMin',config.min, stroageSpace)	
					}
				}
				
				showInfo = function(){
					if(config.persist == false){
						node.status({});
						return
					}
					if(stroageSpace == null){
						node.status({fill:'grey',shape:"ring",text:"store: N/A"});
						return
					}
					var total = storage.length + 2
					var f = total > 700 ? "red" : total > 400 ? "yellow" : "green"
					var s = total > 200 ? "dot" : "ring"
					node.status({fill:f,shape:s,text:"store: "+stroageSpace+" count: "+total});
				}
				
				var group = RED.nodes.getNode(config.group);
				var site = getSiteProperties();				
				if(config.width == 0){ config.width = parseInt(group.config.width) || 1}
				if(config.height == 0) {config.height = parseInt(group.config.height) || 1}
				config.width = parseInt(config.width)
				config.height = parseInt(config.height) > 2 ? 2 : parseInt(config.height)
				config.exactwidth = parseInt(site.sizes.sx * config.width + site.sizes.cx * (config.width-1)) - 12;		
				config.exactheight = parseInt(site.sizes.sy * config.height + site.sizes.cy * (config.height-1)) - 12;
				
				var sh = (site.sizes.sy/2)-site.sizes.cy 
				var sy = config.height == 1 ? 0 : 50
				var edge = Math.max(config.timeformat.length,6) * 4 * 100 / config.exactwidth
				config.stripe = {height:sh,x:0,y:sy,left:edge,right:(100-edge)}
				config.period = parseInt(config.periodLimit) * parseInt(config.periodLimitUnit) * 1000
				config.tickmarks = config.tickmarks || 4				
				
				prepareStorage()
				
				storage = (config.persist && stroageSpace != null) ? ctx.get('stateTrailStorage',stroageSpace) || [] : []	
				config.max = (config.persist && stroageSpace != null) ? ctx.get('stateTrailMax',stroageSpace) || new Date().getTime() : new Date().getTime()
				config.min = (config.persist && stroageSpace != null) ? ctx.get('stateTrailMin',stroageSpace) || (config.max - config.period) : (config.max - config.period)
				config.insidemin = storage.length < 3 ? config.min :  storage[1].time
								
				storeInContext(true)				
				
				config.initial = {stops:generateGradient(),ticks:generateTicks()}
				
				var html = HTML(config);		
				console.log(config)
				done = ui.addWidget({
					node: node,
					order: config.order, 
					group: config.group,
					width: config.width,
					height: config.height,									
					format: html,					
					templateScope: "local",
					emitOnlyNewValues: false,
					forwardInputMessages: true,					
					storeFrontEndInputAsState: true,
					
					beforeEmit: function (msg) {
						if(msg.payload === undefined){
							return 
						}
						var validated = checkPayload(msg.payload)												
						if(validated === null){
							return {}
						}
						store(validated)
						
						msg.payload = {stops:generateGradient(),ticks:generateTicks()}
						return { msg };
					},
					
					initController: function ($scope) {																		
						$scope.unique = $scope.$eval('$id')
						$scope.svgns = 'http://www.w3.org/2000/svg';
						$scope.timeout = null
						
						$scope.init = function(data){
							update(data)
						}
						
						var update = function(data){
							var gradient = document.getElementById("statra_gradi_"+$scope.unique);
							if(!gradient){
								$scope.timeout = setTimeout(update.bind(null, data), 40);
								return
							}
							$scope.timeout = null
							updateGradient(data.stops)
							updateTicks(data.ticks)
						}
						
						var updateGradient = function (stops){
	 						var gradient = document.getElementById("statra_gradi_"+$scope.unique);
							var stop
							if(gradient){								
								while(gradient.childNodes.length > 0){
									gradient.removeChild(gradient.firstChild)
								}								
								for (let i = 0; i < stops.length; i++) {
									stop = document.createElementNS($scope.svgns, 'stop');
									stop.setAttribute('offset', stops[i].p+"%");
									stop.setAttribute('stop-color', stops[i].c);
									stop.setAttribute('stop-opacity', stops[i].a);									
									gradient.appendChild(stop);									
								}								
							}							
						}	
						
						var updateTicks = function (times){
							$("[id*='statra_tickval_"+$scope.unique+"']").text('') 
							$("[id*='statra_tick_"+$scope.unique+"']").attr('visibility','hidden')
							var len = times.length
							for (let i = 0; i < len; i++) {
								var tick =  document.getElementById("statra_tick_"+$scope.unique+"_"+times[i].id);
								if(tick){
									$(tick).attr('x1',times[i].x+"%");
									$(tick).attr('x2',times[i].x+"%");
									$(tick).attr('visibility','visible')									
								}
								tick =  document.getElementById("statra_tickval_"+$scope.unique+"_"+times[i].id);
								if(tick){								
									$(tick).text(times[i].v);
									$(tick).attr('x',times[i].x+"%");
								}
							}
					   	}								
						
						$scope.$watch('msg', function (msg) {
							if (!msg) {								
								return;
							}							
							if(msg.payload){
								update(msg.payload)
							}																			
						});
						$scope.$on('$destroy', function() {
							if($scope.timeout != null) {
								clearTimeout($scope.timeout)
								$scope.timeout = null						
							}
						}); 
						
					}
				});
			}
		}
		catch (e) {
			console.log(e);
		}
		node.on("close", function () {
			if (done) {				
				done();
			}
		});
	}
	RED.nodes.registerType("ui_statetrail", StateTrailNode);
};