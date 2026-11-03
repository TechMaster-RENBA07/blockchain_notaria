<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Institution;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $institution = Institution::where('code', 'NOTARIA')->firstOrFail();

        $accounts = [
            [
                'email' => 'admin@notaria.local',
                'legacy_email' => 'admin@certsecure.local',
                'name' => 'Administración Notarial',
                'role' => UserRole::Admin,
                'position' => 'Administrador del sistema',
            ],
            [
                'email' => 'notario@notaria.local',
                'legacy_email' => 'emisor@certsecure.local',
                'name' => 'Personal notarial',
                'role' => UserRole::Issuer,
                'position' => 'Operador notarial',
            ],
            [
                'email' => 'auditor@notaria.local',
                'legacy_email' => 'auditor@certsecure.local',
                'name' => 'Auditoría Notarial',
                'role' => UserRole::Auditor,
                'position' => 'Auditor interno',
            ],
        ];

        foreach ($accounts as $account) {
            $user = User::query()
                ->whereIn('email', [$account['email'], $account['legacy_email']])
                ->first() ?? new User;

            $user->fill(
                [
                    'email' => $account['email'],
                    'institution_id' => $institution->id,
                    'name' => $account['name'],
                    'password' => Hash::make('password'),
                    'role' => $account['role'],
                    'position' => $account['position'],
                    'is_active' => true,
                    'email_verified_at' => now(),
                ]
            )->save();
        }
    }
}
