<?php

namespace App\Providers;

use App\Contracts\BlockchainServiceInterface;
use App\Services\SimulatedBlockchainService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(BlockchainServiceInterface::class, SimulatedBlockchainService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
