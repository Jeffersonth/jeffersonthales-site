<?php
// Luna — agente de IA da Soluna IA. Recebe a conversa do site e responde via Claude API.
//
// A chave NÃO fica neste arquivo. Ela é lida, nesta ordem, de:
//   1. variável de ambiente ANTHROPIC_API_KEY
//   2. arquivo luna-secret.php UM NÍVEL ACIMA da pasta pública do site (fora do alcance da web),
//      com o conteúdo:  <?php return 'SUA_CHAVE_AQUI';
//
// Requer o SDK oficial: rode `composer install` dentro da pasta api/.

declare(strict_types=1);

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIStatusException;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const ALLOWED_ORIGINS = ['https://www.jeffersonthales.com', 'https://jeffersonthales.com'];
const MAX_MESSAGES = 20;          // mensagens por conversa
const MAX_CHARS = 1000;           // caracteres por mensagem
const RATE_WINDOW = 600;          // 10 minutos
const RATE_MAX_PER_WINDOW = 20;   // mensagens por IP a cada 10 min
const RATE_MAX_PER_DAY = 80;      // mensagens por IP por dia

const SYSTEM_PROMPT = 'Você é a Luna, agente de IA da Soluna IA, agência do desenvolvedor web Jefferson Thales (São Paulo, +300 sites entregues, 4 anos de experiência, atende todo o Brasil online). '
    . 'Responda em português do Brasil, com no máximo 3 frases curtas, tom simpático e direto, sem markdown. '
    . 'Fatos: sites a partir de R$ 1.200 (institucional, loja virtual, site dinâmico), orçamento gratuito; agentes de IA para WhatsApp com implantação a partir de R$ 1.500 e mensalidade a partir de R$ 399; '
    . 'prazos: sites 15 a 20 dias, lojas e sites dinâmicos 25 a 40 dias, agentes 7 a 15 dias; inclui design exclusivo, site responsivo, SEO, SSL, domínio e hospedagem configurados e treinamento; '
    . 'contato: WhatsApp (11) 92457-4553, e-mail jeff.thchaves@gmail.com. '
    . 'Quando a pessoa quiser orçamento ou falar com o Jefferson, faça no máximo uma pergunta sobre o negócio e termine a resposta com o marcador [WHATSAPP]. '
    . 'Não invente preços, prazos, clientes ou resultados. Se a pergunta não tiver relação com sites, agentes de IA ou com o trabalho do Jefferson, responda com gentileza que você só pode ajudar com esses assuntos.';

function fail(int $status, string $error): never
{
    http_response_code($status);
    echo json_encode(['error' => $error]);
    exit;
}

// --- Origem e método ---
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && !in_array($origin, ALLOWED_ORIGINS, true)) {
    fail(403, 'origin');
}
if ($origin !== '') {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'method');
}

// --- Limite por IP (arquivo temporário) ---
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
// Atrás do Traefik o REMOTE_ADDR é o do proxy; o IP do visitante vem no X-Forwarded-For
// (o Traefik descarta esse cabeçalho quando vem de fora, então o último valor é confiável).
$isProxy = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
if ($isProxy && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
    $parts = array_map('trim', explode(',', (string) $_SERVER['HTTP_X_FORWARDED_FOR']));
    $ip = end($parts) ?: $ip;
}
$rateFile = sys_get_temp_dir() . '/luna-rate-' . hash('sha256', $ip) . '.json';
$now = time();
$hits = is_file($rateFile) ? (json_decode((string) file_get_contents($rateFile), true) ?: []) : [];
$hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - 86400));
$recent = count(array_filter($hits, fn($t) => $t > $now - RATE_WINDOW));
if ($recent >= RATE_MAX_PER_WINDOW || count($hits) >= RATE_MAX_PER_DAY) {
    fail(429, 'rate_limit');
}
$hits[] = $now;
file_put_contents($rateFile, json_encode($hits), LOCK_EX);

// --- Validação da conversa ---
$body = json_decode((string) file_get_contents('php://input'), true);
$messages = $body['messages'] ?? null;
if (!is_array($messages) || $messages === [] || count($messages) > MAX_MESSAGES) {
    fail(400, 'messages');
}
$clean = [];
foreach ($messages as $i => $m) {
    $role = $m['role'] ?? '';
    $content = $m['content'] ?? '';
    $expected = $i % 2 === 0 ? 'user' : 'assistant';
    if ($role !== $expected || !is_string($content) || trim($content) === '' || mb_strlen($content) > MAX_CHARS) {
        fail(400, 'messages');
    }
    $clean[] = ['role' => $role, 'content' => $content];
}
if (end($clean)['role'] !== 'user') {
    fail(400, 'messages');
}

// --- Chave ---
$apiKey = getenv('ANTHROPIC_API_KEY') ?: '';
if ($apiKey === '') {
    $secretFile = dirname((string) ($_SERVER['DOCUMENT_ROOT'] ?? __DIR__ . '/..')) . '/luna-secret.php';
    if (is_file($secretFile)) {
        $apiKey = (string) (require $secretFile);
    }
}
if ($apiKey === '') {
    fail(503, 'not_configured');
}

require __DIR__ . '/vendor/autoload.php';

try {
    $client = new Client(apiKey: $apiKey);
    $message = $client->messages->create(
        model: 'claude-opus-5-5',
        maxTokens: 2000,
        outputConfig: ['effort' => 'low'],
        system: [
            ['type' => 'text', 'text' => SYSTEM_PROMPT, 'cacheControl' => ['type' => 'ephemeral']],
        ],
        messages: $clean,
    );
} catch (APIStatusException $e) {
    error_log('Luna API error: ' . ($e->type?->value ?? 'unknown'));
    fail(502, 'upstream');
} catch (\Throwable $e) {
    error_log('Luna error: ' . $e->getMessage());
    fail(502, 'upstream');
}

if ($message->stopReason === 'refusal') {
    // O site cai nas respostas prontas quando não há resposta
    echo json_encode(['reply' => '']);
    exit;
}

$reply = '';
foreach ($message->content as $block) {
    if ($block->type === 'text') {
        $reply .= $block->text;
    }
}
echo json_encode(['reply' => trim($reply)]);
