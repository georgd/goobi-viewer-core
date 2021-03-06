/*!
 * This file is part of the Goobi viewer - a content presentation and management application for digitized objects.
 *
 * Visit these websites for more information.
 * - http://www.intranda.com
 * - http://digiverso.com
 *
 * This program is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
var _MIN_DESKEW_ANGLE = -44.9  //must be <45
var _MAX_DESKEW_ANGLE = 45  //must be <=45

var ImageView = ( function() {
    'use strict';
    var _debug = false;
    var _defaults = {
            global: {
                divId: "map",
                zoomSlider: ".zoom-slider",
                zoomSliderHandle: '.zoom-slider-handle',
                overlayGroups: [ {
                    name: "searchHighlighting",
                    styleClass: "coords-highlighting",
                    interactive: false
                }, {
                    name: "ugc",
                    styleClass: "ugcBox",
                    interactive: true
                
                } ],
                zoomSpeed: 1.25,
                maxZoomLevel: 20,
                minZoomLevel: 1,
                imageControlsActive: true,
                visibilityRatio: 0.4,
                loadImageTimeout: 10 * 60 * 1000,
                maxParallelImageLoads: 1,
                adaptContainerHeight: false,
                footerHeight: 50,
                rememberZoom: false,
                rememberRotation: false,
            },
            image: {},
            getOverlayGroup: function( name ) {
                var allGroups = this.global.overlayGroups;
                for ( var int = 0; int < allGroups.length; int++ ) {
                    var group = allGroups[ int ];
                    if ( group.name === name ) {
                        return group;
                    }
                }
            },
            getCoordinates: function( name ) {
                var coodinatesArray = this.image.highlightCoords;
                if ( coodinatesArray ) {
                    for ( var int = 0; int < coodinatesArray.length; int++ ) {
                        var coords = coodinatesArray[ int ];
                        if ( coords.name === name ) {
                            return coords;
                        }
                    }
                }
            },
        };
    
     var imageView =  {};
     
     /**
      * Basic constructor. Merges the given config into a copy of the default config
      */
     imageView.Image = function(config)  {     
         this.config = jQuery.extend(true, {}, _defaults);
         jQuery.extend(true, this.config, config);
         this.container = $( "#" + this.config.global.divId );
         console.log("initializing image view with config ", this.config);

//         this.originalImageSize = {x:this.config.imageWidth, y:this.config.imageHeight};
//         this.imageViewWidth = parseFloat($('#'+this.config.div).css("width"));
//         this.imageViewHeight = parseFloat($('#'+this.config.div).css("height"));
     }
     
     /**
      * Loads the image from the config given in the constructor
      * @return a promise to be resolved once the viewer has been opened
      */
     imageView.Image.prototype.load = function() {
             if ( _debug ) {
                 console.log( '##############################' );
                 console.log( 'osViewer.init' );
                 console.log( '##############################' );
             }
             
             this.config.image.mimeType = this.config.image.mimeType.replace("jpeg","jpg");
             //create image source array
             var sources = this.config.image.tileSource;
             if(typeof sources === 'string' && sources.startsWith("[")) {
                 sources = JSON.parse(sources);
             } else if(!$.isArray(sources)) {
                 sources = [sources];
             }
             //create promises for loading of image sources
             var promises = [];
             for ( var i=0; i<sources.length; i++) {
                 var source = sources[i];
                 // returns the OpenSeadragon.TileSource if it can be created,
                 // otherweise
                 // rejects the promise
                 var promise = _createTileSource(source, this.config);
                 promises.push(promise); 
             }                
             var image = this;
             return Q.all(promises).then(function(tileSources) {
                 var minWidth = Number.MAX_VALUE;  
                 var minHeight = Number.MAX_VALUE;
                 var minAspectRatio = Number.MAX_VALUE;
                 for ( var j=0; j<tileSources.length; j++) {
                     var tileSource = tileSources[j];
                     minWidth = Math.min(minWidth, tileSource.width);
                     minHeight = Math.min(minHeight, tileSource.height);
                     minAspectRatio = Math.min(minAspectRatio, tileSource.aspectRatio);
                 }
                 if(_debug) {                    
                     console.log("Min aspect ratio = " + minAspectRatio);                    
                 }
                 var x = 0;
                 for ( var i=0; i<tileSources.length; i++) {
                     var tileSource = tileSources[i];
                     tileSources[i] = {
                             tileSource: tileSource,
                             width: tileSource.aspectRatio/minAspectRatio,
                             x : x,
                             y: 0,
                         }
                     x += tileSources[i].width;
                     }              
                 var pr = image.loadImage(tileSources);
                 return pr;
             });
             
         };
         
         imageView.Image.prototype.loadImage = function(tileSources) {
             if ( _debug ) {
                 console.log( 'Loading image with tilesource: ', tileSources );
             }
               
             this.loadFooter();            
          
             this.viewer = new OpenSeadragon( {
                 immediateRender: false,
                 visibilityRatio: this.config.global.visibilityRatio,
                 sequenceMode: false,
                 id: this.config.global.divId,
                 controlsEnabled: false,
                 prefixUrl: "/openseadragon-bin/images/",
                 zoomPerClick: 1,
                 maxZoomLevel: this.config.global.maxZoomLevel,
                 minZoomLevel: this.config.global.minZoomLevel,
                 zoomPerScroll: this.config.global.zoomSpeed,
                 mouseNavEnabled: this.config.global.zoomSpeed > 1,
                 showNavigationControl: false,
                 showZoomControl: false,
                 showHomeControl: false,
                 showFullPageControl: true,
                 timeout: this.config.global.loadImageTimeout,
                 tileSources: tileSources,
                 blendTime: .5,
                 alwaysBlend: false,
                 imageLoaderLimit: this.config.global.maxParallelImageLoads,
                 viewportMargins: {
                     top: 0,
                     left: 0,
                     right: 0,
                     bottom: this.config.global.footerHeight
                 }
             } );
             var result = Q.defer();
                 
             this.observables = _createObservables(window, this);  
             
             var image = this;
             this.observables.viewerOpen.subscribe(function(openevent, loadevent) {            
                 result.resolve(image);                
             }, function(error) {            
                 result.reject(error);                
             });                
                 
                 
             // Calculate sizes if redraw is required
             
             this.observables.redrawRequired.subscribe(function(event) {            
                 if(_debug) {
                     console.log("viewer " + event.osState + "ed with target location ", event.targetLocation);                    
                 }
                 
                 image.redraw();
             });
                 
             if ( imageView.Controls ) {
                 this.controls = new imageView.Controls(this.config, this);
//                 osViewer.controls.init( _defaults );
             }
             
             if ( imageView.ZoomSlider ) {
                 this.zoomSlider = new imageView.ZoomSlider(this.config, this);
//                 osViewer.zoomSlider.init( _defaults );                
             }
             
             if ( imageView.Overlays ) {
                 this.overlays = new imageView.Overlays(this.config, this);
//                 osViewer.overlays.init( _defaults );                
             }                
             
             if ( imageView.DrawRect ) {
                 this.drawRect = new imageView.DrawRect(this.config, this);
//                 osViewer.drawRect.init();                
             }   
             
             if ( imageView.TransformRect ) {        
                 this.transformRect = new imageView.TransformRect(this.config, this);
//                 osViewer.transformRect.init();                
             }                
             
             this.observables.redrawRequired.connect();                
             return result.promise;
         }
         
//     imageView.Image.prototype.loadOpenSeadragon = function(tileSource) {
//             console.log("loading tilesource ", tileSource);                 
//             var imageWidth = this.config.imageWidth;
//             var canvasWidth = parseFloat(this.imageViewWidth);
//             var zoomFactor = imageWidth/canvasWidth;
//             console.log("init open seadragon with config ", this.config);
//             this.viewer = OpenSeadragon ({
//                 id: this.config.div,
//                 prefixUrl: this.config.resourcePath + "/javascript/openseadragon/images/",
//                 tileSources: tileSource,
//                 minZoomLevel: 0.2,
//                 maxZoomLevel: 2*zoomFactor,
//                 zoomPerClick: 1.0,
//                 showRotationControl: true,
//                 showZoomControl: false,
//                 degrees: this.config.initialRotation ? this.config.initialRotation : 0,
//                 showFullPageControl: false,
//                 visibilityRatio: 0,
//                 imageLoaderLimit: 2,
//                 homeButton: this.config.zoom.zoomHome,
//                 rotateLeftButton: this.config.rotation.rotateLeft,
//                 rotateRightButton: this.config.rotation.rotateRight,
//                 loadTilesWithAjax: true,
//                 ajaxHeaders: {
//                     "token" : this.config.webApiToken
//                 }
//             })
//
//             console.log("devicePixelRatio", window.devicePixelRatio);
//             _setupRotation(this);
//             this.zoomSlider = _setupZoomSlider(this);
//             
//     }
     /**
      * @return the list of observables associated with this viewer
      */
     imageView.Image.prototype.getObservables = function() {
         return this.observables;
     }
     /**
      * @return true if a footerImage exists
      */
     imageView.Image.prototype.hasFooter = function() {
         return this.footerImage != null;
     }
     /**
      * @return the config
      */
     imageView.Image.prototype.getConfig = function() {
         return this.config;
     }
     /**
      * Loads the image footer from the configured footer url
      */
     imageView.Image.prototype.loadFooter = function() {
         if ( this.config.image.baseFooterUrl && this.config.global.footerHeight > 0 ) {                
             this.footerImage = new Image();
             this.footerImage.src = this.config.image.baseFooterUrl.replace( "{width}", Math.round( this.container.width() ) ).replace( "{height}", Math.round( this.config.global.footerHeight ) );                
             this.footerImage.src = this.config.image.baseFooterUrl.replace( "/full/max/", "/full/!" + Math.round( this.container.width() ) + "," +  Math.round( this.config.global.footerHeight ) + "/");                
             var image = this;
             this.footerImage.onload = function() {
                 if ( _debug ) {
                     console.log( "loading footer image ", image.footerImage );
                     console.log( "Calculating image Footer size" );
                 }
                 
                 _drawFooter(image);
             };
         }
     }
     /**
      * gets the overlay group with the given name from the config
      */
     imageView.Image.prototype.getOverlayGroup = function( name ) {
         return this.config.getOverlayGroup( name );
     }
     /**
      * gets the highlighting coordinates from the config
      */
     imageView.Image.prototype.getHighlightCoordinates = function( name ) {
         return this.config.getCoordinates( name );
     }
     /**
      * return the sizes associated with this view
      */
     imageView.Image.prototype.getSizes = function() {
         return this.sizes;
     }
     /**
      * get the underlying tilesource of the viewer
      */
     imageView.Image.prototype.getImageInfo = function() {
         if(this.viewer) {
             return this.viewer.tileSources;
         }
         return null;
     }
     /**
      * close the OpenSeadragon viewer
      */
     imageView.Image.prototype.close = function() {
         if ( _debug ) {
             console.log( "Closing openSeadragon viewer" );
         }
         
         if ( this.viewer ) {
             this.viewer.destroy();
         }
     }
     /**
      * Calculates the sizes associates with this viewer
      */
     imageView.Image.prototype.redraw = function() {
         if(this.controls) {                     
             this.controls.setPanning( true );
         }
         this.sizes = _calculateSizes(this);
     }
     /**
      * @return a promise resolved once the first tile is loaded
      */
     imageView.Image.prototype.onFirstTileLoaded = function() {
         var defer = Q.defer();
         
         if(this.observables) {
             this.observables.firstTileLoaded.subscribe(function(event) {
                 defer.resolve(event);
             }, function(error) {
                 defer.reject(error)
             });
         } else {
             defer.reject("No observables defined");
         }
         return defer.promise;
     }
     /**
      * Scale the given point or rectangle in the original image to OpenSeadragon coordinates
      */
     imageView.Image.prototype.scaleToOpenSeadragon = function(roi) {
         var displayImageSize = this.viewer.world.getItemAt(0).source.dimensions;
         var originalImageSize = this.sizes.originalImageSize;
         var scale = originalImageSize.x/displayImageSize.x;
         roi = roi.times(1/displayImageSize.x);
         roi = roi.times(1/scale);        
         return roi;
     }
     /**
      * Scale the given point or rectangle in OpenSeadragon coordinates to original image coordinates
      */
     imageView.Image.prototype.scaleToImage = function(point) {
         var displayImageSize = this.viewer.world.getItemAt(0).source.dimensions;
         var originalImageSize = this.sizes.originalImageSize;
         var scale = originalImageSize.x/displayImageSize.x;
         roi = roi.times(displayImageSize.x);
         roi = roi.times(scale);
         return roi;
     }

