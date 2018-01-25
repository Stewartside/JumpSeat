###JUMPSEAT PROJECT OVERVIEW

JumpSeat reduces onboarding times, improves training, and eases support by delivering on-screen guidance over your existing enterprise applications.

Please note that the open-source version is unsupported. Use at your own risk. If you require support or hosting, please
visit our website http://jumpseat.io for pricing.

####DOCUMENTATION
All administrative and installation documentation are available @ http://wiki.jumpseat.io. Once you have installed JumpSeat
you will need to use either the browser extension or JavaScript snippet to start creating guides on your chosen apps (see wiki for details).

####FRAMEWORKS
 1. CodeIgniter
 2. jQuery
 3. Foundation
 4. MongoDB

###BROWSER SUPPORT
JumpSeat currently supports the following browsers:

 1. Internet Explorer 10+ (9 works but is not supported)
 2. Firefox
 3. Chrome
 4. Safari

###DOCKER

Replace jumpseat.crt and jumpseat.key with your own SSL keys. Currently they are just self-signed certs tied to the hostname aero.local.
Container uses one volume for MongoDB (/var/lib/mongodb) for persisent storage.
If you would like to update JumpSeat, run a 'git pull' in the www directory.

####USING DOCKER

 1. Create image with command:
 2. docker build -t jumpseat .
 3. Create and start a container:
 4. docker run -it -v /PATH/JumpSeat/:/var/www -v /PATH/wdb/:/var/lib/mongodb -p 80:80 -p 433:433 jumpseat

-v Will mount your local files with the container. This allows for local development and testing.


###GULP BUILD

Firstly run `npm install` then:

 1. gulp watch (for dev)
 2. gulp build (for prod)