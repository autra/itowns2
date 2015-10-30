/**
* Generated On: 2015-10-5
* Class: Quadtree
* Description: Structure de données spatiales possedant jusqu'à 4 Nodes
*/

/**
 * 
 * @param {type} Layer
 * @param {type} BoudingBox
 * @param {type} when
 * @param {type} Material
 * @returns {Quadtree_L10.Quadtree}
 */
define('Scene/Quadtree',[
        'Scene/Layer',
        'Scene/BoudingBox',
        'when',
        'Core/Geographic/CoordWMTS',
        'text!Renderer/Shader/GlobeVS.glsl',
        'text!Renderer/Shader/GlobePS.glsl'], function(Layer,BoudingBox,when,CoordWMTS,GlobeVS,GlobePS){

    function Quad(bbox)
    {
        this.northWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.northEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.center.y,bbox.maxCarto.latitude,bbox.center);
        this.southWest = new BoudingBox(bbox.minCarto.longitude,bbox.center.x,bbox.minCarto.latitude,bbox.center.y,bbox.center);
        this.southEast = new BoudingBox(bbox.center.x,bbox.maxCarto.longitude,bbox.minCarto.latitude,bbox.center.y,bbox.center);
    }
    
    Quad.prototype.array = function()
    {
        var subdiv = [];
        
        subdiv.push(this.northWest);
        subdiv.push(this.northEast);
        subdiv.push(this.southWest);
        subdiv.push(this.southEast);        
        
        return subdiv;
    };

    function Quadtree(tileType,schemeTile)
    {        
        Layer.call( this);
        
        this.schemeTile       = schemeTile;
        this.tileType         = tileType;

        for (var i = 0; i < this.schemeTile.rootCount(); i++)
        {
            this.add(this.createTile(this.schemeTile.getRoot(i)));    
            this.subdivide(this.children[i]);
            this.subdivideChildren(this.children[i]);                        
        }               
    }
    
    Quadtree.prototype = Object.create( Layer.prototype );

    Quadtree.prototype.constructor = Quadtree;
    
    Quadtree.prototype.getMesh = function(){
               
        return this.children;
    };
      
    Quadtree.prototype.northWest = function(node)
    {
        return node.children[0];
    };
    
    Quadtree.prototype.northEast = function(node)
    {
        return node.children[1];
    };
    
    Quadtree.prototype.southWest = function(node)
    {
        return node.children[2];
    };
    
    Quadtree.prototype.southEast = function(node)
    {
        return node.children[3];
    };    
    
    Quadtree.prototype.createTile = function(bbox)
    {
        var cooWMTS = this.projection.WGS84toWMTS(bbox);       
        
        var tile    = new this.tileType(bbox,GlobeVS,GlobePS,cooWMTS.zoom);        
        tile.level  = cooWMTS.zoom;
        
        this.interCommand.getTextureBil(cooWMTS).then(function(texture)
        {   
            this.setTextureTerrain(texture);
            
            return this;

        }.bind(tile)).then(function(tile)
        {                            
            if(cooWMTS.zoom >= 2)
            {
                var box  = this.projection.WMTS_WGS84ToWMTS_PM(cooWMTS,bbox);                        
                var id = 0;
                var col = box[0].col;
                                
                for (var row = box[0].row; row < box[1].row + 1; row++)
                {
                    var coo = new CoordWMTS(box[0].zoom,row,col);
                    this.interCommand.getTextureOrtho(coo).then(function(texture)
                    {                             
                        this.setTextureOrtho(texture,id);
                        
                    }.bind(tile));
                    id++;
                }  
            }
            
        }.bind(this)); 
        
        return tile;
    };    
        
   /**
    * return 4 equals subdivisions of the bouding box
    * @param {type} node
    * @returns {Array} four bounding box
    */
    Quadtree.prototype.subdivide = function(node)
    {
        if(node.level >= 8)
            return;        
        
        node.material.visible = false;
        
        if(node.childrenCount() !== 0)
        {
            for (var i = 0 ;i<node.childrenCount();i++)
                node.children[i].visible = true;
                            
            return;
        }    
        var quad = new Quad(node.bbox);
        /*
        return when.all([        
        node.add(this.createTile(quad.northWest)),
        node.add(this.createTile(quad.northEast)),
        node.add(this.createTile(quad.southWest)),
        node.add(this.createTile(quad.southEast))]).then(function()
        {
            node.material.visible = false;
        });
        */
       
        node.add(this.createTile(quad.northWest));
        node.add(this.createTile(quad.northEast));
        node.add(this.createTile(quad.southWest));
        node.add(this.createTile(quad.southEast));
          
        
    };
    
    Quadtree.prototype.subdivideChildren = function(node)
    {
        if(node.level === 3)
            return;
        for (var i = 0 ;i<node.children.length;i++)
        {
            this.subdivide(node.children[i]);            
           //this.subdivideChildren(node.children[i]);
        }
    };
    
    return Quadtree;

});