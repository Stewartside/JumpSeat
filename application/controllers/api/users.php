<?php defined('BASEPATH') OR exit('No direct script access allowed');

/**
 * Aero Users
 *
 * CRUD API services for Aero users
 *
 * @package		Aero
 * @subpackage	Users
 * @category	REST Controller
 * @author		Mike Priest
*/
require APPPATH.'/libraries/REST_Controller.php';

class Users extends REST_Controller
{
	function __construct()
    {
        // Construct our parent class
        parent::__construct();
        $this->load->model('user_model');
    }

    /**
     *  GET user service call
     */
    function index_get()
    {
    	$id = $this->input->get('id');
    	$select = $this->input->get('select');

    	if($id && is_array($id)){
    		$users = $this->user_model->get_by_ids($id);
    	}elseif($id){
    		$users = $this->user_model->get_by_id($id);
    	}else{
    		$users = $this->user_model->get_all($select);
    	}

    	$this->response($users, 200);
    }


    /**
     *  Get table data for admin
     */
    function table_get()
    {
    	$rows["data"] = array();

    	//All users
    	$users = $this->user_model->get_all();

    	//Get person
    	$this->load->library('person', array('host' => $this->host));
		$acl = $this->person->acl;
		$user = $this->person->username;

    	date_default_timezone_set($this->config->item('timezone'));

    	//Build rows
    	foreach($users as $user)
    	{
	    	$id = $user['id'];
	    	$first = $user['firstname'];
	    	$last = $user['lastname'];
	    	$admin = $user['sysadmin'] ? "Yes" : "No";
	    	$email = $user['email'];
            $lastlogin = "Never";

            if((isset($user['lastlogin']))){
                $lastlogin = $this->format_date($user['lastlogin']->sec);
                //$lastlogin = $this->time_elapsed_string($lastlogin);
            }
            $created = $this->format_date($user['created']->sec);

    		$tools = "<div class='tools' style='width: 210px' data-id='$id'>";
    		if(true){
    			$tools .= "<a class='small button success edit'>Edit <i class='ss-icon'>&#x270E;</i></a>";
    		}
    		if(true){
    			$tools .= "<a class='small button alert delete'>Delete <i class='ss-icon'>&#xE0D0;</i></a>";
    		}
    		$tools .= "</div></li>";

    		$row = array(
    				"<input type='checkbox' class='select' value='1' data-id='$id' />",
    				$first,
    				$last,
    				$email,
    				$created,
                    $lastlogin,
                    $admin,
    				$tools
    		);

    		array_push($rows['data'], $row);
    	}
    	$this->response($rows, 200);
    }

    /**
     *  POST user service call
     */
    function install_post()
    {
        if($this->user_model->count() > 1){
            $this->response(array('error' => 'Function not allowed'), 404);
            exit;
        }
        $this->user_model->create_admin();

        $user = array(
            "email" => $this->post('email'),
            "password" => $this->post('password'),
            "firstname" => $this->post('firstname'),
            "lastname" => $this->post('lastname'),
            "sysadmin" => true
        );

        $new = $this->user_model->create($user);

        $data['success'] = $this->user_model->login($user['email'], $user['password']) == 0;

        $response_code = $data['success'] ? 200 : 400;
        $this->response($data, $response_code);
    }

 	/**
     *  POST user service call
     */
    function index_post()
    {
        $new = $this->user_model->create($this->request_data);

    	$response_code = $new ? 200 : 400;
    	$this->response($new, $response_code);
    }

    /**
     *  POST user service call
     */
    function index_put()
    {
    	$id = $this->request_data['id'];
    	unset($this->request_data['id']);

    	$user = $this->user_model->update_by_id($id, $this->request_data);
		$this->response($user, 201);
    }

    /**
     *  Delete a user
     */
    function index_delete()
    {
    	$user = $this->user_model->delete_by_id($this->delete('id'));
    	$this->response($user, 200);
    }

    function password_reset_get()
    {
        $email = $this->get('email');
        $expiry = $this->get('expiry');

        $data = null;
        if (isset($expiry))
            $data = $this->user_model->password_reset($email, $expiry);
        else
            $data = $this->user_model->password_reset($email);

        if (isset($data['url']) && strlen($data['url']) > 8)
            $this->response(array("sent" => true), 200);
        else
            $this->response('Email not found.', 300);
    }

    function verify_get()
    {
        $email = $this->get('email');
        $key = $this->get('key');

        if (!$this->user_model->verify($email, $key))
        {
            //This block should never be hit
            var_dump("Link is invalid or expired.");
        }
    }

    function format_date($my_date){

        $date = date('y-m-d', $my_date);
        $time = date('h:i:s', $my_date);
        $now = date('y-m-d');

        //Date & time
        $format = $date . ' at ' . $time;

        //Same date, just use time
        if($date == $now) $format = $time;

        return $format;
    }

    function time_elapsed_string($datetime, $full = false) {
        $now = new DateTime;
        $ago = new DateTime($datetime);
        $diff = $now->diff($ago);

        $diff->w = floor($diff->d / 7);
        $diff->d -= $diff->w * 7;

        $string = array(
            'y' => 'year',
            'm' => 'month',
            'w' => 'week',
            'd' => 'day',
            'h' => 'hour',
            'i' => 'minute',
            's' => 'second',
        );
        foreach ($string as $k => &$v) {
            if ($diff->$k) {
                $v = $diff->$k . ' ' . $v . ($diff->$k > 1 ? 's' : '');
            } else {
                unset($string[$k]);
            }
        }

        if (!$full) $string = array_slice($string, 0, 1);
        return $string ? implode(', ', $string) . ' ago' : 'just now';
    }
}
