<?php

/**
 * Implementation of PHP's session API.
 * What it does:
 *  - it handles the session data in the database (more scalable.)
 *  - it uses the databaseSession_lifetime setting for garbage collection.
 *  - the custom session handler is set by loadSession().
 *
 * @name      ElkArte Forum
 * @copyright ElkArte Forum contributors
 * @license   BSD http://opensource.org/licenses/BSD-3-Clause
 *
 * This file contains code covered by:
 * copyright:	2011 Simple Machines (http://www.simplemachines.org)
 * license:		BSD, See included LICENSE.TXT for terms and conditions.
 *
 * @version 1.0 Beta
 *
 */

if (!defined('ELK'))
	die('No access...');

/**
 * Attempt to start the session, unless it already has been.
 */
function loadSession()
{
	global $modSettings, $boardurl, $sc;

	// Attempt to change a few PHP settings.
	@ini_set('session.use_cookies', true);
	@ini_set('session.use_only_cookies', false);
	@ini_set('url_rewriter.tags', '');
	@ini_set('session.use_trans_sid', false);
	@ini_set('arg_separator.output', '&amp;');

	if (!empty($modSettings['globalCookies']))
	{
		$parsed_url = parse_url($boardurl);

		if (preg_match('~^\d{1,3}(\.\d{1,3}){3}$~', $parsed_url['host']) == 0 && preg_match('~(?:[^\.]+\.)?([^\.]{2,}\..+)\z~i', $parsed_url['host'], $parts) == 1)
			@ini_set('session.cookie_domain', '.' . $parts[1]);
	}

	// @todo Set the session cookie path?

	// If it's already been started... probably best to skip this.
	if ((ini_get('session.auto_start') == 1 && !empty($modSettings['databaseSession_enable'])) || session_id() == '')
	{
		// Attempt to end the already-started session.
		if (ini_get('session.auto_start') == 1)
			session_write_close();

		// This is here to stop people from using bad junky PHPSESSIDs.
		if (isset($_REQUEST[session_name()]) && preg_match('~^[A-Za-z0-9,-]{16,64}$~', $_REQUEST[session_name()]) == 0 && !isset($_COOKIE[session_name()]))
		{
			$session_id = md5(md5('elk_sess_' . time()) . mt_rand());
			$_REQUEST[session_name()] = $session_id;
			$_GET[session_name()] = $session_id;
			$_POST[session_name()] = $session_id;
		}

		// Use database sessions? (they don't work in 4.1.x!)
		if (!empty($modSettings['databaseSession_enable']))
		{
			@ini_set('session.serialize_handler', 'php');
			session_set_save_handler('sessionOpen', 'sessionClose', 'sessionRead', 'sessionWrite', 'sessionDestroy', 'sessionGC');
			@ini_set('session.gc_probability', '1');
		}
		elseif (ini_get('session.gc_maxlifetime') <= 1440 && !empty($modSettings['databaseSession_lifetime']))
			@ini_set('session.gc_maxlifetime', max($modSettings['databaseSession_lifetime'], 60));

		// Use cache setting sessions?
		if (empty($modSettings['databaseSession_enable']) && !empty($modSettings['cache_enable']) && php_sapi_name() != 'cli')
		{
			call_integration_hook('integrate_session_handlers');
			// @todo move these to a plugin.
			if (function_exists('mmcache_set_session_handlers'))
				mmcache_set_session_handlers();
			elseif (function_exists('eaccelerator_set_session_handlers'))
				eaccelerator_set_session_handlers();
		}

		session_start();

		// Change it so the cache settings are a little looser than default.
		if (!empty($modSettings['databaseSession_loose']))
			header('Cache-Control: private');
	}

	// Set the randomly generated code.
	if (!isset($_SESSION['session_var']))
	{
		$_SESSION['session_value'] = md5(session_id() . mt_rand());
		$_SESSION['session_var'] = substr(preg_replace('~^\d+~', '', sha1(mt_rand() . session_id() . mt_rand())), 0, rand(7, 12));
	}

	$sc = $_SESSION['session_value'];
}

/**
 * Implementation of sessionOpen() replacing the standard open handler.
 * It simply returns true.
 *
 * @param string $save_path
 * @param string $session_name
 * @return boolean
 */
function sessionOpen($save_path, $session_name)
{
	return true;
}

/**
 * Implementation of sessionClose() replacing the standard close handler.
 * It simply returns true.
 *
 * @return boolean
 */
function sessionClose()
{
	return true;
}

/**
 * Implementation of sessionRead() replacing the standard read handler.
 *
 * @param string $session_id
 * @return string
 */
function sessionRead($session_id)
{
	if (preg_match('~^[A-Za-z0-9,-]{16,64}$~', $session_id) == 0)
		return false;

	// Get our database, quick
	$db = database();

	// Look for it in the database.
	$result = $db->query('', '
		SELECT data
		FROM {db_prefix}sessions
		WHERE session_id = {string:session_id}
		LIMIT 1',
		array(
			'session_id' => $session_id,
		)
	);
	list ($sess_data) = $db->fetch_row($result);
	$db->free_result($result);

	return $sess_data;
}

/**
 * Implementation of sessionWrite() replacing the standard write handler.
 *
 * @param string $session_id
 * @param string $data
 * @return boolean
 */
function sessionWrite($session_id, $data)
{
	if (preg_match('~^[A-Za-z0-9,-]{16,64}$~', $session_id) == 0)
		return false;

	// Better safe than sorry
	$db = database();

	// First try to update an existing row...
	$result = $db->query('', '
		UPDATE {db_prefix}sessions
		SET data = {string:data}, last_update = {int:last_update}
		WHERE session_id = {string:session_id}',
		array(
			'last_update' => time(),
			'data' => $data,
			'session_id' => $session_id,
		)
	);

	// If that didn't work, try inserting a new one.
	if ($db->affected_rows() == 0)
		$result = $db->insert('ignore',
			'{db_prefix}sessions',
			array('session_id' => 'string', 'data' => 'string', 'last_update' => 'int'),
			array($session_id, $data, time()),
			array('session_id')
		);

	return $result;
}

/**
 * Implementation of sessionDestroy() replacing the standard destroy handler.
 *
 * @param string $session_id
 * @return boolean
 */
function sessionDestroy($session_id)
{
	if (preg_match('~^[A-Za-z0-9,-]{16,64}$~', $session_id) == 0)
		return false;

	// Better safe than sorry
	$db = database();

	// Just delete the row...
	return $db->query('', '
		DELETE FROM {db_prefix}sessions
		WHERE session_id = {string:session_id}',
		array(
			'session_id' => $session_id,
		)
	);
}

/**
 * Implementation of sessionGC() replacing the standard gc handler.
 * Callback for garbage collection.
 *
 * @param int $max_lifetime
 * @return boolean
 */
function sessionGC($max_lifetime)
{
	global $modSettings;

	// Just set to the default or lower?  Ignore it for a higher value. (hopefully)
	if (!empty($modSettings['databaseSession_lifetime']) && ($max_lifetime <= 1440 || $modSettings['databaseSession_lifetime'] > $max_lifetime))
		$max_lifetime = max($modSettings['databaseSession_lifetime'], 60);

	// Try hard... just this time.
	$db = database();

	// Clean up after yerself ;).
	return $db->query('', '
		DELETE FROM {db_prefix}sessions
		WHERE last_update < {int:last_update}',
		array(
			'last_update' => time() - $max_lifetime,
		)
	);
}