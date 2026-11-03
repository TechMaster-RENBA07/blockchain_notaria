<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\VerificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Verification extends Model
{
    /** @use HasFactory<VerificationFactory> */
    use HasFactory;

    protected $fillable = [
        'document_id', 'verification_code', 'result',
        'chain_verified', 'ip_address', 'user_agent',
        'channel', 'details',
    ];

    protected function casts(): array
    {
        return [
            'chain_verified' => 'boolean',
            'details' => 'array',
        ];
    }

    /** @return BelongsTo<Document, $this> */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
