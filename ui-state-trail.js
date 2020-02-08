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
			.statra-{{unique}}.legend{
				cursor:pointer;
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
					<tspan  ng-if="${config.legend == true}" id="statra_label_{{unique}}" class="txt-{{unique}}" text-anchor="middle" dominant-baseline="hanging" x=`+config.exactwidth/2+` y="2%">
						`+config.label+`
					</tspan>
					<tspan  ng-if="${config.legend == false}" id="statra_label_{{unique}}" class="txt-{{unique}}" text-anchor="middle" dominant-baseline="middle" x=`+config.exactwidth/2+` y="25%">
						`+config.label+`
					</tspan>
				</text>	
				<g class="statra-{{unique}} legend" id="statra_legend_{{unique}}" ng-if="${(config.height > 1 && config.legend == true)}" style="outline: none; border: 0;" ng-click='toggle()'>

				</g>	
				<text ng-if="${config.blanklabel != ""}" font-style="italic">
					<tspan id="statra_blank_{{unique}}" class="txt-{{unique}}" text-anchor="middle" dominant-baseline="hanging" x=`+config.exactwidth/2+` y="`+config.stripe.y+`%">
						`+config.blanklabel+`
					</tspan>
				</text>	
				<rect id="statra_{{unique}}" ng-click='onClick($event)' x="`+config.stripe.x+`" y="`+config.stripe.y+`%" width="`+config.exactwidth+`" height="`+config.stripe.height+`" style="stroke:none; outline: none; cursor:pointer;" ${gradient}/>	
			
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
			var getTimeFromPos = null;
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
			var collectSummary = null;
			var getStateFromCoordinates = null;
			var generateOutMessage = null;
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
				
				collectSummary = function(){
					var sum = {}
					var i
					var total = 0
					var z = 0
					var p = 0
					var len = storage.length
					for(i = 0;i<config.states.length;i++){
						if(!sum.hasOwnProperty(config.states[i].state)){
							sum[config.states[i].state] = 0
						}
					}
					for(i = 1;i<len;i++){
						z = storage[i].time - storage[i-1].time					
						sum[storage[i-1].state] += z
						total += z
					}
					var ret = []
					for(i = 0;i<config.states.length;i++){
						p = (100*sum[config.states[i].state]/total).toFixed(2) + "%"
						var n = config.states[i].label == "" ? config.states[i].state.toString() : config.states[i].label
						ret.push({name:n,col:config.states[i].col,val:formatTime(sum[config.states[i].state],true),per:p})
					}
					return ret
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
				formatTime = function(stamp,utc){
					var d = new Date(stamp);					
					var hours =  utc ? d.getUTCHours() : d.getHours(); 
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
					if(contextStores == undefined){						
						return
					}
					if(Object.keys(contextStores).length === 0 && contextStores.constructor === Object){						
						return
					}					
					for (var key in contextStores) {
						if(contextStores[key].hasOwnProperty('module')){							
							if(contextStores[key].module == 'localfilesystem'){
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

				getPosition = function(target,min,max){					
					var p =  {minin:min, maxin:max, minout:config.stripe.left, maxout:config.stripe.right}					
					return range(target,p,'clamp',false)
				}

				getTimeFromPos = function(pos,min,max){
					var p = {minin:min, maxin:max, minout:config.insidemin, maxout:config.max}
					return range(pos,p,'clamp',true)
				}

				getStateFromCoordinates = function(c){											
					if(c > config.stripe.mousemax || c < config.stripe.mousemin){						
						return null
					}
					var time = getTimeFromPos(c,config.stripe.mousemin,config.stripe.mousemax)
					
					var idx = -1 + storage.findIndex(function(state) {
						return state.time > time;
					})
					var current = storage[idx]
					var next = storage[idx+1]
					var dur = next.time - current.time
					var lab = config.states.find(s => s.state == current.state).label
					var ret = {state:current.state,time:current.time,duration:dur,label:lab}
					return ret
				}

				generateOutMessage = function(evt){					
					return {payload:getStateFromCoordinates(evt.targetX) ,clickCoordinates:evt}
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
				config.stripe.mousemin = config.stripe.left*config.exactwidth/100
				config.stripe.mousemax = config.stripe.right*config.exactwidth/100

				config.period = parseInt(config.periodLimit) * parseInt(config.periodLimitUnit) * 1000
				config.tickmarks = config.tickmarks || 4				
				
				prepareStorage()
				
				storage = (config.persist && stroageSpace != null) ? ctx.get('stateTrailStorage',stroageSpace) || [] : []	
				config.max = (config.persist && stroageSpace != null) ? ctx.get('stateTrailMax',stroageSpace) || new Date().getTime() : new Date().getTime()
				config.min = (config.persist && stroageSpace != null) ? ctx.get('stateTrailMin',stroageSpace) || (config.max - config.period) : (config.max - config.period)
				config.insidemin = storage.length < 3 ? config.min :  storage[1].time
								
				storeInContext(true)				
				
				config.initial = {stops:generateGradient(),ticks:generateTicks(),legend:collectSummary()}
				
				var html = HTML(config);		

				done = ui.addWidget({
					node: node,
					order: config.order, 
					group: config.group,
					width: config.width,
					height: config.height,									
					format: html,					
					templateScope: "local",
					emitOnlyNewValues: false,
					forwardInputMessages: false,					
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
						
						msg.payload = {stops:generateGradient(),ticks:generateTicks(),legend:collectSummary()}
						return { msg };
					},
					beforeSend: function (msg, orig) {
						try {
							if (!orig || !orig.msg) {
								return;
							}
							return  generateOutMessage(orig.msg.clickevent);
						} catch (error) {
							node.error(error);
						}
						
					},
					
					initController: function ($scope) {																		
						$scope.unique = $scope.$eval('$id')
						$scope.svgns = 'http://www.w3.org/2000/svg';
						$scope.timeout = null
						$scope.legendvalues = ['name','val','per']
						$scope.legendvalue = 'name'
						$scope.legend = null
						
						$scope.init = function(data){
							update(data)
						}

						$scope.onClick = function(e){							
							//console.log(e)
							var coord = {
								screenX: e.originalEvent.screenX,
								screenY: e.originalEvent.screenY,
								clientX: e.originalEvent.clientX,
								clientY: e.originalEvent.clientY,
								targetX: e.originalEvent.offsetX
							}
							$scope.send({clickevent: coord});					
						}

						$scope.toggle = function(){							
							var idx = $scope.legendvalues.indexOf($scope.legendvalue) + 1
							if(idx ==  $scope.legendvalues.length){
								idx = 0
							}
							$scope.legendvalue = $scope.legendvalues[idx]
							if($scope.legend != null){
								updateLegend($scope.legend)
							}							
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
							updateLegend(data.legend)
						}

						var updateLegend = function (legend){
							if(!legend){
								return
							}
							var g =  document.getElementById("statra_legend_"+$scope.unique);
							if(!g){
								return
							}
							$scope.legend = legend							
							var xp = 0
							if(g.children.length == 0){
								var rect
								var txt
								for(var i=0;i<legend.length;i++){
									
									rect = document.createElementNS($scope.svgns, 'rect');
									rect.setAttributeNS(null, 'x', xp);
									rect.setAttributeNS(null, 'y', '30%');
									rect.setAttributeNS(null, 'height', '11');
									rect.setAttributeNS(null, 'width', '8');
									rect.setAttributeNS(null, 'fill', legend[i].col);
									rect.setAttribute('id','statra_rect_legend_'+$scope.unique+"_"+i)
									document.getElementById("statra_legend_"+$scope.unique).appendChild(rect);
									xp += rect.getBoundingClientRect().width + 5

									txt = document.createElementNS($scope.svgns, 'text');
									txt.setAttributeNS(null, 'x', xp);
									txt.setAttributeNS(null, 'y', '30%');
									txt.setAttributeNS(null, 'dominant-baseline', 'hanging');
									txt.setAttributeNS(null, 'fill', legend[i].col)
									txt.setAttribute('class','txt-'+$scope.unique+' small')
									txt.setAttribute('id','statra_txt_legend_'+$scope.unique+"_"+i)
									txt.textContent = legend[i][$scope.legendvalue]
									document.getElementById("statra_legend_"+$scope.unique).appendChild(txt);
									xp += txt.getBoundingClientRect().width + 5
								}								
							}
							else{
								var xp = 0
								var el 
								for(var i=0;i<legend.length;i++){																		
									el = document.getElementById("statra_rect_legend_"+$scope.unique+"_"+i)
									if(el){								
										$(el).attr("fill", legend[i].col)
										$(el).attr("x", xp)										
										xp += el.getBoundingClientRect().width + 5
									}
									el = document.getElementById("statra_txt_legend_"+$scope.unique+"_"+i)
									if(el){								
										$(el).text(legend[i][$scope.legendvalue]);
										$(el).attr("x", xp)
										xp +=el.getBoundingClientRect().width + 5
									}									
								}
							}							
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
							var len = times.length
							for (let i = 0; i < len; i++) {
								var tick =  document.getElementById("statra_tick_"+$scope.unique+"_"+times[i].id);
								if(tick){
									$(tick).attr('x1',times[i].x+"%");
									$(tick).attr('x2',times[i].x+"%");
									if($(tick).attr('visibility') != 'visible'){
										$(tick).attr('visibility','visible')
									}																	
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