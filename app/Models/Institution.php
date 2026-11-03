<?php

declare(strict_types=1);

namespace App\Models;

use App\Services\KeyManagementService;
use Database\Factories\InstitutionFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $uuid
 * @property string $code
 * @property string $name
 * @property string $legal_name
 * @property string|null $tax_id
 * @property string|null $email
 * @property string|null $phone
 * @property string|null $address
 * @property string|null $city
 * @property string|null $country
 * @property string|null $website
 * @property string|null $logo_path
 * @property bool $is_active
 * @property array $settings
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, User> $users
 * @property-read Collection<int, SigningKey> $signingKeys
 * @property-read Collection<int, DocumentType> $documentTypes
 * @property-read Collection<int, Document> $documents
 */
class Institution extends Model
{
    /** @use HasFactory<InstitutionFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'uuid', 'code', 'name', 'legal_name', 'tax_id',
        'email', 'phone', 'address', 'city', 'country',
        'website', 'logo_path', 'is_active', 'settings',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'settings' => 'array',
        ];
    }

    /**
     * Solo la columna uuid se autogenera, no la clave primaria.
     *
     * @return array<int, string>
     */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /** @return HasMany<User, $this> */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** @return HasMany<SigningKey, $this> */
    public function signingKeys(): HasMany
    {
        return $this->hasMany(SigningKey::class);
    }

    /** @return HasMany<DocumentType, $this> */
    public function documentTypes(): HasMany
    {
        return $this->hasMany(DocumentType::class);
    }

    /** @return HasMany<Document, $this> */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * La llave de firma vigente (activa y dentro de su periodo de validez).
     */
    public function activeSigningKey(): ?SigningKey
    {
        return $this->signingKeys()
            ->where('is_active', true)
            ->whereNull('revoked_at')
            ->where('valid_from', '<=', now())
            ->where('valid_until', '>=', now())
            ->latest('valid_from')
            ->first();
    }

    /**
     * Genera una nueva llave de firma para esta institución.
     */
    public function generateSigningKey(string $name, int $validityYears = 5): SigningKey
    {
        $service = app(KeyManagementService::class);

        return $service->generateKeyPair($this, $name, $validityYears);
    }

    /**
     * Obtiene la llave activa o lanza excepción si no existe.
     */
    public function getActiveSigningKeyOrFail(): SigningKey
    {
        $key = $this->activeSigningKey();
        if (! $key) {
            throw new \RuntimeException('La institución no tiene una llave de firma activa y vigente');
        }

        return $key;
    }
}
