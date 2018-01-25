<?
/**
*  Model that fetches all data associated with tours
*/
class User_Model extends CI_Model
{
	private $collection = null;

	/**
	 * Constructor
	*/
	function __construct()
	{
		// Call the Model constructor
		parent::__construct();
		$this->load->library('mongo_db');
		$this->collection = USERS;
	}


	/**
	 *  TEST ONLY Login User
	 */
	public function login($username, $password){

		$user = $this->mongo_db
			->where(array('email' => $username))
			->get($this->collection);

        if(sizeof($user) <= 0) {
            //Username not found
            return 1;
        }
        if(isset($user[0]['failedtries'])){
            if($user[0]['failedtries'] > 5) {

                return 2;
            }
        }else{
            $user[0]['failedtries'] = 0;
        }

        $success = password_verify($password, $user[0]['password']);
        $expired = $this->_is_expired($user[0]['id']);

        if ($success && !$expired){

            unset($_SESSION['appuser']);
			$_SESSION['username'] = $user[0]['email'];
			$_SESSION['userid'] = $user[0]['id'];
			$_SESSION['firstname'] = $user[0]['firstname'];
			$_SESSION['lastname'] = $user[0]['lastname'];
			$_SESSION['sysadmin'] = $user[0]['sysadmin'];

            //Update last login
            $this->update_lastlogin($user[0]['id'], $user[0]['timeslogin']);

			return 0;
		}else{

		    //Count fail
            $tooMany = $this->update_failedtries($user[0]['id'], $user[0]['failedtries']);

            //Too many password attempts
            if($tooMany) return 2;

            //Failed password
            return 1;
        }
	}

	/**
	 * Get all users from mongo
	 * @param array $order_by order of tours
	 * @return array $users
	*/
	public function get_all($select = array(), $order = array())
	{
		if (sizeof($order) == 0 ) $order = array('title' => 'ASC');

		//Get users
		$users = $this->mongo_db
			->select($select)
			->orderBy($order)
			->get($this->collection);

		return $users;
	}


    /**
     * Count all users
     * @return int $users
     */
    public function count()
    {
        //Get users
        $users = $this->mongo_db
            ->count($this->collection);

        return $users;
    }

	/**
	 * Get all users from mongo
	 * @param array $order_by order of tours
	 * @return array $users
	 */
	public function get_by_id($id)
	{
		//Get users
		$user = $this->mongo_db
			->where(array('_id' => new MongoId($id)))
			->get($this->collection);

		return $user[0];
	}

	/**
	 * Get multiple users
	 * @param string[] $ids Requested IDs
	 * @return string[] Users
	 */
	public function get_by_ids($ids)
	{
		$users = array();
		foreach ($ids as $id)
		{
			$user = $this->get_by_id($id);
			array_push($users, $user);
		}
		return $users;
	}

	/**
	 * Get by name
	 * @param array $order_by order of tours
	 * @return array $users
	 */
	public function get_by_email($email)
	{
		//Get users
		$user = $this->mongo_db
			->whereLike("email", $email)
			->get($this->collection);

		if(sizeof($user) > 0) return $user[0];
		return false;
	}

	/**
	 * Get all users from mongo
	 * @param array $order_by order of tours
	 * @return array $users
	 */
	public function create($user)
	{
		unset($user['id']);

        $email_user = null;
        if (isset($user['emailuser']))
        {
            $email_user = $user['emailuser'] == 'on' ? true : false;
            unset($user['emailuser']);
        }

		$this->load->library('person');

        $user['timeslogin'] = 0;
        $user['created'] = New Mongodate(time());
		$user['creator'] = $this->person->username;

        if (!$email_user)
            $user['password'] = password_hash($user['password'], PASSWORD_DEFAULT);

		try
		{
			$id = $this->mongo_db->insert($this->collection, (array) $user );
		}
		catch (Exception $e)
		{
			return false;
		}

        if ($email_user)
            $this->password_reset($user['email'], 168); // User has a week to login

        return $id->{'$id'};
	}

    /**
     * Create admin user from config file
     * @return array $user
     */
    public function create_admin()
    {
        $this->config->load('admin_user');

        $user = Array();
        $user['firstname'] = $this->config->item('firstname');
        $user['lastname'] = $this->config->item('lastname');
        $user['email'] = $this->config->item('email');
        $user['password'] = $this->config->item('password');
        $user['sysadmin'] = true;

        return $this->create($user);
    }

    /**
     * Updates user last login date
     * @param $id User object ID
     */
    public function update_lastlogin($id, $count)
    {
        if(empty($count)) $count = 0;

        $user['lastlogin'] = New Mongodate(time());
        $user['timeslogin'] = $count + 1;

        //Reset fails
        $user['failedtries'] = 0;

        $this->mongo_db
            ->where(array('_id' => new MongoId($id)))
            ->set( (array) $user )
            ->update($this->collection);
    }


    /**
     * Updates user failed tries and date
     * @param $id User object ID
     */
    public function update_failedtries($id, $count = 0)
    {
        if(empty($count)) $count = 0;

        $user['faileddate'] = New Mongodate(time());
        $user['failedtries'] = $count + 1;

        $this->mongo_db
            ->where(array('_id' => new MongoId($id)))
            ->set( (array) $user )
            ->update($this->collection);

        return $user['failedtries'] > 3;
    }


