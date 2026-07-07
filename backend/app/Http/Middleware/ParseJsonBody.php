<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ensure JSON request bodies are merged into the Laravel request input bag.
 *
 * When running under Apache + mod_php, requests with Content-Type: application/json
 * sometimes arrive with the raw body in php://input but with an empty request->all().
 * This middleware explicitly reads and merges the JSON body so that validation and
 * $request->input() work correctly across all API endpoints.
 */
class ParseJsonBody
{
    public function handle(Request $request, Closure $next): Response
    {
        error_log("ParseJsonBody RUNNING for " . $request->path() . ", method: " . $request->method());
        // Under Apache mod_php, $_SERVER['CONTENT_TYPE'] can be corrupted and
        // $request->isJson() may return false for application/json requests.
        // To be safe: whenever the input bag is empty but there is a request body,
        // attempt to parse it as JSON and merge the result.
        if (empty($request->all())) {
            $content = file_get_contents('php://input');
            error_log("ParseJsonBody: php_input_len=" . strlen((string)$content));
            if (!empty($content) && $content[0] === '{') {
                $json = json_decode($content, true);
                if (is_array($json) && json_last_error() === JSON_ERROR_NONE) {
                    $request->merge($json);
                }
            }
        }

        return $next($request);
    }
}