//     imageView.Image.prototype.convertDisplayToImageCoordinates = function(overlay) {
//         var topLeft = this.scaleToImage(new OpenSeadragon.Point(overlay.rect.x, overlay.rect.y));
//         var bottomRight = this.scaleToImage(new OpenSeadragon.Point(overlay.rect.x+overlay.rect.width, overlay.rect.y+overlay.rect.height));
//         var angle = this.viewer.viewport.getRotation();
//         
//         topLeft = this.rotate(topLeft, angle);
//         bottomRight = this.rotate(bottomRight, angle);
//         var roi = new OpenSeadragon.Rect(topLeft.x, topLeft.y, bottomRight.x-topLeft.x, bottomRight.y-topLeft.y);
//         
//         return roi;
//     }
//     
//     imageView.Image.prototype.convertImageToDisplayCoordinates = function(rectString) {
//         var angle = -this.viewer.viewport.getRotation();
//         var points = rectString.split(',');
//         var x1 = parseInt(points[0]);
//         var y1 = parseInt(points[1]);
//         var x2 = parseInt(points[2]);
//         var y2 = parseInt(points[3]);
//         
//         
//         var topLeft = new OpenSeadragon.Point(x1, y1);
//         var bottomRight = new OpenSeadragon.Point(x2, y2);
//         
//         topLeft = this.rotateBack(topLeft, angle);
//         bottomRight = this.rotateBack(bottomRight, angle);
//         var roi = new OpenSeadragon.Rect(topLeft.x, topLeft.y, bottomRight.x-topLeft.x, bottomRight.y-topLeft.y);
//         roi = this.scaleToOpenSeadragon(roi);
//         return roi;
//     }
//     
//     imageView.Image.prototype.rotateBack = function(point, angle) {
//         var bounds = new OpenSeadragon.Rect(0,0,this.config.imageWidth, this.config.imageHeight);
//         var rotatedBounds = _getRotatedBounds(bounds, angle);
//
//         var center =  new OpenSeadragon.Point(this.config.imageWidth/2.0, this.config.imageHeight/2.0);
//         var translate = new OpenSeadragon.Point(-Math.abs(rotatedBounds.x), -Math.abs(rotatedBounds.y));
//         
//         point = point.plus(translate);
//         point = point.rotate(angle, center);
//         return point;
//     }
//     
//     imageView.Image.prototype.rotate = function(point, angle) {
//         var bounds = new OpenSeadragon.Rect(0,0,this.config.imageWidth, this.config.imageHeight);
//         var rotatedBounds = _getRotatedBounds(bounds, angle);
//
//         var center =  new OpenSeadragon.Point(this.config.imageWidth/2.0, this.config.imageHeight/2.0);
//         var translate = new OpenSeadragon.Point(Math.abs(rotatedBounds.x), Math.abs(rotatedBounds.y));
//         
//         point = point.rotate(angle, center);
//         point = point.plus(translate);
//         return point;
//     }
//     
     
     /**
      * input: a rectangle in the OpenSeadragon coordinate system
      * output: the same rectangle scaled to the size of the original image rotated by the current viewport rotation
      */
     imageView.Image.prototype.scaleToRotatedImage = function(roi) {
         var displayImageSize = this.viewer.world.getItemAt(0).source.dimensions;
         var originalImageSize = {x:this.config.imageWidth, y:this.config.imageHeight};
         
         var displayImageRect = new OpenSeadragon.Rect(0,0,displayImageSize.x, displayImageSize.y);
         var originalImageRect = new OpenSeadragon.Rect(0,0,originalImageSize.x, originalImageSize.y);
         
         var rotation = this.viewer.viewport.getRotation();
         var displayImageRect_rotated = _getRotatedBounds(displayImageRect, rotation);
         var originalImageRect_rotated = _getRotatedBounds(originalImageRect, rotation);
         
         var scale = originalImageRect_rotated.width/displayImageRect_rotated.width;
         roi = roi.times(displayImageSize.x);
         roi = roi.times(scale);
         return roi;
     }
     
     /**
      * input: a rectangle in the original image rotated by the current viewport rotation
      * output: the same rectangle scaled to OpenSeadragon coordinates
      */
     imageView.Image.prototype.scaleToOpenSeadragonCoordinates = function(roi) {
         var displayImageSize = this.viewer.world.getItemAt(0).source.dimensions;
         console.log("displayImageSize ", displayImageSize);
         var originalImageSize = {x:this.config.imageWidth, y:this.config.imageHeight};
         
         var displayImageRect = new OpenSeadragon.Rect(0,0,displayImageSize.x, displayImageSize.y);
         var originalImageRect = new OpenSeadragon.Rect(0,0,originalImageSize.x, originalImageSize.y);
         
         var rotation = this.viewer.viewport.getRotation();
         var displayImageRect_rotated = _getRotatedBounds(displayImageRect, rotation);
         var originalImageRect_rotated = _getRotatedBounds(originalImageRect, rotation);
         
         var scale = originalImageRect_rotated.width/displayImageRect_rotated.width;
         roi = roi.times(1/displayImageSize.x);
         roi = roi.times(1/scale);
         return roi;
     }
     
     imageView.convertCoordinatesFromImageToCanvas = function(rect, viewer) {
         var scale = viewer.drawer.context.canvas.width/viewer.viewport.getBoundsNoRotate(true).width;
         scale /= window.devicePixelRatio;
         
         var topLeft = _convertPointFromImageToCanvas(rect.getTopLeft(), viewer);
         var bottomRight = _convertPointFromImageToCanvas(rect.getBottomRight(), viewer);
         var centerX = topLeft.x + 0.5*(bottomRight.x-topLeft.x);
         var centerY = topLeft.y + 0.5*(bottomRight.y-topLeft.y);
         var canvasRect = new OpenSeadragon.Rect(centerX-0.5*rect.width*scale, centerY-0.5*rect.height*scale, rect.width*scale, rect.height*scale);
         return canvasRect;
     }
     
     imageView.convertCoordinatesFromCanvasToImage = function(rect, viewer) {
         
         var scale = viewer.drawer.context.canvas.width/viewer.viewport.getBoundsNoRotate(true).width;
         scale /= window.devicePixelRatio;
         
         var topLeft = _convertPointFromCanvasToImage(rect.getTopLeft(), viewer);
         var bottomRight = _convertPointFromCanvasToImage(rect.getBottomRight(), viewer);
         var centerX = topLeft.x + 0.5*(bottomRight.x-topLeft.x);
         var centerY = topLeft.y + 0.5*(bottomRight.y-topLeft.y);
         var canvasRect = new OpenSeadragon.Rect(centerX-0.5*rect.width/scale, centerY-0.5*rect.height/scale, rect.width/scale, rect.height/scale);
         return canvasRect;
     }

     
     imageView.convertPointFromImageToCanvas = function(point, viewer) {
         return _convertPointFromImageToCanvas(point, viewer);
     }
     
     imageView.convertPointFromCanvasToImage = function(point, viewer) {
         return _convertPointFromCanvasToImage(point, viewer);
     }
     
     /**
      * input parameter rect: A rectangle in the coordinate system of the plain unrotated image in OpenSeadragon coordinates
      * output: The same rectangle in trotated image in OpenSeadragon coordinates
      * 
      * Both rectangles are defined by their center and their width and height. Width and height remain constant,
      * while the center is converted into coordinates of the rotated image
      */
     imageView.convertRectFromImageToRotatedImage = function(rect, viewer) {
         
         var rotation = viewer.viewport.getRotation();
         var sourceBounds = new OpenSeadragon.Rect(0,0,viewer.source.width, viewer.source.height);
         var sourceBounds_rotated = _getRotatedBounds(sourceBounds, rotation);
         var aspectRatio_unrotated = sourceBounds.width/sourceBounds.height;
         var aspectRatio_rotated = sourceBounds_rotated.width/sourceBounds_rotated.height;
         
         var imageBounds_unrotated = new OpenSeadragon.Rect(0,0, 1.0, 1/aspectRatio_unrotated); 
         var imageBounds_rotated = _getRotatedBounds(imageBounds_unrotated, rotation);

         
         var rect_fromTopLeft_unrotated = rect.getCenter();
         var topLeft_fromCenter_unrotated = imageBounds_unrotated.getCenter().times(-1);
         var rect_fromCenter_unrotated = topLeft_fromCenter_unrotated.plus(rect_fromTopLeft_unrotated);

         var rect_fromCenter_rotated = _rotate(rect_fromCenter_unrotated, rotation, true);

         var topLeft_fromCenter_rotated = new OpenSeadragon.Point(imageBounds_rotated.width/2.0, imageBounds_rotated.height/2.0).times(-1);
         var rect_fromTopLeft_rotated = rect_fromCenter_rotated.minus(topLeft_fromCenter_rotated);
         var rect_rotated = new OpenSeadragon.Rect(rect_fromTopLeft_rotated.x-rect.width/2.0, rect_fromTopLeft_rotated.y-rect.height/2.0, rect.width, rect.height);
         return rect_rotated;
     }
     
     /**
      * input parameter rect: A rectangle in OpenSeadragon coordinates as if the image was the actual image rotated by the
      * current viewport rotation
      * output: The same rectangle in the displayed (unrotated) image in OpenSeadragon coordinates
      * 
      * Both rectangles are defined by their center and their width and height. Width and height remain constant,
      * while the center is converted into coordinates of the rotated image
      */
     imageView.convertRectFromRotatedImageToImage = function(rect, viewer) {

         var rotation = viewer.viewport.getRotation();
         var sourceBounds = new OpenSeadragon.Rect(0,0,viewer.source.width, viewer.source.height);
         var sourceBounds_rotated = _getRotatedBounds(sourceBounds, rotation);
         var aspectRatio_unrotated = sourceBounds.width/sourceBounds.height;
         var aspectRatio_rotated = sourceBounds_rotated.width/sourceBounds_rotated.height;
         
         var imageBounds_unrotated = new OpenSeadragon.Rect(0,0, 1.0, 1/aspectRatio_unrotated); 
         var imageBounds_rotated = _getRotatedBounds(imageBounds_unrotated, rotation);

         var topLeft_fromCenter_unrotated = imageBounds_unrotated.getCenter().times(-1);
         var topLeft_fromCenter_rotated = new OpenSeadragon.Point(imageBounds_rotated.width/2.0, imageBounds_rotated.height/2.0).times(-1);
         
         var rect_fromTopLeft_rotated = rect.getCenter();
         var rect_fromCenter_rotated = topLeft_fromCenter_rotated.plus(rect_fromTopLeft_rotated);

         var rect_fromCenter_unrotated = _rotate(rect_fromCenter_rotated, rotation, false);

         var rect_fromTopLeft_unrotated = rect_fromCenter_unrotated.minus(topLeft_fromCenter_unrotated);
         var rect_unrotated = new OpenSeadragon.Rect(rect_fromTopLeft_unrotated.x-rect.width/2.0, rect_fromTopLeft_unrotated.y-rect.height/2.0, rect.width, rect.height);
         return rect_unrotated;
     }

     function _createObservables(window, image) {
         var observables = {};
         observables.viewerOpen = Rx.Observable.create(function(observer) {
             image.viewer.addOnceHandler( 'open', function( event ) {
                 event.osState = "open";
                 
                 if(Number.isNaN(event.eventSource.viewport.getHomeBounds().x)) {
                     return observer.onError("Unknow error loading image from ", _defaults.image.tileSource);
                 } else {                    
                     return observer.onNext(event);
                 }
             } );
             image.viewer.addOnceHandler( 'open-failed', function( event ) {
                 event.osState = "open-failed";
                 console.log("Failed to open openseadragon ");
                 
                 return observer.onError(event);
             } );
         });
         
         observables.firstTileLoaded = Rx.Observable.create(function(observer) {
             image.viewer.addOnceHandler( 'tile-loaded', function( event ) {
                 event.osState = "tile-loaded";
                 
                 return observer.onNext(event);
             } );
             image.viewer.addOnceHandler( 'tile-load-failed', function( event ) {
                 event.osState = "tile-load-failed";
                 console.log("Failed to load tile");
                 
                 return observer.onError(event);
             } );
         });
         
         observables.viewerZoom = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'zoom', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.animationComplete = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'animation-finish', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.viewportUpdate = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'update-viewport', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.animation = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'animation', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.viewerRotate = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'rotate', function( event ) {
                 event.osState = "rotate";
                 return observer.onNext(event);
             } );
         });
         observables.canvasResize = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'resize', function( event ) {
                 event.osState = "resize";
                 
                 return observer.onNext(event);
             } );
         });
         observables.windowResize = Rx.Observable.fromEvent(window, "resize").map(function(event) {
             event.osState = "window resize";
             
             return event;
         });
         observables.overlayRemove = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'remove-overlay', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.overlayUpdate = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'update-overlay', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.levelUpdate = Rx.Observable.create(function(observer) {
             image.viewer.addHandler( 'update-level', function( event ) {
                 return observer.onNext(event);
             } );
         });
         observables.redrawRequired = observables.viewerOpen
         .merge(observables.viewerRotate
                 .merge(observables.canvasResize)
                 .debounce(10))
         .map(function(event) {
             var location = {};
             
             if(image.controls) {
                 location = image.controls.getLocation();
             }
             
             if(event.osState === "open") {
                 location.zoom = image.viewer.viewport.getHomeZoom();
                 if(image.config.image.location) {
                    location = image.config.image.location;
                 }
             }
             
             event.targetLocation = location;
             
             return event;
         }).publish();
         
         return observables;
     }
     
     function _drawFooter(image) {
         if ( image && image.viewer ) {
             _overlayFooter({userData:image});
             image.viewer.removeHandler( 'update-viewport', _overlayFooter);
             image.viewer.addHandler( 'update-viewport', _overlayFooter, image);
         }  
     }
     function _overlayFooter( event ) {
         var image = event.userData;
         if ( image.config.global.footerHeight > 0 ) {
             var footerHeight = image.config.global.footerHeight;
             var footerPos = new OpenSeadragon.Point( 0, image.container.height() - footerHeight );
             var footerSize = new OpenSeadragon.Point( image.container.width(), footerHeight );
             
             if ( !image.canvasScale ) {
                 image.canvasScale = image.viewer.drawer.context.canvas.width / image.viewer.drawer.context.canvas.clientWidth;
             }
             
             if ( image.canvasScale != 1 ) {
                 footerPos = footerPos.times( image.canvasScale );
                 footerSize = footerSize.times( image.canvasScale );
             }
             image.viewer.drawer.context.drawImage( image.footerImage, footerPos.x, footerPos.y, footerSize.x, footerSize.y );
         }
     };
     
     function _setupZoomSlider(image) {
         if(ImageView.ZoomSlider) {
             var slider = new ImageView.ZoomSlider(image.config.zoom, image);
             return slider;
         }
     }

     
     function _setupRotation(image) {
                  
         //set initial rotation
         var degrees = image.config.initialRotation;
         var deskew = _getDeskewAngle(degrees);
         image.rotation = _getRotation(degrees);
         var config = image.config.rotation;
         var viewer = image.viewer;
         
         //setup deskew slider
         if(config.rotationSlider) {             
             $("#" + config.rotationSlider).slider({
                 orientation: "vertical",
                 min: _MIN_DESKEW_ANGLE,
                 max: _MAX_DESKEW_ANGLE,
                 step: 0.1,
                 slide: function(event, ui) {
                     var degrees = -ui.value;
                     var deskew = _getDeskewAngle(degrees);
                     viewer.viewport.setRotation(deskew + image.rotation);
                 }
             });
             $("#" + config.rotationSlider).slider("option", "value", -deskew);
         }
         
         //handle rotation input
         if(config.rotationInput) {             
             $("#" + config.rotationInput).on("blur", function(event) {
                 var degrees = _normalizeAngle(event.target.value);
                 var deskew = _getDeskewAngle(degrees);
                 image.rotation = _getRotation(degrees);
                 viewer.viewport.setRotation(degrees);
                 if(config.rotationSlider) {                              
                     $("#" + config.rotationSlider).slider("option", "value", -deskew);
                 }
             });
         }
         //handle rotation changes
         viewer.addHandler( 'rotate', function( event ) {
             var degrees = _normalizeAngle(event.degrees);
             var deskew = _getDeskewAngle(degrees);
             image.rotation = _getRotation(viewer.viewport.getRotation());
             if(config.rotationInput) {                              
                 var rot = (image.rotation + deskew);
                 $("#" + config.rotationInput).val(rot.toFixed(1)).change();
             }
         });
     }
     
     function _calculateSizes(image) {
         if ( _debug ) {
             console.log( "viewImage: calcualte sizes" );
             console.log("Home zoom = ", image.viewer.viewport.getHomeZoom());
         }
         
         var sizes = new ImageView.Measures( image );
         
         if ( image.config.global.adaptContainerHeight ) {
             sizes.resizeCanvas();
         }
         
         if ( image.viewer != null ) {
             image.viewer.viewport.setMargins( {bottom: sizes.footerHeight + sizes.calculateExcessHeight()} );
         }
         
         if ( _debug ) {
             console.log( "sizes: ", sizes );
         }
         return sizes;
     };
     
     function _timeout(promise, time) {
         var deferred = new jQuery.Deferred();

         $.when(promise).done(deferred.resolve).fail(deferred.reject).progress(deferred.notify);

         setTimeout(function() {
             deferred.reject("timeout");
         }, time);

         return deferred.promise();
     }

     
     function _convertPointFromCanvasToImage(point, viewer) {
         
         var scale = viewer.drawer.context.canvas.width/viewer.viewport.getBoundsNoRotate(true).width;
         scale /= window.devicePixelRatio;
         
         var aspectRatio = viewer.source.width/viewer.source.height;
         var rotation = viewer.viewport.getRotation();
         var imageTopLeft_fromImageCenter = new OpenSeadragon.Point(0.5, 0.5/aspectRatio).times(-1);
         var canvasCenter_fromImageTopLeft = viewer.viewport.getCenter(true);
         var canvasCenter_fromCanvasTopLeft = new OpenSeadragon.Point(viewer.viewport.getBoundsNoRotate(true).width/2.0, viewer.viewport.getBoundsNoRotate(true).height/2.0);
         
         var canvasCenter_fromImageCenter = imageTopLeft_fromImageCenter.plus(canvasCenter_fromImageTopLeft);
         var canvasCenter_fromImageCenter_rotated = _rotate(canvasCenter_fromImageCenter, rotation, true);
         
         var imageCenter_fromCanvasTopLeft = canvasCenter_fromCanvasTopLeft.minus(canvasCenter_fromImageCenter_rotated);
         
         var point_fromCanvasTopLeft = point.times(1/scale);
         var point_fromImageCenter_rotated = point_fromCanvasTopLeft.minus(imageCenter_fromCanvasTopLeft);
         var point_fromImageTopLeft = _rotate(point_fromImageCenter_rotated, rotation, false).minus(imageTopLeft_fromImageCenter);

         return point_fromImageTopLeft;
     }
     
     function _convertPointFromImageToCanvas(point, viewer) {
         var canvasWidth = viewer.drawer.context.canvas.width;
         var viewportWidth = viewer.viewport.getBoundsNoRotate(true).width;

         var scale = canvasWidth/viewportWidth;
         scale /= window.devicePixelRatio;
         
         var aspectRatio = viewer.source.width/viewer.source.height;
         var rotation = viewer.viewport.getRotation();
         var imageTopLeft_fromImageCenter = new OpenSeadragon.Point(0.5, 0.5/aspectRatio).times(-1);
         var canvasCenter_fromImageTopLeft = viewer.viewport.getCenter(true);
         var canvasCenter_fromCanvasTopLeft = new OpenSeadragon.Point(viewer.viewport.getBoundsNoRotate(true).width/2.0, viewer.viewport.getBoundsNoRotate(true).height/2.0);
         
         var canvasCenter_fromImageCenter = imageTopLeft_fromImageCenter.plus(canvasCenter_fromImageTopLeft);
         var canvasCenter_fromImageCenter_rotated = _rotate(canvasCenter_fromImageCenter, rotation, true);
         
         var imageCenter_fromCanvasTopLeft = canvasCenter_fromCanvasTopLeft.minus(canvasCenter_fromImageCenter_rotated);

         var point_fromImageCenter = imageTopLeft_fromImageCenter.plus(point);
         var point_fromImageCenter_rotated = _rotate(point_fromImageCenter, rotation, true);
         
         var point_FromCanvasTopLeft = imageCenter_fromCanvasTopLeft.plus(point_fromImageCenter_rotated);

         var p = point_FromCanvasTopLeft.times(scale);
         
         return p;
     }

 /**
  * Rotates around the coordinate system origin
  */
 function _rotate(point, degrees, antiClockwise) {
     
     var rad = degrees*Math.PI/180.0;
     
     var x,y;
     if(antiClockwise) {
         x = point.x*Math.cos(rad) - point.y*Math.sin(rad);
         y = point.x*Math.sin(rad) + point.y*Math.cos(rad);
     } else {
         x =  point.x*Math.cos(rad) + point.y*Math.sin(rad);
         y = -point.x*Math.sin(rad) + point.y*Math.cos(rad);
     }
     
     return new OpenSeadragon.Point(x,y);
 }
     
     /**
      * Calculates the bounding rectangle that just encompasses the given rectangle rotated by the given angle in degrees.
      * The given rectangle is assumed to start at coordinates 0,0; and the returned rectangle will be given in the same coordinate frame,
      * i.e. with x and y values holding the offset from the original origin point (x and y are thus always negative, width and height always
      * larger than those of the original rectangle)
      * 
      * @param rect  the rectangle to rotate. must be an object with properties height and width
      * @param degrees   the rotation angle in degrees
      * @returns     An OpenSeadragon.Rect containing the rotated rectangle in the original coordinate system
      */
     function _getRotatedBounds(rect, degrees) {
             
             var rad = degrees * Math.PI/180.0;
         

             var sint = Math.abs(Math.sin(rad));
             var cost = Math.abs(Math.cos(rad));

             
             
             
             var hh = (rect.width * sint + rect.height * cost);
             var ww = (rect.width * cost + rect.height * sint);
//             double hh = Math.max(h1, h2);
//             double ww = hh * bounds.width / bounds.height;
//             double x = (bounds.width - ww) * .5;
//             double y = (bounds.height - hh) * .5;
             
             var w = Math.abs(ww);
             var h = Math.abs(hh);
             
             var dw = w - rect.width;
             var dh = h - rect.height;
             
             return new OpenSeadragon.Rect(-dw/2.0, -dh/2.0, w, h);
     }

     /**
      * Creates a tilesource object usable by the OpenSeadragon viewer from a url or json-object
      * @param source   either a url pointing to a iiif info json-object or directly to an image 
      * or a iiif info json-object, optionally as a string, or a list of image resource objects - consisting
      * each of a url, a width and a height - which act as layers of a pyramid view
      * @return a promise resolved when any urls are loaded - if no urls need to be loaded, the promise resolves immediately
      */
     function _createTileSource(source, config) {

         var result = Q.defer();

         ImageView.TileSourceResolver.resolveAsJson(source)
         .then(
                 function(imageInfo) {                        
                     if(_debug) {                
                         console.log("IIIF image info ", imageInfo);                        
                     }               
                     _setImageSizes(imageInfo, config.global.imageSizes);       
                     _setTileSizes(imageInfo, config.global.tileSizes);                
                     var tileSource;
                     if(imageInfo.tiles && imageInfo.tiles.length > 0) {
                         tileSource = new OpenSeadragon.IIIFTileSource(imageInfo);                    
                     } else {                
                         console.log("tiles? ", imageInfo.tiles);
                         tileSource  = _createPyramid(imageInfo);                    
                     }
                     
                     return tileSource;                
                 },
                 function(error) {            
                     if(ImageView.TileSourceResolver.isURI(config.image.tileSource)) {
                         if(_debug) {                    
                             console.log("Image URL", config.image.tileSource);                        
                         }
                         
                         var tileSource = new OpenSeadragon.ImageTileSource( {                    
                             url: config.image.tileSource,                        
                             buildPyramid: true,                        
                             crossOriginPolicy: false                        
                         } );
     
                         return tileSource;                    
                     } else {                
                         var errorMsg = "Failed to load tilesource from " + tileSource;
                         
                         if(_debug) {                    
                             console.log(errorMsg);                        
     }
                         
                         return Q.reject(errorMsg);
                         
                     }              
                 })
         .then(function(tileSource) {              
             result.resolve(tileSource);          
         }).catch(function(errorMessage) {              
             result.reject(errorMessage);          
         });
         return result.promise;
     }
     
     /**
      * creates a OpenSeadragon.LegacyTileSource (pyramid image source) from the given imageInfo object, which may either
      * be a IIIF imageInfo json-object or a list of image resource objects - consisting
      * each of a url, a width and a height
      * @param imageInfo    the image information json object, either a iiif image resource or a list of simple image resources
      * @return the tilesource usable by OpenSeadragon
      */
     function _createPyramid( imageInfo, config ) {
         if(_debug) {
             console.log("Creating legacy tilesource from imageInfo ", imageInfo);
         }
         var fileExtension = config.image.mimeType;
         fileExtension = fileExtension.replace( "image/", "" );
         fileExtension = fileExtension.replace("jpeg", "jpg").replace("tiff", "tif");
         var imageLevels = [];
         var tileSource;
         if(Array.isArray(imageInfo)) {
             imageInfo.forEach(function(level) {
                 level.mimetype = config.image.mimeType;
             });
             tileSource = new OpenSeadragon.LegacyTileSource(imageInfo);
         } else if(imageInfo.sizes) {
             imageInfo.sizes.forEach(function(size) {
                 if(_debug) {                    
                     console.log("Image level width = ", size.width)
                     console.log("Image level height = ", size.height)
                 }
                 
                 var level = {
                     mimetype: config.image.mimeType,
                     url: imageInfo["@id"].replace( "/info.json", "" ) + "/full/" + size.width + ",/0/default." + fileExtension,
                     width: imageInfo.width,
                     height: imageInfo.height
                 };
                 
                 if(_debug) {
                     console.log("Created level ", level);
                 }
                 
                 imageLevels.push( level );
             });
             
             tileSource = new OpenSeadragon.LegacyTileSource(imageLevels);
         } else {
             tileSource = new OpenSeadragon.ImageTileSource({
                 url: imageInfo["@id"].replace( "/info.json", "" ) + "/full/full/0/default." + fileExtension,
                 crossOriginPolicy: "Anonymous",
                 buildPyramid: false
             });
         }
         
         return tileSource;
     }
     
     /**
      * Inserts the given image sizes into the imageInfo object
      * @param imageInfo    the imageInfo object in which the sizes are inserted
      * @param sizes        the sizes to be inserted
      */
     function _setImageSizes(imageInfo, sizes) {
         if(sizes) {             
             var string = sizes.replace(/[\{\}]/, "");
             var sizes = JSON.parse(sizes);
             var iiifSizes = [];
             sizes.forEach(function(size) {
                 iiifSizes.push({"width": parseInt(size), "height": parseInt(size)});
             });
             if(iiifSizes.length > 0) {              
                 imageInfo.sizes = iiifSizes;
             } else {
                 delete imageInfo.sizes;
             }
         }
     }
     /**
      * Inserts the given tiles into the imageInfo object
      * @param imageInfo    the imageInfo object in which the tiles are inserted
      * @param tiles        the tiles to be inserted
      */
     function _setTileSizes(imageInfo, tiles) {
         if(tiles) {             
             if(typeof tiles === 'string') {                 
                 var tileString = tiles.replace(/(\d+)/, '"$1"').replace("=", ":");
                 tiles = JSON.parse(tileString);
             }
             var iiifTiles = [];
             
             Object.keys(tiles).forEach(function(size) {
                 var scaleFactors = tiles[size];
                 iiifTiles.push({"width": parseInt(size), "height": parseInt(size), "scaleFactors": scaleFactors})
             });
             
             imageInfo.tiles = iiifTiles;
         }
     }
     
     function _normalizeAngle(degrees) {
         var norm = ((degrees%360)+360)%360;
         return norm;
     }

     /**
      * get the rotation as a value between 0 and 360 degrees and rounded to 90 degrees 
      * 
      * @param degrees
      * @returns
      */
     function _getRotation(degrees) {
         degrees += _MAX_DESKEW_ANGLE;
         degrees /= 90;
         degrees = parseInt(degrees);
         degrees *= 90;
         return _normalizeAngle(degrees);
     }

     /**
      * get the rotation modulo 90 degrees as a value between 0 and 45 degrees or between 315 and 360 degrees
      * 
      * @param degrees
      * @returns
      */
     function _getDeskewAngle(degrees) {
         degrees += _MAX_DESKEW_ANGLE;
         degrees = parseFloat(degrees%90);
         degrees -= _MAX_DESKEW_ANGLE;
         degrees = _normalizeAngle(degrees);
         degrees = degrees > _MAX_DESKEW_ANGLE ? degrees-360 : degrees;
         return degrees;
     }

     function _rotateDiv(div, angle) {
             if(angle != 0) {
             $(div).css("-moz-transform", "rotate(" + angle + "deg)");
             $(div).css("-webkit-transform", "rotate(" + angle + "deg)");
             $(div).css("-ms-transform", "rotate(" + angle + "deg)");
             $(div).css("-o-transform", "rotate(" + angle + "deg)");
             $(div).css("transform", "rotate(" + angle + "deg)");
             var sin = Math.sin(angle);
             var cos = Math.cos(angle);
             $(div).css("filter", "progid:DXImageTransform.Microsoft.Matrix(M11="+cos+", M12="+sin+", M21=-"+sin+", M22="+cos+", sizingMethod='auto expand'");
             }
     }
     
     return imageView;
})();

