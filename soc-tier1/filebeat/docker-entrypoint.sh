#!/bin/bash
set -e

# Copy the mounted config to a writable location and fix permissions
# This is needed because Windows-mounted files always appear as rwxrwxrwx
cp /usr/share/filebeat/filebeat.yml /tmp/filebeat.yml
chmod 600 /tmp/filebeat.yml

exec filebeat -e -c /tmp/filebeat.yml "$@"
