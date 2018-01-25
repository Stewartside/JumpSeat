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

class Pathway extends REST_Controller
{
	function __construct()
    {
        // Construct our parent class
        parent::__construct();

        $this->load->model('pathway_model', '', FALSE, $this->host);
    }

    /**
     *  GET pathway service call
     */
    function index_get()
    {
    	$id = $this->input->get('id');
    	$title = $this->input->get('title');
    	$count = $this->input->get('count');
    	$dropEmpty = $this->input->get('dropEmpty');
    	$select = $this->input->get('select') ? $this->input->get('select') : array();

    	if($id){
            $pathway = $this->pathway_model->get_by_id($id);
		}elseif($title){
			$pathway = $this->pathway_model->get_by_title($title);
		}else{
            $pathway = $this->pathway_model->get_all($select, $count, $dropEmpty);
        }
        
    	$this->response($pathway, 200);
    }

 	/**
     *  POST pathway service call
     */
    function index_post()
    {
    	$new = $this->pathway_model->create($this->request_data);

    	$response_code = $new ? 200 : 400;
    	$this->response($new, $response_code);
    }


    /**
     *  POST pathway service call
     */
    function index_put()
    {
    	$id = $this->request_data['id'];
    	unset($this->request_data['id']);

    	$new = $this->pathway_model->update_by_id($id, $this->request_data);

    	$response_code = $new ? 200 : 400;
    	$this->response($new, $response_code);
    }

    /**
     *  Delete a pathwat
     */
    function index_delete()
    {
    	$guide = $this->pathway_model->delete_by_id($this->delete('id'));
    	$this->response($guide, 200);
    }
}
