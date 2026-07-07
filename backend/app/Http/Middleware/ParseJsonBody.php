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
        if ($request->isJson() && empty($request->all())) {
            $content = $request->getContent();
            if (!empty($content)) {
                $json = json_decode($content, true);
                if (is_array($json) && json_last_error() === JSON_ERROR_NONE) {
                    $request->merge($json);
                }
            }
        }

        return $next($request);
    }
}
