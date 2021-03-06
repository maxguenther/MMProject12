function bewegePerson(){
outputDebugInfo();

	//check whether movement vector has been computed
	if(!gWegBerechnet){
		
		if(gTargetIdentifier.split(":")[1].split("|")[gCurrentQuizstep] !== "t"){
            //we shouldn't move -> exit and signal it
			return false;
		}
		
		//save targetid first to prevent reorientation
		gisWalkingTo		= gTargetIdentifier;
    }
	
    //set busy flag to prevent
    //other calls from being activated
    //in clickEventHandler
    gEventHandlerBusy = true;

	//Get objects of target and hero picture
    var hero	= $("canvas[id*='canvas_person_']");
    var target	= $("canvas[id*='" + gTargetIdentifier.split(":")[0] + "']");

	//x, y, z-coordinates of canvas centre
	var heroPos		= new Array(3);
	var targetPos	= new Array(3);
	
	//get coordinates
	heroPos[2]		= z2mult(parseInt(hero.css("z-index")));
	targetPos[2]	= z2mult(parseInt(target.css("z-index")));
		
	if(!gWegBerechnet){
		//stores size before scaling
        gStartAbmessungen[0] = hero.width();
        gStartAbmessungen[1] = hero.height();
	
		if(heroPos[2] <= targetPos[2]){
			//enlarge
			//here the canvas has to be enlarged at the beginning to avoid clipping
			skaliereCanvas( targetPos[2] / heroPos[2], hero);
		}
		
		//get dialogbox and make it invisible
		$("canvas[id*='allg_dialogbox']").addClass("invisible");
    }
	
	//computing the position to ensure canvas bottom center is hit
	heroPos[0] = hero.offset().left + (gStartAbmessungen[0] / 2.0);
	heroPos[1] = hero.offset().top + (gStartAbmessungen[1]);
	
	$.each(gImageStats, function(index, imageStat)
	{
		if(strContains(gTargetIdentifier, imageStat.id) && (imageStat.laufziel != null) )
		{
			targetPos[0] = perc2pix( $(window).width(), imageStat.laufziel.xPos );
			targetPos[1] = perc2pix( $(window).height(), imageStat.laufziel.yPos );
		}
	});
	
	if( ( typeof(targetPos[0]) === "undefined" ) || ( typeof(targetPos[1]) === "undefined" ) )
	{
		targetPos[0] = target.offset().left + (target.width() / 2.0);
		targetPos[1] = target.offset().top + (target.height());
	}
	
    //check whether we already are in front of the goal or if loading by code is going on and return
    if(zielErreicht(heroPos, targetPos, true) && (gAktuellesZiel == 0)){
		
		gEventHandlerBusy = false;
        finishEventHandling();
		
		return true;
	}

	//compute movement vectors
	if(!gWegBerechnet){
		
		var wegindex	= new Array(2);
		var lWegPos		= new Array(new Array(2), new Array(2), new Array(2), new Array(2));
		
		$.each(gWegPos, function(index, value){
			//compute real position of central path points
			lWegPos[index][0] = perc2pix($(window).width(), value[0]);
			lWegPos[index][1] = perc2pix($(window).height(), value[1]);
		});
		
		/*draws central path points*/
        /*
        var hg = $("canvas[id*=canvas_bg_static]")[0].getContext("2d");
		hg.fillStyle = "rgb(255, 0, 0)";

		$.each(lWegPos,function(index, value){
			hg.fillRect( value[0], value[1], 10, 10 );
		});
        */
		
		$.each(gZoomsteps, function(index, value){
            if(heroPos[2] === value){
				//endposition - startposition = directional vector
				//directional vector / pixel per second = pixel per step
				gMoveVec[0][0] = (lWegPos[index][0] - heroPos[0]) / gPixelProAufruf;
				gMoveVec[0][1] = (lWegPos[index][1] - heroPos[1]) / gPixelProAufruf;
				gMoveVec[0][2] = heroPos[2];
				
				//first target, towards central path
				gTargets[0][0] = lWegPos[index][0];
				gTargets[0][1] = lWegPos[index][1];
				
				wegindex[0] = index;
			}
			
            if(targetPos[2] === value){
				gMoveVec[2][0] = (targetPos[0] - lWegPos[index][0]) / gPixelProAufruf;
				gMoveVec[2][1] = (targetPos[1] - lWegPos[index][1]) / gPixelProAufruf;
				gMoveVec[2][2] = targetPos[2];
				
				//second target, at the end of central path
				gTargets[1][0] = lWegPos[index][0];
				gTargets[1][1] = lWegPos[index][1];
				
				wegindex[1] = index;
			}
		});
		
		var zoomFaktor = targetPos[2] / heroPos[2];
		
        //compute movement vector on central path considering differing zoom factors
		gMoveVec[1][0] =
		(
			(lWegPos[wegindex[1]][0] - (gStartAbmessungen[0] * zoomFaktor / 2.0))
			-
			(lWegPos[wegindex[0]][0] - (gStartAbmessungen[0] / 2.0))
		) / gPixelProAufruf;

		gMoveVec[1][1] =
		(
			(lWegPos[wegindex[1]][1] - (gStartAbmessungen[1] * zoomFaktor))
			-
			(lWegPos[wegindex[0]][1] - gStartAbmessungen[1])
		) / -gPixelProAufruf;

		//computes stepwidth between start and target dimension in relation to z-index
		//current dimensions / start multiplicator = real dimensions * target multiplicator = target dimensions
		//stores target dimensions for comparison
		gTargets[1][2] = (gStartAbmessungen[0] * zoomFaktor);
		gTargets[1][3] = (gStartAbmessungen[1] * zoomFaktor);
		//computes stepwidth for width and height in relation to z-index
		gMoveVec[1][2] = ( gTargets[1][2] - gStartAbmessungen[0]) / gPixelProAufruf;
		gMoveVec[1][3] = ( gTargets[1][3] - gStartAbmessungen[1]) / gPixelProAufruf;

		//third target, goal
		gTargets[2][0] = targetPos[0];
		gTargets[2][1] = targetPos[1];
		
		gWegBerechnet = true;
	}
	
	//this will move the hero directly to the goal while the game is beeing progressed after loading by code
	if( gLoadByCode ){
		
		//determine final dimensions
		gStartAbmessungen[0] *= zoomFaktor;
		gStartAbmessungen[1] *= zoomFaktor;
		
		//put hero on the goal
		hero.offset({
			left:	targetPos[0] - gStartAbmessungen[0] / 2,
			top:	targetPos[1] - gStartAbmessungen[1]
			});
		
		//set z-index if end of central path is reached
		hero.css("z-index", target.css("z-index"));
		
		finishWalking(hero);
		
		//console.log("walking by code");			

		return true;
	}
	
	//move hero
	if(!zielErreicht(heroPos, gTargets[gAktuellesZiel], false)){
		
		//if target is not reached add movement vector
		hero.offset({
			left:	hero.offset().left	+ gMoveVec[gAktuellesZiel][0],
			top:	hero.offset().top	+ gMoveVec[gAktuellesZiel][1]
			});

		//scale if we are on central path
		if(gAktuellesZiel == 1)
		{
			//gMoveVec[1][2] >= 0 -> enlarge, scale down otherwise
			skaliereHeld( (gStartAbmessungen[0] + gMoveVec[1][2]), (gStartAbmessungen[1] + gMoveVec[1][3]), hero);

			//stores new dimensions as reference for next round
			gStartAbmessungen[0] += gMoveVec[1][2];
			gStartAbmessungen[1] += gMoveVec[1][3];
		}
	}else{

		//put hero on targets coordinates if we are in range
		hero.offset({
			left:	gTargets[gAktuellesZiel][0] - (gStartAbmessungen[0] / 2.0),
			top:	gTargets[gAktuellesZiel][1] - gStartAbmessungen[1]
			});
		
		if(gAktuellesZiel == 1){
			//end of central path reached, scale to target dimensions
			skaliereHeld(gTargets[1][2], gTargets[1][3], hero);
			
			//set z-index if end of central path is reached
			hero.css("z-index", target.css("z-index"));
		}
			
		//go to next target
		gAktuellesZiel++;
	}
	
	if(gAktuellesZiel < 3){
		//if we havn't reached the goal yet
		
        //Determine current walking direction
        var direction = determineWalkingDirection(hero);

        if(direction !== gLastDirection){
	        //Check against last walking direction, if different, change animation
            gLastDirection = direction;
            switchWalkingAnimation(direction, hero[0].id);
        }

		//there are only 3 targets: hero -> waypoint 1 -> waypoint 2 -> goal
		setTimeout(function(){ bewegePerson() }, gIntervall);
	}else{
        //WORKAROUND for scene2. this must
        //not remain here, but needs a proper fix
        //gIsSceneBeginning = false;
        ///////

		gStartAbmessungen[0] = gTargets[1][2];
		gStartAbmessungen[1] = gTargets[1][3];

        finishWalking(hero);
	}
	
	//some walking should have happened here
	return true;
}

