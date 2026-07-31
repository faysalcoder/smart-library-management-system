<?php

use App\Console\Commands\RecalculateCounters;
use App\Console\Commands\RunNightlyBackup;
use App\Console\Commands\SweepOverdueLoans;
use Illuminate\Support\Facades\Schedule;

// Nightly: flag overdue loans and accrue their fines.
Schedule::command(SweepOverdueLoans::class)->dailyAt('00:05');

// Nightly: database backup with 30-day retention (Security Feasibility §2.10).
Schedule::command(RunNightlyBackup::class)->dailyAt('02:00');

// Nightly: repair any drift in the denormalised counters (ADR-09).
Schedule::command(RecalculateCounters::class)->dailyAt('02:30');
