<?php defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Aero pathways
 *
 * CRUD API services for Aero pathways
 *
 * @package		Aero
 * @subpackage	pathways
 * @category	REST Controller
 * @author		Mike Priest
*/
require APPPATH.'/libraries/REST_Controller.php';

class PathwayRoleMap extends REST_Controller
{
	function __construct()
    {
        // Construct our parent class
        parent::__construct();

        $this->load->model('pathwayrolemap_model', '', FALSE, $this->host);
    }

    /**
     *  GET pathway mapping by guide
     */
    function by_role_get()
    {
    	$map = $this->pathwayrolemap_model->get_by_role($this->input->get('roleid'));
    	$this->response($map, 200);
    }

    /**
     *  GET pathway mapping by pathway
     */
    function by_pathway_get()
    {
    	$map = $this->pathwayrolemap_model->get_by_pathway($this->input->get('pathwayid'));
    	$this->response($map, 200);
    }

    /**
     *  Get table data for admin
     */
    function table_get()
    {
    	$rows["data"] = array();

    	//All guides
    	$guides = $this->pathwayrolemap_model->get_by_role($this->get('roleid'));
		
    	//Get user
    	$this->load->library('person', array('host' => $this->host));
    	$acl = $this->person->acl;

    	//Build rows
    	// @todo total guides
    	foreach($guides as $guide)
    	{
    		$id = $guide['id'];
			$tools = "<div class='tools' style='width:115px'; data-id='$id'>";
			
    		//Permission
    		if($acl['pathways']['assignRole']){
    			$tools .= "<a class='small button alert delete'>Delete <i class='ss-icon'>&#xE0D0;</i></a>";
    		}
    		$tools .= "</div></li>";

    		$row = array(
    				"<input type='checkbox' class='select' value='1' data-id='$id' />",
    				$guide['title'],
    				$guide['description'],
    				$guide['count'],
    				$tools
    		);

    		array_push($rows['data'], $row);
    	}
    	$this->response($rows, 200);
    }


 	/**
     *  POST pathway service call
     */
    function index_post()
    {
    	$new = $this->pathwayrolemap_model->create($this->request_data['pathwayid'], $this->request_data['roleid']);
    	$this->response($new, 200);
    }


    /**
     *  DELETE association between guide and pathway
     */
    function index_delete()
    {
    	$del = $this->pathwayrolemap_model->delete($this->delete('pathwayid'), $this->delete('roleid'));

    	$response_code = $del ? 200 : 400;
    	$this->response($del, $response_code);
    }
}
