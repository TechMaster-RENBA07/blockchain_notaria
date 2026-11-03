<?php

declare(strict_types=1);

namespace App\Models;

use App\Contracts\BlockchainServiceInterface;
use App\Enums\DocumentStatus;
use Database\Factories\DocumentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property string $uuid
 * @property string $verification_code
 * @property int $institution_id
 * @property int $document_type_id
 * @property int $issued_by
 * @property int|null $signing_key_id
 * @property string $holder_name
 * @property string $holder_identity_number
 * @property string $holder_email
 * @property string $title
 * @property string $description
 * @property array $metadata
 * @property string|null $content_hash
 * @property string|null $pdf_hash
 * @property string|null $pdf_path
 * @property string|null $qr_path
 * @property string|null $signature
 * @property DocumentStatus $status
 * @property Carbon|null $issued_at
 * @property Carbon|null $expires_at
 * @property Carbon|null $revoked_at
 * @property string|null $revocation_reason
 * @property int|null $revoked_by
 * @property Carbon $created_at
 * @property Carbon $updated_at
 * @property Carbon|null $deleted_at
 * @property-read Institution $institution
 * @property-read DocumentType $documentType
 * @property-read User $issuer
 * @property-read User|null $revoker
 * @property-read SigningKey|null $signingKey
 * @property-read Collection<int, BlockchainRecord> $blockchainRecords
 * @property-read BlockchainRecord|null $confirmedRecord
 * @property-read Collection<int, Verification> $verifications
 */
class Document extends Model
{
    /** @use HasFactory<DocumentFactory> */
    use HasFactory;

    use HasUuids;
    use SoftDeletes;

