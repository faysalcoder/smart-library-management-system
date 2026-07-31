<?php

namespace Tests\Unit;

use App\Services\Fine\FineCalculationService;
use App\Services\System\AuditLogService;
use App\Services\System\SettingService;
use App\Repositories\Contracts\StudentRepositoryInterface;
use Mockery;
use PHPUnit\Framework\TestCase;

/**
 * Implements the fine test matrix from SYSTEM_ARCHITECTURE.md §16.1.
 */
class FineCalculationTest extends TestCase
{
    private function service(float $rate = 5.00, int $grace = 0, float $cap = 500.00): FineCalculationService
    {
        $settings = Mockery::mock(SettingService::class);
        $settings->shouldReceive('int')->with('fine_grace_days', 0)->andReturn($grace);
        $settings->shouldReceive('decimal')->with('fine_rate_per_day', 5.00)->andReturn($rate);
        $settings->shouldReceive('decimal')->with('fine_max_cap', 500.00)->andReturn($cap);

        return new FineCalculationService(
            $settings,
            Mockery::mock(StudentRepositoryInterface::class),
            Mockery::mock(AuditLogService::class),
        );
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_no_fine_when_returned_on_time(): void
    {
        $this->assertSame(0.0, $this->service()->compute(0)['amount']);
    }

    public function test_one_day_late(): void
    {
        $this->assertSame(5.0, $this->service()->compute(1)['amount']);
    }

    public function test_ten_days_late(): void
    {
        $this->assertSame(50.0, $this->service()->compute(10)['amount']);
    }

    public function test_within_grace_period_is_free(): void
    {
        $this->assertSame(0.0, $this->service(grace: 2)->compute(2)['amount']);
    }

    public function test_beyond_grace_period_charges_only_chargeable_days(): void
    {
        $result = $this->service(grace: 2)->compute(5);

        $this->assertSame(3, $result['chargeable_days']);
        $this->assertSame(15.0, $result['amount']);
    }

    public function test_fine_is_capped(): void
    {
        $result = $this->service()->compute(365);

        $this->assertSame(500.0, $result['amount']);
        $this->assertTrue($result['capped']);
    }

    public function test_negative_overdue_days_never_produce_a_fine(): void
    {
        $this->assertSame(0.0, $this->service()->compute(-3)['amount']);
    }
}