//browser backward compability
if(!String.prototype.startsWith) {
    String.prototype.startsWith = function(subString) {
        var start = this.substring(0,subString.length);
        return start.localeCompare(subString) === 0;
    }
}
if(!String.prototype.endsWith) {
    String.prototype.endsWith = function(subString) {
        var start = this.substring(this.length-subString.length,this.length);
        return start.localeCompare(subString) === 0;
    }
}
if(!Array.prototype.find) {
    Array.prototype.find = function(comparator) {
        for ( var int = 0; int < this.length; int++ ) {
            var element = this[int];
            if(comparator(element)) {
                return element;
            }
        }
    }
}
if(!Number.isNaN) {
    Number.isNaN = function(number) {
        return number !== number;
    }
}




var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
//    var _currentZoom;
//    var _zoomedOut = true;
//    var _panning = false;
//    var _fadeout = null;
      
    imageView.Controls = function(config, image) {
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'imageView.controls.init' );
                console.log( '##############################' );
            }
            this.config = config;
            this.image = image;
            var controls = this;
            
            if(imageView.Controls.Persistence) {
                this.persistence = new imageView.Controls.Persistence(config, image)
//                imageView.controls.persistence.init(config);
            }
            if(_debug) {                
                console.log("Setting viewer location to", config.image.location);
            }
            if( image.observables ) {
                // set location after viewport update
                image.observables.redrawRequired
                .sample(image.observables.viewportUpdate)
                .subscribe(function(event) {
                    controls.setLocation(event)
                    controls.setPanning( false );
                });
                
                // zoom home if min zoom reached
                image.observables.viewerZoom.subscribe( function( event ) {
                    if ( _debug ) {
                        console.log( "zoom to " + image.viewer.viewport.getZoom( true ) );
                    }
                    if ( !controls.isPanning() ) {
                        var currentZoom = image.viewer.viewport.getZoom();                   
                        if ( currentZoom <= image.viewer.viewport.minZoomLevel ) {
                            if ( _debug ) {
                                console.log( "Zoomed out: Panning home" );
                            }
                            
                            controls.setPanning(true);
                            controls.goHome( true );
                            controls.setPanning(false);
                        }
                    }
                } );
            }
            
            // fade out fullscreen controls
            if ( $( '#fullscreenTemplate' ).length > 0 ) {
                $( '#fullscreenTemplate' ).on( 'mousemove', function() {  
                    controls.fullscreenControlsFadeout();
                } )
                
                $('#fullscreenMap').on('touchmove', function() {
                	controls.fullscreenControlsFadeout();
                }).on('touchend', function() {
                	controls.fullscreenControlsFadeout();
                });
            }
        }
        imageView.Controls.prototype.getLocation = function() {
            return {
                x: this.getCenter().x,
                y: this.getCenter().y,
                zoom: this.getZoom()/this.getCurrentRotationZooming(),
                rotation: this.getRotation(),
            }
        },
        imageView.Controls.prototype.getCenter = function() {
            if ( _debug ) {
                console.log( "image center is " + this.image.viewer.viewport.getCenter( true ) );
            }
            return this.image.viewer.viewport.getCenter( true );
        }
        imageView.Controls.prototype.setCenter = function( center ) {
            
            if ( _debug ) {
                console.log( "Setting image center to " );
                console.log( center );
            }
            
            this.image.viewer.viewport.panTo( center, true );
            
        },
        imageView.Controls.prototype.getZoom = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.getZoom' );
            }
            return this.image.viewer.viewport.getZoom( true );
        }
        imageView.Controls.prototype.zoomTo = function( zoomTo ) {
            if ( _debug ) {
                console.log( 'osViewer.controls.myZoomTo: zoomTo - ' + zoomTo );
            }
            
            var zoomBy = parseFloat( zoomTo ) / this.image.viewer.viewport.getZoom();
            
            if ( _debug ) {
                console.log( 'osViewer.controls.myZoomTo: zoomBy - ' + zoomBy );
            }
            
            this.image.viewer.viewport.zoomBy( zoomBy, this.image.viewer.viewport.getCenter( false ), true );
        }
        imageView.Controls.prototypesetFullScreen = function( enable ) {
            if ( _debug ) {
                console.log( 'osViewer.controls.setFullScreen: enable - ' + enable );
            }
            
            this.image.viewer.setFullScreen( enable );
        }
        imageView.Controls.prototype.goHome = function( immediate ) {
            if ( _debug ) {
                console.log( 'osViewer.controls.panHome - zoom : ' + this.image.viewer.viewport.getHomeZoom() );
            }
            this.image.viewer.viewport.goHome( immediate );
            this.zoomedOut = true;
        }
        imageView.Controls.prototype.reset = function( resetRotation ) {
            if ( _debug ) {
                console.log( 'osViewer.controls.goHome: bool - ' + resetRotation );
            }
            
            // osViewer.viewer.viewport.goHome( true );
            this.goHome( true );
            this.image.viewer.viewport.zoomTo( this.image.viewer.viewport.getHomeZoom(), null, true );
            if ( resetRotation ) {
                this.rotateTo( 0 );
            }
        }
        imageView.Controls.prototype.zoomIn = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.zoomIn: zoomSpeed - ' + this.config.global.zoomSpeed );
            }
            
            this.image.viewer.viewport.zoomBy( this.config.global.zoomSpeed, this.image.viewer.viewport.getCenter( false ), false );
        }
        imageView.Controls.prototype.zoomOut = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.zoomOut: zoomSpeed - ' + this.config.global.zoomSpeed );
            }
            
            this.image.viewer.viewport.zoomBy( 1 / this.config.global.zoomSpeed, this.image.viewer.viewport.getCenter( false ), false );
        }
