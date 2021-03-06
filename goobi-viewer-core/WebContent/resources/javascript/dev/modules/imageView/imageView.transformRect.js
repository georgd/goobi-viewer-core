/**
 * This file is part of the Goobi viewer - a content presentation and management
 * application for digitized objects.
 * 
 * Visit these websites for more information. - http://www.intranda.com -
 * http://digiverso.com
 * 
 * This program is free software; you can redistribute it and/or modify it under the terms
 * of the GNU General Public License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 * PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with this
 * program. If not, see <http://www.gnu.org/licenses/>.
 * 
 * Module which resizes existing rectangles on an image.
 * 
 * @version 3.2.0
 * @module viewImage.transformRect
 * @requires jQuery
 */
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
