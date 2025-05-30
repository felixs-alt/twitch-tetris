
FIELD_OFFSET_X = 180;
FIELD_OFFSET_Y = 12;

function TetrisControl() {
    var tetris = new Tetris(this);

    this.setup = function () {
	tetris.setup();
    };
    this.update = function () {
	tetris.update();
    };
    this.draw = function () {
	tetris.draw();
    };

    this.restart = function() {
	// create a new Tetris object
	tetris = new Tetris(this);

	// emulate an initial setup condition and the first loop
	tetris.setup();
	tetris.update();
    };
}

function Tetris(controller) {
    var background = null,
    game = null,
    timeOffset = 0,

    lastEscapeState = false,
    startPauseTime = 0,
    paused = false,
    lastPaused = false,

    gameOver = false,

    mouseClick = null,

    self = this,

    continueButton = null,
    restartButton = null,

    lastTime = null,
    dTime = null,

    gameEndTty = new TtyBlock('gameEndDiv', 10, 20, 1);
    

    this.setup = function () {
	// find the keys to stop	
	var stoppedKeys = [],
	curAction, i;
	for (curAction in inputAssignments) {
	    stoppedKeys = stoppedKeys.concat(inputAssignments[curAction]);
	}
	jaws.preventDefaultKeys(stoppedKeys);


	Tetris.currentInstance = self;
	game = new Game(inputAssignments, autoRepeatConfig, thresholdConfig);

	continueButton = new Button({image: 'media/buttons/continue.png', x: 250, y: 150});
	restartButton = new Button({image: 'media/buttons/restart.png', x: 250, y: 200});
	background = new Background();

	timeOffset = (new Date()).getTime();
    };

    this.update = function() {
	var realTime = (new Date()).getTime(),
	escapePressed = (jaws.pressed('esc')),
	scoreObject;

	if (lastTime === null) {
	    dTime = 0;
	    lastTime = realTime;
	} else {
	    dTime = realTime - lastTime;
	    lastTime = realTime;
	}
	async function compress(string) {
	    var dec = new TextDecoder("utf-8");
	    const byteArray = new TextEncoder().encode(string);
	    const cs = new CompressionStream("gzip");
	    const writer = cs.writable.getWriter();
	    writer.write(byteArray);
	    writer.close();
	    const buffer = await new Response(cs.readable).arrayBuffer()
	    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
	}
	
	function decompress(string) {
	    const cs = new DecompressionStream("gzip");
	    const writer = cs.writable.getWriter();
	    const buffer = new Uint8Array([...atob(string)].map(char=>char.charCodeAt(0))).buffer
	    writer.write(buffer);
	    writer.close();
	    return new Response(cs.readable).arrayBuffer().then(function(arrayBuffer) {
	        return new TextDecoder().decode(arrayBuffer);
	    });
	}

	async function saveScore(endScore) {
		if (localStorage.highscore == undefined) {
				json = JSON.parse("{}")
				array = new Array()
				d = new Date()
				format = {hour: "2-digit", minute: "2-digit", year: 'numeric', month: 'numeric', day: 'numeric', hour12: false };
				a = d.toLocaleString("sv-SE", format)
				json.date = a.toString()
				json.isodate = d.toISOString()
				json.score = endScore
				array.push(JSON.stringify(json).replaceAll(",","'"))
				console.log(array)
			    c = await compress(JSON.stringify(array))
				localStorage.highscore=c
				}
			else {
				json = JSON.parse("{}")
				score = localStorage.score
		    	array = []
				try {
				  d = await decompress(localStorage.highscore)
			      data = d.split(",");
				} catch (error) {
					console.error("Corrupted Save Data")
				}
				for (i in data){
				    array.push(data[i])
				}
				d = new Date()
				format = {hour: "2-digit", minute: "2-digit", year: 'numeric', month: 'numeric', day: 'numeric', hour12: false };
				a = d.toLocaleString("sv-SE", format)
				json.date = a.toString()
				json.isodate = d.toISOString()
				json.score = endScore
				array.push(JSON.stringify(json).replaceAll(",","'"))
				console.log(array)
				console.log(array.toString())
				cm = await compress(array.toString())
		    	localStorage.highscore = cm
		    }
	}
	if (!paused && !gameOver) {
	    // see if the game should be pased
	    if (escapePressed && (!lastEscapeState)||document.visibilityState == "hidden") {
		// go into pause mode
		startPauseTime = realTime;
		paused = true;
	    } else {
		game.update(realTime - timeOffset);
		// see if the game is over
		scoreObject = game.getResults();
		if (scoreObject) {
			allowsave = false
		    gameOver = true;
		    endScore = scoreObject.score.toString()
		    localStorage.score = endScore
		    // make the game end visible
		    document.getElementById('gameEndContainer').setAttribute('class', 'gameEndOutputVisible');
		    gameEndTty.addLine('GOOD GAME!!!');
		    gameEndTty.addLine('');
		    gameEndTty.addLine('');
		    if (scoreObject.won) {
			gameEndTty.addLine('You Win!');
		    } else {
			gameEndTty.addLine('Better Luck Next Time');
		    }
		    gameEndTty.addLine('');
		    gameEndTty.addLine('');

			/*
		    gameEndTty.addLine('Re-directing you to');
		    gameEndTty.addLine('the score screen...');
			*/
			
			gameEndTty.addLine('Your score was:');
			gameEndTty.addLine(endScore);
		    gameEndTty.addLine('');
		    gameEndTty.addLine('Press Space to Save');
			window.setTimeout(function() {allowsave=true},3000)
			timeout=window.setTimeout(function() {
				if (gameOver) {
					document.getElementById('gameEndContainer').setAttribute('class', 'gameEndOutputHidden');
					controller.restart();
					allowsave=false
				}
			}, 10000);
			document.onkeyup = function (e) {
				if (gameOver==true && allowsave==true) {
					gameOver=false
					allowsave=false
					if (e.key == " " || e.code == "Space" || e.keyCode == 32 && allowsave == true && gameOver==true) {
						saveScore(endScore)
						allowsave = false
						document.getElementById('gameEndContainer').setAttribute('class', 'gameEndOutputHidden');
						controller.restart();
						console.log("deez")
					} else {
						window.clearTimeout(timeout)
					}
				}
			}
		}
		    //sendScoreRequest(scoreObject.score);
	}

	} else if (paused) {
	    // see if the escape key was hit
	    if (escapePressed && (!lastEscapeState)) {
		// change the time offset
		timeOffset += realTime - startPauseTime;
		paused = false;
	    }
	    // see if any buttons were pressed
	    if (mouseClick) {
		if (continueButton.isClicked(mouseClick.x, mouseClick.y)) {
		    // change the time offset
		    timeOffset += realTime - startPauseTime;
		    paused = false;
		}
		if (restartButton.isClicked(mouseClick.x, mouseClick.y)) {
		    // restart the game
		    controller.restart();
		    return;
		}
	    }
	} else {
	    // TODO: nothing???
	}
	
	lastEscapeState = escapePressed;
	mouseClick = null;
    };

    this.draw = function() {

	if (!paused && !gameOver) {

	    // draw the game
	    background.draw(lastPaused);
	    if (lastPaused) {
		lastPaused = false;
		Block.invalidateAll();
	    }
	    game.draw(dTime);
	    Block.invalidFlushed();

	} else if (paused) {
	    // draw the game
	    background.draw();
	    game.draw(dTime);

	    //draw the pause menu
	    continueButton.draw();
	    restartButton.draw();
	    lastPaused = true;
	} else {
	    // continue to draw the game for game over
	    // draw the game
	    background.draw();
	    game.draw(dTime);
	}

	gameEndTty.draw(dTime);
    };
    
    this.mouseClicked = function(x, y) {
	mouseClick = {x: x, y: y};
    };
}

