# node-red-contrib-state-trail

## Description
![node-red-contrib-ui-state-trail.JPG](images/node-red-contrib-ui-state-trail.JPG)

Node-RED dashboard widget. Gantt type chart to visualize state changes over time period.

## Configuration
### Label
To show label configure widget height to 2 units. 
  
### Period
Time period. If configured to long period, keep input rate low. Too much data may harm performance significantly.
        

### Time format and Ticks
Choose format of time and count of tick marks.
     
### States
Configure states. There is 3 types available for states: string, number and boolean. 
States can be configured with mixed types - <code>true</code> (boolean) and <code>"true"</code> (string) treated as different states. 

### Input
        
<code>msg.payload</code> should carry one of configured state. In case of state not found for payload, widget shows period in black. 