function finishWalking(hero){

	//When goal is reached, standing animation is invoked,
	//depending on position of hero
	if(hero.offset().left <= ( $(window).width() / 2 )){	
		!gSpace ? switchWalkingAnimation('standing_r', hero[0].id) : switchWalkingAnimation('jetpack_r', hero[0].id);
	}else{
		!gSpace ? switchWalkingAnimation('standing_l', hero[0].id) : switchWalkingAnimation('jetpack_l', hero[0].id);
	}
	
	if(gMoveVec[0][2] > gMoveVec[2][2]){
		//scale down
		//the canvas has to be scaled down to be filled entirely by the heros picture, use initial z-values to compare
		skaliereCanvas(gMoveVec[2][2] / gMoveVec[0][2], hero);
	}

	//to maintain scaling at target the animation data has to be adjusted
	$.each( gAnimationTimer, function( index, bild ){
		//find given canvas by id
		if( ( typeof(bild.canvas_id) !== "undefined" ) && ( bild.canvas_id === hero[0].id ) ){
			//reset transformation matrix
			hero[0].getContext("2d").setTransform(1, 0, 0, 1, 0, 0);
			//set animations target dimensions to last computed dimensions
			bild.anzeige_width	= gStartAbmessungen[0];
			bild.anzeige_height	= gStartAbmessungen[1];
		}
	});
	
	//reset everything else because we reached the target
	gAktuellesZiel		= 0;
	/*
	heroPos				= new Array(3);
	targetPos			= new Array(3);
	*/
	gStartAbmessungen	= new Array(2);
	gMoveVec			= new Array(new Array(3), new Array(4), new Array(3));
	gWegBerechnet		= false;
	gisWalkingTo		= "";

	//free eventhandler
	gEventHandlerBusy   = false;

	//make dialogbox visible again
	$("canvas[id*='allg_dialogbox']").removeClass("invisible");
	
	if(!gLoadByCode){
		//prevent this call because otherwise gDialogValue1/2 will be undefined at the time
		finishEventHandling();
	}
}