window.onload = function () {
    loadGameControls();

    jaws.assets.add('media/blueblock.png');
    jaws.assets.add('media/cyanblock.png');
    jaws.assets.add('media/greenblock.png');
    jaws.assets.add('media/orangeblock.png');
    jaws.assets.add('media/purpleblock.png');
    jaws.assets.add('media/redblock.png');
    jaws.assets.add('media/yellowblock.png');

    jaws.assets.add('media/greyblock.png');
    jaws.assets.add('media/emptyblock.png');

    jaws.assets.add('media/buttons/continue.png');
    jaws.assets.add('media/buttons/restart.png');

    jaws.assets.add('media/background/backdrop.png');
    jaws.assets.add('media/background/topbar.png');

    jaws.start(TetrisControl);
};

var redirCode;

function redirectToScore() {
    window.location.replace('/scoreScreen.html?tempRef=' + redirCode);
}

function sendScoreRequest(score) {
    var xmlhttp;
    if (window.XMLHttpRequest)
    {// code for IE7+, Firefox, Chrome, Opera, Safari
	xmlhttp=new XMLHttpRequest();
    }
    else
    {// code for IE6, IE5
	xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange=function()
    {
	if (xmlhttp.readyState==4 && xmlhttp.status==200)
	{
	    redirCode = xmlhttp.responseText;

	    setTimeout('redirectToScore();', 4000);
	}
    }
    
    // World's 3rd most piss-poor obfustication technique
    // A serious real-time/replay game monitor is needed
    xmlhttp.open("POST", "/score/reportScore?gthbyu="+(score*17), true);
    xmlhttp.send();
}
