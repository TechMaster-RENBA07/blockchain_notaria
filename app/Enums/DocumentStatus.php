<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Los estados posibles de un registro documental.
 *
 * Usar un enum evita errores de escritura: si alguien escribe
 * "isued" en vez de "issued", el sistema avisa de inmediato.
 */
enum DocumentStatus: string
{
    /** Se esta preparando, todavia no vale */
    case Draft = 'draft';

    /** Registro técnico creado y procesado por el sistema */
    case Issued = 'issued';

    /** Anulado a proposito por la institucion */
    case Revoked = 'revoked';

    /** Se paso de su fecha de vencimiento */
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Borrador',
            self::Issued => 'Registrado',
            self::Revoked => 'Revocado',
            self::Expired => 'Vencido',
        };
    }

    /** Color para las etiquetas en pantalla (clases de Tailwind). */
    public function color(): string
    {
        return match ($this) {
            self::Draft => 'gray',
            self::Issued => 'green',
            self::Revoked => 'red',
            self::Expired => 'amber',
        };
    }
}
