<?php if ( ! defined('BASEPATH')) exit('No direct script access allowed');

class AeroSpace extends CI_Controller {

	public $require = null;
    public $fire = null;
	public $language = array();

	/**
	 * Constructor acl
	 */
	function __construct()
	{
		parent::__construct();
		$this->lang->load('aero_front', $this->config->item('language'));
		$this->language = json_encode($this->lang->language);

        if (!isset($_SESSION['license'])){
            $this->teatime();
        }
	}

	/**
	 * JumpSeat injection
	 */
	public function index()
	{
		$data['lang'] = $this->language;
		$data['cache'] = 0;

        //REFER is not reliable
        if($this->input->get('ref')) {
            //Get the host name
            $referer = parse_url(urldecode($this->input->get('ref')));
        }else{
            //Get the host name
            $referer = parse_url($_SERVER['HTTP_REFERER']);
        }

		//Enable ports
		$port = (isset($referer['port']) && $referer['port'] != "80") ? ':' . $referer['port'] : '';
      $www = $referer["scheme"] . "://" . $referer['host'] . $port;
      $path = (empty($referer['fragment'])) ? $referer['path'] : $referer['path'] . '#' . $referer['fragment'];

		//Load app model and get app
		$this->load->model("app_model");
		$app = $this->app_model->test_url($www, $path);

		if($app && $app['active']){

			$host = str_replace('.', '_', $app['host']);
			$host = str_replace('://', '_', $host);

			//Load Person and ACL
			$this->load->library('person', array('host' => $host));
			$data['admin'] = $this->person->acl['guides']['create'];
			$data['username'] = $this->person->username;

			//Check injection is enabled
			$isInject = $this->config->item("injection_enabled");

			//Set app data
			if($app){
				$data['cache'] = $app['version'];
				$data['app'] = $app['host'];
				$data['pagedata'] = $this->get_page_data($host);
				$data['require'] = $this->require;
                $data['fire'] = $this->fire;
                $data['rootLocale'] = $this->config->item("language");
			}

			//Inject JumpSeat
			$min = (MIN == ".min") ? "_min" : "";
			if($isInject && sizeof($app) != 0) $this->load->view('aerospace_view' . $min, $data);
		}else{
			$this->load->view('aerospace_empty_view', $data);
		}
	}


	/**
	 *  Get page data for host
	 */
	public function get_page_data($host)
	{
		$js = "";

		$this->load->model('pagedata_model', '', FALSE, $host);
		$pagedata = $this->pagedata_model->get_all();
		$urls = array();

		foreach ($pagedata as $data){

			$type = trim($data['type']);
			$prop = trim($data['prop']);
			$val = trim($data['value']);
			//var_dump($prop . " : " . $val);

			if($val != ""){

				if($type == "url"){
					array_push($urls, array(
						'regex' => $prop,
						'value' => $val
					));
				}elseif($prop == "require") {
                    $this->require = trim($data['value']);
                }elseif($prop == "fire"){
                    $this->fire = trim($data['value']);
				}else{
					$js .= trim($data['prop']) . " : (function(){ return " . trim($data['value']) . "}),";
				}
			}
		}

		$js .= 'urls : ' . json_encode($urls);

		return $js;
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
