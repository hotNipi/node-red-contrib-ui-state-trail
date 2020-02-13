# node-red-contrib-state-trail

[![NPM version][npm-image]][npm-url]
[![CodeFactor](https://www.codefactor.io/repository/github/hotnipi/node-red-contrib-ui-state-trail/badge)](https://www.codefactor.io/repository/github/hotnipi/node-red-contrib-ui-state-trail)
![npm](https://img.shields.io/npm/dm/node-red-contrib-ui-state-trail)

[npm-image]: http://img.shields.io/npm/v/node-red-contrib-ui-state-trail.svg
[npm-url]: https://www.npmjs.com/package/node-red-contrib-ui-state-trail


## Description
![node-red-contrib-ui-state-trail.JPG](images/node-red-contrib-ui-state-trail.JPG)

Node-RED dashboard widget. Gantt type chart to visualize state changes over time period.

## Configuration
### Label
To show label configure widget height to 2 units. 
  
### Period
Time period. If configured to long period, keep input rate low. Too much data may harm performance significantly.

Configured period can be overrided by using <code>msg.control.period</code> property.
The value for period should be given in milliseconds. 

For example to set period to 5 minutes, send 
``` javascript
msg.control.period = 300000
```
        

### Time format and Ticks
Choose format of time and count of tick marks.
     
### States
Configure at least 2 states. Type of state can be <code>string</code>, <code>number</code> or <code>boolean</code>.  
States can be configured with mixing the types. States <code>true</code> (boolean) and <code>"true"</code> (string) treated as different states. 

Optionally you can configure label for each state. If configured, the legend shows the label instead of state.  

### Blank label
Text to show when there is not yet enough data to display the chart. 

### Legend
To show the legend, the widget height must be configured to 2 units. 
Legend can be configured for 2 modes. It even shows information for all the configured states or only for states currently in timeline.        

By clicking the legend on dashboard, you can toggle between names and summary. Summary shows aggregated time or percentage for each state.

### Combine similar states
By default, the node combines consecutive states if they have same value. You could turn this behavior off, if you wanted to present your data as it was provided. 
Doing so, the consecutive similar states will be splitted with thin lines, and all those states will be individually clickable.
If splitting the consecutive similar states is not intentional or if you don't use click option, it is recommended to keep this option selected. 
For large amounts of data, combining the states helps to gain performance.

### Data Storage
After a full re-deploy, Node-RED restart or system reboot, the node will lose it's saved chart data, unless the user has selected the 'Data Storage' option (checkbox) AND enabled a persistent form of context storage in the Node-RED settings.js file. In that case, the node will attempt to restore the data as it was prior to the re-deploy, restart or reboot.

See the node-RED user guide to configure persistent storage - https://nodered.org/docs/user-guide/context#saving-context-data-to-the-file-system

## Input
        
<code>msg.payload</code> should carry single value of one of configured states
``` javascript
msg.payload = true
```

If you want to use the widget to show historical data, you need to pass in every state together with its timestamp. 
``` javascript
msg.payload = {state:true,timestamp:1579362774639}
```

Historical data can be also feed within an array

``` javascript
msg.payload = [
    {state:true,timestamp:1579362774639},
    {state:false,timestamp:1579362795665},
    {state:true,timestamp:1579362895432}
]
```

State data can also have the end time. In this case, if next state starts later than the previous state's end time, then there will be gap between states in case of combining the states is turned off.

``` javascript
{"state": true,"timestamp": 1581404193000,"end":1581404198000}
```

Note, that feeding data in array will clear previous set of data!

To clear the data, send an empty array 
``` javascript
msg.payload = []
```



## Output

By clicking the chart bar, the widget sends message. Output msg contains clicked state in <code>msg.payload</code> and coordinates of click in <code>msg.clickCoordinates</code> 

![click-output.JPG](images/click-output.JPG)
 



## Change the configuration at runtime

Some options of widget configuration can be overrided at runtime
Usage of <code>msg.options</code> property 

### Change configured period
Configured period can be overrided by using <code>msg.control.period</code> property.
The value for period should be given in milliseconds. 

For example to set period to 5 minutes, send 
``` javascript
msg.control.period = 300000
```

### Change the states

All states can be overrided by using <code>msg.control.states</code> property. Note that you can't adjust or change any of configured states individually.

**All states must be unique!**

New states expected to be sent in <code>array</code> of <code>objects</code>
``` javascript
var s = [
    {state:1 ,col:"#009933", t:"num", label:'ONE'},
    {state:'two', col:"#999999", t:"str", label:'TWO'},
    {state:false, col:"#00FF99", t:"bool", label:'THREE'}
]
msg.control = {states:s}
```
Where each <code>object</code> must have all following properties
``` 
state - (number,string,boolean) the state identifier
col - (hex string) the color of the state
label - (string) human-friendly name of the state (empty string for no label)
t - (string) the type of the state.
   
    values for t can be:
    "num" - number
    "str" - string
    "bool" - boolean

```

