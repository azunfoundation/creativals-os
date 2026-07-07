<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Token-based auth via Bearer tokens (localStorage) — statefulApi() not needed
        // Trust all proxies on Oracle Cloud (Apache reverse proxy)
        $middleware->trustProxies(at: '*');
        // Ensure JSON bodies are merged under Apache mod_php (raw body arrives in
        // php://input but is not auto-populated into the request input bag)
        $middleware->append(\App\Http\Middleware\ParseJsonBody::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
