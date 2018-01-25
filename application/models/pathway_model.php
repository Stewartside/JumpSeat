<?
/**
*  Model that fetches all data associated with tours
*/
class Pathway_Model extends CI_Model
{
	private $collection = null;
	private $rolemap_collection = null;
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
		$this->collection = $host . "_" . PATHWAY;
		$this->rolemap_collection = $host . "_" . PATHWAYROLE;
	}

	/**
	 * Check to see if a user has access to a pathway
	 * @param string $pathwayid
	 * @return boolean
	 */
	public function has_access($pathwayid)
	{
		$wheres = array();

		$this->load->library('person', array('host' => $this->host));
		if(in_array("Administrator", $this->person->roles)) return true;

		$roles = $this->mongo_db
			->where(array('pathwayid' => $pathwayid))
			->get($this->rolemap_collection);

		//Default to Guest
		if(sizeof($roles) == 0) return true;

		// @todo clean this up with orWhere roleid && pathwayid
		foreach($roles as $role)
		{
			foreach($this->person->roleids as $roleid)
			{
				if($role['roleid'] == $roleid) return true;
			}
		}

		return false;
	}

	/**
	 * Get all pathways from mongo
	 * @param array $order_by order of tours
	 * @return array $pathways
	*/
	public function get_all($select = array(), $count = false, $dropEmpty = false)
	{
		$myPathways = array();
		$order = array('title' => 'ASC');
		$where = array();
		$i = 0;

		//Get pathways
		$pathways = $this->mongo_db
			->select($select)
			->where($where)
			->orderBy($order)
			->get($this->collection);

		//Get guide count
		foreach($pathways as &$pathway)
		{
			$this->load->model('pathwaymap_model', '', FALSE, $this->host);
			$size = $this->pathwaymap_model->count_guides($pathway['id']);
			$pathway['guides'] = $size;

			if($dropEmpty){
				if ($size > 0 && $this->has_access($pathway['id'])){
					array_push($myPathways, $pathway);
				}
			} else {
				
				if ($this->has_access($pathway['id'])){
					array_push($myPathways, $pathway);
				}
			}
			$i++;
		}

		return $myPathways;
	}

	/**
	 * Get count of pathways
	 * @return integer $count
	 */
	public function get_count()
	{
		//Get roles
		$count = $this->mongo_db
			->count($this->collection);

		return $count;
	}

	/**
	 * Get pathway by id
	 * @param array $id id
	 * @return array $pathway
	 */
	public function get_by_id($id)
	{
		//Get pathways
		$pathway = $this->mongo_db
			->where(array('_id' => new MongoId($id)))
			->get($this->collection);

		return $pathway[0];
	}

	/**
	 * Get pathway by title
	 * @param array $id id
	 * @return array $pathway
	 */
	public function get_by_title($title)
	{
		//Get pathways
		$pathway = $this->mongo_db
			->where(array('title' => $title))
			->get($this->collection);

		if(sizeof($pathway) > 0 ){
			return $pathway[0];
		}else{
			return false;
		}
	}

	/**
	 * Create a new pathway
	 * @param array $pathway data
	 * @return array $pathway
	 */
	public function create($pathway)
	{
		unset($pathway['id']);

		$this->load->library('person');
		$pathway['created'] = New Mongodate(time());
		$pathway['creator'] = $this->person->username;

		try
		{
			$id = $this->mongo_db->insert($this->collection, (array) $pathway );
			return $id->{'$id'};
		}
		catch (Exception $e)
		{
			return false;
		}
	}

	/**
	 * Updates a pathway with new data
	 * @param string $id id
	 * @param array $pathway data
	 */
	public function update_by_id($id, $pathway)
	{
		unset($pathway['id']);

		$this->load->library('person');

		$pathway['modified'] = New Mongodate(time());
		$pathway['modifier'] = $this->person->username;

		$this->mongo_db
			->where(array('_id' => new MongoId($id)))
			->set( (array) $pathway )
			->update($this->collection);

		return $pathway;
	}

	/**
	 * Delete pathway by id
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
}
