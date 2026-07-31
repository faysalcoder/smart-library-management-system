<?php

namespace App\Providers;

use App\Repositories\BookCopyRepository;
use App\Repositories\CirculationRepository;
use App\Repositories\Contracts\BookCopyRepositoryInterface;
use App\Repositories\Contracts\CirculationRepositoryInterface;
use App\Repositories\Contracts\StudentRepositoryInterface;
use App\Repositories\StudentRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Binds repository interfaces to their Eloquent implementations so services
 * depend on the contract, not the storage engine (ADR-06).
 */
class RepositoryServiceProvider extends ServiceProvider
{
    public array $bindings = [
        BookCopyRepositoryInterface::class => BookCopyRepository::class,
        CirculationRepositoryInterface::class => CirculationRepository::class,
        StudentRepositoryInterface::class => StudentRepository::class,
    ];

    public function register(): void
    {
        //
    }
}
