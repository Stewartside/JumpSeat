<?
/**
*  Model that fetches all data associated with tours
*/
class PathwayMap_Model extends CI_Model
{
	private $collection = null;
	private $guide_collection = null;
	private $pathway_collection = null;
	private $host = null;

	/**
	 * Constructor
	*/
	function __construct($host)
	{
		// Call the Model constructor
		parent::__construct();
		$this->load->library('mongo_db');

		//Load from config
		$this->load->config('config', TRUE);
		$this->host = $host;
		$this->collection = $host . "_" . PATHWAYGUIDE;
		$this->guide_collection = $host . "_" . GUIDES;
		$this->pathway_collection = $host . "_" . PATHWAY;
	}


	/**
	 * Does a user relationship already exist
	 * @param string $roleid
	 * @param string $guideid
	 * @return boolean map exists
	 */
	public function map_exists($pathwayid, $guideid)
	{
		//Get roles
		$role_map = $this->mongo_db
			->select(array('guideid'))
			->where(array('pathwayid' => $pathwayid, 'guideid' => $guideid))
			->get($this->collection);

		return (sizeof($role_map) > 0);
	}


	/**
	 * Get pathway by id
	 * @param array $id id
	 * @return array $pathway
	 */
	public function get_by_role($role)
	{
		//Get pathways
		$pathway = $this->mongo_db
			->where(array('roleid' => $role))
			->get($this->collection);

		return $pathway;
	}


	/**
	 * Update index by guideid
	 * @param string $guideid
	 * @param integer $index
	 * @return boolean
	 */
	public function update_indexes($pathwayid, $guides)
	{
		$map = null;

        foreach($guides as $guide => $index){

			//Update index
			$data['index'] = $index;
			$data['guideid'] = $guide;
			$data['pathwayid'] = $pathwayid;

			log_message('debug', 'Aero:' . $guide);

			$map = $this->mongo_db
				->where(array('pathwayid' => $pathwayid))
				->where(array('guideid' => $guide))
				->set( (array) $data )
				->update($this->collection);
		}

		return $map;
	}


	/**
	 * Get pathway by pathwayid
	 * @param string $pathwayid id
	 * @return array $map
	 */
	public function get_by_pathway($pathwayid, $active = true)
	{
        //Load person
        $this->load->library('person', array('host' => $this->host));
        $this->load->model('analytics_model', '', FALSE, $this->host);

        //Get user & permissions
        $acl = $this->person->acl;

        //Set Permissions
        $admin = (in_array("Administrator", $this->person->roles));
        $create = ($admin || $acl['guides']['create']);
        $view   = ($admin || $acl['pathways']['read']);

        //Exit for no access
        if(!$view) return array();

 		//Get pathways
		$pathway_map = $this->mongo_db
			->select(array('guideid'))
			->orderBy(array('index' => "ASC"))
			->where(array('pathwayid' => $pathwayid))
			->get($this->collection);

		if(sizeof($pathway_map) > 0)
		{
			//Get guides
            $guides = $this->get_guides_by_map($pathway_map, $this->person->username);

            //Match guide info to map
            foreach($pathway_map as $key => &$pathway)
            {
                foreach($guides as $guide)
                {
                    //Found guide data
                    if($guide['id'] == $pathway['guideid'])
                    {
                        //Hide inactive guides
                        if(!$admin && !$create && !$guide['active'])
                            unset($pathway_map[$key]);
                        else
							$pathway = $guide;
							$username = isset($_SESSION['username']) ? $_SESSION['username'] : 'guest';

                            $pathway['progress']   = $this->analytics_model->get_progress($username, $guide['id']);
                            $pathway['test'] = $guide['id'];
                            $pathway['guideid'] = $guide['id'];
                    }
                }
            }
		}

		return array_values($pathway_map);
	}


    /**
     * Get guides for pathwayid
     * @return array $guides
     */
    private function get_guides_by_map($pathway_map, $username)
    {
        $whereIds = array();
        $select = array('title', 'step', 'active');

        //Merge ids for search
        foreach ($pathway_map as $pathway) array_push($whereIds, $pathway['guideid']);

        //Get all guides
        $this->load->model('guide_model', '', FALSE, $this->host);
        $guides = $this->guide_model->get_by_ids($whereIds, $select);

        if($username)
        {
            //User completed?
            $this->load->model('analytics_model', '', FALSE, $this->host);
            $stats = $this->analytics_model->has_completed_by_ids($username, $whereIds);

            //Merge guides with completed
            foreach($guides as &$guide)
            {
                foreach($stats as $stat)
                    if($stat['guideid'] == $guide['id'] && $stat['perc'] == 100) $guide['complete'] = true;
            }
        }

        return $guides;
    }


	/**
	 * Count guides for a given role
	 * @param array $id id
	 * @return array $guide
	 */
	public function count_guides($pathwayid)
	{
		//Get pathways
		$count = $this->mongo_db
			->where(array('pathwayid' => $pathwayid))
			->count($this->collection);

		return $count;
	}


	/**
	 * Get pathway by guideid
	 * @param array $id id
	 * @return array $map
	 */
	public function get_by_guide($guideid)
	{
		$guides = array();
		$whereIds = array();
		$pathways = array();

		//Get pathways
		$pathway_map = $this->mongo_db
			->select(array('pathwayid'))
			->where(array('guideid' => $guideid))
			->get($this->collection);

		if(sizeof($pathway_map) > 0){
			foreach ($pathway_map as $pathway){
				array_push($whereIds, array('_id' => new MongoId($pathway['pathwayid'])));
			}

			$pathways = $this->mongo_db
				->select(array('title'))
				->orWhere($whereIds)
				->get($this->pathway_collection);
		}

		return $pathways;
	}


	/**
	 * Create a new association (pathway to guide)
	 * @param string $pathwayid
	 * @param string $guideid
	 * @return string $if
	 */
	public function create($pathwayid, $guideid)
	{
		$map['pathwayid'] = $pathwayid;
		$map['guideid'] = $guideid;
		$map['index'] = 9999;

		if(!$this->map_exists($pathwayid, $guideid)){
			try
			{
				$id = $this->mongo_db->insert($this->collection, $map );
				return $id->{'$id'};
			}
			catch (Exception $e)
			{
				return false;
			}
		}
		return false;
	}


	/**
	 * Delete pathway association to guide
	 * @param string $pathwayid
	 * @param mixed $guideid
	 * @return boolean
	 */
	public function delete($pathwayid, $guideid)
	{
		try
		{
			if(is_string($guideid)){

				//Delete one
				$this->mongo_db
					->where(array('pathwayid' => $pathwayid, 'guideid' => $guideid))
					->delete($this->collection);

				return true;
			}else{

				//Delete multi
				foreach ($guideid as $i)
				{
					if (!$this->delete($pathwayid, $i))
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
}