    protected $fillable = [
        'uuid', 'verification_code',
        'institution_id', 'document_type_id', 'issued_by', 'signing_key_id',
        'holder_name', 'holder_identity_number', 'holder_email',
        'title', 'description', 'metadata',
        'content_hash', 'pdf_hash', 'pdf_path', 'qr_path', 'signature',
        'status', 'issued_at', 'expires_at',
        'revoked_at', 'revocation_reason', 'revoked_by',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'status' => DocumentStatus::class,
            'issued_at' => 'datetime',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    /** @return array<int, string> */
    public function uniqueIds(): array
    {
        return ['uuid'];
    }

    /**
     * Al crear un documento se le asigna un codigo de verificacion
     * legible si no trae uno.
     */
    protected static function booted(): void
    {
        static::creating(function (Document $document): void {
            if (blank($document->verification_code)) {
                $document->verification_code = self::generateVerificationCode();
            }
        });
    }

    /**
     * Genera un codigo de consulta tipo NOTA-7K2M-9XQ4.
     *
     * Se excluyen las letras y numeros que se confunden al leer
     * (0/O, 1/I/L) para que alguien pueda copiarlo a mano sin error.
     */
    public static function generateVerificationCode(): string
    {
        $alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

        do {
            $bloque1 = '';
            $bloque2 = '';
            for ($i = 0; $i < 4; $i++) {
                $bloque1 .= $alphabet[random_int(0, strlen($alphabet) - 1)];
                $bloque2 .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $code = "NOTA-{$bloque1}-{$bloque2}";
        } while (self::withTrashed()->where('verification_code', $code)->exists());

        return $code;
    }

    // ------------------------------------------------------------------
    // Relaciones
    // ------------------------------------------------------------------

    /** @return BelongsTo<Institution, $this> */
    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /** @return BelongsTo<DocumentType, $this> */
    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    /** @return BelongsTo<User, $this> */
    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    /** @return BelongsTo<User, $this> */
    public function revoker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    /** @return BelongsTo<SigningKey, $this> */
    public function signingKey(): BelongsTo
    {
        return $this->belongsTo(SigningKey::class);
    }

    /** @return HasMany<BlockchainRecord, $this> */
    public function blockchainRecords(): HasMany
    {
        return $this->hasMany(BlockchainRecord::class);
    }

    /** @return HasOne<BlockchainRecord, $this> */
    public function confirmedRecord(): HasOne
    {
        return $this->hasOne(BlockchainRecord::class)
            ->where('status', 'confirmed')
            ->latestOfMany();
    }

    /** @return HasMany<Verification, $this> */
    public function verifications(): HasMany
    {
        return $this->hasMany(Verification::class);
    }

    // ------------------------------------------------------------------
    // Estado
    // ------------------------------------------------------------------

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    /**
     * Un documento es valido si fue emitido, no esta revocado
     * y todavia no caduca.
     */
    public function isValid(): bool
    {
        return $this->status === DocumentStatus::Issued
            && ! $this->isRevoked()
            && ! $this->isExpired();
    }

    /**
     * Datos exactos que se resumen en el content_hash.
     *
     * El orden y el formato NO deben cambiar nunca: si cambian,
     * todos los registros ya emitidos dejarian de validar.
     *
     * @return array<string, string|null>
     */
    public function hashableData(): array
    {
        return [
            'uuid' => $this->uuid,
            'institution_id' => (string) $this->institution_id,
            'document_type_id' => (string) $this->document_type_id,
            'holder_name' => $this->holder_name,
            'holder_identity_number' => $this->holder_identity_number,
            'title' => $this->title,
            'description' => $this->description,
            'metadata' => json_encode($this->metadata ?? [], JSON_UNESCAPED_UNICODE),
            'issued_at' => $this->issued_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
        ];
    }

    /**
     * Calcula la huella digital SHA-256 del contenido.
     */
    public function computeContentHash(): string
    {
        $data = $this->hashableData();
        ksort($data);

        return hash('sha256', json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }

    /**
     * Compara la huella guardada con la recalculada.
     * Si no coinciden, el registro fue alterado.
     */
    public function hasIntactContent(): bool
    {
        return hash_equals((string) $this->content_hash, $this->computeContentHash());
    }

    // ------------------------------------------------------------------
    // Firma digital
    // ------------------------------------------------------------------

    /**
     * Firma el documento con su llave de firma asociada.
     *
     * Calcula el content_hash, luego firma el hash
     * y guarda la firma en Base64.
     */
    public function sign(): self
    {
        if (! $this->signing_key_id) {
            throw new \RuntimeException('El documento no tiene una llave de firma asignada');
        }

        if (! $this->signingKey) {
            throw new \RuntimeException('La llave de firma asociada no existe');
        }

        if (! $this->signingKey->isUsable()) {
            throw new \RuntimeException('La llave de firma no es usable (revocada, expirada o inactiva)');
        }

        $contentHash = $this->computeContentHash();
        $this->content_hash = $contentHash;

        $signature = $this->signingKey->sign($contentHash);
        $this->signature = $signature;

        $this->save();

        return $this;
    }

    /**
     * Verifica la firma digital del documento.
     */
    public function verifySignature(): bool
    {
        if (! $this->signature || ! $this->signing_key_id || ! $this->signingKey) {
            return false;
        }

        return $this->signingKey->verify($this->content_hash, $this->signature);
    }

    /**
     * Emite el documento: calcula hash, firma, ancla en la cadena y cambia estado a emitido.
     */
    public function issue(): self
    {
        if ($this->status === DocumentStatus::Issued) {
            throw new \RuntimeException('El documento ya fue emitido');
        }

        $this->issued_at = now();
        $this->status = DocumentStatus::Issued;
        $this->save();
        $this->sign();

        // Anclar en la cadena de bloques (dentro de transacción para atomicidad)
        app(BlockchainServiceInterface::class)->registerDocument($this);

        return $this;
    }

    // ------------------------------------------------------------------
    // Filtros
    // ------------------------------------------------------------------

    /** @param Builder<Document> $query */
    public function scopeIssued(Builder $query): void
    {
        $query->where('status', DocumentStatus::Issued);
    }

    /** @param Builder<Document> $query */
    public function scopeForInstitution(Builder $query, int $institutionId): void
    {
        $query->where('institution_id', $institutionId);
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function publicUrl(): string
    {
        return url('/verificar/'.$this->verification_code);
    }
}
