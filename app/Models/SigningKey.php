<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\KeyManagementService;
use Database\Factories\SigningKeyFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $institution_id
 * @property string $name
 * @property string $public_key
 * @property string $private_key_path
 * @property string $fingerprint
 * @property string $algorithm
 * @property string|null $serial_number
 * @property string|null $certificate_path
 * @property Carbon $valid_from
 * @property Carbon $valid_until
 * @property bool $is_active
 * @property Carbon|null $revoked_at
 * @property string|null $revocation_reason
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property-read Institution $institution
 * @property-read Collection<int, Document> $documents
 */
class SigningKey extends Model
{
    /** @use HasFactory<SigningKeyFactory> */
    use HasFactory;

    protected $fillable = [
        'institution_id', 'name', 'public_key', 'private_key_path',
        'fingerprint', 'algorithm', 'serial_number', 'certificate_path',
        'valid_from', 'valid_until', 'is_active',
        'revoked_at', 'revocation_reason',
    ];

    /**
     * private_key_path nunca debe aparecer en un JSON de respuesta.
     *
     * @var list<string>
     */
    protected $hidden = ['private_key_path'];

    protected function casts(): array
    {
        return [
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'revoked_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<Institution, $this> */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /** @return HasMany<Document, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    public function isUsable(): bool
    {
        return $this->is_active
            && $this->revoked_at === null
            && $this->valid_from->isPast()
            && $this->valid_until->isFuture();
    }

    /**
     * Firma datos usando el servicio de gestión de llaves.
     */
    public function sign(string $data): string
    {
        $service = app(KeyManagementService::class);

        return $service->sign($data, $this);
    }

    /**
     * Verifica una firma usando el servicio de gestión de llaves.
     */
    public function verify(string $data, string $signatureBase64): bool
    {
        $service = app(KeyManagementService::class);

        return $service->verify($data, $signatureBase64, $this);
    }

    /**
     * Obtiene la ruta absoluta al archivo de llave privada.
     */
    public function getPrivateKeyAbsolutePath(): string
    {
        return storage_path('app/'.$this->private_key_path);
    }

    /**
     * Verifica si el archivo de llave privada existe.
     */
    public function privateKeyFileExists(): bool
    {
        return file_exists($this->getPrivateKeyAbsolutePath());
    }
}
