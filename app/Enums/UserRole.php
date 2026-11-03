<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Roles de usuario dentro del sistema.
 */
enum UserRole: string
{
    /** Manda sobre todo: usuarios, llaves, configuracion */
    case Admin = 'admin';

    /** Puede registrar actos extraprotocolarios */
    case Issuer = 'issuer';

    /** Solo lectura, pero ve las bitacoras */
    case Auditor = 'auditor';

    /** Solo consulta registros técnicos */
    case Viewer = 'viewer';

    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::Issuer => 'Personal notarial',
            self::Auditor => 'Auditor',
            self::Viewer => 'Consulta',
        };
    }

    public function canIssue(): bool
    {
        return in_array($this, [self::Admin, self::Issuer], true);
    }

    public function canRevoke(): bool
    {
        return in_array($this, [self::Admin, self::Issuer], true);
    }

    public function canManageKeys(): bool
    {
        return $this === self::Admin;
    }

    public function canViewAudit(): bool
    {
        return in_array($this, [self::Admin, self::Auditor], true);
    }
}
