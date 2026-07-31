<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Base class for business-rule violations (BR-01 … BR-15).
 *
 * These are NOT programming errors — they are the system correctly refusing an
 * operation. They render as HTTP 409 Conflict by default so the React client
 * can present them as an actionable message rather than a crash.
 */
class DomainException extends RuntimeException
{
    protected int $status = 409;

    protected array $context = [];

    public function __construct(string $message, array $context = [], ?int $status = null)
    {
        parent::__construct($message);

        $this->context = $context;

        if ($status !== null) {
            $this->status = $status;
        }
    }

    public function getStatus(): int
    {
        return $this->status;
    }

    public function getContext(): array
    {
        return $this->context;
    }
}
