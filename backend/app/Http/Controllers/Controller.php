<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

abstract class Controller
{
    /**
     * Every successful response uses the same envelope as every error
     * response, so the React client has exactly one shape to handle.
     */
    protected function ok(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'data' => $data,
            'message' => $message,
            'errors' => (object) [],
        ], $status);
    }

    protected function created(mixed $data = null, ?string $message = null): JsonResponse
    {
        return $this->ok($data, $message, 201);
    }

    /**
     * Flattens a paginator into `data` + `meta` without losing the envelope.
     *
     * Pass `$items` when the rows need to go through a JsonResource first:
     *   $this->paginated($page, BookResource::collection($page->getCollection())->resolve());
     */
    protected function paginated(
        LengthAwarePaginator $paginator,
        ?array $items = null,
        ?string $message = null,
    ): JsonResponse {
        return response()->json([
            'ok' => true,
            'data' => $items ?? $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
            'message' => $message,
            'errors' => (object) [],
        ]);
    }
}
