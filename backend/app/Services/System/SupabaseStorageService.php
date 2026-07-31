<?php

namespace App\Services\System;

use App\Exceptions\DomainException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Uploads images (book covers, author photos, publisher logos) to Supabase
 * Storage via its REST API.
 *
 * Why not Laravel's local `public` disk: Railway's filesystem is ephemeral —
 * anything written to disk is wiped on every redeploy. Supabase Storage is
 * the same account already backing the database, so no second cloud service
 * is needed just to make uploads survive a deploy.
 *
 * Why the REST API and not the S3-compatible endpoint: it needs only the
 * project URL and the service_role key (the same two values used nowhere
 * else), rather than a separate S3 access-key/secret pair and the
 * league/flysystem-aws-s3-v3 package.
 */
class SupabaseStorageService
{
    private const BUCKET = 'slms-uploads';

    private const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, mirrors the bucket's own limit

    private ?bool $bucketReady = null;

    /** Uploads a file into `$folder` inside the bucket and returns its public URL. */
    public function upload(UploadedFile $file, string $folder): string
    {
        $this->ensureBucket();

        $extension = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $path = trim($folder, '/').'/'.Str::uuid().'.'.$extension;

        $response = Http::withToken($this->key())
            ->withBody(file_get_contents($file->getRealPath()), $file->getMimeType() ?: 'application/octet-stream')
            ->withHeaders(['x-upsert' => 'true'])
            ->timeout(30)
            ->post($this->apiUrl("/object/".self::BUCKET."/{$path}"));

        if ($response->failed()) {
            throw new DomainException(
                'The image could not be uploaded. Please try again.',
                ['status' => $response->status()],
                502
            );
        }

        return $this->publicUrl($path);
    }

    /** Removes a previously uploaded file, given its public URL. Silently no-ops for anything else. */
    public function delete(?string $url): void
    {
        $path = $this->pathFromUrl($url);

        if ($path === null) {
            return;
        }

        Http::withToken($this->key())
            ->timeout(15)
            ->delete($this->apiUrl('/object/'.self::BUCKET."/{$path}"));
    }

    public function maxBytes(): int
    {
        return self::MAX_BYTES;
    }

    /** Creates the shared upload bucket the first time it's needed. Idempotent. */
    private function ensureBucket(): void
    {
        if ($this->bucketReady) {
            return;
        }

        $check = Http::withToken($this->key())->timeout(15)->get($this->apiUrl('/bucket/'.self::BUCKET));

        if ($check->successful()) {
            $this->bucketReady = true;

            return;
        }

        $create = Http::withToken($this->key())->timeout(15)->post($this->apiUrl('/bucket'), [
            'id' => self::BUCKET,
            'name' => self::BUCKET,
            'public' => true,
            'file_size_limit' => self::MAX_BYTES,
            'allowed_mime_types' => ['image/jpeg', 'image/png', 'image/webp'],
        ]);

        // 409 means another request/process created it a moment earlier — fine.
        if ($create->failed() && $create->status() !== 409) {
            throw new DomainException(
                'Image storage is not configured correctly on this server.',
                ['status' => $create->status(), 'body' => $create->json()],
                500
            );
        }

        $this->bucketReady = true;
    }

    private function publicUrl(string $path): string
    {
        return $this->baseUrl()."/storage/v1/object/public/".self::BUCKET."/{$path}";
    }

    private function pathFromUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $marker = '/storage/v1/object/public/'.self::BUCKET.'/';
        $pos = strpos($url, $marker);

        return $pos === false ? null : substr($url, $pos + strlen($marker));
    }

    private function apiUrl(string $path): string
    {
        return $this->baseUrl().'/storage/v1'.$path;
    }

    private function baseUrl(): string
    {
        $url = config('services.supabase.url');

        if (! $url) {
            throw new DomainException('Image uploads are not configured on this server.', [], 500);
        }

        return rtrim($url, '/');
    }

    private function key(): string
    {
        $key = config('services.supabase.service_role_key');

        if (! $key) {
            throw new DomainException('Image uploads are not configured on this server.', [], 500);
        }

        return $key;
    }
}