//        imageView.Controls.prototype.getHomeZoom: function( rotated ) {
//            if ( rotated && this.image.getCanvasSize().x / osViewer.getCanvasSize().y <= osViewer.getImageSize().x / osViewer.getImageSize().y ) {
//                osViewer.viewer.viewport.homeFillsViewer = true;
//            }
//            var zoom = osViewer.viewer.viewport.getHomeZoom();
//            osViewer.viewer.viewport.homeFillsViewer = false;
//            return zoom;
//        },
        imageView.Controls.prototype.rotateRight = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.rotateRight' );
            }
            
            var newRotation = this.image.viewer.viewport.getRotation() + 90;
            this.rotateTo( newRotation );
        }
        imageView.Controls.prototype.rotateLeft = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.rotateLeft' );
            }
            
            var newRotation = this.image.viewer.viewport.getRotation() - 90;
            this.rotateTo( newRotation );
        },
        imageView.Controls.prototype.getRotation = function() {
            if ( _debug ) {
                console.log( 'osViewer.controls.getRotation' );
            }
            
            return this.image.viewer.viewport.getRotation();
        }
        imageView.Controls.prototype.setRotation = function( rotation ) {
            if ( _debug ) {
                console.log( 'osViewer.controls.setRotation: rotation - ' + rotation );
            }
            
            return this.rotateTo( rotation );
        }
        imageView.Controls.prototype.rotateTo = function( newRotation ) {
            if ( newRotation < 0 ) {
                newRotation = newRotation + 360;
            }
            newRotation = newRotation % 360;
            if ( _debug ) {
                console.log( 'osViewer.controls.rotateTo: newRotation - ' + newRotation );
            }
                        
            this.panning = true;        
            this.currentZoom = null;
            this.image.viewer.viewport.setRotation( newRotation );
            this.panning = false;

        }
        imageView.Controls.prototype.getCurrentRotationZooming = function() {
            var sizes = this.image.getSizes();
            if(sizes && sizes.rotated()) {
                return 1/sizes.ratio(sizes.originalImageSize);
            } else {
                return 1;
            }
        }
        imageView.Controls.prototype.setPanning = function(panning) {
            this.panning = panning;
        }
        imageView.Controls.prototype.isPanning = function() {
            return this.panning;
        }
        imageView.Controls.prototype.fullscreenControlsFadeout = function() {
            if ( _debug ) {
                console.log( '---------- osViewer.controls.fullscreenControlsFadeout() ----------' );
            }
            
            if ( this.fadeout ) {
                clearTimeout( this.fadeout );
                this.showFullscreenControls();
            }
            
            this.fadeout = setTimeout( this.hideFullscreenControls, 3000 );
        },
        imageView.Controls.prototype.hideFullscreenControls = function() {
            if ( _debug ) {
                console.log( '---------- osViewer.controls.hideFullscreenControls() ----------' );
            }
            
            $( '#fullscreenRotateControlsWrapper, #fullscreenZoomSliderWrapper, #fullscreenExitWrapper, #fullscreenPrevWrapper, #fullscreenNextWrapper' ).stop().fadeOut( 'slow' );
        }
        imageView.Controls.prototype.showFullscreenControls = function() {
            if ( _debug ) {
                console.log( '---------- osViewer.controls.showFullscreenControls() ----------' );
            }
            
            $( '#fullscreenRotateControlsWrapper, #fullscreenZoomSliderWrapper, #fullscreenExitWrapper, #fullscreenPrevWrapper, #fullscreenNextWrapper' ).show();
        }
        // set correct location, zooming and rotation once viewport has been updated after
        // redraw
        imageView.Controls.prototype.setLocation = function(event) {
            if(_debug) {                    
                console.log("Viewer changed from " + event.osState + " event");
                console.log("target location: ", event.targetLocation);
                console.log("Home zoom = ", this.image.viewer.viewport.getHomeZoom());
            }
             this.image.viewer.viewport.minZoomLevel = this.image.viewer.viewport.getHomeZoom() * this.config.global.minZoomLevel;
             var targetZoom = event.targetLocation.zoom;
             var targetLocation = new OpenSeadragon.Point(event.targetLocation.x, event.targetLocation.y);
             var zoomDiff = targetZoom * this.image.viewer.viewport.getHomeZoom() - (this.image.viewer.viewport.minZoomLevel);
    // console.log("zoomDiff: " + targetZoom + " * " + osViewer.viewer.viewport.getHomeZoom()
    // + " - " + osViewer.viewer.viewport.minZoomLevel + " = ", zoomDiff);
    // console.log("zoomDiff: " + targetZoom + " - " + osViewer.viewer.viewport.minZoomLevel +
    // "/" + osViewer.controls.getCurrentRotationZooming() + " = ", zoomDiff);
             var zoomedOut = zoomDiff < 0.001 || !targetZoom;
             if(zoomedOut) {
                 if(_debug) {                         
                     console.log("Zooming home")
                 }
                 this.goHome( true );
             } else {
                 if(_debug) {                         
                     console.log( "Zooming to " + targetZoom + " * " + this.getCurrentRotationZooming() );
                     console.log("panning to ", targetLocation);
                 }
                 this.image.viewer.viewport.zoomTo( targetZoom * this.getCurrentRotationZooming(), null, true);
                 this.setCenter( targetLocation);
             }
             if(event.osState === "open" && event.targetLocation.rotation !== 0) {
                this.rotateTo(event.targetLocation.rotation);
             }
        }

    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false; 
    
    imageView.Controls.Persistence = function(config, image) {
        
            if ( typeof ( Storage ) !== 'undefined' ) {
                
                /**
                 * Set Location from local storage
                 */
                var location = null;
                var currentPersistenceId = config.global.persistenceId;
                if ( config.global.persistZoom || config.global.persistRotation ) {
                    try {
                        var location = JSON.parse( localStorage.imageLocation );
                    }
                    catch ( err ) {
                        if ( _debug ) {
                            console.error( "No readable image location in local storage" );
                        }
                    }
                    if ( location && _isValid( location ) && location.persistenceId === currentPersistenceId ) {
                        if ( _debug ) {
                            console.log( "Reading location from local storage", location );
                        }
                        config.image.location = {};
                        if ( config.global.persistZoom ) {
                            if ( _debug ) {
                                console.log( "setting zoom from local storage" );
                            }
                            config.image.location.zoom = location.zoom;
                            config.image.location.x = location.x;
                            config.image.location.y = location.y;
                        }
                        if ( config.global.persistRotation ) {
                            if ( _debug ) {
                                console.log( "setting rotation from local storage" );
                            }
                            config.image.location.rotation = location.rotation;
                        }
                        else {
                            config.image.location.rotation = 0;
                        }
                        
                    }
                    
                    /**
                     * save current location to local storage before navigating away
                     */
                    window.onbeforeunload = function() {
                        var loc = image.controls.getLocation();
                        loc.persistenceId = config.global.persistenceId;
                        localStorage.imageLocation = JSON.stringify( loc );
                        if ( _debug ) {
                            console.log( "storing zoom " + localStorage.imageLocation );
                        }
                    }
                }
            }
        }

    function _isValid( location ) {
        return _isNumber( location.x ) && _isNumber( location.y ) && _isNumber( location.zoom ) && _isNumber( location.rotation );
    }
    
    function _isNumber( x ) {
        return typeof x === "number" && !Number.isNaN( x );
    }
    
    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    
    var drawingStyleClass = "drawing";
    var _hbAdd = 5;
    var _minDistanceToExistingRect = 0.01;
    
    var _active = false;
    var _drawing = false;
    var _overlayGroup = null;
    var _finishHook = null;
    var _viewerInputHook = null;
    var _deleteOldDrawElement = true;
    var _drawElement = null;
    var _drawPoint = null;
    
    imageView.DrawRect = function(config, image) {
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'osViewer.drawRect.init' );
                console.log( '##############################' );
            }
            this.config = config;
            this.image = image;
            var draw = this;
            this.viewerInputHook = image.viewer.addViewerInputHook( {
                hooks: [ {
                    tracker: "viewer",
                    handler: "clickHandler",
                    hookHandler: function(event) { _disableViewerEvent(event, draw) }
                // }, {
                // tracker: "viewer",
                // handler: "scrollHandler",
                // hookHandler: _disableViewerEvent
                }, {
                    tracker: "viewer",
                    handler: "dragHandler",
                    hookHandler: function(event) { _onViewerDrag(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "pressHandler",
                    hookHandler: function(event) { _onViewerPress(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "dragEndHandler",
                    hookHandler: function(event) { _onViewerDragEnd(event, draw) }
                } ]
            } );
        }
       imageView.DrawRect.prototype.startDrawing = function( overlayGroup, finishHook ) {
            this.active = true;
            this.overlayGroup = overlayGroup;
            this.finishHook = finishHook;
        }
        imageView.DrawRect.prototype.endDrawing = function( removeLastElement ) {
            this.active = false;
            this.overlayGroup = null;
            this.finishHook = null;
            if ( this.drawElement && removeLastElement ) {
                this.image.viewer.removeOverlay( this.drawElement );
            }
            else {
                $( this.drawElement ).removeClass( drawingStyleClass );
            }
        }
        imageView.DrawRect.prototype.isActive = function() {
            return this.active;
        }
        imageView.DrawRect.prototype.isDrawing = function() {
            return this.drawing;
        }
        imageView.DrawRect.prototype.removeLastDrawnElement = function() {
            if ( this.drawElement ) {
                this.image.viewer.removeOverlay( this.drawElement );
            }
        }

    function _onViewerPress( event, draw) {
        if ( draw.active ) {
            draw.drawPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            
            event.preventDefaultAction = false;
            return true;
        }
    }
    
    function _onViewerDrag( event, draw ) {
        // if(_debug) {
        // console.log("Dragging: ");
        // console.log("_active = " + _active);
        // console.log("_drawing = " + _drawing);
        // console.log("_drawPoint = " + _drawPoint);
        // }
        if ( draw.drawing ) {
            var newPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            var rect = new OpenSeadragon.Rect( draw.drawPoint.x, draw.drawPoint.y, newPoint.x - draw.drawPoint.x, newPoint.y - draw.drawPoint.y );
            if ( newPoint.x < draw.drawPoint.x ) {
                rect.x = newPoint.x;
                rect.width = draw.drawPoint.x - newPoint.x;
            }
            if ( newPoint.y < draw.drawPoint.y ) {
                rect.y = newPoint.y;
                rect.height = draw.drawPoint.y - newPoint.y;
            }
            draw.image.viewer.updateOverlay( draw.drawElement, rect, 0 );
            event.preventDefaultAction = true;
            return true;
            
        }
        else if ( draw.active && draw.drawPoint ) {
            var activeOverlay = draw.image.overlays.getDrawingOverlay();
            if ( activeOverlay && draw.image.transformRect && draw.image.transformRect.isActive()
                    && draw.image.overlays.contains( activeOverlay.rect, draw.drawPoint, _minDistanceToExistingRect ) ) {
                draw.drawPoint = null;
                if ( _debug )
                    console.log( "Action overlaps active overlay" );
            }
            else {
                draw.drawing = true;
                if ( activeOverlay && _deleteOldDrawElement ) {
                    draw.image.overlays.removeOverlay( activeOverlay );
                }
                
                draw.drawElement = document.createElement( "div" );
                if ( draw.overlayGroup ) {
                    $( draw.drawElement ).addClass( draw.overlayGroup.styleClass );
                }
                $( draw.drawElement ).addClass( drawingStyleClass );
                var rect = new OpenSeadragon.Rect( draw.drawPoint.x, draw.drawPoint.y, 0, 0 );
                draw.image.viewer.addOverlay( draw.drawElement, rect, 1 );
            }
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function _onViewerDragEnd( event, draw ) {
        if ( draw.drawing ) {
            draw.drawing = false;
            var newPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            var rect = new OpenSeadragon.Rect( draw.drawPoint.x, draw.drawPoint.y, newPoint.x - draw.drawPoint.x, newPoint.y - draw.drawPoint.y );
            if ( newPoint.x < draw.drawPoint.x ) {
                rect.x = newPoint.x;
                rect.width = draw.drawPoint.x - newPoint.x;
            }
            if ( newPoint.y < draw.drawPoint.y ) {
                rect.y = newPoint.y;
                rect.height = draw.drawPoint.y - newPoint.y;
            }
            rect.hitBox = {
                l: rect.x - _hbAdd,
                t: rect.y - _hbAdd,
                r: rect.x + rect.width + _hbAdd,
                b: rect.y + rect.height + _hbAdd
            };
            
            var overlay = {
                type: imageView.Overlays.OverlayTypes.RECTANGLE,
                element: draw.drawElement,
                rect: rect,
                group: draw.overlayGroup.name,
            };
            draw.image.overlays.setDrawingOverlay( overlay );
            if ( draw.finishHook ) {
                draw.finishHook( overlay );
            }
            
            event.preventDefaultAction = true;
            return true;
        }
        
    }
    
    function _disableViewerEvent( event ) {
        if ( _active ) {
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function checkForRectHit( point ) {
        var i;
        for ( i = 0; i < _rects.length; i++ ) {
            var x = _rects[ i ];
            if ( point.x > x.hitBox.l && point.x < x.hitBox.r && point.y > x.hitBox.t && point.y < x.hitBox.b ) {
                var topLeftHb = {
                    l: x.x - _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + _hbAdd
                };
                var topRightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + _hbAdd
                };
                var bottomRightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var bottomLeftHb = {
                    l: x.x - _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var topHb = {
                    l: x.x + _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + x.width - _hbAdd,
                    b: x.y + _hbAdd
                };
                var rightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y + _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + x.height - _hbAdd
                };
                var bottomHb = {
                    l: x.x + _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + x.width - _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var leftHb = {
                    l: x.x - _hbAdd,
                    t: x.y + _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + x.height - _hbAdd
                };
            }
        }
    }
    
    return imageView;
    
} )( ImageView );

ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    
    imageView.Measures = function( imageView ) {
        this.config = imageView.getConfig();
        this.$container = $( "#" + this.config.global.divId );
        
        this.outerCanvasSize = new OpenSeadragon.Point( this.$container.outerWidth(), this.$container.outerHeight() );
        this.innerCanvasSize = new OpenSeadragon.Point( this.$container.width(), this.$container.height() );
        this.originalImageSize = new OpenSeadragon.Point( this.getTotalImageWidth( imageView.getImageInfo() ), this.getMaxImageHeight( imageView.getImageInfo() ) );
        // console.log("Original image size = ", this.originalImageSize);
        this.footerHeight = this.config.global.footerHeight;
        this.rotation = imageView.viewer != null ? imageView.viewer.viewport.getRotation() : 0;
        this.xPadding = this.outerCanvasSize.x - this.innerCanvasSize.x;
        this.yPadding = this.outerCanvasSize.y - this.innerCanvasSize.y;
        this.innerCanvasSize.y -= this.footerHeight;
        
        // calculate image size as it should be displayed in relation to canvas size
        if ( this.fitToHeight() ) {
            this.imageDisplaySize = new OpenSeadragon.Point( this.innerCanvasSize.y / this.ratio( this.getRotatedSize( this.originalImageSize ) ), this.innerCanvasSize.y )
        }
        else {
            this.imageDisplaySize = new OpenSeadragon.Point( this.innerCanvasSize.x, this.innerCanvasSize.x * this.ratio( this.getRotatedSize( this.originalImageSize ) ) )
        }
        if ( this.rotated() ) {
            this.imageDisplaySize = this.getRotatedSize( this.imageDisplaySize );
        }
    };
    imageView.Measures.prototype.getMaxImageWidth = function( imageInfo ) {
        var width = 0;
        if ( imageInfo && imageInfo.length > 0 ) {
            for ( var i = 0; i < imageInfo.length; i++ ) {
                var tileSource = imageInfo[ i ];
                if ( tileSource.tileSource ) {
                    correction = tileSource.width;
                    tileSource = tileSource.tileSource;
                }
                width = Math.max( width, tileSource.width * correction );
            }
        }
        return width;
    };
    imageView.Measures.prototype.getMaxImageHeight = function( imageInfo ) {
        var height = 0;
        if ( imageInfo && imageInfo.length > 0 ) {
            for ( var i = 0; i < imageInfo.length; i++ ) {
                var tileSource = imageInfo[ i ];
                var correction = 1;
                if ( tileSource.tileSource ) {
                    correction = tileSource.width;
                    tileSource = tileSource.tileSource;
                }
                height = Math.max( height, tileSource.height * correction );
            }
        }
        return height;
    };
    imageView.Measures.prototype.getTotalImageWidth = function( imageInfo ) {
        var width = 0;
        if ( imageInfo && imageInfo.length > 0 ) {
            for ( var i = 0; i < imageInfo.length; i++ ) {
                var tileSource = imageInfo[ i ];
                var correction = 1;
                if ( tileSource.tileSource ) {
                    correction = tileSource.width;
                    tileSource = tileSource.tileSource;
                }
                width += ( tileSource.width * correction );
            }
        }
        return width;
    };
    imageView.Measures.prototype.getTotalImageHeight = function( imageInfo ) {
        var height = 0;
        if ( imageInfo && imageInfo.length > 0 ) {
            for ( var i = 0; i < imageInfo.length; i++ ) {
                var tileSource = imageInfo[ i ];
                var aspectRatio
                if ( tileSource.tileSource ) {
                    correction = tileSource.width;
                    tileSource = tileSource.tileSource;
                }
                height += tileSource.height * correction;
            }
        }
        return height;
    };
    imageView.Measures.prototype.getImageHomeSize = function() {
        var ratio = this.rotated() ? 1 / this.ratio( this.originalImageSize ) : this.ratio( this.originalImageSize );
        if ( this.fitToHeight() ) {
            var height = this.innerCanvasSize.y;
            var width = height / ratio;
        }
        else {
            var width = this.innerCanvasSize.x;
            var height = width * ratio;
        }
        return this.getRotatedSize( new OpenSeadragon.Point( width, height ) );
    };
    imageView.Measures.prototype.rotated = function() {
        return this.rotation % 180 !== 0;
    };
    imageView.Measures.prototype.landscape = function() {
        return this.ratio( this.originalImageSize ) < 1;
    };
    imageView.Measures.prototype.ratio = function( size ) {
        return size.y / size.x;
    };
    imageView.Measures.prototype.getRotatedSize = function( size ) {
        return new OpenSeadragon.Point( this.rotated() ? size.y : size.x, this.rotated() ? size.x : size.y );
    };
    imageView.Measures.prototype.fitToHeight = function() {
        return !this.config.global.adaptContainerHeight && this.ratio( this.getRotatedSize( this.originalImageSize ) ) > this.ratio( this.innerCanvasSize );
    };
    imageView.Measures.prototype.resizeCanvas = function() {
        // Set height of container if required
        if ( this.config.global.adaptContainerHeight ) {
            if ( _debug ) {
                console.log( "adapt container height" );
            }
            this.$container.height( this.getRotatedSize( this.imageDisplaySize ).y + this.footerHeight );
        }
        this.outerCanvasSize = new OpenSeadragon.Point( this.$container.outerWidth(), this.$container.outerHeight() );
        this.innerCanvasSize = new OpenSeadragon.Point( this.$container.width(), this.$container.height() - this.footerHeight );
    };
    imageView.Measures.prototype.calculateExcessHeight = function() {
        var imageSize = this.getRotatedSize( this.getImageHomeSize() );
        var excessHeight = this.config.global.adaptContainerHeight || this.fitToHeight() ? 0 : 0.5 * ( this.innerCanvasSize.y - imageSize.y );
        return excessHeight;
    };
    
    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    var _focusStyleClass = 'focus';
    var _highlightStyleClass = 'highlight';
//    var _overlayFocusHook = null;
//    var _overlayClickHook = null;
//    var _drawingOverlay = null;
//    var _overlays = [];
    
//    var _initializedCallback = null;

    imageView.Overlays = function(config, image){
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'osViewer.overlays.init' );
                console.log( '##############################' );
            }
            this.config = config;
            this.image = image;
            this.overlays = [];
            var overlays = this;
            
            this.image.observables.overlayRemove.subscribe(function( event ) {
                if ( event.element ) {
                    $( event.element ).remove();
                }
            });
            if(this.config.image.highlightCoords) {
               	this.image.observables.viewerOpen.subscribe( function( data ) {
            		for ( var index=0; index<overlays.config.image.highlightCoords.length; index++) {
            			var highlightCoords = overlays.config.image.highlightCoords[ index ];
            			var imageIndex = highlightCoords.pageIndex;
            			overlays.draw( highlightCoords.name, highlightCoords.displayTooltip, imageIndex);
            		}
            		if ( overlays.initializedCallback ) {
            			overlays.initializedCallback();
            		}
            	} );
            }
        }
        imageView.Overlays.prototype.onInitialized = function( callback ) {
            var oldCallback = this.initializedCallback;
            this.initializedCallback = function() {
                if ( oldCallback ) {
                    oldCallback();
                }
                callback();
            }
        }
        imageView.Overlays.prototype.onFocus = function( hook ) {
            var tempHook = this.overlayFocusHook;
            this.overlayFocusHook = function( overlay, focus ) {
                if ( tempHook )
                    tempHook( overlay, focus );
                hook( overlay, focus );
            }
        }
        imageView.Overlays.prototype.onClick = function( hook ) {
            var tempHook = this.overlayClickHook;
            this.overlayClickHook = function( overlay ) {
                if ( tempHook )
                    tempHook( overlay );
                hook( overlay );
            }
        },
        imageView.Overlays.prototype.getOverlays = function() {
            return this.overlays.slice();
        }
        imageView.Overlays.prototype.getRects = function() {
            return this.overlays.filter( function( overlay ) {
                return overlay.type === imageView.Overlays.OverlayTypes.RECTANGLE
            } ).slice();
        }
        imageView.Overlays.prototype.getLines = function() {
            return this.overlays.filter( function( overlay ) {
                return overlay.type === imageView.Overlays.OverlayTypes.LINE
            } ).slice();
        },
        imageView.Overlays.prototype.draw = function( group, displayTitle, imageIndex ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.draw: group - ' + group );
                console.log( 'osViewer.overlays.draw: displayTitle - ' + displayTitle );
                console.log( 'osViewer.overlays.draw: imageIndex - ' + imageIndex );
            }
            
            var coordList = this.config.getCoordinates( group );
            if ( coordList ) {
                for ( var index=0; index<coordList.coordinates.length; index++ ) {
                    var coords = coordList.coordinates[ index ];
                    var title = displayTitle && coords.length > 4 ? coords[ 4 ] : '';
                    var id = coords.length > 5 ? coords[ 5 ] : index;
                    this.createRectangle( coords[ 0 ], coords[ 1 ], coords[ 2 ] - coords[ 0 ], coords[ 3 ] - coords[ 1 ], title, id, group, imageIndex );
                }
            }
        }
        imageView.Overlays.prototype.unDraw = function( group ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.unDraw: group - ' + group );
            }
            
            var newRects = [];
            this.overlays = this.overlays.filter( function( overlay ) {
                if ( overlay.group === group ) {
                    this.image.viewer.removeOverlay( overlay.element );
                    return false;
                }
                else {
                    return true;
                }
            } );
        }
        imageView.Overlays.prototype.highlight = function( group ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.highlight: group - ' + group );
            }
            
            this.overlays.filter( function( overlay ) {
                return overlay.group === group;
            } ).forEach( function( overlay ) {
                if ( overlay.element ) {
                    overlay.element.highlight( true );
                }
            } );
            
        }
        imageView.Overlays.prototype.unHighlight = function( group ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.unHighlight: group - ' + group );
            }
            
            this.overlays.filter( function( overlay ) {
                return overlay.group === group;
            } ).forEach( function( overlay ) {
                if ( overlay.element ) {
                    overlay.element.highlight( false );
                }
            } );
            
        }
        imageView.Overlays.prototype.focusBox = function( group, id ) {
            if ( _debug ) {
            	console.log( 'osViewer.overlays.highlightBox: group - ' + group );
            	console.log( 'osViewer.overlays.highlightBox: id - ' + id );
            }
            this.overlays.filter( function( overlay ) {
                return overlay.group === group;
            } ).forEach( function( overlay ) {
                if ( overlay.element ) {
                    overlay.element.focus( overlay.id === id );
                }
            } );
            
        }
        imageView.Overlays.prototype.addOverlay = function( overlay ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.addOverlay: overlay - ' + overlay );
            }
            
            this.overlays.push( overlay );
            if ( overlay.element ) {
                this.image.viewer.updateOverlay( overlay.element, overlay.rect, 0 );
            }
        }
        imageView.Overlays.prototype.removeOverlay = function( overlay ) {
            if ( overlay ) {
                if ( _debug )
                    console.log( "Removing overlay " + overlay.id );
                var index = this.overlays.indexOf( overlay );
                this.overlays.splice( index, 1 );
                if ( overlay.element ) {
                    this.image.viewer.removeOverlay( overlay.element );
                }
            }
        }
        imageView.Overlays.prototype.drawRect = function( rectangle, group, title, id ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.drawRect: rectangle - ' + rectangle );
                console.log( 'osViewer.overlays.drawRect: group - ' + group );
            }
            
            this.createRectangle( rectangle.x, rectangle.y, rectangle.width, rectangle.height, title ? title : "", id ? id : "", group );
        }
        imageView.Overlays.prototype.drawLine = function( point1, point2, group ) {
            if ( _debug ) {
                console.log( 'osViewer.overlays.drawLine: point1 - ' + point1 );
                console.log( 'osViewer.overlays.drawLine: point2 - ' + point2 );
                console.log( 'osViewer.overlays.drawLine: group - ' + group );
            }
            
            this.createLine( point1.x, point1.y, point2.x, point2.y, "", "", group );
        }
        imageView.Overlays.prototype.showOverlay = function( overlay ) {
            if ( overlay && !overlay.element ) {
                _drawOverlay( overlay, this );
                if ( this.overlayFocusHook ) {
                    this.overlayFocusHook( overlay, true );
                }
            }
            
        }
        imageView.Overlays.prototype.hideOverlay = function( overlay ) {
            if ( overlay && overlay.element && this.drawingOverlay != overlay ) {
                _undrawOverlay( overlay, this );
                if ( this.overlayFocusHook ) {
                    this.overlayFocusHook( overlay, false );
                }
            }
        }
        imageView.Overlays.prototype.getOverlay = function( id, group ) {
            var overlay =  this.overlays.find( function( overlay ) {
                if ( group ) {
                    return overlay.id === id && overlay.group === group;
                }
                else {
                    return overlay.id === id
                }
            } );
// console.log("search for overlay with id = " + id);
// console.log("Found overlay ", overlay);
            return overlay;
        }
        imageView.Overlays.prototype.getCoordinates = function( overlay ) {
            if(_debug){
                console.log("getCoordinates - overlay", overlay);
            }
            if ( overlay.type === imageView.Overlays.OverlayTypes.RECTANGLE ) {
                var transformedRect = this.image.viewer.viewport.viewportToImageRectangle( overlay.rect );
                return transformedRect;
            }
            else if ( overlay.type === imageView.Overlays.OverlayTypes.LINE ) {
                var p1 = this.image.viewer.viewport.viewportToImageCoordinates( overlay.poin1 );
                var p2 = this.image.viewer.viewport.viewportToImageCoordinates( overlay.poin2 );
                return {
                    point1: p1,
                    point2: p2
                };
            }
        }
        imageView.Overlays.prototype.getDrawingOverlay = function() {
            return this.drawingOverlay;
        }
        imageView.Overlays.prototype.setDrawingOverlay = function( overlay ) {
            this.drawingOverlay = overlay;
        }
        imageView.Overlays.prototype.showHiddenOverlays = function() {
            var overlays = this;
            this.image.viewer.addViewerInputHook( {
                hooks: [ {
                    tracker: "viewer",
                    handler: "moveHandler",
                    hookHandler: function(event) { _onViewerMove(event, overlays) }
                } ]
            } );
        }
        imageView.Overlays.prototype.contains = function( rect, point, precision ) {
            if ( precision == null ) {
                precision = 0;
            }
            return _isInside( rect, point, precision );
        }
        imageView.Overlays.OverlayTypes = {
            RECTANGLE: "rectangle",
            LINE: "line"
        }
        
        imageView.Overlays.prototype.createLine = function( x1, y1, x2, y2, title, id, group ) {
            if ( _debug ) {
                console.log( '------------------------------' );
                console.log( 'Overlays _createLine: x1 - ' + x1 );
                console.log( 'Overlays _createLine: y1 - ' + y1 );
                console.log( 'Overlays _createLine: x2 - ' + x2 );
                console.log( 'Overlays _createLine: y2 - ' + y2 );
                console.log( 'Overlays _createLine: title - ' + title );
                console.log( 'Overlays _createLine: id - ' + id );
                console.log( 'Overlays _createLine: group - ' + group );
                console.log( '------------------------------' );
            }
            
            var p1 = new OpenSeadragon.Point( x1, y1 );
            var p2 = new OpenSeadragon.Point( x2, y2 );
            var length = p1.distanceTo( p2 );
            
            var angle = _calculateAngle( p1, p2 );
            var beta = ( 180 - angle ) / 2;
    // console.log( "drawing line with length = " + length + " and angle = " + angle );
            
            y1 += length / 2 * Math.sin( angle * Math.PI / 180 );
            x1 -= length / 2 * Math.sin( angle * Math.PI / 180 ) / Math.tan( beta * Math.PI / 180 );
     
            var rectangle = this.image.viewer.viewport.imageToViewportRectangle( x1, y1, length, 1 );
            var p1Viewer = this.image.viewer.viewport.imageToViewportCoordinates( p1 );
            var p2Viewer = this.image.viewer.viewport.imageToViewportCoordinates( p2 );
            var overlay = {
                type: imageView.Overlays.OerlayTypes.LINE,
                rect: rectangle,
                angle: angle,
                point1: p1Viewer,
                point2: p2Viewer,
                group: group,
                id: id,
                title: title
            };
            var overlayStyle = this.config.getOverlayGroup( overlay.group );
            if ( !overlayStyle.hidden ) {
                _drawOverlay( overlay, this );
            }
            this.overlays.push( overlay );
            
        }
        
        /**
         * coordinates are in original image space
         */
        imageView.Overlays.prototype.createRectangle = function( x, y, width, height, title, id, group, imageIndex ) {
            if ( _debug ) {
                console.log( '------------------------------' );
                console.log( 'Overlays _createRectangle: x - ' + x );
                console.log( 'Overlays _createRectangle: y - ' + y );
                console.log( 'Overlays _createRectangle: width - ' + width );
                console.log( 'Overlays _createRectangle: height - ' + height );
                console.log( 'Overlays _createRectangle: title - ' + title );
                console.log( 'Overlays _createRectangle: id - ' + id );
                console.log( 'Overlays _createRectangle: group - ' + group );
                console.log( 'Overlays _createRectangle: imageIndex - ' + imageIndex );
                console.log( '------------------------------' );
            }
            
            if(!imageIndex) {
                imageIndex = 0;
            }
                var tiledImage = this.image.viewer.world.getItemAt(imageIndex);
                var rectangle = tiledImage.imageToViewportRectangle( x, y, width, height );
    // console.log("Found rect ", rectangle);
    // var rectangle = osViewer.viewer.viewport.imageToViewportRectangle( x, y, width, height
    // );
                var overlay = {
                        type: imageView.Overlays.OverlayTypes.RECTANGLE,
                        rect: rectangle,
                        group: group,
                        id: id,
                        title: title
                };
                var overlayStyle = this.config.getOverlayGroup( overlay.group );
                if ( !overlayStyle.hidden ) {
                    _drawOverlay( overlay, this);
                }
                this.overlays.push( overlay );

            
            
        }

    
    function _undrawOverlay( overlay, overlays ) {
        overlays.image.viewer.removeOverlay( overlay.element );
        overlay.element = null;
    }
    
    function _drawOverlay( overlay, overlays ) {
        if(_debug) {
            console.log("viewImage.overlays._drawOverlay");
            console.log("overlay: ", overlay);
        }
        var element = document.createElement( "div" );
        $(element).attr("id", "overlay_" + overlay.id)
        var overlayStyle = overlays.image.config.getOverlayGroup( overlay.group );
        if ( overlayStyle ) {
            if(_debug)console.log("overlay style", overlayStyle);
// element.title = overlay.title;
// $( element ).attr( "data-toggle", "tooltip" );
// $( element ).attr( "data-placement", "auto top" );
            $( element ).addClass( overlayStyle.styleClass );
            
            if ( overlay.type === imageView.Overlays.OverlayTypes.LINE ) {
                _rotate( overlay.angle, element );
            }
            
            if ( overlayStyle.interactive ) {
                element.focus = function( focus ) {
                    if ( focus ) {
                        $( element ).addClass( _focusStyleClass );
                        _createTooltip(element, overlay, overlays.image);
                        
// tooltip.height(100);
// $( element ).tooltip( "show" );
                    }
                    else {
                        $( element ).removeClass( _focusStyleClass );
                        $(".tooltipp#tooltip_" + overlay.id).remove();
                    }
                    if ( overlays.overlayFocusHook ) {
                        overlays.overlayFocusHook( overlay, focus );
                    }
                };
                
                element.highlight = function( focus ) {
                    if ( focus ) {
                        $( element ).addClass( _highlightStyleClass );
                    }
                    else {
                        $( element ).removeClass( _highlightStyleClass );
                    }
                };
                
                $( element ).on( "mouseover", function() {
                    if ( _debug ) {
                        console.log( 'Overlays _drawOverlay: mouse over - ' + overlayStyle.name );
                    }
                    overlays.focusBox( overlay.group, overlay.id );
                } );
                $( element ).on( "mouseout", function() {
                    if ( _debug ) {
                        console.log( 'Overlays _drawOverlay: mouse out - ' + overlayStyle.name );
                    }
                    element.focus( false );
                } );
                $( element ).on( "click", function() {
                    if ( overlays.overlayClickHook ) {
                        overlays.overlayClickHook( overlay );
                    }
                } );
            }
            overlay.element = element;
            overlays.image.viewer.addOverlay( element, overlay.rect, 0 );
        }
    }
    
    function _createTooltip(element, overlay, image) {
    	if(overlay.title) {    		
    		var canvasCorner = image.sizes.$container.offset();
    		
    		var top = $( element ).offset().top;
    		var left = $( element ).offset().left;
    		var bottom = top + $( element ).outerHeight();
    		var right = left + $( element ).outerWidth();
// console.log("Tooltip at ", left, top, right, bottom);

    		
    		var $tooltip = $("<div class='tooltipp'>" + overlay.title + "</div>");
    		$("body").append($tooltip);
    		var tooltipPadding = parseFloat($tooltip.css("padding-top"));
    		$tooltip.css("max-width",right-left);
    		$tooltip.css("top", Math.max(canvasCorner.top + tooltipPadding, top-$tooltip.outerHeight()-tooltipPadding));
    		$tooltip.css("left", Math.max(canvasCorner.left + tooltipPadding, left));
    		$tooltip.attr("id", "tooltip_" + overlay.id);
// console.log("tooltip width = ", $tooltip.width());
    		
    		// listener for zoom
    		
    		image.observables.animation
    		.do(function() {
// console.log("element at: ", $(element).offset());
    			var top = Math.max($( element ).offset().top, canvasCorner.top);
        		var left = Math.max($( element ).offset().left, canvasCorner.left);
    			$tooltip.css("top", Math.max(canvasCorner.top + tooltipPadding, top-$tooltip.outerHeight()-tooltipPadding));
    			$tooltip.css("left", Math.max(canvasCorner.left + tooltipPadding, left));
    		})
    		.takeWhile(function() {
    			return $(".tooltipp").length > 0;
    		})
    		.subscribe();
    	}
    }
    
    function _rotate( angle, mapElement ) {
        if ( _debug ) {
            console.log( 'Overlays _rotate: angle - ' + angle );
            console.log( 'Overlays _rotate: mapElement - ' + mapElement );
        }
        
        if ( angle !== 0 ) {
            $( mapElement ).css( "-moz-transform", "rotate(" + angle + "deg)" );
            $( mapElement ).css( "-webkit-transform", "rotate(" + angle + "deg)" );
            $( mapElement ).css( "-ms-transform", "rotate(" + angle + "deg)" );
            $( mapElement ).css( "-o-transform", "rotate(" + angle + "deg)" );
            $( mapElement ).css( "transform", "rotate(" + angle + "deg)" );
            var sin = Math.sin( angle );
            var cos = Math.cos( angle );
            $( mapElement ).css(
                    "filter",
                    "progid:DXImageTransform.Microsoft.Matrix(M11=" + cos + ", M12=" + sin + ", M21=-" + sin + ", M22=" + cos
                            + ", sizingMethod='auto expand'" );
        }
    }
    
    function _calculateAngle( p1, p2 ) {
        if ( _debug ) {
            console.log( 'Overlays _calculateAngle: p1 - ' + p1 );
            console.log( 'Overlays _calculateAngle: p2 - ' + p2 );
        }
        
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var radians = null;
        
        if ( dx > 0 ) {
            radians = Math.atan( dy / dx );
            return radians * 180 / Math.PI;
        }
        else if ( dx < 0 ) {
            radians = Math.atan( dy / dx );
            return radians * 180 / Math.PI + 180;
        }
        else if ( dy < 0 ) {
            return 270;
        }
        else {
            return 90;
        }
    }
    
