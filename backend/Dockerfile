# SLMS API — Render deployment image.
#
# Render has no native PHP buildpack (unlike Railway's Nixpacks autodetect),
# so this Dockerfile is the equivalent of nixpacks.toml for that platform:
# install PHP 8.2 + the extensions Laravel needs, install Composer
# dependencies, then run migrations and `php artisan serve` on container
# start. Kept intentionally simple — no nginx/php-fpm split — for the same
# reason nixpacks.toml gives: this is a single-service deployment at
# university-library scale, and a start command that's easy to reason about
# beats a marginal concurrency gain.

FROM php:8.2-cli

RUN apt-get update && apt-get install -y \
        libpq-dev \
        libzip-dev \
        unzip \
        git \
    && docker-php-ext-install pdo pdo_pgsql pgsql mbstring bcmath \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --optimize \
    && php artisan package:discover --ansi

EXPOSE 10000

CMD php artisan migrate --force --no-interaction && php artisan serve --host=0.0.0.0 --port=${PORT:-10000}
