<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class App extends CI_Controller {

	public $data = array();

	/**
	 * Constructor
	*/
	function __construct()
	{
		parent::__construct();
		$this->lang->load('aero', $this->config->item('language'));
		$this->data['lang'] = (object) $this->lang->language;

		if (!isset($_SESSION['username']) || isset($_SESSION['appuser'])){
			header("Location: /login");
			exit;
		}

        if (!isset($_SESSION['license'])){
            $this->teatime();
        }
	}

	/**
	 *  Index for apps
	 */
	public function index()
    {
        $this->load->library('person', array('host' => ''));

        $this->data['username'] = $this->person->username;
        $this->data['is_admin'] = in_array($this->config->item("administrator"), $this->person->roles);
        $this->data['baseUrl'] = base_url();
        $this->load->view('apps_view', $this->data);
    }

	/**
	 *  User management
	 */
	public function users()
	{
		$this->load->library('person', array('host' => ''));
		$this->data['acl'] = $this->person->acl;
		$this->data['username'] = $this->person->username;
		$this->data['baseUrl'] = base_url();

		if(in_array($this->config->item("administrator"), $this->person->roles)){
			$this->load->view('users_view', $this->data);
		}else{
			//No Access!
			$this->load->view('noaccess_view', $this->data);
		}
	}

    /**
     * Section views
     * @param string $host
     * @param string $view
     */
    public function section($host, $view)
    {
        $this->load->library('person', array('host' => $host));
        $acl = $this->person->acl;
        $aclSection = $view;
        if($aclSection == "blacklist" || $aclSection == "pagedata") $aclSection = 'config';

        $this->data['username'] = $this->person->username;
        $this->data['acl'] = $acl;
        $this->data['baseUrl'] = base_url();
        $this->data['host'] = $host;
        $this->data['view'] = $view;

        if ($view == 'trash' || $view == "features")
            $aclSection = 'guides';

        if(isset($acl[$aclSection]['read']) && $acl[$aclSection]['read']){
            $this->load->view( $view. '_view', $this->data);
        }else{
            //No Access!
            $this->load->view('noaccess_view', $this->data);
        }
    }

    /**
     * Sub section views
     * @param string $host
     * @param string $sub
     * @param string $view
     */
    public function subsection($host, $sub, $view)
    {
        $host = urldecode($host);
        $this->load->library('person', array('host' => $host));
        $acl = $this->person->acl;
        $aclSection = $view;

        //Permissions
        $this->data['username'] = $this->person->username;
        $this->data['acl'] = $acl;
        $this->data['baseUrl'] = base_url();
        $this->data['host'] = $host;
        $this->data['view'] = $view;
        $this->data['id'] = urldecode($sub);

        if($view == "rolemap")
        {
            $host = str_replace('.', '_', $host);
            $host = str_replace('://', '_', $host);

            $aclSection = "roles";
            $this->load->model('role_model', '', FALSE, $host);
            $role = $this->role_model->get_by_title(urldecode($sub), true);

            //ID and description
            $this->data['permissions'] = $role;
            $this->data['objid'] = $role['id'];
            $this->data['objdesc'] = $role['description'];
        }
        else if($view == "pathwaymap")
        {
            $aclSection = "pathways";
        }
        else if($view == "versions")
        {
            $aclSection = "guides";
        }
        else if($view == "language")
        {
            $aclSection = "guides";
        }
        else if($view == "pages")
        {
            $aclSection = "guides";

            $this->load->model('feature_model', '', FALSE, $host);
            $feature = $this->feature_model->get_by_title(urldecode($sub));
            $this->data['featureid'] = $feature['id'];
        }

        if(isset($acl[$aclSection]['read']) && $acl[$aclSection]['read']){
            $this->load->view( $view. '_view', $this->data);
        }else{
            //No Access!
            $this->load->view('noaccess_view', $this->data);
        }
    }

    private function get_real_ip()
    {
        if (isset($_SERVER["HTTP_CLIENT_IP"]))
        {
            return $_SERVER["HTTP_CLIENT_IP"];
        }
        elseif (isset($_SERVER["HTTP_X_FORWARDED_FOR"]))
        {
            return $_SERVER["HTTP_X_FORWARDED_FOR"];
        }
        elseif (isset($_SERVER["HTTP_X_FORWARDED"]))
        {
            return $_SERVER["HTTP_X_FORWARDED"];
        }
        elseif (isset($_SERVER["HTTP_FORWARDED_FOR"]))
        {
            return $_SERVER["HTTP_FORWARDED_FOR"];
        }
        elseif (isset($_SERVER["HTTP_FORWARDED"]))
        {
            return $_SERVER["HTTP_FORWARDED"];
        }
        else
        {
            return $_SERVER["REMOTE_ADDR"];
        }
    }

    private function teatime()
    {
        $_SESSION['license'] = 'Enterprise';
        return;
        
        $this->load->config('config', TRUE);
        $_SESSION['license'] = 'Community';

        log_message('debug', '-------------------------------------------');
        log_message('debug', 'Checking license details...');
        log_message('debug', 'VHost : ' . base_url());
        log_message('debug', 'Key : ' . $this->config->item('l' . 'ke' . 'y') );

        if($this->config->item('l'.'ke'.'y') != "") {

            $ch = curl_init("https://workfront.jumpseat.io/api/teatime");
            $app = array();

            $app['vhost'] = base_url();
            $app['uri'] = $_SERVER['REQUEST_URI'];
            $app['ip'] = $_SERVER['REMOTE_ADDR'];
            $app['headers'] = getallheaders();
            $app['user'] = $_SESSION['username'];
            $app['externalip'] = $this->get_real_ip();
            $app['l' . 'ke' . 'y'] = $this->config->item('l' . 'ke' . 'y');

            # Setup request to send json via POST.
            $payload = json_encode($app);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type:application/json'));
            # Return response instead of printing.
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            # Send request.
            $result = curl_exec($ch);
            curl_close($ch);
            # Print response.

            log_message('debug', '-------------------------------------------');

            $r = json_decode($result);

            if ($r->status == 200) {
                $_SESSION['license'] = 'Enterprise';
                log_message('debug', 'LICENSE STATUS: verified');
            }else {
                log_message('debug', 'LICENSE STATUS: invalid or expired');
            }

            log_message('debug', '-------------------------------------------');
        }
    }
}

/* End of file welcome.php */
/* Location: ./application/controllers/welcome.php */
