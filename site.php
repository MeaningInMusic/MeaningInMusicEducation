<?php
// Meaning in Music — editable site text & images API.
// GET  ?get=1  -> public JSON of every editable field (site-content.json).
// POST          -> admin auth required; saves field values. data:image/values are
//                  saved alongside it as upload-site-* and stored as a relative path.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require __DIR__ . '/config.php';

$contentFile = __DIR__ . '/site-content.json';
$uploadDir   = __DIR__ . '/';
$uploadBase  = 'upload-site-';

function readContent($file) {
    if (!file_exists($file)) {
        return array('fields' => array());
    }
    $raw  = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : array('fields' => array());
}

function writeContent($file, $data) {
    $tmp = $file . '.tmp';
    $json = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if (file_put_contents($tmp, $json) !== false) {
        if (!@rename($tmp, $file)) {
            file_put_contents($file, $json);
        }
    } else {
        file_put_contents($file, $json);
    }
}

function adminAuthorized($input) {
    global $ADMIN_EMAIL, $ADMIN_PASSWORD;
    $email = isset($input['email']) ? (string)$input['email'] : '';
    $password = isset($input['password']) ? (string)$input['password'] : '';
    return is_string($ADMIN_EMAIL) && is_string($ADMIN_PASSWORD)
        && hash_equals($ADMIN_EMAIL, $email)
        && hash_equals($ADMIN_PASSWORD, $password);
}

function safeKey($k) {
    return preg_replace('/[^a-z0-9_]/i', '_', (string)$k);
}

function saveImageUpload($data, $key, $uploadDir, $uploadBase) {
    if (!preg_match('#^data:image/(jpeg|jpg|png|webp|gif);base64,(.*)$#s', $data, $m)) {
        return $data; // plain URL / path / empty — store as-is
    }
    $binary = base64_decode($m[2]);
    if ($binary === false || strlen($binary) > 8 * 1024 * 1024) {
        return '';
    }
    $ext = ($m[1] === 'jpg') ? 'jpg' : $m[1];
    if (!is_dir($uploadDir) && !@mkdir($uploadDir, 0755, true)) {
        return '';
    }
    $name = safeKey($key) . '_' . gmdate('Ymd_His') . '.' . $ext;
    if (file_put_contents($uploadDir . $name, $binary) === false) {
        return '';
    }
    return $uploadBase . $name;
}

function respond($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// ---- GET: public list of editable fields ----
if ($method === 'GET') {
    respond(200, readContent($contentFile));
}

// ---- POST: admin save ----
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        respond(400, array('error' => 'Invalid request'));
    }
    if (!adminAuthorized($input)) {
        respond(403, array('error' => 'wrong_password'));
    }

    $newValues = isset($input['fields']) && is_array($input['fields'])
        ? $input['fields'] : array();

    $data = readContent($contentFile);
    $byKey = array();
    foreach ($data['fields'] as $f) {
        if (isset($f['key']) && $f['key'] !== '') {
            $byKey[$f['key']] = $f;
        }
    }

    foreach ($newValues as $k => $v) {
        if (!isset($byKey[$k])) {
            continue; // only existing fields are editable
        }
        $v = is_string($v) ? trim($v) : '';
        if (strpos($v, 'data:image/') === 0) {
            $v = saveImageUpload($v, $k, $uploadDir, $uploadBase);
        }
        $byKey[$k]['value'] = $v;
    }

    $ordered = array();
    foreach ($data['fields'] as $f) {
        if (isset($f['key']) && isset($byKey[$f['key']])) {
            $ordered[] = $byKey[$f['key']];
        }
    }
    $data['fields'] = $ordered;

    writeContent($contentFile, $data);
    respond(200, array('ok' => true, 'fields' => $data['fields']));
}

respond(405, array('error' => 'Method not allowed'));