function zielErreicht(heroPos, targetPos, justDistance){
	//computes heros distance to the target and compares it to the previous step
	var distance_target, distance_next, vector_length;
	
	justDistance = typeof(justDistance) === "undefined" ? false : justDistance;
	
	if(!justDistance){
		//no need for square root while computing vector length -> sqrt(x^2 + y^2)
		distance_target		= (
								Math.pow( ( heroPos[0] - targetPos[0] ), 2)
								+
								Math.pow( ( heroPos[1] - targetPos[1] ), 2)
							);
		
		//compute distance to target and previous steps distance as well as movement vector length
		distance_next	= (
							Math.pow( ( ( heroPos[0] + gMoveVec[gAktuellesZiel][0] ) - targetPos[0] ), 2 )
							+
							Math.pow( ( ( heroPos[1] + gMoveVec[gAktuellesZiel][1] ) - targetPos[1] ), 2 )
						);

		vector_length		= ( Math.pow( gMoveVec[gAktuellesZiel][0], 2 ) + Math.pow( gMoveVec[gAktuellesZiel][1], 2 ) );

		//goal is reached if the computation evaluates to the set amount or if movement vector is 0
		if(((distance_next >= distance_target) || (vector_length == 0))){
			
			return true;
		}else{
			
			return false;
		}
	}else{
		//consider z-index while checking if hero pos and goal pos is the same
		distance_target		= (
								Math.pow(( heroPos[0] - targetPos[0] ), 2)
								+
								Math.pow(( heroPos[1] - targetPos[1] ), 2)
								+
								Math.pow(( heroPos[2] - targetPos[2] ), 2)
							);
		//just check distance to target otherwise
		if(distance_target <= 0.1){
			
			return true;
		}else{
			
			return false;
		}
	}
}

