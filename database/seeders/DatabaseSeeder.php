<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Llena la base de datos con datos iniciales.
 *
 * Se ejecuta con:  php artisan db:seed
 * O junto con las migraciones:  php artisan migrate:fresh --seed
 *
 * El orden importa: no se pueden crear usuarios antes que instituciones.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            InstitutionSeeder::class,
            UserSeeder::class,
            DocumentTypeSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('Datos iniciales cargados.');
        $this->command->newLine();
        $this->command->table(
            ['Correo', 'Contraseña', 'Rol'],
            [
                ['admin@notaria.local', 'password', 'Administrador'],
                ['notario@notaria.local', 'password', 'Personal notarial'],
                ['auditor@notaria.local', 'password', 'Auditor'],
            ]
        );
    }
}