// function _getScaleToOriginalSize() {
// var displaySize = osViewer.viewer.world.getItemAt(0).source.dimensions.x;//
// osViewer.viewer.viewport.contentSize.x;
// return osViewer.getImageInfo().width / displaySize;
// }
//    
// function _scaleToOriginalSize( value ) {
// if ( _debug ) {
// console.log( 'Overlays _scaleToOriginalSize: value - ' + value );
// }
//        
// var displaySize = osViewer.viewer.world.getItemAt(0).source.dimensions.x;//
// osViewer.viewer.viewport.contentSize.x;
// return value / displaySize * osViewer.getImageInfo().width;
// }
//    
// function _scaleToImageSize( value ) {
// if ( _debug ) {
// console.log( 'Overlays _scaleToImageSize: value - ' + value );
// }
//        
// var displaySize = osViewer.viewer.world.getItemAt(0).source.dimensions.x;//
// osViewer.viewer.viewport.contentSize.x;
// return value * displaySize / osViewer.getImageInfo().width;
// }
    
    function _isInside( rect, point, extra ) {
        return point.x > rect.x - extra && point.x < ( rect.x + rect.width + extra ) && point.y > rect.y - extra
                && point.y < ( rect.y + rect.height + extra );
    }
    
    function _onViewerMove( event, overlays ) { 
        var position = event.position;
        var ieVersion = viewerJS.helper.detectIEVersion();
        if(ieVersion && ieVersion === 10) {
// console.log("Correct position for ie ", ieVersion);
            position.x += $(window).scrollLeft();
            position.y += $(window).scrollTop();
        }
// console.log( "viewer move ", position);
        var point = overlays.image.viewer.viewport.viewerElementToViewportCoordinates( position );
        overlays.overlays.forEach( function( o ) {
            if ( _isInside( o.rect, point, 0 ) ) {
                overlays.showOverlay( o );
            }
            else {
                overlays.hideOverlay( o );
            }
        } );
    }
    
    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    var _localStoragePossible = true;
    var _activePanel = null;
    var _defaults = {
        navSelector: '.reading-mode__navigation',
        viewSelector: '#contentView',
        imageContainerSelector: '.reading-mode__content-view-image',
        imageSelector: '#readingModeImage',
        sidebarSelector: '#contentSidebar',
        sidebarToggleButton: '.reading-mode__content-sidebar-toggle',
        sidebarInnerSelector: '.reading-mode__content-sidebar-inner',
        sidebarTabsSelector: '.reading-mode__content-sidebar-tabs',
        sidebarTabContentSelector: '.tab-content',
        sidebarTocWrapperSelector: '.widget-toc-elem-wrapp',
        sidebarStatus: '',
        useTabs: true,
        useAccordeon: false,
        msg: {},
    };
    
    imageView.readingMode = {
        /**
         * Method to initialize the viewer reading mode.
         * 
         * @method init
         * @param {Object} config An config object which overwrites the defaults.
         * @param {String} config.navSelector A string which contains the selector for the
         * navigation.
         * @param {String} config.viewSelector A string which contains the selector for
         * the content view.
         * @param {String} config.imageContainerSelector A string which contains the
         * selector for the image container.
         * @param {String} config.imageSelector A string which contains the selector for
         * the image.
         * @param {String} config.sidebarSelector A string which contains the selector for
         * the sidebar.
         * @param {String} config.sidebarToggleButton A string which contains the selector
         * for the sidebar toggle button.
         * @param {String} config.sidebarInnerSelector A string which contains the
         * selector for the inner sidebar container.
         * @param {String} config.sidebarStatus A string which contains the current
         * sidebar status.
         */
        init: function( config ) {
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'osViewer.readingMode.init' );
                console.log( '##############################' );
                console.log( 'osViewer.readingMode.init: config - ', config );
            }
            
            $.extend( true, _defaults, config );
            
            // check local storage
            _localStoragePossible = viewerJS.helper.checkLocalStorage();
            
            if ( _localStoragePossible ) {
                _defaults.sidebarStatus = localStorage.getItem( 'sidebarStatus' );
                
                if ( _defaults.sidebarStatus === '' || _defaults.sidebarStatus === undefined ) {
                    localStorage.setItem( 'sidebarStatus', 'true' );
                }
                
                // set viewport
                _setViewportHeight();
                if ( _defaults.useTabs ) {
                    _setSidebarTabHeight();
                }
                _setSidebarButtonPosition();
                _checkSidebarStatus();
                setTimeout( function() {
                    _showContent();
                }, 500 );
                
                // save panel status
                if ( _defaults.useAccordeon ) {
                    _activePanel = localStorage.getItem( 'activePanel' );
                    
                    $( '.panel-collapse' ).each( function() {
                        $( this ).removeClass( 'in' );
                    } );
                    
                    if ( _activePanel === null ) {
                        localStorage.setItem( 'activePanel', '#collapseOne' );
                        _activePanel = localStorage.getItem( 'activePanel' );
                        
                        $( _activePanel ).addClass( 'in' );
                    }
                    else {
                        $( _activePanel ).addClass( 'in' );
                    }
                    
                    // click panel event
                    $( 'a[data-toggle="collapse"]' ).on( 'click', function() {
                        var currPanel = $( this ).attr( 'href' );
                        
                        localStorage.setItem( 'activePanel', currPanel );
                    } );
                }
                
                // events
                $( '[data-toggle="sidebar"]' ).on( 'click', function() {
                    $( this ).toggleClass( 'in' );
                    $( this ).parents( '.reading-mode__content-sidebar' ).toggleClass( 'in' );
                    $( this ).parents( '.reading-mode__content-sidebar' ).prev().toggleClass( 'in' );
                    
                    // set sidebar status to local storage
                    _defaults.sidebarStatus = localStorage.getItem( 'sidebarStatus' );
                    
                    if ( _defaults.sidebarStatus === 'false' ) {
                        localStorage.setItem( 'sidebarStatus', 'true' );
                    }
                    else {
                        localStorage.setItem( 'sidebarStatus', 'false' );
                    }
                    
                    // reload image footer
                    setTimeout( function() {
                    	viewImage.loadFooter();
                    }, 300 );
                } );
                
                $( window ).on( 'resize', function() {
                    _setViewportHeight();
                    if ( _defaults.useTabs ) {
                        _setSidebarTabHeight();
                    }
                    _setSidebarButtonPosition();
                } );
                
                $( window ).on( "orientationchange", function() {
                    _setViewportHeight();
                    if ( _defaults.useTabs ) {
                        _setSidebarTabHeight();
                    }
                    _setSidebarButtonPosition();
                } );
                
                // AJAX Loader Eventlistener
                if ( typeof jsf !== 'undefined' ) {
                    jsf.ajax.addOnEvent( function( data ) {
                        var ajaxstatus = data.status;
                        
                        switch ( ajaxstatus ) {
                            case "success":
                                _setViewportHeight();
                                if ( _defaults.useTabs ) {
                                    _setSidebarTabHeight();
                                }
                                _setSidebarButtonPosition();
                                break;
                        }
                    } );
                }
            }
            else {
                return false;
            }
        },
    };
    
    /**
     * Method which sets the height of the viewport elements.
     * 
     * @method _setViewportHeight
     */
    function _setViewportHeight() {
        if ( _debug ) {
            console.log( '---------- _setViewportHeight() ----------' );
            console.log( '_setViewportHeight: view = ', _defaults.viewSelector );
            console.log( '_setViewportHeight: image = ', _defaults.imageSelector );
            console.log( '_setViewportHeight: sidebar = ', _defaults.sidebarSelector );
            console.log( '_setViewportHeight: sidebarInner = ', _defaults.sidebarInnerSelector );
            console.log( '_setViewportHeight: sidebarTabs = ', _defaults.sidebarTabsSelector );
        }
        
        var viewportHeight = $( window ).outerHeight();
        var navHeight = $( _defaults.navSelector ).outerHeight();
        var newHeight = viewportHeight - navHeight;
        
        if ( _debug ) {
            console.log( '_setViewportHeight: viewportHeight = ', viewportHeight );
            console.log( '_setViewportHeight: navHeight = ', navHeight );
            console.log( '_setViewportHeight: newHeight = ', newHeight );
        }
        
        $( _defaults.viewSelector ).css( 'height', newHeight );
        $( _defaults.imageSelector ).css( 'height', newHeight );
        $( _defaults.sidebarSelector ).css( 'height', newHeight );
        $( _defaults.sidebarInnerSelector ).css( 'height', newHeight );
        
    }
    
    /**
     * Method which sets the height of the sidebar Tabs.
     * 
     * @method _setSidebarTabHeight
     */
    function _setSidebarTabHeight() {
        if ( _debug ) {
            console.log( '---------- _setSidebarTabHeight() ----------' );
            console.log( '_setSidebarTabHeight: sidebarTabs = ', _defaults.sidebarTabsSelector );
        }
        
        var viewportHeight = $( window ).outerHeight();
        var navHeight = $( _defaults.navSelector ).outerHeight();
        var newHeight = viewportHeight - navHeight;
        var tabPos = $( _defaults.sidebarTabsSelector ).position();
        var tabHeight = newHeight - tabPos.top - 15;
        var navTabsHeight = $( '.nav-tabs' ).outerHeight();
        
        if ( _debug ) {
            console.log( '_setSidebarTabHeight: tabPos = ', tabPos );
            console.log( '_setSidebarTabHeight: tabHeight = ', tabHeight );
        }
        
        if ( viewportHeight > 768 ) {
            $( _defaults.sidebarTabsSelector ).css( 'height', tabHeight );
            $( _defaults.sidebarTabContentSelector ).css( 'height', tabHeight - navTabsHeight );
            $( _defaults.sidebarTocWrapperSelector ).css( 'min-height', tabHeight - navTabsHeight );
        }
    }
    
    /**
     * Method which sets the position of the sidebar toggle button.
     * 
     * @method _setSidebarButtonPosition
     */
    function _setSidebarButtonPosition() {
        if ( _debug ) {
            console.log( '---------- _setSidebarButtonPosition() ----------' );
            console.log( '_setSidebarButtonPosition: view = ', _defaults.viewSelector );
        }
        
        var viewHalfHeight = $( _defaults.viewSelector ).outerHeight() / 2;
        
        if ( _debug ) {
            console.log( '_setSidebarButtonPosition: viewHalfHeight = ', viewHalfHeight );
        }
        
        $( _defaults.sidebarToggleButton ).css( 'top', viewHalfHeight );
        
    }
    
    /**
     * Method which checks the current sidebar status, based on a local storage value.
     * 
     * @method _checkSidebarStatus
     * @returns {Boolean} Returns false if the sidebar is inactive, returns true if the
     * sidebar is active.
     */
    function _checkSidebarStatus() {
        if ( _debug ) {
            console.log( '---------- _checkSidebarStatus() ----------' );
            console.log( '_checkSidebarStatus: sidebarStatus = ', _defaults.sidebarStatus );
        }
        
        if ( _defaults.sidebarStatus === 'false' ) {
            $( '[data-toggle="sidebar"]' ).removeClass( 'in' );
            $( '.reading-mode__content-sidebar' ).removeClass( 'in' ).prev().removeClass( 'in' );
            
            return false;
        }
        else {
            return true;
        }
        
    }
    
    /**
     * Method which shows the content by removing CSS-Classes after loading every page
     * element.
     * 
     * @method _showContent
     */
    function _showContent() {
        if ( _debug ) {
            console.log( '---------- _showContent() ----------' );
        }
        
        $( _defaults.viewSelector ).removeClass( 'invisible' );
        $( _defaults.sidebarSelector ).removeClass( 'invisible' );
    }
    
    return imageView;
    
} )( ImageView );

