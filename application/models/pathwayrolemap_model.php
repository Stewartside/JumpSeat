<?
/**
*  Model that fetches all data associated with tours
*/
class PathwayRoleMap_Model extends CI_Model
{
	private $collection = null;
	private $role_collection = null;
	private $pathway_collection = null;
	private $pathway_guide = null;
	private $host = null;

	/**
	 * Constructor
	 * @param string $host
	 */
	function __construct($host)
	{
		// Call the Model constructor
		parent::__construct();
		$this->load->library('mongo_db');

		//Load from config
		$this->load->config('config', TRUE);
		$this->host = $host;
		$this->collection = $host . "_" . PATHWAYROLE;
		$this->role_collection = $host . "_" . ROLES;
		$this->pathway_collection = $host . "_" . PATHWAY;
		$this->pathway_guide = $host . "_" . PATHWAYGUIDE;
	}
	
	
	/**
	 * Does a pathway relationship already exist
	 * @param string $roleid
	 * @param string $guideid
	 * @return boolean map exists
	 */
	public function map_exists($pathwayid, $roleid)
	{
		//Get roles
		$role_map = $this->mongo_db
			->select(array('guideid'))
			->where(array('roleid' => $roleid, 'pathwayid' => $pathwayid))
			->get($this->collection);
	
		return (sizeof($role_map) > 0);
	}

	
	/**
	 * Get pathway by pathwayid
	 * @param string $pathwayid
	 * @return array $map
	 */
	public function get_by_pathway($pathwayid)
	{
		$roles = array();
		$whereIds = array();
		$pathways = array();

		//Get pathways
		$pathway_map = $this->mongo_db
			->select(array('roleid'))
			->where(array('pathwayid' => $pathwayid))
			->get($this->collection);

		if(sizeof($pathway_map) > 0){
			foreach ($pathway_map as $pathway){
				array_push($whereIds, array('_id' => new MongoId($pathway['roleid'])));
			}

			$pathways = $this->mongo_db
				->select(array('title'))
				->orWhere($whereIds)
				->get($this->role_collection);
		}

		return $pathways;
	}


	/**
	 * Get pathway by roleid
	 * @param string $roleid
	 * @return array $map
	 */
	public function get_by_role($roleid)
	{
		$roles = array();
		$whereIds = array();
		$pathways = array();

		//Get pathways
		$pathway_map = $this->mongo_db
			->select(array('pathwayid'))
			->where(array('roleid' => $roleid))
			->get($this->collection);

		if(sizeof($pathway_map) > 0){
			foreach ($pathway_map as $p){
				if(isset($p['pathwayid']) && $p['pathwayid'] != ""){
					array_push($whereIds, array('_id' => new MongoId($p['pathwayid'])));
				}
			}

			$pathways = $this->mongo_db
				->select(array('title', 'description'))
				->orWhere($whereIds)
				->get($this->pathway_collection);

			if(sizeof($pathways) > 0){
				foreach ($pathways as &$pathway){
					$guideCount = $this->mongo_db
						->select(array('guideid'))
						->orderBy(array('index' => "ASC"))
						->where(array('pathwayid' => $pathway['id']))
						->get($this->pathway_guide);
				
					$pathway['count'] = sizeof($guideCount);
				}
			}
		}

		return $pathways;
	}


	/**
	 * Create a new association (pathway to role)
	 * @param string $pathwayid
	 * @param string $roleid
	 * @return string $if
	 */
	public function create($pathwayid, $roleid)
	{
		$map['pathwayid'] = $pathwayid;
		$map['roleid'] = $roleid;

		if(!$this->map_exists($pathwayid, $roleid))
		{
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
	 * Delete pathway association to role
	 * @param string $pathwayid
	 * @param mixed $roleid
	 * @return boolean
	 */
	public function delete($pathwayid, $roleid)
	{
		try
		{
			if(is_string($pathwayid)){
				//Delete one
				$this->mongo_db
					->where(array('pathwayid' => $pathwayid, 'roleid' => $roleid))
					->delete($this->collection);

				return true;
			}else{
				//Delete multi
				foreach ($pathwayid as $i)
				{
					if (!$this->delete($i, $roleid))
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