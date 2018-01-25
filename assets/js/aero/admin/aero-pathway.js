"use strict";

/**
 * Admin Pathway Object
 * @author Mike Priest
 * @type {{getAll: Function, getByGuideid: Function, createMapping: Function, destroyMapping: Function}}
 */
Aero.pathways = {

    /**
     *  Get pathway list
     */
    getAll : function(callback){
        if(!Aero.constants.PATHWAYS){
            Aero.send("api/pathway", {}, function(r){
                Aero.constants.PATHWAYS = r;
                callback(r);
            }, "GET");
        }else{
            callback(Aero.constants.PATHWAYS);
        }
    },

    /**
     *  Get pathway list
     */
    getByGuideid : function(guideid, callback){
        Aero.send("api/pathwaymap/by_guide", { guideid : guideid }, function(r){
            callback(r)
        }, "GET");
    },

    /**
     *  Create association with role and guide
     */
    createMapping : function(pathwayid, guideid){
        Aero.send("api/pathwaymap", { guideid: guideid, pathwayid: pathwayid}, function(){
            Aero.view.guide.admin.renderMapping('pathways');
        }, "POST");
    },

    /**
     *  Delete assication between role and guide
     */
    destroyMapping : function(pathwayid, guideid){
        Aero.send("api/pathwaymap", { guideid: guideid, pathwayid: pathwayid}, function(){
            Aero.view.guide.admin.renderMapping('pathways');
        }, "DELETE");
    }
};
