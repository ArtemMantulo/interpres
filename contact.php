<?php
// Contact form handler: emails the enquiry from contact.html to the site owner.
// Runs on Hostinger (PHP mail()); answers with JSON so the page can show the result.

const TO        = 'artemmantulo@immersivesolutions.eu';
const FROM      = 'artemmantulo@immersivesolutions.eu'; // must be a mailbox on this domain (SPF)
const RATE_MAX  = 5;     // messages per IP ...
const RATE_SECS = 3600;  // ... per hour

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply(int $code, array $body): void {
    http_response_code($code);
    echo json_encode($body);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'Method not allowed']);
}

// Honeypot: real visitors never see or fill this field.
if (!empty($_POST['website'])) {
    reply(200, ['ok' => true]);
}

function field(string $key, int $max): string {
    $v = trim((string)($_POST[$key] ?? ''));
    return mb_substr($v, 0, $max);
}
function oneLine(string $v): string {
    return trim(preg_replace('/[\r\n]+/', ' ', $v)); // no header injection
}

$name    = oneLine(field('name', 120));
$contact = oneLine(field('contact', 200));
$project = oneLine(field('project', 200));
$message = field('message', 5000);

if ($name === '' || $contact === '' || $message === '') {
    reply(422, ['ok' => false, 'error' => 'Please fill in your name, contact and message.']);
}

// Simple per-IP rate limit, stored in the system temp dir.
$ip   = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$file = sys_get_temp_dir() . '/is_contact_' . md5($ip);
$now  = time();
$hits = [];
if (is_file($file)) {
    $hits = array_filter(array_map('intval', explode(',', (string)@file_get_contents($file))),
        fn($t) => $t > $now - RATE_SECS);
}
if (count($hits) >= RATE_MAX) {
    reply(429, ['ok' => false, 'error' => 'Too many messages. Please try again later or write to us directly.']);
}
$hits[] = $now;
@file_put_contents($file, implode(',', $hits), LOCK_EX);

$subject = 'New enquiry from immersivesolutions.eu — ' . $name;
$body = "Name: $name\n"
      . "Email / Telegram: $contact\n"
      . "Project and location: " . ($project !== '' ? $project : '—') . "\n\n"
      . "Message:\n$message\n\n"
      . "---\nSent from the contact form, " . gmdate('Y-m-d H:i') . " UTC, IP $ip\n";

$headers = [
    'From: Immersive Solutions website <' . FROM . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];
if (filter_var($contact, FILTER_VALIDATE_EMAIL)) {
    $headers[] = 'Reply-To: ' . $contact; // answer the visitor straight from the mail client
}

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = @mail(TO, $encodedSubject, $body, implode("\r\n", $headers), '-f' . FROM);

if (!$sent) {
    reply(500, ['ok' => false, 'error' => 'The message could not be sent. Please email us directly.']);
}
reply(200, ['ok' => true]);