function skaliereCanvas(faktor, canvas){
	//scales canvas by the given factor and sets its dimensions
	canvas		= $(canvas);
	var context	= canvas[0].getContext("2d");
	var inhalt	= context.getImageData(0, 0, Math.round(gStartAbmessungen[0]), Math.round(gStartAbmessungen[1]));
	
    canvas[0].width	 *= faktor;
    canvas[0].height *= faktor;
	
    context.putImageData(inhalt, 0, 0);
}

function skaliereHeld(faktor1, faktor2, held){
	//scales content of canvas by the given factor
	held[0].getContext("2d").scale(
        faktor1 / (gStartAbmessungen[0]),
        faktor2 / (gStartAbmessungen[1])
		);
}

/*
  determineWalkingDirection()

  Calculates which subtileset to select, for a correct
  depiction of the walking direction. This done based on
  the positional difference between two walking steps with
  respect to the screen ratio of height and width.

  Input arguments:

    hero - (Canvas) Canvas context of the hero image

  Return values:

    (String) - can be 'left', 'right', 'front', 'back' or
               'jetpack_l', 'jetpack_r' in space
*/
function determineWalkingDirection(hero){

    //calculate screen ratio
    var screenRatio = $(window).width() / $(window).height();

    //get current position
    var currentPos = new lastValidInformation(
                hero.offset().left,
                hero.offset().top);

    //use positional differences of character canvas
    //under consideration of screen ratio
    var diffX = currentPos.x  - gLastValidPositionData.x;
    var diffY = (currentPos.y - gLastValidPositionData.y) * screenRatio;

    var direction = '';

    //check for left <> right movement
    if(diffX > 0.0){
        direction = 'right';
    }else if(diffX < 0.0){
        direction = 'left';
    }

    //compare to up <> down movement
    if(diffX > 0.0 && diffY > 0.0){
        if(diffY > diffX){
            if(diffY > 0.0){
                direction = 'front';
            }else if(diffY < 0.0){
                direction = 'back';
            }
        }
    }else if(diffX > 0.0 && diffY > 0.0){
        if(diffY < diffX){
            if(diffY > 0.0){
                direction = 'front';
            }else if(diffY < 0.0){
                direction = 'back';
            }
        }
    }else{
        if(Math.abs(diffY) > Math.abs(diffX)){
            if(diffY > 0.0){
                direction = 'front';
            }else if(diffY < 0.0){
                direction = 'back';
            }
        }
    }

    //Fallback, happens every once in a while
    if(direction == ''){
        direction = gLastDirection;
    }

    //store current
    gLastValidPositionData = currentPos;

    //Check if it's the space scene
    //we're currently playing
    if(gSpace && (direction == 'left' || direction == 'front')){
        return 'jetpack_l';
    }else if(gSpace  && (direction == 'right' || direction == 'back')){
        return 'jetpack_r';
    }else{
        return direction;
    }
}
