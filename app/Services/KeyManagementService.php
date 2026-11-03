<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Institution;
use App\Models\SigningKey;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class KeyManagementService
{
    private const ALGORITHM = 'RSA-2048';

    private const PRIVATE_KEY_PREFIX = 'private_';

    /**
     * Genera un par de llaves RSA para una institución.
     */
    public function generateKeyPair(Institution $institution, string $name, int $validityYears = 5): SigningKey
    {
        $resource = openssl_pkey_new([
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
            'private_key_bits' => 2048,
            'digest_alg' => 'sha256',
        ]);

        if (! $resource) {
            $error = openssl_error_string();
            throw new \RuntimeException('Error generando la llave RSA: '.($error !== false ? $error : 'desconocido'));
        }

        $privateKeyPem = null;
        $success = openssl_pkey_export($resource, $privateKeyPem);
        if (! $success || $privateKeyPem === null) {
            $error = openssl_error_string();
            openssl_free_key($resource);
            throw new \RuntimeException('Error exportando llave privada: '.($error !== false ? $error : 'desconocido'));
        }

        $publicKeyResource = openssl_pkey_get_details($resource);
        $publicKeyPem = $publicKeyResource['key'] ?? null;
        if ($publicKeyPem === null) {
            $error = openssl_error_string();
            openssl_free_key($resource);
            throw new \RuntimeException('Error obteniendo llave pública: '.($error !== false ? $error : 'desconocido'));
        }

        $fingerprint = $this->computeFingerprint($publicKeyPem);

        $now = now();
        $privateKeyPath = $this->savePrivateKey($institution->id, $fingerprint, $privateKeyPem);

        $signingKey = SigningKey::create([
            'institution_id' => $institution->id,
            'name' => $name,
            'public_key' => $publicKeyPem,
            'private_key_path' => $privateKeyPath,
            'fingerprint' => $fingerprint,
            'algorithm' => self::ALGORITHM,
            'serial_number' => Str::upper(Str::random(32)),
            'valid_from' => $now->copy()->subSecond(),
            'valid_until' => $now->copy()->addYears($validityYears),
            'is_active' => true,
        ]);

        openssl_free_key($resource);

        return $signingKey;
    }

    /**
     * Firma datos con la llave privada de una SigningKey.
     */
    public function sign(string $data, SigningKey $signingKey): string
    {
        $privateKeyPath = storage_path('app/'.$signingKey->private_key_path);

        if (! file_exists($privateKeyPath)) {
            throw new \RuntimeException('Archivo de llave privada no encontrado: '.$privateKeyPath);
        }

        $privateKeyPem = file_get_contents($privateKeyPath);
        if ($privateKeyPem === false) {
            throw new \RuntimeException('No se pudo leer el archivo de llave privada');
        }

        $privateKeyResource = openssl_pkey_get_private($privateKeyPem);
        if (! $privateKeyResource) {
            $error = openssl_error_string();
            throw new \RuntimeException('Error cargando llave privada: '.($error !== false ? $error : 'desconocido'));
        }

        $signature = '';
        $success = openssl_sign($data, $signature, $privateKeyResource, OPENSSL_ALGO_SHA256);

        openssl_free_key($privateKeyResource);

        if (! $success) {
            $error = openssl_error_string();
            throw new \RuntimeException('Error firmando datos: '.($error !== false ? $error : 'desconocido'));
        }

        return base64_encode($signature);
    }

    /**
     * Verifica una firma con la llave pública de una SigningKey.
     */
    public function verify(string $data, string $signatureBase64, SigningKey $signingKey): bool
    {
        $publicKeyPem = $signingKey->public_key;
        if (empty($publicKeyPem)) {
            throw new \RuntimeException('La llave pública no está disponible');
        }

        $publicKeyResource = openssl_pkey_get_public($publicKeyPem);
        if (! $publicKeyResource) {
            $error = openssl_error_string();
            throw new \RuntimeException('Error cargando llave pública: '.($error !== false ? $error : 'desconocido'));
        }

        $signature = base64_decode($signatureBase64, true);
        if ($signature === false) {
            openssl_free_key($publicKeyResource);
            throw new \RuntimeException('Firma no es Base64 válida');
        }

        $result = openssl_verify($data, $signature, $publicKeyResource, OPENSSL_ALGO_SHA256);

        openssl_free_key($publicKeyResource);

        return $result === 1;
    }

    /**
     * Revoca una llave de firma.
     */
    public function revokeKey(SigningKey $signingKey, string $reason): void
    {
        $signingKey->update([
            'is_active' => false,
            'revoked_at' => now(),
            'revocation_reason' => $reason,
        ]);
    }

    /**
     * Obtiene la llave activa vigente para una institución.
     */
    public function getActiveKey(Institution $institution): ?SigningKey
    {
        return $institution->activeSigningKey();
    }

    /**
     * Guarda la llave privada en storage/keys/ con nombre basado en fingerprint.
     */
    private function savePrivateKey(int $institutionId, string $fingerprint, string $privateKeyPem): string
    {
        $filename = self::PRIVATE_KEY_PREFIX.$fingerprint.'.pem';
        $path = "keys/{$institutionId}/{$filename}";

        $fullPath = storage_path('app/'.$path);
        $directory = dirname($fullPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0750, true);
        }

        $written = file_put_contents($fullPath, $privateKeyPem);
        if ($written === false) {
            throw new \RuntimeException('No se pudo escribir la llave privada en: '.$fullPath);
        }

        chmod($fullPath, 0600);

        return $path;
    }

    /**
     * Calcula la huella digital (fingerprint) de una llave pública.
     */
    private function computeFingerprint(string $publicKeyPem): string
    {
        $publicKeyResource = openssl_pkey_get_public($publicKeyPem);
        if (! $publicKeyResource) {
            $error = openssl_error_string();
            throw new \RuntimeException('Error calculando fingerprint: '.($error !== false ? $error : 'desconocido'));
        }

        $details = openssl_pkey_get_details($publicKeyResource);
        openssl_free_key($publicKeyResource);

        if ($details === false || empty($details['key'])) {
            throw new \RuntimeException('No se pudo obtener la llave pública para fingerprint');
        }

        $fingerprint = hash('sha256', $details['key']);

        return strtoupper(substr($fingerprint, 0, 64));
    }
}
