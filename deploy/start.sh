#!/bin/sh
# Inicialização do contêiner (imagem oficial php:8.3-apache).
# Baixa a versão mais recente do site do GitHub e sobe o Apache.
# Para publicar uma atualização: dê push no GitHub e reinicie o projeto no Docker Manager.
set -eu

REPO_TARBALL="https://codeload.github.com/Jeffersonth/jeffersonthales-site/tar.gz/refs/heads/main"
WEB=/var/www/html

echo "[site] baixando o site do GitHub"
rm -rf /tmp/site && mkdir -p /tmp/site
curl -fsSL "$REPO_TARBALL" | tar -xz -C /tmp/site --strip-components=1

echo "[site] publicando arquivos"
find "$WEB" -mindepth 1 -delete
cp -a /tmp/site/. "$WEB"/
rm -rf "$WEB/Dockerfile" "$WEB/docker-compose.yml" "$WEB/README.md" "$WEB/deploy" "$WEB/.git" "$WEB/.gitignore"
chown -R www-data:www-data "$WEB"

echo "[site] configurando o Apache"
a2enmod rewrite headers expires >/dev/null
printf '<Directory /var/www/html>\n  Options -Indexes +FollowSymLinks\n  AllowOverride All\n</Directory>\n' > /etc/apache2/conf-available/site-override.conf
printf 'ServerTokens Prod\nServerSignature Off\n' > /etc/apache2/conf-available/site-security.conf
a2enconf site-override site-security >/dev/null

echo "[site] pronto"
exec apache2-foreground