var viewImage = ImageView;

ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    
    imageView.TileSourceResolver = {
        
        resolveAsJsonOrURI: function( imageInfo ) {
            var deferred = Q.defer();
            if ( this.isJson( imageInfo ) ) {
                deferred.resolve( imageInfo );
            }
            else if ( this.isStringifiedJson( imageInfo ) ) {
                deferred.resolve( JSON.parse( imageInfo ) );
            }
            else {
                deferred.resolve( imageInfo );
            }
            return deferred.promise;
            
        },
        
        resolveAsJson: function( imageInfo ) {
            var deferred = Q.defer();
            if ( this.isURI( imageInfo ) ) {
                if ( this.isJsonURI( imageInfo ) ) {
                    return this.loadJsonFromURL( imageInfo );
                }
                else {
                    deferred.reject( "Url does not lead to a json object" );
                }
            }
            else if ( typeof imageInfo === "string" ) {
                try {
                    var json = JSON.parse( imageInfo );
                    deferred.resolve( json );
                }
                catch ( error ) {
                    deferred.reject( "String does not contain valid json: " + error );
                }
            }
            else if ( typeof imageInfo === "object" ) {
                deferred.resolve( imageInfo );
            }
            else {
                deferred.reject( "Neither a url nor a json object" );
            }
            return deferred.promise;
        },
        
        loadJsonFromURL: function( imageInfo ) {
            var deferred = Q.defer();
            if ( this.isJsonURI( imageInfo ) ) {
                OpenSeadragon.makeAjaxRequest( imageInfo,
                // success
                function( request ) {
                    try {
                        deferred.resolve( JSON.parse( request.responseText ) );
                    }
                    catch ( error ) {
                        deferred.reject( error )
                    }
                },
                // error
                function( error ) {
                    deferred.reject( error );
                } )
            }
            else {
                deferred.reject( "Not a json uri: " + imageInfo );
            }
            return deferred.promise;
        },
        
        loadIfJsonURL: function( imageInfo ) {
            return Q.promise( function( resolve, reject ) {
                if ( imageView.TileSourceResolver.isURI( imageInfo ) ) {
                    var ajaxParams = {
                        url: decodeURI( imageInfo ),
                        type: "GET",
                        dataType: "JSON",
                        async: true,
                        crossDomain: true,
                        accepts: {
                            application_json: "application/json",
                            application_jsonLd: "application/ld+json",
                            text_json: "text/json",
                            text_jsonLd: "text/ld+json",
                        }
                    }
                    Q( $.ajax( ajaxParams ) ).then( function( data ) {
                        resolve( data );
                    } ).fail( function( error ) {
                        reject( "Failed to retrieve json from " + imageInfo );
                    } );
                    setTimeout( function() {
                        reject( "Timeout after 10s" );
                    }, 10000 )
                }
                else {
                    reject( "Not a uri: " + imageInfo );
                }
            } );
        },
        
        isJsonURI: function( imageInfo ) {
            if ( this.isURI( imageInfo ) ) {
                var shortened = imageInfo.replace( /\?.*/, "" );
                if ( shortened.endsWith( "/" ) ) {
                    shortened = shortened.substring( 0, shortened.length - 1 );
                }
                return shortened.toLowerCase().endsWith( ".json" );
            }
            return false;
        },
        isURI: function( imageInfo ) {
            if ( imageInfo && typeof imageInfo === "string" ) {
                if ( imageInfo.startsWith( "http://" ) || imageInfo.startsWith( "https://" ) || imageInfo.startsWith( "file:/" ) ) {
                    return true;
                }
            }
            return false;
        },
        isStringifiedJson: function( imageInfo ) {
            if ( imageInfo && typeof imageInfo === "string" ) {
                try {
                    var json = JSON.parse( imageInfo );
                    return this.isJson( json );
                }
                catch ( error ) {
                    // no json
                    return false;
                }
            }
            return false;
            
        },
        isJson: function( imageInfo ) {
            return imageInfo && typeof imageInfo === "object";
        },
    
    }

    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var DEFAULT_CURSOR = "default";
    
    var _debug = false;
    
    var _drawingStyleClass = "transforming";
    
    var _active = false;
    var _drawing = false;
    var _group = null;
    var _finishHook = null;
    var _viewerInputHook = null;
    var _hbAdd = 5;
    var _sideClickPrecision = 0.004;
    var _drawArea = "";
    var _enterPoint = null;
    
    imageView.TransformRect = function(config, image){
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'osViewer.transformRect.init' );
                console.log( '##############################' );
            }
            this.config = config;
            this.image = image;
            var draw = this;
            this.viewerInputHook = image.viewer.addViewerInputHook( {
                hooks: [ {
                    tracker: "viewer",
                    handler: "clickHandler",
                    hookHandler: function(event) { _disableViewerEvent(event, draw) }
                // }, {
                // tracker : "viewer",
                // handler : "scrollHandler",
                // hookHandler : _disableViewerEvent
                }, {
                    tracker: "viewer",
                    handler: "dragHandler",
                    hookHandler: function(event) { _onViewerDrag(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "pressHandler",
                    hookHandler: function(event) { _onViewerPress(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "dragEndHandler",
                    hookHandler: function(event) { _onViewerDragEnd(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "releaseHandler",
                    hookHandler: function(event) { _onViewerRelease(event, draw) }
                }, {
                    tracker: "viewer",
                    handler: "moveHandler",
                    hookHandler: function(event) { _onViewerMove(event, draw) }
                } ]
            } );
        }
    imageView.TransformRect.prototype.startDrawing = function( overlay, finishHook ) {
            if ( _debug )
                console.log( "Start drawing" );
            this.image.overlays.setDrawingOverlay( overlay );
            this.active = true;
            this.group = overlay.group;
            this.finishHook = finishHook;
            $( overlay.element ).addClass( _drawingStyleClass );
        }
    imageView.TransformRect.prototype.endDrawing = function() {
            this.drawing = false;
            this.group = null;
            this.finishHook = null;
            this.active = false;
            var drawOverlay = this.image.overlays.getDrawingOverlay();
            if ( drawOverlay != null ) {
                $( drawOverlay.element ).removeClass( _drawingStyleClass );
                $( drawOverlay.element ).css( {
                    cursor: DEFAULT_CURSOR
                } );
            }
        }
        imageView.TransformRect.prototype.isActive = function() {
            return this.active;
        }
        imageView.TransformRect.HitAreas = {
            TOP: "t",
            BOTTOM: "b",
            RIGHT: "r",
            LEFT: "l",
            TOPLEFT: "tl",
            TOPRIGHT: "tr",
            BOTTOMLEFT: "bl",
            BOTTOMRIGHT: "br",
            CENTER: "c",
            isCorner: function( area ) {
                return area === this.TOPRIGHT || area === this.TOPLEFT || area === this.BOTTOMLEFT || area === this.BOTTOMRIGHT;
            },
            isEdge: function( area ) {
                return area === this.TOP || area === this.BOTTOM || area === this.LEFT || area === this.RIGHT;
            },
            getCursor: function( area, image ) {
                var rotated = image.viewer.viewport.getRotation() % 180 === 90;
                if ( area === this.TOPLEFT || area === this.BOTTOMRIGHT ) {
                    return rotated ? "nesw-resize" : "nwse-resize";
                }
                else if ( area === this.TOPRIGHT || area === this.BOTTOMLEFT ) {
                    return rotated ? "nwse-resize" : "nesw-resize";
                }
                else if ( area === this.TOP || area === this.BOTTOM ) {
                    return rotated ? "ew-resize" : "ns-resize";
                }
                else if ( area === this.RIGHT || area === this.LEFT ) {
                    return rotated ? "ns-resize" : "ew-resize";
                }
                else if ( area === this.CENTER ) {
                    return "move";
                }
                else {
                    return DEFAULT_CURSOR;
                }
            }
        }

    function _onViewerMove( event, draw ) {
        if ( !draw.drawing && draw.active ) {
            var drawPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            var overlayRect = draw.image.overlays.getDrawingOverlay().rect;
            var overlayElement = draw.image.overlays.getDrawingOverlay().element;
            var viewerElement = draw.image.viewer.element;
            var area = _findCorner( overlayRect, drawPoint, _sideClickPrecision );
            if ( !area ) {
                area = _findEdge( overlayRect, drawPoint, _sideClickPrecision );
            }
            if ( !area && draw.image.overlays.contains( overlayRect, drawPoint, 0 ) ) {
                area = imageView.TransformRect.HitAreas.CENTER;
            }
            if ( area ) {
                $( viewerElement ).css( {
                    cursor: imageView.TransformRect.HitAreas.getCursor( area, draw.image )
                } );
            }
            else {
                $( viewerElement ).css( {
                    cursor: DEFAULT_CURSOR
                } );
            }
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function _onViewerPress( event, draw ) {
        if ( draw.active ) {
            if ( !draw.image.overlays.getDrawingOverlay() ) {
                return false;
            }
            var overlayRect = draw.image.overlays.getDrawingOverlay().rect;
            var overlayElement = draw.image.overlays.getDrawingOverlay().element;
            var drawPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            var drawArea = _findCorner( overlayRect, drawPoint, _sideClickPrecision );
            if ( !drawArea ) {
                drawArea = _findEdge( overlayRect, drawPoint, _sideClickPrecision );
            }
            if ( !drawArea && draw.image.overlays.contains( overlayRect, drawPoint, 0 ) ) {
                drawArea = imageView.TransformRect.HitAreas.CENTER;
            }
            if ( _debug )
                console.log( "draw area = " + drawArea );
            if ( drawArea ) {
                $( overlayElement ).tooltip( 'destroy' );
                draw.enterPoint = drawPoint;
            }
            draw.drawArea = drawArea;
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function _onViewerDrag( event, draw ) {
        if ( draw.drawing ) {
            var newPoint = draw.image.viewer.viewport.viewerElementToViewportCoordinates( event.position );
            var rect = draw.image.overlays.getDrawingOverlay().rect;
            var topLeft;
            var bottomRight;
            // if(_debug)console.log("Draw location = " + newPoint);
            if ( draw.drawArea === imageView.TransformRect.HitAreas.TOPLEFT ) {
                topLeft = new OpenSeadragon.Point( Math.min( newPoint.x, rect.getBottomRight().x ), Math.min( newPoint.y, rect.getBottomRight().y ) );
                bottomRight = rect.getBottomRight();
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.TOPRIGHT ) {
                topLeft = new OpenSeadragon.Point( rect.getTopLeft().x, Math.min( newPoint.y, rect.getBottomRight().y ) );
                bottomRight = new OpenSeadragon.Point( Math.max( newPoint.x, rect.getTopLeft().x ), rect.getBottomRight().y );
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.BOTTOMLEFT ) {
                topLeft = new OpenSeadragon.Point( Math.min( newPoint.x, rect.getBottomRight().x ), rect.getTopLeft().y );
                bottomRight = new OpenSeadragon.Point( rect.getBottomRight().x, Math.max( newPoint.y, rect.getTopLeft().y ) );
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.BOTTOMRIGHT ) {
                topLeft = rect.getTopLeft();
                bottomRight = new OpenSeadragon.Point( Math.max( newPoint.x, rect.getTopLeft().x ), Math.max( newPoint.y, rect.getTopLeft().y ) );
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.LEFT ) {
                topLeft = new OpenSeadragon.Point( Math.min( newPoint.x, rect.getBottomRight().x ), rect.getTopLeft().y );
                bottomRight = rect.getBottomRight();
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.RIGHT ) {
                topLeft = rect.getTopLeft();
                bottomRight = new OpenSeadragon.Point( Math.max( newPoint.x, rect.getTopLeft().x ), rect.getBottomRight().y );
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.TOP ) {
                topLeft = new OpenSeadragon.Point( rect.getTopLeft().x, Math.min( newPoint.y, rect.getBottomRight().y ) );
                bottomRight = rect.getBottomRight();
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.BOTTOM ) {
                topLeft = rect.getTopLeft();
                bottomRight = new OpenSeadragon.Point( rect.getBottomRight().x, Math.max( newPoint.y, rect.getTopLeft().y ) );
            }
            else if ( draw.drawArea === imageView.TransformRect.HitAreas.CENTER && draw.enterPoint ) {
                var dx = draw.enterPoint.x - newPoint.x;
                var dy = draw.enterPoint.y - newPoint.y;
                rect.x -= dx;
                rect.y -= dy;
                draw.enterPoint = newPoint;
            }
            
            if ( topLeft && bottomRight ) {
                // if(_debug)console.log("Upper left point is " + rect.getTopLeft());
                // if(_debug)console.log("Lower right point is " + rect.getBottomRight());
                // if(_debug)console.log("Setting upper left point to " + topLeft);
                // if(_debug)console.log("Setting lower right point to " + bottomRight);
                rect.x = topLeft.x;
                rect.y = topLeft.y;
                rect.width = bottomRight.x - topLeft.x;
                rect.height = bottomRight.y - topLeft.y;
            }
            
            draw.image.viewer.updateOverlay( draw.image.overlays.getDrawingOverlay().element, rect, 0 );
            event.preventDefaultAction = true;
            return true;
        }
        else if ( draw.drawArea ) {
            draw.drawing = true;
            event.preventDefaultAction = true;
            return true;
            
        }
    }
    
    function _onViewerRelease( event, draw ) {
        if ( draw.active ) {
            if ( draw.drawing && draw.finishHook ) {
                draw.finishHook( draw.image.overlays.getDrawingOverlay() );
            }
            draw.drawing = false;
            if ( draw.image.overlays.getDrawingOverlay() ) {
                $( draw.image.overlays.getDrawingOverlay().element ).tooltip();
            }
            draw.drawArea = "";
            draw.enterPoint = null;
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function _onViewerDragEnd( event, draw ) {
        if ( draw.drawing ) {
            draw.drawing = false;
            event.preventDefaultAction = true;
            return true;
        }
    }
    
    function _disableViewerEvent( event, draw ) {
        if ( draw.drawing ) {
            event.preventDefaultAction = true;
            return true;
        }
    }
    function checkForRectHit( point ) {
        var i;
        for ( i = 0; i < _rects.length; i++ ) {
            var x = _rects[ i ];
            if ( point.x > x.hitBox.l && point.x < x.hitBox.r && point.y > x.hitBox.t && point.y < x.hitBox.b ) {
                var topLeftHb = {
                    l: x.x - _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + _hbAdd
                };
                var topRightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + _hbAdd
                };
                var bottomRightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var bottomLeftHb = {
                    l: x.x - _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var topHb = {
                    l: x.x + _hbAdd,
                    t: x.y - _hbAdd,
                    r: x.x + x.width - _hbAdd,
                    b: x.y + _hbAdd
                };
                var rightHb = {
                    l: x.x + x.width - _hbAdd,
                    t: x.y + _hbAdd,
                    r: x.x + x.width + _hbAdd,
                    b: x.y + x.height - _hbAdd
                };
                var bottomHb = {
                    l: x.x + _hbAdd,
                    t: x.y + x.height - _hbAdd,
                    r: x.x + x.width - _hbAdd,
                    b: x.y + x.height + _hbAdd
                };
                var leftHb = {
                    l: x.x - _hbAdd,
                    t: x.y + _hbAdd,
                    r: x.x + _hbAdd,
                    b: x.y + x.height - _hbAdd
                };
            }
        }
    }
    
    /*
     * Determine the side of the rectangle rect the point lies on or closest at <=maxDist
     * distance
     */
    function _findEdge( rect, point, maxDist ) {
        var distanceToLeft = _distToSegment( point, rect.getTopLeft(), rect.getBottomLeft() );
        var distanceToBottom = _distToSegment( point, rect.getBottomLeft(), rect.getBottomRight() );
        var distanceToRight = _distToSegment( point, rect.getTopRight(), rect.getBottomRight() );
        var distanceToTop = _distToSegment( point, rect.getTopLeft(), rect.getTopRight() );
        
        var minDistance = Math.min( distanceToLeft, Math.min( distanceToRight, Math.min( distanceToTop, distanceToBottom ) ) );
        if ( minDistance <= maxDist ) {
            if ( distanceToLeft === minDistance ) {
                return imageView.TransformRect.HitAreas.LEFT;
            }
            if ( distanceToRight === minDistance ) {
                return imageView.TransformRect.HitAreas.RIGHT;
            }
            if ( distanceToTop === minDistance ) {
                return imageView.TransformRect.HitAreas.TOP;
            }
            if ( distanceToBottom === minDistance ) {
                return imageView.TransformRect.HitAreas.BOTTOM;
            }
        }
        return "";
    }
    
    /*
     * Determine the cornder of the rectangle rect the point lies on or closest at
     * <=maxDist distance
     */
    function _findCorner( rect, point, maxDist ) {
        var distanceToTopLeft = _dist( point, rect.getTopLeft() );
        var distanceToBottomLeft = _dist( point, rect.getBottomLeft() );
        var distanceToTopRight = _dist( point, rect.getTopRight() );
        var distanceToBottomRight = _dist( point, rect.getBottomRight() );
        
        var minDistance = Math.min( distanceToTopLeft, Math.min( distanceToTopRight, Math.min( distanceToBottomLeft, distanceToBottomRight ) ) );
        if ( minDistance <= maxDist ) {
            if ( distanceToTopLeft === minDistance ) {
                return imageView.TransformRect.HitAreas.TOPLEFT;
            }
            if ( distanceToTopRight === minDistance ) {
                return imageView.TransformRect.HitAreas.TOPRIGHT;
            }
            if ( distanceToBottomLeft === minDistance ) {
                return imageView.TransformRect.HitAreas.BOTTOMLEFT;
            }
            if ( distanceToBottomRight === minDistance ) {
                return imageView.TransformRect.HitAreas.BOTTOMRIGHT;
            }
        }
        return "";
    }
    
    function _sqr( x ) {
        return x * x
    }
    function _dist2( v, w ) {
        return _sqr( v.x - w.x ) + _sqr( v.y - w.y )
    }
    function _dist( v, w ) {
        return Math.sqrt( _dist2( v, w ) )
    }
    function _distToSegmentSquared( p, v, w ) {
        var l2 = _dist2( v, w );
        if ( l2 == 0 )
            return _dist2( p, v );
        var t = ( ( p.x - v.x ) * ( w.x - v.x ) + ( p.y - v.y ) * ( w.y - v.y ) ) / l2;
        if ( t < 0 )
            return _dist2( p, v );
        if ( t > 1 )
            return _dist2( p, w );
        return _dist2( p, {
            x: v.x + t * ( w.x - v.x ),
            y: v.y + t * ( w.y - v.y )
        } );
    }
    function _distToSegment( point, lineP1, lineP2 ) {
        return Math.sqrt( _distToSegmentSquared( point, lineP1, lineP2 ) );
    }
    return imageView;
    
} )( ImageView );

var ImageView = ( function( imageView ) {
    'use strict';
    
    var _debug = false;
    var _zoomSlider = {};
    var _defaults = {
            /**
             * The position of the zoom-slider is "dilated" by a function d(zoom) =
             * 1/sliderDilation*tan[atan(sliderDilation)*zoom] This makes the slider
             * position change slower for small zoom and faster for larger zoom The
             * function is chosen so that d(0) = 0 and d(1) = 1
             */
            sliderDilation: 12
    };
    
    imageView.ZoomSlider = function(config, image)  {    
        this.config = $.extend( true, {}, _defaults );
        $.extend( true, this.config, config.global );
        this.image = image;
//        this.imageWidth = image.sizes.originalImageSize.x;
//        this.imageViewWidth = image.container.width();
        this.init();
    }
    
    imageView.ZoomSlider.prototype.init = function() {
            if ( _debug ) {
                console.log( '##############################' );
                console.log( 'imageView.zoomSlider.init' );
                console.log("config - ", this.config);
                console.log( '##############################' );
            }
            if ( $(this.config.zoomSlider).length > 0 ) {
                this.addZoomSlider(this.config.zoomSlider );
                
                // handler for openSeadragon Object
                var zoom = this;
                this.image.viewer.addHandler( 'zoom', function( data ) {
                    zoom.buttonToZoom( data.zoom );
                } );
            }
        };
        imageView.ZoomSlider.prototype.exists = function() {
            return this.$element.length && this.$button.length;
        };
        imageView.ZoomSlider.prototype.buttonToMouse = function( mousePos ) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.buttonToMouse: mousePos - ' + mousePos );
            }
            
            var offset = this.$button.width() / 2;
            var newPos = mousePos - offset;
            if ( newPos < 0 ) {
                newPos = 0;
            }
            if ( newPos + 2 * offset > this.absoluteWidth ) {
                newPos = this.absoluteWidth - 2 * offset;
            }

            this.$button.css( {
                left: newPos
            } );
            this.buttonPosition = newPos;
            var factor = ( newPos / ( this.absoluteWidth - offset * 2 ) );
            factor = 1 / this.config.sliderDilation * Math.tan( Math.atan( this.config.sliderDilation ) * factor );
            var newScale = this.image.viewer.viewport.getMinZoom() + ( this.image.viewer.viewport.getMaxZoom() - this.image.viewer.viewport.getMinZoom() ) * factor;
            
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.buttonToMouse: newScale - ' + newScale );
            }
            
            this.zoomTo( newScale );
        };
        imageView.ZoomSlider.prototype.zoomTo = function( zoomTo ) {
            if ( _debug ) {
                console.log( 'imageView.controls.myZoomTo: zoomTo - ' + zoomTo );
            }
            
            var zoomBy = parseFloat( zoomTo ) / this.image.viewer.viewport.getZoom();
            
            if ( _debug ) {
                console.log( 'imageView.controls.myZoomTo: zoomBy - ' + zoomBy );
            }
            
            this.image.viewer.viewport.zoomBy( zoomBy, this.image.viewer.viewport.getCenter( false ), true );
            this.setLabel(zoomTo);
        };
        imageView.ZoomSlider.prototype.buttonToZoom = function( scale ) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.buttonToZoom: scale - ' + scale );
                console.log( 'imageView.zoomSlider.buttonToZoom: _zoomSlider - ', _zoomSlider );
            }
            
            if ( !this.image.viewer.viewport ) {
                return;
            }

            var factor = ( scale - this.image.viewer.viewport.getMinZoom() ) / ( this.image.viewer.viewport.getMaxZoom() - this.image.viewer.viewport.getMinZoom() );

            factor = 1 / Math.atan( this.config.sliderDilation ) * Math.atan( this.config.sliderDilation * factor );
            var newPos = factor * ( this.absoluteWidth - this.$button.width() );

            
            if ( Math.abs( this.image.viewer.viewport.getMaxZoom() - scale ) < 0.0000000001 ) {
                newPos = this.absoluteWidth - this.$button.width();
            }
            
            if ( newPos < 0 ) {
                newPos = 0;
            }
            
            this.$button.css( {
                left: newPos
            } );
            this.buttonPosition = newPos;
            this.setLabel(scale);
        },
        imageView.ZoomSlider.prototype.setLabel = function(scale) {
            if(this.$label.length) {
                var imageWidth = this.image.sizes.originalImageSize.x;
                var imageViewWidth = this.image.container.width();
                scale = parseFloat(scale)/imageWidth*imageViewWidth;
                this.$label.val((scale*100).toFixed(1));
            }
        };
        imageView.ZoomSlider.prototype.inputToZoom = function(input) {
            var imageScale = parseFloat(input);
            if(imageScale) {
                if(_debug) {
                    console.log("scale to ", input);
                }
                var imageWidth = this.image.sizes.originalImageSize.x;
                var imageViewWidth = this.image.container.width();
                var scale = imageScale*imageWidth/imageViewWidth/100.0;
                if(scale < this.image.viewer.viewport.getMinZoom()) {
                    scale = this.image.viewer.viewport.getMinZoom();
                } else if(scale > this.image.viewer.viewport.getMaxZoom()) {
                    scale = this.image.viewer.viewport.getMaxZoom();
                }
                this.zoomTo( scale );
            }
        };
        imageView.ZoomSlider.prototype.addZoomSlider = function( element ) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.addZoomSlider: element - ' + element );
            }
            
            this.buttonPosition = 0;
            this.$element = $( element );
            this.absoluteWidth = this.$element.innerWidth();
            this.mousedown = false;
            var slider = this;
            if(this.$element.length) {
                this.$button = this.$element.children( this.config.zoomSliderHandle );
                this.$element.on('mousedown', function(event) {
                    _zoomSliderMouseDown(event, slider);
                });
                this.$element.on('mousemove', function(event) {
                    _zoomSliderMouseMove(event, slider);
                });
                if(this.$button.length) {
                    this.$button.on( 'mousedown', function(event) {
                        _buttonMouseDown(event, slider);                    
                    });
                }
            }
            this.$label = $(this.config.zoomSliderLabel);
            if(this.$label.length) {
                this.$label.on("change", function(event) {
                    slider.inputToZoom(event.target.value)
                });
            }
            $( document ).on( 'mouseup', function(event) {
                _zoomSliderMouseUp(event, slider);
            });
        };
        
        function _zoomSliderMouseUp(event, slider) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.zoomSliderMouseUp' );
            }
            
            slider.mousedown = false;
        };
        function _zoomSliderMouseMove(event, slider) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.zoomSliderMouseMove: evt - ' + event );
            }
            
            if ( !slider.mousedown ) {
                return;
            }
            var offset = slider.$element.offset();
            var hitX = event.pageX - offset.left;
            slider.buttonToMouse( hitX );
            
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.zoomSliderMouseMove: moving - ' + hitX );
            }
        };
        function _zoomSliderMouseDown(event, slider) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.zoomSliderMouseDown: evt - ' + event );
            }
            
            slider.mousedown = true;
            var offset = slider.$element.offset();
            var hitX = event.pageX - offset.left;
            slider.buttonToMouse( hitX );
        };
        function _buttonMouseDown(event, slider) {
            if ( _debug ) {
                console.log( 'imageView.zoomSlider.buttonMouseDown' );
            }
            
            slider.mousedown = true;
            
            return false;
        };
    
    return imageView;
    
} )( ImageView );

//# sourceMappingURL=viewImage.js.map