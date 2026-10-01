# Site jeffersonthales.com — PHP 8.3 + Apache (estático + backend da Luna em /api)

FROM composer:2 AS deps
WORKDIR /app
COPY api/composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader

FROM php:8.3-apache
RUN a2enmod rewrite headers expires \
 && printf '<Directory /var/www/html>\n  Options -Indexes +FollowSymLinks\n  AllowOverride All\n</Directory>\n' > /etc/apache2/conf-available/site-override.conf \
 && a2enconf site-override \
 && echo 'ServerTokens Prod' >> /etc/apache2/conf-available/security.conf \
 && echo 'ServerSignature Off' >> /etc/apache2/conf-available/security.conf
COPY --chown=www-data:www-data . /var/www/html/
COPY --from=deps --chown=www-data:www-data /app/vendor /var/www/html/api/vendor
RUN rm -f /var/www/html/Dockerfile /var/www/html/docker-compose.yml /var/www/html/README.md
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fs http://localhost/ >/dev/null || exit 1