    /**
     * Updates a user with new data
     *     Note: If setting password, send in plain text
     * @param $id User object ID
     * @param $user User object
     * @return User object
     */
	public function update_by_id($id, $user)
	{
        $user_data = $this->get_by_id($id);

        $email_user = null;
        if (isset($user['emailuser']))
        {
            $email_user = $user['emailuser'] == 'on' ? true : false;
            unset($user['emailuser']);
        }
        unset($user['id']);

		if(isset($user['password'])){
			if($user['password'] == ""){
				unset($user['password']);
			}else{
                $user['password'] = password_hash($user['password'], PASSWORD_DEFAULT);
			}
		}

        // Special case if user is resetting password
        if (isset($user['password']) && isset($user_data['resetExpiry']))
            if (isset($user_data['passwordReset']) && $user_data['passwordReset'])
                if (!$this->_is_expired($id))
                    $user['passwordReset'] = false; // Means it's just $this->password_reset setting the password
                else
                {
                    // User is setting password, remove the resetExpiry
                    $this->mongo_db
                        ->where(array('_id' => new MongoId($id)))
                        ->unsetField('resetExpiry')
                        ->update($this->collection);
                }

		$this->load->library('person');
		$user['modified'] = New Mongodate(time());
		$user['modifier'] = $this->person->username;

		$this->mongo_db
			->where(array('_id' => new MongoId($id)))
			->set( (array) $user )
			->update($this->collection);

        if ($email_user)
            $this->password_reset($user['email'], 24); // User has a day to login

		return $user;
	}

	/**
	 * Delete user by id
	 * @param string id
	 * @return boolean
	 */
	public function delete_by_id($id)
	{
		try
		{
			if(is_string($id)){

				//Delete one
				$this->mongo_db
					->where(array('_id' => new MongoId($id)))
					->delete($this->collection);

				return true;
			}else{

				//Delete multi
				foreach ($id as $i)
				{
					if (!$this->delete_by_id($i))
					{
						return false;
					}
				}


				return true;
			}
		}
		catch (Exception $e)
		{
			return false;
		}
	}

    /**
     * Resets a users password
     * @param $email User's email address
     * @param $expiry Set expiry on account in hours, defaults to a day
     * @return string Password reset URL
     */
    public function password_reset($email, $expiry)
    {
        $pass = $this->_random_password();

        try
        {
            $user = $this->mongo_db
                ->where(array('email' => $email))
                ->get($this->collection);
        }
        catch (Exception $e)
        {
            return false;
        }

        if (isset($user) && count($user) < 1)
            return false;

        if (empty($expiry)) $expiry = 24;

        $user = $user[0];
        $id = $user['id'];
        unset($user['id']);
        $expiry = $expiry * 3600; // Convert to seconds
        $user['resetExpiry'] = New Mongodate(time() + $expiry);
        $user['passwordReset'] = true;
        $user['password'] = $pass;

        $this->update_by_id($id, $user);
        $this->update_failedtries($id);

        $url = base_url() .'api/users/verify?email='. $user['email'] .'&'.'key='. $pass;

        // Send email
        $this->load->library('email');
        $subject = 'JumpSeat password reset';
        $message = '<p>You have requested a password reset.<br><br>Click the following link to reset your JumpSeat password: <a href="'.$url.'">'.$url.'</a></p>';

        // Get full html:
        $body =
            '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
                <html xmlns="http://www.w3.org/1999/xhtml">
                <head>
                    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
                    <title>'.htmlspecialchars($subject, ENT_QUOTES, $this->email->charset).'</title>
                    <style type="text/css">
                        body {
                            font-family: Arial, Verdana, Helvetica, sans-serif;
                            font-size: 16px;
                        }
                    </style>
                </head>
                <body>
                '.$message.'
                </body>
                </html>';

        $result = $this->email
            ->from('no-reply@10spd.com')
            ->to($email)
            ->subject($subject)
            ->message($body)
            ->send();

        return array('url' => $url);
    }

    /**
     * Verify user (from the email link), and redirect accordingly
     * @param $email User email
     * @param $key User password
     * @return bool
     */
    public function verify($email, $key)
    {
        // login() was changed to return error codes rather than boolean (0 is success)
        $success = 1;
        $user = $this->get_by_email($email);
        if (isset($user))
            $success = $this->login($email, $key);

        if ($success == 0)
            header('Location: '. base_url() . $user['id'] .'/profile');
        else
            header('Location: '. base_url() . 'login?error=1');
    }

    /**
     * Generates a random 32 character password
     * @return string Password
     */
    private function _random_password()
    {
        $alphabet = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
        $pass = array();
        $alphaLength = strlen($alphabet) - 1;
        for ($i = 0; $i < 32; $i++) {
            $n = rand(0, $alphaLength);
            $pass[] = $alphabet[$n];
        }
        return implode($pass);
    }

    /**
     * Check for expired account
     * @param $id ID of user
     * @return bool Account expired or not
     */
    private function _is_expired($id)
    {
        $user = $this->mongo_db
            ->where(array('_id' => new MongoId($id)))
            ->get($this->collection);

        $expiry = 0;
        $reset_expiry = 0;
        if (isset($user[0]['expiry']))
            $expiry = $user[0]['expiry']->sec;
        else
            $expiry = PHP_INT_MAX;

        if (isset($user[0]['resetExpiry']))
            $reset_expiry = $user[0]['resetExpiry']->sec;
        else
            $reset_expiry = PHP_INT_MAX;

        $current = time();
        return $current > $expiry || $current > $reset_expiry ? true : false;
    }
}
